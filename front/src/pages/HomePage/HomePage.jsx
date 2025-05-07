import styles from './HomePage.module.css';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function HomePage() {
    const signupUrl = `${import.meta.env.VITE_COGNITO_SIGNUP_URL}?client_id=${
        import.meta.env.VITE_COGNITO_CLIENT_ID
    }&response_type=code&scope=email+openid&redirect_uri=${
        import.meta.env.VITE_COGNITO_REDIRECT_URI
    }`;

    const loginUrl = `${import.meta.env.VITE_COGNITO_LOGIN_URL}?client_id=${
        import.meta.env.VITE_COGNITO_CLIENT_ID
    }&response_type=code&scope=email+openid&redirect_uri=${
        import.meta.env.VITE_COGNITO_REDIRECT_URI
    }`;

    const location = useLocation();
    useEffect(() => {
        if (location.hash === '#contact') {
            const element = document.getElementById('meet-the-team');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } else if (location.hash === '') {
            const element = document.getElementById('welcome');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [location]);

    return (
        <div className={styles['home-page']}>
            <header id="welcome" className={styles['welcome']}>
                <div className={styles['container']}>
                    <div className={styles['logo-area']}>
                        <img
                            src="/images/logo.png"
                            alt="TripTailor Logo"
                            className={styles['logo']}
                        />
                    </div>
                    <h1 className={styles['home-page-slogan']}>
                        Your personalized travel planning assistant.
                    </h1>
                    <div className={styles['auth-buttons']}>
                        <a href={signupUrl} rel="noopener noreferrer">
                            <button>Sign Up</button>
                        </a>
                        <a href={loginUrl} rel="noopener noreferrer">
                            <button>Sign In</button>
                        </a>
                    </div>
                </div>
            </header>

            <section className={styles['separator']}></section>

            <section id="about" className={styles['about']}>
                <div className={styles['container']}>
                    <h2>Discover the Magic of TripTailor</h2>
                    <p>
                        TripTailor is your AI-powered travel companion,
                        revolutionizing the way you plan and book vacations.
                        Unlike traditional travel websites, TripTailor offers a
                        personalized, chat-based experience that instantly
                        curates flights, hotels, and attractions based on your
                        preferences. Simply enter your travel details, and our
                        cutting-edge AI will craft a tailor-made itinerary,
                        suggest hidden gems, and even assist with bookings—all
                        in one seamless experience. No more hours of
                        research—just effortless, customized travel planning
                        that feels like magic. Your dream vacation starts here!
                    </p>
                </div>
            </section>

            <section className={styles['separator']}></section>

            <section id="meet-the-team" className={styles['team']}>
                <div className={styles['container']}>
                    <h2>Meet the Team</h2>
                    <div className={styles['team-members']}>
                        <div className={styles['team-member']}>
                            <img
                                src="/images/logo.png"
                                alt="Team Member 1"
                                className={styles['team-photo']}
                            />
                            <h3>John Doe</h3>
                            <p>
                                Founder & CEO. Passionate about travel and
                                technology.
                            </p>
                        </div>
                        <div className={styles['team-member']}>
                            <img
                                src="/images/logo.png"
                                alt="Team Member 2"
                                className={styles['team-photo']}
                            />
                            <h3>Jane Smith</h3>
                            <p>
                                Lead Developer. Expert in building seamless user
                                experiences.
                            </p>
                        </div>
                        <div className={styles['team-member']}>
                            <img
                                src="/images/logo.png"
                                alt="Team Member 3"
                                className={styles['team-photo']}
                            />
                            <h3>Emily Johnson</h3>
                            <p>
                                Marketing Specialist. Focused on connecting with
                                our users.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <footer className={styles['footer']}>
                <div className={styles['container']}>
                    <p>&copy; 2025 TripTailor. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
