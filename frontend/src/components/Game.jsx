import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { socket } from './Lobby';
import NPCChat from './NPCChat';
import PlayerChat from './PlayerChat';
import './Game.css';

// Predefined suspect locations on the map
const SUSPECT_LOCATIONS = [
  { x: 2842, y: 872, name: 'Library' },
  { x: 4106, y: 4306, name: 'Study' },
  { x: 730, y: 4992, name: 'Garden' }
];

// Predefined clue locations on the map
const CLUE_LOCATIONS = [
  { x: 1800, y: 2100 },
  { x: 3200, y: 3400 },
  { x: 2500, y: 1500 }
];


function Game({ roomCode, username, isHost, onLeave }) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [accusatoryMode, setAccusatoryMode] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [accusationsRemaining, setAccusationsRemaining] = useState(2);
  const [players, setPlayers] = useState({});
  const [waitingForPlayers, setWaitingForPlayers] = useState(true);
  const [activeNPC, setActiveNPC] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [nearbyNPC, setNearbyNPC] = useState(null);
  const [minimapState, setMinimapState] = useState({ player: { x: 0, y: 0 }, others: [] });

  // Murder mystery specific state
  const [murderCase, setMurderCase] = useState(null);
  const [suspects, setSuspects] = useState([]);
  const [evidenceFound, setEvidenceFound] = useState([]);
  const [investigationActive, setInvestigationActive] = useState(false);
  const [notification, setNotification] = useState(null);
  const notificationTimeoutRef = useRef(null);
  const evidenceFoundRef = useRef([]);

  // Refs to access current values without restarting animation loop
  const nearbyNPCRef = useRef(null);
  const nearbyEvidenceRef = useRef(null);
  const activeNPCRef = useRef(null);
  
  const gameStateRef = useRef({
    background: { x: -2370, y: -2600 },
    foreground: { x: -2370, y: -2600 },
    player: {
      position: { x: 512, y: 288 },
      sprite: { row: 0, frame: 0 },
      moving: false
    },
    keys: { w: false, a: false, s: false, d: false },
    lastKey: '',
    images: {},
    boundaries: [],
    frameCount: 0,
    otherPlayers: {}
  });

  useEffect(() => {
    socket.on('playerJoined', ({ playerId, player }) => {
      setPlayers(prev => ({ ...prev, [playerId]: player }));
      gameStateRef.current.otherPlayers[playerId] = player;
      if (Object.keys(gameStateRef.current.otherPlayers).length >= 0) {
        setWaitingForPlayers(false);
      }
    });

    socket.on('gameStarted', ({ room }) => {
      setGameStarted(true);
      setPlayers(room.players);
      gameStateRef.current.otherPlayers = { ...room.players };
      delete gameStateRef.current.otherPlayers[socket.id];
      const inv = room.sharedInventory || [];
      setInventory(inv);
      setEvidenceFound(room.evidenceFound || []);
      setAccusationsRemaining(typeof room.accusationsRemaining === 'number' ? room.accusationsRemaining : 2);
      if (room.murderCase) {
        setMurderCase(room.murderCase);
        setSuspects(room.murderCase.suspects || []);
        setInvestigationActive(true);
      }
    });

    socket.on('caseGenerated', ({ murderCase }) => {
      console.log('🔍 [Game] Received murder case:', murderCase);
      if (murderCase && Array.isArray(murderCase.suspects)) {
        setMurderCase(murderCase);
        setSuspects(murderCase.suspects);
        setInvestigationActive(true);
        showNotification(`Murder case: ${murderCase.victim} found dead in ${murderCase.location}`);
      } else {
        console.error('❌ [Game] Received invalid murder case data');
      }
    });

    socket.on('playerMoved', ({ playerId, position, sprite, moving }) => {
      if (gameStateRef.current.otherPlayers[playerId]) {
        gameStateRef.current.otherPlayers[playerId].position = position;
        gameStateRef.current.otherPlayers[playerId].sprite = sprite;
        gameStateRef.current.otherPlayers[playerId].moving = moving;
      }
    });

    socket.on('playerLeft', ({ playerId }) => {
      setPlayers(prev => {
        const newPlayers = { ...prev };
        delete newPlayers[playerId];
        return newPlayers;
      });
      delete gameStateRef.current.otherPlayers[playerId];
    });

    socket.on('itemReceived', ({ item, from }) => {
      setInventory(prev => {
        const updated = [...prev, item];
        return updated;
      });
      showNotification(`Received ${item} from ${from}!`);
    });

    socket.on('gameOver', ({ won, reason }) => {
      setGameOver({ won, reason });
    });

    socket.on('caseResolved', ({ won, correctly_accused, actual_killer, accused, victim, accuser }) => {
      console.log('🔍 Case resolved:', { won, correctly_accused, accused, actual_killer });
      setInvestigationActive(false);
      setGameOver({
        won,
        correctly_accused,
        actual_killer,
        accused,
        victim,
        accuser,
        reason: 'case_resolved'
      });
      showNotification(won ? '🎉 CASE SOLVED!' : '❌ Wrong accusation!');
    });

    socket.on('accusationUpdate', ({ remaining, accused, accuser }) => {
      if (typeof remaining === 'number') {
        setAccusationsRemaining(remaining);
      }
      showNotification(`${accuser} accused ${accused}. Attempts left: ${remaining}`);
    });

    socket.on('evidenceCollected', ({ evidenceName, collectedBy, totalEvidence }) => {
      console.log(`📋 Evidence collected: ${evidenceName} by ${collectedBy}`);
      setEvidenceFound(prev => (prev.includes(evidenceName) ? prev : [...prev, evidenceName]));
      showNotification(`${collectedBy} collected: ${evidenceName}`);
    });

    socket.on('roomJoined', ({ roomCode, room }) => {
      setPlayers(room.players);
      setEvidenceFound(room.evidenceFound || []);
      setAccusationsRemaining(typeof room.accusationsRemaining === 'number' ? room.accusationsRemaining : 2);
      if (room.gameStarted) {
        setGameStarted(true);
        if (room.murderCase) {
          setMurderCase(room.murderCase);
          setSuspects(room.murderCase.suspects || []);
          setInvestigationActive(true);
        }
      }
    });

    return () => {
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('roomJoined');
      socket.off('caseGenerated');
      socket.off('playerMoved');
      socket.off('playerLeft');
      socket.off('itemReceived');
      socket.off('gameOver');
      socket.off('caseResolved');
      socket.off('accusationUpdate');
      socket.off('evidenceCollected');
    };
  }, []);

  useEffect(() => {
    evidenceFoundRef.current = evidenceFound;
  }, [evidenceFound]);

  // Check if player is near an NPC (using circle collision)
  const checkNPCProximity = (worldX, worldY) => {
    // Check murder case suspects first if available
    if (murderCase && suspects.length > 0) {
      for (let i = 0; i < suspects.length; i++) {
        const location = SUSPECT_LOCATIONS[i] || { x: 0, y: 0 };
        const centerX = location.x + 1;
        const centerY = location.y + 1;
        const distance = Math.sqrt(
          Math.pow(worldX - centerX, 2) +
          Math.pow(worldY - centerY, 2)
        );
        if (distance < 100) {
          return { npcId: `suspect_${i}`, name: suspects[i].name };
        }
      }
    }
    return null;
  };

  // Check if player is near evidence to collect
  const checkEvidenceProximity = (worldX, worldY) => {
    if (!murderCase || !murderCase.clues || murderCase.clues.length === 0) return null;

    for (let i = 0; i < murderCase.clues.length; i++) {
      const clue = murderCase.clues[i];
      const location = CLUE_LOCATIONS[i] || { x: 1000 + (i * 200), y: 1000 + (i * 200) };
      const zone = { ...location, radius: 40 };
      const centerX = zone.x + zone.radius;
      const centerY = zone.y + zone.radius;
      const distance = Math.sqrt(
        Math.pow(worldX - centerX, 2) +
        Math.pow(worldY - centerY, 2)
      );

      if (distance < zone.radius + 100) {
        const isCollected = evidenceFoundRef.current.includes(clue.name);
        return {
          evidenceId: `clue_${i}`,
          name: clue.name,
          description: clue.description,
          icon: clue.icon || '🔍',
          pointsTo: clue.pointsTo || 'suspect',
          isCollected
        };
      }
    }
    return null;
  };

  const collectEvidence = (evidenceName) => {
    if (evidenceFoundRef.current.includes(evidenceName)) {
      showNotification('You already collected this evidence!');
      return;
    }

    socket.emit('collectEvidence', { roomCode, evidenceName });
  };


  const accuseSuspect = (suspectName) => {
    if (!investigationActive) {
      showNotification('Investigation is not active');
      return;
    }

    if (accusationsRemaining <= 0) {
      showNotification('No accusations remaining');
      return;
    }

    console.log(`🔍 Player accusing ${suspectName}`);
    socket.emit('accuseSuspect', { roomCode, suspectName });
  };

  const showNotification = (message) => {
    console.log('NOTIFICATION:', message);
    setNotification(message);
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const closeNPCChat = useCallback(() => {
    console.log('🚪 NPCChat close callback called');
    activeNPCRef.current = null;
    setActiveNPC(null);
  }, []);

  // Background music control
  const toggleMusic = () => {
    if (!audioRef.current) return;
    
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.log('Audio play prevented:', err);
      });
      setIsMusicPlaying(true);
    }
  };

  // Start music when game starts
  useEffect(() => {
    if (gameStarted && audioRef.current && !isMusicPlaying) {
      // Try to autoplay (might be blocked by browser)
      audioRef.current.play().catch(err => {
        console.log('Autoplay prevented - user must click to start music');
      });
      setIsMusicPlaying(true);
    }
  }, [gameStarted]);

  const enterNPCChat = (npcId) => {
    // Clear all movement keys when entering chat
    const state = gameStateRef.current;
    state.keys = { w: false, a: false, s: false, d: false };
    state.lastKey = '';
    
    console.log('🚪 enterNPCChat called with:', npcId);
    // Just set the active NPC, the NPCChat component will handle the socket emit
    activeNPCRef.current = npcId;
    setActiveNPC(npcId);
  };

  useEffect(() => {
    if (!gameStarted) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 576;

    const state = gameStateRef.current;

    const mapImage = new Image();
    mapImage.src = '/img/kajukatli-map.png';
    
    const foregroundImage = new Image();
    foregroundImage.src = '/img/kajukatli-map-foreground.png';
    
    const playerImage = new Image();
    playerImage.src = '/img/ninja.png';
    
    // NPC sprites - custom images for each NPC
    const npcImage = new Image();
    npcImage.src = '/img/ninja.png';
    
    // Load specific NPC images
    const hardwareClerkImage = new Image();
    hardwareClerkImage.src = '/img/blonde_man.png';
    
    const policeOfficerImage = new Image();
    policeOfficerImage.src = '/img/policeman.png';
    
    const borderGuardImage = new Image();
    borderGuardImage.src = '/img/soldier.png';
    
    const exitGuardImage = new Image();
    exitGuardImage.src = '/img/soldier.png';
    
    state.images = { 
      mapImage, 
      foregroundImage, 
      playerImage, 
      npcImage,
    };
    
    // Store custom images per suspect
    state.images.npcImages = {
      default: npcImage,
      suspect_0: hardwareClerkImage,
      suspect_1: policeOfficerImage,
      suspect_2: borderGuardImage
    };

    fetch('/data/collisions.js')
      .then(res => res.text())
      .then(text => {
        const collisionsMatch = text.match(/\[([\s\S]*)\]/);
        if (collisionsMatch) {
          const collisions = eval('[' + collisionsMatch[1] + ']');
          const collisionsMap = [];
          for (let i = 0; i < collisions.length; i += 120) {
            collisionsMap.push(collisions.slice(i, i + 120));
          }

          const boundaries = [];
          const paddingTiles = 10;
          const offsetX = 10;
          const offsetY = 10;

          collisionsMap.forEach((row, i) => {
            row.forEach((symbol, j) => {
              if (symbol === 1479 || symbol === 1475) {
                boundaries.push({
                  position: {
                    x: (j - paddingTiles + offsetX) * 48,
                    y: (i - paddingTiles + offsetY) * 48
                  },
                  width: 48,
                  height: 48
                });
              }
            });
          });

          state.boundaries = boundaries;
        }
      });

    const handleKeyDown = (e) => {
      // Don't process movement keys if chat is open
      if (activeNPCRef.current) return;
      
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        state.keys[key] = true;
        state.lastKey = key;
      }
      if (key === 'e' && nearbyNPCRef.current) {
        enterNPCChat(nearbyNPCRef.current.npcId);
      }
      if (key === 'c' && nearbyEvidenceRef.current && !nearbyEvidenceRef.current.isCollected) {
        collectEvidence(nearbyEvidenceRef.current.name);
      }
    };

    const handleKeyUp = (e) => {
      // Don't process movement keys if chat is open
      if (activeNPCRef.current) return;
      
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        state.keys[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const checkCollisions = (worldX, worldY) => {
      const player = { x: worldX, y: worldY, width: 32, height: 64 };
      return state.boundaries.some(boundary => {
        return (
          player.x + player.width >= boundary.position.x &&
          player.x <= boundary.position.x + boundary.width &&
          player.y + player.height >= boundary.position.y &&
          player.y <= boundary.position.y + boundary.height
        );
      });
    };

    const checkMapBounds = (x, y) => {
      const mapWidth = 5760;
      const mapHeight = 5760;
      const minX = -(mapWidth - canvas.width);
      const maxX = 0;
      const minY = -(mapHeight - canvas.height);
      const maxY = 0;
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    };

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      context.fillStyle = 'black';
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (state.images.mapImage && state.images.mapImage.complete) {
        context.drawImage(state.images.mapImage, state.background.x, state.background.y);
      }

      // Draw NPCs/Suspects as sprites - render from murder case if available
      const renderSuspects = murderCase && murderCase.suspects && suspects.length > 0;
      const suspectZonesToRender = renderSuspects
        ? suspects.map((suspect, idx) => ({
            id: `suspect_${idx}`,
            npcId: `suspect_${idx}`,
            ...(SUSPECT_LOCATIONS[idx] || { x: 0, y: 0 }),
            color: ['#ff6b9d', '#4ecdc4', '#ffe66d'][idx] || '#ffffff',
            name: suspect.name
          }))
        : [];

      suspectZonesToRender.forEach((zone) => {
        const centerX = zone.x + (zone.radius || 1);
        const centerY = zone.y + (zone.radius || 1);
        const screenX = centerX + state.background.x;
        const screenY = centerY + state.background.y;
        
        // Draw NPC sprite (with idle animation)
        const npcSpriteImage = state.images.npcImages?.[zone.npcId] || state.images.npcImages?.default || state.images.npcImage;
        
        if (npcSpriteImage && npcSpriteImage.complete) {
          const spriteWidth = 32;
          const spriteHeight = 32;
          const scale = 4;
          
          // Idle animation: slight bobbing
          const bobOffset = Math.sin(state.frameCount * 0.03) * 3;
          
          const idleFrame = Math.floor((state.frameCount / 20) % 4);
          const spriteRow = zone.spriteRow || 0;
          const spriteY = screenY - spriteHeight * scale - 10 + bobOffset + (zone.spriteOffset?.y || 0);

          // Draw shadow
          context.fillStyle = 'rgba(0, 0, 0, 0.3)';
          context.beginPath();
          context.ellipse(
            screenX, spriteY + scale * spriteHeight + 5,
            scale * spriteWidth * 0.4, scale * spriteHeight * 0.2,
            0, 0, Math.PI * 2
          );
          context.fill();

          context.drawImage(
            npcSpriteImage,
            idleFrame * spriteWidth,
            spriteRow * spriteHeight,
            spriteWidth,
            spriteHeight,
            screenX - (spriteWidth * scale) / 2 + (zone.spriteOffset?.x || 0),
            spriteY,
            spriteWidth * scale,
            spriteHeight * scale
          );
        }

        // Draw name above
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(screenX - 80, screenY - 120, 160, 25);

        context.fillStyle = zone.color;
        context.font = 'bold 14px "JetBrains Mono"';
        context.textAlign = 'center';
        context.fillText(zone.name, screenX, screenY - 100);
        
        // Draw interaction hint if player is near
        const worldX = state.player.position.x - state.background.x;
        const worldY = state.player.position.y - state.background.y;
        const distance = Math.sqrt(
          Math.pow(worldX - centerX, 2) + 
          Math.pow(worldY - centerY, 2)
        );
        
        if (distance < 100) {
          context.fillStyle = 'rgba(0, 0, 0, 0.7)';
          context.fillRect(screenX - 60, screenY + 80, 120, 20);
          
          context.fillStyle = '#39ff14';
          context.font = 'bold 12px "JetBrains Mono"';
          context.fillText('[E] Interrogate', screenX, screenY + 95);
        }
      });

      // Draw Evidence Zones
      if (murderCase && murderCase.clues && murderCase.clues.length > 0) {
        murderCase.clues.forEach((clue, idx) => {
          const location = CLUE_LOCATIONS[idx] || { x: 1000 + (idx * 200), y: 1000 + (idx * 200) };
          const zone = {
            ...location,
            radius: 40,
            name: clue.name,
            icon: clue.icon || '🔍',
            color: ['#ff4444', '#ffaa44', '#ffe66d', '#44ff44', '#44aaff'][idx % 5]
          };

          const centerX = zone.x + zone.radius;
          const centerY = zone.y + zone.radius;
          const screenX = centerX + state.background.x;
          const screenY = centerY + state.background.y;

          const isCollected = evidenceFoundRef.current.includes(zone.name);
          const zoneColor = isCollected ? '#888888' : zone.color;
          const opacity = isCollected ? '20' : '50';

          // Draw glow
          const gradient = context.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, zone.radius + 20
          );
          gradient.addColorStop(0, zoneColor + opacity);
          gradient.addColorStop(0.8, zoneColor + '20');
          gradient.addColorStop(1, 'transparent');

          context.fillStyle = gradient;
          context.beginPath();
          context.arc(screenX, screenY, zone.radius + 20, 0, Math.PI * 2);
          context.fill();

          // Draw main circle
          context.fillStyle = zoneColor + (isCollected ? '20' : '40');
          context.beginPath();
          context.arc(screenX, screenY, zone.radius, 0, Math.PI * 2);
          context.fill();

          // Draw border
          context.strokeStyle = zoneColor;
          context.lineWidth = 2;
          if (!isCollected) {
            context.setLineDash([5, 3]);
          }
          context.beginPath();
          context.arc(screenX, screenY, zone.radius, 0, Math.PI * 2);
          context.stroke();
          context.setLineDash([]);

          // Draw pulsing effect
          if (!isCollected) {
            const pulseRadius = zone.radius * 0.6 + Math.sin(state.frameCount * 0.05) * 8;
            context.fillStyle = 'rgba(255, 255, 255, 0.3)';
            context.beginPath();
            context.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
            context.fill();
          }

          // Draw icon
          context.fillStyle = isCollected ? '#888888' : zoneColor;
          context.font = 'bold 28px Arial';
          context.textAlign = 'center';
          context.fillText(zone.icon, screenX, screenY + 10);

          // Draw name
          context.fillStyle = zoneColor;
          context.font = 'bold 12px "JetBrains Mono"';
          context.textAlign = 'center';
          context.fillText(zone.name, screenX, screenY - zone.radius - 15);

          // Draw interaction hint if nearby
          const worldX = state.player.position.x - state.background.x;
          const worldY = state.player.position.y - state.background.y;
          const distance = Math.sqrt(
            Math.pow(worldX - centerX, 2) +
            Math.pow(worldY - centerY, 2)
          );

          if (distance < zone.radius + 100) {
            if (isCollected) {
              context.fillStyle = '#888888';
              context.font = '11px "JetBrains Mono"';
              context.fillText('Collected', screenX, screenY + zone.radius + 25);
            } else {
              context.fillStyle = '#39ff14';
              context.font = 'bold 11px "JetBrains Mono"';
              context.fillText('[C] COLLECT', screenX, screenY + zone.radius + 25);
            }
          }
        });
      }

      const speed = 8;
      let moved = false;
      state.player.moving = false;

      if (state.keys.w && state.lastKey === 'w') {
        const newY = state.background.y + speed;
        const worldX = state.player.position.x - state.background.x;
        const worldY = state.player.position.y - newY;
        
        if (!checkCollisions(worldX, worldY) && checkMapBounds(state.background.x, newY)) {
          state.background.y = newY;
          state.foreground.y = newY;
          state.player.sprite.row = 7;
          state.player.moving = true;
          moved = true;
        }
      } else if (state.keys.a && state.lastKey === 'a') {
        const newX = state.background.x + speed;
        const worldX = state.player.position.x - newX;
        const worldY = state.player.position.y - state.background.y;
        
        if (!checkCollisions(worldX, worldY) && checkMapBounds(newX, state.background.y)) {
          state.background.x = newX;
          state.foreground.x = newX;
          state.player.sprite.row = 5;
          state.player.moving = true;
          moved = true;
        }
      } else if (state.keys.s && state.lastKey === 's') {
        const newY = state.background.y - speed;
        const worldX = state.player.position.x - state.background.x;
        const worldY = state.player.position.y - newY;
        
        if (!checkCollisions(worldX, worldY) && checkMapBounds(state.background.x, newY)) {
          state.background.y = newY;
          state.foreground.y = newY;
          state.player.sprite.row = 4;
          state.player.moving = true;
          moved = true;
        }
      } else if (state.keys.d && state.lastKey === 'd') {
        const newX = state.background.x - speed;
        const worldX = state.player.position.x - newX;
        const worldY = state.player.position.y - state.background.y;
        
        if (!checkCollisions(worldX, worldY) && checkMapBounds(newX, state.background.y)) {
          state.background.x = newX;
          state.foreground.x = newX;
          state.player.sprite.row = 6;
          state.player.moving = true;
          moved = true;
        }
      }

      // Check NPC proximity
      const worldX = state.player.position.x - state.background.x;
      const worldY = state.player.position.y - state.background.y;
      const nearby = checkNPCProximity(worldX, worldY);
      nearbyNPCRef.current = nearby;
      setNearbyNPC(nearby);

      // Check evidence proximity
      const nearbyEvidence = checkEvidenceProximity(worldX, worldY);
      nearbyEvidenceRef.current = nearbyEvidence;

      if (moved || state.frameCount % 30 === 0) {
        const worldPos = {
          x: worldX,
          y: worldY
        };
        socket.emit('playerMove', {
          roomCode,
          position: worldPos,
          sprite: state.player.sprite,
          moving: state.player.moving
        });
      }

      if (state.player.moving) {
        if (state.frameCount % 10 === 0) {
          state.player.sprite.frame = (state.player.sprite.frame + 1) % 4;
        }
      } else {
        state.player.sprite.frame = 0;
        state.player.sprite.row = 0;
      }

      Object.entries(state.otherPlayers).forEach(([id, otherPlayer]) => {
        if (state.images.playerImage && state.images.playerImage.complete && otherPlayer.position) {
          const screenX = otherPlayer.position.x + state.background.x;
          const screenY = otherPlayer.position.y + state.background.y;
          
          const spriteWidth = 32;
          const spriteHeight = 32;
          const scale = 4;

          context.drawImage(
            state.images.playerImage,
            (otherPlayer.sprite?.frame || 0) * spriteWidth,
            (otherPlayer.sprite?.row || 0) * spriteHeight,
            spriteWidth,
            spriteHeight,
            screenX,
            screenY,
            spriteWidth * scale,
            spriteHeight * scale
          );

          context.fillStyle = 'white';
          context.font = 'bold 16px Arial';
          context.textAlign = 'center';
          context.fillText(otherPlayer.username, screenX + 64, screenY - 10);
        }
      });


      const spriteWidth = 32;
      const spriteHeight = 32;
      const scale = 4;

      if (state.images.playerImage && state.images.playerImage.complete) {
        context.drawImage(
          state.images.playerImage,
          state.player.sprite.frame * spriteWidth,
          state.player.sprite.row * spriteHeight,
          spriteWidth,
          spriteHeight,
          state.player.position.x,
          state.player.position.y,
          spriteWidth * scale,
          spriteHeight * scale
        );

        context.fillStyle = 'white';
        context.font = 'bold 16px Arial';
        context.textAlign = 'center';
        context.fillText(username, state.player.position.x + 64, state.player.position.y - 10);
      }

      if (state.images.foregroundImage && state.images.foregroundImage.complete) {
        context.drawImage(state.images.foregroundImage, state.foreground.x, state.foreground.y);
      }



      state.frameCount++;
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, roomCode, username]);

  useEffect(() => {
    if (!gameStarted) return;

    const intervalId = setInterval(() => {
      const state = gameStateRef.current;
      const worldX = state.player.position.x - state.background.x;
      const worldY = state.player.position.y - state.background.y;
      const others = Object.values(state.otherPlayers || {}).map((player) => ({
        id: player.id,
        x: player.position?.x || 0,
        y: player.position?.y || 0,
        username: player.username
      }));

      setMinimapState({
        player: { x: worldX, y: worldY },
        others
      });
    }, 200);

    return () => clearInterval(intervalId);
  }, [gameStarted]);

  const handleStartGame = () => {
    socket.emit('startGame', { roomCode });
  };

  const handleLeave = () => {
    socket.disconnect();
    onLeave();
  };

  if (gameOver) {
    // Determine outcome message based on case resolution
    let outcomeTitle = 'INVESTIGATION COMPLETE';
    let outcomeMessage = '';
    let outcomeIcon = '🔍';
    let backgroundColor = '#1a1a2e';

    if (gameOver.reason === 'case_resolved') {
      if (gameOver.correctly_accused) {
        outcomeTitle = '🎉 CASE SOLVED!';
        outcomeMessage = `You correctly identified ${gameOver.actual_killer} as the killer!

${gameOver.victim} was killed via ${murderCase?.weapon || 'unknown method'} in ${murderCase?.location || 'unknown location'}.

${gameOver.accuser} made the winning accusation!`;
        outcomeIcon = '⚖️';
        backgroundColor = '#0a3e0a';
      } else {
        outcomeTitle = '❌ WRONG PERSON ACCUSED';
        outcomeMessage = `You accused ${gameOver.accused} of the murder, but that was incorrect.

The real killer was: ${gameOver.actual_killer}

${gameOver.victim} was killed via ${murderCase?.weapon || 'unknown method'} in ${murderCase?.location || 'unknown location'}.`;
        outcomeIcon = '😞';
        backgroundColor = '#3e0a0a';
      }
    } else {
      outcomeTitle = 'INVESTIGATION ENDED';
      outcomeMessage = 'The trail went cold...';
    }

    return (
      <div className="game-over-screen" style={{ backgroundColor: '#0a0e14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="game-over-container" style={{ background: '#11141a', border: '1px solid #1f2937', padding: '60px', width: '550px', textAlign: 'center' }}>
          <div className="win-icon" style={{ fontSize: '100px', marginBottom: '30px' }}>
            {gameOver.correctly_accused ? '🕵️‍♂️' : '💀'}
          </div>
          <h1 style={{
            color: gameOver.correctly_accused ? 'var(--accent-primary)' : '#ff1744',
            fontSize: '3.5rem',
            marginBottom: '40px',
            fontFamily: 'Crimson Pro, serif',
            textTransform: 'uppercase',
            letterSpacing: '4px'
          }}>
            {gameOver.correctly_accused ? 'CASE SOLVED' : 'CASE COLD'}
          </h1>
          
          <div style={{ border: `1px solid ${gameOver.correctly_accused ? 'var(--accent-primary)' : '#ff1744'}`, padding: '30px', background: 'rgba(255,23,68,0.05)', marginBottom: '40px' }}>
            <p style={{ color: '#eee', fontSize: '16px', marginBottom: '20px', lineHeight: '1.6', fontFamily: 'JetBrains Mono' }}>
              {gameOver.correctly_accused 
                ? `Excellently handled, Detective. The perpetrator has been apprehended.`
                : `Too many wrong accusations — the real killer escaped.`}
            </p>
            <p style={{ color: gameOver.correctly_accused ? 'var(--accent-primary)' : '#ff1744', fontWeight: 'bold', fontSize: '18px', fontFamily: 'JetBrains Mono' }}>
              The killer was <span style={{ textTransform: 'uppercase' }}>{gameOver.actual_killer}</span>.
            </p>
          </div>

          <button className="btn btn-primary" onClick={handleLeave} style={{ width: '100%', padding: '20px', fontSize: '16px' }}>
            RETURN TO LOBBY
          </button>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="waiting-room">
        <div className="waiting-container" style={{ textAlign: 'left', padding: '60px' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '30px', fontFamily: 'Crimson Pro, serif' }}>
            Case File: {roomCode}
          </h2>
          
          <div className="briefing-box">
            <h3 className="briefing-title">Detective Briefing</h3>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>
              A murder has occurred. You and your partners are the lead investigators.
            </p>
            <ul className="briefing-steps">
              <li className="briefing-step">1. Interrogate the suspects scattered across the map</li>
              <li className="briefing-step">2. Collect evidence clues - press E when near glowing items</li>
              <li className="briefing-step">3. Accuse the killer using the Accuse button</li>
              <li className="briefing-step">4. You have 2 accusations - choose wisely</li>
            </ul>
          </div>

          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', marginBottom: '10px' }}>
            Players in room: {Object.keys(players).length}/4
          </p>

          {!gameStarted && isHost && (
            <button className="btn btn-primary" onClick={handleStartGame} style={{ display: 'block', width: '100%', marginBottom: '10px' }}>
              BEGIN INVESTIGATION
            </button>
          )}

          {!isHost && (
            <p className="waiting-text" style={{ color: 'var(--accent-primary)', marginBottom: '10px' }}>
              ▸ Waiting for host to start...
            </p>
          )}

          <button className="btn" onClick={handleLeave} style={{ display: 'block', width: '100%', opacity: 0.6 }}>
            LEAVE ROOM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game">
      {/* Background Music */}
      <audio
        ref={audioRef}
        src="/audio/Lights Out (Console Edition) - The Escapists Music Extended [5JKt3rJ95WU].mp3"
        loop
        volume="0.3"
        preload="auto"
      />

      <div className="game-hud">
        {notification && (
          <div className="game-notification" style={{ 
            position: 'absolute', 
            top: '60px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            background: 'rgba(0, 0, 0, 0.9)', 
            border: '1px solid var(--accent-primary)', 
            color: 'var(--accent-primary)', 
            padding: '10px 20px', 
            fontSize: '13px', 
            fontFamily: 'JetBrains Mono',
            zIndex: 10000,
            animation: 'fadeInOut 4s forwards'
          }}>
            {notification}
          </div>
        )}
        <div className="hud-info">
          <div className="hud-case" style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>◆ CASE: {roomCode}</div>
          <div className="hud-main-case">
            <span className="hud-pair"><span className="hud-label">Victim:</span> <span className="hud-value">{murderCase?.victim}</span></span>
            <span className="hud-pair"><span className="hud-value">{murderCase?.location}</span></span>
            <span className="hud-pair"><span className="hud-label">Weapon:</span> <span className="hud-value">{murderCase?.weapon}</span></span>
          </div>
          <div className="hud-evidence">
            <span className="hud-label">EVIDENCE:</span>
            <span className="hud-value">{evidenceFound.length > 0 ? evidenceFound.join(', ') : 'None collected'}</span>
          </div>
        </div>

        <div className="hud-right">
          <div className="hud-attempts">
            {[...Array(2)].map((_, i) => (
              <span key={i} style={{ color: i < accusationsRemaining ? '#f4d03f' : '#222' }}>◆</span>
            ))}
          </div>
          <button className="btn-hud btn-accuse-main" onClick={() => setAccusatoryMode(true)}>
            ACCUSE SUSPECT
          </button>
          <button className="btn-hud btn-leave-hud" onClick={handleLeave}>LEAVE</button>
        </div>
      </div>

      {nearbyNPC && (
        <div className="interaction-prompt" style={{ position: 'absolute', top: '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          Press E to Interrogate {nearbyNPC.name}
        </div>
      )}

      {showMap && (
        <div className="map-overlay" style={{ position: 'fixed', inset: '50px', background: 'rgba(0,0,0,0.9)', border: '2px solid var(--accent-primary)', zIndex: 1100, padding: '40px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ color: 'var(--accent-primary)', marginBottom: '20px' }}>ESTATE MAP</h2>
          <div style={{ flex: 1, border: '1px solid #333', position: 'relative', overflow: 'hidden' }}>
             {/* Simple map representation */}
             <div style={{ position: 'absolute', top: '10%', left: '10%', color: '#666' }}>HOSPITAL</div>
             <div style={{ position: 'absolute', top: '20%', left: '70%', color: '#666' }}>POLICE STATION</div>
             <div style={{ position: 'absolute', top: '70%', left: '30%', color: '#666' }}>GRAND LIBRARY</div>
             <div style={{ position: 'absolute', top: '80%', left: '80%', color: '#666' }}>EXIT</div>
             
             {/* Player marker */}
             <div style={{ 
               position: 'absolute', 
               left: `${(( (gameStateRef.current?.player?.position?.x || 0) - (gameStateRef.current?.background?.x || 0)) / 4000) * 100}%`,
               top: `${(( (gameStateRef.current?.player?.position?.y || 0) - (gameStateRef.current?.background?.y || 0)) / 4000) * 100}%`,
               width: '10px', height: '10px', background: '#39ff14', borderRadius: '50%',
               boxShadow: '0 0 10px #39ff14'
             }}></div>
          </div>
          <button className="btn" onClick={() => setShowMap(false)} style={{ marginTop: '20px' }}>CLOSE MAP</button>
        </div>
      )}

      {accusatoryMode && (
        <div className="accusation-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div className="accusation-container" style={{ background: '#1a1d23', border: '1px solid #ff1744', padding: '40px', width: '450px', textAlign: 'center' }}>
            <h2 style={{ color: '#ff1744', fontSize: '2rem', marginBottom: '10px', fontFamily: 'Crimson Pro, serif' }}>Make Your Accusation</h2>
            <p style={{ color: '#aaa', marginBottom: '30px', fontSize: '14px' }}>
              Choose wisely. You have <span style={{ color: '#f4d03f', fontWeight: 'bold' }}>{accusationsRemaining} attempts</span> remaining.
            </p>
            
            <div className="suspect-grid" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {suspects.map((suspect, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#121418', border: '1px solid #333' }}>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>{suspect.name}</span>
                  <button className="btn-accuse-mini" onClick={() => { accuseSuspect(suspect.name); setAccusatoryMode(false); }} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '11px', cursor: 'pointer', letterSpacing: '2px' }}>ACCUSE</button>
                </div>
              ))}
            </div>

            <button onClick={() => setAccusatoryMode(false)} style={{ marginTop: '30px', background: 'transparent', border: 'none', color: '#888', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
              CANCEL - KEEP INVESTIGATING
            </button>
          </div>
        </div>
      )}

      <div className="coordinates-overlay">
        X: {gameStateRef.current?.player?.position?.x ? Math.floor(gameStateRef.current.player.position.x - gameStateRef.current.background.x) : 0}<br/>
        Y: {gameStateRef.current?.player?.position?.y ? Math.floor(gameStateRef.current.player.position.y - gameStateRef.current.background.y) : 0}
      </div>

      <div className="minimap">
        <div className="minimap-title">Estate Map</div>
        <div className="minimap-area">
          {SUSPECT_LOCATIONS.map((suspect, idx) => (
            <div
              key={`suspect-${idx}`}
              className="minimap-marker minimap-suspect"
              style={{
                left: `${(suspect.x / 5760) * 100}%`,
                top: `${(suspect.y / 5760) * 100}%`
              }}
              title={suspect.name}
            />
          ))}
          {minimapState.others.map((player) => (
            <div
              key={player.id}
              className="minimap-marker minimap-player"
              style={{
                left: `${(player.x / 5760) * 100}%`,
                top: `${(player.y / 5760) * 100}%`
              }}
              title={player.username}
            />
          ))}
          <div
            className="minimap-marker minimap-me"
            style={{
              left: `${(minimapState.player.x / 5760) * 100}%`,
              top: `${(minimapState.player.y / 5760) * 100}%`
            }}
            title={username}
          />
        </div>
      </div>
      <canvas ref={canvasRef} />

      <PlayerChat socket={socket} roomCode={roomCode} username={username} />

      {(() => {
          if (!activeNPC || !suspects || suspects.length === 0) return null;
          const idx = parseInt(activeNPC.split('_')[1]);
          const npcName = suspects[idx]?.name || 'Unknown Suspect';
          const location = SUSPECT_LOCATIONS[idx]?.name || 'Unknown Location';

        return (
          <NPCChat
            key={activeNPC}
            socket={socket}
            roomCode={roomCode}
            npcId={activeNPC}
            npcName={npcName}
            location={location}
            username={username}
            onClose={closeNPCChat}
          />
        );
      })()}
    </div>
  );
}

export default Game;
