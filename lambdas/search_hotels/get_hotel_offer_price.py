import json
import os
import time
from typing import Dict, List, Optional
import boto3
from boto3.dynamodb.conditions import Key
import requests
from botocore.exceptions import ClientError
from concurrent.futures import ThreadPoolExecutor, as_completed

# ========================= Config =========================
AMADEUS_BASE_URL = "https://test.api.amadeus.com"  # Sandbox
OAUTH_TOKEN_URL = f"{AMADEUS_BASE_URL}/v1/security/oauth2/token"
HOTEL_PRICING_ENDPOINT = f"{AMADEUS_BASE_URL}/v3/shopping/hotel-offers"
HOTEL_SEARCH_ENDPOINT = f"{AMADEUS_BASE_URL}/v3/shopping/hotel-offers"

HTTP_TIMEOUT_SECONDS = int(os.getenv("HTTP_TIMEOUT", "20"))
MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "5"))  # Limit concurrent Amadeus calls

# Use the same credentials pattern as other lambdas
CLIENT_ID = os.environ.get("AMADEUS_CLIENT_ID")
CLIENT_SECRET = os.environ.get("AMADEUS_CLIENT_SECRET")
TOKEN_KEY = 'access_token'

# DynamoDB setup
dynamodb = boto3.resource('dynamodb')
service_tokens_table = dynamodb.Table('ServiceTokens')
HOTELS_TABLE = dynamodb.Table('Hotels')

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
        expires_at = int(time.time()) + expires_in - 60
        item = {
            'serviceName': 'AmadeusAPI',
            'tokenType': 'hotel-search',
            'id': 'access_token',
            'token': token,
            'expires_at': expires_at
        }
        service_tokens_table.put_item(Item=item)
    except ClientError as e:
        print("Failed to store token:", e)

def get_token_from_amadeus():
    """Get new token from Amadeus using the same pattern as other lambdas."""
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    }
    r = requests.post(OAUTH_TOKEN_URL, headers=headers, data=data)
    r.raise_for_status()
    return r.json()

def get_token():
    """Main token function using the same pattern as other lambdas."""
    token = get_token_from_db()
    if token:
        return token
    result = get_token_from_amadeus()
    store_token_in_db(result['access_token'], result['expires_in'])
    return result['access_token']

# ========================= Hotel data helpers =========================
def get_hotel_offer_details(hotel_id: str) -> Optional[Dict]:
    """Retrieve hotel offer details from DynamoDB for a given hotel ID."""
    try:
        response = HOTELS_TABLE.query(
            KeyConditionExpression=Key("hotelOfferId").eq(hotel_id),
            ScanIndexForward=False,
            Limit=1
        )
        items = response.get("Items", [])
        if items:
            return items[0].get("hotelOffersDetails", {})
        return None
    except Exception as e:
        print(f"Error retrieving hotel details for {hotel_id}: {e}")
    return None


def extract_offer_ids(hotel_details: Dict) -> List[str]:
    """Extract offer IDs from hotel offer details."""
    offers = hotel_details.get("offers", [])
    offer_ids = []
    
    for offer in offers:
        if isinstance(offer, dict) and offer.get("id"):
            offer_ids.append(str(offer["id"]))
    
    return offer_ids


def extract_self_url_from_hotel_details(hotel_details: Dict) -> Optional[str]:
    """Extract the 'self' URL from hotel offer details for fallback."""
    try:
        # Look for self URL in the hotel details structure
        if isinstance(hotel_details, dict):
            # Check if self URL is at the top level
            if "self" in hotel_details:
                self_url = hotel_details["self"]
                return self_url
            
            # Check if self URL is in offers
            offers = hotel_details.get("offers", [])
            for i, offer in enumerate(offers):
                if isinstance(offer, dict) and "self" in offer:
                    self_url = offer["self"]
                    return self_url
            
            # Check if self URL is in the main hotel data
            if "data" in hotel_details and "self" in hotel_details["data"]:
                self_url = hotel_details["data"]["self"]
                return self_url
        
        return None
    except Exception as e:
        print(f"Error extracting self URL: {e}")
        return None


