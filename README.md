# Multiplayer Game with React & Socket.IO

A real-time multiplayer game built with React and Socket.IO, featuring Among Us-style room lobbies and multiplayer gameplay.

## Features

- 🎮 **Room-based Multiplayer**: Create or join rooms with unique codes
- 👥 **2-Player Support**: Play with a friend in the same room
- 🚶 **Real-time Movement**: See other players move in real-time
- 🗺️ **Collision Detection**: Navigate around obstacles on the map
- 🎨 **Beautiful UI**: Modern gradient design with smooth animations

## Project Structure

```
kajukatli/
├── backend/
│   ├── server.js          # Socket.IO server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Lobby.jsx      # Room creation/joining
│   │   │   ├── Lobby.css
│   │   │   ├── Game.jsx       # Main game component
│   │   │   └── Game.css
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   │   ├── img/
│   │   │   ├── kajukatli-map.png
│   │   │   ├── kajukatli-map-foreground.png
│   │   │   └── ninja.png
│   │   └── data/
│   │       └── collisions.js
│   ├── package.json
│   ├── vite.config.js
│   └── index-react.html
└── README.md
```

## Installation & Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will run on `http://localhost:3001`

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## How to Play

### Creating a Room

1. Open `http://localhost:5173` in your browser
2. Click "Create Room"
3. Enter your username
4. You'll receive a unique 6-character room code
5. Share this code with your friend

### Joining a Room

1. Open `http://localhost:5173` in another browser window/tab
2. Click "Join Room"
3. Enter your username
4. Enter the room code from the host
5. Click "Join Room"

### Starting the Game

1. Once both players are in the room, the host can click "Start Game"
2. Both players will see the game map
3. Use **W, A, S, D** keys to move your character
4. You'll see your friend's character moving in real-time!

## Game Controls

- **W** - Move Up
- **A** - Move Left
- **S** - Move Down
- **D** - Move Right

## Technical Details

### Backend (Socket.IO)

The backend uses Socket.IO to handle:
- Room creation and management
- Player join/leave events
- Real-time position synchronization
- Game state management

### Frontend (React + Vite)

The frontend uses:
- **React** for component-based UI
- **Socket.IO Client** for real-time communication
- **HTML Canvas** for game rendering
- **Vite** for fast development and building

### Key Features

1. **Room Management**: Unique room codes, host controls, player limits
2. **Real-time Sync**: Player positions updated 60 times per second
3. **Collision Detection**: Prevents players from walking through walls
4. **Sprite Animation**: Animated walking sprites in 4 directions
5. **Username Display**: See player names above their characters

## Troubleshooting

### Server won't start
- Make sure port 3001 is not in use
- Check that all dependencies are installed (`npm install`)

### Can't connect to server
- Verify the backend is running on port 3001
- Check the Socket.IO URL in `frontend/src/components/Lobby.jsx`

### Images not loading
- Ensure all image files are in `frontend/public/img/`
- Check that `collisions.js` is in `frontend/public/data/`
- Make sure file paths are correct

### Players not syncing
- Check browser console for errors
- Verify both players are in the same room
- Make sure the game has been started by the host

## Future Enhancements

- [ ] Support for more than 2 players
- [ ] Chat system
- [ ] Different character skins
- [ ] Game objectives/tasks
- [ ] Mobile support with touch controls
- [ ] Sound effects and background music

## Technologies Used

- **React** 18.2
- **Socket.IO** 4.7
- **Express** 4.18
- **Vite** 5.0
- **HTML5 Canvas**

## License

MIT License - Feel free to use this project for learning and fun!
# Murder-Mystery-9Hacks
