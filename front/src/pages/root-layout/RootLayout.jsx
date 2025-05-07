import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import styles from './rootLayout.module.css';
import NavBar from '../../components/UI/nav-bar/NavBar';
import SideButtons from '../../components/UI/side-buttons/SideButtons';

export default function RootLayout() {
    const rawUserDetails = localStorage.getItem('userDetails');
    const [userDetails, setUserDetails] = useState(rawUserDetails);

    return (
        <div>
            <div className={styles['top-section']}>
                <NavBar
                    userDetails={userDetails}
                    setUserDetails={setUserDetails}
                />
                <SideButtons
                    userDetails={userDetails}
                    setUserDetails={setUserDetails}
                />
            </div>
            <Outlet context={{ handleLogIn: () => setUserDetails(true) }} />
        </div>
    );
}
