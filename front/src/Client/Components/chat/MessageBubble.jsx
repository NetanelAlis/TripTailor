import React from 'react';
import { motion } from 'framer-motion';
import {
    User,
    Sparkles,
    Plane,
    Calendar,
    MapPin,
    DollarSign,
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer.jsx';
import { getAirlineName } from '../../utils/airlineCodes.js';
import {
    formatCurrency,
    convertToUserCurrency,
    getUserPreferredCurrency,
} from '../../utils/currencyConverter.js';

const MessageBubble = ({ message, isTyping = false }) => {
    const isUser = message?.sender === 'user';
    const isSystem = message?.sender === 'system';

    if (isTyping) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex items-start gap-3 px-4 md:px-6 py-4"
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 max-w-2xl">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                        <div
                            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                        />
                        <div
                            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                        />
                    </div>
                </div>
            </motion.div>
        );
    }

    if (isSystem) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex justify-center px-6 py-2"
            >
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full px-4 py-2">
                    <p className="text-sm text-amber-700 font-medium">
                        {message.content}
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full flex items-start gap-3 px-4 md:px-6 py-4 ${
                isUser ? 'flex-row-reverse' : ''
            }`}
        >
            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isUser
                        ? 'bg-gradient-to-r from-slate-600 to-slate-700'
                        : 'bg-gradient-to-r from-blue-600 to-teal-600'
                }`}
            >
                {isUser ? (
                    <User className="w-4 h-4 text-white" />
                ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                )}
            </div>

            {isUser ? (
                <div
                    className={`rounded-2xl px-4 md:px-6 py-3 md:py-4 shadow-sm max-w-2xl bg-gradient-to-r from-slate-600 to-slate-700 text-white ml-auto`}
                >
                    <div className="prose prose-sm md:prose-base prose-invert max-w-none">
                        <p className={`leading-relaxed whitespace-pre-wrap`}>
                            {message?.content}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="max-w-2xl pt-1">
                    {message?.message_type === 'flight_results' ? (
                        <FlightResults data={message.metadata} />
                    ) : message?.message_type === 'hotel_results' ? (
                        <HotelResults data={message.metadata} />
                    ) : (
                        <MarkdownRenderer className="prose-sm md:prose-base text-slate-700">
                            {message?.content || ''}
                        </MarkdownRenderer>
                    )}
                </div>
            )}
        </motion.div>
    );
};

const FlightResults = ({ data }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2 text-blue-600">
            <Plane className="w-4 h-4" />
            <span className="font-semibold">Flight Options</span>
        </div>
        {data?.flights?.map((flight, index) => (
            <div
                key={index}
                className="p-4 rounded-xl bg-blue-50 border border-blue-100"
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold text-slate-800">
                            {getAirlineName(flight.airline)}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {flight.departure_time}
                            </span>
                            <span>→</span>
                            <span>{flight.arrival_time}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {flight.duration}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg text-blue-600">
                            {flight.price && flight.price !== 'Price TBD'
                                ? (() => {
                                      // Parse price string like "444.94 USD"
                                      const priceMatch = flight.price.match(
                                          /^([\d,]+\.?\d*)\s+([A-Z]{3})$/
                                      );
                                      if (priceMatch) {
                                          const amount = parseFloat(
                                              priceMatch[1].replace(/,/g, '')
                                          );
                                          const currency = priceMatch[2];
                                          return formatCurrency(
                                              convertToUserCurrency(
                                                  amount,
                                                  currency
                                              ),
                                              getUserPreferredCurrency()
                                          );
                                      }
                                      return flight.price; // Fallback to original string
                                  })()
                                : 'Price TBD'}
                        </p>
                        <p className="text-xs text-slate-500">per person</p>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const HotelResults = ({ data }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2 text-teal-600">
            <MapPin className="w-4 h-4" />
            <span className="font-semibold">Hotel Options</span>
        </div>
        {data?.hotels?.map((hotel, index) => (
            <div
                key={index}
                className="p-4 rounded-xl bg-teal-50 border border-teal-100"
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold text-slate-800">
                            {hotel.name}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                            {hotel.location}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                            {Array(hotel.stars)
                                .fill()
                                .map((_, i) => (
                                    <span key={i} className="text-amber-400">
                                        ★
                                    </span>
                                ))}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg text-teal-600">
                            {hotel.price && hotel.price !== 'Price TBD'
                                ? (() => {
                                      // Parse price string like "444.94 USD"
                                      const priceMatch = hotel.price.match(
                                          /^([\d,]+\.?\d*)\s+([A-Z]{3})$/
                                      );
                                      if (priceMatch) {
                                          const amount = parseFloat(
                                              priceMatch[1].replace(/,/g, '')
                                          );
                                          const currency = priceMatch[2];
                                          return formatCurrency(
                                              convertToUserCurrency(
                                                  amount,
                                                  currency
                                              ),
                                              getUserPreferredCurrency()
                                          );
                                      }
                                      return hotel.price; // Fallback to original string
                                  })()
                                : 'Price TBD'}
                        </p>
                        <p className="text-xs text-slate-500">per night</p>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export default MessageBubble;
