import React from 'react';
import { Badge } from '../../../Client/Components/ui/badge';
import {
    Star,
    Bed,
    MapPin,
    Utensils,
    Wifi,
    Car,
    Shield,
    CheckCircle2,
    Users,
    Package,
} from 'lucide-react';
import {
    formatCurrency,
    convertToUserCurrency,
    getUserPreferredCurrency,
    formatInUserCurrency,
} from '../../utils/currencyConverter';
import {
    getHotelChainName,
    getCityName,
    getCountryName,
    getRoomTypeName,
    getBedTypeName,
} from '../../utils/travelHelpers';

export default function HotelSummary({ hotel }) {
    // Helper functions for rating display
    const getStarsFromRating = (rating) => {
        if (rating < 20) return 0;
        if (rating < 40) return 1;
        if (rating < 60) return 2;
        if (rating < 80) return 3;
        if (rating < 90) return 4;
        return 5;
    };

    const getRatingText = (rating) => {
        if (rating < 20) return 'Poor';
        if (rating < 40) return 'Disappointing';
        if (rating < 60) return 'Fair';
        if (rating < 80) return 'Good';
        if (rating < 90) return 'Very Good';
        return 'Exceptional';
    };

    const formatHotelDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const calculateHotelNights = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 1;
        const start = new Date(checkIn + 'T00:00:00');
        const end = new Date(checkOut + 'T00:00:00');
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays || 1;
    };

    // Helper function to format price in user's preferred currency
    const formatPriceInUserCurrency = (price, currency = 'USD') => {
        if (!price || price === 'Price TBD') return 'Price TBD';

        // Parse price string like "444.94 USD" or use direct number
        let amount, sourceCurrency;
        if (typeof price === 'string') {
            const priceMatch = price.match(/^([\d,]+\.?\d*)\s+([A-Z]{3})$/);
            if (priceMatch) {
                amount = parseFloat(priceMatch[1].replace(/,/g, ''));
                sourceCurrency = priceMatch[2];
            } else {
                // Try to parse as just a number
                amount = parseFloat(price);
                sourceCurrency = currency;
            }
        } else {
            amount = parseFloat(price);
            sourceCurrency = currency;
        }

        if (isNaN(amount)) return 'Price TBD';

        return formatInUserCurrency(amount, sourceCurrency);
    };

    // Get pricing information from hotel data
    const getHotelPricing = () => {
        // Try to get pricing from the new structure first (hotel.offers[0].price)
        if (hotel.offers?.[0]?.price) {
            const priceData = hotel.offers[0].price;
            const totalPrice = priceData?.total;
            const basePrice = priceData?.base;
            const currency = priceData?.currency || 'USD';

            // Calculate taxes and fees
            const taxesAndFees =
                parseFloat(totalPrice || 0) - parseFloat(basePrice || 0);

            return {
                totalPrice: totalPrice,
                currency: currency,
                pricePerNight: basePrice,
                taxesAndFees:
                    taxesAndFees > 0 ? taxesAndFees.toFixed(2) : '0.00',
            };
        }

        // Try to get pricing from the enhanced hotel data (backward compatibility)
        if (hotel.basePrice) {
            const priceData = hotel.basePrice;
            const totalPrice = priceData?.total || priceData;
            const basePrice = priceData?.base || totalPrice;
            const currency = hotel.currency || 'USD';

            // Calculate taxes and fees
            const taxesAndFees = parseFloat(totalPrice) - parseFloat(basePrice);

            return {
                totalPrice: totalPrice,
                currency: currency,
                pricePerNight: basePrice,
                taxesAndFees:
                    taxesAndFees > 0 ? taxesAndFees.toFixed(2) : '0.00',
            };
        }

        // Fallback to original hotel data
        if (hotel.price) {
            const nights = calculateHotelNights(hotel.checkIn, hotel.checkOut);
            const pricePerNight = hotel.pricePerNight || hotel.price / nights;
            const taxesAndFees = hotel.price - pricePerNight;

            return {
                totalPrice: hotel.price,
                currency: hotel.currency || 'USD',
                pricePerNight: pricePerNight,
                taxesAndFees: taxesAndFees,
            };
        }

        return null;
    };

    const pricing = getHotelPricing();

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Hotel Header - Similar to Flights for Coherency */}
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <h3 className="font-bold text-lg text-slate-800">
                            {hotel.hotel?.name || hotel.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            {(hotel.hotel?.chainCode || hotel.chainCode) && (
                                <Badge variant="outline" className="text-xs">
                                    {getHotelChainName(
                                        hotel.hotel?.chainCode ||
                                            hotel.chainCode
                                    )}
                                </Badge>
                            )}
                            {(hotel.offers?.[0]?.policies?.paymentType ===
                                'deposit' ||
                                hotel.paymentType === 'deposit') && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                                    Deposit Required
                                </Badge>
                            )}
                            {(hotel.offers?.[0]?.policies?.paymentType ===
                                'prepay' ||
                                hotel.paymentType === 'prepay') && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                                    Prepay Required
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-teal-600">
                            {pricing &&
                            pricing.totalPrice &&
                            pricing.totalPrice !== 'TBD'
                                ? formatPriceInUserCurrency(
                                      pricing.totalPrice,
                                      pricing.currency
                                  )
                                : 'Price TBD'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Hotel Main Content */}
            <div className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                    {/* Hotel Info - Left Side */}
                    <div className="flex-1 space-y-3">
                        {/* Hotel Location & Rating */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Stars display based on actual rating */}
                                {hotel.ratingUnavailable ? null : (
                                    <div className="flex items-center gap-1">
                                        {Array(
                                            getStarsFromRating(
                                                hotel.ratingData?.rating_data
                                                    ?.overallRating || 81
                                            )
                                        )
                                            .fill()
                                            .map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className="w-4 h-4 text-amber-400 fill-current"
                                                />
                                            ))}
                                    </div>
                                )}

                                {/* Rating display with unavailable fallback */}
                                {hotel.ratingUnavailable ? (
                                    <div className="flex items-center gap-2">
                                        <div className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-sm">
                                            Rating Unavailable
                                        </div>
                                    </div>
                                ) : hotel.ratingData?.rating_data
                                      ?.overallRating ? (
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-2 py-0.5 rounded text-sm font-semibold">
                                            {(
                                                hotel.ratingData.rating_data
                                                    .overallRating / 10
                                            ).toFixed(1)}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">
                                            {getRatingText(
                                                hotel.ratingData.rating_data
                                                    .overallRating
                                            )}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="text-sm text-slate-600">
                                    {getCityName(
                                        hotel.hotel?.cityCode ||
                                            hotel.cityCode ||
                                            hotel.city
                                    )}
                                    ,{' '}
                                    {hotel.hotel?.address?.countryCode ||
                                        hotel.countryCode ||
                                        hotel.country}
                                    {hotel.distanceFromCenter && (
                                        <span className="text-xs text-slate-500">
                                            {' '}
                                            • {hotel.distanceFromCenter} from
                                            center
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Room Type & Details */}
                        <div className="space-y-2 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <Bed className="w-4 h-4 text-teal-600" />
                                <span className="font-medium text-slate-700">
                                    {hotel.roomType === 'TBD'
                                        ? 'Room Type TBD'
                                        : hotel.roomType ||
                                          getRoomTypeName(
                                              hotel.offers?.[0]?.room?.type
                                          ) ||
                                          'Room'}
                                </span>
                                {/* Add bed information next to room type */}
                                {hotel.bedType && hotel.bedType !== 'TBD' && (
                                    <>
                                        <span className="text-slate-500">
                                            •
                                        </span>
                                        <span className="text-sm text-slate-600">
                                            {hotel.bedType}
                                            {hotel.beds &&
                                                hotel.beds > 0 &&
                                                ` (${hotel.beds} bed${
                                                    hotel.beds > 1 ? 's' : ''
                                                })`}
                                        </span>
                                    </>
                                )}
                                {hotel.roomSize && (
                                    <>
                                        <span className="text-slate-500">
                                            •
                                        </span>
                                        <span className="text-sm text-slate-600">
                                            {hotel.roomSize}
                                        </span>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-teal-600" />
                                <span className="text-sm text-slate-600">
                                    {hotel.offers?.[0]?.guests?.adults ||
                                        hotel.numGuests ||
                                        1}{' '}
                                    Adults
                                    {hotel.roomQuantity &&
                                        hotel.roomQuantity > 1 && (
                                            <span className="text-slate-500">
                                                {' '}
                                                • {hotel.roomQuantity} rooms
                                            </span>
                                        )}
                                </span>
                            </div>

                            {/* Board Type - Optional field, only show if present */}
                            {hotel.boardType && (
                                <div className="flex items-center gap-2">
                                    <Utensils className="w-4 h-4 text-teal-600" />
                                    <span className="text-sm text-slate-600">
                                        {hotel.boardType}
                                    </span>
                                </div>
                            )}

                            {/* Category - Optional field, only show if present */}
                            {hotel.category && (
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-slate-600">
                                        {hotel.category} Category
                                    </span>
                                </div>
                            )}

                            {/* Amenities with proper icons */}
                            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                                {hotel.breakfast && (
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                        <Utensils className="w-4 h-4 text-green-600" />
                                        <span>Breakfast included</span>
                                    </div>
                                )}
                                {hotel.wifi && (
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                        <Wifi className="w-4 h-4 text-green-600" />
                                        <span>Free WiFi</span>
                                    </div>
                                )}
                                {hotel.parking && (
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                        <Car className="w-4 h-4 text-green-600" />
                                        <span>{hotel.parking} Parking</span>
                                    </div>
                                )}
                                {hotel.roomAmenities &&
                                    hotel.roomAmenities.length > 0 &&
                                    hotel.roomAmenities
                                        .slice(0, 3)
                                        .map((amenity, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-1.5 text-sm text-slate-600"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                <span>{amenity}</span>
                                            </div>
                                        ))}
                            </div>
                        </div>
                    </div>

                    {/* Price & Details Section - Right Side */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="bg-slate-50/70 rounded-lg p-4 h-full flex flex-col justify-between">
                            <div>
                                <div className="mb-3">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Length of stay
                                    </p>
                                    <p className="font-semibold text-slate-700">
                                        {calculateHotelNights(
                                            hotel.checkIn,
                                            hotel.checkOut
                                        )}{' '}
                                        nights
                                    </p>
                                </div>

                                <div className="mb-3">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Check-in
                                    </p>
                                    <p className="font-semibold text-slate-700">
                                        {formatHotelDate(
                                            hotel.offers?.[0]?.checkInDate ||
                                                hotel.checkIn
                                        )}
                                    </p>
                                </div>

                                <div className="mb-3">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Check-out
                                    </p>
                                    <p className="font-semibold text-slate-700">
                                        {formatHotelDate(
                                            hotel.offers?.[0]?.checkOutDate ||
                                                hotel.checkOut
                                        )}
                                    </p>
                                    {hotel.checkOutTime && (
                                        <p className="text-xs text-slate-500">
                                            Until {hotel.checkOutTime}
                                        </p>
                                    )}
                                </div>

                                {/* Check-in/out times */}
                                {(hotel.checkInTime || hotel.checkOutTime) && (
                                    <div className="mb-3">
                                        <p className="text-xs text-slate-500 font-medium">
                                            Check-in Time
                                        </p>
                                        <p className="font-semibold text-slate-700">
                                            {hotel.checkInTime || 'Standard'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Cancellation Policy */}
                            <div className="pt-3 border-t border-slate-200">
                                <div className="flex items-center gap-2 text-sm">
                                    {(() => {
                                        const cancellationPolicy =
                                            hotel.offers?.[0]?.policies
                                                ?.cancellations?.[0]
                                                ?.description?.text ||
                                            hotel.pricingDetails?.policies
                                                ?.cancellations?.[0]
                                                ?.description?.text ||
                                            hotel.cancellationPolicy;

                                        const isFreeCancellation =
                                            cancellationPolicy
                                                ?.toLowerCase()
                                                .includes('free') ||
                                            cancellationPolicy
                                                ?.toLowerCase()
                                                .includes('refundable');

                                        if (isFreeCancellation) {
                                            return (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                    <span className="text-green-700 font-medium">
                                                        {cancellationPolicy ||
                                                            'Free cancellation'}
                                                    </span>
                                                </>
                                            );
                                        } else {
                                            return (
                                                <>
                                                    <Shield className="w-4 h-4 text-slate-500" />
                                                    <span className="text-slate-600">
                                                        {cancellationPolicy ===
                                                        'TBD'
                                                            ? 'Policy TBD'
                                                            : cancellationPolicy ||
                                                              'Non-refundable'}
                                                    </span>
                                                </>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Guest Reviews Section - New Style */}
                {hotel.ratingData?.rating_data?.overallRating &&
                    !hotel.ratingUnavailable && (
                        <div className="bg-slate-50 rounded-lg p-4 mt-6 space-y-4">
                            <h5 className="font-semibold text-slate-800 text-base">
                                Guest reviews
                            </h5>

                            {/* Overall Rating */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-2.5 py-1 rounded font-semibold text-base">
                                    {(
                                        hotel.ratingData.rating_data
                                            .overallRating / 10
                                    ).toFixed(1)}
                                </div>
                                <p className="font-semibold text-slate-700">
                                    {getRatingText(
                                        hotel.ratingData.rating_data
                                            .overallRating
                                    )}
                                </p>
                                <span className="text-slate-500">•</span>
                                <p className="text-sm text-slate-500">
                                    {hotel.ratingData.rating_data
                                        .numberOfReviews ||
                                        hotel.ratingData.rating_data
                                            .numberOfRatings ||
                                        0}{' '}
                                    reviews
                                </p>
                            </div>

                            {/* Rating Categories */}
                            {hotel.ratingData.rating_data.sentiments && (
                                <div>
                                    <p className="text-sm font-medium text-slate-600 mb-3 mt-4">
                                        Categories:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                                        {Object.entries(
                                            hotel.ratingData.rating_data
                                                .sentiments
                                        ).map(([category, score]) => (
                                            <div key={category}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm text-slate-700 capitalize">
                                                        {category.replace(
                                                            /([A-Z])/g,
                                                            ' $1'
                                                        )}
                                                    </span>
                                                    <span className="text-sm font-semibold text-slate-800">
                                                        {(score / 10).toFixed(
                                                            1
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-500 to-teal-500 h-1.5 rounded-full"
                                                        style={{
                                                            width: `${score}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                {/* Price Breakdown Section */}
                {pricing && (
                    <div className="bg-slate-50 rounded-lg p-4 mt-6 space-y-4">
                        <div>
                            <h5 className="font-medium text-slate-700 text-sm mb-3">
                                Price Breakdown
                            </h5>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">
                                        Base Rate (per night)
                                    </span>
                                    <span className="font-medium text-slate-800">
                                        {(() => {
                                            // Calculate actual per night price
                                            const nights = calculateHotelNights(
                                                hotel.offers?.[0]
                                                    ?.checkInDate ||
                                                    hotel.checkIn,
                                                hotel.offers?.[0]
                                                    ?.checkOutDate ||
                                                    hotel.checkOut
                                            );

                                            // Try to get base price from hotel data first
                                            const basePrice =
                                                hotel.offers?.[0]?.price
                                                    ?.base ||
                                                hotel.pricingDetails?.price
                                                    ?.base ||
                                                hotel.basePrice?.base;

                                            if (basePrice && nights > 0) {
                                                const perNightPrice =
                                                    parseFloat(basePrice) /
                                                    nights;
                                                return formatPriceInUserCurrency(
                                                    perNightPrice.toString(),
                                                    pricing.currency
                                                );
                                            }

                                            // Fallback to existing pricePerNight
                                            return pricing.pricePerNight &&
                                                pricing.pricePerNight !== 'TBD'
                                                ? formatPriceInUserCurrency(
                                                      pricing.pricePerNight,
                                                      pricing.currency
                                                  )
                                                : 'TBD';
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">
                                        Breakfast & Amenities
                                    </span>
                                    <span className="font-medium text-green-600">
                                        {formatCurrency(
                                            0,
                                            getUserPreferredCurrency()
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">
                                        Taxes & Fees
                                    </span>
                                    <span className="font-medium text-slate-800">
                                        {(() => {
                                            // Calculate taxes and fees as the difference between total and base
                                            const totalPrice =
                                                parseFloat(
                                                    pricing.totalPrice
                                                ) || 0;
                                            const basePrice = parseFloat(
                                                hotel.offers?.[0]?.price
                                                    ?.base ||
                                                    hotel.pricingDetails?.price
                                                        ?.base ||
                                                    hotel.basePrice?.base ||
                                                    0
                                            );

                                            if (
                                                totalPrice > 0 &&
                                                basePrice > 0
                                            ) {
                                                const taxesAndFees =
                                                    totalPrice - basePrice;
                                                return taxesAndFees > 0
                                                    ? formatPriceInUserCurrency(
                                                          taxesAndFees.toString(),
                                                          pricing.currency
                                                      )
                                                    : 'Included';
                                            }

                                            // Fallback: try to calculate from individual components
                                            let totalTaxesAndFees = 0;
                                            let hasTaxesOrFees = false;

                                            // Add individual taxes
                                            if (
                                                hotel.taxes &&
                                                hotel.taxes.length > 0
                                            ) {
                                                hotel.taxes.forEach((tax) => {
                                                    if (
                                                        tax.amount &&
                                                        !tax.included
                                                    ) {
                                                        totalTaxesAndFees +=
                                                            parseFloat(
                                                                tax.amount
                                                            ) || 0;
                                                        hasTaxesOrFees = true;
                                                    }
                                                });
                                            }

                                            // Add commission
                                            if (
                                                hotel.commission &&
                                                hotel.commission.amount
                                            ) {
                                                totalTaxesAndFees +=
                                                    parseFloat(
                                                        hotel.commission.amount
                                                    ) || 0;
                                                hasTaxesOrFees = true;
                                            }

                                            // Add excluded taxes
                                            if (
                                                hotel.hasExcludedTaxes &&
                                                hotel.excludedTaxesTotal
                                            ) {
                                                totalTaxesAndFees +=
                                                    parseFloat(
                                                        hotel.excludedTaxesTotal
                                                    ) || 0;
                                                hasTaxesOrFees = true;
                                            }

                                            // Final fallback to existing taxesAndFees
                                            if (
                                                !hasTaxesOrFees &&
                                                pricing.taxesAndFees &&
                                                pricing.taxesAndFees !== '0.00'
                                            ) {
                                                return formatPriceInUserCurrency(
                                                    pricing.taxesAndFees,
                                                    pricing.currency
                                                );
                                            }

                                            return hasTaxesOrFees &&
                                                totalTaxesAndFees > 0
                                                ? formatPriceInUserCurrency(
                                                      totalTaxesAndFees.toString(),
                                                      pricing.currency
                                                  )
                                                : 'Included';
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold">
                                    <span className="text-slate-800">
                                        Total
                                    </span>
                                    <span className="text-slate-800">
                                        {pricing.totalPrice &&
                                        pricing.totalPrice !== 'TBD'
                                            ? formatPriceInUserCurrency(
                                                  pricing.totalPrice,
                                                  pricing.currency
                                              )
                                            : 'TBD'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
