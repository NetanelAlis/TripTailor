import axios from 'axios';

export async function sendMessageToChatbot(message) {
  const response = await axios.post(
    'https://qxtrwenfisgn3gebs4c2tuv6qq0ifthy.lambda-url.us-east-1.on.aws',
    {
      user_prompt: message,
    }
  );
  return response.data;
}
