import json
import time
import os
import boto3
import requests
from botocore.exceptions import ClientError
# Attr import removed - no longer needed for trip table operations
from decimal import Decimal
import hashlib
from datetime import datetime, timezone

# ========= Dynamo & Config =========
dynamodb = boto3.resource('dynamodb')
service_tokens_table = dynamodb.Table('ServiceTokens')
# trips_table removed - trip updates now handled by update_trip_card lambda
flights_table = dynamodb.Table("Flights")

AMADEUS_TOKEN_URL = "https://test.api.amadeus.com/v1/security/oauth2/token"
CREATE_ORDER_URL  = "https://test.api.amadeus.com/v1/booking/flight-orders"

CLIENT_ID = os.environ.get("AMADEUS_CLIENT_ID")
CLIENT_SECRET = os.environ.get("AMADEUS_CLIENT_SECRET")

# ========= Token helpers =========
def get_token_from_db():
    try:
        res = service_tokens_table.get_item(Key={'serviceName':'AmadeusAPI','tokenType':'flight-search'})
        item = res.get('Item')
        if item and item.get('id') == 'access_token' and time.time() < item['expires_at']:
            return item['token']
    except ClientError as e:
        print("DynamoDB token read error:", e)
    return None

def store_token_in_db(token, expires_in):
    try:
        expires_at = int(time.time()) + int(expires_in) - 60
        service_tokens_table.put_item(Item={
            'serviceName':'AmadeusAPI',
            'tokenType':'flight-search',
            'id':'access_token',
            'token':token,
            'expires_at':expires_at
        })
    except ClientError as e:
        print("DynamoDB token write error:", e)

def fetch_token_from_amadeus():
    r = requests.post(
        AMADEUS_TOKEN_URL,
        headers={"Content-Type":"application/x-www-form-urlencoded"},
        data={"grant_type":"client_credentials","client_id":CLIENT_ID,"client_secret":CLIENT_SECRET}
    )
    r.raise_for_status()
    return r.json()

def get_token():
    token = get_token_from_db()
    if token:
        return token
    data = fetch_token_from_amadeus()
    store_token_in_db(data['access_token'], data['expires_in'])
    return data['access_token']

# ========= Utilities =========
def decimal_to_native(obj):
    if isinstance(obj, list):
        return [decimal_to_native(x) for x in obj]
    if isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj

# Country code normalization is now handled in the UI with CountrySelector component

def validate_flight_offers(flight_offers: list) -> list:
    """Validate and return list of flight offers"""
    if not isinstance(flight_offers, list) or not flight_offers:
        raise ValueError("flightOffers must be a non-empty array")
    
    for i, offer in enumerate(flight_offers):
        if not isinstance(offer, dict):
            raise ValueError(f"Flight offer {i} must be an object")
        if "itineraries" not in offer:
            raise ValueError(f"Flight offer {i} missing required 'itineraries' field")
    return flight_offers

def normalize_travelers(raw_travelers: list) -> list:
    if not isinstance(raw_travelers, list) or not raw_travelers:
        raise ValueError("travelers must be a non-empty array")
    
    normalized = []
    
    for idx, t in enumerate(raw_travelers, start=1):
        if isinstance(t.get("name"), dict) and "dateOfBirth" in t and "gender" in t:
            # Already in Amadeus format
            traveler = dict(t)
            traveler.setdefault("id", str(idx))
            normalized.append(traveler)
            continue
            
        required = ("firstName","lastName","dateOfBirth","gender","email","phoneNumber","nationalId")
        missing = [k for k in required if not t.get(k)]
        if missing:
            print(f"ERROR: Traveler {idx} missing required fields: {missing}")
            raise ValueError(f"Missing traveler fields: {missing}")
            
        # Transform from UI format to Amadeus format
        traveler = {
            "id": str(idx),
            "dateOfBirth": t["dateOfBirth"],
            "name": {"firstName": t["firstName"], "lastName": t["lastName"]},
            "gender": t["gender"],
            "contact": {
                "emailAddress": t["email"],
                "phones": [{
                    "deviceType": "MOBILE",
                    "countryCallingCode": t.get("phoneCountryCallingCode", "972"),
                    "number": t["phoneNumber"].replace("+", "").replace("-", "").replace(" ", "")
                }]
            }
        }
        
        # Add documents only if passport information is available
        if t.get("passportNumber"):
            # Nationality should already be a valid 2-letter code from UI
            nationality = t.get("nationality", "IL")
            
            document = {
                "documentType": "PASSPORT",
                "number": t["passportNumber"],
                "nationality": nationality,
                "holder": True
            }
            
            # Add optional passport fields
            if t.get("expiryDate"):   
                document["expiryDate"] = t["expiryDate"]
            if t.get("issuanceDate"): 
                document["issuanceDate"] = t["issuanceDate"]
            if t.get("birthPlace"):   
                document["birthPlace"] = t["birthPlace"]
            if t.get("issuanceLocation"):
                document["issuanceLocation"] = t["issuanceLocation"]
            if t.get("issuanceCountry"):
                # Issuance country should already be a valid 2-letter code from UI
                document["issuanceCountry"] = t["issuanceCountry"]
            
            # Set validityCountry same as nationality
            document["validityCountry"] = nationality
                
            traveler["documents"] = [document]
          
        normalized.append(traveler)
    
    return normalized

