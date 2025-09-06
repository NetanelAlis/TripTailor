import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const first = useRef(false);

    useEffect(() => {
        if (!location.search.includes('code=')) {
            navigate('/');
            return;
        }
        if (first.current) return;
        first.current = true;

        function parseJwt(token) {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(function (c) {
                        return (
                            '%' +
                            ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                        );
                    })
                    .join('')
            );
            return JSON.parse(jsonPayload);
        }

        async function exchangeCodeForTokens(code) {
            const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
            const clientSecret = import.meta.env.VITE_COGNITO_CLIENT_SECRET;
            const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI;
            const tokenUrl = import.meta.env.VITE_COGNITO_TOKEN_URL;

            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                redirect_uri: redirectUri,
                code: code,
            });

            try {
                const response = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Authorization:
                            'Basic ' + btoa(`${clientId}:${clientSecret}`),
                    },
                    body,
                });

                if (response.ok) {
                    const data = await response.json();
                    return data;
                } else {
                    throw new Error('Failed to exchange code for tokens');
                }
            } catch (error) {
                console.error('Error exchanging code:', error);
            }
        }

        async function handleAuthentication() {
            const params = new URLSearchParams(location.search);
            const code = params.get('code');

            if (code) {
                try {
                    const tokens = await exchangeCodeForTokens(code);
                    if (tokens && tokens.id_token) {
                        const userDetails = parseJwt(tokens.id_token);
                        localStorage.setItem(
                            'userDetails',
                            JSON.stringify(userDetails)
                        );
                        navigate('/chat');
                    } else {
                        console.error('No tokens received');
                        navigate('/');
                    }
                } catch (error) {
                    console.error('Authentication error:', error);
                    navigate('/');
                }
            } else {
                navigate('/');
            }
        }

        handleAuthentication();
    }, [location, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Completing Authentication...
                </h2>
                <p className="text-gray-500">
                    Please wait while we set up your account.
                </p>
            </div>
        </div>
    );
}
