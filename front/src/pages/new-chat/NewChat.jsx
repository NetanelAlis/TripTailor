import ChatTextBox from '../../components/chat-text-box/ChatTextBox';
import './NewChat.css';

function NewChat() {
  return (
    <div className="chat-container">
      <div className="chat-content">
        <h1 className="chat-title">Let's plan your next vacation</h1>
        <ChatTextBox />
      </div>
    </div>
  );
}

export default NewChat;
