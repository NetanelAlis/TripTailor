import json
import boto3
from boto3.dynamodb.conditions import Key, Attr
from boto3.dynamodb.types import TypeDeserializer
from decimal import Decimal
from typing import List, Dict, Any, Optional

# Initialize DynamoDB resource
dynamodb = boto3.resource("dynamodb")
flights_table = dynamodb.Table("Flights")
hotels_table = dynamodb.Table("Hotels")

def _cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Credentials": "false"
    }

def convert_decimals(obj):
    """
    Recursively convert DynamoDB Decimal objects to int/float for JSON serialization.
    """
    if isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, Decimal):
        # Convert Decimal to int if it's a whole number, otherwise float
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    else:
        return obj

def fetch_flight_details(flight_ids: List[str]) -> Dict[str, Any]:
    """
    Fetch flight details for a list of TripTailor flight IDs.
    Returns a dictionary mapping flight ID to flight details.
    """
    flight_data = {}
    
    for flight_id in flight_ids:
        try:
            print(f"[fetch_booking_data] Fetching flight details for ID: {flight_id}")
            
            # Query the Flights table using the flight ID as partition key
            response = flights_table.query(
                KeyConditionExpression=Key("flightId").eq(flight_id),
                ScanIndexForward=False,  # Get most recent first
                Limit=1
            )
            
            items = response.get("Items", [])
            if items:
                flight_item = items[0]
                flight_details = flight_item.get("flightDetails", {})
                
                # Include additional metadata and convert Decimals
                flight_data[flight_id] = convert_decimals({
                    "tripTailorFlightId": flight_id,
                    "flightDetails": flight_details,
                    "status": flight_item.get("status", "unknown"),
                    "timestamp": flight_item.get("timestamp"),
                    "bookingTimestamp": flight_item.get("bookingTimestamp"),
                    "departureTime": flight_item.get("departureTime")
                })
                
                print(f"[fetch_booking_data] Found flight details for {flight_id}")
            else:
                print(f"[fetch_booking_data] No flight found for ID: {flight_id}")
                flight_data[flight_id] = None
                
        except Exception as e:
            print(f"[fetch_booking_data] Error fetching flight {flight_id}: {str(e)}")
            flight_data[flight_id] = None
    
    return flight_data

def fetch_hotel_details(hotel_ids: List[str]) -> Dict[str, Any]:
    """
    Fetch hotel details for a list of TripTailor hotel IDs.
    Returns a dictionary mapping hotel ID to hotel details.
    """
    hotel_data = {}
    
    for hotel_id in hotel_ids:
        try:
            print(f"[fetch_booking_data] Fetching hotel details for ID: {hotel_id}")
            
            # First try to query by hotelOfferId (for regular hotels where TripTailor ID = partition key)
            response = hotels_table.query(
                KeyConditionExpression=Key("hotelOfferId").eq(hotel_id),
                ScanIndexForward=False,  # Get most recent first
                Limit=1
            )
            items = response.get("Items", [])
            
            # If not found, try to scan by tripTailorHotelId (for booked hotels)
            if not items:
                print(f"[fetch_booking_data] Hotel {hotel_id} not found by hotelOfferId, scanning by tripTailorHotelId...")
                response = hotels_table.scan(
                    FilterExpression=Attr("tripTailorHotelId").eq(hotel_id),
                    Limit=50
                )
                items = response.get("Items", [])
                print(f"[fetch_booking_data] Scan found {len(items)} items with tripTailorHotelId = {hotel_id}")
            
            if items:
                hotel_item = items[0]
                hotel_offers_details = hotel_item.get("hotelOffersDetails", {})
                
                # Check if this is a booked hotel (has hotelOffersDetails.booked = true)
                is_booked = hotel_offers_details.get("booked", False)
                
                hotel_data_item = {
                    "tripTailorHotelId": hotel_id,
                    "hotelOffersDetails": hotel_offers_details,
                    "status": hotel_item.get("status", "available"),
                    "timestamp": hotel_item.get("timestamp"),
                    "isBooked": is_booked
                }
                
                # If it's a booked hotel, include additional booking information
                if is_booked:
                    hotel_data_item["bookingResponse"] = hotel_offers_details.get("bookingResponse", {})
                    hotel_data_item["hotelPricingData"] = hotel_offers_details.get("hotelPricingData", {})
                
                # Convert Decimals before storing
                hotel_data[hotel_id] = convert_decimals(hotel_data_item)
                
                print(f"[fetch_booking_data] Found hotel details for {hotel_id} (booked: {is_booked})")
            else:
                print(f"[fetch_booking_data] No hotel found for ID: {hotel_id}")
                hotel_data[hotel_id] = None
                
        except Exception as e:
            print(f"[fetch_booking_data] Error fetching hotel {hotel_id}: {str(e)}")
            hotel_data[hotel_id] = None
    
    return hotel_data

def lambda_handler(event, context):
    """
    Lambda handler to fetch booking details for flights and hotels.
    
    Expected input:
    {
        "tripTailorFlightIds": ["flight_id_1", "flight_id_2", ...],
        "tripTailorHotelIds": ["hotel_id_1", "hotel_id_2", ...]
    }
    
    Returns:
    {
        "flights": {
            "flight_id_1": { flight_details_object },
            "flight_id_2": { flight_details_object },
            ...
        },
        "hotels": {
            "hotel_id_1": { hotel_details_object },
            "hotel_id_2": { hotel_details_object },
            ...
        }
    }
    """
    headers = _cors_headers()
    
    # Handle preflight OPTIONS request
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
    
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        
        # Extract parameters
        flight_ids = body.get("tripTailorFlightIds", [])
        hotel_ids = body.get("tripTailorHotelIds", [])
        
        print(f"[fetch_booking_data] Received request for {len(flight_ids)} flights and {len(hotel_ids)} hotels")
        print(f"[fetch_booking_data] Flight IDs: {flight_ids}")
        print(f"[fetch_booking_data] Hotel IDs: {hotel_ids}")
        
        # Validate input
        if not isinstance(flight_ids, list):
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "tripTailorFlightIds must be a list"})
            }
        
        if not isinstance(hotel_ids, list):
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "tripTailorHotelIds must be a list"})
            }
        
        # Fetch data
        flight_data = {}
        hotel_data = {}
        
        if flight_ids:
            flight_data = fetch_flight_details(flight_ids)
        
        if hotel_ids:
            hotel_data = fetch_hotel_details(hotel_ids)
        
        # Prepare response and convert any remaining Decimals
        response_data = convert_decimals({
            "flights": flight_data,
            "hotels": hotel_data,
            "summary": {
                "totalFlights": len(flight_ids),
                "totalHotels": len(hotel_ids),
                "flightsFound": len([f for f in flight_data.values() if f is not None]),
                "hotelsFound": len([h for h in hotel_data.values() if h is not None])
            }
        })
        
        print(f"[fetch_booking_data] Successfully fetched {response_data['summary']['flightsFound']}/{len(flight_ids)} flights and {response_data['summary']['hotelsFound']}/{len(hotel_ids)} hotels")
        
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(response_data)
        }
        
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": "Invalid JSON in request body"})
        }
    
    except Exception as e:
        print(f"[fetch_booking_data] Unexpected error: {str(e)}")
        import traceback
        print(f"[fetch_booking_data] Traceback: {traceback.format_exc()}")
        
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Internal server error: {str(e)}"})
        }
