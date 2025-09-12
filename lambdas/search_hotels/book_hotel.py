import json
import time
import os
import boto3
import requests
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from datetime import datetime, timezone
import hashlib
from typing import List, Dict, Any, Optional

# ========= Dynamo & Config =========
dynamodb = boto3.resource("dynamodb")
service_tokens_table = dynamodb.Table("ServiceTokens")

# טבלאות קיימות אצלך
hotels_table = dynamodb.Table("Hotels")     # cache + booking
trips_table  = dynamodb.Table("trip")       # trip summary

AMADEUS_TOKEN_URL = "https://test.api.amadeus.com/v1/security/oauth2/token"
AMADEUS_HOTEL_ORDER_URL = "https://test.api.amadeus.com/v2/booking/hotel-orders"
CLIENT_ID = os.environ.get("AMADEUS_CLIENT_ID")
CLIENT_SECRET = os.environ.get("AMADEUS_CLIENT_SECRET")

# ========= OAuth helpers =========
def _get_token_from_db() -> Optional[str]:
    try:
        res = service_tokens_table.get_item(
            Key={"serviceName": "AmadeusAPI", "tokenType": "hotel-booking"}
        )
        item = res.get("Item")
        if item and item.get("id") == "access_token" and time.time() < item["expires_at"]:
            return item["token"]
    except ClientError as e:
        print("DynamoDB token read error:", e)
    return None

def _store_token_in_db(token: str, expires_in: int) -> None:
    try:
        expires_at = int(time.time()) + int(expires_in) - 60
        service_tokens_table.put_item(
            Item={
                "serviceName": "AmadeusAPI",
                "tokenType": "hotel-booking",
                "id": "access_token",
                "token": token,
                "expires_at": expires_at,
            }
        )
    except ClientError as e:
        print("DynamoDB token write error:", e)

def _fetch_token_from_amadeus() -> Dict[str, Any]:
    r = requests.post(
        AMADEUS_TOKEN_URL,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
    )
    r.raise_for_status()
    return r.json()

def get_token() -> str:
    tok = _get_token_from_db()
    if tok:
        return tok
    data = _fetch_token_from_amadeus()
    _store_token_in_db(data["access_token"], data["expires_in"])
    return data["access_token"]

# ========= Payload builder =========
def build_hotel_order_payload(
    offer_id: str,
    guests_ui: List[Dict[str, Any]],
    accepted_vendor_code: str = "VI",
) -> Dict[str, Any]:
    """Build payload per Amadeus hotel-order schema."""
    guests: List[Dict[str, Any]] = []
    for i, g in enumerate(guests_ui, start=1):
        title = (g.get("gender"))
        if title == "MALE":
            title = "MR"
        elif title == "FEMALE":
            title = "MS"
        else:
            title = "MR"
            
        phone = g.get("phone")
        if not phone:
            cc = str(g.get("phoneCountryCallingCode", "972"))
            num = str(g.get("phoneNumber", "")).replace("+", "").replace("-", "").replace(" ", "")
            phone = f"+{cc}{num}" if num else None
        
        guest_obj = {
            "tid": i,
            "firstName": g["firstName"],
            "lastName": g["lastName"],
            "email": g["email"],
        }
        
        # Add optional fields
        if title:
            guest_obj["title"] = title
        if phone:
            guest_obj["phone"] = phone
            
        guests.append(guest_obj)

    # Mock payment information for test environment
    mock_payment = {
        "method": "CREDIT_CARD",
        "paymentCard": {
            "paymentCardInfo": {
                "vendorCode": accepted_vendor_code,  # Use accepted card type from hotel offer
                "cardNumber": "4111111111111111",    # Test Visa card number
                "expiryDate": "2026-08",             # Future expiry date
                "holderName": guests[0]["firstName"].upper() + " " + guests[0]["lastName"].upper()
            }
        }
    }

    payload = {
        "data": {
            "type": "hotel-order",
            "guests": guests,
            "roomAssociations": [
                {
                    "hotelOfferId": offer_id,
                    "guestReferences": [{"guestReference": str(guests[0]["tid"])}],
                }
            ],
            "payment": mock_payment,
        }
    }
    return payload

