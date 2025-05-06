import axios from 'axios';

export async function sendMessageToChatbot(message) {
    // Retrieve user details from local storage
    const userDetails = localStorage.getItem('userDetails');
    if (!userDetails) {
        throw new Error('User details not found in local storage');
    }

    // Parse the user details
    const parsedUserDetails = JSON.parse(userDetails);

    // Log the user ID for debugging
    console.log('User ID:', parsedUserDetails.sub);

    const response = await axios.post(
        'https://qxtrwenfisgn3gebs4c2tuv6qq0ifthy.lambda-url.us-east-1.on.aws/',
        {
            user_prompt: message,
            user_id: parsedUserDetails.sub,
        }
    );
    return response.data;
}
