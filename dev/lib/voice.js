// AutoPilot AI — Voice Command Module
// Uses a Chrome offscreen document for speech recognition (MV3 requirement)

export class VoiceController {
  constructor(handlers) {
    this.handlers = handlers || {};
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
    if (this.listening) return true;
    if (!this.isSupported()) return false;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'START_VOICE' }).catch(() => {});
    }
    this.listening = true;
    return true;
  }

  stop() {
    this.listening = false;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'STOP_VOICE' }).catch(() => {});
    }
  }

  processCommand(transcript) {
    console.log('[AutoPilot AI] processing voice command:', transcript);
    for (const cmd of this.commands) {
      for (const phrase of cmd.phrases) {
        if (transcript.includes(phrase)) {
          console.log('[AutoPilot AI] voice command matched:', cmd.action);
          this.handleAction(cmd.action);
          return;
        }
      }
    }
    console.log('[AutoPilot AI] no voice command matched');
  }

  handleAction(action) {
    const video = document.querySelector('video');
    console.log('[AutoPilot AI] voice handleAction:', action, 'video found:', !!video);
    if (!video) return;
    switch (action) {
      case 'skip':
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