def extract_accepted_vendor_code(hotel_pricing_data: dict) -> str:
    """
    Extract accepted credit card vendor code from hotel pricing data.
    Returns the first accepted card type or defaults to Visa (VI).
    """
    try:
        # Look for accepted payment methods in the pricing data
        # Check various possible locations in the hotel offer response
        if hotel_pricing_data and isinstance(hotel_pricing_data, dict):
            # Check in data.offers[0].policies.guarantee.acceptedPayments.creditCards
            data = hotel_pricing_data.get("data", {})
            offers = data.get("offers", [])
            if offers:
                first_offer = offers[0]
                policies = first_offer.get("policies", {})
                guarantee = policies.get("guarantee", {})
                accepted_payments = guarantee.get("acceptedPayments", {})
                credit_cards = accepted_payments.get("creditCards", [])
                
                if credit_cards:
                    # Return the first accepted card type
                    return credit_cards[0]
            
            # Check in other possible locations
            # Sometimes it might be in data.policies.guarantee.acceptedPayments.creditCards
            policies = data.get("policies", {})
            if policies:
                guarantee = policies.get("guarantee", {})
                accepted_payments = guarantee.get("acceptedPayments", {})
                credit_cards = accepted_payments.get("creditCards", [])
                
                if credit_cards:
                    return credit_cards[0]
        
        return "VI"  # Default to Visa
        
    except Exception as e:
        print(f"DEBUG: Error extracting vendor code: {e}, defaulting to VI (Visa)")
        return "VI"  # Default to Visa on any error

# Compact hotel object function removed - no longer needed since we only return hotel IDs

