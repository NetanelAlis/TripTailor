import React from 'react';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';

const teamMembers = [
    {
        name: 'Nadir Elmakias',
        role: 'Founder & CEO',
        description: 'Passionate about travel and technology.',
    },
    {
        name: 'Netanel Alis',
        role: 'Lead Developer',
        description: 'Expert in building seamless user experiences.',
    },
    {
        name: 'Nadav Elkayam',
        role: 'Marketing Specialist',
        description: 'Focused on connecting with our users.',
    },
];

export default function TeamSection() {
    return (
        <section id="team" className="relative py-20 md:py-32">
            <div
                className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
                style={{
                    backgroundImage: `url('/images/meet-the-team-bg.jpg')`,
                }}
            />
            <div className="absolute top-0 left-0 w-full h-full bg-black/60" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                        Meet the Team
                    </h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-white/80">
                        The passionate minds behind TripTailor, dedicated to
                        making your travel dreams a reality.
                    </p>
                </motion.div>

                <div className="mt-16 grid md:grid-cols-3 gap-8">
                    {teamMembers.map((member, index) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: 0.1 * index }}
                            className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl text-center"
                        >
                            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                                <Plane className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="mt-6 text-xl font-bold text-slate-800">
                                {member.name}
                            </h3>
                            <p className="mt-1 font-semibold text-blue-600">
                                {member.role}
                            </p>
                            <p className="mt-4 text-slate-500">
                                {member.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
