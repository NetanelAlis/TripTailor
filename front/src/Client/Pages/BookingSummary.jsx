import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../Components/ui/button.jsx';
import BookingSummaryComponent from '../Components/checkout/BookingSummary.jsx';
import ErrorModal from '../Components/ui/error-modal.jsx';
import { fetchBookingData } from '../../api/chatApi.js';
import { convertToUserCurrency } from '../utils/currencyConverter.js';

export default function BookingSummaryPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [bookingData, setBookingData] = useState(null);
    const [errorModal, setErrorModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onRetry: null,
    });

    // Extract parameters from navigation state or URL params
    const {
        tripTailorFlightIds = [],
        tripTailorHotelIds = [],
        tripTitle = 'Booking Summary',
        chatId = null,
    } = location.state || {};

    // Mock fetch function - replace with actual API call when ready
    const mockFetchBookingData = async (flightIds, hotelIds) => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock response structure matching fetch_booking_data.py
        return {
            flights: {
                flight_id_1: {
                    tripTailorFlightId: 'flight_id_1',
                    flightDetails: {
                        id: 'flight_id_1',
                        itineraries: [
                            {
                                segments: [
                                    {
                                        departure: {
                                            iataCode: 'JFK',
                                            at: '2024-12-01T10:00:00',
                                        },
                                        arrival: {
                                            iataCode: 'LAX',
                                            at: '2024-12-01T13:30:00',
                                        },
                                        carrierCode: 'AA',
                                        number: '123',
                                    },
                                ],
                            },
                        ],
                        price: { total: '299.99', currency: 'USD' },
                    },
                    status: 'booked',
                    timestamp: Date.now(),
                    bookingTimestamp: Date.now(),
                },
            },
            hotels: {
                hotel_id_1: {
                    tripTailorHotelId: 'hotel_id_1',
                    hotelOffersDetails: {
                        booked: true,
                        hotelPricingData: {
                            data: {
                                hotel: {
                                    hotelId: 'HOTEL123',
                                    name: 'Grand Hotel',
                                    address: {
                                        cityName: 'Los Angeles',
                                        countryCode: 'US',
                                    },
                                },
                                offers: [
                                    {
                                        id: 'offer_123',
                                        checkInDate: '2024-12-01',
                                        checkOutDate: '2024-12-03',
                                        price: {
                                            total: '199.99',
                                            currency: 'USD',
                                        },
                                        room: { type: 'DELUXE' },
                                    },
                                ],
                            },
                        },
                    },
                    status: 'booked',
                    timestamp: Date.now(),
                    isBooked: true,
                },
            },
            summary: {
                totalFlights: flightIds.length,
                totalHotels: hotelIds.length,
                flightsFound: 1,
                hotelsFound: 1,
            },
        };
    };

    // Transform booking data response into format expected by BookingSummary component
    const transformBookingData = (response) => {
        const enhancedFlights = [];
        const enhancedHotels = [];

        // Transform flights
        Object.entries(response.flights || {}).forEach(
            ([flightId, flightData]) => {
                if (!flightData) return;

                const flightDetails = flightData.flightDetails;
                const basePrice = flightDetails.price;

                enhancedFlights.push({
                    id: flightId,
                    ...flightDetails,
                    // Add mock enhanced data similar to checkout page
                    class: 'Economy',
                    baggage: { carryOn: '1x 7kg', checked: '1x 23kg' },
                    seat: '25A',
                    meal: 'Included',
                    wifi: 'Available ($10)',
                    aircraft: 'Boeing 737',
                    duration: '7h 30m',
                    stops: 0,
                    refundPolicy: 'Non-refundable',
                    changeFee: 'Not changeable',
                    basePrice,
                    currency: basePrice?.currency || 'USD',
                    pricingData: {
                        data: {
                            flightOffers: [flightDetails],
                        },
                    },
                    // Mark as booked
                    isBooked: true,
                    status: flightData.status,
                });
            }
        );

        // Transform hotels
        Object.entries(response.hotels || {}).forEach(
            ([hotelId, hotelData]) => {
                if (!hotelData) return;

                const hotelOffersDetails = hotelData.hotelOffersDetails;
                const isBooked = hotelData.isBooked;

                let hotelInfo, offers;

                if (isBooked && hotelOffersDetails.hotelPricingData) {
                    // Booked hotel - extract from hotelPricingData
                    const pricingData =
                        hotelOffersDetails.hotelPricingData.data;
                    hotelInfo = pricingData.hotel;
                    offers = pricingData.offers;
                } else {
                    // Regular hotel - extract from hotelOffersDetails
                    hotelInfo = hotelOffersDetails.hotel;
                    offers = hotelOffersDetails.offers;
                }

                const offerData = offers?.[0];
                const priceData = offerData?.price;

                enhancedHotels.push({
                    id: hotelId,
                    name: hotelInfo?.name || 'Hotel Name',
                    location: `${hotelInfo?.address?.cityName || ''}, ${
                        hotelInfo?.address?.countryCode || ''
                    }`.trim(),
                    hotelId: hotelInfo?.hotelId,
                    offers: offers,

                    // Enhanced data similar to checkout page
                    checkIn: offerData?.checkInDate,
                    checkOut: offerData?.checkOutDate,
                    nights: offerData
                        ? Math.ceil(
                              (new Date(offerData.checkOutDate) -
                                  new Date(offerData.checkInDate)) /
                                  (1000 * 60 * 60 * 24)
                          )
                        : 0,
                    price: priceData?.total
                        ? `${priceData.total} ${priceData.currency}`
                        : 'Price unavailable',
                    currency: priceData?.currency || 'USD',

                    // Mock enhanced data
                    roomType: offerData?.room?.type || 'Standard Room',
                    bedType: 'Queen Bed',
                    amenities: ['WiFi', 'Breakfast', 'Pool'],
                    cancellation: 'Free cancellation',

                    pricingData: {
                        data: {
                            offers: offers,
                        },
                    },

                    // Mark as booked
                    isBooked: true,
                    status: hotelData.status,
                });
            }
        );

        return { enhancedFlights, enhancedHotels };
    };

    // Calculate total price from enhanced data with proper currency conversion
    const totalPrice = useMemo(() => {
        if (!bookingData) return 0;

        const { enhancedFlights, enhancedHotels } = bookingData;

        return [...enhancedFlights, ...enhancedHotels].reduce((sum, item) => {
            if (item.pricingData?.data?.flightOffers?.[0]?.price) {
                // Flight pricing with currency conversion
                const flightPrice = item.pricingData.data.flightOffers[0].price;
                return (
                    sum +
                    convertToUserCurrency(
                        parseFloat(flightPrice.total || 0),
                        flightPrice.currency || 'USD'
                    )
                );
            } else if (item.pricingData?.data?.offers?.[0]?.price) {
                // Hotel pricing with currency conversion
                const hotelPrice = item.pricingData.data.offers[0].price;
                return (
                    sum +
                    convertToUserCurrency(
                        parseFloat(hotelPrice.total || 0),
                        hotelPrice.currency || 'USD'
                    )
                );
            } else if (item.price && item.price !== 'TBD') {
                // Fallback to item.price string parsing with currency conversion
                const priceMatch = item.price.match(/([\d.]+)\s*([A-Z]{3})?/);
                if (priceMatch) {
                    const amount = parseFloat(priceMatch[1]);
                    const currency = priceMatch[2] || item.currency || 'USD';
                    return sum + convertToUserCurrency(amount, currency);
                }
            }
            return sum;
        }, 0);
    }, [bookingData]);

    // Fetch booking data on component mount
    useEffect(() => {
        const fetchData = async () => {
            if (!tripTailorFlightIds.length && !tripTailorHotelIds.length) {
                setErrorModal({
                    isOpen: true,
                    title: 'No Booking Data',
                    message:
                        'No flight or hotel IDs provided for booking summary.',
                    onRetry: () => navigate(-1),
                });
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);

                // Use real API call
                const response = await fetchBookingData({
                    tripTailorFlightIds,
                    tripTailorHotelIds,
                });

                // Fallback to mock data for development if API fails
                // const response = await mockFetchBookingData(
                //     tripTailorFlightIds,
                //     tripTailorHotelIds
                // );

                const transformedData = transformBookingData(response);
                setBookingData(transformedData);
            } catch (error) {
                console.error('Error fetching booking data:', error);
                setErrorModal({
                    isOpen: true,
                    title: 'Failed to Load Booking Data',
                    message:
                        'Unable to retrieve booking information. Please try again.',
                    onRetry: fetchData,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [tripTailorFlightIds, tripTailorHotelIds, navigate]);

    // Loading state
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4"
                >
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                    <p className="text-slate-600">Loading booking details...</p>
                </motion.div>
            </div>
        );
    }

    // No booking data state
    if (
        !bookingData ||
        (!bookingData.enhancedFlights.length &&
            !bookingData.enhancedHotels.length)
    ) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4"
                >
                    <p className="text-slate-600">
                        No booking information found for the provided items.
                    </p>
                    <Button
                        onClick={() => navigate(-1)}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-blue-50 relative">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4"
                >
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white/80"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                            {tripTitle}
                        </h1>
                        <p className="text-slate-600 text-sm sm:text-base">
                            Review your confirmed bookings and travel details
                        </p>
                    </div>
                </motion.div>

                {/* Booking Summary Component */}
                <BookingSummaryComponent
                    enhancedFlights={bookingData.enhancedFlights}
                    enhancedHotels={bookingData.enhancedHotels}
                    totalPrice={totalPrice}
                />

                {/* Additional Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center pb-8"
                >
                    {chatId && (
                        <Button
                            onClick={() => navigate(`/chat?id=${chatId}`)}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            View Trip Chat
                        </Button>
                    )}
                    <Button
                        onClick={() =>
                            navigate(`/chat/history?id=${chatId}&expand=1`)
                        }
                        className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white"
                    >
                        Back to Trips
                    </Button>
                </motion.div>
            </div>

            {/* Error Modal */}
            <ErrorModal
                isOpen={errorModal.isOpen}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() =>
                    setErrorModal((prev) => ({ ...prev, isOpen: false }))
                }
                onRetry={errorModal.onRetry}
            />
        </div>
    );
}
