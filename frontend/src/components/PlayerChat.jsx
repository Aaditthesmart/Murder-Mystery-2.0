import { useEffect, useRef, useState } from 'react';
import { playTTS } from '../utils/tts';
import './PlayerChat.css';

function PlayerChat({ socket, roomCode, username }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit('enterPlayerChat', { roomCode });

    function handleHistory(data) {
      if (!data?.messages) return;
      setMessages(data.messages);
    }

    function handleMessage(message) {
      if (!message) return;
      setMessages(prev => [...prev, message]);
      playTTS(message.message);
    }

    socket.on('playerChatHistory', handleHistory);
    socket.on('playerChatMessage', handleMessage);

    return () => {
      socket.off('playerChatHistory', handleHistory);
      socket.off('playerChatMessage', handleMessage);
    };
  }, [socket, roomCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    socket.emit('sendPlayerChatMessage', { roomCode, message: inputMessage });
    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="player-chat">
      <div className="player-chat-header">
        Team Comms
      </div>
      <div className="player-chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id || `${msg.timestamp}-${msg.sender}`}
            className={msg.sender === username ? 'player-chat-row me' : 'player-chat-row'}
          >
            <div className="player-chat-sender">{msg.sender}</div>
            <div className="player-chat-text">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="player-chat-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Message your partner"
        />
        <button onClick={sendMessage} disabled={!inputMessage.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

export default PlayerChat;
