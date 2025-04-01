import ChatTextBox from '../../components/chat-text-box/ChatTextBox';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import './chat.css';
function Chat() {
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const userInput = location.state?.userInput || {};
  const [message, setMessage] = useState([
    {
      sender: 'user',
      text: '' + userInput,
    },
  ]);

  function addNewMessageFromUser(userMessage) {
    setMessage((prevMessage) => {
      const updatedMessage = [
        ...prevMessage,
        {
          sender: 'user',
          text: userMessage,
        },
      ];

      return updatedMessage;
    });
  }

  function addNewMessageFromBot(botMessage) {
    setMessage((prevMessage) => {
      const updatedMessage = [
        ...prevMessage,
        {
          sender: 'bot',
          text: botMessage,
        },
      ];

      return updatedMessage;
    });
  }

  async function handleSendMessage(userMessage) {
    addNewMessageFromUser(userMessage); // set the user message in the chat
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await response.json();

      addNewMessageFromBot(data.message);
      setIsLoading(false);
    } catch (error) {
      addNewMessageFromBot('Error: ' + error.message);
    }
  }

  return (
    <div className="chat-container-chat-page">
      <div>
        {message.length > 0 && (
          <ul className="chat-messages">
            {message.map((msg, index) => (
              <li key={index} className={`chat-message ${msg.sender}`}>
                {msg.text}
              </li>
            ))}
          </ul>
        )}

        {isLoading && <div className="loading-new-chat">Loading...</div>}
      </div>
      <div className="chat-text-box-container">
        <ChatTextBox onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}

export default Chat;
