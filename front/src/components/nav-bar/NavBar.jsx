import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded';
import styles from './navBar.module.css';
import NewChatButton from '../new-chat-button/newChatButton';

export default function NavBar({
    userDetails,
    pathname,
    sideBarOpen,
    setSideBarOpen,
}) {
    const isHome = pathname === '/';

    const logoutUrl = `${import.meta.env.VITE_COGNITO_LOGOUT_URL}?client_id=${
        import.meta.env.VITE_COGNITO_CLIENT_ID
    }&logout_uri=${import.meta.env.VITE_COGNITO_LOGOUT_REDIRECT_URI}`;

    const loginUrl = `${import.meta.env.VITE_COGNITO_LOGIN_URL}?client_id=${
        import.meta.env.VITE_COGNITO_CLIENT_ID
    }&response_type=code&scope=email+openid&redirect_uri=${
        import.meta.env.VITE_COGNITO_REDIRECT_URI
    }`;

    const buttonStyle = {
        borderRadius: '8px',
        minWidth: 0,
        width: 48,
        height: 48,
        boxShadow: 'none',
        padding: 0,
        '&:hover': {
            color: '#062c56',
            backgroundColor: '#0f8bd245',
        },
        '&:focus': {
            outline: 'none',
        },
    };

    function handleOpenSidebar() {
        //TODO: Add logic to open the sidebar
        // make a request to the backend to get the list of chats
        // from the logged-in user
        // and then update the state to show the sidebar
        // if there is no user logged in, show empty sidebar
        // if there is a user logged in, show the list of chats
        // and set the active chat to the first one in the list
        // if there are no chats, show empty sidebar
        // and set the active chat to null
    }

    return (
        <nav className={!isHome ? styles['navbar'] : styles['navbar-home']}>
            <ul className={styles['navbar-left']}>
                <li className={styles['navbar-left-item']}>
                    <div className={styles['navbar-left-group']}>
                        {sideBarOpen && (
                            <Button
                                sx={{
                                    ...buttonStyle,
                                }}
                                onClick={() => setSideBarOpen(false)}
                            >
                                <ViewSidebarRoundedIcon
                                    sx={{ color: '#062c56', fontSize: 28 }}
                                />
                            </Button>
                        )}
                        {!sideBarOpen && (
                            <Button
                                sx={{
                                    ...buttonStyle,
                                }}
                                onClick={() => {
                                    setSideBarOpen(true);
                                    handleOpenSidebar();
                                }}
                            >
                                <ViewSidebarRoundedIcon
                                    sx={{ color: '#062c56', fontSize: 28 }}
                                />
                            </Button>
                        )}
                        <NewChatButton />
                        <Link to="/" className={styles['navbar-logo']}>
                            <div className={styles['logo']}>
                                <img
                                    src="/images/logo-without-name.png"
                                    alt="TripTailor Logo"
                                    className={styles['logo-image']}
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
