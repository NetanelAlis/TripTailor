import json
import boto3
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
user_table = dynamodb.Table('user')
chat_history_table = dynamodb.Table('chat-history')


def set_active_chat_id(new_chat_id, user_id, headers):
    try:
        user_table.update_item(
            Key={
                'user_id': user_id
            },
            UpdateExpression='SET active_chat = :chat_id',
            ExpressionAttributeValues={
                ':chat_id': new_chat_id
            },
            ConditionExpression='attribute_exists(user_id)'  # Optional safety
        )
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Failed to update user: {str(e)}"})
        }

def get_chat_messages(chat_id, user_id):
    response = chat_history_table.query(
        KeyConditionExpression=Key('user_id').eq(user_id),
        FilterExpression=Attr('chat_id').eq(chat_id),
        ProjectionExpression='#c, #r',
        ExpressionAttributeNames={
            '#c': 'content',
            '#r': 'role'
        },
        ScanIndexForward=True
    )
    return response.get('Items', [])

def lambda_handler(event, context):
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

    user_id = body.get('user_id')
    chat_id = body.get('chat_id')

    if not user_id:
        return {
            "statusCode": 400,
            'headers': headers,
            "body": json.dumps({"error": "user_id is required"})
        }

    if not chat_id:
        return {
            "statusCode": 400,
            'headers': headers,
            "body": json.dumps({"error": "chat_id is required"})
        }

    set_active_chat_id(chat_id, user_id, headers)
    chat_messages = get_chat_messages(chat_id, user_id)


    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({"chat_messages": chat_messages})
    }
