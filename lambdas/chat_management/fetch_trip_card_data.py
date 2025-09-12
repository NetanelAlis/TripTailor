import json
import os
from typing import List, Dict, Any
from datetime import date
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource("dynamodb")
trips_table = dynamodb.Table("trip")
flights_table = dynamodb.Table("Flights")
hotels_table = dynamodb.Table("Hotels")


def _cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def _bad_request(msg: str):
    return {
        "statusCode": 400,
        "headers": _cors_headers(),
        "body": json.dumps({"error": msg}),
    }


def _server_error(msg: str):
    return {
        "statusCode": 500,
        "headers": _cors_headers(),
        "body": json.dumps({"error": msg}),
    }


def _fetch_compact_flight(f_id: str) -> Dict[str, Any]:
    try:
        # Query by flightId since table might have composite key (flightId + timestamp)
        res = flights_table.query(
            KeyConditionExpression=Key("flightId").eq(f_id),
            ScanIndexForward=False,  # Get most recent
            Limit=1
        )
        items = res.get("Items", [])
        root = items[0] if items else {}
        item = root.get("flightDetails", {})
        if not item:
            return {"id": f_id, "airline": "", "flight_number": "", "route": "", "departure": "", "arrival": "", "duration": "", "price": ""}
            return {"id": f_id, "airline": "", "flight_number": "", "route": "", "departure": "", "arrival": "", "duration": "", "price": ""}

        itinerary = (item.get("itineraries") or [{}])[0]
        segments = itinerary.get("segments", [])
        price_info = item.get("price", {})
        total_price = price_info.get("total", "")
        currency = price_info.get("currency", "")

        airline = (item.get("validatingAirlineCodes") or [None])
        airline_code = airline[0] if airline else None
        if not airline_code and segments:
            airline_code = segments[0].get("carrierCode")

        # Flight number from first segment
        flight_number = ""
        if segments:
            first_seg = segments[0]
            flight_number = f"{first_seg.get('carrierCode','')}{first_seg.get('number','')}".strip()

        # Route string: origin -> layovers -> destination
        route_points = []
        if segments:
            route_points.append(segments[0].get("departure", {}).get("iataCode", ""))
            for seg in segments:
                arr = seg.get("arrival", {}).get("iataCode", "")
                if arr:
                    route_points.append(arr)
        route = " -> ".join([p for p in route_points if p])

        # Departure/arrival timestamps
        departure_iso = segments[0].get("departure", {}).get("at", "") if segments else ""
        arrival_iso = segments[-1].get("arrival", {}).get("at", "") if segments else ""

        # Duration humanized
        dur = itinerary.get("duration", "")
        if dur:
            dur = dur.replace("PT", "").replace("H", "h ").replace("M", "m").strip()

        price = f"{total_price} {currency}".strip()

        result = {
            "id": f_id,
            "airline": airline_code or "",
            "flight_number": flight_number,
            "route": route,
            "departure": departure_iso,
            "arrival": arrival_iso,
            "duration": dur,
            "price": price,
        }
        return result
    except Exception as e:
        print(f"[fetch_trip_card] Exception fetching flight {f_id}: {e}")
        return {"id": f_id, "airline": "", "flight_number": "", "route": "", "departure": "", "arrival": "", "duration": "", "price": ""}


