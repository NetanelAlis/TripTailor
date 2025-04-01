import React, { useRef, useState } from 'react';
import './chatTextBox.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlaneDeparture } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

function ChatTextBox({ onSendMessage }) {
  const chatBox = useRef(null);
  const [userInput, setUserInput] = useState('');
  const navigate = useNavigate();

  return (
    <>
      <div className="chat-box">
        <textarea
          className="chat-input"
          placeholder="Ask anything"
          rows="1"
          ref={chatBox}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
            setUserInput(e.target.value);
          }}
          value={userInput}
        />
      </div>
      <div className="chat-footer">
        <button
          className={
            userInput !== ''
              ? 'chat-submit send-button'
              : 'chat-submit-disabled send-button'
          }
          onClick={async () => {
            chatBox.current.style.height = 'auto';
            if (onSendMessage) {
              await onSendMessage(userInput);
              setUserInput('');
            } else {
              setUserInput('');
              navigate('/chat', { state: { userInput } });
            }
          }}
        >
          <FontAwesomeIcon icon={faPlaneDeparture} />
        </button>
      </div>
    </>
  );
}

export default ChatTextBox;
