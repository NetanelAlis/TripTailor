import React from 'react';
import { Badge } from '../../../Client/Components/ui/badge';
import { Plane, Clock, Luggage, Shield, Armchair } from 'lucide-react';
import {
    getAirlineName,
    getAirportName,
    getAircraftName,
    getCabinClassName,
    getBaggageDescription,
    formatFlightDuration,
    formatLayoverTime,
} from '../../utils/travelHelpers';
import {
    formatCurrency,
    getUserPreferredCurrency,
    convertToUserCurrency,
} from '../../../Client/utils/currencyConverter';

export default function FlightSummary({ flight, flightIndex }) {
    const flightOffer = flight.pricingData?.data?.flightOffers?.[0];
    const hasReturn = flightOffer?.itineraries?.length > 1;

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            {/* Flight Header */}
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b border-slate-200">
                <div className="flex justify-between items-start">
                    {/* Left: Airline Name and Details */}
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {getAirlineName(
                                flightOffer?.validatingAirlineCodes?.[0] ||
                                    flight.airline
                            )}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            {flightOffer?.lastTicketingDate && (
                                <Badge variant="outline" className="text-xs">
                                    Book by{' '}
                                    {new Date(
                                        flightOffer.lastTicketingDate
                                    ).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                    })}
                                </Badge>
                            )}
                            <Badge
                                variant="outline"
                                className="text-xs uppercase"
                            >
                                {flightOffer?.pricingOptions?.fareType?.[0] ||
                                    'PUBLISHED'}
                            </Badge>
                            {flightOffer?.instantTicketingRequired && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                                    Instant Booking Required
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Right: Price */}
                    <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                            {flightOffer?.price?.total
                                ? formatCurrency(
                                      convertToUserCurrency(
                                          parseFloat(flightOffer.price.total),
                                          flightOffer.price.currency
                                      ),
                                      getUserPreferredCurrency()
                                  )
                                : 'Price TBD'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {/* Flight Itineraries */}
                {flightOffer?.itineraries ? (
                    flightOffer?.itineraries.map(
                        (itinerary, itineraryIndex) => (
                            <div key={itineraryIndex} className="space-y-4">
                                <h4 className="font-medium text-slate-700 text-sm sm:text-base flex items-center gap-2">
                                    <div
                                        className={`w-3 h-3 rounded-full ${
                                            itineraryIndex === 0
                                                ? 'bg-blue-600'
                                                : 'bg-teal-600'
                                        }`}
                                    />
                                    {itineraryIndex === 0
                                        ? 'Outbound Journey'
                                        : 'Return Journey'}
                                </h4>

                                {itinerary.segments?.map(
                                    (segment, segmentIndex) => {
                                        const fareDetails =
                                            flightOffer.travelerPricings?.[0]?.fareDetailsBySegment?.find(
                                                (fd) =>
                                                    fd.segmentId === segment.id
                                            );

                                        return (
                                            <div
                                                key={segment.id || segmentIndex}
                                            >
                                                {/* Flight Segment */}
                                                <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg p-4 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Plane className="w-4 h-4 text-blue-600" />
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-medium text-slate-800">
                                                                        {getAirlineName(
                                                                            segment.carrierCode
                                                                        )}{' '}
                                                                        {
                                                                            segment.number
                                                                        }
                                                                    </span>
                                                                    {segment
                                                                        .aircraft
                                                                        ?.code && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-xs"
                                                                        >
                                                                            {getAircraftName(
                                                                                segment
                                                                                    .aircraft
                                                                                    .code
                                                                            )}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500">
                                                                    Flight{' '}
                                                                    {
                                                                        segment.number
                                                                    }{' '}
                                                                    •{' '}
                                                                    {segment.numberOfStops ===
                                                                    0
                                                                        ? 'Direct flight'
                                                                        : `${segment.numberOfStops} stop(s)`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            {segment
                                                                .co2Emissions?.[0] && (
                                                                <p className="text-xs text-slate-500">
                                                                    CO₂:{' '}
                                                                    {
                                                                        segment
                                                                            .co2Emissions[0]
                                                                            .weight
                                                                    }
                                                                    {
                                                                        segment
                                                                            .co2Emissions[0]
                                                                            .weightUnit
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Departure and Arrival with Line - Responsive */}
                                                    <div className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_1fr] gap-4 sm:gap-6 sm:items-center">
                                                        {/* Departure */}
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                                                <span className="text-sm font-medium text-slate-700">
                                                                    Departure
                                                                </span>
                                                            </div>
                                                            <div className="ml-4 space-y-1">
                                                                <p className="font-semibold text-slate-800 text-base sm:text-lg">
                                                                    {
                                                                        segment
                                                                            .departure
                                                                            .iataCode
                                                                    }
                                                                    {segment
                                                                        .departure
                                                                        .terminal && (
                                                                        <span className="text-sm text-slate-500 ml-2">
                                                                            T
                                                                            {
                                                                                segment
                                                                                    .departure
                                                                                    .terminal
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-sm text-slate-600 leading-tight">
                                                                    {getAirportName(
                                                                        segment
                                                                            .departure
                                                                            .iataCode
                                                                    )}
                                                                </p>
                                                                <p className="text-sm font-medium text-slate-700">
                                                                    {new Date(
                                                                        segment.departure.at
                                                                    ).toLocaleDateString(
                                                                        'en-US',
                                                                        {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                        }
                                                                    )}{' '}
                                                                    at{' '}
                                                                    {new Date(
                                                                        segment.departure.at
                                                                    ).toLocaleTimeString(
                                                                        'en-US',
                                                                        {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                            hour12: false,
                                                                        }
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Line and Duration - Mobile: Vertical, Desktop: Horizontal */}
                                                        <div className="flex flex-col items-center justify-center py-2 sm:py-0">
                                                            <p className="text-sm font-semibold text-slate-600 mb-2 sm:mb-1">
                                                                {formatFlightDuration(
                                                                    segment.duration
                                                                )}
                                                            </p>
                                                            {/* Mobile: Vertical line */}
                                                            <div className="w-px h-8 bg-slate-300 border-l border-slate-300 border-dashed sm:hidden"></div>
                                                            {/* Desktop: Horizontal line */}
                                                            <div className="hidden sm:block w-full h-px bg-slate-300 border-t border-slate-300 border-dashed"></div>

                                                            {/* Baggage and Class Details */}
                                                            {fareDetails && (
                                                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                                                    <div className="flex items-center gap-1">
                                                                        <Luggage className="w-3 h-3" />
                                                                        <span>
                                                                            {getBaggageDescription(
                                                                                fareDetails
                                                                                    .includedCheckedBags
                                                                                    ?.weight,
                                                                                fareDetails
                                                                                    .includedCheckedBags
                                                                                    ?.weightUnit,
                                                                                fareDetails
                                                                                    .includedCheckedBags
                                                                                    ?.quantity
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Armchair className="w-3 h-3" />
                                                                        <span>
                                                                            {getCabinClassName(
                                                                                fareDetails.cabin
                                                                            ) ||
                                                                                'Economy'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Arrival */}
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-teal-600 rounded-full" />
                                                                <span className="text-sm font-medium text-slate-700">
                                                                    Arrival
                                                                </span>
                                                            </div>
                                                            <div className="ml-4 space-y-1">
                                                                <p className="font-semibold text-slate-800 text-base sm:text-lg">
                                                                    {
                                                                        segment
                                                                            .arrival
                                                                            .iataCode
                                                                    }
                                                                    {segment
                                                                        .arrival
                                                                        .terminal && (
                                                                        <span className="text-sm text-slate-500 ml-2">
                                                                            T
                                                                            {
                                                                                segment
                                                                                    .arrival
                                                                                    .terminal
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-sm text-slate-600 leading-tight">
                                                                    {getAirportName(
                                                                        segment
                                                                            .arrival
                                                                            .iataCode
                                                                    )}
                                                                </p>
                                                                <p className="text-sm font-medium text-slate-700">
                                                                    {new Date(
                                                                        segment.arrival.at
                                                                    ).toLocaleDateString(
                                                                        'en-US',
                                                                        {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                        }
                                                                    )}{' '}
                                                                    at{' '}
                                                                    {new Date(
                                                                        segment.arrival.at
                                                                    ).toLocaleTimeString(
                                                                        'en-US',
                                                                        {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                            hour12: false,
                                                                        }
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Connection time (if not last segment) */}
                                                {segmentIndex <
                                                    itinerary.segments.length -
                                                        1 && (
                                                    <div className="flex items-center justify-center py-3">
                                                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                                            <Clock className="w-3 h-3" />
                                                            <span>
                                                                {(() => {
                                                                    const layoverText =
                                                                        formatLayoverTime(
                                                                            itinerary
                                                                                .segments[
                                                                                segmentIndex +
                                                                                    1
                                                                            ]
                                                                                .departure
                                                                                .at,
                                                                            segment
                                                                                .arrival
                                                                                .at
                                                                        );
                                                                    return `${layoverText} layover in ${segment.arrival.iataCode}`;
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )
                    )
                ) : (
                    // Fallback display when no pricing data is available
                    <div className="space-y-4">
                        <h4 className="font-medium text-slate-700 text-sm sm:text-base flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-600" />
                            Flight Details
                        </h4>

                        <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Plane className="w-4 h-4 text-blue-600" />
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-slate-800">
                                                {getAirlineName(flight.airline)}{' '}
                                                Flight {flight.id}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                {getAircraftName(
                                                    flight.aircraft
                                                )}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Flight {flight.id} •{' '}
                                            {flight.stops === 0
                                                ? 'Direct flight'
                                                : `${flight.stops} stop(s)`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {/* CO2 placeholder */}
                                </div>
                            </div>

                            {/* Fallback: From | duration-over-line | To */}
                            <div className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_1fr] gap-4 sm:gap-6 sm:items-center">
                                {/* Departure */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                        <span className="text-sm font-medium text-slate-700">
                                            Departure
                                        </span>
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="font-semibold text-slate-800 text-base sm:text-lg">
                                            {flight.origin}
                                        </p>
                                        <p className="text-sm text-slate-600 leading-tight">
                                            {getAirportName(flight.origin)}
                                        </p>
                                    </div>
                                </div>

                                {/* Center duration/line */}
                                <div className="flex flex-col items-center justify-center py-2 sm:py-0">
                                    <p className="text-sm font-semibold text-slate-600 mb-2 sm:mb-1">
                                        {flight.duration}
                                    </p>
                                    {/* Mobile: Vertical line */}
                                    <div className="w-px h-8 bg-slate-300 border-l border-slate-300 border-dashed sm:hidden"></div>
                                    {/* Desktop: Horizontal line */}
                                    <div className="hidden sm:block w-full h-px bg-slate-300 border-t border-slate-300 border-dashed"></div>
                                </div>

                                {/* Arrival */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-teal-600 rounded-full" />
                                        <span className="text-sm font-medium text-slate-700">
                                            Arrival
                                        </span>
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="font-semibold text-slate-800 text-base sm:text-lg">
                                            {flight.destination}
                                        </p>
                                        <p className="text-sm text-slate-600 leading-tight">
                                            {getAirportName(flight.destination)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Price Breakdown */}
                {flightOffer?.travelerPricings?.[0] && (
                    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                        <h5 className="font-medium text-slate-700 text-sm mb-3">
                            Price Breakdown
                        </h5>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">
                                    Base Fare x{' '}
                                    {flightOffer?.travelerPricings?.length || 1}
                                </span>
                                <span className="font-medium text-slate-800">
                                    {flightOffer?.travelerPricings?.[0]?.price
                                        ?.base
                                        ? formatCurrency(
                                              convertToUserCurrency(
                                                  parseFloat(
                                                      flightOffer
                                                          .travelerPricings[0]
                                                          .price.base
                                                  ),
                                                  flightOffer.price.currency
                                              ),
                                              getUserPreferredCurrency()
                                          )
                                        : formatCurrency(
                                              0,
                                              getUserPreferredCurrency()
                                          )}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">
                                    Baggage Fees x{' '}
                                    {flightOffer?.travelerPricings?.length || 1}
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
                                        const taxesAmount =
                                            (
                                                flightOffer
                                                    ?.travelerPricings?.[0]
                                                    ?.price?.taxes || []
                                            ).reduce(
                                                (sum, tax) =>
                                                    sum +
                                                    parseFloat(tax.amount || 0),
                                                0
                                            ) *
                                            (flightOffer?.travelerPricings
                                                ?.length || 1);
                                        return formatCurrency(
                                            convertToUserCurrency(
                                                taxesAmount,
                                                flightOffer?.price?.currency
                                            ),
                                            getUserPreferredCurrency()
                                        );
                                    })()}
                                </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold">
                                <span className="text-slate-800">Total</span>
                                <span className="text-slate-800">
                                    {flightOffer?.price?.total
                                        ? formatCurrency(
                                              convertToUserCurrency(
                                                  parseFloat(
                                                      flightOffer.price.total
                                                  ),
                                                  flightOffer.price.currency
                                              ),
                                              getUserPreferredCurrency()
                                          )
                                        : 'Price TBD'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