def _fetch_compact_hotel(h_id: str) -> Dict[str, Any]:
    try:
        # First try to query by hotelOfferId (for regular hotels)
        res = hotels_table.query(
            KeyConditionExpression=Key("hotelOfferId").eq(h_id),
            ScanIndexForward=False,  # Get most recent
            Limit=1
        )
        items = res.get("Items", [])
        
        root = items[0] if items else {}
        
        # Check if this is a booked hotel (has hotelOffersDetails.booked = true) or regular hotel
        hotel_offers_details = root.get("hotelOffersDetails", {})
        is_booked = hotel_offers_details.get("booked", False)
        
        if is_booked:
            # For booked hotels, data is stored in hotelOffersDetails.hotelPricingData.data
            hotel_pricing_data = hotel_offers_details.get("hotelPricingData", {})
            pricing_data = hotel_pricing_data.get("data", {})
            
            if not pricing_data:
                return {"id": h_id, "hotelId": "", "name": "", "location": "", "check_in": "", "check_out": "", "nights": "", "price_per_night": "", "overall_price": ""}

            hotel_info = pricing_data.get("hotel", {})
            offers = pricing_data.get("offers", [])
            hotel_offer = offers[0] if offers else {}
            
        else:
            item = hotel_offers_details
            if not item:
                return {"id": h_id, "hotelId": "", "name": "", "location": "", "check_in": "", "check_out": "", "nights": "", "price_per_night": "", "overall_price": ""}

            hotel_info = item.get("hotel", {})
            offers = item.get("offers", [])
            hotel_offer = offers[0] if offers else {}
        
        price_info = hotel_offer.get("price", {})
        total_price = price_info.get("total", "")
        currency = price_info.get("currency", "")
        check_in = hotel_offer.get("checkInDate", "")
        check_out = hotel_offer.get("checkOutDate", "")

        name = hotel_info.get("name", "")
        address = hotel_info.get("address", {}) or {}
        city = address.get("cityName") or hotel_info.get("cityCode", "")
        country = address.get("countryCode", "")
        location = ", ".join([p for p in [city, country] if p])

        # Nights and per-night price
        nights = ""
        price_per_night = ""
        try:
            if check_in and check_out:
                d_in = date.fromisoformat(check_in)
                d_out = date.fromisoformat(check_out)
                delta = (d_out - d_in).days
                if delta > 0:
                    nights = str(delta)
                    try:
                        total_float = float(total_price)
                        price_per_night = f"{round(total_float / delta, 2)} {currency}".strip()
                    except Exception:
                        price_per_night = ""
        except Exception:
            nights = ""

        overall_price = f"{total_price} {currency}".strip()

        # Extract hotelId for ratings API
        hotelId = hotel_info.get("hotelId", "")
        
        result = {
            "id": h_id,
            "hotelId": hotelId,  # Add Amadeus hotelId for ratings API
            "name": name,
            "location": location,
            "check_in": check_in,
            "check_out": check_out,
            "nights": nights,
            "price_per_night": price_per_night,
            "overall_price": overall_price,
        }
        return result
    except Exception as e:
        print(f"[fetch_trip_card] Exception fetching hotel {h_id}: {e}")
        return {"id": h_id, "hotelId": "", "name": "", "location": "", "check_in": "", "check_out": "", "nights": "", "price_per_night": "", "overall_price": ""}


def lambda_handler(event, context):
    headers = _cors_headers()

    # Pre-flight CORS
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    # Accept both API Gateway/Function URL proxy events and direct Lambda console tests
    body = {}
    raw_body = event.get("body") if isinstance(event, dict) else None
    if isinstance(raw_body, (str, bytes)):
        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            return _bad_request("Invalid JSON body")
    elif isinstance(event, dict):
        # Fallback: allow direct invocation with fields at the top level
        candidate_keys = {"user_id", "chat_id"}
        if any(k in event for k in candidate_keys):
            body = {k: event.get(k) for k in candidate_keys if k in event}
        else:
            body = {}

    user_id = (body.get("user_id") or "").strip()
    chat_id = (body.get("chat_id") or "").strip()
    if not user_id or not chat_id:
        return _bad_request("user_id and chat_id are required")

    try:
        # Fetch trip data from trips table
        trip_key = {"UserAndChatID": f"{user_id}:{chat_id}"}
        trip_response = trips_table.get_item(Key=trip_key)
        trip_item = trip_response.get("Item", {})
        
        if not trip_item:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({"error": "Trip not found"}),
            }

        # Extract basic trip data
        trip_data = {
            "UserAndChatID": trip_item.get("UserAndChatID", ""),
            "last_modified": trip_item.get("last modified", ""),
            "destinations": trip_item.get("destinations", []),
            "dates": trip_item.get("dates", ""),
            "summary": trip_item.get("summary", ""),
        }

        # Process flight and hotel tuples to include status in the response

        # Fetch compact flight details with status from tuples
        compact_flights = []
        for i, flight_tuple in enumerate(trip_item.get("flight_tuples", [])):
            if isinstance(flight_tuple, list) and len(flight_tuple) >= 1:
                flight_id = str(flight_tuple[0])
                flight_status = str(flight_tuple[1]) if len(flight_tuple) > 1 else "available"
                compact_flight = _fetch_compact_flight(flight_id)
                compact_flight["status"] = flight_status
                compact_flights.append(compact_flight)

        # Fetch compact hotel details with status from tuples
        compact_hotels = []
        for i, hotel_tuple in enumerate(trip_item.get("hotel_tuples", [])):
            if isinstance(hotel_tuple, list) and len(hotel_tuple) >= 1:
                hotel_id = str(hotel_tuple[0])
                hotel_status = str(hotel_tuple[1]) if len(hotel_tuple) > 1 else "available"
                compact_hotel = _fetch_compact_hotel(hotel_id)
                compact_hotel["status"] = hotel_status
                compact_hotels.append(compact_hotel)

        # Build response with trip data and compact details
        response_data = {
            "trip": trip_data,
            "flights": compact_flights,
            "hotels": compact_hotels,
        }

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(response_data),
        }

    except Exception as e:
        return _server_error(f"Failed to fetch trip data: {str(e)}")
