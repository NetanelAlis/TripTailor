import React, { useRef, useState, useEffect, useCallback } from 'react';
import './chatTextBox.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlaneDeparture } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

function ChatTextBox({ onSendMessage }) {
  const chatBox = useRef(null);
  const [userInput, setUserInput] = useState('');
  const navigate = useNavigate();
  const [isFocus, setIsFocus] = useState(false);

  const handleSendMessage = useCallback(async () => {
    chatBox.current.style.height = 'auto';
    if (onSendMessage) {
      await onSendMessage(userInput);
      setUserInput('');
    } else {
      setUserInput('');
      navigate('/chat', { state: { userInput } });
    }
  }, [userInput, onSendMessage, navigate]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e?.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    }

    handleKeyDown();
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSendMessage]);

  return (
    <>
      <div className={`chat-box ${isFocus ? 'text-area-focus' : ''}`}>
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
          onFocus={() => {
            setIsFocus(true);
          }}
          onBlur={() => {
            setIsFocus(false);
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
          onClick={handleSendMessage}
        >
          <FontAwesomeIcon icon={faPlaneDeparture} />
        </button>
      </div>
    </>
  );
}

export default ChatTextBox;
