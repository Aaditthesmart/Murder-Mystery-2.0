import { useState } from 'react';
import { io } from 'socket.io-client';
import './Lobby.css';

const socket = io('https://murder-mystery-9hacks-production.up.railway.app/');

function Lobby({ onJoinGame }) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState('menu'); // 'menu', 'create', 'join'

  const handleCreateRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    socket.emit('createRoom', { username });
    
    socket.once('roomCreated', ({ roomCode }) => {
      onJoinGame(roomCode, username, true);
    });

    socket.once('error', ({ message }) => {
      setError(message);
    });
  };

  const handleJoinRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    socket.emit('joinRoom', { roomCode: roomCode.toUpperCase(), username });
    
    socket.once('roomJoined', ({ roomCode }) => {
      onJoinGame(roomCode, username, false);
    });

    socket.once('error', ({ message }) => {
      setError(message);
    });
  };

  return (
    <div className="lobby">
      <div className="lobby-container">
        <h1>Murder Mystery</h1>
        
        <div className="status-indicator">
          <span className="status-dot"></span>
          Connected
        </div>

        {error && <div className="error">{error}</div>}

        {view === 'menu' ? (
          <div className="menu">
            <button className="btn btn-primary" onClick={() => setView('create')}>
              CREATE ROOM
            </button>
            <button className="btn" onClick={() => setView('join')}>
              JOIN ROOM
            </button>
          </div>
        ) : view === 'create' ? (
          <div className="form">
            <input 
              type="text" 
              placeholder="ENTER USERNAME" 
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleCreateRoom}>
              CREATE ROOM
            </button>
            <button className="btn btn-back" onClick={() => setView('menu')}>
              BACK
            </button>
          </div>
        ) : (
          <div className="form">
            <input 
              type="text" 
              placeholder="ENTER USERNAME" 
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
            />
            <input 
              type="text" 
              placeholder="ENTER ROOM CODE" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleJoinRoom}>
              JOIN ROOM
            </button>
            <button className="btn btn-back" onClick={() => setView('menu')}>
              BACK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Lobby;
export { socket };
