import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Conversation, Message, User } from '../Entities/index.js';
import { Button } from '../Components/ui/button.jsx';
import { MessageSquare } from 'lucide-react';
import TripCard from '../Components/trips/TripCard.jsx';
import { fetchTripCardData, deleteChat } from '../../api/chatApi';
import { getAirlineName } from '../utils/airlineCodes.js';

export default function HistoryPage() {
    const [conversations, setConversations] = useState([]);
    const [tripData, setTripData] = useState({}); // Store trip data by conversation ID
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const expandedIdRef = useRef(null);

    useEffect(() => {
        loadConversations();
    }, [location.search]);

    const loadConversations = async () => {
        try {
            setIsLoading(true);
            const data = await Conversation.list('-updated_date', 50);
            const conversationsWithMessages = await Promise.all(
                data.map(async (conv) => {
                    const msgs = await Message.filter(
                        { conversation_id: conv.id },
                        'created_date'
                    );
                    return {
                        ...conv,
                        messageCount: msgs.length,
                        lastMessage: msgs[msgs.length - 1],
                        status: conv.status || 'active',
                    };
                })
            );

            // Filter out deleted conversations (those with title 'DELETED')
            const activeConversations = conversationsWithMessages.filter(
                (conv) => conv.title !== 'DELETED'
            );

            setConversations(activeConversations);

            // Fetch trip data for all active conversations
            const tripDataMap = {};
            await Promise.all(
                activeConversations.map(async (conv) => {
                    try {
                        const data = await fetchTripCardData({
                            chatId: conv.id,
                        });
                        tripDataMap[conv.id] = transformTripData(data);
                    } catch (error) {
                        console.log(
                            `No trip data for conversation ${conv.id}:`,
                            error
                        );
                        // Create basic trip card with chat metadata only
                        tripDataMap[conv.id] = createBasicTripData(conv);
                    }
                })
            );
            setTripData(tripDataMap);
            // If request asked to expand a specific id, scroll it into view
            const params = new URLSearchParams(location.search);
            const targetId = params.get('id');
            const shouldExpand = params.get('expand') === '1';
            if (targetId && shouldExpand) {
                // Small timeout to ensure nodes are in the DOM
                setTimeout(() => {
                    try {
                        const el = document.querySelector(
                            `[data-trip-id="${CSS.escape(targetId)}"]`
                        );
                        if (el) {
                            el.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                            });
                        }
                    } catch (e) {
                        // Fallback without CSS.escape for older browsers
                        const el = document.querySelector(
                            `[data-trip-id="${targetId}"]`
                        );
                        el?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        });
                    }
                }, 50);
                expandedIdRef.current = targetId;
            } else {
                expandedIdRef.current = null;
            }
        } catch (error) {
            setConversations([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Transform API response to TripCard expected format
    const transformTripData = (apiData) => {
        const { trip, flights, hotels } = apiData;

        // Parse date range string to startDate/endDate if possible
        const parseTravelDates = (dateString) => {
            if (!dateString) return { dateRange: '' };

            try {
                // Try to parse "YYYY-MM-DD – YYYY-MM-DD" format
                const parts = dateString.split(/\s*[–—-]\s*/);
                if (parts.length === 2) {
                    const startDate = parts[0].trim();
                    const endDate = parts[1].trim();
                    // Validate dates by creating Date objects
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                        return { startDate, endDate, dateRange: dateString };
                    }
                }
                // Fallback: return as dateRange only
                return { dateRange: dateString };
            } catch (error) {
                return { dateRange: dateString };
            }
        };

        return {
            trip: trip, // Include raw trip data for header access
            destinations: trip.destinations || [],
            travelDates: parseTravelDates(trip.dates),
            summary: trip.summary || '',
            flights: flights.map((flight) => ({
                id: flight.id,
                airline: flight.airline,
                flightNumber: flight.flight_number,
                route: flight.route,
                departure: flight.departure,
                arrival: flight.arrival,
                duration: flight.duration,
                price: flight.price,
                isBooked: flight.status === 'booked',
                status: flight.status,
            })),
            hotels: hotels.map((hotel) => ({
                id: hotel.id,
                hotelId: hotel.hotelId, // Add Amadeus hotelId for ratings API
                name: hotel.name,
                location: hotel.location,
                checkIn: hotel.check_in,
                checkOut: hotel.check_out,
                nights: parseInt(hotel.nights) || 0,
                price: hotel.overall_price,
                pricePerNight: hotel.price_per_night,
                isBooked: hotel.status === 'booked',
                status: hotel.status,
            })),
        };
    };

    // Create basic trip data using only chat metadata when no trip record exists
    const createBasicTripData = (conversation) => {
        return {
            destinations: [], // Empty - no destinations determined yet
            travelDates: { dateRange: '' }, // Empty - no dates determined yet
            summary: conversation.lastMessage?.content
                ? `Trip planning discussion started. ${conversation.lastMessage.content.substring(
                      0,
                      100
                  )}${
                      conversation.lastMessage.content.length > 100 ? '...' : ''
                  }`
                : 'Trip planning in progress...',
            flights: [], // Empty - no flights selected yet
            hotels: [], // Empty - no hotels selected yet
        };
    };

    const handleConversationClick = (conversation) => {
        navigate(`/chat?id=${conversation.id}`);
    };

    const handleNewChat = () => {
        navigate('/chat?new=true');
    };

    const handleArchiveConversation = async (conversationId) => {
        try {
            await loadConversations();
        } catch (error) {}
    };

    const handleDeleteConversation = async (conversationId) => {
        try {
            // Show confirmation dialog
            const confirmed = window.confirm(
                'Are you sure you want to delete this trip? This action cannot be undone.'
            );

            if (!confirmed) {
                return;
            }

            // Call the delete chat lambda
            const result = await deleteChat({ chatId: conversationId });

            if (result.success) {
                console.log('Chat deleted successfully:', result);
                // Reload conversations to reflect the deletion
                await loadConversations();
                // Trigger sidebar refresh
                window.dispatchEvent(
                    new CustomEvent('tt:conversations-updated')
                );
            } else {
                console.error('Failed to delete chat:', result);
                alert('Failed to delete trip. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            alert('Error deleting trip. Please try again.');
        }
    };

    if (!localStorage.getItem('userDetails')) {
        navigate('/');
        return null;
    }

    return (
        <div className="flex-1 min-h-0 w-full flex flex-col bg-gradient-to-b from-slate-50 to-blue-50 relative overflow-y-auto overflow-x-hidden">
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                <div className="text-center space-y-3">
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                        Trip Summary
                    </h1>
                    <p className="text-slate-600">
                        Manage and book your planned trips
                    </p>
                    <div className="pt-2">
                        <Button
                            onClick={handleNewChat}
                            className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-6"
                        >
                            <MessageSquare className="w-4 h-4 mr-2" /> Plan New
                            Trip
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto">
                            <MessageSquare className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">
                                No trips planned yet
                            </h3>
                            <p className="text-slate-500">
                                Start your first conversation to begin planning
                                your adventure!
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {conversations.map((conversation, index) => (
                            <TripCard
                                key={conversation.id}
                                conversation={{
                                    ...conversation,
                                    tripData:
                                        tripData[conversation.id] ||
                                        createBasicTripData(conversation),
                                }}
                                index={index}
                                onArchive={(id) =>
                                    handleArchiveConversation(id)
                                }
                                onDelete={(id) => handleDeleteConversation(id)}
                                onNavigateToChat={() =>
                                    handleConversationClick(conversation)
                                }
                                data-trip-id={conversation.id}
                                defaultExpanded={
                                    expandedIdRef.current ===
                                    String(conversation.id)
                                }
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
