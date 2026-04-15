// AutoPilot AI — Offscreen Document for Voice Recognition
// Chrome MV3 only allows microphone/Web Speech API in offscreen documents

let recognition = null;
let listening = false;

function startListening() {
  if (listening) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    chrome.runtime.sendMessage({ type: 'VOICE_ERROR', error: 'not-supported' });
    return;
  }
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    listening = true;
    chrome.runtime.sendMessage({ type: 'VOICE_STARTED' });
  };

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.trim().toLowerCase();
      chrome.runtime.sendMessage({ type: 'VOICE_RESULT', transcript });
    }
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'audio-capture') {
      listening = false;
      chrome.runtime.sendMessage({ type: 'VOICE_ERROR', error: e.error });
      return;
    }
    if (listening) {
      setTimeout(() => { try { recognition.start(); } catch (err) {} }, 800);
    }
  };

  recognition.onend = () => {
    if (listening) {
      setTimeout(() => { try { recognition.start(); } catch (err) {} }, 200);
    }
  };

  try {
    recognition.start();
  } catch (err) {
    chrome.runtime.sendMessage({ type: 'VOICE_ERROR', error: err.message });
  }
}

function stopListening() {
  listening = false;
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
    recognition = null;
  }
  chrome.runtime.sendMessage({ type: 'VOICE_STOPPED' });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'START_VOICE_OFFSCREEN') startListening();
  if (msg.type === 'STOP_VOICE_OFFSCREEN') stopListening();
});
