import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import {
    MessageSquare,
    MapPin,
    Calendar,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Trash2,
    ShoppingCart,
    Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import FlightTable from './FlightTable.jsx';
import HotelTable from './HotelTable.jsx';
import {
    formatCurrency,
    convertToUserCurrency,
    getUserPreferredCurrency,
} from '../../utils/currencyConverter.js';
import {
    getFlightOffersPricing,
    getHotelOffersPricing,
    getHotelRatings,
    removeFlight,
    removeHotel,
} from '../../../api/chatApi.js';
import ErrorModal from '../ui/error-modal.jsx';
import {
    getAirlineName,
    getAirportName,
    getCityName,
    getHotelChainName,
} from '../../utils/travelHelpers.js';

export default function TripCard({
    conversation,
    index,
    onArchive,
    onDelete,
    onNavigateToChat,
    defaultExpanded = false,
    ...rest
}) {
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [selectedFlights, setSelectedFlights] = useState([]);
    const [selectedHotels, setSelectedHotels] = useState([]);
    const [currentFlights, setCurrentFlights] = useState(
        conversation.tripData?.flights || []
    );
    const [currentHotels, setCurrentHotels] = useState(
        conversation.tripData?.hotels || []
    );
    const [errorModal, setErrorModal] = useState({ isOpen: false });
    const [isLoadingPricing, setIsLoadingPricing] = useState(false);

    useEffect(() => {
        setCurrentFlights(conversation.tripData?.flights || []);
        setCurrentHotels(conversation.tripData?.hotels || []);
        setSelectedFlights([]);
        setSelectedHotels([]);
    }, [conversation.tripData]);

    const handleRemoveFlight = async (flightId) => {
        try {
            // Call the remove flight lambda
            await removeFlight({
                tripTailorFlightId: flightId,
                chatId: conversation.id,
            });

            // Update local state immediately for better UX
            setCurrentFlights((prev) => prev.filter((f) => f.id !== flightId));
            setSelectedFlights((prev) => prev.filter((f) => f.id !== flightId));

            console.log(
                `Flight ${flightId} removed successfully from trip ${conversation.id}`
            );
        } catch (error) {
            console.error('Error removing flight:', error);
            // Optionally show error to user, but for now just log it
        }
    };

    const handleRemoveHotel = async (hotelId) => {
        try {
            // Call the remove hotel lambda
            await removeHotel({
                tripTailorHotelId: hotelId,
                chatId: conversation.id,
            });

            // Update local state immediately for better UX
            setCurrentHotels((prev) => prev.filter((h) => h.id !== hotelId));
            setSelectedHotels((prev) => prev.filter((h) => h.id !== hotelId));

            console.log(
                `Hotel ${hotelId} removed successfully from trip ${conversation.id}`
            );
        } catch (error) {
            console.error('Error removing hotel:', error);
            // Optionally show error to user, but for now just log it
        }
    };

    const getSummary = (conversation) => {
        // Use trip summary if available, otherwise fall back to last message
        if (conversation.tripData?.summary) {
            return conversation.tripData.summary;
        }
        if (conversation.lastMessage) {
            return conversation.lastMessage.content.length > 100
                ? conversation.lastMessage.content.substring(0, 100) + '...'
                : conversation.lastMessage.content;
        }
        return 'Trip planning in progress...';
    };

    const getLastModified = (conversation) => {
        // Use trip's last modified date if available, otherwise fall back to conversation date
        const tripLastModified = conversation.tripData?.trip?.last_modified;
        if (tripLastModified) {
            try {
                const date = new Date(tripLastModified);
                if (!isNaN(date.getTime())) {
                    return format(date, 'MMM d');
                }
            } catch (error) {
                // Fall through to conversation date
            }
        }

        // Fallback to conversation updated_date
        try {
            const date = new Date(conversation.updated_date);
            if (isNaN(date.getTime())) {
                return 'Recent';
            }
            return format(date, 'MMM d');
        } catch (error) {
            return 'Recent';
        }
    };

    const handleBook = async () => {
        const totalFlights = selectedFlights.length;
        const totalHotels = selectedHotels.length;
        if (totalFlights === 0 && totalHotels === 0) {
            alert('Please select flights or hotels to book.');
            return;
        }

        try {
            setIsLoadingPricing(true);
            // Get flight pricing if flights are selected
            let flightPricing = [];
            if (totalFlights > 0) {
                const flightIds = selectedFlights.map((flight, index) => {
                    if (!flight.id) {
                        console.error(
                            `Flight ${index} missing ID field:`,
                            flight
                        );
                        throw new Error(
                            `Flight object at index ${index} missing ID field: ${JSON.stringify(
                                flight
                            )}`
                        );
                    }

                    return flight.id;
                });

                const includeOptions = [
                    'credit-card-fees',
                    'bags',
                    'other-services',
                    'detailed-fare-rules',
                ];

                flightPricing = await getFlightOffersPricing(
                    flightIds,
                    includeOptions
                );
            }

            // Get hotel pricing and ratings if hotels are selected
            let hotelPricing = [];
            let hotelRatings = {};
            if (totalHotels > 0) {
                const hotelIds = selectedHotels.map((hotel, index) => {
                    if (!hotel.id) {
                        console.error(
                            `Hotel ${index} missing ID field:`,
                            hotel
                        );
                        throw new Error(
                            `Hotel object at index ${index} missing ID field: ${JSON.stringify(
                                hotel
                            )}`
                        );
                    }

                    return hotel.id;
                });

                // Prepare hotels array for ratings API (needs both hotel_id and hotelId)
                const hotelsForRatings = selectedHotels
                    .map((hotel) => ({
                        hotel_id: hotel.id,
                        hotelId: hotel.hotelId || '', // hotelId from Amadeus (added in fetch_trip_card_data)
                    }))
                    .filter((hotel) => hotel.hotelId); // Only include hotels with hotelId

                console.log('🏨 TripCard: Selected hotels:', selectedHotels);
                console.log(
                    '🏨 TripCard: Hotels for ratings:',
                    hotelsForRatings
                );
                console.log(
                    '🏨 TripCard: Will call ratings API:',
                    hotelsForRatings.length > 0
                );

                // Fetch hotel pricing and ratings in parallel
                console.log('🏨 TripCard: Starting parallel API calls...');
                const [hotelPricingResult, hotelRatingsResult] =
                    await Promise.all([
                        getHotelOffersPricing(hotelIds),
                        hotelsForRatings.length > 0
                            ? getHotelRatings(hotelsForRatings)
                            : Promise.resolve({}),
                    ]);

                console.log('🏨 TripCard: Parallel API calls completed');
                console.log(
                    '🏨 TripCard: Hotel ratings result:',
                    hotelRatingsResult
                );

                hotelPricing = hotelPricingResult;
                hotelRatings = hotelRatingsResult;

                // Check for hotel pricing errors and show error modal
                if (hotelPricing && Array.isArray(hotelPricing)) {
                    const failedHotels = hotelPricing.filter(
                        (hotel) => hotel.success === false && hotel.error
                    );
                    if (failedHotels.length > 0) {
                        // Create user-friendly error message
                        let userMessage;
                        if (failedHotels.length === 1) {
                            userMessage = `We're having trouble getting the latest pricing for one of your selected hotels. This might be due to high demand or temporary unavailability.`;
                        } else {
                            userMessage = `We're having trouble getting the latest pricing for ${failedHotels.length} of your selected hotels. This might be due to high demand or temporary unavailability.`;
                        }

                        userMessage += `\n\nPlease try again in a moment, or consider selecting different hotels for your trip.`;

                        setIsLoadingPricing(false);
                        setErrorModal({
                            isOpen: true,
                            title: 'Unable to Get Hotel Pricing',
                            message: userMessage,
                            onClose: () => {
                                setErrorModal({
                                    isOpen: false,
                                    title: '',
                                    message: '',
                                    onClose: null,
                                });
                            },
                        });
                        return;
                    }
                }
            }

            // Navigate to checkout page with selected items and pricing data
            navigate('/checkout', {
                state: {
                    selectedFlights: selectedFlights,
                    selectedHotels: selectedHotels,
                    flightPricing: flightPricing,
                    hotelPricing: hotelPricing,
                    hotelRatings: hotelRatings || {},
                    chatId: conversation.id,
                },
            });
        } catch (error) {
            setIsLoadingPricing(false);
            console.error('Error getting pricing:', error);

            // Check if it's a 502 error from the Lambda
            const is502Error =
                error.response?.status === 502 ||
                error.response?.data?.error?.includes('502') ||
                error.message?.includes('502');

            // For 502 errors, show error modal on current page instead of navigating
            if (is502Error) {
                setErrorModal({
                    isOpen: true,
                    title: 'Pricing Error',
                    message:
                        'There was a problem getting pricing details. Please try again in a few moments.',
                    onClose: () => {
                        setErrorModal({ isOpen: false });
                    },
                });
                return; // Don't navigate to checkout
            }

            // For other errors, navigate to checkout with error information
            navigate('/checkout', {
                state: {
                    selectedFlights: selectedFlights,
                    selectedHotels: selectedHotels,
                    flightPricing: [],
                    hotelPricing: [],
                    chatId: conversation.id,
                },
            });
        }
    };

    const calculateTotalPrice = () => {
        const parsePriceAndCurrency = (priceString) => {
            if (!priceString || priceString === 'Price TBD')
                return { amount: 0, currency: 'USD' };
            // Parse price string like "444.94 USD"
            const match = priceString
                .toString()
                .match(/^([\d,]+\.?\d*)\s+([A-Z]{3})$/);
            if (match) {
                const amount = parseFloat(match[1].replace(/,/g, '')) || 0;
                const currency = match[2];
                return { amount, currency };
            }
            return { amount: 0, currency: 'USD' };
        };

        let totalInUserCurrency = 0;

        // Convert flight prices to user's preferred currency
        selectedFlights.forEach((flight) => {
            const { amount, currency } = parsePriceAndCurrency(flight.price);
            totalInUserCurrency += convertToUserCurrency(amount, currency);
        });

        // Convert hotel prices to user's preferred currency
        selectedHotels.forEach((hotel) => {
            const { amount, currency } = parsePriceAndCurrency(hotel.price);
            totalInUserCurrency += convertToUserCurrency(amount, currency);
        });

        if (totalInUserCurrency === 0) return '0';

        return formatCurrency(totalInUserCurrency, getUserPreferredCurrency());
    };

    // Helper functions to check for booked items
    const hasBookedFlights = () => {
        return currentFlights.some((flight) => flight.isBooked);
    };

    const hasBookedHotels = () => {
        return currentHotels.some((hotel) => hotel.isBooked);
    };

    const hasAnyBookedItems = () => {
        return hasBookedFlights() || hasBookedHotels();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden mx-2 sm:mx-0"
            {...rest}
        >
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-800 text-base sm:text-lg leading-tight">
                                {conversation.title}
                            </h3>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
                            {getSummary(conversation)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center pt-3 border-t border-slate-100 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {conversation.messageCount}
                        </span>
                        <span className="hidden xs:inline">•</span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {getLastModified(conversation)}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-slate-400 hover:text-slate-600 h-8 flex-1 justify-center"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onNavigateToChat}
                        className="text-xs sm:text-sm py-1.5 px-2 sm:px-3"
                        aria-label="View Chat"
                    >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-0 sm:mr-2" />
                        <span className="hidden sm:inline">View Chat</span>
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-slate-200 bg-slate-50/50"
                    >
                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-slate-700 text-sm sm:text-base">
                                        Travel Dates
                                    </h4>
                                    {conversation.tripData?.travelDates ? (
                                        <p className="text-slate-600 text-sm">
                                            {(() => {
                                                const {
                                                    startDate,
                                                    endDate,
                                                    dateRange,
                                                } =
                                                    conversation.tripData
                                                        .travelDates;

                                                // If we have valid start and end dates, format them
                                                if (startDate && endDate) {
                                                    try {
                                                        const start = new Date(
                                                            startDate
                                                        );
                                                        const end = new Date(
                                                            endDate
                                                        );
                                                        if (
                                                            !isNaN(
                                                                start.getTime()
                                                            ) &&
                                                            !isNaN(
                                                                end.getTime()
                                                            )
                                                        ) {
                                                            return `${format(
                                                                start,
                                                                'MMM d, yyyy'
                                                            )} - ${format(
                                                                end,
                                                                'MMM d, yyyy'
                                                            )}`;
                                                        }
                                                    } catch (error) {
                                                        // Fall through to dateRange
                                                    }
                                                }

                                                // Fallback to dateRange string or default
                                                return (
                                                    dateRange ||
                                                    'Dates not specified'
                                                );
                                            })()}
                                        </p>
                                    ) : (
                                        <p className="text-slate-400 italic text-sm">
                                            Dates not yet specified
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-slate-700 text-sm sm:text-base">
                                        Destinations
                                    </h4>
                                    {conversation.tripData?.destinations ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {conversation.tripData.destinations.map(
                                                (dest, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="outline"
                                                        className="text-xs px-2 py-1"
                                                    >
                                                        {dest}
                                                    </Badge>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 italic text-sm">
                                            Destinations not yet specified
                                        </p>
                                    )}
                                </div>
                            </div>

                            {currentFlights && currentFlights.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-700 text-sm sm:text-base">
                                        Flights
                                    </h4>
                                    {/* Keep tables within card width on mobile to prevent page cutoff */}
                                    <div className="overflow-x-auto">
                                        <div className="px-4 sm:px-0">
                                            <FlightTable
                                                flights={currentFlights}
                                                selectedFlights={
                                                    selectedFlights
                                                }
                                                onSelectionChange={
                                                    setSelectedFlights
                                                }
                                                onRemove={handleRemoveFlight}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentHotels && currentHotels.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-700 text-sm sm:text-base">
                                        Hotels
                                    </h4>
                                    <div className="overflow-x-auto">
                                        <div className="px-4 sm:px-0">
                                            <HotelTable
                                                hotels={currentHotels}
                                                selectedHotels={selectedHotels}
                                                onSelectionChange={
                                                    setSelectedHotels
                                                }
                                                onRemove={handleRemoveHotel}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-200 space-y-3">
                                {/* Desktop: Book and View Bookings on left, Delete on right */}
                                <div className="hidden sm:flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleBook}
                                            className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-6 py-2.5 text-sm font-medium"
                                            disabled={
                                                isLoadingPricing ||
                                                (selectedFlights.length === 0 &&
                                                    selectedHotels.length === 0)
                                            }
                                        >
                                            {isLoadingPricing ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                                    {`Book Selected (${calculateTotalPrice()})`}
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                // Collect TripTailor IDs for booked items
                                                const bookedFlightIds =
                                                    currentFlights
                                                        .filter(
                                                            (flight) =>
                                                                flight.isBooked
                                                        )
                                                        .map(
                                                            (flight) =>
                                                                flight.id
                                                        ); // This is the TripTailor flight ID

                                                const bookedHotelIds =
                                                    currentHotels
                                                        .filter(
                                                            (hotel) =>
                                                                hotel.isBooked
                                                        )
                                                        .map(
                                                            (hotel) => hotel.id
                                                        ); // This is the TripTailor hotel ID

                                                console.log(
                                                    'View bookings clicked - Flight IDs:',
                                                    bookedFlightIds
                                                );
                                                console.log(
                                                    'View bookings clicked - Hotel IDs:',
                                                    bookedHotelIds
                                                );

                                                // Navigate to BookingSummary page with the IDs
                                                navigate('/booking-summary', {
                                                    state: {
                                                        tripTailorFlightIds:
                                                            bookedFlightIds,
                                                        tripTailorHotelIds:
                                                            bookedHotelIds,
                                                        tripTitle:
                                                            conversation.title,
                                                        chatId: conversation.id,
                                                    },
                                                });
                                            }}
                                            disabled={!hasAnyBookedItems()}
                                            className="text-xs sm:text-sm py-2 px-3"
                                        >
                                            <BookOpen className="w-4 h-4 mr-2" />
                                            View Bookings
                                        </Button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            onDelete(conversation.id)
                                        }
                                        disabled={hasAnyBookedItems()}
                                        className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 text-xs sm:text-sm py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Trip
                                    </Button>
                                </div>
                                {/* Mobile: keep Book button above bottom actions */}
                                <div className="flex sm:hidden justify-center">
                                    <Button
                                        onClick={handleBook}
                                        className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white w-full px-6 py-2.5 text-sm font-medium"
                                        disabled={
                                            isLoadingPricing ||
                                            (selectedFlights.length === 0 &&
                                                selectedHotels.length === 0)
                                        }
                                    >
                                        {isLoadingPricing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-4 h-4 mr-2" />
                                                {`Book Selected (${calculateTotalPrice()})`}
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {/* Mobile-only secondary actions: View Bookings and Delete */}
                                <div className="grid grid-cols-2 gap-2 sm:hidden">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            // Collect TripTailor IDs for booked items
                                            const bookedFlightIds =
                                                currentFlights
                                                    .filter(
                                                        (flight) =>
                                                            flight.isBooked
                                                    )
                                                    .map((flight) => flight.id); // This is the TripTailor flight ID

                                            const bookedHotelIds = currentHotels
                                                .filter(
                                                    (hotel) => hotel.isBooked
                                                )
                                                .map((hotel) => hotel.id); // This is the TripTailor hotel ID

                                            console.log(
                                                'View bookings clicked - Flight IDs:',
                                                bookedFlightIds
                                            );
                                            console.log(
                                                'View bookings clicked - Hotel IDs:',
                                                bookedHotelIds
                                            );

                                            // Navigate to BookingSummary page with the IDs
                                            navigate('/booking-summary', {
                                                state: {
                                                    tripTailorFlightIds:
                                                        bookedFlightIds,
                                                    tripTailorHotelIds:
                                                        bookedHotelIds,
                                                    tripTitle:
                                                        conversation.title,
                                                    chatId: conversation.id,
                                                },
                                            });
                                        }}
                                        disabled={!hasAnyBookedItems()}
                                        className="text-xs py-2 px-3"
                                    >
                                        <BookOpen className="w-3 h-3 mr-1" />
                                        View Bookings
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            onDelete(conversation.id)
                                        }
                                        disabled={hasAnyBookedItems()}
                                        className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 text-xs py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Delete Trip
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ErrorModal
                isOpen={errorModal.isOpen}
                title={errorModal.title}
                message={errorModal.message}
                onClose={errorModal.onClose}
            />
        </motion.div>
    );
}
