const MUTED_KEY = 'gospace_muted_v1';
let ctx = null, muted = localStorage.getItem(MUTED_KEY) === '1', rumbleNodes = null, lastHoverAt = 0;

function ensureCtx() {
  if (muted) return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

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

export function playSafeMode() {
  tone(320, 880, 0.2, 'triangle', 0.07, 0);
}

export function playVictoryFanfare() {
  [[523.25, 0, 0.13], [659.25, 0.11, 0.13], [783.99, 0.22, 0.15], [1046.5, 0.34, 0.35]].forEach(([f, d, dur]) => {
    tone(f, f * 1.01, dur, 'triangle', 0.08, d);
  });
}

export function playStageSep() {
  tone(160, 48, 0.22, 'sawtooth', 0.11, 0);
  tone(820, 290, 0.14, 'triangle', 0.07, 0.03);
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
