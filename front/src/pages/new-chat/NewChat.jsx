import ChatTextBox from '../../components/chat-text-box/ChatTextBox';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import styles from './newChat.module.css';

function NewChat() {
    const location = useLocation();
    const first = useRef(false);
    const { handleLogIn } = useOutletContext();

    useEffect(() => {
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

        async function fetchUserDetailsFromCode() {
            let userDetails;
            if (code) {
                tokens = await exchangeCodeForTokens(code);
                if (tokens && tokens.id_token) {
                    userDetails = parseJwt(tokens.id_token);
                }
            }

            return userDetails;
        }

        let tokens;
        const params = new URLSearchParams(location.search);
        const code = params.get('code');

        fetchUserDetailsFromCode()
            .then((userDetails) => {
                localStorage.setItem(
                    'userDetails',
                    JSON.stringify(userDetails)
                );

                handleLogIn();
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }, [handleLogIn]);

    return (
        <>
            <div className={styles['new-chat-container']}>
                <div className={styles['chat-container']}>
                    <div className={styles['chat-content']}>
                        <img
                            src="/images/logo.png"
                            alt="Logo"
                            className={styles['logo']}
                        />
                        <h1 className={styles['chat-title']}>
                            Let's plan your next vacation
                        </h1>
                        <ChatTextBox />
                    </div>
                </div>
            </div>
        </>
    );

    //   return (
    //     <>
    //       <div className="chat-container">
    //         <div className="chat-content">
    //           <h1 className="chat-title">Let's plan your next vacation</h1>
    //           <ChatTextBox />
    //         </div>
    //       </div>
    //     </>
    //   );
}

export default NewChat;
