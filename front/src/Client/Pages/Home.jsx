import React from 'react';
import Navbar from '../Components/landing/Navbar.jsx';
import HeroSection from '../Components/landing/HeroSection.jsx';
import AboutSection from '../Components/landing/AboutSection.jsx';
import TeamSection from '../Components/landing/TeamSection.jsx';

export default function HomePage() {
    return (
        <div className="bg-white">
            <style>{`
            html {
                scroll-behavior: smooth;
            }
        `}</style>
            <Navbar />
            <main>
                <HeroSection />
                <AboutSection />
                <TeamSection />
            </main>
            <footer className="bg-slate-800 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
                    <p>
                        &copy; {new Date().getFullYear()} TripTailor. All rights
                        reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
