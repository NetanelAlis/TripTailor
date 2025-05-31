import axios from 'axios';

function getUserId() {
  // Retrieve user details from local storage
  const userDetails = localStorage.getItem('userDetails');
  if (!userDetails) {
    console.log('nothing in local storage');
    throw new Error('User details not found in local storage');
  }

  // Parse the user details
  const parsedUserDetails = JSON.parse(userDetails);

  // Log the user ID for debugging
  return parsedUserDetails.sub;
}
export async function sendMessageToChatbot(message, activeChatId) {
  const userId = getUserId();

  const response = await axios.post(
    import.meta.env.VITE_HANDLE_CHAT_LAMBDA_URL,
    {
      user_prompt: message,
      user_id: userId,
      chat_id: activeChatId + '',
    }
  );

  return response.data;
}

export async function fetchChatMessages(chatId) {
  const userId = getUserId();
  const response = await axios.post(
    import.meta.env.VITE_SET_ACTIVE_CHAT_LAMBDA_URL,
    {
      chat_id: chatId + '',
      user_id: userId,
    }
  );
  return response.data;
}

export async function getUserChats() {
  const userId = getUserId();
  const response = await axios.post(
    import.meta.env.VITE_GET_USER_CHATS_LAMBDA_URL,
    {
      user_id: userId,
    }
  );

  return response.data;
}
