import ChatTextBox from '../../components/chat-text-box/ChatTextBox';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { sendMessageToChatbot } from '../../api/chatApi';
import './chat.css';

function Chat() {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState('');
  const location = useLocation();
  const userInput = location.state?.userInput || {};
  const [messages, setMessages] = useState([
    {
      sender: 'user',
      text: '' + userInput,
    },
  ]);
  const bottomRef = useRef(null);

  const addNewMessage = useCallback((userMessage, sender = 'user') => {
    setMessages((prevMessage) => {
      const updatedMessage = [
        ...prevMessage,
        {
          sender: sender,
          text: userMessage,
        },
      ];

      return updatedMessage;
    });
  }, []);

  const handleSendMessage = useCallback(
    async (userMessage) => {
      addNewMessage(userMessage, 'user');
      setIsLoading(true);
      try {
        const response = await sendMessageToChatbot(userMessage);
        const chatAnswer = response.ai_reply;

        addNewMessage(chatAnswer, 'bot');
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        setErrors(error.message);
      }
    },
    [addNewMessage]
  );

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
          {isLoading && (
            <li className="message bot loading-message">
              ⏳ המטוס ממריא...<p>ההודעה בדרך אליך</p>
            </li>
          )}
          {errors.length > 0 && (
            <li className="message bot error-message">
              <p>שגיאה: {errors}</p>
            </li>
          )}
          {/* Scroll to the bottom of the chat */}
          <div ref={bottomRef}></div>
        </ul>
      )}
      <div className="chat-text-box-container">
        <ChatTextBox onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}

export default Chat;
