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

CLIENT_ID     = os.getenv("AMADEUS_CLIENT_ID")
CLIENT_SECRET = os.getenv("AMADEUS_CLIENT_SECRET")

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
    
    print(f"DEBUG: Received {len(flight_offers)} flight offers")
    for i, offer in enumerate(flight_offers):
        if not isinstance(offer, dict):
            raise ValueError(f"Flight offer {i} must be an object")
        if "itineraries" not in offer:
            raise ValueError(f"Flight offer {i} missing required 'itineraries' field")
        print(f"DEBUG: Flight offer {i} validated successfully")
    
    return flight_offers

def normalize_travelers(raw_travelers: list) -> list:
    if not isinstance(raw_travelers, list) or not raw_travelers:
        raise ValueError("travelers must be a non-empty array")
    
    print(f"DEBUG: Processing {len(raw_travelers)} travelers")
    normalized = []
    
    for idx, t in enumerate(raw_travelers, start=1):
        print(f"DEBUG: Processing traveler {idx}: {t.get('firstName', 'N/A')} {t.get('lastName', 'N/A')}")
        
        if isinstance(t.get("name"), dict) and "dateOfBirth" in t and "gender" in t:
            # Already in Amadeus format
            traveler = dict(t)
            traveler.setdefault("id", str(idx))
            normalized.append(traveler)
            print(f"DEBUG: Traveler {idx} already in Amadeus format")
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
                print(f"DEBUG: Added expiry date for traveler {idx}: {t['expiryDate']}")
            if t.get("issuanceDate"): 
                document["issuanceDate"] = t["issuanceDate"]
                print(f"DEBUG: Added issuance date for traveler {idx}: {t['issuanceDate']}")
            if t.get("birthPlace"):   
                document["birthPlace"] = t["birthPlace"]
                print(f"DEBUG: Added birth place for traveler {idx}: {t['birthPlace']}")
            if t.get("issuanceLocation"):
                document["issuanceLocation"] = t["issuanceLocation"]
                print(f"DEBUG: Added issuance location for traveler {idx}: {t['issuanceLocation']}")
            if t.get("issuanceCountry"):
                # Issuance country should already be a valid 2-letter code from UI
                document["issuanceCountry"] = t["issuanceCountry"]
                print(f"DEBUG: Added issuance country for traveler {idx}: {t['issuanceCountry']}")
            
            # Set validityCountry same as nationality
            document["validityCountry"] = nationality
            print(f"DEBUG: Set validityCountry same as nationality for traveler {idx}: {nationality}")
                
            traveler["documents"] = [document]
            print(f"DEBUG: Added passport document for traveler {idx}")
        else:
            # For travelers without passport (like children), documents might be optional
            print(f"DEBUG: No passport info for traveler {idx}, documents omitted")
            
        normalized.append(traveler)
        print(f"DEBUG: Traveler {idx} normalized successfully")
    
    print(f"DEBUG: All {len(normalized)} travelers processed successfully")
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
        print(f"DEBUG: Using user's address: {user_address['city']}, {user_address['country']}")
    else:
        address = {
            "lines": ["TripTailor Booking Service"],
            "postalCode": "00000",
            "cityName": "Tel Aviv",
            "countryCode": "IL"
        }
        print(f"DEBUG: Using default address: Tel Aviv, IL")
    
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
    print(f"DEBUG: Built contact with address for {first['name']['firstName']} {first['name']['lastName']}")
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
    print(f"DEBUG: Generated flight ID: {flight_id} using {len(all_segments)} segments (booked: {is_booked})")
    print(f"DEBUG: Signature preview: {signature[:100]}...")
    return flight_id

# --- Flights table save ---
def convert_date_from_str_to_epoch(date_str: str) -> int:
    dt = datetime.fromisoformat(date_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp()) + 86400

