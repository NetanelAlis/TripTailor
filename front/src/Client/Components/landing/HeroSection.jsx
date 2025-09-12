import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button.jsx';
import { LogIn, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HeroSection() {
    const [user, setUser] = useState(null);
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
    }, []);

    const handleLogin = () => {
        const loginUrl = `${import.meta.env.VITE_COGNITO_LOGIN_URL}?client_id=${
            import.meta.env.VITE_COGNITO_CLIENT_ID
        }&response_type=code&scope=email+openid&redirect_uri=${
            import.meta.env.VITE_COGNITO_REDIRECT_URI
        }`;
        window.location.href = loginUrl;
    };

    const handleSignUp = () => {
        const signupUrl = `${
            import.meta.env.VITE_COGNITO_SIGNUP_URL
        }?client_id=${
            import.meta.env.VITE_COGNITO_CLIENT_ID
        }&response_type=code&scope=email+openid&redirect_uri=${
            import.meta.env.VITE_COGNITO_REDIRECT_URI
        }`;
        window.location.href = signupUrl;
    };

    return (
        <section
            id="home"
            className="relative h-screen flex items-center justify-center text-center text-white overflow-hidden"
        >
            <div
                className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url('/images/welcome-bg.jpg')` }}
            />
            <div className="absolute top-0 left-0 w-full h-full bg-black/50" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 space-y-6 md:space-y-8"
            >
                <img
                    src="/images/logo.png"
                    alt="TripTailor"
                    className="w-40 h-40 md:w-52 md:h-52 object-contain mx-auto drop-shadow-xl mt-4"
                />
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                    Your AI Travel Companion
                </h1>
                <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/80">
                    Plan your perfect trip with the power of AI. From flights to
                    hidden gems, we've got you covered.
                </p>
                <div className="flex justify-center gap-4">
                    {user ? (
                        <Button
                            size="lg"
                            className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-lg px-8"
                            onClick={() => navigate('/chat?new=true')}
                        >
                            <MessageSquare className="w-5 h-5 mr-2" /> Plan a
                            New Trip
                        </Button>
                    ) : (
                        <>
                            <Button
                                size="lg"
                                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-lg px-8"
                                onClick={handleSignUp}
                            >
                                Sign Up
                            </Button>
                            <Button
                                size="lg"
                                variant="ghost"
                                className="text-white/90 hover:text-white hover:bg-white/20 rounded-lg px-3"
                                onClick={handleLogin}
                            >
                                <LogIn className="w-4 h-4 mr-2" /> Sign In
                            </Button>
                        </>
                    )}
                </div>
            </motion.div>
        </section>
    );
}
