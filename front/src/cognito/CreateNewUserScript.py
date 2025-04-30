import boto3
import hmac
import hashlib
import base64

# Configuration
client_id = '7j6cm570f74emoksvgl5ad3vd7'  # Replace with your App Client ID
client_secret = '1taiiguv1eg02ofj8mbvpkb3p1akfslhrm54c5jhri5i2fuicdl4'  # Replace with your App Client Secret
username = 'nadir070299e@gmail.com'
password = 'StrongPassword123!'
email = 'nadir070299e@gmail.com'


# Function to calculate SECRET_HASH
def calculate_secret_hash(client_id, client_secret, username):
    message = username + client_id
    dig = hmac.new(client_secret.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).digest()
    return base64.b64encode(dig).decode('utf-8')


# Initialize Cognito client
client = boto3.client('cognito-idp', region_name='us-east-1')

# Sign up user
try:
    response = client.sign_up(
        ClientId=client_id,
        Username=username,
        Password=password,
        UserAttributes=[
            {'Name': 'email', 'Value': email}
        ],
        SecretHash=calculate_secret_hash(client_id, client_secret, username)
    )
    print("User signed up successfully:", response)
except Exception as e:
    print("Error during sign up:", e)