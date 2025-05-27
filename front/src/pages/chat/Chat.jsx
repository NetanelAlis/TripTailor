import ChatTextBox from '../../components/chat-text-box/ChatTextBox';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { sendMessageToChatbot } from '../../api/chatApi';
import styles from './chat.module.css';
import { useOutletContext } from 'react-router-dom';
import { fetchChatMessages } from '../../api/chatApi';

function Chat() {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState('');
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);
  const firstMessageSentRef = useRef(false);
  const { activeChat, setActiveChat } = useOutletContext();

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
        const response = await sendMessageToChatbot(userMessage, activeChat);
        const chatAnswer = response.ai_reply;

        addNewMessage(chatAnswer, 'bot');
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        setErrors(error.message);
      }
    },
    [addNewMessage, activeChat]
  );
  useEffect(() => {
    const sendInitialMessage = async () => {
      const firstUserMessage = location.state?.userInput;
      const newChatClicked = location.state?.newChatClicked;
      const newChatId = location.state?.newChatId;

      if (newChatId) {
        setActiveChat(newChatId);
      } else {
        if (
          (firstUserMessage && !firstMessageSentRef.current) ||
          newChatClicked
        ) {
          await handleSendMessage(firstUserMessage);
          firstMessageSentRef.current = true;
        }
      }
    };

    sendInitialMessage();
  }, [
    handleSendMessage,
    location.state?.userInput,
    location.state?.newChatClicked,
    location.state?.newChatId,
    setActiveChat,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    console.log('get all messages');
    async function updateActiveChatMessages(chatId) {
      setIsLoading(true);
      setMessages([]);
      try {
        const res = await fetchChatMessages(chatId);
        const chatMessages = res.chat_messages;
        const updatedMessages = chatMessages.map((message) => ({
          sender: message.role,
          text: message.content,
        }));
        setMessages(updatedMessages);
        setIsLoading(false);
      } catch (error) {
        setErrors(error.message || 'Failed to fetch chat messages');
        setIsLoading(false);
      }
    }
    if (activeChat) {
      updateActiveChatMessages(activeChat);
    }
  }, [activeChat]);

  return (
    <div className={styles['chat-container-chat-page']}>
      {messages.length > 0 && (
        <ul className={styles['messages-list']}>
          {messages.map((message, index) => {
            const listItem = (
              <li
                key={index}
                className={`${styles['message']} ${styles[message.sender]}`}
              >
                {message.text}
              </li>
            );
            return listItem;
          })}
          {isLoading && (
            <li
              className={`${styles['message']} ${styles['bot']} ${styles['loading-message']}`}
            >
              ⏳ Ready for Takeoff...
              <p>The message is on its way</p>
            </li>
          )}
          <div ref={bottomRef}></div>
        </ul>
      )}
      <div className={styles['chat-text-box-container']}>
        <ChatTextBox onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}

export default Chat;
