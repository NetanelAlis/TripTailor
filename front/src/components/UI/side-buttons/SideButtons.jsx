import styles from './sideButtons.module.css';

export default function SideButtons() {
    const loginUrl = `${import.meta.env.VITE_COGNITO_LOGIN_URL}?client_id=${
        import.meta.env.VITE_COGNITO_CLIENT_ID
    }&response_type=code&scope=email+openid&redirect_uri=${
        import.meta.env.VITE_COGNITO_REDIRECT_URI
    }`;

    function handleNewChatClick() {
        if (!localStorage.getItem('userDetails')) {
            window.location.href = loginUrl;
            return;
        }

        // TODO: Add logic to create a new chat
        // send a request to the backend to create a new chat
        // and then redirect to the new chat page
        window.location.href = `${import.meta.env.VITE_COGNITO_REDIRECT_URI}`;
    }

    return (
        <div className={styles['button-container']}>
            <button className={styles['sidebar-btn']}>
                <img src="/images/sidebar.png" alt="Open Sidebar" />
            </button>

            <button
                className={styles['new-chat-btn']}
                onClick={handleNewChatClick}
            >
                <img src="/images/new-chat.png" alt="New chat" />
            </button>
        </div>
    );
}
