import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "https://murder-mystery-9-hacks-jm1x.vercel.app"],
    methods: ["GET", "POST"]
  }
});

// AI Configuration (Groq)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_API_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// ElevenLabs TTS Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

// JLLM API Configuration
const JLLM_API_ENDPOINT = "https://janitorai.com/hackathon/completions";
const JLLM_API_KEY = "calhacks2047";

// Store game rooms
const rooms = new Map();

app.post('/tts', async (req, res) => {
  try {
    const { text, voiceId, modelId } = req.body || {};
    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({ message: 'ElevenLabs API key missing' });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'Text is required' });
    }

    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) {
      return res.status(400).json({ message: 'Text is empty' });
    }

    const chosenVoiceId = voiceId || ELEVENLABS_VOICE_ID;
    const chosenModelId = modelId || ELEVENLABS_MODEL_ID;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${chosenVoiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: trimmed,
        model_id: chosenModelId,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.7
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ message: errorText || 'TTS request failed' });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS error:', error.message);
    res.status(500).json({ message: 'TTS error' });
  }
});


// Generate a murder mystery case using AI
async function generateMurderCase() {
  const prompt = `You are a creative murder mystery writer. Generate a JSON object for a murder mystery game. Format ONLY as valid JSON, no other text.

The JSON must contain:
- victim: name of the victim
- location: where the crime happened (e.g., "Mansion Study", "Office Building", "Hotel Room")
- weapon: how they were killed (e.g., "poisoned", "strangled", "shot")
- timeOfDeath: approximate time of death (e.g., "between 8 PM and 10 PM")
- season: current season (to add atmosphere)
- keyClue: one key clue that points to the killer
- clues: array of exactly 3 clue objects to be scattered as evidence, each with:
  - name: short name of clue (e.g., "Poisoned Glass", "Broken Watch", "Secret Note")
  - description: a short description of what the clue implies about the case
  - icon: a single appropriate emoji for the clue
- suspects: array of exactly 3 suspect objects, each with:
  - name: suspect's name
  - personality: brief personality descriptor (1-2 words, e.g., "nervous", "charming", "bitter")
  - relationship: how they know the victim (e.g., "business partner", "jealous lover", "estranged sibling")
  - motive: why they might want the victim dead (1 sentence)
  - alibi: what they claim they were doing at time of death (1-2 sentences)
  - knownSecrets: array of 1-2 secrets they know (things they might reveal under pressure)

Choose ONE suspect as the killer. Make their motive strong, but their alibi slightly contradictable by the clues.
Make the innocent suspects have viable alibis but suspicious motives.
Include diverse suspects (different ages, genders, relationships).

Return ONLY valid JSON. No markdown, no explanation.`;

  try {
    const response = await fetch(GROQ_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let fullResponse = data.choices?.[0]?.message?.content;

    if (!fullResponse) throw new Error('Empty response from AI');

    // Robust JSON parsing (handles markdown backticks)
    const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/) || fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      fullResponse = jsonMatch[1] || jsonMatch[0];
    }

    const caseData = JSON.parse(fullResponse);

    // Verify killer exists
    if (!caseData.killer && caseData.suspects && caseData.suspects.length > 0) {
      const killerIndex = Math.floor(Math.random() * caseData.suspects.length);
      caseData.killer = caseData.suspects[killerIndex].name;
    }

    console.log(`✅ [generateMurderCase] Successfully generated case via AI`);
    return caseData;
  } catch (error) {
    console.error('⚠️ [generateMurderCase] AI Generation failed, using fallback:', error.message);
    return {
      victim: 'Victor Vance',
      location: 'The Grand Hotel',
      weapon: 'poisoned champagne',
      timeOfDeath: 'between 8 PM and 10 PM',
      season: 'winter',
      keyClue: 'A receipt for arsenic',
      clues: [
        { name: 'Arsenic Receipt', description: 'A receipt for arsenic bought by Isabella', icon: '📜' },
        { name: 'Shattered Glass', description: 'A glass with trace amounts of poison', icon: '🥂' },
        { name: 'Private Note', description: 'A note revealing a hidden grudge', icon: '✉️' }
      ],
      suspects: [
        {
          name: 'Isabella',
          personality: 'nervous',
          relationship: 'business partner',
          motive: 'Victor was going to expose her embezzlement scheme',
          alibi: 'Claims she was in her room all evening',
          knownSecrets: ['She had access to the poison', 'She hired a private investigator']
        },
        {
          name: 'Marcus',
          personality: 'charming',
          relationship: 'younger brother',
          motive: 'Victor cut him off from the family fortune',
          alibi: 'Says he was at a bar with friends',
          knownSecrets: ['He has severe gambling debts', 'He borrowed money from a loan shark']
        },
        {
          name: 'Sophia',
          personality: 'calm',
          relationship: 'estranged spouse',
          motive: 'Fighting over divorce settlement',
          alibi: 'Claims she was meeting with her lawyer',
          knownSecrets: ['She hired a private detective', 'She knew about Victor\'s affair']
        }
      ],
      killer: 'Isabella'
    };
  }
}

