import { getSharedAudioContext } from './sfx.js';

const MUSIC_MUTED_KEY = 'gospace_music_muted';
const MASTER_DUCK_GAIN = 0.14;
const CROSSFADE_SEC = 1.5;
const MUTE_RAMP_SEC = 0.25;

let ctx = null;
let engineBuilt = false;
let unlocked = false;
let currentMood = 'menu';
let musicMuted = localStorage.getItem(MUSIC_MUTED_KEY) === '1';
let hazardTension = false;
let schedulerId = 0;

let masterGain = null;
let warmFilter = null;
let filterLfo = null;
let filterLfoGain = null;
let tensionGain = null;
let buses = null;

// Musical step trackers (scheduled ahead via ctx.currentTime)
let nextPadAt = 0;
let nextBellAt = 0;
let nextLaunchBassAt = 0;
let nextLaunchPadAt = 0;
let nextOrbitPadAt = 0;
let nextTensionAt = 0;
let nextDebriefPadAt = 0;

let menuChordIdx = 0;
let bellStepIdx = 0;
let launchStepIdx = 0;
let launchChordIdx = 0;
let orbitChordIdx = 0;
let tensionBeatIdx = 0;
let debriefChordIdx = 0;
let orbitDroneVoices = null;

const MOODS = ['menu', 'hangar', 'launch', 'orbit', 'debrief'];

// Warm Lydian, Minor-9th, Deep-Space, and Major-Add9 voicings (Hz)
const MENU_LYDIAN_CHORDS = [
  [174.61, 261.63, 329.63, 392.00, 493.88], // Fmaj9#11
  [130.81, 196.00, 246.94, 293.66, 329.63], // Cmaj9
  [146.83, 220.00, 261.63, 329.63, 392.00], // Dm11
  [196.00, 293.66, 440.00, 493.88, 659.25]  // G6add9
];
const MENU_BELL_NOTES = [698.46, 783.99, 880.00, 1046.50, 1318.51, 987.77]; // F5 G5 A5 C6 E6 B5

const LAUNCH_BASS_NOTES = [65.41, 65.41, 49.00, 58.27, 43.65]; // C2, C2, G1, Bb1, F1
const LAUNCH_TENSION_CHORDS = [
  [130.81, 196.00, 233.08, 293.66, 311.13], // Cm9
  [98.00, 146.83, 174.61, 220.00, 261.63]   // Gm11
];

const ORBIT_SHIMMER_CHORDS = [
  [293.66, 440.00, 659.25, 739.99], // D4 A4 E5 F#5 (Lydian space)
  [196.00, 293.66, 440.00, 493.88], // G3 D4 A4 B4
  [246.94, 369.99, 554.37, 880.00]  // B3 F#4 C#5 A5
];

const DEBRIEF_CHORDS = [
  [130.81, 196.00, 246.94, 293.66, 329.63], // Cmaj9
  [174.61, 261.63, 392.00, 440.00, 659.25], // Fmaj9
  [196.00, 293.66, 440.00, 493.88, 587.33]  // G6add9
];

function createCosmicReverbIR(audioCtx, durationSec = 3.0) {
  const length = Math.floor(audioCtx.sampleRate * durationSec);
  const buffer = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const env = Math.pow(1 - t, 2.6) * (1 - Math.exp(-t * 45));
      const white = Math.random() * 2 - 1;
      lp = lp * 0.72 + white * 0.28;
      data[i] = lp * env * 0.55;
    }
  }
  return buffer;
}

