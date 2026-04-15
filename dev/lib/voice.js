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
    this._listenersAdded = false;
  }

  isSupported() {
    return typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  injectPageScript(code) {
    try {
      const script = document.createElement('script');
      const blob = new Blob([code], { type: 'text/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        const policy = window.trustedTypes.getPolicy?.('autopilot') || window.trustedTypes.createPolicy('autopilot', {
          createScriptURL: (url) => url,
        });
        script.src = policy.createScriptURL(blobUrl);
      } else {
        script.src = blobUrl;
      }
      script.onload = () => { URL.revokeObjectURL(blobUrl); try { script.remove(); } catch (e) {} };
      (document.head || document.documentElement).appendChild(script);
      return true;
    } catch (e) { return false; }
  }

  start() {
    if (this.listening) return;
    if (!this.isSupported()) {
      console.warn('[AutoPilot] Web Speech API not supported');
      return false;
    }
    if (!this._listenersAdded) {
      window.addEventListener('__autopilotVoiceResult__', (e) => {
        this.processCommand(e.detail);
      });
      window.addEventListener('__autopilotVoiceError__', (e) => {
        this.listening = false;
        if (this.handlers.onError) this.handlers.onError(e.detail);
      });
      this._listenersAdded = true;
    }
    const ok = this.injectPageScript(`
      (function() {
        if (window.__autopilotRecognition) {
          try { window.__autopilotRecognition.stop(); } catch(e) {}
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = function(event) {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.trim().toLowerCase();
            window.dispatchEvent(new CustomEvent('__autopilotVoiceResult__', { detail: transcript }));
          }
        };
        rec.onerror = function(e) {
          if (e.error === 'not-allowed' || e.error === 'audio-capture') {
            window.dispatchEvent(new CustomEvent('__autopilotVoiceError__', { detail: e.error }));
            return;
          }
          if (window.__autopilotVoiceListening) {
            setTimeout(function() { try { rec.start(); } catch(err) {} }, 800);
          }
        };
        rec.onend = function() {
          if (window.__autopilotVoiceListening) {
            setTimeout(function() { try { rec.start(); } catch(err) {} }, 200);
          }
        };
        window.__autopilotRecognition = rec;
        window.__autopilotVoiceListening = true;
        rec.start();
      })();
    `);
    if (ok) this.listening = true;
    return ok;
  }

  stop() {
    this.listening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
    this.injectPageScript(`
      (function() {
        window.__autopilotVoiceListening = false;
        if (window.__autopilotRecognition) {
          try { window.__autopilotRecognition.stop(); } catch(e) {}
          window.__autopilotRecognition = null;
        }
      })();
    `);
  }

  processCommand(transcript) {
    console.log('[AutoPilot AI] voice heard:', transcript);
    for (const cmd of this.commands) {
      for (const phrase of cmd.phrases) {
        if (transcript.includes(phrase)) {
          console.log('[AutoPilot AI] voice command matched:', cmd.action);
          this.handleAction(cmd.action, transcript);
          return;
        }
      }
    }
  }

  handleAction(action, transcript) {
    if (this.handlers.onCommand) {
      this.handlers.onCommand(action, transcript);
    }
    // Built-in default media controls
    const video = document.querySelector('video');
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
