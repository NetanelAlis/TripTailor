import hashlib
import json
import time
import boto3
import requests
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
from datetime import datetime, timezone

CLIENT_ID = 'AMADEUS_CLIENT_ID'
CLIENT_SECRET = 'AMADEUS_CLIENT_SECRET'
TOKEN_KEY = 'access_token'
AMADEUS_GET_TOKEN_URL = "https://test.api.amadeus.com/v1/security/oauth2/token"

dynamodb = boto3.resource('dynamodb')
service_tokens_table = dynamodb.Table('ServiceTokens')
flights_table = dynamodb.Table('Flights')
user_flight_views_table = dynamodb.Table('UserFlightViews')


def generate_flight_id(flight_offer):
    segments = flight_offer["itineraries"][0]["segments"]
    signature = "|".join(
        f"{seg['departure']['iataCode']}-{seg['arrival']['iataCode']}-{seg['departure']['at']}-{seg['arrival']['at']}-{seg['carrierCode']}-{seg['number']}"
        for seg in segments
    )
    return hashlib.sha256(signature.encode()).hexdigest()


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
        print("Flight inserted successfully.")
        return flight_id
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            print("Flight already exists. Skipping insert.")
        else:
            raise
        return None


def add_flight_to_user_if_not_seen(user_id: str, chat_id: str, flight_id: str) -> bool:
    user_and_chat_id = f"{user_id}:{chat_id}"

    try:
        # Check if the item exists first
        response = user_flight_views_table.query(
            KeyConditionExpression=Key('UserAndChatID').eq(user_and_chat_id),
            ScanIndexForward=False,
        )

        items = response.get('Items', [])
        if len(items) == 1:
            item = items[0]
        else: item = None

        print("Item: ", item)
        if item:
            # Update it
            user_flight_views_table.update_item(
                Key={
                    "UserAndChatID": user_and_chat_id,
                    "timestamp": int(time.time() * 1000)
                },
                UpdateExpression="SET flightIds = list_append(if_not_exists(flightIds, :empty_list), :new_id)",
                ExpressionAttributeValues={
                    ":new_id": [flight_id],
                    ":empty_list": []
                }
            )
        else:
            # Create new item
            user_flight_views_table.put_item(
                Item={
                    "UserAndChatID": user_and_chat_id,
                    "timestamp": int(time.time() * 1000),
                    "flightIds": [flight_id]
                }
            )

        print("Flight added to user's viewed list.")
        return True

    except ClientError as e:
        print(f"Error updating user flight views list: {e.response['Error']['Message']}")
        raise


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
            'tokenType': 'flight-search'
        })

        item = response.get('Item')
        print("Retrieved token from DB:", item)

        if item and item.get('id') == 'access_token':
            if time.time() < item['expires_at']:
                return item['token']
        return None
    except ClientError as e:
        print("DynamoDB error:", e)
        return None


def store_token_in_db(token, expires_in):
    try:
        expires_at = int(time.time()) + expires_in - 60  # 60 sec buffer
        item = {
            'serviceName': 'AmadeusAPI',
            'tokenType': 'flight-search',
            'id': 'access_token',
            'token': token,
            'expires_at': expires_at
        }
        service_tokens_table.put_item(Item=item)
        print("Stored token in DB:", item)
    except ClientError as e:
        print("Failed to store token:", e)


def get_token_from_amadeus() :
    url = AMADEUS_GET_TOKEN_URL
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    }

    response = requests.post(url, headers=headers, data=data)
    print("Amadeus token response:", response.text)
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
    print("start search flights lambda")

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
        print("body: ", body)
        params = body['params']
        token = get_token()
        amadeus_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        print("sending request to Amadeus with params: ", params)
        response = requests.get(
            "https://test.api.amadeus.com/v2/shopping/flight-offers",
            headers=amadeus_headers,
            params=params
        )

        response.raise_for_status()
        print(response.json())

        # save Flights details to DynamoDB
        for flight in response.json()['data']:
            flight_id = save_flight_details(flight)
            if flight_id:
                add_flight_to_user_if_not_seen(body['user_id'], body['chat_id'], flight_id)

        return {
            'statusCode': 200,
            'headers': response_headers,
            'body': json.dumps(response.json())
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({"error": str(e)})
        }
