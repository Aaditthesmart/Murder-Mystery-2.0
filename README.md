# 🔍 Murder Mystery AI: The Case of the Infinite Killer

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Networking-Socket.io-010101?logo=socket.io)](https://socket.io/)
[![AI Powered](https://img.shields.io/badge/AI-Generated_Cases-blueviolet)](https://groq.com/)

A premium, real-time multiplayer murder mystery investigation game where **every session is unique**. Powered by advanced AI, the game generates dynamic cases, suspects, and motives on the fly, ensuring no two investigations are ever the same.

---

## ✨ Key Features

- 🎭 **Dynamic AI Storytelling**: Every game starts with a freshly generated murder case—victim, location, weapon, and a complex web of suspects—all created by LLMs (Llama 3.3 / Gemini).
- 💬 **Interactive AI Suspects**: Don't just look at stats—**chat with the suspects**. AI-powered NPCs remember your questions, have distinct personalities, and might slip up if you press them hard enough.
- 🤝 **Real-time Multiplayer**: Team up with friends in private lobbies. See each other move, collect evidence together, and deliberate over who the killer is.
- 🕵️‍♂️ **Investigation Mechanics**: 
  - **Evidence Collection**: Find clues scattered around the map.
  - **Shared Inventory**: Work as a team to piece together the truth.
  - **Accusations**: You only have 2 chances to catch the killer—make them count.
- 🔊 **Immersive Audio**: Integrated Text-to-Speech (ElevenLabs) brings suspect dialogues to life (configurable).
- 🎨 **Modern Aesthetics**: Sleek gradient UI, smooth animations, and an intuitive canvas-based gameplay experience.

---

## 🛠️ Tech Stack

### Frontend
- **React.js**: Functional components with Hooks for state management.
- **HTML5 Canvas**: High-performance real-time character movement and map rendering.
- **Socket.io-client**: Low-latency bidirectional communication.
- **Vite**: Ultra-fast build tool and dev server.

### Backend
- **Node.js & Express**: Robust server architecture.
- **Socket.io**: Room management and real-time state synchronization.
- **AI Integration**:
  - **Groq/Llama 3.3**: High-speed inference for case generation and NPC dialogue.
  - **Gemini (optional)**: Alternative intelligence for complex reasoning.
- **ElevenLabs API**: Premium AI voices for suspect interactions.

---

## 🚀 Quick Start

### ⚡ The Easy Way (Windows)
We've included a PowerShell script to get everything running in one click:
1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Double-click `start.ps1` (or run it in PowerShell).
3. The script will install dependencies and launch both the backend (Port 3001) and frontend (Port 5173).

### 🛠️ Manual Setup

#### 1. Configure Environment
Create a `.env` file in the `backend/` directory:
```env
GROQ_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=...
```

#### 2. Install & Run
```bash
# Start Backend
cd backend
npm install
npm start

# Start Frontend (New Terminal)
cd frontend
npm install
npm run dev
```

---

## 🎮 How to Play

### 1. The Lobby
- Create a room and share the **6-character code** with your fellow detectives.
- Once everyone is in, the host clicks **"Start Game"**. 
- 🤖 *At this moment, the AI is writing your unique mystery.*

### 2. The Investigation
- **Move**: Use `W`, `A`, `S`, `D` to navigate the map.
- **Explore**: Visit different locations (Library, Study, Garden) to find suspects.
- **Interrogate**: Click on a suspect to start a chat. Ask them about their alibi, their relationship to the victim, or what they know about others.
- **Evidence**: Search for objects that contradict suspect stories.

### 3. The Accusation
- When you are confident, use the **Accuse** feature.
- **Caution**: An incorrect accusation brings you closer to losing. Use your collective wits!

---

## 📂 Project Structure

```text
Murder-Mystery/
├── backend/
│   ├── server.js          # Core Game Logic & AI Integration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Lobby.jsx      # Multiplayer Room Management
│   │   │   └── Game.jsx       # Real-time Map & NPC Interaction
│   │   └── App.jsx
│   ├── public/
│   │   ├── img/               # Map & Sprite Assets
│   │   └── data/              # Map Collision Data
│   └── package.json
├── start.ps1              # Automation Script
└── README.md
```

---

## 🔮 Future Roadmap

- [ ] **Expanded Maps**: Explore a full mansion or a cyberpunk city.
- [ ] **Deep Memory**: NPCs with even longer-term memory of past investigations.
- [ ] **Mobile Support**: Virtual joysticks for detective work on the go.
- [ ] **Voice Input**: Talk to suspects directly using your microphone.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for <strong>9Hacks</strong> 
</p>
