import json
import time
import boto3
import requests
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
from datetime import datetime, timezone
from decimal import Decimal
import os

# ======== קיימים כבר אצלך בקוד (משתמש בהם כמו שהם) ========
CLIENT_ID = os.environ.get("AMADEUS_CLIENT_ID")
CLIENT_SECRET = os.environ.get("AMADEUS_CLIENT_SECRET")
TOKEN_KEY = 'access_token'
AMADEUS_GET_TOKEN_URL = "https://test.api.amadeus.com/v1/security/oauth2/token"
AMADEUS_FLIGHT_OFFERS_PRICE = "https://test.api.amadeus.com/v1/shopping/flight-offers/pricing"

dynamodb = boto3.resource('dynamodb')
service_tokens_table = dynamodb.Table('ServiceTokens')
flights_table = dynamodb.Table('Flights')

def get_token_from_db():
    try:
        response = service_tokens_table.get_item(Key={
            'serviceName': 'AmadeusAPI',
            'tokenType': 'flight-search'
        })
        item = response.get('Item')
        if item and item.get('id') == 'access_token':
            if time.time() < item['expires_at']:
                return item['token']
        return None
    except ClientError as e:
        print("DynamoDB error:", e)
        return None

def store_token_in_db(token, expires_in):
    try:
        expires_at = int(time.time()) + expires_in - 60
        item = {
            'serviceName': 'AmadeusAPI',
            'tokenType': 'flight-search',
            'id': 'access_token',
            'token': token,
            'expires_at': expires_at
        }
        service_tokens_table.put_item(Item=item)
    except ClientError as e:
        print("Failed to store token:", e)

def get_token_from_amadeus():
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    }
    r = requests.post(AMADEUS_GET_TOKEN_URL, headers=headers, data=data)
    r.raise_for_status()
    return r.json()

def get_token():
    token = get_token_from_db()
    if token:
        return token
    result = get_token_from_amadeus()
    store_token_in_db(result['access_token'], result['expires_in'])
    return result['access_token']

# ======== עוזרים חדשים ללמבדת ה-PRICE ========