def call_amadeus_hotel_search_with_self_url(self_url: str, access_token: str) -> Optional[Dict]:
    """Call Amadeus hotel search API using the 'self' URL to get fresh offer data."""

    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        
        response = requests.get(
            self_url, 
            headers=headers, 
            timeout=HTTP_TIMEOUT_SECONDS
        )
        response.raise_for_status()
        
        return response.json()

    except requests.HTTPError as http_err:
        print(f"HTTP error calling self URL: {http_err}")
        return None
        
    except Exception as e:
        print(f"Unexpected error calling self URL: {e}")
        return None


def call_amadeus_hotel_pricing(offer_id: str, access_token: str, hotel_details: Dict = None) -> Dict:
    """Make a single API call to Amadeus hotel pricing API for a specific offer ID."""
    try:
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        # The Amadeus hotel pricing API expects a GET request to the specific offer endpoint
        offer_url = f"{HOTEL_PRICING_ENDPOINT}/{offer_id}"
        
        response = requests.get(
            offer_url, 
            headers=headers, 
            timeout=HTTP_TIMEOUT_SECONDS
        )
        response.raise_for_status()
        
        return {
            "offer_id": offer_id,
            "success": True,
            "data": response.json()
        }
        
    except requests.HTTPError as http_err:
        print(f"HTTP error for offer {offer_id}: {http_err}")
        try:
            error_details = http_err.response.json()
        except:
            error_details = {"status": http_err.response.status_code, "text": http_err.response.text}
        
        return {
            "offer_id": offer_id,
            "success": False,
            "error": f"HTTP {http_err.response.status_code}",
            "details": error_details
        }
        
    except Exception as e:
        print(f"Unexpected error for offer {offer_id}: {e}")
        return {
            "offer_id": offer_id,
            "success": False,
            "error": str(e)
        }


def process_hotel_pricing_with_fallback(hotel_id: str, hotel_details: Dict, access_token: str) -> Dict:
    """Process hotel pricing with fallback logic for all pricing failures."""
    offer_ids = extract_offer_ids(hotel_details)
    if not offer_ids:
        return {
            "success": False,
            "error": "No offer IDs found in hotel details"
        }
    
    # First attempt: Try pricing with current offer IDs
    hotel_results = []
    with ThreadPoolExecutor(max_workers=MAX_CONCURRENT_REQUESTS) as executor:
        future_to_offer = {
            executor.submit(call_amadeus_hotel_pricing, offer_id, access_token, hotel_details): offer_id 
            for offer_id in offer_ids
        }
        
        for future in as_completed(future_to_offer):
            result = future.result()
            hotel_results.append(result)
    
    # Check if we have ROOM TYPE INVALID errors that we can handle
    failed_offers_with_fallback = []
    successful_results = []
    
    for result in hotel_results:
        if result["success"]:
            successful_results.append(result)
        elif extract_self_url_from_hotel_details(hotel_details):
            # Try fallback for any failed offer if we have a self URL
            failed_offers_with_fallback.append(result)
        else:
            # No self URL available for fallback, just add to results
            successful_results.append(result)
    
    # If we have failed offers and can try fallback, attempt it
    if failed_offers_with_fallback:
        # Get fresh offer data using self URL
        self_url = extract_self_url_from_hotel_details(hotel_details)
        if self_url:
            fresh_hotel_data = call_amadeus_hotel_search_with_self_url(self_url, access_token)
            if fresh_hotel_data:
                # Extract fresh offer IDs from the new data
                fresh_offer_ids = extract_offer_ids(fresh_hotel_data)
                if fresh_offer_ids:                    
                    # Retry pricing with fresh offer IDs
                    with ThreadPoolExecutor(max_workers=MAX_CONCURRENT_REQUESTS) as executor:
                        fallback_future_to_offer = {
                            executor.submit(call_amadeus_hotel_pricing, offer_id, access_token, fresh_hotel_data): offer_id 
                            for offer_id in fresh_offer_ids
                        }
                        
                        for future in as_completed(fallback_future_to_offer):
                            fallback_result = future.result()
                            if fallback_result["success"]:
                                successful_results.append(fallback_result)
                            else:
                                # Even fallback failed, add to results
                                successful_results.append(fallback_result)
                else:
                    # Add original failed results
                    successful_results.extend(failed_offers_with_fallback)
            else:
                # Add original failed results
                successful_results.extend(failed_offers_with_fallback)
        else:
            # Add original failed results
            successful_results.extend(failed_offers_with_fallback)
    else:
        # No fallback needed, use original results
        successful_results = hotel_results
    
    return {
        "success": True,
        "pricing_results": successful_results,
        "total_offers": len(offer_ids),
        "successful_pricing": len([r for r in successful_results if r["success"]]),
        "fallback_attempted": len(failed_offers_with_fallback) > 0
    }


