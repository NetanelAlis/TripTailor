import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Message, Conversation } from '../Entities/index.js';
import MessageBubble from '../Components/chat/MessageBubble.jsx';
import ChatInput from '../Components/chat/ChatInput.jsx';
import WelcomeScreen from '../Components/chat/WelcomeScreen.jsx';
import { getUserChats, updateTripCard } from '../../api/chatApi';

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const getNextChatId = async () => {
        try {
            const res = await getUserChats();
            let count = 0;
            if (res && typeof res.number_of_chats !== 'undefined') {
                count = Number(res.number_of_chats) || 0;
            } else if (Array.isArray(res)) {
                count = res.length;
            } else if (res && Array.isArray(res.chats)) {
                count = res.chats.length;
            } else if (res && Array.isArray(res.data)) {
                count = res.data.length;
            }
            const nextId = String(count + 1);
            return nextId;
        } catch (e) {
            return '1';
        }
    };

    const ensureConversationId = async (forceNew = false) => {
        if (!forceNew && currentConversation) return currentConversation;
        const nextId = await getNextChatId();
        setCurrentConversation(nextId);
        navigate(`/chat?id=${nextId}`, { replace: true });
        return nextId;
    };

    useEffect(() => {
        const loadConversations = async () => {
            try {
                const data = await Conversation.list('-updated_date');
                setConversations(data);
            } catch (error) {
                setConversations([]);
            }
        };

        const loadMessages = async (conversationId) => {
            try {
                setIsLoadingMessages(true);
                const data = await Message.filter({
                    conversation_id: conversationId,
                });
                setMessages(data);
            } catch (error) {
                setMessages([]);
            } finally {
                setIsLoadingMessages(false);
            }
        };

        loadConversations();

        const conversationId = new URLSearchParams(location.search).get('id');
        const isNew = location.search.includes('new=true');

        if (conversationId) {
            setCurrentConversation(conversationId);
            loadMessages(conversationId);
        } else if (isNew) {
            ensureConversationId(true).then(() => setMessages([]));
        } else {
            setCurrentConversation(null);
            setMessages([]);
        }
    }, [location]);

    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async (content) => {
        if (!content.trim()) return;

        setIsLoading(true);
        try {
            const conversationId = await ensureConversationId();
            const userMessage = new Message({
                conversation_id: conversationId,
                content: content.trim(),
                sender: 'user',
            });
            setMessages((prev) => [...prev, userMessage]);

            const result = await Message.create({
                conversation_id: conversationId,
                content: content.trim(),
                sender: 'user',
            });
            const assistantReplies = Array.isArray(result)
                ? result.filter((m) => m?.sender === 'assistant')
                : [];
            if (assistantReplies.length > 0) {
                setMessages((prev) => [...prev, ...assistantReplies]);
                const hasTitle = assistantReplies.some(
                    (m) =>
                        m?.metadata &&
                        typeof m.metadata.title === 'string' &&
                        m.metadata.title.trim().length > 0
                );
                if (hasTitle) {
                    const updatedConversations = await Conversation.list(
                        '-updated_date'
                    );
                    setConversations(updatedConversations);
                }
            }

            try {
                const targetConversationId =
                    assistantReplies[0]?.conversation_id || conversationId;
                const synced = await Message.filter({
                    conversation_id: targetConversationId,
                });
                if (Array.isArray(synced) && synced.length > 0) {
                    setMessages(synced);
                }
            } catch (e) {}

            // Kick off background trip-card update if backend returned candidate IDs
            try {
                const lastAssistant =
                    assistantReplies[assistantReplies.length - 1];
                const meta = lastAssistant?.metadata || {};
                const flightIds = meta.flight_ids || [];
                const hotelIds = meta.hotel_ids || [];
                const cardChatId =
                    lastAssistant?.conversation_id || conversationId;

                console.log('Chat.jsx: About to call updateTripCard with:', {
                    chatId: cardChatId,
                    flightIds,
                    hotelIds,
                });

                updateTripCard({
                    chatId: cardChatId,
                    flightIds,
                    hotelIds,
                }).catch(() => {});
            } catch (e) {
                console.error('Chat.jsx: Error in updateTripCard call:', e);
            }

            const updatedConversations = await Conversation.list(
                '-updated_date'
            );
            setConversations(updatedConversations);
            try {
                window.dispatchEvent(
                    new CustomEvent('tt:conversations-updated')
                );
            } catch (e) {}
        } catch (error) {
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickStart = async (message) => {
        await handleSendMessage(message);
    };

    const handleNewChat = async () => {
        setCurrentConversation(null);
        setMessages([]);
        navigate('/chat?new=true');
    };

    const userDetails = localStorage.getItem('userDetails');
    if (!userDetails) {
        navigate('/');
        return null;
    }

    return (
        <div className="flex-1 min-h-0 w-full flex flex-col bg-gradient-to-b from-slate-50 to-blue-50 relative overflow-y-auto">
            <div
                className="mx-auto py-4"
                style={{ maxWidth: 'var(--tt-chatinput-max-width, 56rem)' }}
            >
                {isLoadingMessages ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-500">
                            Loading messages...
                        </span>
                    </div>
                ) : messages.length === 0 ? (
                    <WelcomeScreen onQuickStart={handleQuickStart} />
                ) : (
                    messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start px-4 sm:px-6">
                        <div className="animate-pulse text-gray-500 text-sm">
                            AI is thinking...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />

                <ChatInput
                    key={`ci-${currentConversation || 'welcome'}`}
                    onSendMessage={handleSendMessage}
                    disabled={isLoading}
                    onViewHistory={() => {
                        if (!currentConversation) return;
                        navigate(
                            `/chat/history?id=${currentConversation}&expand=1`
                        );
                    }}
                    canViewHistory={!!currentConversation}
                />
            </div>
        </div>
    );
}
