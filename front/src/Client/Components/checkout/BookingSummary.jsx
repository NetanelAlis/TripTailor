import React from 'react';
import { motion } from 'framer-motion';
import { Plane, CheckCircle2 } from 'lucide-react';
import {
    formatCurrency,
    getUserPreferredCurrency,
} from '../../../Client/utils/currencyConverter';
import FlightSummary from './FlightSummary';
import HotelSummary from './HotelSummary';

export default function BookingSummary({
    enhancedFlights,
    enhancedHotels,
    totalPrice,
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                    <Plane className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">
                    Booking Summary
                </h2>
            </div>

            <div className="space-y-6 sm:space-y-8">
                {/* Flights Section */}
                {enhancedFlights.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2 text-lg">
                            <Plane className="w-5 h-5 text-blue-600" />
                            Flights ({enhancedFlights.length})
                        </h3>
                        {enhancedFlights.map((flight, flightIndex) => (
                            <FlightSummary
                                key={flight.id}
                                flight={flight}
                                flightIndex={flightIndex}
                            />
                        ))}
                    </div>
                )}

                {/* Hotels Section */}
                {enhancedHotels.length > 0 && (
                    <div className="space-y-4 sm:space-y-6">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2 text-lg">
                            <svg
                                className="w-5 h-5 text-teal-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                            Hotels ({enhancedHotels.length})
                        </h3>
                        {enhancedHotels.map((hotel) => (
                            <HotelSummary key={hotel.id} hotel={hotel} />
                        ))}
                    </div>
                )}
            </div>

            {/* Total - Mobile Optimized */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-xl font-semibold text-slate-800">
                        Total Amount
                    </span>
                    <span className="text-2xl font-bold text-slate-800">
                        {formatCurrency(totalPrice, getUserPreferredCurrency())}
                    </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                    Includes all taxes and fees • Prices may vary by currency
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>Secure payment processing</span>
                </div>
            </div>
        </motion.div>
    );
}
