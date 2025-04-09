import styles from './RootLayout.module.css';
import { Link, Outlet } from 'react-router-dom';

export default function RootLayout() {
  return (
    <>
      <nav className={styles['navbar']}>
        <div className={styles['logo']}>
          <span>Trip Tailor</span>
        </div>

        <ul className={styles['nav-links']}>
          <li>
            <Link to="/" className={styles['nav-link']}>
              Home
            </Link>
          </li>
          <li>
            <a href="#" className={styles['nav-link']}>
              My Trips
            </a>
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
