import styles from './newChatButton.module.css';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import { useNavigate } from 'react-router-dom';

export default function NewChatButton() {
  const navigate = useNavigate();
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
    navigate('/new-chat', { state: { newChatClicked: true } });
  }

  return (
    <div className={styles['button-container']}>
      <button className={styles['new-chat-btn']} onClick={handleNewChatClick}>
        <AddCircleOutlineRoundedIcon sx={{ color: '#062c56', fontSize: 28 }} />
      </button>
    </div>
  );
}