// Generate system prompt for a suspect
function generateSuspectPrompt(suspect, caseData) {
  const isKiller = suspect.name === caseData.killer;
  const guiltText = isKiller
    ? `You ARE the killer. You killed ${caseData.victim} via ${caseData.weapon} because: ${suspect.motive}. You're trying to maintain your alibi and deflect suspicion.`
    : `You are innocent and did not kill ${caseData.victim}. But you have reason to suspect who might have. Be defensive about your own alibi but try to be helpful.`;

  return `You are ${suspect.name} in a murder investigation. ${caseData.victim} was killed via ${caseData.weapon} at ${caseData.location} around ${caseData.timeOfDeath}.

YOUR DETAILS:
- Relationship to victim: ${suspect.relationship}
- Your personality: ${suspect.personality}
- Your motive for wanting victim dead: ${suspect.motive}
- Your alibi (what you claim you were doing): ${suspect.alibi}
- Secrets you know: ${suspect.knownSecrets.join(', ')}

YOUR ROLE:
${guiltText}

RULES:
- Answer questions naturally and in character
- If directly accused, respond emotionally (defensive if innocent, evasive if guilty)
- Don't volunteer information about other suspects unless asked directly
- If your alibi is contradicted with evidence, you may slip up
- When asked 'Did you do it?', stay consistent with your story
- You may know things about other suspects but won't share unless they're relevant to your defense
- Keep responses short and natural, under 100 words`;
}

// Generate random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}




// Chat with JLLM API
async function chatWithNPC(npcId, messages, roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.npcs[npcId]) return null;

  const npc = room.npcs[npcId];
  const evidenceContext = room.evidenceFound && room.evidenceFound.length > 0
    ? `\nThe detectives (players) have found the following evidence: ${room.evidenceFound.join(', ')}.`
    : `\nThe detectives haven't found any evidence yet.`;

  // Format messages for Groq (OpenAI format)
  const fullMessages = [
    {
      role: "system",
      content: `${npc.systemPrompt || `You are ${npc.name}, an NPC in a murder mystery game.`}\n${evidenceContext}\nKeep responses immersive and under 3 sentences. Use [GIVE: ITEM] if rewarding players.`
    },
    ...npc.conversationHistory.slice(-6),
    ...messages
  ];

  try {
    console.log(`[chatWithNPC] Asking Groq (${GROQ_MODEL}) for ${npcId}`);
    const response = await fetch(GROQ_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: fullMessages,
        temperature: 0.8,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error("Groq API error:", response.status);
      return "I'm sorry... my thoughts are a bit scattered right now. Could you ask again?";
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error(`Empty response from Groq`);

    // Process keywords
    const giveMatch = content.match(/\[GIVE:\s*(.+?)\]/i);
    if (giveMatch) io.to(roomCode).emit('itemReceived', { item: giveMatch[1].trim(), from: npc.name });

    // Update history
    npc.conversationHistory.push(...messages, { role: 'assistant', content });
    if (npc.conversationHistory.length > 20) npc.conversationHistory = npc.conversationHistory.slice(-20);

    return content;
  } catch (err) {
    console.warn(`⚠️ [chatWithNPC] Gemini Core failed:`, err.message);
    return `[System Error] I'm having trouble thinking... (Error: ${err.message})`;
  }
}

