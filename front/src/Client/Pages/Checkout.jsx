import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../Components/ui/button.jsx';
import { convertToUserCurrency } from '../utils/currencyConverter.js';
import ErrorModal from '../Components/ui/error-modal.jsx';
import {
    createFlightOrder,
    createHotelOrder,
    updateTripCard,
    getHotelRatings,
} from '../../api/chatApi.js';

import BookingSummary from '../Components/checkout/BookingSummary.jsx';
import ContactInformation from '../Components/checkout/ContactInformation.jsx';
import Passengers from '../Components/checkout/Passengers.jsx';
import Guests from '../Components/checkout/Guests.jsx';
import CompleteBooking from '../Components/checkout/CompleteBooking.jsx';
import { useBookingRequirementsAnalyzer } from '../Components/checkout/BookingRequirementsAnalyzer.jsx';

export default function CheckoutPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorModal, setErrorModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onRetry: null,
    });
    const [isBooking, setIsBooking] = useState(false);

    const [bookingData, setBookingData] = useState({
        contactEmail: '',
        contactPhone: '',
        contactStreet: '',
        contactCity: '',
        contactState: '',
        contactPostalCode: '',
        contactCountry: '',
        passengers: [],
        guests: [],
    });

    // Pull selection + pricing from navigation state
    const {
        selectedFlights = [],
        selectedHotels = [],
        flightPricing = [],
        hotelPricing = [],
        hotelRatings = {},
        pricingError = null,
        chatId = null,
    } = location.state || {};

    // Build enhanced items (memoized so identities are stable between renders)
    const enhancedFlights = useMemo(() => {
        return selectedFlights.map((flight) => {
            const pricingData =
                flightPricing &&
                flightPricing.find((p) => p.flightId === flight.id);
            const pricing = pricingData?.pricing;

            const basePrice = pricing?.data?.flightOffers?.[0]?.price;
            const creditCardFees =
                pricing?.data?.flightOffers?.[0]?.pricingOptions?.fareType;
            const baggageOptions =
                pricing?.data?.flightOffers?.[0]?.travelerPricings?.[0]
                    ?.fareDetailsBySegment?.[0]?.includedCheckedBags;
            const fareRules = pricing?.data?.flightOffers?.[0]?.fareRules;
            const otherServices =
                pricing?.data?.flightOffers?.[0]?.pricingOptions;

            return {
                ...flight,
                class: 'Economy',
                baggage: baggageOptions
                    ? {
                          carryOn: baggageOptions.weight
                              ? `${baggageOptions.weight}kg`
                              : '1x 7kg',
                          checked: baggageOptions.weight
                              ? `${baggageOptions.weight}kg`
                              : '1x 23kg',
                      }
                    : { carryOn: '1x 7kg', checked: '1x 23kg' },
                seat: '25A',
                meal: 'Included',
                wifi: 'Available ($10)',
                aircraft: 'Boeing 737',
                duration: '7h 30m',
                stops: 0,
                refundPolicy: fareRules?.refundable
                    ? 'Refundable'
                    : 'Non-refundable',
                changeFee: fareRules?.changeable ? '$150' : 'Not changeable',

                // pricing info
                basePrice,
                creditCardFees,
                fareRules,
                otherServices,
                pricingData: pricing,
            };
        });
    }, [selectedFlights, flightPricing]);

    const enhancedHotels = useMemo(() => {
        return selectedHotels.map((hotel) => {
            const pricingData =
                hotelPricing &&
                hotelPricing.find((p) => p.hotelId === hotel.id);
            const pricing = pricingData?.pricing;

            // Get rating data for this hotel
            const ratingData = hotelRatings[hotel.id];

            // Extract rich data from the lambda response
            // The new format: pricing contains the hotel_offer_price directly
            const hotelOfferData = pricing?.data; // pricing.data contains the actual hotel offer data
            const offerData = hotelOfferData?.offers?.[0];
            const priceData = offerData?.price;
            const roomData = offerData?.room;
            const policiesData = offerData?.policies;
            const descriptionData = offerData?.description;

            // Enhanced extraction functions adapted from TypeScript reference
            const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

            const extractRoomType = (offer) => {
                const est = offer?.room?.typeEstimated?.category;
                if (est)
                    return {
                        value: est.replace(/_/g, ' '),
                        confidence: 'high',
                        source: 'typeEstimated.category',
                    };

                const desc = (
                    offer?.room?.description?.text || ''
                ).toLowerCase();

                // Split by common separators and clean each part
                const parts = desc
                    .split(/[-/;|,\n]/)
                    .map((part) => part.trim())
                    .filter((part) => part.length > 0);

                // Look for room type patterns in each part
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

                const desc = (
                    offer?.room?.description?.text || ''
                ).toLowerCase();

                // Split by common separators and clean each part
                const parts = desc
                    .split(/[-/;|,\n]/)
                    .map((part) => part.trim())
                    .filter((part) => part.length > 0);

                // Look for bed information in each part
                for (const part of parts) {
                    // Long forms: "king", "queen", "twin", "double", "single", "sofa bed", "bunk"
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

                    // Compact: "2Q", "1 K", "2T", "1D", "1S"
                    const compact = /\b([12])\s*(k|q|t|d|s)\b/i.exec(part);
                    if (compact) {
                        const map = {
                            k: 'King',
                            q: 'Queen',
                            t: 'Twin',
                            d: 'Double',
                            s: 'Single',
                        };
                        return {
                            beds: Number(compact[1]),
                            bedType: map[compact[2].toLowerCase()],
                            confidence: 'med',
                            source: 'description.text',
                        };
                    }

                    // Look for bed count patterns like "Double bed(s)"
                    const bedCountMatch = /(\d+)\s*bed/i.exec(part);
                    if (bedCountMatch) {
                        // Try to find bed type in the same part
                        const bedTypeInPart =
                            /\b(king|queen|twin|double|single)\b/i.exec(part);
                        if (bedTypeInPart) {
                            return {
                                beds: Number(bedCountMatch[1]),
                                bedType: title(bedTypeInPart[1]),
                                confidence: 'med',
                                source: 'description.text',
                            };
                        }
                    }
                }

                return { confidence: 'low' };
            };

            const extractAmenities = (offer) => {
                const desc = (
                    offer?.room?.description?.text || ''
                ).toLowerCase();

                // Split by common separators and clean each part
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
                    // Additional amenities from the provided list
                    'swimming pool',
                    'fitness center',
                    'restaurant',
                    'pets allowed',
                    'airport shuttle',
                    'business center',
                    'disabled facilities',
                    'meeting rooms',
                    'no kid allowed',
                    'tennis',
                    'golf',
                    'kitchen',
                    'animal watching',
                    'baby-sitting',
                    'beach',
                    'casino',
                    'jacuzzi',
                    'sauna',
                    'solarium',
                    'massage',
                    'valet parking',
                    'bar',
                    'lounge',
                    'kids welcome',
                    'no porn films',
                    'minibar',
                    'television',
                    'wi-fi in room',
                    'room service',
                    'guarded parking',
                    'special menu',
                    // Additional patterns for separated text
                    'ac',
                    'iron',
                    'ironing board',
                    'bathroom',
                    'shower',
                    'no smoking',
                    'smoking',
                ];

                const found = [];

                // Check each part for amenities
                for (const part of parts) {
                    for (const key of keys) {
                        if (part.includes(key) && !found.includes(key)) {
                            found.push(key);
                        }
                    }
                }

                // Also check the full description for multi-word amenities
                for (const key of keys) {
                    if (desc.includes(key) && !found.includes(key)) {
                        found.push(key);
                    }
                }

                // Meal plan from boardType
                const bt = offer?.boardType;
                if (bt && bt !== 'ROOM_ONLY') {
                    found.push(bt.replace(/_/g, ' ').toLowerCase());
                }

                return Array.from(new Set(found)).map(title);
            };

            const formatPrice = (offer) => {
                const p = offer?.price || {};
                const currency = p.currency;
                const displayTotal = p.sellingTotal ?? p.total; // prefer sellingTotal if present

                // Sum taxes not included
                const excluded = Array.isArray(p.taxes)
                    ? p.taxes.filter((t) => t?.included === false)
                    : [];
                const excludedSum = excluded.reduce(
                    (s, t) => s + (parseFloat(t?.amount || '0') || 0),
                    0
                );
                const perNightAvg =
                    p?.variations?.average?.total ??
                    p?.variations?.average?.base;

                return {
                    currency,
                    total: displayTotal,
                    perNightAvg,
                    hasExcludedTaxes: excluded.length > 0,
                    excludedTaxesTotal: excluded.length
                        ? excludedSum.toFixed(2)
                        : undefined,
                    nights: calcNights(offer?.checkInDate, offer?.checkOutDate),
                };
            };

            const calcNights = (inD, outD) => {
                if (!inD || !outD) return undefined;
                const ms = new Date(outD).getTime() - new Date(inD).getTime();
                return Math.max(1, Math.round(ms / 86400000));
            };

            // Parse description text for relevant information
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
                    // Split by common separators and clean each part
                    const parts = text
                        .split(/[-/;|,\n]/)
                        .map((part) => part.trim())
                        .filter((part) => part.length > 0);

                    // Extract room size (e.g., "50sqm/538sqft", "45SQM")
                    const sizeMatch = descriptionText.match(
                        /(\d+)\s*sqm\/(\d+)\s*sqft/i
                    );
                    if (sizeMatch) {
                        info.roomSize = `${sizeMatch[1]}sqm / ${sizeMatch[2]}sqft`;
                    } else {
                        // Look for size in separated parts
                        for (const part of parts) {
                            const sizeInPart = part.match(/(\d+)\s*sqm/i);
                            if (sizeInPart) {
                                info.roomSize = `${sizeInPart[1]}sqm`;
                                break;
                            }
                        }
                    }

                    // Check for WiFi in any part
                    for (const part of parts) {
                        if (
                            part.includes('wireless internet') ||
                            part.includes('wifi') ||
                            part.includes('internet')
                        ) {
                            info.wifi = true;
                            break;
                        }
                    }

                    // Extract room type from first part or any part
                    if (parts.length > 0) {
                        // Try first part first
                        const firstPart = parts[0];
                        if (firstPart && firstPart.length > 3) {
                            info.roomType = firstPart;
                        }

                        // Look for room type keywords in any part
                        for (const part of parts) {
                            if (
                                part.includes('room') ||
                                part.includes('suite') ||
                                part.includes('apartment')
                            ) {
                                info.roomType = part;
                                break;
                            }
                        }
                    }

                    // Extract bed type from any part
                    for (const part of parts) {
                        if (part.includes('queen')) {
                            info.bedType = 'Queen';
                            break;
                        } else if (part.includes('king')) {
                            info.bedType = 'King';
                            break;
                        } else if (part.includes('double')) {
                            info.bedType = 'Double';
                            break;
                        } else if (part.includes('twin')) {
                            info.bedType = 'Twin';
                            break;
                        }
                    }

                    // Extract board type from any part
                    for (const part of parts) {
                        if (part.includes('breakfast')) {
                            info.boardType = 'Breakfast Included';
                            break;
                        } else if (part.includes('half board')) {
                            info.boardType = 'Half Board';
                            break;
                        } else if (part.includes('full board')) {
                            info.boardType = 'Full Board';
                            break;
                        } else if (part.includes('all inclusive')) {
                            info.boardType = 'All Inclusive';
                            break;
                        }
                    }
                    if (!info.boardType) info.boardType = 'Room Only';

                    // Extract amenities from any part
                    const amenities = [];
                    const amenityKeywords = [
                        'mini fridge',
                        'living/sitting area',
                        'balcony',
                        'safe',
                        'air conditioning',
                        'tv',
                        'telephone',
                        'hairdryer',
                        'ac',
                        'iron',
                        'ironing board',
                        'bathroom',
                        'shower',
                        'no smoking',
                    ];

                    for (const part of parts) {
                        for (const keyword of amenityKeywords) {
                            if (
                                part.includes(keyword) &&
                                !amenities.includes(keyword)
                            ) {
                                amenities.push(keyword);
                            }
                        }
                    }

                    info.amenities = amenities;
                } catch (error) {
                    console.warn('Error parsing hotel description:', error);
                    // Ensure amenities is always an array even if parsing fails
                    info.amenities = [];
                }

                return info;
            };

            const parsedDescription = parseDescription(descriptionData?.text);

            // Use enhanced extraction functions
            const roomTypeExtraction = extractRoomType(offerData);
            const bedExtraction = extractBed(offerData);
            const amenitiesExtraction = extractAmenities(offerData);
            const priceExtraction = formatPrice(offerData);

            // Create the enhanced hotel object that matches the Base44Client structure
            const enhancedHotel = {
                ...hotel,

                // Map to the structure expected by HotelSummary component
                // This matches the Base44Client pattern: hotelOffer.hotel.name, hotelOffer.offers[0].price, etc.
                hotel: {
                    name: hotelOfferData?.hotel?.name || hotel.name,
                    chainCode:
                        hotelOfferData?.hotel?.chainCode || hotel.chainCode,
                    cityCode: hotelOfferData?.hotel?.cityCode || hotel.cityCode,
                    address: {
                        countryCode:
                            hotelOfferData?.hotel?.address?.countryCode ||
                            hotel.countryCode,
                    },
                    amenities: hotelOfferData?.hotel?.amenities || [],
                },

                // Map offers array to match expected structure
                offers: offerData
                    ? [
                          {
                              id: offerData.id,
                              roomQuantity: offerData.roomQuantity,
                              price: priceData,
                              room: roomData,
                              policies: policiesData,
                              description: descriptionData,
                              checkInDate: offerData.checkInDate,
                              checkOutDate: offerData.checkOutDate,
                              guests: offerData.guests,
                              rateCode: offerData.rateCode,
                              rateFamilyEstimated:
                                  offerData.rateFamilyEstimated,
                              boardType: offerData.boardType,
                              category: offerData.category,
                              commission: offerData.commission,
                              self: offerData.self,
                              cancelPolicyHash: offerData.cancelPolicyHash,
                          },
                      ]
                    : [],

                // Additional properties for backward compatibility and enhanced display
                name: hotelOfferData?.hotel?.name || hotel.name,
                chainCode: hotelOfferData?.hotel?.chainCode || hotel.chainCode,
                cityCode: hotelOfferData?.hotel?.cityCode || hotel.cityCode,
                countryCode:
                    hotelOfferData?.hotel?.address?.countryCode ||
                    hotel.countryCode,

                // Room and pricing information (mandatory fields with fallbacks)
                roomType:
                    roomTypeExtraction.value ||
                    parsedDescription.roomType ||
                    'TBD',
                bedType:
                    bedExtraction.bedType || parsedDescription.bedType || 'TBD',
                beds: bedExtraction.beds,
                roomSize: parsedDescription.roomSize || '',
                numGuests: offerData?.guests?.adults || 2,
                roomQuantity: offerData?.roomQuantity || 1,
                // Optional fields - only include if present
                boardType: offerData?.boardType || parsedDescription.boardType,
                category: offerData?.category,
                rateCode: offerData?.rateCode,
                rateFamilyEstimated: offerData?.rateFamilyEstimated,

                // Enhanced extraction metadata
                roomTypeConfidence: roomTypeExtraction.confidence,
                roomTypeSource: roomTypeExtraction.source,
                bedConfidence: bedExtraction.confidence,
                bedSource: bedExtraction.source,

                // Check-in/out dates
                checkIn: offerData?.checkInDate || hotel.checkIn,
                checkOut: offerData?.checkOutDate || hotel.checkOut,

                // Pricing information (mandatory fields with fallbacks)
                basePrice: priceData,
                price: priceExtraction.total || hotel.price || 'TBD',
                currency: priceExtraction.currency || hotel.currency || 'USD',
                pricePerNight:
                    priceData?.base || priceExtraction.total || 'TBD',
                perNightAvg: priceExtraction.perNightAvg,
                nights: priceExtraction.nights,
                // Optional pricing fields - only include if present
                sellingTotal: priceExtraction.total,
                taxes: priceData?.taxes,
                markups: priceData?.markups,
                variations: priceData?.variations,
                commission: offerData?.commission,
                hasExcludedTaxes: priceExtraction.hasExcludedTaxes,
                excludedTaxesTotal: priceExtraction.excludedTaxesTotal,

                // Amenities and features
                wifi: parsedDescription.wifi || true,
                breakfast:
                    descriptionData?.text
                        ?.toLowerCase()
                        .includes('breakfast') || false,
                parking: 'Available',
                amenities: [
                    ...amenitiesExtraction,
                    ...(parsedDescription.amenities || []),
                    ...(hotelOfferData?.hotel?.amenities || []),
                ],
                roomAmenities: [
                    ...amenitiesExtraction,
                    ...(parsedDescription.amenities || []),
                ],

                // Policies (mandatory fields with fallbacks)
                freeCancellation:
                    policiesData?.cancellation?.type !== 'FULL_STAY' ||
                    policiesData?.refundable?.cancellationRefund !==
                        'NON_REFUNDABLE',
                cancellationPolicy:
                    policiesData?.cancellation?.description?.text ||
                    policiesData?.cancellations?.[0]?.description?.text ||
                    'TBD',
                paymentType: policiesData?.paymentType || 'TBD',
                // Optional policy fields - only include if present
                deposit: policiesData?.deposit,
                checkInTime: policiesData?.checkIn?.from,
                checkOutTime: policiesData?.checkOut?.until,
                cancellationDeadline: policiesData?.cancellation?.deadline,
                depositDeadline: policiesData?.deposit?.deadline,

                // Rating and stars (use real data if available, fallback to defaults)
                rating: ratingData?.rating_data?.unavailable
                    ? null // No rating available
                    : ratingData?.rating_data?.overallRating || 4.2,
                stars: ratingData?.rating_data?.unavailable
                    ? null // No stars available
                    : Math.round(ratingData?.rating_data?.overallRating || 4.2),
                guestRating: ratingData?.rating_data?.unavailable
                    ? null // No guest rating available
                    : ratingData?.rating_data?.overallRating || 4.2,
                ratingData: ratingData, // Include full rating data for detailed display
                ratingUnavailable:
                    ratingData?.rating_data?.unavailable || false, // Flag for UI

                // Enhanced data from lambda
                pricingDetails: offerData,
                pricingData: pricing,
                hotelOfferData: hotelOfferData,
            };

            return enhancedHotel;
        });
    }, [selectedHotels, hotelPricing, hotelRatings]);

    // Analyze requirements directly (don't mirror to state)
    const {
        numberOfPassengers,
        requiredPassengerFields,
        requiredSharedFields,
    } = useBookingRequirementsAnalyzer(enhancedFlights);

    // Auth + bootstrap contact fields
    useEffect(() => {
        const userDetails = localStorage.getItem('userDetails');
        if (!userDetails) {
            navigate('/');
            return;
        }
        try {
            const userData = JSON.parse(userDetails);
            setUser(userData);
            setBookingData((prev) => ({
                ...prev,
                contactEmail: userData.email || '',
                contactPhone: userData.phone_number || '',
                contactStreet: userData.address?.street || '',
                contactCity: userData.address?.city || '',
                contactState: userData.address?.state || '',
                contactPostalCode: userData.address?.postal_code || '',
                contactCountry: userData.address?.country || '',
            }));
            // Set loading to false after user data is loaded
            setIsLoading(false);
        } catch {
            navigate('/');
        }
    }, [navigate]);

    // Guard: must have something selected
    useEffect(() => {
        if (!selectedFlights.length && !selectedHotels.length) {
            navigate('/history');
        }
    }, [navigate, selectedFlights.length, selectedHotels.length]);

    // Show pricing error once
    useEffect(() => {
        if (pricingError && pricingError.type === '502') {
            setErrorModal({
                isOpen: true,
                title: 'Flight Details Unavailable',
                message: pricingError.message,
                onRetry: () => navigate('/history'),
            });
        }
    }, [pricingError, navigate]);

    // Helpers for building passenger defaults
    const parseName = useCallback((full) => {
        const words = (full || '').trim().split(' ').filter(Boolean);
        let firstName = '',
            lastName = '',
            middleName = '';
        if (words.length >= 2) {
            firstName = words[0];
            lastName = words[words.length - 1];
            if (words.length > 2) middleName = words.slice(1, -1).join(' ');
        } else if (words.length === 1) {
            firstName = words[0];
        }
        return { firstName, lastName, middleName };
    }, []);

    const emptyPassenger = useCallback(
        () => ({
            firstName: '',
            lastName: '',
            middleName: '',
            dateOfBirth: '',
            gender: '',
            nationality: '',
            email: '',
            phoneNumber: '',
            nationalId: '',
            passportNumber: '',
            passportExpiryDate: '',
            passportIssuanceLocation: '',
            passportIssuanceCountry: '',
        }),
        []
    );

    const buildFirstPassengerFromUser = useCallback(
        (u) => {
            const { firstName, lastName, middleName } = parseName(
                u?.passport_name || u?.full_name || ''
            );
            return {
                firstName,
                lastName,
                middleName,
                dateOfBirth: u?.date_of_birth || '',
                gender: u?.gender || '',
                nationality: u?.nationality || '',
                email: u?.email || '',
                phoneNumber: u?.phone_number || '',
                nationalId: u?.national_id || '',
                passportNumber: u?.passport_number || '',
                passportExpiryDate: u?.passport_expiry_date || '',
                passportIssuanceLocation: u?.passport_issuance_location || '',
                passportIssuanceCountry: u?.passport_issuance_country || '',
            };
        },
        [parseName]
    );

    // Build first guest from user data (similar to passenger logic)
    const buildFirstGuestFromUser = useCallback(
        (u) => {
            const { firstName, lastName } = parseName(
                u?.passport_name || u?.full_name || ''
            );
            return {
                firstName,
                lastName,
                gender: u?.gender || '',
                phone: u?.phone_number || '',
                email: u?.email || '',
            };
        },
        [parseName]
    );

    // Keep passengers array in sync with the required count,
    // but ONLY when the count changes or on first initialization.
    useEffect(() => {
        if (!user || numberOfPassengers <= 0) return;

        setBookingData((prev) => {
            const prevLen = prev.passengers.length;

            // Initialize or resize only when needed (prevents loops)
            if (prevLen === numberOfPassengers && prevLen !== 0) {
                return prev; // nothing to do
            }

            const next = Array.from({ length: numberOfPassengers }, (_, i) => {
                if (i === 0) return buildFirstPassengerFromUser(user);
                return prev.passengers[i] || emptyPassenger();
            });

            return { ...prev, passengers: next };
        });
    }, [user, numberOfPassengers, buildFirstPassengerFromUser, emptyPassenger]);

    // Keep guests array in sync when hotels are selected,
    // auto-fill first guest with user data
    useEffect(() => {
        if (!user || enhancedHotels.length === 0) return;

        setBookingData((prev) => {
            // Only initialize if guests array is empty and we have hotels
            if (prev.guests.length > 0) {
                return prev; // already has guests
            }

            // Initialize with first guest pre-filled from user data
            const firstGuest = buildFirstGuestFromUser(user);
            return { ...prev, guests: [firstGuest] };
        });
    }, [user, enhancedHotels.length, buildFirstGuestFromUser]);

    // Handlers
    const handleInputChange = (field, value) => {
        setBookingData((prev) => ({ ...prev, [field]: value }));
    };

    const handlePassengerChange = (index, field, value) => {
        setBookingData((prev) => ({
            ...prev,
            passengers: prev.passengers.map((p, i) =>
                i === index ? { ...p, [field]: value } : p
            ),
        }));
    };

    const addPassenger = () => {
        // If you want to allow adding beyond analyzer's count, append.
        // If not, you can disable this button in the UI when index === numberOfPassengers.
        setBookingData((prev) => ({
            ...prev,
            passengers: [...prev.passengers, emptyPassenger()],
        }));
    };

    // Guest handlers for hotel bookings
    const handleGuestChange = (index, field, value) => {
        setBookingData((prev) => ({
            ...prev,
            guests: prev.guests.map((g, i) =>
                i === index ? { ...g, [field]: value } : g
            ),
        }));
    };

    const addGuest = () => {
        setBookingData((prev) => ({
            ...prev,
            guests: [...prev.guests, emptyGuest()],
        }));
    };

    const removeGuest = (index) => {
        setBookingData((prev) => ({
            ...prev,
            guests: prev.guests.filter((_, i) => i !== index),
        }));
    };

    // Helper to create empty guest object
    const emptyGuest = useCallback(
        () => ({
            firstName: '',
            lastName: '',
            gender: '',
            phone: '',
            email: '',
        }),
        []
    );

    // Transform passenger data to match lambda's expected traveler format
    const transformToTravelerFormat = useCallback((passenger, contactInfo) => {
        const traveler = {
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            dateOfBirth: passenger.dateOfBirth,
            gender: passenger.gender,
            email: passenger.email || contactInfo.contactEmail,
            phoneNumber: passenger.phoneNumber || contactInfo.contactPhone,
            nationalId: passenger.nationalId,
        };

        // Add optional fields if available
        if (passenger.nationality) traveler.nationality = passenger.nationality;
        if (passenger.passportNumber)
            traveler.passportNumber = passenger.passportNumber;
        if (passenger.passportExpiryDate)
            traveler.expiryDate = passenger.passportExpiryDate;
        if (passenger.passportIssuanceLocation)
            traveler.issuanceLocation = passenger.passportIssuanceLocation;
        if (passenger.passportIssuanceCountry)
            traveler.issuanceCountry = passenger.passportIssuanceCountry;
        if (passenger.passportNumber) traveler.documentType = 'PASSPORT';

        return traveler;
    }, []);

    const totalPrice = useMemo(() => {
        return [...enhancedFlights, ...enhancedHotels].reduce((sum, item) => {
            if (item.pricingData?.data?.flightOffers?.[0]?.price) {
                // Flight pricing
                const flightPrice = item.pricingData.data.flightOffers[0].price;
                return (
                    sum +
                    convertToUserCurrency(
                        parseFloat(flightPrice.total),
                        flightPrice.currency
                    )
                );
            } else if (item.price && item.price !== 'TBD') {
                // Hotel pricing - use the actual currency from the hotel data
                const amount = parseFloat(item.price) || 0;
                const currency = item.currency || 'USD';
                return sum + convertToUserCurrency(amount, currency);
            }
            return sum;
        }, 0);
    }, [enhancedFlights, enhancedHotels]);

    const handleCompleteBooking = async () => {
        if (!bookingData.contactEmail || !bookingData.contactPhone) {
            alert('Please fill in all contact information.');
            return;
        }

        if (!chatId) {
            alert('Missing chat information. Please go back and try again.');
            return;
        }

        // Debug logging
        console.log('DEBUG: Passenger requirements:', requiredPassengerFields);
        console.log('DEBUG: Booking data passengers:', bookingData.passengers);

        if (enhancedFlights.length > 0) {
            for (
                let passengerIndex = 0;
                passengerIndex < bookingData.passengers.length;
                passengerIndex++
            ) {
                const passenger = bookingData.passengers[passengerIndex];
                const passengerReq =
                    requiredPassengerFields[passengerIndex] || {};

                // Check required fields based on actual requirements
                const missingFields = [];

                if (passengerReq.firstName !== false && !passenger.firstName) {
                    missingFields.push('First Name');
                }
                if (passengerReq.lastName !== false && !passenger.lastName) {
                    missingFields.push('Last Name');
                }
                if (
                    passengerReq.dateOfBirthRequired &&
                    !passenger.dateOfBirth
                ) {
                    missingFields.push('Date of Birth');
                }
                if (passengerReq.genderRequired && !passenger.gender) {
                    missingFields.push('Gender');
                }
                if (
                    passengerReq.nationalityRequired &&
                    !passenger.nationality
                ) {
                    missingFields.push('Nationality');
                }
                if (passengerReq.emailRequired && !passenger.email) {
                    missingFields.push('Email');
                }
                if (
                    passengerReq.phoneNumberRequired &&
                    !passenger.phoneNumber
                ) {
                    missingFields.push('Phone Number');
                }
                if (passengerReq.nationalIdRequired && !passenger.nationalId) {
                    missingFields.push('National ID');
                }

                if (missingFields.length > 0) {
                    alert(
                        `Please fill in the following required information for Passenger ${
                            passengerIndex + 1
                        }: ${missingFields.join(', ')}`
                    );
                    return;
                }
            }

            setIsBooking(true);
            try {
                // Transform passengers to traveler format
                const travelers = bookingData.passengers.map((passenger) =>
                    transformToTravelerFormat(passenger, bookingData)
                );

                // Collect all flight offers and their TripTailor IDs
                const flightOffers = [];
                const tripIds = [];
                const originalTripTailorFlightIds = []; // Track TripTailor flight IDs for mapping

                for (const flight of enhancedFlights) {
                    const pricingData = flight.pricingData;
                    if (!pricingData) {
                        throw new Error(
                            `No pricing data available for flight ${flight.id}`
                        );
                    }

                    // Extract the flight offer from pricing data
                    const flightOffer = pricingData.data?.flightOffers?.[0];
                    if (!flightOffer) {
                        throw new Error(
                            `No flight offer found in pricing data for flight ${flight.id}`
                        );
                    }

                    flightOffers.push(flightOffer);
                    tripIds.push(flight.id);
                    originalTripTailorFlightIds.push(flight.id); // Store TripTailor flight ID for mapping
                }

                // Build contact address from form data or fall back to user's saved address
                const contactAddress = {
                    street: bookingData.contactStreet,
                    city: bookingData.contactCity,
                    state: bookingData.contactState,
                    postal_code: bookingData.contactPostalCode,
                    country: bookingData.contactCountry,
                };

                // Check if any address fields are filled, otherwise use user's saved address
                const hasContactAddress = Object.values(contactAddress).some(
                    (value) => value && value.trim() !== ''
                );

                let userAddress = null;
                if (!hasContactAddress) {
                    const userDetails = localStorage.getItem('userDetails');
                    userAddress = userDetails
                        ? JSON.parse(userDetails).address
                        : null;
                } else {
                    userAddress = contactAddress;
                }

                // Make a single call with all flight offers
                const result = await createFlightOrder({
                    flightOffers,
                    travelers,
                    tripIds,
                    chatId,
                    userAddress,
                    originalTripTailorFlightIds, // Send TripTailor flight IDs for mapping
                });

                // Update the trip card with ID mapping from the response
                if (
                    result.flightIdMapping &&
                    Object.keys(result.flightIdMapping).length > 0
                ) {
                    const flightIdMapping = result.flightIdMapping; // originalId -> newId
                    const flightStatuses = {};

                    // Create status mapping for newly booked flights
                    Object.values(flightIdMapping).forEach((newFlightId) => {
                        flightStatuses[newFlightId] = 'booked';
                    });

                    try {
                        await updateTripCard({
                            chatId,
                            flightIdMapping: flightIdMapping, // Send mapping for replacement
                            flightStatuses: flightStatuses,
                        });
                    } catch (updateError) {
                        console.warn(
                            'Failed to update trip card:',
                            updateError
                        );
                        // Don't fail the booking if trip card update fails
                    }
                } else if (
                    result.newFlightIds &&
                    result.newFlightIds.length > 0
                ) {
                    // Fallback for backward compatibility
                    const newFlightIds = result.newFlightIds;
                    const flightStatuses = {};
                    newFlightIds.forEach((flightId) => {
                        flightStatuses[flightId] = 'booked';
                    });

                    try {
                        await updateTripCard({
                            chatId,
                            flightIds: newFlightIds,
                            flightStatuses: flightStatuses,
                        });
                    } catch (updateError) {
                        console.warn(
                            'Failed to update trip card:',
                            updateError
                        );
                    }
                }

                // Only show flight-only alert if no hotels are being booked
                if (enhancedHotels.length === 0) {
                    // Round total price to 2 decimal places
                    const roundedTotalPrice =
                        Math.round(totalPrice * 100) / 100;

                    // Show success message and navigate (flights only)
                    alert(
                        `Booking confirmed! ${
                            flightOffers.length
                        } flight(s) booked.\nTotal: $${roundedTotalPrice.toFixed(
                            2
                        )}\nConfirmation details would be sent to ${
                            bookingData.contactEmail
                        }`
                    );

                    // Navigate to chat history with the specific chat expanded
                    navigate(`/chat/history?id=${chatId}&expand=1`);
                    return; // Exit early for flights-only booking
                }

                // Book hotels if any exist
                let hotelBookingResults = [];
                if (enhancedHotels.length > 0) {
                    console.log(
                        'DEBUG: Booking hotels...',
                        enhancedHotels.length
                    );

                    // Use guest data from the Guests component
                    const guests = bookingData.guests.map((guest) => ({
                        firstName: guest.firstName,
                        lastName: guest.lastName,
                        title:
                            guest.gender === 'MALE'
                                ? 'MR'
                                : guest.gender === 'FEMALE'
                                ? 'MS'
                                : 'MR',
                        email: guest.email || bookingData.contactEmail,
                        phone: guest.phone,
                    }));

                    // Ensure we have at least one guest
                    if (guests.length === 0) {
                        throw new Error(
                            'At least one guest is required for hotel booking'
                        );
                    }

                    // Prepare booking payloads for all hotels with same guest data
                    const bookingPayloads = enhancedHotels.map((hotel) => ({
                        hotelOfferId: hotel.offers?.[0]?.id || hotel.id,
                        guests: guests,
                        availableVendorCodes: ['VI'], // Default to Visa, can be enhanced later
                        hotelPricingData: hotel.pricingData,
                    }));

                    // Extract TripTailor hotel IDs for mapping
                    const originalTripTailorHotelIds = enhancedHotels.map(
                        (hotel) => hotel.id // This is the TripTailor hotel ID from the trip card
                    );

                    console.log(
                        'DEBUG: Booking hotels with payloads:',
                        bookingPayloads
                    );

                    // Make single call to book all hotels
                    const hotelResult = await createHotelOrder({
                        bookingPayloads,
                        chatId,
                        originalTripTailorHotelIds, // Send TripTailor hotel IDs for mapping
                    });

                    console.log('DEBUG: Hotel booking result:', hotelResult);
                    hotelBookingResults.push(hotelResult);

                    // Update trip card with booked hotels using ID mapping
                    if (hotelBookingResults.length > 0) {
                        const hotelIdMappings = {};
                        const hotelStatuses = {};

                        hotelBookingResults.forEach((result) => {
                            if (
                                result.hotelIdMapping &&
                                Object.keys(result.hotelIdMapping).length > 0
                            ) {
                                // Use ID mapping for replacement
                                Object.assign(
                                    hotelIdMappings,
                                    result.hotelIdMapping
                                );
                                Object.values(result.hotelIdMapping).forEach(
                                    (newHotelId) => {
                                        hotelStatuses[newHotelId] = 'booked';
                                    }
                                );
                            } else if (
                                result.newHotelIds &&
                                result.newHotelIds.length > 0
                            ) {
                                // Fallback for backward compatibility
                                result.newHotelIds.forEach((hotelId) => {
                                    hotelStatuses[hotelId] = 'booked';
                                });
                            }
                        });

                        if (Object.keys(hotelIdMappings).length > 0) {
                            try {
                                await updateTripCard({
                                    chatId,
                                    hotelIdMapping: hotelIdMappings, // Send mapping for replacement
                                    hotelStatuses: hotelStatuses,
                                });
                            } catch (updateError) {
                                console.warn(
                                    'Failed to update trip card with hotels:',
                                    updateError
                                );
                            }
                        } else if (Object.keys(hotelStatuses).length > 0) {
                            // Fallback: use just the new hotel IDs
                            try {
                                await updateTripCard({
                                    chatId,
                                    hotelIds: Object.keys(hotelStatuses),
                                    hotelStatuses: hotelStatuses,
                                });
                            } catch (updateError) {
                                console.warn(
                                    'Failed to update trip card with hotels:',
                                    updateError
                                );
                            }
                        }
                    }
                }

                // Round total price to 2 decimal places
                const finalTotalPrice = Math.round(totalPrice * 100) / 100;

                // Show success message and navigate
                const flightCount = flightOffers.length;
                const hotelCount = hotelBookingResults.length;
                let successMessage = 'Booking confirmed!\n';

                if (flightCount > 0) {
                    successMessage += `${flightCount} flight(s) booked.\n`;
                }
                if (hotelCount > 0) {
                    successMessage += `${hotelCount} hotel(s) booked.\n`;
                }

                successMessage += `Total: $${finalTotalPrice.toFixed(2)}\n`;
                successMessage += `Confirmation details would be sent to ${bookingData.contactEmail}`;

                alert(successMessage);

                // Navigate to chat history with the specific chat expanded
                navigate(`/chat/history?id=${chatId}&expand=1`);
            } catch (error) {
                console.error('Error during booking:', error);

                // Set error modal with retry option
                setErrorModal({
                    isOpen: true,
                    title: 'Booking Failed',
                    message:
                        error.response?.data?.message ||
                        error.message ||
                        'Failed to complete booking. Please try again.',
                    onRetry: () => {
                        setErrorModal((prev) => ({ ...prev, isOpen: false }));
                        handleCompleteBooking();
                    },
                });
            } finally {
                setIsBooking(false);
            }
        } else if (enhancedHotels.length > 0) {
            // No flights, but we have hotels to book
            setIsBooking(true);
            try {
                let hotelBookingResults = [];

                console.log(
                    'DEBUG: Booking hotels only...',
                    enhancedHotels.length
                );

                // Use guest data from the Guests component
                const guests =
                    bookingData.guests.length > 0
                        ? bookingData.guests.map((guest) => ({
                              firstName: guest.firstName,
                              lastName: guest.lastName,
                              title:
                                  guest.gender === 'MALE'
                                      ? 'MR'
                                      : guest.gender === 'FEMALE'
                                      ? 'MS'
                                      : 'MR',
                              email: guest.email || bookingData.contactEmail,
                              phone: guest.phone,
                          }))
                        : [
                              {
                                  firstName: 'Guest',
                                  lastName: 'User',
                                  title: 'MR',
                                  email: bookingData.contactEmail,
                              },
                          ];

                // Prepare booking payloads for all hotels with same guest data
                const bookingPayloads = enhancedHotels.map((hotel) => ({
                    hotelOfferId: hotel.offers?.[0]?.id || hotel.id,
                    guests: guests,
                    availableVendorCodes: ['VI'], // Default to Visa, can be enhanced later
                    hotelPricingData: hotel.pricingData,
                }));

                // Extract TripTailor hotel IDs for mapping
                const originalTripTailorHotelIds = enhancedHotels.map(
                    (hotel) => hotel.id // This is the TripTailor hotel ID from the trip card
                );

                console.log(
                    'DEBUG: Booking hotels with payloads:',
                    bookingPayloads
                );

                // Make single call to book all hotels
                const hotelResult = await createHotelOrder({
                    bookingPayloads,
                    chatId,
                    originalTripTailorHotelIds, // Send TripTailor hotel IDs for mapping
                });

                console.log('DEBUG: Hotel booking result:', hotelResult);
                hotelBookingResults.push(hotelResult);

                // Update trip card with booked hotels using ID mapping
                if (hotelBookingResults.length > 0) {
                    const hotelIdMappings = {};
                    const hotelStatuses = {};

                    hotelBookingResults.forEach((result) => {
                        if (
                            result.hotelIdMapping &&
                            Object.keys(result.hotelIdMapping).length > 0
                        ) {
                            // Use ID mapping for replacement
                            Object.assign(
                                hotelIdMappings,
                                result.hotelIdMapping
                            );
                            Object.values(result.hotelIdMapping).forEach(
                                (newHotelId) => {
                                    hotelStatuses[newHotelId] = 'booked';
                                }
                            );
                        } else if (
                            result.newHotelIds &&
                            result.newHotelIds.length > 0
                        ) {
                            // Fallback for backward compatibility
                            result.newHotelIds.forEach((hotelId) => {
                                hotelStatuses[hotelId] = 'booked';
                            });
                        }
                    });

                    if (Object.keys(hotelIdMappings).length > 0) {
                        try {
                            await updateTripCard({
                                chatId,
                                hotelIdMapping: hotelIdMappings, // Send mapping for replacement
                                hotelStatuses: hotelStatuses,
                            });
                        } catch (updateError) {
                            console.warn(
                                'Failed to update trip card with hotels:',
                                updateError
                            );
                        }
                    } else if (Object.keys(hotelStatuses).length > 0) {
                        // Fallback: use just the new hotel IDs
                        try {
                            await updateTripCard({
                                chatId,
                                hotelIds: Object.keys(hotelStatuses),
                                hotelStatuses: hotelStatuses,
                            });
                        } catch (updateError) {
                            console.warn(
                                'Failed to update trip card with hotels:',
                                updateError
                            );
                        }
                    }
                }

                // Round total price to 2 decimal places
                const hotelsTotalPrice = Math.round(totalPrice * 100) / 100;

                // Show success message and navigate
                alert(
                    `Booking confirmed! ${
                        hotelBookingResults.length
                    } hotel(s) booked.\nTotal: $${hotelsTotalPrice.toFixed(
                        2
                    )}\nConfirmation details would be sent to ${
                        bookingData.contactEmail
                    }`
                );

                navigate(`/chat/history?id=${chatId}&expand=1`);
            } catch (error) {
                console.error('Error booking hotels:', error);

                setErrorModal({
                    isOpen: true,
                    title: 'Hotel Booking Failed',
                    message:
                        error.response?.data?.message ||
                        error.message ||
                        'Failed to book hotels. Please try again.',
                    onRetry: () => {
                        setErrorModal((prev) => ({ ...prev, isOpen: false }));
                        handleCompleteBooking();
                    },
                });
            } finally {
                setIsBooking(false);
            }
        } else {
            // No flights or hotels to book
            alert('No items to book. Please select flights or hotels first.');
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                    <p className="text-slate-600">Loading checkout...</p>
                </div>
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
                            Complete Your Booking
                        </h1>
                        <p className="text-slate-600 text-sm sm:text-base">
                            Review your selection and provide booking details
                        </p>
                    </div>
                </motion.div>

                {/* Booking Summary */}
                <BookingSummary
                    enhancedFlights={enhancedFlights}
                    enhancedHotels={enhancedHotels}
                    totalPrice={totalPrice}
                />

                {/* Booking Forms */}
                <div className="space-y-6">
                    {/* Passenger Information */}
                    <Passengers
                        enhancedFlights={enhancedFlights}
                        bookingData={bookingData}
                        handlePassengerChange={handlePassengerChange}
                        addPassenger={addPassenger}
                        numberOfPassengers={numberOfPassengers}
                        requiredPassengerFields={requiredPassengerFields}
                    />

                    {/* Guest Information */}
                    <Guests
                        enhancedHotels={enhancedHotels}
                        bookingData={bookingData}
                        handleGuestChange={handleGuestChange}
                        addGuest={addGuest}
                        removeGuest={removeGuest}
                    />

                    {/* Contact Information */}
                    <ContactInformation
                        bookingData={bookingData}
                        handleInputChange={handleInputChange}
                        requiredSharedFields={requiredSharedFields}
                    />
                </div>

                {/* Final Booking Button */}
                <CompleteBooking
                    totalPrice={totalPrice}
                    handleCompleteBooking={handleCompleteBooking}
                    isBooking={isBooking}
                />
            </div>

            {/* Error Modal */}
            <ErrorModal
                isOpen={errorModal.isOpen}
                onClose={() =>
                    setErrorModal((prev) => ({ ...prev, isOpen: false }))
                }
                title={errorModal.title}
                message={errorModal.message}
                onRetry={errorModal.onRetry}
            />
        </div>
    );
}
