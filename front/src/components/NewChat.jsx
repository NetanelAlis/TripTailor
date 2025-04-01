import React, { useState, useRef } from 'react';
import '../styles/NewChat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlaneDeparture } from '@fortawesome/free-solid-svg-icons';

function NewChat() {
  const [userInput, setUserInput] = useState('');
  const chatBox = useRef(null);

  return (
    <div className="chat-container">
      <div className="chat-content">
        <h1 className="chat-title">Let's plan your next vacation</h1>
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
            onClick={() => {
              chatBox.current.style.height = 'auto';
              setUserInput('');
            }}
          >
            <FontAwesomeIcon icon={faPlaneDeparture} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewChat;
