import axios from 'axios';

function getUserId() {
    // Retrieve user details from local storage
    const userDetails = localStorage.getItem('userDetails');
    if (!userDetails) {
        throw new Error('User details not found in local storage');
    }

    // Parse the user details
    const parsedUserDetails = JSON.parse(userDetails);
    return parsedUserDetails.sub;
}

function getUserLocationData() {
    try {
        const userDetails = localStorage.getItem('userDetails');
        if (!userDetails) return null;

        const parsedUserDetails = JSON.parse(userDetails);

        // Only return location data if user has granted permission and data exists
        if (
            parsedUserDetails.location_permission &&
            parsedUserDetails.location_data
        ) {
            return parsedUserDetails.location_data;
        }

        return null;
    } catch (error) {
        console.error('Error retrieving user location data:', error);
        return null;
    }
}

export async function sendMessageToChatbot(message, activeChatId) {
    const userId = getUserId();
    const locationData = getUserLocationData();

    const requestData = {
        user_prompt: message,
        user_id: userId,
        chat_id: activeChatId + '',
    };

    // Include location data if available
    if (locationData) {
        requestData.user_location = locationData;
    }

    try {
        const response = await axios.post(
            import.meta.env.VITE_HANDLE_CHAT_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error sending message to chatbot:', error);
        throw error;
    }
}

export async function fetchChatMessages(chatId) {
    const userId = getUserId();

    const requestData = {
        chat_id: chatId + '',
        user_id: userId,
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_SET_ACTIVE_CHAT_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        throw error;
    }
}

export async function getUserChats() {
    const userId = getUserId();

    const requestData = {
        user_id: userId,
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_GET_USER_CHATS_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error getting user chats:', error);
        throw error;
    }
}

export async function getFlightOffersPricing(flightIds, includeOptions = []) {
    if (!flightIds || flightIds.length === 0) {
        throw new Error('No flight IDs provided');
    }

    const userId = getUserId();

    const requestData = {
        flightIds: flightIds,
        include: includeOptions,
        user_id: userId,
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_GET_FLIGHTS_OFFERS_PRICE_LAMBDA_URL,
            requestData
        );

        // The lambda now returns a single response with all flight offers
        // We need to map the response back to individual flight results for backward compatibility
        const flightOffers = response.data.data?.flightOffers || [];

        // Create the same structure as before for backward compatibility
        const results = flightIds.map((flightId, index) => ({
            flightId: flightId,
            pricing: {
                data: {
                    flightOffers: [flightOffers[index]], // Each flight gets its corresponding offer
                },
            },
        }));

        return results;
    } catch (error) {
        console.error('Error calling flight pricing Lambda:', error);
        throw error;
    }
}

export async function getHotelOffersPricing(hotelIds) {
    if (!hotelIds || hotelIds.length === 0) {
        throw new Error('No hotel IDs provided');
    }

    const userId = getUserId();

    const requestData = {
        hotelIds: hotelIds,
        user_id: userId,
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_GET_HOTELS_OFFERS_PRICE_LAMBDA_URL,
            requestData
        );

        // The lambda now returns: { data: [{ hotel_id, success, used_fallback, hotel_offer_price }] }
        const hotelResults = response.data.data || [];

        console.log('🔍 API Debug: Raw lambda response:', response.data);
        console.log('🔍 API Debug: Hotel results:', hotelResults);

        // Create results in the simplified format
        const results = hotelIds.map((hotelId) => {
            const hotelResult = hotelResults.find(
                (result) => result.hotel_id === hotelId
            );

            console.log(
                `🔍 API Debug: Processing hotel ${hotelId}:`,
                hotelResult
            );

            if (!hotelResult || !hotelResult.success) {
                return {
                    hotelId: hotelId,
                    pricing: undefined,
                    success: hotelResult?.success || false,
                    error: hotelResult?.error || 'Unknown error',
                    used_fallback: hotelResult?.used_fallback || false,
                };
            }

            // The lambda already returns hotel_offer_price in the right format
            // Return it directly without unnecessary wrapping
            return {
                hotelId: hotelId,
                pricing: hotelResult.hotel_offer_price, // Direct access to hotel offer data
                success: hotelResult.success,
                used_fallback: hotelResult.used_fallback || false,
            };
        });

        console.log('🔍 API Debug: Final results:', results);
        return results;
    } catch (error) {
        console.error('Error calling hotel pricing Lambda:', error);
        throw error;
    }
}