function buildEngine(audioCtx) {
  if (engineBuilt) return;
  engineBuilt = true;
  ctx = audioCtx;

  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  masterGain.connect(ctx.destination);

  // Warm sweeping lowpass (LFO smoothly sweeps ~350Hz - 1600Hz)
  warmFilter = ctx.createBiquadFilter();
  warmFilter.type = 'lowpass';
  warmFilter.frequency.setValueAtTime(975, ctx.currentTime);
  warmFilter.Q.setValueAtTime(0.85, ctx.currentTime);

  filterLfo = ctx.createOscillator();
  filterLfo.type = 'sine';
  filterLfo.frequency.setValueAtTime(0.068, ctx.currentTime);
  filterLfoGain = ctx.createGain();
  filterLfoGain.gain.setValueAtTime(625, ctx.currentTime);
  filterLfo.connect(filterLfoGain);
  filterLfoGain.connect(warmFilter.frequency);
  filterLfo.start();

  // Dry bus
  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.62;
  warmFilter.connect(dryGain);
  dryGain.connect(masterGain);

  // 3-second stereo cosmic reverb ConvolverNode
  const convolver = ctx.createConvolver();
  convolver.buffer = createCosmicReverbIR(ctx, 3.0);
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.52;
  const reverbWet = ctx.createGain();
  reverbWet.gain.value = 0.65;
  warmFilter.connect(reverbSend);
  reverbSend.connect(convolver);
  convolver.connect(reverbWet);
  reverbWet.connect(masterGain);

  // Stereo ping-pong feedback delay
  const delayL = ctx.createDelay(1.0);
  const delayR = ctx.createDelay(1.0);
  delayL.delayTime.value = 0.375;
  delayR.delayTime.value = 0.525;
  const fbL = ctx.createGain();
  const fbR = ctx.createGain();
  fbL.gain.value = 0.34;
  fbR.gain.value = 0.34;
  const delayLp = ctx.createBiquadFilter();
  delayLp.type = 'lowpass';
  delayLp.frequency.value = 2100;
  const merger = ctx.createChannelMerger(2);
  const delaySend = ctx.createGain();
  delaySend.gain.value = 0.28;
  const delayWet = ctx.createGain();
  delayWet.gain.value = 0.32;

  warmFilter.connect(delaySend);
  delaySend.connect(delayL);
  delayL.connect(delayLp);
  delayLp.connect(fbL);
  fbL.connect(delayR);
  delayR.connect(fbR);
  fbR.connect(delayL);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);
  merger.connect(delayWet);
  delayWet.connect(masterGain);

  // Adaptive mood stem buses (crossfaded over 1.5s)
  buses = {};
  MOODS.forEach((m) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(m === currentMood ? 1.0 : 0.0001, ctx.currentTime);
    g.connect(warmFilter);
    buses[m] = g;
  });

  // Tension bus nested under orbit
  tensionGain = ctx.createGain();
  tensionGain.gain.setValueAtTime(hazardTension ? 0.68 : 0.0001, ctx.currentTime);
  tensionGain.connect(buses.orbit);

  startOrbitDrone();

  const now = ctx.currentTime;
  nextPadAt = now + 0.05;
  nextBellAt = now + 1.1;
  nextLaunchBassAt = now + 0.05;
  nextLaunchPadAt = now + 0.05;
  nextOrbitPadAt = now + 0.05;
  nextTensionAt = now + 0.1;
  nextDebriefPadAt = now + 0.05;

  schedulerId = window.setInterval(scheduleTick, 220);

  if (!musicMuted) {
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(MASTER_DUCK_GAIN, now + 1.4);
  }
}

function playDetunedVoice(freq, startAt, durSec, targetBus, { level = 0.08, attack = 1.2, release = 1.6, detuneCents = 6, waveA = 'triangle', waveB = 'sawtooth', bLevel = 0.35 } = {}) {
  if (!ctx || !targetBus) return;
  const voiceGain = ctx.createGain();
  const stopAt = startAt + durSec + release;
  const sustainStart = Math.min(startAt + durSec * 0.85, startAt + attack + 0.1);

  voiceGain.gain.setValueAtTime(0.0001, startAt);
  voiceGain.gain.linearRampToValueAtTime(level, startAt + attack);
  voiceGain.gain.setValueAtTime(level * 0.92, Math.max(sustainStart, startAt + attack));
  voiceGain.gain.linearRampToValueAtTime(0.0001, stopAt);
  voiceGain.connect(targetBus);

  const oscA = ctx.createOscillator();
  oscA.type = waveA;
  oscA.frequency.setValueAtTime(freq, startAt);
  oscA.detune.setValueAtTime(-detuneCents, startAt);

  const oscB = ctx.createOscillator();
  oscB.type = waveB;
  oscB.frequency.setValueAtTime(freq, startAt);
  oscB.detune.setValueAtTime(detuneCents, startAt);

  const gainB = ctx.createGain();
  gainB.gain.value = bLevel;

  oscA.connect(voiceGain);
  oscB.connect(gainB);
  gainB.connect(voiceGain);

  oscA.start(startAt);
  oscB.start(startAt);
  oscA.stop(stopAt + 0.05);
  oscB.stop(stopAt + 0.05);
}

function playBellNote(freq, startAt, targetBus, level = 0.045) {
  if (!ctx || !targetBus) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.linearRampToValueAtTime(level, startAt + 0.045);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + 2.6);
  g.connect(targetBus);

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startAt);
  osc.connect(g);
  osc.start(startAt);
  osc.stop(startAt + 2.7);
}

