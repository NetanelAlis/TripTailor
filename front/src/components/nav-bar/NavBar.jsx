import { Link } from 'react-router-dom';
import styles from './navBar.module.css';
import SideButtons from '../side-buttons/SideButtons';

export default function NavBar({ userDetails, setUserDetails }) {
    const logoutUrl = `${import.meta.env.VITE_COGNITO_LOGOUT_URL}?client_id=${
        import.meta.env.VITE_COGNITO_CLIENT_ID
    }&logout_uri=${import.meta.env.VITE_COGNITO_LOGOUT_REDIRECT_URI}`;

    const loginUrl = `${import.meta.env.VITE_COGNITO_LOGIN_URL}?client_id=${
        import.meta.env.VITE_COGNITO_CLIENT_ID
    }&response_type=code&scope=email+openid&redirect_uri=${
        import.meta.env.VITE_COGNITO_REDIRECT_URI
    }`;

    return (
        <nav className={styles['navbar']}>
            <ul className={styles['navbar-left']}>
                <li className={styles['navbar-left-item']}>
                    <div className={styles['navbar-left-group']}>
                        <SideButtons />
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
                    </div>
                </li>
            </ul>

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
                    <Link to="/#contact" className={styles['nav-link']}>
                        Contact
                    </Link>
                </li>
                {userDetails ? (
                    <li>
                        <a href={logoutUrl} className={styles['nav-link']}>
                            Log Out
                        </a>
                    </li>
                ) : (
                    <li>
                        <a href={loginUrl} className={styles['nav-link']}>
                            Login
                        </a>
                    </li>
                )}
            </ul>
        </nav>
    );
}