def build_contacts_from_first_traveler(travelers: list, user_address: dict = None) -> list:
    first = travelers[0]
    
    # Use user's address if available, otherwise use default
    if user_address and user_address.get('street') and user_address.get('city') and user_address.get('country'):
        address = {
            "lines": [user_address['street']],
            "postalCode": user_address.get('postal_code', ''),
            "cityName": user_address['city'],
            "countryCode": user_address['country']
        }
        if user_address.get('state'):
            address["stateCode"] = user_address['state']
    else:
        address = {
            "lines": ["TripTailor Booking Service"],
            "postalCode": "00000",
            "cityName": "Tel Aviv",
            "countryCode": "IL"
        }
    
    contact = {
        "addresseeName": {
            "firstName": first["name"]["firstName"],
            "lastName": first["name"]["lastName"]
        },
        "purpose": "STANDARD",
        "phones": first.get("contact", {}).get("phones", []),
        "emailAddress": first.get("contact", {}).get("emailAddress"),
        "address": address
    }
    return [contact]

def call_create_order(token: str, payload: dict):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    r = requests.post(CREATE_ORDER_URL, headers=headers, data=json.dumps(payload))
    r.raise_for_status()
    return r.json()

def generate_flight_id(flight_offer: dict, is_booked: bool = False) -> str:
    """
    Generate a unique flight ID using ALL segments from ALL itineraries, similar to search flights lambda
    Include booking status to avoid conflicts with pre-booking entries
    """
    all_segments = []
    for itinerary in flight_offer.get("itineraries", []):
        for segment in itinerary.get("segments", []):
            all_segments.append(segment)
    
    if not all_segments:
        raise ValueError("No segments found in flight offer")
    
    # Create signature using all segments
    base_signature = "|".join(
        f"{seg['departure']['iataCode']}-{seg['arrival']['iataCode']}-{seg['departure']['at']}-{seg['arrival']['at']}-{seg['carrierCode']}-{seg['number']}"
        for seg in all_segments
    )
    
    # Include booking status to avoid ID conflicts
    signature = f"{base_signature}_booked" if is_booked else base_signature
    
    flight_id = hashlib.sha256(signature.encode()).hexdigest()
    return flight_id

# --- Flights table save ---
def save_flight_details(flight_details: dict):
    """
    Save the ENTIRE flight-offer object to the flights table, similar to search flights lambda
    """
    try:
        flight_id = generate_flight_id(flight_details, is_booked=True)
        
        # Save the complete flight-offer object with additional metadata
        # Note: No TTL attribute for booked flights - they should remain permanently
        flight_item = {
            'flightId': flight_id,
            'timestamp': int(time.time() * 1000),
            'flightDetails': flight_details,  # The ENTIRE flight-offer object
            'status': 'booked',  # Explicitly set status to 'booked'
            'bookingTimestamp': int(time.time() * 1000),
        }
        
        flights_table.put_item(
            ConditionExpression="attribute_not_exists(flightId)",
            Item=flight_item
        )
        
        return flight_id
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return None
        else:
            print("Failed to insert flight:", e)
            raise

# ========= Lambda Handler =========
def lambda_handler(event, context):
    # CORS
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Credentials': 'false'
    }
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
    
    # Wrap everything in try-catch to ensure CORS headers are always returned
    try:
        return _handle_flight_booking(event, headers)
    except Exception as e:
        import traceback
        print("CRITICAL ERROR in lambda_handler:", str(e))
        print(traceback.format_exc())
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": f"Critical lambda error: {str(e)}"})}

