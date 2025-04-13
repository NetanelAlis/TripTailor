import ChatTextBox from '../../components/chat-text-box/ChatTextBox';
import styles from './newChat.module.css';


function NewChat() {

  return (
    <>
      <div className={styles['new-chat-container']}>
      
      <div className={styles['button-container']}>
         <button className={styles['sidebar-btn']}>
         <img src="src/assets/images/sidebar.png" alt="Open Sidebar" />
         </button>
         <button className={styles['another-btn']}>
         <img src="src/assets/images/chat-bubble.png" alt="New chat" />
         </button>
      </div>


      <div className={styles['chat-container']}>
        <div className={styles['chat-content']}>
        <img src="/src/assets/images/suiteCaseLogo-removebg-preview.png" alt="Logo" className={styles['suiteCaseLogo']} /><h1 className={styles['chatTitle']}>Let's plan your next vacation</h1>
          <ChatTextBox />
        </div>
      </div>
      </div>
    </>
  );
}

export default NewChat;