function playBassPulse(freq, startAt, durSec, targetBus, level = 0.13, cutoffMax = 380) {
  if (!ctx || !targetBus) return;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 1.6;
  lp.frequency.setValueAtTime(110, startAt);
  lp.frequency.linearRampToValueAtTime(cutoffMax, startAt + 0.05);
  lp.frequency.exponentialRampToValueAtTime(120, startAt + durSec);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.linearRampToValueAtTime(level, startAt + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + durSec);

  const oscA = ctx.createOscillator();
  oscA.type = 'sawtooth';
  oscA.frequency.setValueAtTime(freq, startAt);
  oscA.detune.setValueAtTime(-5, startAt);

  const oscB = ctx.createOscillator();
  oscB.type = 'triangle';
  oscB.frequency.setValueAtTime(freq, startAt);
  oscB.detune.setValueAtTime(5, startAt);

  oscA.connect(lp);
  oscB.connect(lp);
  lp.connect(g);
  g.connect(targetBus);

  oscA.start(startAt);
  oscB.start(startAt);
  oscA.stop(startAt + durSec + 0.04);
  oscB.stop(startAt + durSec + 0.04);
}

function startOrbitDrone() {
  if (!ctx || !buses?.orbit || orbitDroneVoices) return;
  const now = ctx.currentTime;
  const droneGain = ctx.createGain();
  droneGain.gain.setValueAtTime(0.055, now);
  droneGain.connect(buses.orbit);

  const freqs = [73.42, 73.42, 110.0]; // D2 +/-6c + A2 fifth
  const detunes = [-6, 6, 3];
  orbitDroneVoices = freqs.map((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = i === 1 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(f, now);
    osc.detune.setValueAtTime(detunes[i], now);
    osc.connect(droneGain);
    osc.start(now);
    return osc;
  });
}

function scheduleTick() {
  if (!ctx || ctx.state !== 'running' || !buses) return;
  const now = ctx.currentTime;
  const horizon = now + 0.6;

  // Theme A: Menu & Hangar (Warm Galaxy-Map Lydian Pad + Sparse Bell Pentatonic Arpeggio)
  while (nextPadAt < horizon) {
    const chord = MENU_LYDIAN_CHORDS[menuChordIdx % MENU_LYDIAN_CHORDS.length];
    const padTarget = currentMood === 'hangar' ? buses.hangar : buses.menu;
    chord.forEach((f, idx) => {
      playDetunedVoice(f, nextPadAt, 4.4, padTarget, {
        level: idx === 0 ? 0.085 : 0.055,
        attack: 1.35,
        release: 1.75,
        detuneCents: 6,
        waveA: 'triangle',
        waveB: 'sawtooth',
        bLevel: 0.32
      });
    });
    menuChordIdx += 1;
    nextPadAt += 4.6;
  }

  while (nextBellAt < horizon) {
    if (currentMood === 'menu' || currentMood === 'hangar') {
      const n = MENU_BELL_NOTES[(bellStepIdx * 2 + (bellStepIdx % 3)) % MENU_BELL_NOTES.length];
      playBellNote(n, nextBellAt, currentMood === 'hangar' ? buses.hangar : buses.menu, 0.04);
    }
    bellStepIdx += 1;
    nextBellAt += (bellStepIdx % 3 === 0) ? 2.4 : 1.5;
  }

  // Theme B: Launch (Deep Rhythmic Analog Bass Pulse + Tense Minor-9th Swell)
  while (nextLaunchBassAt < horizon) {
    if (currentMood === 'launch') {
      const f = LAUNCH_BASS_NOTES[launchStepIdx % LAUNCH_BASS_NOTES.length];
      const accent = launchStepIdx % 4 === 0 ? 0.14 : 0.095;
      playBassPulse(f, nextLaunchBassAt, 0.34, buses.launch, accent, launchStepIdx % 2 === 0 ? 420 : 270);
    }
    launchStepIdx += 1;
    nextLaunchBassAt += 0.38;
  }

  while (nextLaunchPadAt < horizon) {
    const chord = LAUNCH_TENSION_CHORDS[launchChordIdx % LAUNCH_TENSION_CHORDS.length];
    chord.forEach((f) => {
      playDetunedVoice(f, nextLaunchPadAt, 3.8, buses.launch, {
        level: 0.055,
        attack: 1.1,
        release: 1.5,
        detuneCents: 6,
        waveA: 'sawtooth',
        waveB: 'triangle',
        bLevel: 0.55
      });
    });
    launchChordIdx += 1;
    nextLaunchPadAt += 4.0;
  }

  // Theme C: Orbit (Weightless Shimmer Harmonies + Hazard Tension Pulse)
  while (nextOrbitPadAt < horizon) {
    const chord = ORBIT_SHIMMER_CHORDS[orbitChordIdx % ORBIT_SHIMMER_CHORDS.length];
    chord.forEach((f) => {
      playDetunedVoice(f, nextOrbitPadAt, 5.4, buses.orbit, {
        level: 0.05,
        attack: 1.8,
        release: 2.2,
        detuneCents: 6,
        waveA: 'triangle',
        waveB: 'sine',
        bLevel: 0.45
      });
    });
    orbitChordIdx += 1;
    nextOrbitPadAt += 5.8;
  }

  while (nextTensionAt < horizon) {
    if (hazardTension && currentMood === 'orbit') {
      const f = tensionBeatIdx % 2 === 0 ? 73.42 : 55.0; // D2 -> A1 urgent pulse
      playBassPulse(f, nextTensionAt, 0.28, tensionGain, 0.14, 240);
    }
    tensionBeatIdx += 1;
    nextTensionAt += 0.5;
  }

  // Theme D: Debrief (Uplifting Major-add9 Horizon Chords)
  while (nextDebriefPadAt < horizon) {
    const chord = DEBRIEF_CHORDS[debriefChordIdx % DEBRIEF_CHORDS.length];
    chord.forEach((f, idx) => {
      playDetunedVoice(f, nextDebriefPadAt, 4.6, buses.debrief, {
        level: idx === 0 ? 0.09 : 0.062,
        attack: 1.15,
        release: 1.8,
        detuneCents: 6,
        waveA: 'triangle',
        waveB: 'sawtooth',
        bLevel: 0.36
      });
    });
    debriefChordIdx += 1;
    nextDebriefPadAt += 4.8;
  }
}

