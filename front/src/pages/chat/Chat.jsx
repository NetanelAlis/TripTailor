import ChatTextBox from '../../components/chat-text-box/ChatTextBox';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { sendMessageToChatbot } from '../../api/chatApi';
import styles from './chat.module.css';

function Chat() {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState('');
    const location = useLocation();
    const [messages, setMessages] = useState([]);
    const bottomRef = useRef(null);
    const firstMessageSentRef = useRef(false);

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
                // Retrieve user details from local storage
                // const userDetails = localStorage.getItem('userDetails');
                // if (!userDetails) {
                //     throw new Error('User details not found in local storage');
                // }

                // Parse the user details
                // const parsedUserDetails = JSON.parse(userDetails);

                // Log the user ID for debugging
                // console.log('User ID:', parsedUserDetails.sub);

                const response = await sendMessageToChatbot(userMessage);
                const chatAnswer = response.ai_reply;

                const data = await response.json();
                console.log(data.message);

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
        const firstUserMessage = location.state?.userInput;

        if (firstUserMessage && !firstMessageSentRef.current) {
            handleSendMessage(firstUserMessage);
            firstMessageSentRef.current = true;
        }
    }, [handleSendMessage, location.state]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className={styles['chat-container-chat-page']}>
            {messages.length > 0 && (
                <ul className={styles['messages-list']}>
                    {messages.map((message, index) => {
                        const listItem = (
                            <li
                                key={index}
                                className={`${styles['message']} ${
                                    styles[message.sender]
                                }`}
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
