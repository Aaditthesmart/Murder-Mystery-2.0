let webSpeechUnlocked = false;

const unlockWebSpeech = () => {
  webSpeechUnlocked = true;
  window.removeEventListener('pointerdown', unlockWebSpeech);
  window.removeEventListener('keydown', unlockWebSpeech);
};

const ensureWebSpeechUnlocked = () => {
  if (webSpeechUnlocked || !('speechSynthesis' in window)) return;
  window.addEventListener('pointerdown', unlockWebSpeech, { once: true });
  window.addEventListener('keydown', unlockWebSpeech, { once: true });
};

const speakWithWebSpeech = (text, options) => {
  if (!('speechSynthesis' in window)) return;

  ensureWebSpeechUnlocked();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate || 1;
  utterance.pitch = options.pitch || 1;
  utterance.volume = options.volume || 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

export async function playTTS(text, options = {}) {
  if (!text || typeof text !== 'string') return;

  const payload = {
    text: text.trim(),
    voiceId: options.voiceId,
    modelId: options.modelId
  };

  try {
    const response = await fetch('https://murder-mystery-9hacks-production.up.railway.app//tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      speakWithWebSpeech(payload.text, options);
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };

    audio.play().catch(() => {
      URL.revokeObjectURL(audioUrl);
      speakWithWebSpeech(payload.text, options);
    });
  } catch (error) {
    speakWithWebSpeech(payload.text, options);
  }
}
