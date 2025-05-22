import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './rootLayout.module.css';
import NavBar from '../../components/nav-bar/NavBar';
import Sidebar from '../../components/sidebar/Sidebar';

export default function RootLayout() {
  const location = useLocation();
  let parsedUserDetails = null;
  const [activeChat, setActiveChat] = useState(1);

  try {
    const rawUserDetails = localStorage.getItem('userDetails');
    if (rawUserDetails && rawUserDetails !== 'undefined') {
      parsedUserDetails = JSON.parse(rawUserDetails);
    }
  } catch (e) {
    console.error('Failed to parse userDetails from localStorage:', e);
  }

  const [userDetails, setUserDetails] = useState(parsedUserDetails);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isLoggedOut = params.get('loggedOut') === 'true';

    if (isLoggedOut) {
      localStorage.removeItem('userDetails');
      setUserDetails(false);
    }
  }, [location.search]);

  const [sideBarOpen, setSideBarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <Sidebar
          open={sideBarOpen}
          setOpen={setSideBarOpen}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
        />
        <main
          className={
            sideBarOpen ? styles['side-bar-open'] : styles['side-bar-closed']
          }
        >
          <div className={styles['top-section']}>
            <NavBar
              userDetails={userDetails}
              pathname={location.pathname}
              sideBarOpen={sideBarOpen}
              setSideBarOpen={setSideBarOpen}
            />
          </div>

          <div className={styles.content}>
            <Outlet
              context={{
                handleLogIn: (details) => setUserDetails(details),
              }}
              activeChat={activeChat}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
