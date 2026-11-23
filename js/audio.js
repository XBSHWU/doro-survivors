// ============================================================
// DORO SURVIVORS — Web Audio Synthesizer (SFX + Chiptune BGM)
// ============================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmRunning = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.intenseMode = false;
    this.lastHitSound = 0;
    this.lastXpSound = 0;
    this.xpCombo = 0;
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(m) {
    this.muted = m;
    if (m) {
      this.stopBgm();
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  playTone(freq, duration, type = 'triangle', volume = 0.12, endFreq = null, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playNoise(duration = 0.12, volume = 0.09, filterFreq = 1200) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  playXp() {
    const now = performance.now();
    if (now - this.lastXpSound < 38) return;
    if (now - this.lastXpSound > 420) this.xpCombo = 0;
    else this.xpCombo = Math.min(14, this.xpCombo + 1);
    this.lastXpSound = now;
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
    const base = pentatonic[this.xpCombo % pentatonic.length];
    const oct = this.xpCombo >= 8 ? 1.5 : 1;
    this.playTone(base * oct, 0.09, 'sine', 0.08, base * oct * 1.18);
  }

  playHit(isCrit = false) {
    const now = performance.now();
    if (now - this.lastHitSound < 45) return;
    this.lastHitSound = now;
    if (isCrit) {
      this.playTone(540, 0.08, 'square', 0.07, 920);
    } else {
      this.playTone(210 + Math.random() * 70, 0.055, 'triangle', 0.055, 95);
    }
  }

  playThrow() {
    this.playTone(360, 0.09, 'sine', 0.05, 620);
  }

  playLaser() {
    this.playTone(980, 0.18, 'sawtooth', 0.06, 220);
    this.playTone(1480, 0.12, 'triangle', 0.04, 520, 0.02);
  }

  playNova() {
    this.playTone(280, 0.25, 'sine', 0.1, 80);
    this.playTone(560, 0.2, 'triangle', 0.06, 1120, 0.02);
  }

  playPlayerHurt() {
    this.playTone(190, 0.18, 'sawtooth', 0.12, 65);
    this.playNoise(0.14, 0.1, 500);
  }

  playHeal() {
    this.playTone(523.25, 0.12, 'sine', 0.1, 659.25, 0);
    this.playTone(659.25, 0.14, 'sine', 0.1, 783.99, 0.08);
    this.playTone(1046.5, 0.2, 'triangle', 0.1, 1318.5, 0.16);
  }

  playMagnet() {
    for (let i = 0; i < 6; i++) {
      this.playTone(360 + i * 120, 0.09, 'sine', 0.07, 460 + i * 130, i * 0.045);
    }
  }

  playBomb() {
    this.playTone(160, 0.5, 'sawtooth', 0.16, 35);
    this.playNoise(0.45, 0.18, 420);
  }

  playLevelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, 0.16, 'triangle', 0.11, n * 1.02, i * 0.075);
    });
  }

  playEvolve() {
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51, 1567.98];
    notes.forEach((n, i) => {
      this.playTone(n, 0.22, 'square', 0.08, n * 1.03, i * 0.065);
      this.playTone(n * 0.5, 0.22, 'triangle', 0.08, n * 0.5, i * 0.065);
    });
  }

  playChest() {
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((n, i) => {
      this.playTone(n, 0.18, 'triangle', 0.11, n * 1.05, i * 0.08);
    });
  }

  playFullBurst() {
    this.playTone(220, 0.35, 'sawtooth', 0.12, 880);
    this.playTone(440, 0.4, 'square', 0.08, 1760, 0.06);
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((n, i) => this.playTone(n, 0.45, 'triangle', 0.09, n * 1.02, 0.12 + i * 0.03));
  }

  playBossWarning() {
    for (let i = 0; i < 3; i++) {
      this.playTone(480, 0.18, 'sawtooth', 0.1, 320, i * 0.26);
      this.playTone(240, 0.18, 'square', 0.07, 180, i * 0.26);
    }
  }

  startBgm() {
    if (this.muted || this.bgmRunning) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.bgmRunning = true;
    this.bgmStep = 0;

    // Energetic anime-arcade 16-step synth pattern in D minor / F major
    const bassLine = [146.83, 146.83, 174.61, 146.83, 196.0, 196.0, 220.0, 174.61];
    const leadLine = [
      587.33, 0, 698.46, 783.99, 880.0, 0, 783.99, 698.46,
      659.25, 0, 587.33, 659.25, 783.99, 880.0, 1046.5, 880.0,
    ];

    const tick = () => {
      if (!this.bgmRunning || this.muted) return;
      const step = this.bgmStep++;
      const interval = this.intenseMode ? 135 : 165;

      // Bass pulse
      const bass = bassLine[Math.floor(step / 2) % bassLine.length];
      if (step % 2 === 0) {
        this.playTone(bass, 0.12, 'triangle', 0.045, bass * 0.98);
      }
      // Lead arpeggio
      const lead = leadLine[step % leadLine.length];
      if (lead > 0) {
        const mult = this.intenseMode ? 1.122 : 1; // +2 semitones hype during burst/boss
        this.playTone(lead * mult, 0.1, 'square', 0.022, lead * mult);
      }
      // Hi-hat tick
      if (step % 2 === 1) {
        this.playNoise(0.03, 0.015, 5000);
      }

      this.bgmTimer = setTimeout(tick, interval);
    };

    tick();
  }

  stopBgm() {
    this.bgmRunning = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const sound = new SoundEngine();
