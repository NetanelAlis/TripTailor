import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User } from '../../Entities/User.js';
import { LogIn, LogOut, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button.jsx';

export default function Navbar() {
    const [user, setUser] = useState(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const userDetails = localStorage.getItem('userDetails');
        if (userDetails) {
            try {
                setUser(JSON.parse(userDetails));
            } catch (error) {
                setUser(null);
            }
        }

        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        await User.logout();
        setUser(null);
        navigate('/');
    };

    const handleLogin = () => {
        const loginUrl = `${import.meta.env.VITE_COGNITO_LOGIN_URL}?client_id=${
            import.meta.env.VITE_COGNITO_CLIENT_ID
        }&response_type=code&scope=email+openid&redirect_uri=${
            import.meta.env.VITE_COGNITO_REDIRECT_URI
        }`;
        window.location.href = loginUrl;
    };

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const navLinks = [
        { to: 'home', label: 'Home' },
        { to: 'about', label: 'About' },
        { to: 'team', label: 'Team' },
    ];

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                isScrolled
                    ? 'bg-white/90 backdrop-blur-sm shadow-md'
                    : 'bg-transparent'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <button
                        onClick={() => scrollToSection('home')}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <img
                            src="/images/logo-without-name.png"
                            alt="TripTailor"
                            className="h-8 md:h-10 w-auto object-contain"
                        />
                        <span
                            className={`font-bold ${
                                isScrolled ? 'text-slate-800' : 'text-white'
                            } text-lg md:text-xl`}
                        >
                            TripTailor
                        </span>
                    </button>

                    <div className="hidden md:flex items-center space-x-3">
                        {navLinks.map((link) => (
                            <button
                                key={link.to}
                                onClick={() => scrollToSection(link.to)}
                                className={`${
                                    isScrolled
                                        ? 'text-slate-600 hover:text-blue-600'
                                        : 'text-white/90 hover:text-white hover:bg-white/20'
                                } text-sm font-semibold cursor-pointer transition-colors rounded-lg px-3 py-1.5`}
                            >
                                {link.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 md:gap-2">
                        {user ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/chat')}
                                    className={`${
                                        isScrolled
                                            ? 'text-slate-600 hover:text-blue-600'
                                            : 'text-white/90 hover:text-white hover:bg-white/20'
                                    } rounded-lg px-2 md:px-3`}
                                    aria-label="Your Trips"
                                >
                                    <MessageSquare className="w-5 h-5 md:mr-2" />
                                    <span className="hidden md:inline">
                                        Your Trips
                                    </span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLogout}
                                    className={`${
                                        isScrolled
                                            ? 'text-slate-600 hover:text-blue-600'
                                            : 'text-white/90 hover:text-white hover:bg-white/20'
                                    } rounded-lg px-2 md:px-3`}
                                    aria-label="Logout"
                                >
                                    <LogOut className="w-5 h-5 md:mr-2" />
                                    <span className="hidden md:inline">
                                        Logout
                                    </span>
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={handleLogin}
                                className={`${
                                    isScrolled
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow rounded-lg px-3'
                                        : 'text-white/90 hover:text-white hover:bg-white/20 rounded-lg px-3'
                                }`}
                            >
                                <LogIn className="w-4 h-4 mr-2" /> Login
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </motion.nav>
    );
}
