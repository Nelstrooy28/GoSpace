const MUTED_KEY = 'gospace_muted_v1';
let ctx = null, muted = localStorage.getItem(MUTED_KEY) === '1', rumbleNodes = null, lastHoverAt = 0;
let gestureUnlocked = false;

export function getSharedAudioContext(fromGesture = false) {
  if (fromGesture) gestureUnlocked = true;
  if (!gestureUnlocked && !ctx) return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  }
  if (ctx && ctx.state === 'suspended' && gestureUnlocked) {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function ensureCtx() {
  if (muted) return null;
  return getSharedAudioContext(false);
}

['pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
  window.addEventListener(evt, () => {
    gestureUnlocked = true;
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }, { capture: true, passive: true, once: true });
});

function tone(freqStart, freqEnd, durSec, type = 'sine', vol = 0.08, delay = 0) {
  const c = ensureCtx(); if (!c) return;
  const now = c.currentTime + delay;
  const osc = c.createOscillator(), gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, now);
  if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + durSec);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);
  osc.connect(gain); gain.connect(c.destination);
  osc.start(now); osc.stop(now + durSec + 0.02);
}

export const isMuted = () => muted;

export function setMuted(next) {
  muted = Boolean(next);
  try { localStorage.setItem(MUTED_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  if (muted) stopRocketRumbling();
  return muted;
}

export const toggleMute = () => setMuted(!muted);

export function playHover() {
  if (!gestureUnlocked && !ctx) return;
  const now = performance.now();
  if (now - lastHoverAt < 55) return;
  lastHoverAt = now;
  tone(860, 1140, 0.035, 'triangle', 0.025);
}

export function playEquip() {
  tone(280, 540, 0.075, 'triangle', 0.07, 0);
  tone(540, 760, 0.085, 'sine', 0.06, 0.055);
}

export function playWarning() {
  tone(250, 190, 0.11, 'sawtooth', 0.05, 0);
  tone(220, 170, 0.13, 'sawtooth', 0.05, 0.12);
}

export function playCountdownBeep(final = false) {
  tone(final ? 1040 : 620, final ? 1320 : 620, final ? 0.24 : 0.09, 'square', final ? 0.08 : 0.045);
}

export function playDownlinkPing() {
  tone(740, 1120, 0.09, 'sine', 0.07, 0);
  tone(1120, 1520, 0.14, 'triangle', 0.06, 0.07);
}

export function playAlertKlaxon() {
  tone(820, 520, 0.14, 'sawtooth', 0.08, 0);
  tone(880, 560, 0.16, 'sawtooth', 0.08, 0.17);
  tone(420, 860, 0.18, 'triangle', 0.055, 0.34);
}

export function playRepairSuccess() {
  tone(523.25, 783.99, 0.11, 'triangle', 0.085, 0);
  tone(783.99, 1046.5, 0.18, 'sine', 0.085, 0.09);
  tone(1046.5, 1318.5, 0.24, 'triangle', 0.065, 0.19);
}

export function playHullSpark() {
  tone(190, 55, 0.18, 'sawtooth', 0.11, 0);
  tone(940, 260, 0.11, 'square', 0.06, 0.04);
}

export function playVictoryFanfare() {
  [[523.25, 0, 0.13], [659.25, 0.11, 0.13], [783.99, 0.22, 0.15], [1046.5, 0.34, 0.35]].forEach(([f, d, dur]) => {
    tone(f, f * 1.01, dur, 'triangle', 0.08, d);
  });
}

export function playStarChime(idx = 0) {
  const freqs = [587.33, 783.99, 1046.5];
  const f = freqs[Math.min(2, Math.max(0, idx))];
  tone(f, f * 1.02, 0.18, 'triangle', 0.085, 0);
  tone(f * 1.5, f * 1.5, 0.14, 'sine', 0.045, 0.04);
}

export function playRankStamp() {
  tone(150, 62, 0.22, 'sawtooth', 0.09, 0);
  tone(440, 880, 0.16, 'triangle', 0.06, 0.03);
}

export function playStageSep() {
  tone(160, 48, 0.22, 'sawtooth', 0.11, 0);
  tone(820, 290, 0.14, 'triangle', 0.07, 0.03);
}

export function playDeployServoWhir(stageIdx = 0) {
  const base = stageIdx === 0 ? 185 : (stageIdx === 1 ? 235 : 310);
  tone(base, base * 1.48, 0.34, 'triangle', 0.048, 0);
  tone(base * 0.5, base * 0.72, 0.28, 'sine', 0.038, 0.02);
}

export function playDeployLatchLock(stageIdx = 0) {
  const f = stageIdx === 0 ? 640 : (stageIdx === 1 ? 820 : 1040);
  tone(190, 95, 0.055, 'square', 0.065, 0);
  tone(f, f * 1.18, 0.16, 'triangle', 0.06, 0.025);
}

export function playHoloScanPing() {
  tone(680, 1240, 0.09, 'sine', 0.065, 0);
  tone(1320, 1760, 0.15, 'triangle', 0.05, 0.055);
}

export function startRocketRumbling() {
  const c = ensureCtx(); if (!c || rumbleNodes) return;
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i += 1) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
    data[i] = last * 3.2;
  }
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 175;
  const sub = c.createOscillator(); sub.type = 'sawtooth'; sub.frequency.value = 48;
  const subGain = c.createGain(); subGain.gain.value = 0.035;
  const master = c.createGain(); master.gain.setValueAtTime(0.001, c.currentTime);
  master.gain.linearRampToValueAtTime(0.16, c.currentTime + 0.5);
  src.connect(filter); filter.connect(master);
  sub.connect(subGain); subGain.connect(master);
  master.connect(c.destination);
  src.start(); sub.start();
  rumbleNodes = { src, sub, master };
}

