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

    const response = await axios.post(import.meta.env.VITE_CHAT_LAMBDA_URL, {
        user_prompt: message,
        user_id: parsedUserDetails.sub,
    });
    return response.data;
}
