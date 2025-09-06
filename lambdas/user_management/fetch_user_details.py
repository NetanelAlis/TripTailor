import json
import boto3
from boto3.dynamodb.conditions import Key

# Initialize the DynamoDB client
dynamodb = boto3.resource('dynamodb')
user_table = dynamodb.Table('user')


def fetch_user_details(user_id, headers):
    """
    Fetch user details from the user table.
    
    Args:
        user_id (str): The user ID (required)
        headers (dict): CORS headers for response
    
    Returns:
        dict: Lambda response with status code and body
    """
    try:
        # Query the user table
        response = user_table.query(
            KeyConditionExpression=Key('user_id').eq(user_id),
            ScanIndexForward=False
        )

        user_info = response.get('Items', [])
        if not user_info:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({"error": "User not found"})
            }

        # Get the user data (should be the first item)
        user_data = user_info[0]
        
        # Return all user data
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "message": "User details retrieved successfully",
                "user_id": user_id,
                "user_data": user_data
            })
        }
        
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Failed to fetch user details: {str(e)}"})
        }


def lambda_handler(event, context):
    """
    Lambda handler for fetching user details.
    
    Expected request body:
    {
        "user_id": "required_user_id"
    }
    
    Returns:
    {
        "message": "User details retrieved successfully",
        "user_id": "user_id",
        "user_data": {
            "user_id": "user_id",
            "full_name": "user_full_name",
            "phone_number": "user_phone",
            "passport_name": "passport_name",
            "date_of_birth": "date_of_birth",
            "gender": "gender",
            "nationality": "nationality",
            "preferred_currency": "currency",
            "location_permission": true/false,
            "emergency_contact": {
                "name": "contact_name",
                "phone": "contact_phone",
                "relationship": "relationship"
            },
            "number_of_chats": 0,
            "active_chat": 0,
            "chat_titles": []
        }
    }
    """
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    }

    # Handle preflight OPTIONS request
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": headers,
            "body": ""
        }

    # Parse request body
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            'headers': headers,
            "body": json.dumps({"error": "Invalid JSON"})
        }

    # Validate required parameters
    user_id = body.get('user_id')
    if not user_id:
        return {
            "statusCode": 400,
            'headers': headers,
            "body": json.dumps({"error": "user_id is required"})
        }

    # Fetch user details
    return fetch_user_details(user_id, headers)
