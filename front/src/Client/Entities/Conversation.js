import { getUserChats } from '../../api/chatApi';

export class Conversation {
    constructor(data = {}) {
        this.id = data.id || data.chat_id || this.generateId();
        this.title = data.title || 'New Trip Planning';
        this.destination = data.destination || '';
        this.status = data.status || 'active';
        this.trip_dates = data.trip_dates || {};
        this.preferences = data.preferences || {};
        this.created_date = data.created_date || new Date().toISOString();
        this.updated_date = data.updated_date || new Date().toISOString();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static async create(conversationData) {
        const conversation = new Conversation(conversationData);
        return conversation;
    }

    static normalizeChatsResponse(response) {
        if (!response) return [];
        if (Array.isArray(response)) return response;
        if (Array.isArray(response.chats)) return response.chats;
        if (response.data && Array.isArray(response.data)) return response.data;
        if (
            response.chats &&
            typeof response.chats === 'object' &&
            !Array.isArray(response.chats)
        ) {
            return Object.values(response.chats);
        }
        return [];
    }

    static generateFallbackChatsFromCount(count) {
        if (!count || count <= 0) return [];
        const list = [];
        for (let i = count; i >= 1; i--) {
            list.push(
                new Conversation({
                    id: String(i),
                    title: `Trip ${i}`,
                })
            );
        }
        return list;
    }

    static async list(sortBy = '-updated_date', limit = undefined) {
        try {
            const response = await getUserChats();
            console.log(
                'Conversation.list: Response from getUserChats:',
                response
            );

            let chats = Conversation.normalizeChatsResponse(response);

            const rawCount = response?.number_of_chats;
            let backendCount = Array.isArray(chats) ? chats.length : 0;
            if (rawCount !== undefined && rawCount !== null) {
                const coerced = Number(rawCount);
                if (!Number.isNaN(coerced)) backendCount = coerced;
            }
            console.log(
                'Conversation.list: backend reported count:',
                backendCount
            );

            if (!Array.isArray(chats) || chats.length === 0) {
                const count = Number(response?.number_of_chats || 0);
                if (count > 0) {
                    const fallback =
                        Conversation.generateFallbackChatsFromCount(count);
                    return limit ? fallback.slice(0, limit) : fallback;
                }
                console.warn(
                    'Conversation.list: Unexpected response format, returning empty list:',
                    response
                );
                return [];
            }

            const mapped = chats
                .map(
                    (chat) =>
                        new Conversation({
                            id: chat.chat_id || chat.id,
                            title:
                                chat.title &&
                                String(chat.title).trim().length > 0
                                    ? chat.title
                                    : `Trip ${chat.chat_id || chat.id}`,
                            created_date: chat.created_date,
                            updated_date:
                                chat.updated_date || chat.created_date,
                        })
                )
                .filter((conv) => conv.title !== 'DELETED'); // Filter out deleted conversations

            if (!mapped.some((c) => c.updated_date)) {
                mapped.sort((a, b) => {
                    const ai = Number(a.id);
                    const bi = Number(b.id);
                    if (!Number.isNaN(bi) && !Number.isNaN(ai)) return bi - ai;
                    return String(b.id).localeCompare(String(a.id));
                });
            }

            if (sortBy === '-updated_date') {
                mapped.sort((a, b) => {
                    const ad = a.updated_date
                        ? new Date(a.updated_date).getTime()
                        : NaN;
                    const bd = b.updated_date
                        ? new Date(b.updated_date).getTime()
                        : NaN;
                    const aValid = Number.isFinite(ad);
                    const bValid = Number.isFinite(bd);
                    if (aValid && bValid) return bd - ad;
                    if (aValid) return -1;
                    if (bValid) return 1;
                    const ai = Number(a.id);
                    const bi = Number(b.id);
                    if (!Number.isNaN(bi) && !Number.isNaN(ai)) return bi - ai;
                    return String(b.id).localeCompare(String(a.id));
                });
            } else if (sortBy === 'updated_date') {
                mapped.sort((a, b) => {
                    const ad = a.updated_date
                        ? new Date(a.updated_date).getTime()
                        : NaN;
                    const bd = b.updated_date
                        ? new Date(b.updated_date).getTime()
                        : NaN;
                    const aValid = Number.isFinite(ad);
                    const bValid = Number.isFinite(bd);
                    if (aValid && bValid) return ad - bd;
                    if (aValid) return -1;
                    if (bValid) return 1;
                    const ai = Number(a.id);
                    const bi = Number(b.id);
                    if (!Number.isNaN(bi) && !Number.isNaN(ai)) return ai - bi;
                    return String(a.id).localeCompare(String(b.id));
                });
            }

            const limited = limit ? mapped.slice(0, limit) : mapped;
            return limited;
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return [];
        }
    }

    static async filter(filters = {}, sortBy = 'created_date') {
        try {
            const response = await getUserChats();
            let chats = Conversation.normalizeChatsResponse(response);

            if ((!Array.isArray(chats) || chats.length === 0) && filters.id) {
                const count = Number(response?.number_of_chats || 0);
                if (count > 0) {
                    const idStr = String(filters.id);
                    const idNum = Number(idStr);
                    if (!Number.isNaN(idNum) && idNum >= 1 && idNum <= count) {
                        return [
                            new Conversation({
                                id: idStr,
                                title: `Trip ${idStr}`,
                            }),
                        ];
                    }
                }
                return [];
            }

            return chats
                .filter((chat) => {
                    if (
                        filters.id &&
                        String(chat.chat_id || chat.id) !== String(filters.id)
                    )
                        return false;
                    return true;
                })
                .map(
                    (chat) =>
                        new Conversation({
                            id: chat.chat_id || chat.id,
                            title:
                                chat.title || `Trip ${chat.chat_id || chat.id}`,
                            created_date: chat.created_date,
                            updated_date:
                                chat.updated_date || chat.created_date,
                        })
                );
        } catch (error) {
            console.error('Error filtering conversations:', error);
            return [];
        }
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            destination: this.destination,
            status: this.status,
            trip_dates: this.trip_dates,
            preferences: this.preferences,
            created_date: this.created_date,
            updated_date: this.updated_date,
        };
    }

    static fromJSON(json) {
        return new Conversation(json);
    }
}