export function stopRocketRumbling() {
  if (!rumbleNodes || !ctx) { rumbleNodes = null; return; }
  const { src, sub, master } = rumbleNodes;
  rumbleNodes = null;
  try {
    const t = ctx.currentTime;
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    src.stop(t + 0.28); sub.stop(t + 0.28);
  } catch { /* ignore */ }
}

export function playSpacecraftExplosion() {
  const c = ensureCtx(); if (!c) return;
  const now = c.currentTime;
  const dur = 1.35;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i += 1) {
    last = (last + 0.08 * (Math.random() * 2 - 1)) / 1.08;
    data[i] = last * 4.5 * Math.pow(Math.max(0, 1 - i / len), 1.35);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const lpf = c.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(540, now);
  lpf.frequency.exponentialRampToValueAtTime(55, now + dur);
  const boomGain = c.createGain();
  boomGain.gain.setValueAtTime(0.001, now);
  boomGain.gain.linearRampToValueAtTime(0.32, now + 0.02);
  boomGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(lpf);
  lpf.connect(boomGain);
  boomGain.connect(c.destination);
  src.start(now);
  src.stop(now + dur + 0.05);

  tone(110, 24, 0.9, 'sawtooth', 0.16, 0);
  tone(64, 18, 1.05, 'sine', 0.18, 0);
  [0.02, 0.09, 0.18, 0.29, 0.42].forEach((delay, idx) => {
    tone(920 - idx * 120, 190, 0.085, 'square', 0.045, delay);
  });
}

function normalizeHazardKind(kind) {
  if (kind === 'cme' || kind === 'solar') return 'solar';
  if (kind === 'cryo' || kind === 'eclipse') return 'eclipse';
  if (kind === 'gimbal' || kind === 'antenna') return 'antenna';
  return 'debris';
}

function playNoiseBurst(durSec = 0.28, filterType = 'bandpass', freqStart = 1200, freqEnd = 420, vol = 0.05, delay = 0) {
  const c = ensureCtx(); if (!c) return;
  const now = c.currentTime + delay;
  const len = Math.max(256, Math.floor(c.sampleRate * durSec));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.7);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const flt = c.createBiquadFilter();
  flt.type = filterType;
  flt.frequency.setValueAtTime(freqStart, now);
  flt.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + durSec);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);
  src.connect(flt); flt.connect(gain); gain.connect(c.destination);
  src.start(now); src.stop(now + durSec + 0.02);
}

export function playHazardStartCue(hazardType) {
  const kind = normalizeHazardKind(hazardType);
  if (kind === 'debris') {
    tone(1320, 980, 0.09, 'triangle', 0.038, 0.04);
    playNoiseBurst(0.24, 'bandpass', 2200, 750, 0.042, 0.02);
  } else if (kind === 'solar') {
    playNoiseBurst(0.42, 'highpass', 1800, 650, 0.036, 0.02);
    tone(780, 1480, 0.14, 'sawtooth', 0.026, 0.06);
  } else if (kind === 'eclipse') {
    tone(1760, 1318, 0.22, 'sine', 0.036, 0.02);
    tone(2093, 1567, 0.26, 'triangle', 0.026, 0.09);
  } else {
    tone(420, 290, 0.07, 'square', 0.028, 0.02);
    tone(310, 440, 0.07, 'square', 0.028, 0.11);
    playNoiseBurst(0.16, 'bandpass', 2600, 1400, 0.03, 0.05);
  }
}

export function playHazardResolveCue(hazardType, choiceIndex = 0, outcome = {}) {
  const kind = normalizeHazardKind(hazardType);
  const damaged = choiceIndex === 'timeout' || (outcome?.hullDelta || 0) < 0;
  if (damaged) {
    playNoiseBurst(0.22, 'bandpass', 1600, 320, 0.05, 0.0);
    tone(240, 110, 0.16, 'sawtooth', 0.045, 0.02);
    return;
  }
  if (kind === 'debris' && choiceIndex === 0) {
    playNoiseBurst(0.32, 'highpass', 950, 2100, 0.048, 0.0);
    tone(340, 520, 0.16, 'triangle', 0.032, 0.03);
  } else if (kind === 'solar' && choiceIndex === 0) {
    tone(440, 880, 0.26, 'sine', 0.045, 0.0);
    tone(660, 1320, 0.28, 'triangle', 0.035, 0.05);
  } else if (kind === 'solar' && choiceIndex === 1) {
    tone(320, 740, 0.24, 'triangle', 0.042, 0.0);
    tone(640, 960, 0.22, 'sine', 0.035, 0.06);
  } else if (kind === 'eclipse' && choiceIndex === 0) {
    tone(180, 390, 0.34, 'sine', 0.05, 0.0);
    playNoiseBurst(0.30, 'lowpass', 700, 260, 0.038, 0.02);
  } else if (kind === 'antenna' && choiceIndex === 1) {
    tone(290, 620, 0.28, 'triangle', 0.042, 0.0);
    tone(880, 1320, 0.12, 'sine', 0.038, 0.24);
  } else {
    tone(520, 1040, 0.18, 'triangle', 0.036, 0.0);
  }
}