function syncMusicDebug() {
  if (window.__MISSION_DEBUG__) {
    window.__MISSION_DEBUG__.musicMuted = musicMuted;
    window.__MISSION_DEBUG__.music = getMusicDebugState();
  }
}

function attemptUnlock() {
  const shared = getSharedAudioContext(true);
  if (!shared) return;
  if (!engineBuilt) buildEngine(shared);
  if (shared.state === 'suspended') {
    shared.resume().then(() => {
      unlocked = true;
      syncMusicDebug();
    }).catch(() => {});
  } else {
    unlocked = true;
  }
  unlocked = true;
  syncMusicDebug();
}

export function initMusic() {
  if (window.__GOSPACE_MUSIC_BOUND__) return;
  window.__GOSPACE_MUSIC_BOUND__ = true;
  ['pointerdown', 'keydown', 'touchstart', 'click'].forEach((evt) => {
    window.addEventListener(evt, attemptUnlock, { capture: true, passive: true, once: true });
  });
}

export function setMood(nextMood) {
  const mood = MOODS.includes(nextMood) ? nextMood : 'menu';
  if (currentMood === mood) return;
  currentMood = mood;
  if (!ctx || !buses) return;
  const now = ctx.currentTime;
  MOODS.forEach((m) => {
    const g = buses[m].gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(m === mood ? 1.0 : 0.0001, now + CROSSFADE_SEC);
  });
}

export function setHazardTension(active) {
  const next = Boolean(active);
  if (hazardTension === next) return;
  hazardTension = next;
  if (!ctx || !tensionGain) return;
  const now = ctx.currentTime;
  tensionGain.gain.cancelScheduledValues(now);
  tensionGain.gain.setValueAtTime(tensionGain.gain.value, now);
  tensionGain.gain.linearRampToValueAtTime(hazardTension ? 0.68 : 0.0001, now + (hazardTension ? 0.6 : 1.0));
}

export const isMusicMuted = () => musicMuted;

export function setMusicMuted(next) {
  musicMuted = Boolean(next);
  try { localStorage.setItem(MUSIC_MUTED_KEY, musicMuted ? '1' : '0'); } catch { /* ignore */ }
  if (ctx && masterGain) {
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
    masterGain.gain.linearRampToValueAtTime(musicMuted ? 0.0001 : MASTER_DUCK_GAIN, now + MUTE_RAMP_SEC);
  }
  return musicMuted;
}

export function toggleMusicMuted() {
  attemptUnlock();
  return setMusicMuted(!musicMuted);
}

export function getMusicDebugState() {
  return {
    mood: currentMood,
    unlocked,
    muted: musicMuted,
    hazardTension,
    audioState: ctx?.state || 'uninitialized'
  };
}
