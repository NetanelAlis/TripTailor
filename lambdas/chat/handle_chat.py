import json
from openai import OpenAI
import boto3
from boto3.dynamodb.conditions import Key, Attr
import time
import requests
from datetime import datetime, timedelta, timezone
import re
import os

# Initialize the DynamoDB client
dynamodb = boto3.resource('dynamodb')
chat_history_table = dynamodb.Table('chat-history')
user_table = dynamodb.Table('user')
functionsDescription = [
    {
        "name": "search_flights",
        "description": "Finds flights based on the user's travel preferences. This function must be called whenever the user searches for flights, requests different or alternative flight options (e.g., different dates, nonstop flights, cheaper flights, other airlines), or indicates dissatisfaction with previous results. Always call this function again when travel criteria change.",
        "parameters": {
            "type": "object",
            "properties": {
                "originLocationCode": {
                    "type": "string",
                    "description": "The IATA airport code for the origin. If the user provides a city or country name instead, convert it to a valid IATA code or ask the user to clarify. If the user doesn't specify an origin and you have their location context, you can suggest their nearest airport but always ask for confirmation first. Always ensure this is a valid IATA code before calling the function."
                },
                "destinationLocationCode": {
                    "type": "string",
                    "description": "The IATA airport code for the destination. If the user provides a city or country name instead, convert it to a valid IATA code or ask the user to clarify. Always ensure this is a valid IATA code before calling the function."
                },
                "departureDate": {
                    "type": "string",
                    "description": "Date of departure in YYYY-MM-DD format. If the user omits the year, assume it's 2025. If no date is provided, use today’s date. If the date is in the past, ask the user to clarify."
                },
                "returnDate": {
                    "type": "string",
                    "description": "Return date in YYYY-MM-DD format. If not specified, assume 7 days after the departure date. Apply the same logic as departureDate regarding missing year or past dates."
                },
                "adults": {
                    "type": "number",
                    "description": "Number of adults to search tickets for. Default to 1 if not specified."
                },
                "children": {
                    "type": "number",
                    "description": "Number of children to search tickets for. Default to 0 if not specified."
                },
                "infants": {
                    "type": "number",
                    "description": "Number of infants to search tickets for. Default to 0 if not specified."
                },
                "travelClass": {
                    "type": "string",
                    "enum": ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"],
                    "description": "Travel class to search for."
                },
                "includedAirlineCodes": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "description": "Airline IATA code to include in the search."
                    },
                    "description": "Airlines to include in the search. Use if the user asks for specific airlines."
                },
                "excludedAirlineCodes": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "description": "Airline IATA code to exclude from the search."
                    },
                    "description": "Airlines to exclude from the search. Use if the user wants to avoid certain airlines."
                },
                "nonStop": {
                    "type": "boolean",
                    "description": "Set to true to search for nonstop (no layover) flights only. Use this if the user asks for direct or nonstop flights."
                },
                "currencyCode": {
                    "type": "string",
                    "description": "Currency code for displaying flight prices (e.g., USD, EUR, ILS)."
                },
                "maxPrice": {
                    "type": "number",
                    "description": "Maximum acceptable price for the flight."
                },
                "max": {
                    "type": "number",
                    "description": "Maximum number of flight results to return. Default to 3 if not specified."
                }
            },
            "required": ["originLocationCode", "destinationLocationCode", "departureDate", "adults", "max"]
        }
    },
    {
        "name": "search_hotels",
        "description": (
            "Finds hotels and live rates with Amadeus. Use when the user asks for hotels or changes dates, "
            "location, party size, budget, or filters. cityCode is required (IATA city code, e.g., TLV, PAR). "
            "If the user provides a city name, convert it to a valid IATA city code or ask for clarification. "
            "Always call this function again when travel criteria change."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "cityCode": {
                    "type": "string",
                    "description": "IATA city code (e.g., TLV, PAR). Must be a valid city code."
                },
                "checkInDate": {
                    "type": "string",
                    "description": "YYYY-MM-DD. If year is missing assume 2025. If past date, ask to clarify."
                },
                "checkOutDate": {
                    "type": "string",
                    "description": "YYYY-MM-DD. If not specified, assume 2 nights after checkInDate."
                },
                "adults": {
                    "type": "number",
                    "description": "Number of adults (per room). Default 1."
                },
                "roomQuantity": {
                    "type": "number",
                    "description": "Number of rooms (1–9). Default 1."
                },
                "currencyCode": {
                    "type": "string",
                    "description": "Currency code for prices (e.g., ILS, USD, EUR)."
                },
                "radius": {
                    "type": "number",
                    "description": "Optional radius around city center (default 5)."
                },
                "radiusUnit": {
                    "type": "string",
                    "enum": ["KM", "MI"],
                    "description": "Radius unit (default KM)."
                },
                "maxPrice": {
                    "type": "number",
                    "description": "Maximum acceptable total price."
                },
                "max": {
                    "type": "number",
                    "description": "Maximum number of hotel results to return. Default 5."
                }
            },
            "required": ["cityCode", "checkInDate", "checkOutDate", "adults"]
        }
    },
    {
        "name": "parse_relative_date",
        "description": "Converts relative date expressions like 'tomorrow', 'next week', 'this Friday' to exact YYYY-MM-DD format. Use this function when users mention relative dates that need to be converted for flight or hotel searches. This ensures accurate date interpretation based on the current date.",
        "parameters": {
            "type": "object",
            "properties": {
                "relative_expression": {
                    "type": "string",
                    "description": "The relative date expression from the user (e.g., 'tomorrow', 'next Friday', 'in 3 days', 'this weekend', 'next month')"
                },
                "context": {
                    "type": "string",
                    "description": "Optional context about the date usage (e.g., 'departure', 'return', 'check-in', 'check-out')"
                }
            },
            "required": ["relative_expression"]
        }
    },
    # =====================================================================
]

def invoke_lambda_http(url, args):
    response = requests.post(url, json=args)
    return response.json()


def ensure_dict(response):
    if isinstance(response, str):
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {}
    return response


def add_new_chat_to_db(chat_id, user_id, headers):
    try:
        user_table.update_item(
            Key={
                'user_id': user_id
            },
            UpdateExpression='SET active_chat = :chat_id, number_of_chats = if_not_exists(number_of_chats, :zero) + :inc',
            ExpressionAttributeValues={
                ':chat_id': chat_id,
                ':inc': 1,
                ':zero': 0
            },
            ConditionExpression='attribute_exists(user_id)'  # Optional safety
        )
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Failed to update user: {str(e)}"})
        }


def validate_request_body(body, headers):
    if not body.get('user_prompt'):
        return {
            "statusCode": 400,
            'headers': headers,
            "body": json.dumps({"error": "user_prompt is required"})
        }

    if not body.get('user_id'):
        return {
            "statusCode": 400,
            'headers': headers,
            "body": json.dumps({"error": "user_id is required"})
        }

    if not body.get('chat_id'):
        return {
            "statusCode": 400,
            'headers': headers,
            "body": json.dumps({"error": "chat_id is required"})
        }

    return None


def get_user_message_count(user_id, chat_id):
    """Return the count of user role messages in this chat."""
    try:
        response = chat_history_table.query(
            KeyConditionExpression=Key('user_id').eq(user_id),
            FilterExpression=Attr('chat_id').eq(chat_id),
            ScanIndexForward=False,
        )
        items = response.get('Items', [])
        return sum(1 for item in items if item.get('role') == 'user')
    except Exception:
        return 0


def generate_chat_title(client, conversation_history):
    """Ask the LLM to generate a concise title based on the conversation.

    Returns a string title (no prefixes/suffixes), or empty string on failure.
    """
    try:
        # Build a compact text transcript from the available history
        # We keep it small to control tokens; this history already has a system
        # prompt and up to ~10 recent messages.
        transcript_lines = []
        for m in conversation_history:
            role = m.get('role', 'assistant')
            content = m.get('content', '')
            # Avoid overly long lines
            content = content[:2000]
            transcript_lines.append(f"{role}: {content}")
        transcript = "\n".join(transcript_lines)

        messages = [
            {
                "role": "system",
                "content": (
                    "You generate concise, human-readable chat titles. "
                    "Return ONLY the title text. No prefixes, no quotes, no extra words."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Write a short 2-4 word title for this conversation. "
                    "Use plain text only.\n\nConversation:\n" + transcript
                ),
            },
        ]

        title_completion = client.chat.completions.create(
            messages=messages,
            model="gpt-4o",
            max_tokens=24,
        )
        raw = title_completion.choices[0].message.content or ""
        # Normalize by stripping whitespace and any accidental quotes/newlines
        title = (raw or "").strip().strip('"').strip()
        # Keep title modest length
        if len(title) > 120:
            title = title[:120]
        return title
    except Exception:
        return ""


def upsert_chat_title(user_id, chat_id, title):
    """Persist title in user.chat_titles list at index chat_id - 1."""
    if not title:
        return False
    try:
        # Fetch current user record
        user_res = user_table.get_item(Key={'user_id': user_id})
        user_item = user_res.get('Item', {}) or {}
        titles = user_item.get('chat_titles', [])

        try:
            chat_index = int(str(chat_id)) - 1
        except Exception:
            chat_index = 0

        if chat_index < 0:
            chat_index = 0

        # Pad list to required length
        while len(titles) <= chat_index:
            titles.append("")

        titles[chat_index] = title

        user_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET chat_titles = :titles',
            ExpressionAttributeValues={':titles': titles},
        )
        return True
    except Exception:
        return False


def get_location_context(user_location):
    """
    Convert user location coordinates to contextual information for the LLM.
    
    Args:
        user_location (dict): Contains latitude, longitude, accuracy, timestamp
        
    Returns:
        dict: Contains location context information
    """
    if not user_location or not isinstance(user_location, dict):
        return None
        
    try:
        latitude = user_location.get('latitude')
        longitude = user_location.get('longitude')
        accuracy = user_location.get('accuracy', 'unknown')
        timestamp = user_location.get('timestamp', 'unknown')
        
        if latitude is None or longitude is None:
            return None
            
        # Simple airport mapping based on major cities/regions
        # This is a basic implementation - in production you'd want a more comprehensive database
        major_airports = {
            # US East Coast
            (40.7128, -74.0060): {'city': 'New York', 'airport': 'JFK', 'code': 'JFK', 'region': 'US East Coast'},
            (40.6892, -74.1745): {'city': 'Newark', 'airport': 'Newark', 'code': 'EWR', 'region': 'US East Coast'},
            (42.3601, -71.0589): {'city': 'Boston', 'airport': 'Logan', 'code': 'BOS', 'region': 'US East Coast'},
            (38.9072, -77.0369): {'city': 'Washington DC', 'airport': 'Reagan', 'code': 'DCA', 'region': 'US East Coast'},
            
            # US West Coast  
            (34.0522, -118.2437): {'city': 'Los Angeles', 'airport': 'LAX', 'code': 'LAX', 'region': 'US West Coast'},
            (37.7749, -122.4194): {'city': 'San Francisco', 'airport': 'SFO', 'code': 'SFO', 'region': 'US West Coast'},
            (47.6062, -122.3321): {'city': 'Seattle', 'airport': 'Sea-Tac', 'code': 'SEA', 'region': 'US West Coast'},
            
            # Europe
            (51.5074, -0.1278): {'city': 'London', 'airport': 'Heathrow', 'code': 'LHR', 'region': 'Europe'},
            (48.8566, 2.3522): {'city': 'Paris', 'airport': 'Charles de Gaulle', 'code': 'CDG', 'region': 'Europe'},
            (52.5200, 13.4050): {'city': 'Berlin', 'airport': 'Brandenburg', 'code': 'BER', 'region': 'Europe'},
            (41.9028, 12.4964): {'city': 'Rome', 'airport': 'Fiumicino', 'code': 'FCO', 'region': 'Europe'},
            
            # Middle East
            (32.0853, 34.7818): {'city': 'Tel Aviv', 'airport': 'Ben Gurion', 'code': 'TLV', 'region': 'Middle East'},
            (25.2048, 55.2708): {'city': 'Dubai', 'airport': 'Dubai International', 'code': 'DXB', 'region': 'Middle East'},
            
            # Asia
            (35.6762, 139.6503): {'city': 'Tokyo', 'airport': 'Narita', 'code': 'NRT', 'region': 'Asia'},
            (1.3521, 103.8198): {'city': 'Singapore', 'airport': 'Changi', 'code': 'SIN', 'region': 'Asia'},
            (22.3193, 114.1694): {'city': 'Hong Kong', 'airport': 'Hong Kong International', 'code': 'HKG', 'region': 'Asia'},
        }
        
        # Find the nearest airport (simple distance calculation)
        min_distance = float('inf')
        nearest_airport = None
        
        for (airport_lat, airport_lon), airport_info in major_airports.items():
            # Simple distance calculation (not perfect but good enough for this use case)
            distance = ((latitude - airport_lat) ** 2 + (longitude - airport_lon) ** 2) ** 0.5
            if distance < min_distance:
                min_distance = distance
                nearest_airport = airport_info
        
        # If we found a nearby airport (within reasonable distance)
        if nearest_airport and min_distance < 5.0:  # roughly 5 degrees = ~550km
            return {
                'has_location': True,
                'latitude': latitude,
                'longitude': longitude,
                'accuracy_meters': accuracy,
                'timestamp': timestamp,
                'nearest_city': nearest_airport['city'],
                'nearest_airport': nearest_airport['airport'],
                'nearest_airport_code': nearest_airport['code'],
                'region': nearest_airport['region'],
                'distance_estimate': 'nearby' if min_distance < 1.0 else 'regional'
            }
        else:
            # Generic location info without specific airport
            return {
                'has_location': True,
                'latitude': latitude,
                'longitude': longitude,
                'accuracy_meters': accuracy,
                'timestamp': timestamp,
                'nearest_city': 'Unknown',
                'nearest_airport': 'Unknown',
                'nearest_airport_code': None,
                'region': 'Unknown',
                'distance_estimate': 'distant'
            }
            
    except Exception as e:
        print(f"Error processing location data: {e}")
        return None


def parse_relative_date_expression(relative_expression, context=None):
    """
    Parse relative date expressions and return YYYY-MM-DD format.
    
    Args:
        relative_expression (str): The relative date expression (e.g., 'tomorrow', 'next Friday')
        context (str): Optional context for the date
        
    Returns:
        dict: Contains 'date' (YYYY-MM-DD), 'success' (bool), 'message' (str)
    """
    try:
        # Get current date in UTC
        now = datetime.now(timezone.utc)
        today = now.date()
        
        # Normalize the expression
        expr = relative_expression.lower().strip()
        
        # Handle simple cases
        if expr in ['today']:
            return {
                'date': today.strftime('%Y-%m-%d'),
                'success': True,
                'message': f"Today is {today.strftime('%A, %B %d, %Y')}"
            }
        
        elif expr in ['tomorrow']:
            tomorrow = today + timedelta(days=1)
            return {
                'date': tomorrow.strftime('%Y-%m-%d'),
                'success': True,
                'message': f"Tomorrow is {tomorrow.strftime('%A, %B %d, %Y')}"
            }
        
        # Handle "in X days" pattern
        days_match = re.search(r'in (\d+) days?', expr)
        if days_match:
            days = int(days_match.group(1))
            target_date = today + timedelta(days=days)
            return {
                'date': target_date.strftime('%Y-%m-%d'),
                'success': True,
                'message': f"In {days} days is {target_date.strftime('%A, %B %d, %Y')}"
            }
        
        # Handle "next week" 
        if 'next week' in expr:
            # Next Monday
            days_until_next_monday = (7 - today.weekday()) % 7
            if days_until_next_monday == 0:  # If today is Monday
                days_until_next_monday = 7
            next_monday = today + timedelta(days=days_until_next_monday)
            return {
                'date': next_monday.strftime('%Y-%m-%d'),
                'success': True,
                'message': f"Next week starts on {next_monday.strftime('%A, %B %d, %Y')}"
            }
        
        # Handle specific weekdays
        weekdays = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }
        
        for day_name, day_num in weekdays.items():
            if day_name in expr:
                current_weekday = today.weekday()
                
                if 'next' in expr:
                    # Next occurrence of this weekday
                    days_ahead = day_num - current_weekday
                    if days_ahead <= 0:  # Target day already happened this week
                        days_ahead += 7
                    target_date = today + timedelta(days=days_ahead)
                elif 'this' in expr:
                    # This week's occurrence
                    days_ahead = day_num - current_weekday
                    if days_ahead < 0:  # Already passed this week
                        return {
                            'date': None,
                            'success': False,
                            'message': f"This {day_name.capitalize()} has already passed. Did you mean next {day_name.capitalize()}?"
                        }
                    target_date = today + timedelta(days=days_ahead)
                else:
                    # Default to next occurrence
                    days_ahead = day_num - current_weekday
                    if days_ahead <= 0:
                        days_ahead += 7
                    target_date = today + timedelta(days=days_ahead)
                
                return {
                    'date': target_date.strftime('%Y-%m-%d'),
                    'success': True,
                    'message': f"{expr.title()} is {target_date.strftime('%A, %B %d, %Y')}"
                }
        
        # Handle "this weekend" / "next weekend"
        if 'weekend' in expr:
            current_weekday = today.weekday()
            
            if 'this' in expr:
                # This Saturday
                days_to_saturday = (5 - current_weekday) % 7
                if current_weekday >= 5:  # Already weekend
                    days_to_saturday = 0 if current_weekday == 5 else -1
                target_date = today + timedelta(days=days_to_saturday)
            else:  # 'next' or just 'weekend'
                # Next Saturday
                days_to_saturday = (5 - current_weekday) % 7
                if days_to_saturday <= 1 and current_weekday >= 5:  # Currently weekend
                    days_to_saturday += 7
                target_date = today + timedelta(days=days_to_saturday)
            
            return {
                'date': target_date.strftime('%Y-%m-%d'),
                'success': True,
                'message': f"Weekend starts {target_date.strftime('%A, %B %d, %Y')}"
            }
        
        # Handle "next month"
        if 'next month' in expr:
            if today.month == 12:
                next_month = today.replace(year=today.year + 1, month=1, day=1)
            else:
                next_month = today.replace(month=today.month + 1, day=1)
            return {
                'date': next_month.strftime('%Y-%m-%d'),
                'success': True,
                'message': f"Next month starts {next_month.strftime('%A, %B %d, %Y')}"
            }
        
        # If we can't parse it, return error
        return {
            'date': None,
            'success': False,
            'message': f"I couldn't understand '{relative_expression}'. Please use a specific date like '2025-01-15' or try expressions like 'tomorrow', 'next Friday', 'in 3 days'."
        }
        
    except Exception as e:
        return {
            'date': None,
            'success': False,
            'message': f"Error parsing date: {str(e)}"
        }


