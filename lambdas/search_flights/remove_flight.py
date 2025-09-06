import json
import boto3
from boto3.dynamodb.conditions import Key
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
trips_table = dynamodb.Table('trip')

def _cors_headers():
    """Return standard CORS headers"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Credentials": "false"
    }

def lambda_handler(event, context):
    """
    Remove a flight from trip's flight_tuples by tripTailorFlightId
    
    Expected input:
    {
        "userId": "user123",
        "chatId": "chat456", 
        "tripTailorFlightId": "flight789"
    }
    """
    headers = _cors_headers()
    
    # Handle OPTIONS request for CORS
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": headers,
            "body": ""
        }
    
    try:
        return _handle_remove_flight(event, headers)
    except Exception as e:
        logger.error(f"CRITICAL ERROR in lambda_handler: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Critical lambda error: {str(e)}"})
        }

def _handle_remove_flight(event, headers):
    """Handle the flight removal logic"""
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        # Extract required parameters
        user_id = body.get('userId')
        chat_id = body.get('chatId')
        trip_tailor_flight_id = body.get('tripTailorFlightId')
        
        # Validate required parameters
        if not user_id:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "Missing userId parameter"})
            }
        
        if not chat_id:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "Missing chatId parameter"})
            }
            
        if not trip_tailor_flight_id:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "Missing tripTailorFlightId parameter"})
            }
        
        logger.info(f"Attempting to remove flight {trip_tailor_flight_id} from trip {user_id}:{chat_id}")
        
        # Construct partition key
        partition_key = f"{user_id}:{chat_id}"
        
        # Get the current trip item
        trip_key = {"UserAndChatID": partition_key}
        response = trips_table.get_item(Key=trip_key)
        trip_item = response.get("Item")
        
        if not trip_item:
            logger.warning(f"No trip found for {partition_key}")
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({"error": "Trip not found"})
            }
        current_flight_tuples = trip_item.get('flight_tuples', [])
        
        logger.info(f"Current flight_tuples: {current_flight_tuples}")
        
        # Find and remove the flight tuple containing the specified flight ID
        updated_flight_tuples = []
        flight_removed = False
        
        for flight_tuple in current_flight_tuples:
            # Each flight_tuple is a list like [flight_id, status]
            if isinstance(flight_tuple, list) and len(flight_tuple) >= 1:
                if flight_tuple[0] == trip_tailor_flight_id:
                    # Skip this tuple (remove it)
                    flight_removed = True
                    logger.info(f"Removing flight tuple: {flight_tuple}")
                else:
                    # Keep this tuple
                    updated_flight_tuples.append(flight_tuple)
            else:
                # Keep malformed tuples as-is
                updated_flight_tuples.append(flight_tuple)
        
        if not flight_removed:
            logger.warning(f"Flight {trip_tailor_flight_id} not found in flight_tuples")
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({"error": "Flight not found in trip"})
            }
        
        # Update the trip item with the new flight_tuples
        trip_item['flight_tuples'] = updated_flight_tuples
        trips_table.put_item(Item=trip_item)
        
        logger.info(f"Successfully removed flight {trip_tailor_flight_id} from trip {partition_key}")
        logger.info(f"Updated flight_tuples: {updated_flight_tuples}")
        
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "success": True,
                "message": f"Flight {trip_tailor_flight_id} removed successfully",
                "removedFlightId": trip_tailor_flight_id,
            })
        }
        
    except Exception as e:
        logger.error(f"Error removing flight: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Failed to remove flight: {str(e)}"})
        }