def save_flight_details(flight_details: dict):
    """
    Save the ENTIRE flight-offer object to the flights table, similar to search flights lambda
    """
    try:
        flight_id = generate_flight_id(flight_details, is_booked=True)
        
        # Calculate departure time from the first segment of the first itinerary
        departure_time = convert_date_from_str_to_epoch(
            flight_details["itineraries"][0]["segments"][0]["departure"]["at"]
        )
        
        # Save the complete flight-offer object with additional metadata
        flight_item = {
            'flightId': flight_id,
            'timestamp': int(time.time() * 1000),
            'flightDetails': flight_details,  # The ENTIRE flight-offer object
            'departureTime': departure_time,
            'status': 'booked',  # Explicitly set status to 'booked'
            'bookingTimestamp': int(time.time() * 1000),
        }
        
        flights_table.put_item(
            ConditionExpression="attribute_not_exists(flightId)",
            Item=flight_item
        )
        
        # Extract key info for logging
        first_segment = flight_details["itineraries"][0]["segments"][0]
        last_segment = flight_details["itineraries"][-1]["segments"][-1]
        origin = first_segment["departure"]["iataCode"]
        destination = last_segment["arrival"]["iataCode"]
        airline = first_segment.get("carrierCode", "Unknown")
        flight_number = first_segment.get("number", "Unknown")
        
        print(f"DEBUG: Flight {flight_id} saved successfully to flights table")
        print(f"DEBUG: Route: {origin} -> {destination}, Airline: {airline}{flight_number}")
        print(f"DEBUG: Status: booked, Timestamp: {flight_item['timestamp']}")
        print(f"DEBUG: Complete flight-offer object saved with {len(flight_details)} top-level keys")
        
        return flight_id
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            print("Flight already exists. Skipping insert.")
            return None
        else:
            print("Failed to insert flight:", e)
            raise

# Trip table updates are now handled by update_trip_card lambda
# This lambda focuses solely on flight booking and saving to flights table

# Alternative trip search function removed - now handled by update_trip_card lambda

# Trips update function removed - now handled by update_trip_card lambda

# --- helpers to build response ---
def _pretty_duration(iso_duration: str) -> str:
    # ISO 8601 like "PT5H20M"
    if not isinstance(iso_duration, str) or not iso_duration.startswith("PT"):
        return ""
    h = m = 0
    num = ""
    for ch in iso_duration[2:]:
        if ch.isdigit():
            num += ch
        elif ch == 'H':
            h = int(num or "0"); num = ""
        elif ch == 'M':
            m = int(num or "0"); num = ""
        elif ch == 'S':
            # ignore seconds
            num = ""
    parts = []
    if h: parts.append(f"{h}h")
    if m or not parts: parts.append(f"{m}m")
    return " ".join(parts)

# Compact flight object function removed - no longer needed since we only return flight IDs

def _first_last_segment(flight_offer: dict):
    it = (flight_offer.get("itineraries") or [])[0]
    segs = it.get("segments") or []
    first = segs[0]
    last  = segs[-1]
    return first, last, it