// Process pending NPC messages and generate response
async function processNPCResponse(roomCode, npcId) {
  console.log(`[processNPCResponse] Starting for ${npcId} in room ${roomCode}`);
  const room = rooms.get(roomCode);
  if (!room || !room.npcs[npcId]) {
    console.log('[processNPCResponse] Room or NPC not found');
    return;
  }

  const npc = room.npcs[npcId];
  const npcRoomId = `${roomCode}-npc-${npcId}`;

  // Clear the timer
  if (npc.responseTimer) {
    clearTimeout(npc.responseTimer);
    npc.responseTimer = null;
  }

  // If no pending messages, nothing to do
  if (npc.pendingMessages.length === 0) {
    console.log('[processNPCResponse] No pending messages');
    return;
  }

  // Get all pending messages
  const messagesToProcess = [...npc.pendingMessages];
  npc.pendingMessages = [];

  console.log(`[processNPCResponse] Processing ${messagesToProcess.length} messages`);

  // Send "typing" indicator
  console.log(`[processNPCResponse] Sending typing indicator to ${npcRoomId}`);
  io.to(npcRoomId).emit('npcTyping', { npcId, isTyping: true });

  const now = Date.now();

  if (!npc.lastResponseTime) npc.lastResponseTime = 0;

  if (now - npc.lastResponseTime < 2500) {
    console.log("⚠️ Skipping Gemini call (rate protection)");
    return;
  }

  npc.lastResponseTime = now;

  // Get NPC response
  const npcResponse = await chatWithNPC(npcId, messagesToProcess, roomCode);

  console.log(`[processNPCResponse] Got response from chatWithNPC:`, npcResponse);

  if (npcResponse) {
    console.log(`[processNPCResponse] Broadcasting NPC response to ${npcRoomId}`);
    // Broadcast NPC response to all players in this NPC chat
    io.to(npcRoomId).emit('npcMessageReceived', {
      npcId,
      sender: room.npcs[npcId].name,
      message: npcResponse,
      isNPC: true,
      timestamp: Date.now()
    });
    console.log('[processNPCResponse] NPC response broadcast complete');

    // Make sure we pass player evidence info to chatWithNPC context later if needed
  }

  console.log(`[processNPCResponse] Sending typing:false to ${npcRoomId}`);
  io.to(npcRoomId).emit('npcTyping', { npcId, isTyping: false });
  console.log('[processNPCResponse] Complete');
}


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('createRoom', ({ username }) => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      host: socket.id,
      players: {
        [socket.id]: {
          id: socket.id,
          username,
          position: { x: 512, y: 512 },
          sprite: { row: 0, frame: 0 },
          moving: false
        }
      },
      gameStarted: false,
      sharedInventory: [],
      npcs: {}, // Will be populated on startGame with suspects
      currentLocation: 'map',
      arrested: false,
      crossedBorder: false,
      timeUp: false,
      gameWon: false,
      gameLost: false,
      completedActions: [],
      borderPassGranted: false,
      isBeingChased: false,
      police: [],
      // Murder mystery specific
      murderCase: null,
      investigationStatus: 'pending',
      evidenceFound: [],
      accusation: null,
      accusationsRemaining: 2
    };

    room.playerChat = [];

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, room });
    console.log(`Room ${roomCode} created by ${username}`);
  });

  // Join existing room
  socket.on('joinRoom', ({ roomCode, username }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (Object.keys(room.players).length >= 4 && room.gameStarted) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    room.players[socket.id] = {
      id: socket.id,
      username,
      position: { x: 512, y: 600 },
      sprite: { row: 0, frame: 0 },
      moving: false
    };

    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode, room });
    io.to(roomCode).emit('playerJoined', { playerId: socket.id, player: room.players[socket.id] });
    console.log(`${username} joined room ${roomCode}`);
  });

  socket.on('enterPlayerChat', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    socket.emit('playerChatHistory', {
      messages: room.playerChat || []
    });
  });

  socket.on('sendPlayerChatMessage', ({ roomCode, message }) => {
    if (!message || !message.trim()) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    const player = room.players[socket.id];
    if (!player) return;

    const chatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      sender: player.username,
      message: message.trim().slice(0, 500),
      timestamp: Date.now()
    };

    if (!room.playerChat) room.playerChat = [];
    room.playerChat.push(chatMessage);
    if (room.playerChat.length > 50) {
      room.playerChat = room.playerChat.slice(-50);
    }

    io.to(roomCode).emit('playerChatMessage', chatMessage);
  });

  // Start game
  socket.on('startGame', async ({ roomCode }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.host !== socket.id) {
      socket.emit('error', { message: 'Only host can start the game' });
      return;
    }

    if (Object.keys(room.players).length < 1) {
      socket.emit('error', { message: 'Need at least 1 player to start' });
      return;
    }

    // Generate murder case
    console.log(`🔍 Generating murder case for room ${roomCode}...`);
    const murderCase = await generateMurderCase();
    room.murderCase = murderCase;
    room.investigationStatus = 'active';
    room.evidenceFound = [];
    room.accusation = null;

    // Create NPC suspects from generated case
    room.npcs = {};
    const suspectLocations = [
      { x: 2842, y: 872, name: 'Library' },
      { x: 4106, y: 4306, name: 'Study' },
      { x: 730, y: 4992, name: 'Garden' }
    ];

    murderCase.suspects.forEach((suspect, idx) => {
      const location = suspectLocations[idx];
      room.npcs[`suspect_${idx}`] = {
        id: `suspect_${idx}`,
        name: suspect.name,
        location: `${suspect.name}'s Location`,
        personality: suspect.personality,
        motive: suspect.motive,
        alibi: suspect.alibi,
        relationship: suspect.relationship,
        knownSecrets: suspect.knownSecrets,
        systemPrompt: generateSuspectPrompt(suspect, murderCase),
        conversationHistory: [],
        pendingMessages: [],
        responseTimer: null,
        lastResponseTime: 0
      };
    });

    console.log(`🎭 Created ${Object.keys(room.npcs).length} suspects for investigation`);

    room.gameStarted = true;
    room.accusationsRemaining = 2;
    io.to(roomCode).emit('gameStarted', { room });
    io.to(roomCode).emit('caseGenerated', { murderCase });
    console.log(`Game started in room ${roomCode}`);
  });

  // Player movement
  socket.on('playerMove', ({ roomCode, position, sprite, moving }) => {
    const room = rooms.get(roomCode);

    if (!room || !room.players[socket.id]) {
      return;
    }

    room.players[socket.id].position = position;
    room.players[socket.id].sprite = sprite;
    room.players[socket.id].moving = moving;

    socket.to(roomCode).emit('playerMoved', {
      playerId: socket.id,
      position,
      sprite,
      moving
    });
  });

  // Enter NPC conversation
  socket.on('enterNPCChat', ({ roomCode, npcId }) => {
    console.log(`Player ${socket.id} entering NPC chat: ${npcId} in room ${roomCode}`);
    const room = rooms.get(roomCode);
    if (!room || !room.npcs[npcId]) {
      console.log('Error: Room or NPC not found');
      socket.emit('error', { message: 'NPC not found' });
      return;
    }

    const npc = room.npcs[npcId];

    // Join a specific room for this NPC chat
    const npcRoomId = `${roomCode}-npc-${npcId}`;
    socket.join(npcRoomId);
    console.log(`Player joined NPC room: ${npcRoomId}`);

    // Send full conversation history to the joining player
    const formattedHistory = npc.conversationHistory.map(msg => {
      if (msg.role === 'user') {
        // Extract username from "Username: message" format
        const match = msg.content.match(/^(.+?):\s*(.+)$/);
        if (match) {
          return {
            sender: match[1],
            message: match[2],
            isNPC: false
          };
        }
      } else if (msg.role === 'assistant') {
        return {
          sender: npc.name,
          message: msg.content,
          isNPC: true
        };
      }
      return null;
    }).filter(msg => msg !== null);

    console.log(`Sending ${formattedHistory.length} messages of history to player`);

    socket.emit('npcChatEntered', {
      npcId,
      npcName: npc.name,
      location: npc.location,
      conversationHistory: formattedHistory
    });
  });

  // Leave NPC conversation
  socket.on('leaveNPCChat', ({ roomCode, npcId }) => {
    const npcRoomId = `${roomCode}-npc-${npcId}`;
    socket.leave(npcRoomId);
  });

  // Send message to NPC
  socket.on('sendNPCMessage', async ({ roomCode, npcId, message }) => {
    if (!message || message.trim() === "") return;
    console.log(`Player sending message to ${npcId}:`, message);
    const room = rooms.get(roomCode);
    if (!room || !room.npcs[npcId]) {
      console.log('Error: Room or NPC not found for message');
      return;
    }

    const player = room.players[socket.id];
    if (!player) {
      console.log('Error: Player not found');
      return;
    }

    const npc = room.npcs[npcId];
    const npcRoomId = `${roomCode}-npc-${npcId}`;

    console.log(`Broadcasting message to room: ${npcRoomId}`);

    // Broadcast the user message to all players in this NPC chat immediately
    io.to(npcRoomId).emit('npcMessageReceived', {
      npcId,
      sender: player.username,
      message: message,
      isNPC: false,
      timestamp: Date.now()
    });

    const userMessage = {
      role: 'user',
      content: `${player.username}: ${message}`
    };

    // Add message to pending buffer
    npc.pendingMessages.push(userMessage);
    console.log(`Pending messages for ${npcId}:`, npc.pendingMessages.length);

    // Clear existing timer if any
    if (npc.responseTimer) {
      clearTimeout(npc.responseTimer);
    }

    // Check if we should respond immediately (2 or more messages)
    if (npc.pendingMessages.length >= 2) {
      console.log('Processing NPC response immediately (2+ messages)');
      // Process immediately
      await processNPCResponse(roomCode, npcId);
    } else {
      // Set timer to respond after 3 seconds if no more messages
      npc.responseTimer = setTimeout(async () => {
        await processNPCResponse(roomCode, npcId);
      }, 3000);
    }
  });

  // Get game state
  socket.on('getGameState', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    socket.emit('gameStateUpdate', {
      sharedInventory: room.sharedInventory,
      arrested: room.arrested,
      crossedBorder: room.crossedBorder,
      gameWon: room.gameWon,
      gameLost: room.gameLost,
      completedActions: room.completedActions
    });
  });

  // Perform action is no longer needed in murder mystery, keeping empty for fallback
  socket.on('performAction', ({ roomCode, actionId }) => { });

  // Accuse a suspect of being the killer
  socket.on('accuseSuspect', ({ roomCode, suspectName }) => {
    const room = rooms.get(roomCode);

    if (!room || !room.murderCase) {
      socket.emit('error', { message: 'Game not found or case not initialized' });
      return;
    }

    if (!room.investigationStatus || room.investigationStatus !== 'active') {
      socket.emit('error', { message: 'Investigation is not active' });
      return;
    }

    const player = room.players[socket.id];
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    if (typeof room.accusationsRemaining !== 'number') {
      room.accusationsRemaining = 2;
    }

    if (room.accusationsRemaining <= 0) {
      socket.emit('error', { message: 'No accusations remaining' });
      return;
    }

    // Check if accusation is correct
    const isCorrect = suspectName === room.murderCase.killer;

    // Record the accusation
    room.accusation = {
      accuser: player.username,
      accused: suspectName,
      correct: isCorrect,
      timestamp: Date.now()
    };

    if (isCorrect) {
      const gameOverData = {
        won: true,
        correctly_accused: true,
        actual_killer: room.murderCase.killer,
        accused: suspectName,
        victim: room.murderCase.victim,
        accuser: player.username
      };

      room.investigationStatus = 'concluded';
      room.gameWon = true;
      room.gameLost = false;

      io.to(roomCode).emit('caseResolved', gameOverData);
      console.log(`🔍 Accusation in room ${roomCode}: ${player.username} accused ${suspectName} - CORRECT`);
      return;
    }

    room.accusationsRemaining = Math.max(0, room.accusationsRemaining - 1);
    io.to(roomCode).emit('accusationUpdate', {
      remaining: room.accusationsRemaining,
      accused: suspectName,
      accuser: player.username
    });

    console.log(`🔍 Accusation in room ${roomCode}: ${player.username} accused ${suspectName} - INCORRECT (${room.accusationsRemaining} remaining)`);

    if (room.accusationsRemaining > 0) {
      return;
    }

    const gameOverData = {
      won: false,
      correctly_accused: false,
      actual_killer: room.murderCase.killer,
      accused: suspectName,
      victim: room.murderCase.victim,
      accuser: player.username
    };

    room.investigationStatus = 'concluded';
    room.gameWon = false;
    room.gameLost = true;

    io.to(roomCode).emit('caseResolved', gameOverData);
  });

  // Collect evidence
  socket.on('collectEvidence', ({ roomCode, evidenceName }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const player = room.players[socket.id];
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    // Check if evidence already collected
    if (room.evidenceFound && room.evidenceFound.includes(evidenceName)) {
      socket.emit('error', { message: 'Evidence already collected' });
      return;
    }

    // Add evidence to room's collected evidence list
    if (!room.evidenceFound) {
      room.evidenceFound = [];
    }
    room.evidenceFound.push(evidenceName);

    // Broadcast evidence collection to all players
    io.to(roomCode).emit('evidenceCollected', {
      evidenceName,
      collectedBy: player.username,
      totalEvidence: room.evidenceFound.length
    });

    console.log(`📋 Evidence collected in room ${roomCode}: ${evidenceName} by ${player.username}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    rooms.forEach((room, roomCode) => {
      if (room.players[socket.id]) {
        delete room.players[socket.id];

        io.to(roomCode).emit('playerLeft', { playerId: socket.id });

        if (Object.keys(room.players).length === 0 || room.host === socket.id) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted`);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
