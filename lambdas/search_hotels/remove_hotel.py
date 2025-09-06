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
    Remove a hotel from trip's hotel_tuples by tripTailorHotelId
    
    Expected input:
    {
        "userId": "user123",
        "chatId": "chat456", 
        "tripTailorHotelId": "hotel789"
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
        return _handle_remove_hotel(event, headers)
    except Exception as e:
        logger.error(f"CRITICAL ERROR in lambda_handler: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Critical lambda error: {str(e)}"})
        }

def _handle_remove_hotel(event, headers):
    """Handle the hotel removal logic"""
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        # Extract required parameters
        user_id = body.get('userId')
        chat_id = body.get('chatId')
        trip_tailor_hotel_id = body.get('tripTailorHotelId')
        
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
            
        if not trip_tailor_hotel_id:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "Missing tripTailorHotelId parameter"})
            }
        
        logger.info(f"Attempting to remove hotel {trip_tailor_hotel_id} from trip {user_id}:{chat_id}")
        
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
        current_hotel_tuples = trip_item.get('hotel_tuples', [])
        
        logger.info(f"Current hotel_tuples: {current_hotel_tuples}")
        
        # Find and remove the hotel tuple containing the specified hotel ID
        updated_hotel_tuples = []
        hotel_removed = False
        
        for hotel_tuple in current_hotel_tuples:
            # Each hotel_tuple is a list like [hotel_id, status]
            if isinstance(hotel_tuple, list) and len(hotel_tuple) >= 1:
                if hotel_tuple[0] == trip_tailor_hotel_id:
                    # Skip this tuple (remove it)
                    hotel_removed = True
                    logger.info(f"Removing hotel tuple: {hotel_tuple}")
                else:
                    # Keep this tuple
                    updated_hotel_tuples.append(hotel_tuple)
            else:
                # Keep malformed tuples as-is
                updated_hotel_tuples.append(hotel_tuple)
        
        if not hotel_removed:
            logger.warning(f"Hotel {trip_tailor_hotel_id} not found in hotel_tuples")
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({"error": "Hotel not found in trip"})
            }
        
        # Update the trip item with the new hotel_tuples
        trip_item['hotel_tuples'] = updated_hotel_tuples
        trips_table.put_item(Item=trip_item)
        
        logger.info(f"Successfully removed hotel {trip_tailor_hotel_id} from trip {partition_key}")
        logger.info(f"Updated hotel_tuples: {updated_hotel_tuples}")
        
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "success": True,
                "message": f"Hotel {trip_tailor_hotel_id} removed successfully",
                "removedHotelId": trip_tailor_hotel_id,
            })
        }
        
    except Exception as e:
        logger.error(f"Error removing hotel: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Failed to remove hotel: {str(e)}"})
        }
