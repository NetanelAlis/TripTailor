import React, { useRef, useState } from 'react';
import './ChatTextBox.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlaneDeparture } from '@fortawesome/free-solid-svg-icons';

function ChatTextBox() {
  const chatBox = useRef(null);
  const [userInput, setUserInput] = useState('');

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
          onClick={() => {
            chatBox.current.style.height = 'auto';
            setUserInput('');
          }}
        >
          <FontAwesomeIcon icon={faPlaneDeparture} />
        </button>
      </div>
    </>
  );
}

export default ChatTextBox;
