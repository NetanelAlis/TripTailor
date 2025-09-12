import hashlib
import json
import time
import boto3
import requests
import copy
from decimal import Decimal
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
from datetime import datetime, timezone
import os

# ===== Amadeus & Dynamo =====
CLIENT_ID = os.environ.get("AMADEUS_CLIENT_ID")
CLIENT_SECRET = os.environ.get("AMADEUS_CLIENT_SECRET")
TOKEN_KEY = 'access_token'
AMADEUS_GET_TOKEN_URL = "https://test.api.amadeus.com/v1/security/oauth2/token"

HOTELS_BY_CITY_URL = "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city"
HOTEL_OFFERS_URL   = "https://test.api.amadeus.com/v3/shopping/hotel-offers"

HTTP_TIMEOUT = 20  # שניות

dynamodb = boto3.resource('dynamodb')
service_tokens_table   = dynamodb.Table('ServiceTokens')
hotels_table           = dynamodb.Table('Hotels')

# ===== Utilities =====
def to_dynamodb_compatible(obj):
    """המרת float ל-Decimal רק לפני כתיבה לדיינמו. רק עותק של הנתונים נשמר כך."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, list):
        return [to_dynamodb_compatible(x) for x in obj]
    if isinstance(obj, dict):
        return {k: to_dynamodb_compatible(v) for k, v in obj.items()}
    return obj

def http_get(url, headers=None, params=None, timeout=HTTP_TIMEOUT):
    r = requests.get(url, headers=headers, params=params, timeout=timeout)
    r.raise_for_status()
    return r

def http_post(url, headers=None, data=None, json_body=None, timeout=HTTP_TIMEOUT):
    r = requests.post(url, headers=headers, data=data, json=json_body, timeout=timeout)
    r.raise_for_status()
    return r

def generate_hotel_offers_id(hotel_item):
    hotel_id = hotel_item.get("hotel", {}).get("hotelId", "")
    offer_ids = [o.get("id", "") for o in hotel_item.get("offers", []) if o.get("id")]
    if offer_ids:
        signature = hotel_id + "|" + "|".join(offer_ids)
    else:
        parts = [hotel_id]
        for o in hotel_item.get("offers", []):
            parts.append(f"{o.get('checkInDate','')}-{o.get('checkOutDate','')}-{o.get('price',{}).get('total','')}")
        signature = "|".join(parts)
    return hashlib.sha256(signature.encode()).hexdigest()

def convert_date_yyyy_mm_dd_to_epoch(date_str):
    """Convert date string to epoch timestamp with 24-hour buffer for TTL"""
    dt = datetime.fromisoformat(date_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    # Add 24 hours (86400 seconds) buffer like flights
    return int(dt.timestamp()) + 86400

def get_checkout_ttl_from_hotel_offers(hotel_item):
    """Extract the latest checkout date from hotel offers and convert to TTL timestamp"""
    try:
        latest_checkout = None
        
        # Check offers for checkout dates
        for offer in hotel_item.get("offers", []):
            checkout_date = offer.get('checkOutDate')
            if checkout_date:
                if latest_checkout is None or checkout_date > latest_checkout:
                    latest_checkout = checkout_date
        
        # If we found a checkout date, convert it to TTL timestamp
        if latest_checkout:
            return convert_date_yyyy_mm_dd_to_epoch(latest_checkout)
        
        # Fallback: if no checkout date found, set TTL to 30 days from now
        return int(time.time()) + (30 * 24 * 60 * 60)  # 30 days
        
    except Exception as e:
        print(f"Error calculating checkout TTL: {e}")
        # Fallback: 30 days from now
        return int(time.time()) + (30 * 24 * 60 * 60)

# ===== Persistence =====
def save_hotel_details(hotel_item):
    """שומר את פרטי ההצעות לטבלת Hotels. מבצע המרת float→Decimal לפני put_item."""
    try:
        hotel_offer_id = generate_hotel_offers_id(hotel_item)
        safe_item = to_dynamodb_compatible(copy.deepcopy(hotel_item))  # רק לשמירה בדיינמו
        checkout_ttl = get_checkout_ttl_from_hotel_offers(hotel_item)

        hotels_table.put_item(
            ConditionExpression="attribute_not_exists(hotelOfferId)",
            Item={
                'hotelOfferId': hotel_offer_id,
                'timestamp': int(time.time() * 1000),
                'hotelOffersDetails': safe_item,
                'checkoutTTL': checkout_ttl,  # TTL attribute
            }
        )
        return hotel_offer_id
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return generate_hotel_offers_id(hotel_item)
        raise

# Removed add_hotel_to_user_if_not_seen as UserHotelViews table is not used elsewhere

# ===== Token =====
def get_token_from_db():
    try:
        response = service_tokens_table.get_item(Key={
            'serviceName': 'AmadeusAPI',
            'tokenType': 'hotel-search'
        })
        item = response.get('Item')
        if item and item.get('id') == TOKEN_KEY:
            if time.time() < item['expires_at']:
                return item['token']
        return None
    except ClientError as e:
        print("DynamoDB error:", e)
        return None

def store_token_in_db(token, expires_in):
    try:
        expires_at = int(time.time()) + int(expires_in) - 60
        item = {
            'serviceName': 'AmadeusAPI',
            'tokenType': 'hotel-search',
            'id': TOKEN_KEY,
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
    response = http_post(AMADEUS_GET_TOKEN_URL, headers=headers, data=data)
    return response.json()

def get_token():
    token = get_token_from_db()
    if token:
        return token
    result = get_token_from_amadeus()
    store_token_in_db(result['access_token'], result['expires_in'])
    return result['access_token']

# ===== Lambda =====
def lambda_handler(event, context):
    response_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    }

    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": response_headers, "body": ""}

    # Parse body
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return {"statusCode": 400, 'headers': response_headers, "body": json.dumps({"error": "Invalid JSON"})}

    try:
        params = body['params']
        token = get_token()
        amadeus_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # -------- 1) List hotels by city --------
        city_code = params.get("cityCode")
        if not city_code:
            return {'statusCode': 400, 'headers': response_headers, 'body': json.dumps({"error": "cityCode is required"})}

        # הפרמטרים רשות בשלב זה (אפשר להרחיב שימוש בהם בהמשך)
        max_results = int(params.get("max", 6))
        hotel_list_query = {"cityCode": city_code}
        r1 = http_get(HOTELS_BY_CITY_URL, headers=amadeus_headers, params=hotel_list_query)
        hotels_list = r1.json().get("data", [])
        hotel_ids = [h.get("hotelId") for h in hotels_list if h.get("hotelId")]
        if not hotel_ids:
            return {'statusCode': 200, 'headers': response_headers, 'body': json.dumps({"data": []})}

        hotel_ids = hotel_ids[:max_results]

        # -------- 2) Get offers for those hotels --------
        check_in   = params.get("checkInDate")
        check_out  = params.get("checkOutDate")
        adults     = int(params.get("adults", 1))
        room_qty   = int(params.get("roomQuantity", 1))
        currency   = params.get("currencyCode")  # אם ה-API שלך מקבל currencyCode או currency – השאר כפי שעבד לך

        hotels_offers_query = {
            "hotelIds": ",".join(hotel_ids),
            "checkInDate": check_in,
            "checkOutDate": check_out,
            "adults": adults,
            "roomQuantity": room_qty
        }
        if currency:
            # אם כבר עבד לך עם 'currency' שמור; אם צריך 'currencyCode' – החלף כאן.
            hotels_offers_query["currency"] = currency

        r2 = http_get(HOTEL_OFFERS_URL, headers=amadeus_headers, params=hotels_offers_query)
        offers = r2.json()

        # -------- Optional local filter by maxPrice --------
        max_price = params.get("maxPrice")
        if max_price is not None:
            try:
                max_price_val = float(max_price)
                data = offers.get("data", [])
                filtered = []
                for item in data:
                    first_offer = (item.get("offers") or [{}])[0]
                    total_str = first_offer.get("price", {}).get("total")
                    total_val = float(total_str) if total_str is not None else None
                    if total_val is None or total_val <= max_price_val:
                        filtered.append(item)
                offers["data"] = filtered
            except Exception as e:
                print("maxPrice filter failed:", e)

        # -------- Persist & user view --------
        user_id = body.get('user_id')
        chat_id = body.get('chat_id')

        out_ids = []
        for i, hotel_item in enumerate(offers.get('data', [])):
            hotel_offer_id = save_hotel_details(hotel_item)  # ממיר float→Decimal בפנים
            if hotel_offer_id:
                out_ids.append(hotel_offer_id)

        # החזרה ללקוח – שומר על JSON נקי; אם איכשהו נכנס Decimal, default=str ימנע שגיאה
        offers['hotelOfferIds'] = out_ids
        return {
            'statusCode': 200,
            'headers': response_headers,
            'body': json.dumps(offers, ensure_ascii=False, default=str)
        }

    except requests.exceptions.RequestException as e:
        print("HTTP error:", repr(e))
        return {'statusCode': 502, 'headers': response_headers, 'body': json.dumps({"error": f"Upstream HTTP error: {str(e)}"})}
    except Exception as e:
        print("Unhandled error:", repr(e))
        return {'statusCode': 500, 'headers': response_headers, 'body': json.dumps({"error": str(e)})}
