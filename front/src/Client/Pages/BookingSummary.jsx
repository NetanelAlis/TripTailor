import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../Components/ui/button.jsx';
import BookingSummaryComponent from '../Components/checkout/BookingSummary.jsx';
import ErrorModal from '../Components/ui/error-modal.jsx';
import { fetchBookingData } from '../../api/chatApi.js';
import { convertToUserCurrencyAmount } from '../utils/currencyConverter.js';

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

    // Transform booking data response into format expected by BookingSummary component
    const transformBookingData = (response) => {
        const enhancedFlights = [];
        const enhancedHotels = [];

        // ===== SHARED EXTRACTION FUNCTIONS =====
        // These functions are used by both main and fallback logic to avoid duplication

        const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

        const extractRoomType = (offer) => {
            const est = offer?.room?.typeEstimated?.category;
            if (est) {
                const formatted = est
                    .replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                return {
                    value: formatted,
                    confidence: 'high',
                    source: 'typeEstimated.category',
                };
            }

            const desc = (offer?.room?.description?.text || '').toLowerCase();
            const parts = desc
                .split(/[-/;|,\n]/)
                .map((part) => part.trim())
                .filter((part) => part.length > 0);

            for (const part of parts) {
                const hit =
                    /(junior suite|suite|deluxe|superior|executive|standard|studio|apartment|family|classic|premium|economy|budget)/i.exec(
                        part
                    );
                if (hit) {
                    return {
                        value: title(hit[1]),
                        confidence: 'med',
                        source: 'description.text',
                    };
                }
            }

            const code = offer?.room?.type;
            return code
                ? {
                      value: code,
                      confidence: 'low',
                      source: 'room.type',
                  }
                : { confidence: 'low' };
        };

        const extractBed = (offer) => {
            const t = offer?.room?.typeEstimated;
            if (t?.bedType) {
                return {
                    beds: t?.beds,
                    bedType: t.bedType,
                    confidence: 'high',
                    source: 'typeEstimated',
                };
            }

            const desc = (offer?.room?.description?.text || '').toLowerCase();
            const parts = desc
                .split(/[-/;|,\n]/)
                .map((part) => part.trim())
                .filter((part) => part.length > 0);

            for (const part of parts) {
                const long =
                    /\b(king|queen|twin|double|single|sofa bed|bunk)\b/i.exec(
                        part
                    );
                if (long) {
                    return {
                        bedType: title(long[1]),
                        confidence: 'med',
                        source: 'description.text',
                    };
                }
            }

            return { confidence: 'low' };
        };

        const extractAmenities = (offer) => {
            const desc = (offer?.room?.description?.text || '').toLowerCase();
            const parts = desc
                .split(/[-/;|,\n]/)
                .map((part) => part.trim())
                .filter((part) => part.length > 0);

            const keys = [
                'wifi',
                'breakfast',
                'parking',
                'pool',
                'spa',
                'gym',
                'air conditioning',
                'balcony',
                'kitchenette',
                'accessible',
                'mini fridge',
                'living/sitting area',
                'safe',
                'tv',
                'telephone',
                'hairdryer',
                'wireless internet',
                'internet',
                'swimming pool',
                'fitness center',
                'restaurant',
                'pets allowed',
                'airport shuttle',
                'business center',
                'disabled facilities',
                'meeting rooms',
                'tennis',
                'golf',
                'kitchen',
                'beach',
                'casino',
                'jacuzzi',
                'sauna',
                'massage',
            ];

            const found = [];
            for (const part of parts) {
                for (const key of keys) {
                    if (part.includes(key) && !found.includes(key)) {
                        found.push(key);
                    }
                }
            }

            return found.map(title);
        };

        const parseDescription = (descriptionText) => {
            if (!descriptionText)
                return {
                    roomSize: '',
                    wifi: false,
                    roomType: '',
                    bedType: '',
                    amenities: [],
                    boardType: '',
                };

            const text = descriptionText.toLowerCase();
            const info = {
                roomSize: '',
                wifi: false,
                roomType: '',
                bedType: '',
                amenities: [],
                boardType: '',
            };

            try {
                const parts = text
                    .split(/[-/;|,\n]/)
                    .map((part) => part.trim())
                    .filter((part) => part.length > 0);

                const sizeMatch = descriptionText.match(
                    /(\d+)\s*sqm\/(\d+)\s*sqft/i
                );
                if (sizeMatch) {
                    info.roomSize = `${sizeMatch[1]}sqm / ${sizeMatch[2]}sqft`;
                }

                info.wifi = parts.some(
                    (part) =>
                        part.includes('wifi') ||
                        part.includes('wireless') ||
                        part.includes('internet')
                );

                const amenityKeywords = [
                    'wifi',
                    'breakfast',
                    'parking',
                    'pool',
                    'spa',
                    'gym',
                    'air conditioning',
                    'balcony',
                    'kitchenette',
                    'accessible',
                    'mini fridge',
                    'safe',
                    'tv',
                    'telephone',
                    'hairdryer',
                ];

                info.amenities = amenityKeywords
                    .filter((keyword) =>
                        parts.some((part) => part.includes(keyword))
                    )
                    .map(title);
            } catch (error) {
                console.warn('Error parsing description:', error);
            }

            return info;
        };

        const extractPolicyInfo = (policies) => {
            if (!policies)
                return {
                    cancellationPolicy: 'TBD',
                    freeCancellation: false,
                    paymentType: 'TBD',
                    checkInTime: null,
                    checkOutTime: null,
                    depositInfo: null,
                };

            return {
                cancellationPolicy:
                    policies?.cancellation?.description?.text ||
                    policies?.cancellations?.[0]?.description?.text ||
                    (policies?.refundable?.cancellationRefund === 'REFUNDABLE'
                        ? 'Free cancellation'
                        : null) ||
                    (policies?.refundable?.cancellationRefund ===
                    'NON_REFUNDABLE'
                        ? 'Non-refundable'
                        : null) ||
                    'TBD',

                freeCancellation:
                    policies?.cancellation?.type !== 'FULL_STAY' ||
                    policies?.refundable?.cancellationRefund !==
                        'NON_REFUNDABLE',

                paymentType: policies?.paymentType || 'TBD',
                checkInTime:
                    policies?.checkIn?.from || policies?.checkInOut?.checkIn,
                checkOutTime:
                    policies?.checkOut?.until || policies?.checkInOut?.checkOut,
                depositInfo: policies?.deposit,
                cancellationDeadline: policies?.cancellation?.deadline,
                holdTime: policies?.holdTime?.deadline,
            };
        };

        const extractRatingInfo = (hotelData, hotelId) => {
            const ratingData =
                hotelData?.ratingData || hotelData?.rating || null;

            if (ratingData?.rating_data?.unavailable) {
                return {
                    rating: null,
                    stars: null,
                    guestRating: null,
                    ratingUnavailable: true,
                    ratingData: ratingData,
                };
            }

            const overallRating =
                ratingData?.rating_data?.overallRating ||
                ratingData?.overallRating ||
                null;

            return {
                rating: overallRating,
                stars: overallRating ? Math.round(overallRating) : null,
                guestRating: overallRating,
                ratingUnavailable: !overallRating,
                ratingData: ratingData,
            };
        };

        // ===== END SHARED EXTRACTION FUNCTIONS =====

        // Transform flights
        Object.entries(response.flights || {}).forEach(
            ([flightId, flightData]) => {
                if (!flightData) return;

                const flightDetails = flightData.flightDetails;
                const basePrice = flightDetails?.price;

                enhancedFlights.push({
                    id: flightData.tripTailorFlightId || flightId,
                    flightDetails: flightDetails,
                    airline:
                        flightDetails?.itineraries?.[0]?.segments?.[0]
                            ?.carrierCode || 'Unknown',
                    flightNumber:
                        flightDetails?.itineraries?.[0]?.segments?.[0]
                            ?.number || 'N/A',
                    departure: {
                        airport:
                            flightDetails?.itineraries?.[0]?.segments?.[0]
                                ?.departure?.iataCode || 'Unknown',
                        time:
                            flightDetails?.itineraries?.[0]?.segments?.[0]
                                ?.departure?.at || 'Unknown',
                    },
                    arrival: {
                        airport:
                            flightDetails?.itineraries?.[0]?.segments?.[
                                flightDetails.itineraries[0].segments.length - 1
                            ]?.arrival?.iataCode || 'Unknown',
                        time:
                            flightDetails?.itineraries?.[0]?.segments?.[
                                flightDetails.itineraries[0].segments.length - 1
                            ]?.arrival?.at || 'Unknown',
                    },
                    duration:
                        flightDetails?.itineraries?.[0]?.duration || 'Unknown',
                    cabin:
                        flightDetails?.travelerPricings?.[0]
                            ?.fareDetailsBySegment?.[0]?.cabin || 'ECONOMY',
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

        // Transform hotels - handle the actual fetch_booking_data response structure
        if (response.data && Array.isArray(response.data)) {
            console.log('=== BOOKING DATA RESPONSE DEBUG ===');
            console.log('Full response:', response);
            console.log('Response data array:', response.data);
            console.log('Number of hotels:', response.data.length);

            // Handle the actual response structure: { success: true, data: [...] }
            response.data.forEach((hotelResult, index) => {
                console.log(`Processing hotel ${index}:`, hotelResult);
                console.log('Hotel result checks:', {
                    hasHotelResult: !!hotelResult,
                    hasSuccess: !!hotelResult?.success,
                    hasHotelOfferPrice: !!hotelResult?.hotel_offer_price,
                });

                if (
                    !hotelResult ||
                    !hotelResult.success ||
                    !hotelResult.hotel_offer_price
                ) {
                    console.log(
                        `Skipping hotel ${index} - failed validation checks`
                    );
                    return;
                }

                console.log(
                    `Hotel ${index} passed validation - proceeding with extraction`
                );

                const hotelData = hotelResult.hotel_offer_price.data;
                const hotelInfo = hotelData.hotel;
                const offers = hotelData.offers;
                const offerData = offers?.[0];
                const priceData = offerData?.price;
                const roomData = offerData?.room;
                const policiesData = offerData?.policies;

                console.log(`Hotel ${index} - Raw data:`, {
                    hotelInfo,
                    offerData,
                    roomData,
                    roomTypeEstimated: roomData?.typeEstimated,
                });

                // Use shared extraction functions
                const roomTypeExtraction = extractRoomType(offerData);
                const bedExtraction = extractBed(offerData);
                const amenitiesExtraction = extractAmenities(offerData);
                const parsedDescription = parseDescription(
                    offerData?.description?.text
                );

                // Extract amenities from hotel data
                const hotelAmenities = hotelInfo?.amenities || [];

                // Apply shared extraction functions
                const policyInfo = extractPolicyInfo(policiesData);
                const ratingInfo = extractRatingInfo(
                    hotelData,
                    hotelResult.hotel_id
                );

                const enhancedHotel = {
                    id: hotelResult.hotel_id,
                    name: hotelInfo?.name || 'Hotel Name',
                    location: `${hotelInfo?.cityCode || ''}, ${
                        hotelInfo?.address?.countryCode || ''
                    }`.trim(),
                    hotelId: hotelInfo?.hotelId,
                    chainCode: hotelInfo?.chainCode,
                    cityCode: hotelInfo?.cityCode,
                    countryCode: hotelInfo?.address?.countryCode,

                    // Map to the structure expected by HotelSummary component
                    hotel: {
                        name: hotelInfo?.name,
                        chainCode: hotelInfo?.chainCode,
                        cityCode: hotelInfo?.cityCode,
                        address: {
                            countryCode: hotelInfo?.address?.countryCode,
                        },
                        amenities: hotelAmenities,
                    },

                    offers: offers,

                    // Enhanced data from actual response
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

                    // Room and bed information using sophisticated extraction
                    roomType:
                        roomTypeExtraction.value ||
                        parsedDescription.roomType ||
                        'TBD',
                    bedType:
                        bedExtraction.bedType ||
                        parsedDescription.bedType ||
                        'TBD',
                    beds: bedExtraction.beds,
                    roomSize: parsedDescription.roomSize || '',
                    numGuests: offerData?.guests?.adults || 2,
                    roomQuantity: offerData?.roomQuantity || 1,

                    // Enhanced extraction metadata for debugging
                    roomTypeConfidence: roomTypeExtraction.confidence,
                    roomTypeSource: roomTypeExtraction.source,
                    bedConfidence: bedExtraction.confidence,
                    bedSource: bedExtraction.source,

                    // Combine all amenities sources
                    roomAmenities: [
                        ...amenitiesExtraction,
                        ...(parsedDescription.amenities || []),
                        ...hotelAmenities.map((amenity) => {
                            // Convert hotel amenity codes to readable text
                            if (amenity === 'CRIBS_AVAILABLE')
                                return 'Cribs Available';
                            if (amenity === 'WIFI_FREE') return 'Free WiFi';
                            if (amenity === 'PARKING_FREE')
                                return 'Free Parking';
                            if (amenity === 'BREAKFAST_INCLUDED')
                                return 'Breakfast Included';
                            if (amenity === 'POOL') return 'Swimming Pool';
                            if (amenity === 'GYM') return 'Fitness Center';
                            if (amenity === 'SPA') return 'Spa Services';
                            if (amenity === 'RESTAURANT') return 'Restaurant';
                            if (amenity === 'BAR') return 'Bar/Lounge';
                            if (amenity === 'ROOM_SERVICE')
                                return 'Room Service';
                            if (amenity === 'BUSINESS_CENTER')
                                return 'Business Center';
                            if (amenity === 'MEETING_ROOMS')
                                return 'Meeting Rooms';
                            if (amenity === 'LAUNDRY') return 'Laundry Service';
                            if (amenity === 'CONCIERGE') return 'Concierge';
                            if (amenity === 'PET_FRIENDLY')
                                return 'Pet Friendly';
                            if (amenity === 'AIRPORT_SHUTTLE')
                                return 'Airport Shuttle';

                            // Default conversion
                            return amenity
                                .replace(/_/g, ' ')
                                .toLowerCase()
                                .replace(/\b\w/g, (l) => l.toUpperCase());
                        }),
                    ],

                    // Set amenity flags based on all sources
                    wifi:
                        parsedDescription.wifi ||
                        hotelAmenities.some(
                            (a) =>
                                a.toLowerCase().includes('wifi') ||
                                a.toLowerCase().includes('internet')
                        ),
                    breakfast:
                        offerData?.description?.text
                            ?.toLowerCase()
                            .includes('breakfast') ||
                        hotelAmenities.some((a) =>
                            a.toLowerCase().includes('breakfast')
                        ) ||
                        offerData?.boardType === 'BREAKFAST',
                    parking: hotelAmenities.some((a) =>
                        a.toLowerCase().includes('parking')
                    ),

                    // Board type from offer
                    boardType:
                        offerData?.boardType || parsedDescription.boardType,

                    // Enhanced policy information using sophisticated extraction
                    freeCancellation: policyInfo.freeCancellation,
                    cancellation: policyInfo.cancellationPolicy,
                    cancellationPolicy: policyInfo.cancellationPolicy,
                    paymentType: policyInfo.paymentType,
                    checkInTime: policyInfo.checkInTime,
                    checkOutTime: policyInfo.checkOutTime,
                    depositInfo: policyInfo.depositInfo,
                    cancellationDeadline: policyInfo.cancellationDeadline,
                    holdTime: policyInfo.holdTime,

                    // Enhanced rating information using sophisticated extraction
                    rating: ratingInfo.rating,
                    stars: ratingInfo.stars,
                    guestRating: ratingInfo.guestRating,
                    ratingData: ratingInfo.ratingData,
                    ratingUnavailable: ratingInfo.ratingUnavailable,

                    // Price breakdown for display
                    basePrice: priceData?.base || priceData?.total,
                    taxes: priceData?.taxes || [],

                    // Policies
                    policies: policiesData,

                    pricingData: {
                        data: {
                            hotel: hotelInfo,
                            offers: offers,
                        },
                    },

                    // Mark as booked
                    isBooked: true,
                    status: 'booked',
                };

                // Debug log to see what data is being passed
                console.log('=== HOTEL DATA EXTRACTION DEBUG ===');
                console.log('Raw hotel amenities:', hotelAmenities);
                console.log('Room type extraction:', roomTypeExtraction);
                console.log('Bed extraction:', bedExtraction);
                console.log('Amenities extraction:', amenitiesExtraction);
                console.log('Parsed description:', parsedDescription);
                console.log('Final enhanced hotel:', {
                    roomType: enhancedHotel.roomType,
                    bedType: enhancedHotel.bedType,
                    roomAmenities: enhancedHotel.roomAmenities,
                    wifi: enhancedHotel.wifi,
                    breakfast: enhancedHotel.breakfast,
                    parking: enhancedHotel.parking,
                    boardType: enhancedHotel.boardType,
                    rating: enhancedHotel.rating,
                    stars: enhancedHotel.stars,
                    cancellationPolicy: enhancedHotel.cancellationPolicy,
                    paymentType: enhancedHotel.paymentType,
                });
                console.log('=== END DEBUG ===');

                console.log('About to push enhanced hotel:', enhancedHotel);
                console.log('Enhanced hotel roomType:', enhancedHotel.roomType);
                console.log(
                    'Enhanced hotel roomAmenities:',
                    enhancedHotel.roomAmenities
                );

                enhancedHotels.push(enhancedHotel);
            });
        } else {
            console.log('=== USING FALLBACK LOGIC ===');
            console.log(
                'Response does not match expected structure:',
                response
            );

            // Fallback: Handle the old mock structure for backward compatibility
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
                    const roomData = offerData?.room;
                    const policiesData = offerData?.policies;

                    console.log(`Fallback: Processing hotel ${hotelId}`);
                    console.log('Fallback hotel data:', {
                        hotelInfo,
                        offerData,
                        roomData,
                    });

                    // Use shared extraction functions
                    const roomTypeExtraction = extractRoomType(offerData);
                    const bedExtraction = extractBed(offerData);
                    const amenitiesExtraction = extractAmenities(offerData);
                    const parsedDescription = parseDescription(
                        offerData?.description?.text
                    );

                    // Extract amenities from hotel data
                    const hotelAmenities = hotelInfo?.amenities || [];

                    // Apply shared extraction functions
                    const policyInfo = extractPolicyInfo(policiesData);
                    const ratingInfo = extractRatingInfo(hotelData, hotelId);

                    console.log('Fallback extraction results:', {
                        roomTypeExtraction,
                        bedExtraction,
                        amenitiesExtraction,
                        parsedDescription,
                        policyInfo,
                        ratingInfo,
                    });

                    const enhancedHotel = {
                        id: hotelId,
                        name: hotelInfo?.name || 'Hotel Name',
                        location: `${hotelInfo?.cityCode || ''}, ${
                            hotelInfo?.address?.countryCode || ''
                        }`.trim(),
                        hotelId: hotelInfo?.hotelId,
                        chainCode: hotelInfo?.chainCode,
                        cityCode: hotelInfo?.cityCode,
                        countryCode: hotelInfo?.address?.countryCode,

                        // Map to the structure expected by HotelSummary component
                        hotel: {
                            name: hotelInfo?.name,
                            chainCode: hotelInfo?.chainCode,
                            cityCode: hotelInfo?.cityCode,
                            address: {
                                countryCode: hotelInfo?.address?.countryCode,
                            },
                            amenities: hotelAmenities,
                        },

                        offers: offers,

                        // Enhanced data from actual response
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

                        // Room and bed information using sophisticated extraction
                        roomType:
                            roomTypeExtraction.value ||
                            parsedDescription.roomType ||
                            'TBD',
                        bedType:
                            bedExtraction.bedType ||
                            parsedDescription.bedType ||
                            'TBD',
                        beds: bedExtraction.beds,
                        roomSize: parsedDescription.roomSize || '',
                        numGuests: offerData?.guests?.adults || 2,
                        roomQuantity: offerData?.roomQuantity || 1,

                        // Enhanced extraction metadata for debugging
                        roomTypeConfidence: roomTypeExtraction.confidence,
                        roomTypeSource: roomTypeExtraction.source,
                        bedConfidence: bedExtraction.confidence,
                        bedSource: bedExtraction.source,

                        // Combine all amenities sources
                        roomAmenities: [
                            ...amenitiesExtraction,
                            ...(parsedDescription.amenities || []),
                            ...hotelAmenities.map((amenity) => {
                                // Convert hotel amenity codes to readable text
                                if (amenity === 'CRIBS_AVAILABLE')
                                    return 'Cribs Available';
                                if (amenity === 'WIFI_FREE') return 'Free WiFi';
                                if (amenity === 'PARKING_FREE')
                                    return 'Free Parking';
                                if (amenity === 'BREAKFAST_INCLUDED')
                                    return 'Breakfast Included';
                                if (amenity === 'POOL') return 'Swimming Pool';
                                if (amenity === 'GYM') return 'Fitness Center';
                                if (amenity === 'SPA') return 'Spa Services';
                                if (amenity === 'RESTAURANT')
                                    return 'Restaurant';
                                if (amenity === 'BAR') return 'Bar/Lounge';
                                if (amenity === 'ROOM_SERVICE')
                                    return 'Room Service';
                                if (amenity === 'BUSINESS_CENTER')
                                    return 'Business Center';
                                if (amenity === 'MEETING_ROOMS')
                                    return 'Meeting Rooms';
                                if (amenity === 'LAUNDRY')
                                    return 'Laundry Service';
                                if (amenity === 'CONCIERGE') return 'Concierge';
                                if (amenity === 'PET_FRIENDLY')
                                    return 'Pet Friendly';
                                if (amenity === 'AIRPORT_SHUTTLE')
                                    return 'Airport Shuttle';

                                // Default conversion
                                return amenity
                                    .replace(/_/g, ' ')
                                    .toLowerCase()
                                    .replace(/\b\w/g, (l) => l.toUpperCase());
                            }),
                        ],

                        // Set amenity flags based on all sources
                        wifi:
                            parsedDescription.wifi ||
                            hotelAmenities.some(
                                (a) =>
                                    a.toLowerCase().includes('wifi') ||
                                    a.toLowerCase().includes('internet')
                            ),
                        breakfast:
                            offerData?.description?.text
                                ?.toLowerCase()
                                .includes('breakfast') ||
                            hotelAmenities.some((a) =>
                                a.toLowerCase().includes('breakfast')
                            ) ||
                            offerData?.boardType === 'BREAKFAST',
                        parking: hotelAmenities.some((a) =>
                            a.toLowerCase().includes('parking')
                        ),

                        // Board type from offer
                        boardType:
                            offerData?.boardType || parsedDescription.boardType,

                        // Enhanced policy information using sophisticated extraction
                        freeCancellation: policyInfo.freeCancellation,
                        cancellation: policyInfo.cancellationPolicy,
                        cancellationPolicy: policyInfo.cancellationPolicy,
                        paymentType: policyInfo.paymentType,
                        checkInTime: policyInfo.checkInTime,
                        checkOutTime: policyInfo.checkOutTime,
                        depositInfo: policyInfo.depositInfo,
                        cancellationDeadline: policyInfo.cancellationDeadline,
                        holdTime: policyInfo.holdTime,

                        // Enhanced rating information using sophisticated extraction
                        rating: ratingInfo.rating,
                        stars: ratingInfo.stars,
                        guestRating: ratingInfo.guestRating,
                        ratingData: ratingInfo.ratingData,
                        ratingUnavailable: ratingInfo.ratingUnavailable,

                        // Price breakdown for display
                        basePrice: priceData?.base || priceData?.total,
                        taxes: priceData?.taxes || [],

                        // Policies
                        policies: policiesData,

                        pricingData: {
                            data: {
                                hotel: hotelInfo,
                                offers: offers,
                            },
                        },

                        // Legacy amenities for backward compatibility
                        amenities: [
                            ...amenitiesExtraction,
                            ...(parsedDescription.amenities || []),
                        ],

                        // Mark as booked
                        isBooked: true,
                        status: 'booked',
                    };

                    console.log(
                        'Fallback: About to push enhanced hotel:',
                        enhancedHotel
                    );
                    console.log(
                        'Fallback: Enhanced hotel roomType:',
                        enhancedHotel.roomType
                    );
                    console.log(
                        'Fallback: Enhanced hotel roomAmenities:',
                        enhancedHotel.roomAmenities
                    );

                    enhancedHotels.push(enhancedHotel);
                }
            );
        }

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
                    convertToUserCurrencyAmount(
                        parseFloat(flightPrice.total || 0),
                        flightPrice.currency || 'USD'
                    )
                );
            } else if (item.basePrice) {
                // Hotel pricing with currency conversion
                return (
                    sum +
                    convertToUserCurrencyAmount(
                        parseFloat(item.basePrice || 0),
                        item.currency || 'USD'
                    )
                );
            } else if (item.price && item.price !== 'TBD') {
                // Fallback to item.price string parsing with currency conversion
                const priceMatch = item.price.match(/([\d.]+)\s*([A-Z]{3})?/);
                if (priceMatch) {
                    const amount = parseFloat(priceMatch[1]);
                    const currency = priceMatch[2] || item.currency || 'USD';
                    return sum + convertToUserCurrencyAmount(amount, currency);
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

                const transformedData = transformBookingData(response);
                setBookingData(transformedData);
            } catch (error) {
                console.error('Error fetching booking data:', error);
                setErrorModal({
                    isOpen: true,
                    title: 'Failed to Load Booking Data',
                    message:
                        'Unable to fetch your booking information. Please try again.',
                    onRetry: () => {
                        setErrorModal({ ...errorModal, isOpen: false });
                        fetchData();
                    },
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
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4 text-slate-600"
                >
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-lg font-medium">
                        Loading booking details...
                    </p>
                </motion.div>
            </div>
        );
    }

    // Error state
    if (errorModal.isOpen) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4 px-4"
                >
                    <div className="text-red-500 text-6xl">⚠️</div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {errorModal.title}
                    </h2>
                    <p className="text-slate-600 max-w-md">
                        {errorModal.message}
                    </p>
                    <div className="flex gap-3 justify-center">
                        {errorModal.onRetry && (
                            <Button
                                onClick={errorModal.onRetry}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Try Again
                            </Button>
                        )}
                        <Button
                            onClick={() => navigate(-1)}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go Back
                        </Button>
                    </div>
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
                {/* Debug: Log what we're passing to BookingSummary */}
                {console.log('=== PASSING TO BOOKING SUMMARY ===', {
                    enhancedHotels: bookingData.enhancedHotels,
                    totalHotels: bookingData.enhancedHotels?.length || 0,
                })}
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
                        Back to Trip Card
                    </Button>
                </motion.div>

                {/* Error Modal */}
                <ErrorModal
                    isOpen={errorModal.isOpen}
                    onClose={() =>
                        setErrorModal({ ...errorModal, isOpen: false })
                    }
                    title={errorModal.title}
                    message={errorModal.message}
                    onRetry={errorModal.onRetry}
                />
            </div>
        </div>
    );
}
