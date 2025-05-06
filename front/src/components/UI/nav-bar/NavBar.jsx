import { Link } from 'react-router-dom';
import styles from './navBar.module.css';

export default function NavBar({ userDetails, setUserDetails }) {
    const logoutUrl = `${import.meta.env.VITE_COGNITO_LOGOUT_URL}?client_id=${
        import.meta.env.VITE_COGNITO_CLIENT_ID
    }&logout_uri=${import.meta.env.VITE_COGNITO_LOGOUT_REDIRECT_URI}`;

    return (
        <nav className={styles['navbar']}>
            <Link to="/" className={styles['navbar-logo']}>
                <div className={styles['logo']}>
                    <img
                        src="/images/logo-without-name.png"
                        alt="TripTailor Logo"
                    />
                    <span className={styles['navbar-website-name']}>
                        Trip Tailor
                    </span>
                </div>
            </Link>

            <ul className={styles['nav-links']}>
                <li>
                    <Link to="/" className={styles['nav-link']}>
                        Home
                    </Link>
                </li>
                <li>
                    <Link to="/new-chat" className={styles['nav-link']}>
                        My Trips
                    </Link>
                </li>
                <li>
                    <a href="#" className={styles['nav-link']}>
                        Destinations
                    </a>
                </li>
                <li>
                    <a href="#" className={styles['nav-link']}>
                        Hotels
                    </a>
                </li>
                <li>
                    <a href="#" className={styles['nav-link']}>
                        Attractions
                    </a>
                </li>
                <li>
                    <a href="#" className={styles['nav-link']}>
                        Contact
                    </a>
                </li>
                {userDetails && (
                    <li>
                        <a
                            href={logoutUrl}
                            className={styles['nav-link']}
                            onClick={() => {
                                setUserDetails(false);
                                localStorage.removeItem('userDetails');
                            }}
                        >
                            Log Out
                        </a>
                    </li>
                )}
            </ul>
        </nav>
    );
}
