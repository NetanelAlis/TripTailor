import React from 'react';
import { motion } from 'framer-motion';
import {
    Sparkles,
    Plane,
    MapPin,
    Calendar,
    Users,
    DollarSign,
} from 'lucide-react';

const WelcomeScreen = ({ onQuickStart }) => {
    const quickStartOptions = [
        {
            icon: Plane,
            title: 'Weekend Getaway',
            subtitle: '2-3 days nearby',
            color: 'from-blue-500 to-blue-600',
            action: 'I want to plan a weekend getaway for 2-3 days somewhere nearby',
        },
        {
            icon: MapPin,
            title: 'Dream Destination',
            subtitle: 'Week-long adventure',
            color: 'from-teal-500 to-teal-600',
            action: 'Help me plan a week-long trip to my dream destination',
        },
        {
            icon: Calendar,
            title: 'Business Trip',
            subtitle: 'Efficient & comfortable',
            color: 'from-slate-500 to-slate-600',
            action: 'I need to plan an efficient business trip',
        },
        {
            icon: Users,
            title: 'Family Vacation',
            subtitle: 'Fun for everyone',
            color: 'from-purple-500 to-purple-600',
            action: "Plan a family vacation that's fun for everyone",
        },
    ];

    const features = [
        {
            icon: Plane,
            title: 'Flight Search',
            description: 'Find the best flights with smart price comparisons',
        },
        {
            icon: MapPin,
            title: 'Hotel Booking',
            description: 'Discover perfect stays from budget to luxury',
        },
        {
            icon: Calendar,
            title: 'Itinerary Planning',
            description: 'AI-powered day-by-day trip planning',
        },
        {
            icon: DollarSign,
            title: 'Budget Optimization',
            description: 'Smart recommendations within your budget',
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8 md:space-y-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4 md:space-y-6"
                >
                    <div className="relative inline-block">
                        <img
                            src="/images/logo-without-name.png"
                            alt="TripTailor"
                            className="w-24 h-24 md:w-28 md:h-28 object-contain mx-auto drop-shadow-xl"
                        />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
                            Welcome to TripTailor
                        </h1>
                        <p className="text-lg md:text-xl text-slate-600 mt-2 md:mt-4 max-w-2xl mx-auto leading-relaxed">
                            Your AI travel companion. Plan perfect trips through
                            natural conversation.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-6"
                >
                    <h2 className="text-2xl font-bold text-center text-slate-800">
                        Quick Start
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {quickStartOptions.map((option, index) => (
                            <motion.button
                                key={option.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                                onClick={() => onQuickStart(option.action)}
                                className="group p-6 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-lg transition-all duration-300 text-left"
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`w-12 h-12 rounded-xl bg-gradient-to-r ${option.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                                    >
                                        <option.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                            {option.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {option.subtitle}
                                        </p>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-6"
                >
                    <h2 className="text-xl md:text-2xl font-bold text-center text-slate-800">
                        What I Can Help You With
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                className="text-center space-y-4 p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100"
                            >
                                <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-teal-100 rounded-xl flex items-center justify-center mx-auto">
                                    <feature.icon className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-center p-8 bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl border border-blue-100"
                >
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                        Ready to start planning?
                    </h3>
                    <p className="text-slate-600">
                        Just start typing below! Tell me about your travel
                        dreams, budget, dates, or any questions you have.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
