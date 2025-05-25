import axios from 'axios';

function getUserId() {
  // Retrieve user details from local storage
  const userDetails = localStorage.getItem('userDetails');
  if (!userDetails) {
    throw new Error('User details not found in local storage');
  }

  // Parse the user details
  const parsedUserDetails = JSON.parse(userDetails);

  // Log the user ID for debugging
  console.log('User ID:', parsedUserDetails.sub);
  return parsedUserDetails.sub;
}
export async function sendMessageToChatbot(message, activeChatId) {
  const userId = getUserId();
  const response = await axios.post(import.meta.env.VITE_CHAT_LAMBDA_URL, {
    user_prompt: message,
    user_id: userId,
    chat_id: activeChatId + '',
  });

  return response.data;
}

export async function fetchChatMessages(chatId) {
  const userId = getUserId();
  console.log(chatId);
  const response = await axios.post(
    import.meta.env.VITE_SET_EXISTING_CHAT_AS_ACTIVE_CHAT_LAMBDA_URL,
    {
      chat_id: chatId + '',
      user_id: userId,
    }
  );
  return response.data;
}
