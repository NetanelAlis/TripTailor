import styles from './RootLayout.module.css';
import { Link, Outlet } from 'react-router-dom';

export default function RootLayout() {
    return (
        <>
            <nav className={styles['navbar']}>
                <Link to="/" className={styles['navbar-logo']}>
                    <div className={styles['logo']}>
                        <img
                            src="src/assets/images/logo-without-name.png"
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
                </ul>
            </nav>
            <Outlet />
        </>
    );
}
