import json
import os
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import boto3
from boto3.dynamodb.conditions import Key
import requests
from botocore.exceptions import ClientError
from concurrent.futures import ThreadPoolExecutor, as_completed

# ========================= Config =========================
AMADEUS_BASE_URL = "https://test.api.amadeus.com"  # Sandbox
OAUTH_TOKEN_URL = f"{AMADEUS_BASE_URL}/v1/security/oauth2/token"
HOTEL_RATINGS_ENDPOINT = f"{AMADEUS_BASE_URL}/v2/e-reputation/hotel-sentiments"

HTTP_TIMEOUT_SECONDS = int(os.getenv("HTTP_TIMEOUT", "20"))
MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "3"))  # Limit for ratings API
MAX_HOTELS_PER_CALL = 3  # Amadeus limit for hotel ratings API

# Use the same credentials pattern as other lambdas
CLIENT_ID = os.environ.get("AMADEUS_CLIENT_ID")
CLIENT_SECRET = os.environ.get("AMADEUS_CLIENT_SECRET")
TOKEN_KEY = 'access_token'

# DynamoDB setup
dynamodb = boto3.resource('dynamodb')
service_tokens_table = dynamodb.Table('ServiceTokens')

# ========================= Token helpers (using proven pattern) =========================
def get_token_from_db():
    """Get token from DynamoDB using the same pattern as other lambdas."""
    try:
        response = service_tokens_table.get_item(Key={
            'serviceName': 'AmadeusAPI',
            'tokenType': 'hotel-search'
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
    """Store token in DynamoDB using the same pattern as other lambdas."""
    try:
        expires_at = time.time() + expires_in - 300  # 5 min buffer
        service_tokens_table.put_item(Item={
            'serviceName': 'AmadeusAPI',
            'tokenType': 'hotel-search',
            'id': TOKEN_KEY,
            'token': token,
            'expires_at': expires_at
        })
        return True
    except ClientError as e:
        print("Error storing token:", e)
        return False

def get_amadeus_token():
    """Get Amadeus token, refresh if needed."""
    # Try to get from DB first
    token = get_token_from_db()
    if token:
        return token
    
    # Get new token
    try:
        response = requests.post(
            OAUTH_TOKEN_URL,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            data={
                'grant_type': 'client_credentials',
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET
            },
            timeout=HTTP_TIMEOUT_SECONDS
        )
        response.raise_for_status()
        
        token_data = response.json()
        token = token_data['access_token']
        expires_in = token_data.get('expires_in', 1799)
        
        # Store in DB
        store_token_in_db(token, expires_in)
        
        return token
    except Exception as e:
        print(f"Error getting Amadeus token: {e}")
        return None

# ========================= Hotel Ratings API =========================
def call_amadeus_hotel_ratings(hotel_ids: List[str], token: str) -> Dict:
    """
    Call Amadeus Hotel Sentiments API for hotel ratings.
    
    Args:
        hotel_ids: List of Amadeus hotelIds (max 3 per call)
        token: Amadeus access token
    
    Returns:
        Dict with API response
    """
    if len(hotel_ids) > MAX_HOTELS_PER_CALL:
        raise ValueError(f"Maximum {MAX_HOTELS_PER_CALL} hotel IDs per call")
    
    try:
        # Build the hotelIds parameter (comma-separated)
        hotel_ids_param = ",".join(hotel_ids)
        
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        # Build the full URL with query parameters
        url = f"{HOTEL_RATINGS_ENDPOINT}?hotelIds={hotel_ids_param}"
        
        print(f"Calling Amadeus Hotel Ratings API: {url}")
        
        response = requests.get(
            url,
            headers=headers,
            timeout=HTTP_TIMEOUT_SECONDS
        )
        
        print(f"Amadeus API response status: {response.status_code}")
        print(f"Amadeus API response headers: {dict(response.headers)}")
        
        response.raise_for_status()
        
        json_response = response.json()
        print(f"Amadeus API response body: {json.dumps(json_response, indent=2)}")
        
        return json_response
        
    except requests.exceptions.HTTPError as e:
        print(f"HTTP error calling Amadeus Hotel Ratings API: {e}")
        print(f"Response content: {e.response.text if e.response else 'No response'}")
        raise
    except Exception as e:
        print(f"Error calling Amadeus Hotel Ratings API: {e}")
        raise

def process_hotel_ratings_batch(hotel_batch: List[Tuple[str, str]], token: str) -> List[Dict]:
    """
    Process a batch of hotels (max 3) and get their ratings.
    
    Args:
        hotel_batch: List of tuples (hotel_id, hotelId)
        token: Amadeus access token
    
    Returns:
        List of rating results
    """
    try:
        # Extract hotelIds for the API call
        hotel_ids = [hotelId for hotel_id, hotelId in hotel_batch]
        
        # Call Amadeus API
        amadeus_response = call_amadeus_hotel_ratings(hotel_ids, token)
        
        print(f"Processing batch response for hotels: {hotel_ids}")
        print(f"Amadeus response keys: {list(amadeus_response.keys()) if amadeus_response else 'None'}")
        
        # Create mapping of hotelId to rating data
        rating_data = {}
        if 'data' in amadeus_response and amadeus_response['data']:
            print(f"Found 'data' in response with {len(amadeus_response['data'])} items")
            for rating in amadeus_response['data']:
                print(f"Rating item keys: {list(rating.keys()) if rating else 'None'}")
                print(f"Rating item hotelId: {rating.get('hotelId', 'MISSING')}")
                rating_data[rating.get('hotelId')] = rating
        else:
            print("No 'data' key found or data array is empty in Amadeus response")
        
        # Check for warnings (hotels not found in database)
        warnings = amadeus_response.get('warnings', [])
        not_found_hotels = set()
        if warnings:
            print(f"Amadeus warnings: {len(warnings)} warnings found")
            for warning in warnings:
                if warning.get('code') == 913:  # PROPERTIES NOT FOUND
                    hotel_id_not_found = warning.get('source', {}).get('pointer')
                    if hotel_id_not_found:
                        not_found_hotels.add(hotel_id_not_found)
                        print(f"Hotel {hotel_id_not_found} not found in Amadeus ratings database")
        
        print(f"Rating data mapping: {list(rating_data.keys())}")
        print(f"Hotels not found in ratings DB: {list(not_found_hotels)}")
        
        # Build response pairing hotel_id with rating data
        results = []
        for hotel_id, hotelId in hotel_batch:
            rating_info = rating_data.get(hotelId)
            is_not_found = hotelId in not_found_hotels
            
            if rating_info:
                # Hotel has rating data
                print(f"Hotel {hotel_id} (hotelId: {hotelId}) -> has rating data")
                results.append({
                    'hotel_id': hotel_id,
                    'hotelId': hotelId,
                    'success': True,
                    'rating_data': rating_info
                })
            elif is_not_found:
                # Hotel explicitly not found in Amadeus ratings database
                print(f"Hotel {hotel_id} (hotelId: {hotelId}) -> not found in ratings DB, using fallback")
                results.append({
                    'hotel_id': hotel_id,
                    'hotelId': hotelId,
                    'success': True,  # Mark as success but with fallback data
                    'rating_data': {
                        'hotelId': hotelId,
                        'overallRating': None,  # No rating available
                        'numberOfRatings': 0,
                        'sentiments': {},
                        'unavailable': True,  # Flag to indicate rating is unavailable
                        'reason': 'Hotel not found in ratings database'
                    }
                })
            else:
                # Unknown error or other issue
                print(f"Hotel {hotel_id} (hotelId: {hotelId}) -> unknown error")
                results.append({
                    'hotel_id': hotel_id,
                    'hotelId': hotelId,
                    'success': False,
                    'rating_data': None,
                    'error': 'Unknown error retrieving rating'
                })
        
        return results
        
    except Exception as e:
        print(f"Error processing hotel ratings batch: {e}")
        # Return failed results for all hotels in batch
        return [{
            'hotel_id': hotel_id,
            'hotelId': hotelId,
            'success': False,
            'error': str(e),
            'rating_data': None
        } for hotel_id, hotelId in hotel_batch]

# ========================= Lambda Handler =========================
def lambda_handler(event, context):
    """
    AWS Lambda handler for getting hotel ratings.
    
    Expected event format:
    {
        "hotels": [
            {"hotel_id": "our_hotel_id_1", "hotelId": "amadeus_hotel_id_1"},
            {"hotel_id": "our_hotel_id_2", "hotelId": "amadeus_hotel_id_2"},
            ...
        ]
    }
    
    Returns:
    {
        "success": true,
        "data": [
            {
                "hotel_id": "our_hotel_id_1",
                "hotelId": "amadeus_hotel_id_1", 
                "success": true,
                "rating_data": {...}
            },
            ...
        ]
    }
    """
    print(f"Lambda invoked with event: {json.dumps(event)}")
    
    # CORS headers
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Headers": "Content-Type",
    }
    
    # Handle preflight OPTIONS request
    if (event.get("requestContext", {}).get("http", {}) or {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}
    
    try:
        # Parse input from request body
        request_body = event
        if isinstance(event.get('body'), str):
            request_body = json.loads(event.get('body', '{}'))
        
        hotels = request_body.get('hotels', [])
        if not hotels:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'No hotels provided'
                })
            }
        
        print(f"Processing ratings for {len(hotels)} hotels")
        
        # Get Amadeus token
        token = get_amadeus_token()
        if not token:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Failed to get Amadeus token'
                })
            }
        
        # Group hotels into batches of 3 (API limit)
        hotel_batches = []
        for i in range(0, len(hotels), MAX_HOTELS_PER_CALL):
            batch = hotels[i:i + MAX_HOTELS_PER_CALL]
            hotel_tuples = [(hotel['hotel_id'], hotel['hotelId']) for hotel in batch]
            hotel_batches.append(hotel_tuples)
        
        print(f"Created {len(hotel_batches)} batches for API calls")
        
        # Process batches concurrently
        all_results = []
        with ThreadPoolExecutor(max_workers=MAX_CONCURRENT_REQUESTS) as executor:
            future_to_batch = {
                executor.submit(process_hotel_ratings_batch, batch, token): batch 
                for batch in hotel_batches
            }
            
            for future in as_completed(future_to_batch):
                batch_results = future.result()
                all_results.extend(batch_results)
        
        print(f"Successfully processed ratings for {len(all_results)} hotels")
        
        # Count successes and failures
        successful = sum(1 for result in all_results if result['success'])
        failed = len(all_results) - successful
        
        print(f"Rating results: {successful} successful, {failed} failed")
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'data': all_results,
                'summary': {
                    'total_hotels': len(all_results),
                    'successful_ratings': successful,
                    'failed_ratings': failed
                }
            })
        }
        
    except Exception as e:
        print(f"Lambda error: {e}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }
