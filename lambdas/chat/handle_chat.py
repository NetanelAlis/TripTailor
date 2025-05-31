import json
from openai import OpenAI
import boto3
from boto3.dynamodb.conditions import Key, Attr
import time
import requests

# Initialize the DynamoDB client
dynamodb = boto3.resource('dynamodb')
chat_history_table = dynamodb.Table('chat-history')
user_table = dynamodb.Table('user')
functionsDescription = [
    {
        "name": "place_order",
        "description": "Place an order for a pizza",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The name of the pizza, e.g. Pepperoni",
                },
                "size": {
                    "type": "string",
                    "enum": ["small", "medium", "large"],
                    "description": "The size of the pizza. Always ask for clarification if not specified.",
                },
                "take_away": {
                    "type": "boolean",
                    "description": "Whether the pizza is taken away. Assume false if not specified.",
                },
            },
            "required": ["name", "size", "take_away"],
        },
    },
    {
        "name": "search_flights",
        "description": "Finds flights based on the user's travel preferences. This function must be called whenever the user searches for flights, requests different or alternative flight options (e.g., different dates, nonstop flights, cheaper flights, other airlines), or indicates dissatisfaction with previous results. Always call this function again when travel criteria change.",
        "parameters": {
            "type": "object",
            "properties": {
                "originLocationCode": {
                    "type": "string",
                    "description": "The IATA airport code for the origin. If the user provides a city or country name instead, convert it to a valid IATA code or ask the user to clarify. Always ensure this is a valid IATA code before calling the function."
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


def lambda_handler(event, context):
    client = OpenAI(
        api_key="OPEN_AI_KEY")

    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    }

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

    # Add the system message
    conversation_history.insert(0, {"role": "system",
                                    "content": (
                                        "Don't make assumptions about function arguments. Always validate inputs. "
                                        "If a location is mentioned (like a city or country), convert it to the proper IATA airport code or ask the user to clarify. "
                                        "Ensure all function inputs follow their expected format before proceeding."
                                        "When using function calls, always respect the function’s own parameter description."
                                    )
                                    })
    # Add the new user prompt
    conversation_history.append({"role": "user", "content": user_prompt})

    # Call OpenAI API with the conversation history and function descriptions
    chat_completion = client.chat.completions.create(
        messages=conversation_history,
        model="gpt-4o",
        max_tokens=1000,
        functions=functionsDescription,
    )

    ai_reply = chat_completion.choices[0].message
    if ai_reply.function_call:
        func_name = ai_reply.function_call.name
        params = {
            'user_id': user_id,
            'chat_id': chat_id,
            'params': json.loads(ai_reply.function_call.arguments)
        }

        if func_name == "search_flights": # Handle flight search
            print("Function call detected: search_flights")
            lambda_response = invoke_lambda_http(
                "https://f2byphzfpwp2tigocurevvgsvy0bkckb.lambda-url.us-east-1.on.aws/", params)
            lambda_response = ensure_dict(lambda_response)
            print("Lambda response: ", lambda_response)
            flight_data = lambda_response.get("data", [])
            formatted_flights_results = (
                "Summarize the following flights for a non-technical user. Include airline names, "
                "departure and arrival times, duration, number of stops, and price. "
                "Do not include any code or technical formats like JSON or TypeScript. "
                "Format times and durations in a readable format (e.g., '3h 30m'). "
                "Mention how many options were found. "
                "Make it friendly and conversational, write as if you're talking to a traveler looking for a flight.\n\n"
                f"Flights:\n{flight_data}"
            )

            conversation_history.append(
                {"role": "system", "content": formatted_flights_results}
                if formatted_flights_results
                else
                {"role": "system", "content": "No flight options found. Inform the user and ask them to try again."})


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

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({"ai_reply": response_content})
    }