def _decimal_to_native(obj):
    """המרה רקורסיבית מ-Decimal ל-int/float כדי ש-json.dumps יעבוד נקי."""
    if isinstance(obj, list):
        return [_decimal_to_native(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _decimal_to_native(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        # שמירה על שלמים כ-int
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    return obj

def _get_flight_offer_by_id(flight_id: str):
    """Get flightDetails from Flights table by flightId."""
    try:
        # Query by partition key (flightId) and get the most recent flight (highest timestamp)
        response = flights_table.query(
            KeyConditionExpression=Key('flightId').eq(flight_id),
            ScanIndexForward=False,  # Return items in descending order (newest first)
            Limit=1  # Get only the most recent flight
        )
        
        items = response.get('Items', [])
        if not items:
            return None
            
        # Get the first (most recent) item
        item = items[0]
        
        # Return the flightDetails from the item
        return item.get('flightDetails')
        
    except ClientError as e:
        print(f"DynamoDB query error: {e}")
        raise

def _price_flight_offer(token: str, flight_offer: dict, include_options=None):
    """Call Amadeus Flight Offers Price API and return JSON response."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    # Build the URL with include parameters
    url = AMADEUS_FLIGHT_OFFERS_PRICE
    if include_options and len(include_options) > 0:
        include_params = ','.join(include_options)
        url += f"?include={include_params}"
    
    payload = {
        "data": {
            "type": "flight-offers-pricing",
            "flightOffers": [flight_offer]
        }
    }
    
    r = requests.post(url, headers=headers, data=json.dumps(payload))
    r.raise_for_status()
    return r.json()

def _price_multiple_flight_offers(token: str, flight_offers: list, include_options=None):
    """Call Amadeus Flight Offers Price API with multiple flight offers and return JSON response."""
    print("_price_multiple_flight_offers: Starting API call")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # Build the URL with include parameters
    url = AMADEUS_FLIGHT_OFFERS_PRICE
    if include_options and len(include_options) > 0:
        include_params = ','.join(include_options)
        url += f"?include={include_params}"

    print(f"API URL: {url}")
    print(f"Number of flight offers: {len(flight_offers)}")

    payload = {
        "data": {
            "type": "flight-offers-pricing",
            "flightOffers": flight_offers
        }
    }

    print(f"Payload size: {len(json.dumps(payload))} characters")

    try:
        print("Making HTTP request to Amadeus API")
        r = requests.post(url, headers=headers, data=json.dumps(payload))
        print(f"Response status code: {r.status_code}")

        if r.status_code != 200:
            print(f"Error response: {r.text}")

        r.raise_for_status()
        response_json = r.json()
        print("API call successful, returning response")
        return response_json
    except requests.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response status: {e.response.status_code}")
        print(f"Response text: {e.response.text}")
        raise

# ======== Test Handler for Debugging ========

def test_lambda_handler(event, context):
    """Simple test handler to verify Lambda is working"""
    response_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    }

    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": response_headers, "body": ""}

    return {
        "statusCode": 200,
        "headers": response_headers,
        "body": json.dumps({
            "message": "Lambda is working",
            "received": event.get('body', '{}'),
            "method": event.get("requestContext", {}).get("http", {}).get("method")
        })
    }

# ======== ה-Handler החדש: מקבל flightId ומחזיר Price ========

def lambda_handler(event, context):
    # CORS
    response_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": response_headers, "body": ""}

    # Parse request body
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return {"statusCode": 400, "headers": response_headers, "body": json.dumps({"error": "Invalid JSON"})}

    # Extract flight IDs from request - support both single flightId and list of flightIds
    flight_ids = []
    
    # Check for single flightId (backward compatibility)
    single_flight_id = (
        body.get('flightId')
        or event.get('pathParameters', {}).get('flightId')
        or event.get('queryStringParameters', {}).get('flightId') if event.get('queryStringParameters') else None
    )
    
    if single_flight_id:
        flight_ids = [single_flight_id]
    else:
        # Check for list of flightIds
        flight_ids = body.get('flightIds', [])
        if not isinstance(flight_ids, list):
            return {"statusCode": 400, "headers": response_headers, "body": json.dumps({"error": "flightIds must be a list"})}

    if not flight_ids or len(flight_ids) == 0:
        return {"statusCode": 400, "headers": response_headers, "body": json.dumps({"error": "Missing flightId or flightIds"})}

    try:
        print(f"Processing flight IDs: {flight_ids}")

        # Get all flight offers from database
        flight_offers = []
        for flight_id in flight_ids:
            print(f"Fetching flight {flight_id} from database")
            flight_offer = _get_flight_offer_by_id(flight_id)
            if not flight_offer:
                print(f"Flight {flight_id} not found in database")
                return {"statusCode": 404, "headers": response_headers, "body": json.dumps({"error": f"Flight {flight_id} not found"})}
            print(f"Found flight {flight_id}: {flight_offer.keys() if isinstance(flight_offer, dict) else 'not dict'}")
            flight_offers.append(flight_offer)

        # Convert Decimal types for JSON serialization
        flight_offers = [_decimal_to_native(offer) for offer in flight_offers]

        # Get Amadeus token
        print("Getting Amadeus token")
        token = get_token()
        print(f"Token obtained: {token[:20]}..." if token else "No token obtained")

        # Extract include options from request
        include_options = body.get('include', [])
        if isinstance(include_options, str):
            include_options = [include_options] if include_options else []
        print(f"Include options: {include_options}")
        print(f"Number of flight offers to price: {len(flight_offers)}")

        # Call Amadeus Flight Offers Price API with all flight offers
        print("Calling Amadeus Flight Offers Price API")
        priced = _price_multiple_flight_offers(token, flight_offers, include_options)
        print("Amadeus API call successful")

        # Return pricing response
        return {
            "statusCode": 200,
            "headers": response_headers,
            "body": json.dumps(priced)
        }

    except requests.HTTPError as e:
        # Return Amadeus API error details
        try:
            err_json = e.response.json()
        except Exception:
            err_json = {"status": e.response.status_code, "text": e.response.text}
        return {"statusCode": 502, "headers": response_headers, "body": json.dumps({"error": "Amadeus pricing failed", "details": err_json})}
    except Exception as e:
        return {"statusCode": 500, "headers": response_headers, "body": json.dumps({"error": str(e)})}
