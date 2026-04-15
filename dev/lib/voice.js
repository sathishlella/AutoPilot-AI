// AutoPilot AI — Voice Command Module
// Listens for voice commands like "skip", "pause", "next", "mute"
// Uses the Web Speech API (works offline in Chrome, no API key)

export class VoiceController {
  constructor(handlers) {
    this.handlers = handlers || {};
    this.recognition = null;
    this.listening = false;
    this.commands = [
      { phrases: ['skip', 'skip this', 'skip ad', 'skip intro'], action: 'skip' },
      { phrases: ['pause', 'stop'], action: 'pause' },
      { phrases: ['play', 'resume'], action: 'play' },
      { phrases: ['next', 'next video', 'next episode'], action: 'next' },
      { phrases: ['previous', 'back', 'go back'], action: 'previous' },
      { phrases: ['mute', 'silence'], action: 'mute' },
      { phrases: ['unmute'], action: 'unmute' },
      { phrases: ['louder', 'volume up'], action: 'volumeUp' },
      { phrases: ['quieter', 'volume down'], action: 'volumeDown' },
      { phrases: ['fullscreen', 'full screen'], action: 'fullscreen' },
    ];
  }

  isSupported() {
    return typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  start() {
    if (this.listening) return;
    if (!this.isSupported()) {
      console.warn('[AutoPilot] Web Speech API not supported');
      return false;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      console.log('[AutoPilot AI] voice recognition started');
      this.listening = true;
    };

    this.recognition.onresult = (event) => {
      console.log('[AutoPilot AI] voice result event:', event.results.length, 'results');
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim().toLowerCase();
        console.log('[AutoPilot AI] voice transcript:', transcript);
        this.processCommand(transcript);
      }
    };

    this.recognition.onerror = (e) => {
      console.error('[AutoPilot AI] voice error:', e.error);
      // Auto-restart on temporary errors (network, no-speech)
      if (this.listening && e.error !== 'not-allowed' && e.error !== 'audio-capture') {
        setTimeout(() => {
          try { this.recognition.start(); } catch (err) {}
        }, 800);
      }
      if ((e.error === 'not-allowed' || e.error === 'audio-capture') && this.handlers.onError) {
        this.handlers.onError(e.error);
      }
    };

    this.recognition.onend = () => {
      console.log('[AutoPilot AI] voice recognition ended, listening=', this.listening);
      // Auto-restart if we're supposed to be listening
      if (this.listening) {
        setTimeout(() => {
          try { this.recognition.start(); } catch (err) {}
        }, 200);
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      console.warn('[AutoPilot] Could not start voice recognition:', err);
      return false;
    }
  }

  stop() {
    this.listening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
  }

  processCommand(transcript) {
    console.log('[AutoPilot AI] processing voice command:', transcript);
    for (const cmd of this.commands) {
      for (const phrase of cmd.phrases) {
        if (transcript.includes(phrase)) {
          console.log('[AutoPilot AI] voice command matched:', cmd.action);
          this.handleAction(cmd.action, transcript);
          return;
        }
      }
    }
    console.log('[AutoPilot AI] no voice command matched');
  }

  handleAction(action, transcript) {
    if (this.handlers.onCommand) {
      this.handlers.onCommand(action, transcript);
    }
    // Built-in default media controls
    const video = document.querySelector('video');
    console.log('[AutoPilot AI] voice handleAction:', action, 'video found:', !!video);
    if (!video) return;
    switch (action) {
      case 'skip':
        // Try to find a skip button first; fall back to seeking forward
        const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, button[data-uia="player-skip-intro"], .atvwebplayersdk-skipelement-button');
        if (skipBtn) skipBtn.click();
        else video.currentTime += 10;
        break;
      case 'pause': video.pause(); break;
      case 'play': video.play(); break;
      case 'next': video.currentTime += 30; break;
      case 'previous': video.currentTime -= 30; break;
      case 'mute': video.muted = true; break;
      case 'unmute': video.muted = false; break;
      case 'volumeUp': video.volume = Math.min(1, video.volume + 0.1); break;
      case 'volumeDown': video.volume = Math.max(0, video.volume - 0.1); break;
      case 'fullscreen':
        if (document.fullscreenElement) document.exitFullscreen();
        else video.requestFullscreen?.();
        break;
    }
  }
}