# ========= Lambda Handler =========
def lambda_handler(event, context):
    print("=== CREATE FLIGHT ORDER LAMBDA START ===")
    print(f"DEBUG: Event received: {json.dumps(event, default=str)}")

    # CORS
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    # Parse input
    try:
        body = json.loads(event.get('body', '{}'))
        print(f"DEBUG: Parsed body: {json.dumps(body, default=str)}")
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in request body: {e}")
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Invalid JSON"})}

    flight_offers_input = body.get("flightOffers")
    travelers_input = body.get("travelers")
    original_triptailor_flight_ids = body.get("originalTripTailorFlightIds", [])  # TripTailor flight IDs for mapping

    print(f"DEBUG: Input validation - flightOffers: {len(flight_offers_input) if flight_offers_input else 'None'}")
    print(f"DEBUG: Input validation - travelers: {len(travelers_input) if travelers_input else 'None'}")
    print(f"DEBUG: Input validation - originalTripTailorFlightIds: {original_triptailor_flight_ids}")

    # Validate input
    if not flight_offers_input:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "flightOffers is required"})}
    if not travelers_input:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "travelers is required"})}

    try:
        # Validate and process flight offers
        flight_offers = validate_flight_offers(flight_offers_input)
        flight_offers = [decimal_to_native(offer) for offer in flight_offers]
        print(f"DEBUG: Flight offers validated and processed: {len(flight_offers)} offers")

        # Normalize travelers
        travelers = normalize_travelers(travelers_input)
        print(f"DEBUG: Travelers normalized: {len(travelers)} travelers")

        # Get user address from request if available
        user_address = event.get('userAddress')
        print(f"DEBUG: User address from request: {user_address}")
        
        # Build contacts from first traveler, passing user address
        contacts = build_contacts_from_first_traveler(travelers, user_address)
        print(f"DEBUG: Contacts built from first traveler")

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
            print(f"DEBUG: Cleaned flight offer - removed internal fields, kept Amadeus format")

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
        
        print(f"DEBUG: Amadeus payload prepared with {len(cleaned_flight_offers)} flight offers")
        print(f"DEBUG: Payload size: {len(json.dumps(payload))} characters")
        
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
        print(f"DEBUG: Payload structure: {json.dumps(payload_sample, indent=2)}")
        
        # Log first traveler as sample
        if payload["data"]["travelers"]:
            sample_traveler = payload["data"]["travelers"][0]
            print(f"DEBUG: Sample traveler format: {json.dumps(sample_traveler, indent=2)}")

        # Call Amadeus Create Order API
        print("DEBUG: Calling Amadeus Create Order API...")
        token = get_token()
        order_resp = call_create_order(token, payload)
        print(f"DEBUG: Amadeus API call successful. Response keys: {list(order_resp.keys())}")

        # Process returned flight offers and save to database
        returned_offers = order_resp["data"]["flightOffers"]
        print(f"DEBUG: Processing {len(returned_offers)} returned flight offers")
        
        new_flight_ids = []
        flight_id_mapping = {}  # originalId -> newId mapping
        
        for i, returned_offer in enumerate(returned_offers):
            print(f"DEBUG: Processing returned flight offer {i+1}")
            
            # Generate new flight ID and save to flights table (mark as booked to avoid ID conflicts)
            new_flight_id = generate_flight_id(returned_offer, is_booked=True)
            print(f"DEBUG: Generated flight ID: {new_flight_id}")
            
            # Save the ENTIRE flight-offer object to flights table
            save_result = save_flight_details(returned_offer)
            if save_result:
                print(f"DEBUG: Flight {new_flight_id} saved successfully to DynamoDB")
            else:
                print(f"WARNING: Flight {new_flight_id} already exists in DynamoDB")
            
            new_flight_ids.append(new_flight_id)
            
            # Map TripTailor ID to new ID if provided
            if i < len(original_triptailor_flight_ids):
                original_triptailor_id = original_triptailor_flight_ids[i]
                flight_id_mapping[original_triptailor_id] = new_flight_id
                print(f"DEBUG: Mapped TripTailor ID {original_triptailor_id} -> new ID {new_flight_id}")
            
            print(f"DEBUG: Flight {i+1} processed - ID: {new_flight_id}")

        print(f"DEBUG: New flight IDs generated: {new_flight_ids}")
        print(f"DEBUG: Flight ID mapping: {flight_id_mapping}")
        print(f"DEBUG: All flights have status: 'booked'")

        # Build simplified response - return ID mapping for trip card update
        result_payload = {
            "success": True,
            "message": "Flight booking completed successfully",
            "newFlightIds": new_flight_ids,  # Still include for backward compatibility
            "flightIdMapping": flight_id_mapping,  # originalId -> newId mapping
            "totalFlights": len(new_flight_ids)
        }

        print(f"DEBUG: Final response prepared with {len(new_flight_ids)} flight IDs")
        
        # Summary of what was saved to the database
        print("=== DATABASE SAVE SUMMARY ===")
        print(f"DEBUG: Complete flight-offer objects saved to flights table: {len(new_flight_ids)}")
        for i, flight_id in enumerate(new_flight_ids):
            print(f"DEBUG:   Flight {i+1}: {flight_id} (status: booked)")
        print(f"DEBUG: Trip card update: Will be handled by update_trip_card lambda")
        print(f"DEBUG: Total flights booked: {len(new_flight_ids)}")
        print("=== CREATE FLIGHT ORDER LAMBDA SUCCESS ===")
        
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