def _handle_flight_booking(event, headers):
    # Parse input
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in request body: {e}")
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Invalid JSON"})}

    flight_offers_input = body.get("flightOffers")
    travelers_input = body.get("travelers")
    original_triptailor_flight_ids = body.get("originalTripTailorFlightIds", [])  # TripTailor flight IDs for mapping

    # Validate input
    if not flight_offers_input:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "flightOffers is required"})}
    if not travelers_input:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "travelers is required"})}

    try:
        # Validate and process flight offers
        flight_offers = validate_flight_offers(flight_offers_input)
        flight_offers = [decimal_to_native(offer) for offer in flight_offers]

        # Normalize travelers
        travelers = normalize_travelers(travelers_input)

        # Get user address from request if available
        user_address = event.get('userAddress')
        
        # Build contacts from first traveler, passing user address
        contacts = build_contacts_from_first_traveler(travelers, user_address)

        # Clean flight offers - remove any non-Amadeus fields
        cleaned_flight_offers = []
        for offer in flight_offers:
            # Create a clean copy with only Amadeus-expected fields
            cleaned_offer = {
                "type": offer.get("type", "flight-offer"),
                "id": offer.get("id"),
                "source": offer.get("source"),
                "instantTicketingRequired": offer.get("instantTicketingRequired", False),
                "nonHomogeneous": offer.get("nonHomogeneous", False),
                "paymentCardRequired": offer.get("paymentCardRequired", False),
                "lastTicketingDate": offer.get("lastTicketingDate"),
                "itineraries": offer.get("itineraries", []),
                "price": offer.get("price", {}),
                "pricingOptions": offer.get("pricingOptions", {}),
                "validatingAirlineCodes": offer.get("validatingAirlineCodes", []),
                "travelerPricings": offer.get("travelerPricings", [])
            }
            # Remove None values
            cleaned_offer = {k: v for k, v in cleaned_offer.items() if v is not None}
            cleaned_flight_offers.append(cleaned_offer)

        # Build payload for Amadeus Create Order API
        payload = {
            "data": {
                "type": "flight-order",
                "flightOffers": cleaned_flight_offers,
                "travelers": travelers,
                "remarks": {
                    "general": [{
                        "subType": "GENERAL_MISCELLANEOUS",
                        "text": "ONLINE BOOKING FROM TRIPTAILOR"
                    }]
                },
                "ticketingAgreement": {
                    "option": "DELAY_TO_CANCEL",
                    "delay": "6D"
                },
                "contacts": contacts
            }
        }
        
        # Log the exact payload structure (truncated for readability)
        payload_sample = {
            "data": {
                "type": payload["data"]["type"],
                "flightOffers": f"[{len(payload['data']['flightOffers'])} offers]",
                "travelers": f"[{len(payload['data']['travelers'])} travelers]",
                "remarks": payload["data"]["remarks"],
                "ticketingAgreement": payload["data"]["ticketingAgreement"],
                "contacts": f"[{len(payload['data']['contacts'])} contacts]"
            }
        }
        
        # Log first traveler as sample
        if payload["data"]["travelers"]:
            sample_traveler = payload["data"]["travelers"][0]

        # Call Amadeus Create Order API
        token = get_token()
        order_resp = call_create_order(token, payload)

        # Process returned flight offers and save to database
        returned_offers = order_resp["data"]["flightOffers"]
        
        new_flight_ids = []
        flight_id_mapping = {}  # originalId -> newId mapping
        
        for i, returned_offer in enumerate(returned_offers):            
            # Generate new flight ID and save to flights table (mark as booked to avoid ID conflicts)
            new_flight_id = generate_flight_id(returned_offer, is_booked=True)
            
            # Save the ENTIRE flight-offer object to flights table
            save_result = save_flight_details(returned_offer)
            if  not save_result:
                print(f"WARNING: Flight {new_flight_id} already exists in DynamoDB")
            
            new_flight_ids.append(new_flight_id)
            
            # Map TripTailor ID to new ID if provided
            if i < len(original_triptailor_flight_ids):
                original_triptailor_id = original_triptailor_flight_ids[i]
                flight_id_mapping[original_triptailor_id] = new_flight_id

        # Build simplified response - return ID mapping for trip card update
        result_payload = {
            "success": True,
            "message": "Flight booking completed successfully",
            "newFlightIds": new_flight_ids,  # Still include for backward compatibility
            "flightIdMapping": flight_id_mapping,  # originalId -> newId mapping
            "totalFlights": len(new_flight_ids)
        }

        return {"statusCode": 200, "headers": headers, "body": json.dumps(result_payload)}

    except requests.HTTPError as e:
        print(f"ERROR: Amadeus API HTTP error: {e}")
        print(f"ERROR: Response status: {e.response.status_code}")
        print(f"ERROR: Response text: {e.response.text}")
        try:
            err = e.response.json()
        except Exception:
            err = {"status": e.response.status_code, "text": e.response.text}
        print(f"ERROR: Parsed error: {err}")
        return {"statusCode": 502, "headers": headers, "body": json.dumps({"error": "Amadeus create order failed", "details": err, "payloadSent": payload})}
    except Exception as e:
        print(f"ERROR: Unexpected error: {str(e)}")
        print(f"ERROR: Exception type: {type(e).__name__}")
        import traceback
        print(f"ERROR: Traceback: {traceback.format_exc()}")
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": str(e)})}
