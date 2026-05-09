// AudioEngine + Voiceover for the PWA.
// Uses the Web Audio API so SFX can be triggered without user-gesture latency
// (after the first interaction). Speech uses SpeechSynthesis.

import { settings } from "./db.js";

const SFX_NAMES = ["tap", "pop", "fill", "sparkle", "erase", "applause", "error"];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.bgGain = null;
    this.bgSource = null;
    this.bgBuffer = null;
    this.sfxBuffers = new Map();
    this.lastSpoken = { text: "", at: 0 };
    this._unlocked = false;
  }

  async _ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch (_) {}
    }
    return this.ctx;
  }

  /** Call once on the first user gesture to unlock audio on iOS Safari. */
  async unlock() {
    if (this._unlocked) return;
    const ctx = await this._ensureContext();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
    this._unlocked = true;
    this.startBackgroundMusicIfEnabled();
  }

  async _loadBuffer(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      const arr = await r.arrayBuffer();
      const ctx = await this._ensureContext();
      if (!ctx) return null;
      return await ctx.decodeAudioData(arr);
    } catch (_) {
      return null;
    }
  }

  async preload() {
    // Try to fetch sfx_*.m4a or .mp3. Missing files are silently skipped — the
    // app still works without audio assets shipped.
    for (const name of SFX_NAMES) {
      for (const ext of ["m4a", "mp3"]) {
        const buf = await this._loadBuffer(`./assets/sfx/${name}.${ext}`);
        if (buf) { this.sfxBuffers.set(name, buf); break; }
      }
    }
    for (const ext of ["m4a", "mp3"]) {
      const buf = await this._loadBuffer(`./assets/music/loop.${ext}`);
      if (buf) { this.bgBuffer = buf; break; }
    }
  }

  playSFX(name) {
    if (!settings.sfxEnabled) return;
    const buf = this.sfxBuffers.get(name);
    if (!buf || !this.ctx) {
      // Synthesize a tiny tone fallback so taps still feel responsive.
      this._beep(name);
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.7;
    src.connect(g).connect(this.ctx.destination);
    src.start(0);
  }

  _beep(name) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const map = { tap: 660, pop: 880, fill: 540, sparkle: 1200, erase: 320, applause: 440, error: 220 };
    o.frequency.value = map[name] ?? 660;
    o.type = name === "applause" ? "triangle" : "sine";
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.18);
    o.connect(g).connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + 0.2);
  }

  startBackgroundMusicIfEnabled() {
    if (!settings.musicEnabled) return;
    if (!this.ctx || !this.bgBuffer || this.bgSource) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.bgBuffer;
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = 0.35;
    src.connect(g).connect(this.ctx.destination);
    src.start(0);
    this.bgSource = src;
    this.bgGain = g;
  }

  stopBackgroundMusic() {
    if (this.bgSource) { try { this.bgSource.stop(); } catch (_) {} this.bgSource = null; }
  }
}

class VoiceoverImpl {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.lastSpoken = { text: "", at: 0 };
  }
  _speak(text) {
    if (!this.synth || !settings.voiceoverEnabled) return;
    const now = Date.now();
    if (this.lastSpoken.text === text && now - this.lastSpoken.at < 600) return;
    this.lastSpoken = { text, at: now };
    try { this.synth.cancel(); } catch (_) {}
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.15;
    u.lang = navigator.language || "en-US";
    this.synth.speak(u);
  }
  speakColor(name) { this._speak(name); }
  speakCategory(name) { this._speak(name); }
}

export const Audio = new AudioEngine();
export const Voiceover = new VoiceoverImpl();
