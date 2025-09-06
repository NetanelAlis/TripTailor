import json
import boto3
from boto3.dynamodb.conditions import Key

# Initialize the DynamoDB client
dynamodb = boto3.resource('dynamodb')
user_table = dynamodb.Table('user')


def update_user_details(user_id, update_data, headers):
    """
    Update user details in the user table.
    
    Args:
        user_id (str): The user ID (required)
        update_data (dict): Dictionary containing fields to update
        headers (dict): CORS headers for response
    
    Returns:
        dict: Lambda response with status code and body
    """
    try:
        # Build the update expression and attribute values dynamically
        update_expression_parts = []
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        # Define allowed fields that can be updated (includes all Amadeus required fields)
        allowed_fields = {
            'full_name': 'full_name',
            'phone_number': 'phone_number',
            'passport_name': 'passport_name',
            'date_of_birth': 'date_of_birth',
            'gender': 'gender',
            'nationality': 'nationality',
            'preferred_currency': 'preferred_currency',
            'location_permission': 'location_permission',
            'emergency_contact': 'emergency_contact',
            # Additional fields needed for Amadeus flight booking
            'national_id': 'national_id',
            'passport_number': 'passport_number',
            'passport_expiry_date': 'passport_expiry_date',
            'passport_issuance_location': 'passport_issuance_location',
            'passport_issuance_country': 'passport_issuance_country',
            'phone_country_calling_code': 'phone_country_calling_code',
            'email': 'email'
        }
        
        # Process each field in update_data
        for field, value in update_data.items():
            if field in allowed_fields:
                # Use expression attribute names to handle reserved words
                attr_name = f"#{field}"
                attr_value = f":{field}"
                
                update_expression_parts.append(f"{attr_name} = {attr_value}")
                expression_attribute_names[attr_name] = field
                expression_attribute_values[attr_value] = value
        
        if not update_expression_parts:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "No valid fields to update"})
            }
        
        # Build the complete update expression
        update_expression = f"SET {', '.join(update_expression_parts)}"
        
        # Perform the update
        user_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ConditionExpression='attribute_exists(user_id)'  # Ensure user exists
        )
        
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "message": "User details updated successfully",
                "user_id": user_id,
                "updated_fields": list(update_data.keys())
            })
        }
        
    except user_table.meta.client.exceptions.ConditionalCheckFailedException:
        return {
            "statusCode": 404,
            "headers": headers,
            "body": json.dumps({"error": "User not found"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Failed to update user details: {str(e)}"})
        }


def lambda_handler(event, context):
    """
    Lambda handler for updating user details.
    
    Expected request body:
    {
        "user_id": "required_user_id",
        "full_name": "optional_full_name",
        "phone_number": "optional_phone_number",
        "passport_name": "optional_passport_name",
        "date_of_birth": "optional_date_of_birth",
        "gender": "optional_gender",
        "nationality": "optional_nationality",
        "preferred_currency": "optional_preferred_currency",
        "location_permission": "optional_location_permission_boolean",
        "emergency_contact": "optional_emergency_contact_object",
        "national_id": "optional_national_id",
        "passport_number": "optional_passport_number",
        "passport_expiry_date": "optional_passport_expiry_date",
        "passport_issuance_location": "optional_passport_issuance_location",
        "passport_issuance_country": "optional_passport_issuance_country",
        "phone_country_calling_code": "optional_phone_country_calling_code",
        "email": "optional_email"
    }
    
    Emergency contact object structure:
    {
        "name": "contact_name",
        "phone": "contact_phone",
        "relationship": "relationship"
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

    # Extract update data (all fields except user_id)
    update_data = {k: v for k, v in body.items() if k != 'user_id' and v is not None}
    
    if not update_data:
        return {
            "statusCode": 400,
            'headers': headers,
            "body": json.dumps({"error": "At least one field to update is required"})
        }

    # Update user details
    return update_user_details(user_id, update_data, headers)
