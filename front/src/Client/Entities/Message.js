import { sendMessageToChatbot, fetchChatMessages } from '../../api/chatApi';

export class Message {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.conversation_id = data.conversation_id || data.chat_id || null;
        this.content = data.content || data.text || '';
        this.sender = data.sender || data.role || 'user';
        this.message_type = data.message_type || 'text';
        this.metadata = data.metadata || {};
        this.created_date =
            data.created_date || data.timestamp || new Date().toISOString();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static async create(messageData) {
        console.log('Message.create: Starting with messageData:', messageData);
        const message = new Message(messageData);
        console.log('Message.create: Created message object:', message);

        if (message.sender === 'user') {
            try {
                console.log(
                    'Message.create: Sending to backend with content:',
                    message.content,
                    'conversation_id:',
                    message.conversation_id
                );
                const response = await sendMessageToChatbot(
                    message.content,
                    message.conversation_id
                );
                console.log('Message.create: Backend response:', response);

                let success = false;
                let aiReply = '';
                const backendChatId =
                    response?.chat_id ||
                    response?.active_chat_id ||
                    response?.conversation_id ||
                    response?.chatId;
                if (backendChatId) {
                    console.log(
                        'Message.create: Backend authoritative chat id:',
                        backendChatId
                    );
                    if (
                        !message.conversation_id ||
                        String(message.conversation_id) !==
                            String(backendChatId)
                    ) {
                        message.conversation_id = String(backendChatId);
                    }
                }

                if (response.success) {
                    success = true;
                    aiReply = response.ai_reply || response.response || '';
                } else if (response.ai_reply) {
                    success = true;
                    aiReply = response.ai_reply;
                } else if (response.response) {
                    success = true;
                    aiReply = response.response;
                } else if (typeof response === 'string') {
                    success = true;
                    aiReply = response;
                }

                console.log(
                    'Message.create: Success:',
                    success,
                    'AI Reply:',
                    aiReply
                );

                if (success && aiReply) {
                    const flightIdsFromResponse =
                        response?.flight_ids ||
                        response?.flightIds ||
                        (response?.metadata && response.metadata.flight_ids) ||
                        [];
                    const hotelIdsFromResponse =
                        response?.hotel_ids ||
                        response?.hotelOfferIds ||
                        (response?.metadata && response.metadata.hotel_ids) ||
                        [];
                    console.log(
                        'Message.create: Extracted flight_ids:',
                        flightIdsFromResponse
                    );
                    console.log(
                        'Message.create: Extracted hotel_ids:',
                        hotelIdsFromResponse
                    );
                    const assistantMessage = new Message({
                        conversation_id:
                            backendChatId || message.conversation_id,
                        content: aiReply,
                        sender: 'assistant',
                        message_type: 'text',
                        metadata: {
                            ...(response.metadata || {}),
                            flight_ids: flightIdsFromResponse,
                            hotel_ids: hotelIdsFromResponse,
                        },
                    });

                    if (response && typeof response.title === 'string') {
                        assistantMessage.metadata = {
                            ...assistantMessage.metadata,
                            title: response.title,
                            chat_id: backendChatId || message.conversation_id,
                        };
                    }

                    console.log(
                        'Message.create: Created assistant message:',
                        assistantMessage
                    );
                    return [message, assistantMessage];
                } else {
                    console.warn(
                        'Message.create: No valid response from backend, returning only user message'
                    );
                    return [message];
                }
            } catch (error) {
                console.error('Error sending message to backend:', error);
                return [message];
            }
        }

        return [message];
    }

    static async filter(filters = {}, sortBy = 'created_date') {
        console.log('Message.filter: Starting with filters:', filters);
        if (filters.conversation_id) {
            try {
                console.log(
                    'Message.filter: Fetching messages for conversation:',
                    filters.conversation_id
                );
                const messages = await fetchChatMessages(
                    filters.conversation_id
                );
                console.log(
                    'Message.filter: Raw messages from backend:',
                    messages
                );

                let messageArray = [];
                if (Array.isArray(messages)) {
                    messageArray = messages;
                } else if (messages && Array.isArray(messages.messages)) {
                    messageArray = messages.messages;
                } else if (messages && Array.isArray(messages.chat_messages)) {
                    messageArray = messages.chat_messages;
                } else if (messages && Array.isArray(messages.data)) {
                    messageArray = messages.data;
                } else {
                    console.warn(
                        'Message.filter: Unexpected messages format:',
                        messages
                    );
                    return [];
                }

                const processedMessages = messageArray.map(
                    (msg) => new Message(msg)
                );
                console.log(
                    'Message.filter: Processed messages:',
                    processedMessages
                );
                return processedMessages;
            } catch (error) {
                console.error('Error fetching messages:', error);
                return [];
            }
        }
        return [];
    }

    toJSON() {
        return {
            id: this.id,
            conversation_id: this.conversation_id,
            content: this.content,
            sender: this.sender,
            message_type: this.message_type,
            metadata: this.metadata,
            created_date: this.created_date,
        };
    }

    static fromJSON(json) {
        return new Message(json);
    }
}
