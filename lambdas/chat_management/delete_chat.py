import json
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

# DynamoDB tables
dynamodb = boto3.resource('dynamodb')
chat_history_table = dynamodb.Table("chat-history")
trips_table = dynamodb.Table("trip")
users_table = dynamodb.Table("user")

def delete_chat_messages(user_id, chat_id):
    """
    Delete all messages for a specific chat from the ChatHistory table
    Note: Partition key is userID, chatID is a regular attribute
    """
    try:
        # Query to get all messages for this user
        response = chat_history_table.query(
            KeyConditionExpression=Key('user_id').eq(user_id)
        )
        
        messages = response.get('Items', [])
        deleted_count = 0
        
        # Filter messages for the specific chat and delete them
        for message in messages:
            if message.get('chat_id') == chat_id:
                try:
                    chat_history_table.delete_item(
                        Key={
                            'user_id': message['user_id'],
                            'timestamp': message['timestamp']
                        }
                    )
                    deleted_count += 1
                except ClientError as e:
                    print(f"Error deleting message {message.get('timestamp')}: {e}")
        
        # Handle pagination if there are more messages
        while 'LastEvaluatedKey' in response:
            response = chat_history_table.query(
                KeyConditionExpression=Key('user_id').eq(user_id),
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            
            for message in response.get('Items', []):
                if message.get('chat_id') == chat_id:
                    try:
                        chat_history_table.delete_item(
                            Key={
                                'user_id': message['user_id'],
                                'timestamp': message['timestamp']
                            }
                        )
                        deleted_count += 1
                    except ClientError as e:
                        print(f"Error deleting message {message.get('timestamp')}: {e}")
        
        print(f"Deleted {deleted_count} messages for chat {chat_id}")
        return deleted_count
        
    except ClientError as e:
        print(f"Error querying messages for user {user_id}: {e}")
        raise

def delete_trip_data(user_id, chat_id):
    """
    Delete the trip object associated with this chat from the Trips table
    """
    try:
        user_and_chat_id = f"{user_id}:{chat_id}"
        
        # Query to find the trip record
        response = trips_table.query(
            KeyConditionExpression=Key('UserAndChatID').eq(user_and_chat_id)
        )
        
        trips = response.get('Items', [])
        deleted_count = 0
        
        # Delete each trip record
        for trip in trips:
            try:
                trips_table.delete_item(Key={'UserAndChatID': trip['UserAndChatID']})
                deleted_count += 1
            except ClientError as e:
                print(f"Error deleting trip {trip.get('UserAndChatID')}: {e}")
        
        # Handle pagination if there are more trip records
        while 'LastEvaluatedKey' in response:
            response = trips_table.query(
                KeyConditionExpression=Key('UserAndChatID').eq(user_and_chat_id),
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            
            for trip in response.get('Items', []):
                try:
                    trips_table.delete_item(Key={'UserAndChatID': trip['UserAndChatID']})
                    deleted_count += 1
                except ClientError as e:
                    print(f"Error deleting trip {trip.get('UserAndChatID')}: {e}")
        
        print(f"Deleted {deleted_count} trip records for chat {chat_id}")
        return deleted_count
        
    except ClientError as e:
        print(f"Error querying trips for chat {chat_id}: {e}")
        raise

def mark_chat_as_deleted_in_user(user_id, chat_id):
    """
    Mark the chat as deleted in the user's chat_titles list by setting the title to 'DELETED'
    """
    try:
        # Get the current user record
        response = users_table.get_item(
            Key={'user_id': user_id}
        )
        
        if 'Item' not in response:
            print(f"User {user_id} not found")
            return False
        
        user = response['Item']
        chat_titles = user.get('chat_titles', [])
        
        # Convert chat_id to integer for array indexing
        try:
            chat_index = int(chat_id) - 1  # Convert to 0-based index
        except ValueError:
            print(f"Invalid chat_id format: {chat_id}")
            return False
        
        # Check if the index is valid
        if chat_index < 0 or chat_index >= len(chat_titles):
            print(f"Chat index {chat_index} is out of range for chat_titles array of length {len(chat_titles)}")
            return False
        
        # Update the chat title to 'DELETED'
        chat_titles[chat_index] = 'DELETED'
        
        # Update the user record
        users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression='SET chat_titles = :chat_titles',
            ExpressionAttributeValues={
                ':chat_titles': chat_titles
            }
        )
        
        print(f"Marked chat {chat_id} as deleted in user {user_id}")
        return True
        
    except ClientError as e:
        print(f"Error updating user {user_id}: {e}")
        return False

def lambda_handler(event, context):
    print("start delete chat lambda")
    
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
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Extract parameters
        user_id = body.get('userID')
        chat_id = body.get('chatID')
        
        # Validate required parameters
        if not user_id:
            return {
                "statusCode": 400,
                "headers": response_headers,
                "body": json.dumps({"error": "userID is required"})
            }
        
        if not chat_id:
            return {
                "statusCode": 400,
                "headers": response_headers,
                "body": json.dumps({"error": "chatID is required"})
            }
        
        print(f"Deleting chat {chat_id} for user {user_id}")
        
        # Delete chat messages
        messages_deleted = delete_chat_messages(user_id, chat_id)
        
        # Delete trip data
        trips_deleted = delete_trip_data(user_id, chat_id)
        
        # Mark chat as deleted in user's chat_titles list
        user_updated = mark_chat_as_deleted_in_user(user_id, chat_id)
        
        # Return success response
        result = {
            "success": True,
            "message": f"Chat {chat_id} deleted successfully",
            "deleted_messages": messages_deleted,
            "deleted_trips": trips_deleted,
            "user_updated": user_updated
        }
        
        return {
            "statusCode": 200,
            "headers": response_headers,
            "body": json.dumps(result)
        }
        
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": response_headers,
            "body": json.dumps({"error": "Invalid JSON in request body"})
        }
    except ClientError as e:
        print(f"DynamoDB error: {e}")
        return {
            "statusCode": 500,
            "headers": response_headers,
            "body": json.dumps({"error": f"DynamoDB error: {str(e)}"})
        }
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {
            "statusCode": 500,
            "headers": response_headers,
            "body": json.dumps({"error": f"Internal server error: {str(e)}"})
        }
