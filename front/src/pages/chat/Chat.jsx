import ChatTextBox from '../../components/chat-text-box/ChatTextBox';
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './chat.css';

function Chat() {
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const userInput = location.state?.userInput || {};
  const [messages, setMessages] = useState([
    {
      sender: 'user',
      text: '' + userInput,
    },
  ]);
  const bottomRef = useRef(null);

  function addNewMessageFromUser(userMessage) {
    setMessages((prevMessage) => {
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
    setMessages((prevMessage) => {
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container-chat-page">
      {messages.length > 0 && (
        <ul className="messages-list">
          {messages.map((message, index) => {
            const listItem = (
              <li key={index} className={`message ${message.sender}`}>
                {message.text}
              </li>
            );
            return listItem;
          })}
          <div ref={bottomRef}></div>
        </ul>
      )}

      {/* {isLoading && <div className="loading-new-chat">Loading...</div>} */}
      <div className="chat-text-box-container">
        <ChatTextBox onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}

export default Chat;
