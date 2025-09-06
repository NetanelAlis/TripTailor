import React from 'react';
import { motion } from 'framer-motion';
import { Plane, Map, BrainCircuit } from 'lucide-react';

const features = [
    {
        icon: BrainCircuit,
        title: 'Intelligent Planning',
        description:
            'Our AI understands your preferences to build a truly personalized itinerary just for you.',
    },
    {
        icon: Plane,
        title: 'Flight & Hotel Search',
        description:
            'Find the best deals on flights and hotels through a simple conversation. No more endless searching.',
    },
    {
        icon: Map,
        title: 'Discover Hidden Gems',
        description:
            'Go beyond the tourist traps. We recommend unique spots and local favorites.',
    },
];

export default function AboutSection() {
    return (
        <section
            id="about"
            className="py-20 md:py-32 bg-gradient-to-b from-slate-50 to-blue-50"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                        Revolutionizing Travel Planning
                    </h2>
                    <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600">
                        TripTailor is more than a booking site. It's your
                        personal travel expert, available 24/7. Stop planning,
                        start experiencing.
                    </p>
                </motion.div>

                <div className="mt-16 grid md:grid-cols-3 gap-8 md:gap-12">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: 0.1 * index }}
                            className="p-8 bg-white rounded-2xl shadow-lg"
                        >
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto">
                                <feature.icon className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="mt-6 text-xl font-semibold text-slate-800">
                                {feature.title}
                            </h3>
                            <p className="mt-2 text-slate-500">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
