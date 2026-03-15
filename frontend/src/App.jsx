import { useState } from 'react';
import Lobby from './components/Lobby';
import Game from './components/Game';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('lobby'); // 'lobby' or 'game'
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [isHost, setIsHost] = useState(false);

  const handleJoinGame = (code, user, host) => {
    setRoomCode(code);
    setUsername(user);
    setIsHost(host);
    setGameState('game');
  };

  const handleLeaveGame = () => {
    setGameState('lobby');
    setRoomCode('');
    setUsername('');
    setIsHost(false);
  };

  return (
    <div className="app">
      {gameState === 'lobby' ? (
        <Lobby onJoinGame={handleJoinGame} />
      ) : (
        <Game 
          roomCode={roomCode} 
          username={username} 
          isHost={isHost}
          onLeave={handleLeaveGame}
        />
      )}
    </div>
  );
}

export default App;