export async function getHotelRatings(hotels) {
    console.log('🏨 Hotel Ratings API: Starting request with hotels:', hotels);

    if (!hotels || hotels.length === 0) {
        console.log('🏨 Hotel Ratings API: No hotels provided, throwing error');
        throw new Error('No hotels provided');
    }

    const userId = getUserId();
    console.log('🏨 Hotel Ratings API: User ID:', userId);

    const requestData = {
        hotels: hotels, // Array of {hotel_id, hotelId} objects
        user_id: userId,
    };

    console.log(
        '🏨 Hotel Ratings API: Request data:',
        JSON.stringify(requestData, null, 2)
    );
    console.log(
        '🏨 Hotel Ratings API: Lambda URL:',
        import.meta.env.VITE_GET_HOTELS_RATING_LAMBDA_URL
    );

    try {
        console.log('🏨 Hotel Ratings API: Making POST request...');
        const response = await axios.post(
            import.meta.env.VITE_GET_HOTELS_RATING_LAMBDA_URL,
            requestData
        );

        console.log('🏨 Hotel Ratings API: Response status:', response.status);
        console.log(
            '🏨 Hotel Ratings API: Response headers:',
            response.headers
        );

        console.log(
            '🔍 Ratings API Debug: Raw lambda response:',
            response.data
        );

        // The lambda returns: { success: true, data: [{ hotel_id, hotelId, success, rating_data }] }
        const ratingsResults = response.data.data || [];

        console.log('🔍 Ratings API Debug: Rating results:', ratingsResults);

        // Create results mapped by hotel_id for easy lookup
        const results = ratingsResults.reduce((acc, result) => {
            acc[result.hotel_id] = {
                success: result.success,
                hotelId: result.hotelId,
                rating_data: result.rating_data,
            };
            return acc;
        }, {});

        console.log('🏨 Hotel Ratings API: Final processed results:', results);
        return results;
    } catch (error) {
        console.error('🏨 Hotel Ratings API: Error occurred:', error);
        console.error('🏨 Hotel Ratings API: Error message:', error.message);
        console.error(
            '🏨 Hotel Ratings API: Error response:',
            error.response?.data
        );
        console.error(
            '🏨 Hotel Ratings API: Error status:',
            error.response?.status
        );
        console.error(
            '🏨 Hotel Ratings API: Error headers:',
            error.response?.headers
        );

        // Return empty object so UI can gracefully handle missing ratings
        return {};
    }
}

export async function updateTripCard({
    chatId,
    flightIds = [],
    hotelIds = [],
    flightStatuses = {},
    hotelStatuses = {},
    flightIdMapping = {},
    hotelIdMapping = {},
}) {
    const userId = getUserId();

    const requestData = {
        user_id: userId,
        chat_id: String(chatId),
        flight_ids: Array.isArray(flightIds) ? flightIds : [],
        hotel_ids: Array.isArray(hotelIds) ? hotelIds : [],
        flight_statuses: flightStatuses,
        hotel_statuses: hotelStatuses,
        flight_id_mapping: flightIdMapping, // originalId -> newId mapping
        hotel_id_mapping: hotelIdMapping, // originalId -> newId mapping
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_UPDATE_TRIP_CARD_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error updating trip card:', error);
        throw error;
    }
}

export async function fetchTripCardData({ chatId }) {
    const userId = getUserId();

    const requestData = {
        user_id: userId,
        chat_id: String(chatId),
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_FETCH_TRIP_CARD_DATA_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching trip card data:', error);
        throw error;
    }
}

export async function deleteChat({ chatId }) {
    const userId = getUserId();

    const requestData = {
        userID: userId,
        chatID: String(chatId),
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_DELETE_CHAT_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error deleting chat:', error);
        throw error;
    }
}

export async function createFlightOrder({
    flightOffers,
    travelers,
    tripIds,
    chatId,
    userAddress = null,
    originalTripTailorFlightIds = [],
}) {
    const userId = getUserId();

    const requestData = {
        flightOffers,
        travelers,
        tripIds,
        UserAndChatID: `${userId}:${chatId}`,
        userAddress,
        originalTripTailorFlightIds, // Add TripTailor flight IDs for mapping
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_CREATE_FLIGHT_ORDER_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error creating flight order:', error);
        throw error;
    }
}

export async function createHotelOrder({
    bookingPayloads,
    hotelOfferId,
    guests,
    chatId,
    hotelPricingData = null,
    originalTripTailorHotelIds = [],
}) {
    const userId = getUserId();

    let requestData;

    if (bookingPayloads) {
        // New multiple hotels format
        requestData = {
            bookingPayloads,
            UserAndChatID: `${userId}:${chatId}`,
            originalTripTailorHotelIds, // Add TripTailor hotel IDs for mapping
        };
    } else {
        // Legacy single hotel format - this needs to be updated to send TripTailor ID
        requestData = {
            hotelOfferId,
            guests,
            UserAndChatID: `${userId}:${chatId}`,
            hotelPricingData,
            originalTripTailorHotelIds: [hotelOfferId], // For legacy, assume hotelOfferId is TripTailor ID
        };
    }

    try {
        const response = await axios.post(
            import.meta.env.VITE_BOOK_HOTEL_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error creating hotel order:', error);
        throw error;
    }
}

export async function fetchBookingData({
    tripTailorFlightIds = [],
    tripTailorHotelIds = [],
}) {
    const requestData = {
        tripTailorFlightIds,
        tripTailorHotelIds,
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_FETCH_BOOKING_DATA_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching booking data:', error);
        throw error;
    }
}

export async function removeFlight({ tripTailorFlightId, chatId }) {
    const userId = getUserId();

    const requestData = {
        userId,
        chatId,
        tripTailorFlightId,
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_REMOVE_FLIGHT_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error removing flight:', error);
        throw error;
    }
}

export async function removeHotel({ tripTailorHotelId, chatId }) {
    const userId = getUserId();

    const requestData = {
        userId,
        chatId,
        tripTailorHotelId,
    };

    try {
        const response = await axios.post(
            import.meta.env.VITE_REMOVE_HOTEL_LAMBDA_URL,
            requestData
        );
        return response.data;
    } catch (error) {
        console.error('Error removing hotel:', error);
        throw error;
    }
}
