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
                'chat_titles': [],
            }
        )
        number_of_chats = 0
        chat_titles = []
        active_chat = 0
    else:
        item = user_info[0]
        number_of_chats = item.get('number_of_chats', 0)
        chat_titles = item.get('chat_titles', []) or []
        active_chat = item.get('active_chat', 0)

    # Build a lightweight chats array with titles if present
    chats = []
    try:
        n = int(number_of_chats)
    except Exception:
        n = 0

    # Return chats newest-first so the UI shows recent chats on top
    for i in range(n, 0, -1):
        idx = i - 1
        title = ''
        if idx < len(chat_titles):
            title = chat_titles[idx] or ''
        chats.append({
            'chat_id': str(i),
            'title': title,
        })

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "number_of_chats": str(number_of_chats),
            "active_chat": str(active_chat),
            "chat_titles": chat_titles,
            "chats": chats
        })
    }