def call_create_hotel_order(token: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Returns a fake booking order for sandbox testing."""
    oid = f"SBX-{hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "data": {
            "id": oid,
            "type": "hotel-order",
            "status": "CONFIRMED",
            "createdAt": now_iso,
            "roomAssociations": payload["data"]["roomAssociations"],
            "guests": payload["data"]["guests"],
        }
    }

# ========= Trip & Hotels helpers =========
def _stable_hotel_id_for_trip(offer_id: str, is_booked: bool = False) -> str:
    # Include booking status in ID generation to avoid conflicts with pre-booking entries
    id_source = f"{offer_id}_booked" if is_booked else offer_id
    return hashlib.sha256(id_source.encode()).hexdigest()

def upsert_booking_into_hotels_table(
    booking_resp: Dict[str, Any],
    triptailor_hotel_id: str,
    hotel_pricing_data: Dict[str, Any] = None
) -> str:
    
    data = booking_resp.get("data") or booking_resp
    booking_ref = data.get("id") or data.get("bookingId") or data.get("providerReference") or ""
    now_ms = int(time.time() * 1000)
    
    # Store the complete booking response (different structure from regular hotel offers)
    # The booking response has a different structure than regular hotel search responses
    # Since the table has composite key (hotelOfferId + timestamp), we need to find the existing item first
    try:
        # Query for existing hotel items (there might be multiple with different timestamps)
        response = hotels_table.query(
            KeyConditionExpression=Key("hotelOfferId").eq(triptailor_hotel_id),
            ScanIndexForward=False,  # Get most recent first
            Limit=1
        )
        
        items = response.get("Items", [])
        
        if items:
            # Update the most recent item
            existing_item = items[0]
            existing_timestamp = existing_item["timestamp"]
            
            # Store the complete booking response (different structure than regular hotel offers)
            # Note: No TTL attribute for booked hotels - they should remain permanently
            hotels_table.update_item(
                Key={
                    "hotelOfferId": triptailor_hotel_id,
                    "timestamp": existing_timestamp  # Must include sort key!
                },
                UpdateExpression=(
                    "SET #status = :st, "
                    "hotelOffersDetails.booked = :b, "
                    "hotelOffersDetails.bookingRef = :ref, "
                    "hotelBookingData = :booking_data, "  # Store complete booking response
                    "tripTailorHotelId = :triptailor_id, "  # Store TripTailor hotel ID for lookup
                    "bookingResponse = :resp"
                ),
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":st": "booked",
                    ":b": True,
                    ":ref": booking_ref,
                    ":booking_data": data,  # Store the complete booking data
                    ":triptailor_id": triptailor_hotel_id,  # Store TripTailor hotel ID
                    ":resp": booking_resp,
                },
            )
        else:
            # Store complete booking response for new hotel
            # Note: No TTL attribute for booked hotels - they should remain permanently
            hotel_item = {
                'hotelOfferId': triptailor_hotel_id,
                'timestamp': now_ms,  # Sort key
                'hotelOffersDetails': {
                    'booked': True,
                    'hotelPricingData': hotel_pricing_data,
                    'bookingResponse': booking_resp,
                },
            }
            
            hotels_table.put_item(Item=hotel_item)
            
    except Exception as e:
        print(f"ERROR: Error updating hotel {triptailor_hotel_id}: {e}")
        raise
    
# ========= Lambda Handler =========
def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Credentials": "false"
    }
    
    # Handle preflight OPTIONS request
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
    
    # Wrap everything in try-catch to ensure CORS headers are always returned
    try:
        return _handle_hotel_booking(event, headers)
    except Exception as e:
        import traceback
        print("CRITICAL ERROR in lambda_handler:", str(e))
        print(traceback.format_exc())
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": f"Critical lambda error: {str(e)}"})}

def _handle_hotel_booking(event, headers):

    try:
        body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Invalid JSON"})}

    # Handle both single hotel and multiple hotels format
    booking_payloads = body.get("bookingPayloads", [])
    user_and_chat_id = body.get("UserAndChatID")
    original_triptailor_hotel_ids = body.get("originalTripTailorHotelIds", [])  # TripTailor hotel IDs for mapping
    
    # Legacy single hotel support
    if not booking_payloads:
        offer_id = (
            body.get("hotelOfferId")
            or (body.get("hotelOffers") or [{}])[0].get("id")
            if body.get("hotelOffers")
            else None
        )
        guests_input = body.get("guests") or []
        hotel_pricing_data = body.get("hotelPricingData")
        
        if offer_id and guests_input:
            booking_payloads = [{
                "hotelOfferId": offer_id,
                "guests": guests_input,
                "availableVendorCodes": ["VI"],  # Default
                "hotelPricingData": hotel_pricing_data
            }]
            # For legacy single hotel, use the offer_id as TripTailor ID if not provided
            if not original_triptailor_hotel_ids:
                original_triptailor_hotel_ids = [offer_id]

    if not booking_payloads:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "bookingPayloads is required"})}
    if not user_and_chat_id:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "UserAndChatID is required"})}

    try:
        token = get_token()
        
        new_hotel_ids = []
        hotel_id_mapping = {}  # originalId -> newId mapping
        
        # Process each hotel booking payload
        for i, booking_payload in enumerate(booking_payloads):
            offer_id = booking_payload.get("hotelOfferId")
            guests_input = booking_payload.get("guests", [])
            available_vendor_codes = booking_payload.get("availableVendorCodes", ["VI"])
            hotel_pricing_data = booking_payload.get("hotelPricingData")
            
            if not offer_id:
                raise ValueError(f"Missing hotelOfferId in booking payload {i+1}")
            if not guests_input:
                raise ValueError(f"Missing guests in booking payload {i+1}")
            
            # Extract accepted vendor code from hotel pricing data or use first available
            accepted_vendor_code = extract_accepted_vendor_code(hotel_pricing_data)
            if accepted_vendor_code not in available_vendor_codes and available_vendor_codes:
                accepted_vendor_code = available_vendor_codes[0]
            
            payload = build_hotel_order_payload(
                offer_id=offer_id,
                guests_ui=guests_input,
                accepted_vendor_code=accepted_vendor_code,
            )

            # Create hotel booking order (sandbox mode)
            order_resp = call_create_hotel_order(token, payload)
            
            # Generate hotel ID and save to database (mark as booked to avoid ID conflicts)
            new_hotel_id = _stable_hotel_id_for_trip(offer_id, is_booked=True)
            
            # Save hotel booking to database (similar to flight order pattern)
            upsert_booking_into_hotels_table(order_resp, new_hotel_id, hotel_pricing_data)
            
            new_hotel_ids.append(new_hotel_id)
            
            # Map TripTailor ID to new ID if provided
            if i < len(original_triptailor_hotel_ids):
                original_triptailor_id = original_triptailor_hotel_ids[i]
                hotel_id_mapping[original_triptailor_id] = new_hotel_id
                    
                # Build simplified response - return ID mapping for trip card update
        result_payload = {
            "success": True,
            "message": "Hotel booking completed successfully", 
            "newHotelIds": new_hotel_ids,  # Still include for backward compatibility
            "hotelIdMapping": hotel_id_mapping,  # originalId -> newId mapping
            "totalHotels": len(new_hotel_ids)
        }
        
        return {"statusCode": 200, "headers": headers, "body": json.dumps(result_payload)}

    except Exception as e:
        import traceback
        print("ERROR:", str(e))
        print(traceback.format_exc())
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": str(e)})}
