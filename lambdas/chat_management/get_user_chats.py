import json
import boto3
from boto3.dynamodb.conditions import Key

# Initialize the DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('user')


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

    if not user_id:
        return {
            "statusCode": 400,
            'headers': headers,
            "body": json.dumps({"error": "user_id is required"})
        }

    response = table.query(
        KeyConditionExpression=Key('user_id').eq(user_id),
        ScanIndexForward=False
    )

    user_info = response.get('Items', [])
    if not user_info:
        table.put_item(
            Item={
                'user_id': user_id,
                'number_of_chats': 0,
                'active_chat': 0,
            }
        )
        number_of_chats = 0
    else:
        number_of_chats = user_info[0].get('number_of_chats', 0)

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({"number_of_chats": str(number_of_chats)})
    }