def process_hotel_pricing_requests(hotel_ids: List[str]) -> List[Dict]:
    """Process multiple hotel pricing requests in parallel."""
    access_token = get_token()
    results = []
    
    # Process hotels sequentially but offers in parallel to avoid overwhelming Amadeus
    for hotel_id in hotel_ids:        
        # Get hotel details from DynamoDB
        hotel_details = get_hotel_offer_details(hotel_id)
        if not hotel_details:
            results.append({
                "hotel_id": hotel_id,
                "success": False,
                "used_fallback": False,
                "hotel_offer_price": None,
                "error": "Hotel details not found in database"
            })
            continue
        
        # Process pricing with fallback logic
        hotel_result = process_hotel_pricing_with_fallback(hotel_id, hotel_details, access_token)
        
        # Extract the first successful pricing result
        if hotel_result["success"] and hotel_result["pricing_results"]:
            first_pricing_result = hotel_result["pricing_results"][0]
            if first_pricing_result["success"]:
                results.append({
                    "hotel_id": hotel_id,
                    "success": True,
                    "used_fallback": hotel_result["fallback_attempted"],
                    "hotel_offer_price": first_pricing_result["data"]
                })
            else:
                results.append({
                    "hotel_id": hotel_id,
                    "success": False,
                    "used_fallback": hotel_result["fallback_attempted"],
                    "hotel_offer_price": None,
                    "error": first_pricing_result.get("error", "Pricing failed")
                })
        else:
            results.append({
                "hotel_id": hotel_id,
                "success": False,
                "used_fallback": hotel_result["fallback_attempted"],
                "hotel_offer_price": None,
                "error": "No successful pricing results"
            })
    
    return results

# ========================= Lambda handler =========================
def lambda_handler(event, context):
    # CORS
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Headers": "Content-Type",
    }
    if (event.get("requestContext", {}).get("http", {}) or {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    # 1) Parse request & extract hotelId(s)
    try:
        request_body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "Invalid JSON"})}

    # Prefer hotelIds array; accept hotelId (single); fall back to path/query.
    hotel_ids_list: Optional[List[str]] = request_body.get("hotelIds")
    if not hotel_ids_list and request_body.get("hotelId"):
        hotel_ids_list = [str(request_body["hotelId"])]

    if not hotel_ids_list:
        path_hotel_id = (event.get("pathParameters") or {}).get("hotelId")
        query_hotel_id = (event.get("queryStringParameters") or {}).get("hotelId")
        if path_hotel_id:
            hotel_ids_list = [str(path_hotel_id)]
        elif query_hotel_id:
            hotel_ids_list = [str(query_hotel_id)]

    if not hotel_ids_list or not isinstance(hotel_ids_list, (list, tuple)):
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "Missing hotelId(s)"})}

    # 2) Process all hotel pricing requests
    try:
        results = process_hotel_pricing_requests(hotel_ids_list)
        
        # Return the complete results
        response_body = {
            "success": True,
            "data": results  # This is now a list of hotel results
        }
        
        return {
            "statusCode": 200, 
            "headers": cors_headers,
            "body": json.dumps(response_body)
        }

    except Exception as unhandled:
        print(f"Unexpected error in lambda: {unhandled}")
        return {
            "statusCode": 500, 
            "headers": cors_headers, 
            "body": json.dumps({
                "error": "Internal server error", 
                "details": str(unhandled)
            })
        }
