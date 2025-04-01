import ChatTextBox from '../chat-text-box/ChatTextBox';
import { useState } from 'react';
import './Chat.css';

function Chat() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    addNewMessageFromUser(userMessage);
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
    <div>
      <h1>Chat Page</h1>
      <div className="chat-messages">
        {message.map((msg, index) => (
          <div key={index} className={`message${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>
      {isLoading && <div className="loading">Loading...</div>}
      <ChatTextBox onSendMessage={handleSendMessage} />
    </div>
  );
}
