import hashlib
import json
import time
import boto3
import requests
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
from datetime import datetime, timezone, timedelta
import os

CLIENT_ID = os.environ.get("AMADEUS_CLIENT_ID")
CLIENT_SECRET = os.environ.get("AMADEUS_CLIENT_SECRET")
TOKEN_KEY = 'access_token'
AMADEUS_GET_TOKEN_URL = "https://test.api.amadeus.com/v1/security/oauth2/token"

dynamodb = boto3.resource('dynamodb')
service_tokens_table = dynamodb.Table('ServiceTokens')
flights_table = dynamodb.Table('Flights')


def generate_flight_id(flight_offer):
    """
    Generate a unique flight ID that considers all itineraries and key differentiating factors.
    """
    # Include the Amadeus flight offer ID as a base identifier
    amadeus_id = flight_offer.get("id", "")
    
    # Build signature from all itineraries (outbound + return)
    itinerary_signatures = []
    
    for i, itinerary in enumerate(flight_offer.get("itineraries", [])):
        itinerary_segments = []
        for seg in itinerary.get("segments", []):
            # Include more detailed segment information
            segment_sig = (
                f"{seg.get('departure', {}).get('iataCode', '')}-"
                f"{seg.get('arrival', {}).get('iataCode', '')}-"
                f"{seg.get('departure', {}).get('at', '')}-"
                f"{seg.get('arrival', {}).get('at', '')}-"
                f"{seg.get('carrierCode', '')}-"
                f"{seg.get('number', '')}-"
                f"{seg.get('id', '')}-"
                f"{seg.get('duration', '')}"
            )
            itinerary_segments.append(segment_sig)
        
        # Add itinerary duration and segment count
        itinerary_sig = f"ITIN_{i}:{itinerary.get('duration', '')}:{len(itinerary_segments)}:{'|'.join(itinerary_segments)}"
        itinerary_signatures.append(itinerary_sig)
    
    # Include pricing information for additional uniqueness
    price_info = ""
    if "price" in flight_offer:
        price = flight_offer["price"]
        price_info = f"PRICE:{price.get('total', '')}:{price.get('currency', '')}:{price.get('base', '')}"
    
    # Include fare class information from travelerPricings
    fare_classes = []
    for traveler in flight_offer.get("travelerPricings", []):
        for fare_detail in traveler.get("fareDetailsBySegment", []):
            fare_classes.append(f"{fare_detail.get('class', '')}:{fare_detail.get('fareBasis', '')}")
    
    fare_info = f"FARES:{'|'.join(fare_classes)}" if fare_classes else ""
    
    # Combine all elements for final signature
    signature_parts = [
        f"AMADEUS_ID:{amadeus_id}",
        f"ITINERARIES:{len(itinerary_signatures)}",
        *itinerary_signatures,
        price_info,
        fare_info
    ]
    
    final_signature = "||".join(filter(None, signature_parts))
    
    return hashlib.sha256(final_signature.encode()).hexdigest()


def save_flight_details(flight_details):
    try:
        flight_id = generate_flight_id(flight_details)
        departure_time = convert_date_from_str_to_epoch(flight_details["itineraries"][0]["segments"][0]["departure"]["at"])
        flights_table.put_item(
            ConditionExpression="attribute_not_exists(flightId)",
            Item={
                'flightId': flight_id,
                'timestamp': int(time.time() * 1000),
                'flightDetails': flight_details,
                'departureTime': departure_time,
            }
        )
        return flight_id
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            print("Flight already exists. Skipping insert.")
        else:
            raise
        return None


def convert_date_from_str_to_epoch(date_str):
    departure_dt = datetime.fromisoformat(date_str)

    # Ensure it's in UTC. If it's not timezone-aware, assume it's UTC:
    if departure_dt.tzinfo is None:
        departure_dt = departure_dt.replace(tzinfo=timezone.utc)

    # Convert to Unix timestamp (seconds) and add 1 day (24 hours)
    return int(departure_dt.timestamp()) + 86400


def get_token_from_db():
    try:
        response = service_tokens_table.get_item(Key={
            'serviceName': 'AmadeusAPI',
            'tokenType': 'flight-search-v2'
        })

        item = response.get('Item')
        if item and item.get('id') == 'access_token':
            current_time = time.time()
            expires_at = item['expires_at']
            
            if current_time < expires_at:
                return item['token']
            else:
                print("Token has expired!")
        return None
    except ClientError as e:
        print("DynamoDB error:", e)
        return None


def store_token_in_db(token, expires_in):
    try:
        expires_at = int(time.time()) + expires_in - 60  # 60 sec buffer
        item = {
            'serviceName': 'AmadeusAPI',
            'tokenType': 'flight-search-v2',
            'id': 'access_token',
            'token': token,
            'expires_at': expires_at
        }
        service_tokens_table.put_item(Item=item)
    except ClientError as e:
        print("Failed to store token:", e)


def get_token_from_amadeus():
    url = AMADEUS_GET_TOKEN_URL
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    }

    response = requests.post(url, headers=headers, data=data)
    response.raise_for_status()
    return response.json()


def get_token():
    token = get_token_from_db()
    if token:
        return token

    result = get_token_from_amadeus()
    store_token_in_db(result['access_token'], result['expires_in'])
    return result['access_token']


def lambda_handler(event, context):
    # CORS headers
    response_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    }

    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": response_headers,
            "body": ""
        }

    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            'headers': response_headers,
            "body": json.dumps({"error": "Invalid JSON"})
        }

    try:
        params = body['params']
        token = get_token()
        
        amadeus_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Clean and validate Amadeus parameters
        amadeus_params = params.copy()
        
        # Only add returnDate if it's missing
        if 'returnDate' not in amadeus_params or not amadeus_params.get('returnDate'):
            try:
                dep_date = datetime.strptime(amadeus_params['departureDate'], '%Y-%m-%d')
                ret_date = dep_date + timedelta(days=7)  # Default 7 days later
                amadeus_params['returnDate'] = ret_date.strftime('%Y-%m-%d')
            except Exception:
                print("Could not add default returnDate")
        
        # Remove any None or empty values
        amadeus_params = {k: v for k, v in amadeus_params.items() if v is not None and v != ''}
        
        # Make request to Amadeus API
        response = requests.get(
            "https://test.api.amadeus.com/v2/shopping/flight-offers",
            headers=amadeus_headers,
            params=amadeus_params
        )

        if response.status_code != 200:
            print(f"Amadeus error: {response.text}")
            
        response.raise_for_status()
        amadeus_data = response.json()
        
        # Save flight details to DynamoDB and collect IDs
        out_ids = []
        for i, flight in enumerate(amadeus_data.get('data', [])):
            flight_id = save_flight_details(flight)
            if flight_id:
                out_ids.append(flight_id)
            else:
                print(f"Flight {i+1}: Failed to save (duplicate or error)")

        amadeus_data['flightIds'] = out_ids
        
        return {
            'statusCode': 200,
            'headers': response_headers,
            'body': json.dumps(amadeus_data)
        }

    except Exception as e:
        print(f"Error in search_flights: {str(e)}")
        return {
            'statusCode': 500,
            'headers': response_headers,
            'body': json.dumps({"error": str(e)})
        }