def lambda_handler(event, context):
    # CORS headers - defined first to ensure they're always available
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Credentials': 'false',
        'Access-Control-Max-Age': '86400'
    }
    
    try:
        return _handle_chat_request(event, context, headers)
    except Exception as e:
        print(f"[handle_chat] Unexpected error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": "Internal server error"})
        }


def _handle_chat_request(event, context, headers):
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": headers,
            "body": ""
        }

    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            'headers': headers,
            "body": json.dumps({"error": "Invalid JSON"})
        }

    # Validate request body
    validation_error = validate_request_body(body, headers)
    if validation_error:
        return validation_error

    user_prompt = body.get('user_prompt')
    user_id = body.get('user_id')
    chat_id = body.get('chat_id')
    user_location = body.get('user_location')  # Extract location data

    # Retrieve the last 10 messages from DynamoDB
    response = chat_history_table.query(
        KeyConditionExpression=Key('user_id').eq(user_id),
        FilterExpression=Attr('chat_id').eq(chat_id),
        ScanIndexForward=False,
    )

    conversation_history = response.get('Items', [])[:10]  # Get the last 10 messages

    print("Raw response:", response)
    print("Type of Items:", type(response.get('Items', [])))
    print("Items content:", response.get('Items', []))

    if len(conversation_history) == 0:
        print("len of history inside if: ", len(conversation_history))
        add_new_chat_to_db(chat_id, user_id, headers)
    else:
        print("Conversation history is NOT empty. Length:", len(conversation_history))

    conversation_history = sorted(conversation_history, key=lambda x: x['timestamp'])
    print("conversation_history after sort", conversation_history)

    # Remove unnecessary fields
    for message in conversation_history:
        del message['user_id']
        del message['timestamp']

    # Get current date/time for the system prompt
    current_time = datetime.now(timezone.utc)
    current_date_str = current_time.strftime('%A, %B %d, %Y at %I:%M %p UTC')
    today_str = current_time.strftime('%Y-%m-%d')
    tomorrow_str = (current_time + timedelta(days=1)).strftime('%Y-%m-%d')
    next_week_str = (current_time + timedelta(days=7)).strftime('%Y-%m-%d')

    # Process user location data
    location_context = get_location_context(user_location)
    location_prompt = ""
    
    if location_context and location_context.get('has_location'):
        if location_context.get('nearest_airport_code'):
            location_prompt = (
                f"USER LOCATION CONTEXT:\n"
                f"The user is located near {location_context['nearest_city']} ({location_context['nearest_airport_code']}) "
                f"in the {location_context['region']} region. "
                f"When the user asks for flights without specifying an origin, you can suggest using "
                f"{location_context['nearest_airport_code']} ({location_context['nearest_city']}) as their departure airport. "
                f"Feel free to mention this contextually in your responses, for example: "
                f"'Since you're near {location_context['nearest_city']}, I can search for flights from {location_context['nearest_airport_code']}.' "
                f"Always ask for confirmation before using this as the origin airport.\n\n"
            )
        else:
            location_prompt = (
                f"USER LOCATION CONTEXT:\n"
                f"The user has shared their location (lat: {location_context['latitude']:.2f}, "
                f"lon: {location_context['longitude']:.2f}), but I couldn't identify a nearby major airport. "
                f"When they ask for flights, you'll need to ask them to specify their departure airport.\n\n"
            )
    else:
        print("No location context available for this user")

    # Add the system message
    conversation_history.insert(0, {"role": "system",
        "content": (
        f"CURRENT DATE AND TIME: {current_date_str}\n"
        f"Today's date: {today_str}\n\n"
        f"{location_prompt}"
        "You are TripTailor's Travel Agent AI assistant, your main goal is to help the user plan their next vacation.\n\n"
        "RELATIVE DATE HANDLING:\n"
        "When users mention relative dates like 'tomorrow', 'next week', 'this Friday', etc., you have two options:\n"
        "1. For simple cases, calculate the date yourself based on the current date above:\n"
        f"   - 'today' = {today_str}\n"
        f"   - 'tomorrow' = {tomorrow_str}\n"
        f"   - 'next week' = around {next_week_str}\n"
        "2. For complex or ambiguous cases, use the parse_relative_date function to get the exact date.\n"
        "Always convert relative dates to YYYY-MM-DD format before calling search_flights or search_hotels.\n"
        "If a calculated date seems to be in the past based on the current date, ask the user to clarify.\n\n"
        "TRIP CARD MANAGEMENT:\n"
        "You are also responsible for managing the user's 'trip card' - a personalized record that tracks their evolving trip plan. "
        "This trip card contains destinations, travel dates, a trip summary, and collections of flights and hotels the user has explored. "
        "When users ask you to remove flights, hotels, or other items from their trip card, acknowledge their request and confirm that you will make the requested changes. "
        "For example, if they say 'remove that expensive flight' or 'take out the hotel in Paris', respond positively like 'I'll remove that flight from your trip card' or 'I'll take that hotel out of your trip planning'. "
        "The trip card is automatically updated based on our conversation, so you don't need to perform manual actions - just acknowledge that their preferences will be reflected.\n\n"
        "Carefully distinguish between helping the user plan their vacation and helping them find flights or hotels. "
        "if the user did not specificaly asked you to find them a flight or hotel, dont ask them for the required details in order to search flight or hotels. Instead be more attentive to the user's request and answer accordingly.\n\n"
        "You can help the user find flights and hotels using the functions at your disposal, use them as much as you need. Use them either if the user explicitly asked you to look for flights or hotels, or you can ask the user yourself if they are interested in you looking for flight or hotels for them. "
        "Don't make assumptions about function arguments. Always validate inputs. "
        "If the user asks for a function call, but the parameters are not valid, ask the user to clarify. "
        "Ensure all function inputs follow their expected format before proceeding. "
        "When using function calls, always respect the function's own parameter description. "
        "If a location is mentioned (like a city or country), convert it to the proper IATA airport code or ask the user to clarify.\n\n" 
        "You can also help the user with overall planing of their vacation by answering their questions, and asking followup questions if needed. "
        "You are ecouraged to give recomendations for attractions and places to see and visit at the user's destination, but first ask if the user is interested. "
        "If the user asks questions that are out of scope or inapropriate for your context, for example asking thing that are not travel related or feel unrelated to the flow of the conversation, tell them politely that you are unable to help with that subject. "
        "If the user asks in scope questions that you are unable to answer for some reason, for example you were not able to find flights according to the criteria the user asked, Do Not send the user to external options like google or other websites and tell them politely that you were unable to help them, let them try again with better guidance.\n\n"
        "Keep responses helpful, engaging, and focused on travel planning. Use a friendly, enthusiastic tone. "
        "You are welcome to use emojis in your answers. "
        
    )})
    # Add the new user prompt
    conversation_history.append({"role": "user", "content": user_prompt})

    # Call OpenAI API with the conversation history and function descriptions
    chat_completion = client.chat.completions.create(
        messages=conversation_history,
        model="gpt-4o",
        max_tokens=1000,
        functions=functionsDescription,
    )

    # Initialize ID collections for response
    collected_flight_ids = []
    collected_hotel_ids = []

    ai_reply = chat_completion.choices[0].message
    if ai_reply.function_call:
        func_name = ai_reply.function_call.name
        function_arguments = json.loads(ai_reply.function_call.arguments)
        print(f"[handle_chat] AI function call: {func_name}")
        print(f"[handle_chat] AI function arguments: {function_arguments}")
        params = {
            'user_id': user_id,
            'chat_id': chat_id,
            'params': function_arguments
        }

        if func_name == "search_flights":  # Handle flight search
            print("Function call detected: search_flights")
            print("Calling search_flights with params:", params)
            lambda_response = invoke_lambda_http(
                "https://f2byphzfpwp2tigocurevvgsvy0bkckb.lambda-url.us-east-1.on.aws/", params)
            lambda_response = ensure_dict(lambda_response)
            print("Lambda response keys:", list(lambda_response.keys()) if isinstance(lambda_response, dict) else "Not a dict")
            print("Lambda response: ", lambda_response)
            flight_data = lambda_response.get("data", [])
            flight_ids = lambda_response.get("flightIds", [])
            print("Extracted flight_data count:", len(flight_data) if isinstance(flight_data, list) else "Not a list")
            print("Extracted flight_ids:", flight_ids)
            collected_flight_ids.extend(flight_ids)
            formatted_flights_results = (
                "Summarize the following flights for a non-technical user.\n"
                "Include airline names, departure and arrival times, duration, number of stops, and price. "
                "Do not include any code or technical formats like JSON or TypeScript. "
                "Format times and durations in a readable format (e.g., '3h 30m'). "
                "Mention how many options were found. "
                "Make it friendly and conversational, remember to keep you travel agent persona and be concise.\n\n"
                f"Flights:\n{flight_data}"
            )

            conversation_history.append(
                {"role": "system", "content": formatted_flights_results}
                if flight_data
                else
                {"role": "system", "content": "No flight options found. Inform the user and ask them to try again."}
            )

        # ========================= NEW: search_hotels branch =========================
        elif func_name == "search_hotels":
            print("Function call detected: search_hotels")
            print("Calling search_hotels with params:", params)
            lambda_response = invoke_lambda_http(
                "https://3vkgbojnke5vy5a477jvczq5gy0vceks.lambda-url.us-east-1.on.aws/",
                params
            )
            lambda_response = ensure_dict(lambda_response)
            print("Hotels Lambda response keys:", list(lambda_response.keys()) if isinstance(lambda_response, dict) else "Not a dict")
            print("Hotels Lambda response:", lambda_response)

            hotel_data = lambda_response.get("data", [])
            hotel_ids = lambda_response.get("hotelOfferIds", [])
            print("Extracted hotel_data count:", len(hotel_data) if isinstance(hotel_data, list) else "Not a list")
            print("Extracted hotel_ids:", hotel_ids)
            collected_hotel_ids.extend(hotel_ids)
            formatted_hotels_results = (
                "Summarize the following hotel offers for a non-technical traveler.\n"
                "For each option, include: hotel name, neighborhood/city, star rating if available, "
                "check-in and check-out dates, whether breakfast/refundability is included when available, "
                "and the total price with currency. Mention how many options were found. "
                "Keep it friendly and conversational, remember to keep you travel agent persona and be concise.\n\n"
                f"Hotels:\n{hotel_data}"
            )

            conversation_history.append(
                {"role": "system", "content": formatted_hotels_results}
                if hotel_data
                else
                {"role": "system", "content": "No hotel options found. Inform the user and offer to change dates or filters."}
            )
        
        # ========================= NEW: parse_relative_date branch =========================
        elif func_name == "parse_relative_date":
            print("Function call detected: parse_relative_date")
            print("Parsing relative date with arguments:", function_arguments)
            
            relative_expression = function_arguments.get('relative_expression', '')
            context = function_arguments.get('context', '')
            
            # Call our date parsing function
            result = parse_relative_date_expression(relative_expression, context)
            
            if result['success']:
                formatted_date_result = (
                    f"Date parsing successful: '{relative_expression}' = {result['date']}\n"
                    f"Explanation: {result['message']}\n"
                    f"Use this date ({result['date']}) in your response and for any subsequent flight or hotel searches."
                )
                print(f"Date parsing success: {result['date']}")
            else:
                formatted_date_result = (
                    f"Date parsing failed for '{relative_expression}': {result['message']}\n"
                    "Ask the user to provide a specific date or try a different relative date expression."
                )
                print(f"Date parsing failed: {result['message']}")
            
            conversation_history.append(
                {"role": "system", "content": formatted_date_result}
            )
        
        # ============================================================================
        # Re-ask the model to write the final user-facing answer
        chat_completion = client.chat.completions.create(
            messages=conversation_history,
            model="gpt-4o",
            max_tokens=1000,
        )
        ai_reply = chat_completion.choices[0].message

    response_content = ai_reply.content

    # Save user prompt
    chat_history_table.put_item(
        Item={
            'user_id': user_id,
            'timestamp': int(time.time() * 1000),
            'role': 'user',
            'content': user_prompt,
            'chat_id': str(chat_id)
        }
    )

    if ai_reply.content:
        # Save assistant reply
        chat_history_table.put_item(
            Item={
                'user_id': user_id,
                'timestamp': int(time.time() * 1000),
                'role': 'assistant',
                'content': response_content,
                'chat_id': str(chat_id)
            }
        )

    # Title generation: on powers of 4 user messages (1, 4, 16, ...)
    updated_title = ""
    try:
        user_msg_count = get_user_message_count(user_id, str(chat_id))
        def is_power_of_four(n: int) -> bool:
            if n <= 0:
                return False
            while n % 4 == 0:
                n //= 4
            return n == 1

        if is_power_of_four(user_msg_count):
            # Use the same recent conversation context to propose a title
            updated_title = generate_chat_title(client, conversation_history)
            if updated_title:
                upsert_chat_title(user_id, chat_id, updated_title)
    except Exception:
        # Non-fatal if title update fails
        updated_title = ""

    print("[handle_chat] Final response flight_ids:", collected_flight_ids)
    print("[handle_chat] Final response hotel_ids:", collected_hotel_ids)
    
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "ai_reply": response_content,
            "title": updated_title,
            "chat_id": str(chat_id),
            "flight_ids": collected_flight_ids,
            "hotel_ids": collected_hotel_ids
        })
    }
