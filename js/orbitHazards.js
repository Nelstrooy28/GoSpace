import { playAlertKlaxon, playHullSpark, playRepairSuccess } from './sfx.js';

const KIND_ORDER = ['debris', 'cme', 'cryo', 'gimbal'];

let stateRef = null;
let evalRef = null;
let callbacks = {};
let hullIntegrity = 100;
let anomaliesResolved = 0;
let anomaliesMissed = 0;
let activeHazard = null;
let nextScheduleSec = 20;
let cycleIdx = 0;
let resolvedBannerUntil = 0;
let resolvedBannerText = '';

const hasPropulsion = (s) => ['cold-gas-rcs', 'green-monoprop', 'xenon-ion'].includes(s?.thermalId);
const hasCryoProtection = (s) => s?.solarId === 'rtg-nuclear' || s?.thermalId === 'cryocooler-st';
const hasRadShield = (s) => s?.busId === 'flagship-bus' || s?.solarId === 'rtg-nuclear' || s?.thermalId === 'cryocooler-st';

function buildHazardSpec(kind) {
  if (kind === 'debris') {
    const armed = hasPropulsion(stateRef);
    return {
      kind: 'debris',
      icon: '☄️',
      title: 'ORBITAL DEBRIS / MICROMETEOROID INTERCEPT',
      detail: armed
        ? 'High-velocity fragment cloud crossing orbital track — fire lateral thrusters!'
        : 'Hypervelocity micrometeoroids inbound — no active thruster equipped!',
      key: armed ? 'd' : 'r',
      keyLabel: armed ? 'D' : 'R',
      actionLabel: armed ? '[D] THRUSTER DODGE' : '[R] ISOLATE DAMAGED CELLS',
      hardwareProtected: armed,
      hardwareNote: armed
        ? 'HARDWARE PROTECTED! Active thrusters execute a zero-damage evasive dodge.'
        : 'PASSIVE WHEELS ONLY: Partial cell isolation reduces hull impact.',
      damageOnSave: armed ? 0 : 3,
      hullLossOnMiss: 18,
      batteryLossOnMiss: 8,
      dataLossRatio: 0,
      drainMult: 1,
      durationSec: 9.0
    };
  }
  if (kind === 'cme') {
    const shielded = hasRadShield(stateRef);
    return {
      kind: 'cme',
      icon: '☀️',
      title: 'SOLAR FLARE / CORONAL MASS EJECTION',
      detail: 'High-energy proton wave approaching — protect imaging optics & flight memory!',
      key: 'f',
      keyLabel: 'F',
      actionLabel: '[F] SHIELD OPTICS & REBOOT',
      hardwareProtected: shielded,
      hardwareNote: shielded
        ? 'HARDWARE PROTECTED! Rad-hard/RTG/Shield structure limits radiation surge.'
        : 'Shield optics immediately or radiation flips will wipe buffered science.',
      damageOnSave: 0,
      hullLossOnMiss: shielded ? 6 : 12,
      batteryLossOnMiss: 14,
      dataLossRatio: shielded ? 0.2 : 0.48,
      drainMult: 1.2,
      durationSec: 9.0
    };
  }
  if (kind === 'cryo') {
    const protectedHw = hasCryoProtection(stateRef);
    return {
      kind: 'cryo',
      icon: '❄️',
      title: 'ECLIPSE CRYO-FREEZE / BUS BROWNOUT',
      detail: 'External skin plunging below -140°C — stabilize bus voltage and heaters!',
      key: 't',
      keyLabel: 'T',
      actionLabel: '[T] PULSE SURVIVAL HEATERS',
      hardwareProtected: protectedHw,
      hardwareNote: protectedHw
        ? 'HARDWARE PROTECTED! RTG / Cryo Sunshield cuts thermal drain by 70%.'
        : 'Heavy eclipse heater load — pulse survival heaters before brownout!',
      damageOnSave: 0,
      hullLossOnMiss: protectedHw ? 4 : 10,
      batteryLossOnMiss: protectedHw ? 5 : 18,
      dataLossRatio: 0,
      drainMult: protectedHw ? 0.3 : 1.0,
      durationSec: 9.5
    };
  }
  const hasLaser = stateRef?.transceiverId === 'ka-optical' || stateRef?.transceiverId === 'ka-mesh';
  return {
    kind: 'gimbal',
    icon: '📡',
    title: 'COMMS GIMBAL JAM / STAR-TRACKER DRIFT',
    detail: 'Attitude gyro bias drifted off station lock — downlink throughput throttled!',
    key: 'r',
    keyLabel: 'R',
    actionLabel: '[R] RECALIBRATE GIMBAL',
    hardwareProtected: hasLaser,
    hardwareNote: hasLaser
      ? 'HARDWARE PROTECTED! Precision Ka-Band / Laser gimbal locks rapid recovery.'
      : 'Recalibrate pointing assembly to restore full station pass bandwidth.',
    damageOnSave: 0,
    hullLossOnMiss: 8,
    batteryLossOnMiss: 6,
    dataLossRatio: 0.15,
    drainMult: 0.9,
    durationSec: 8.5
  };
}

function scheduleNext() {
  nextScheduleSec = 18 + Math.random() * 7;
}

/**
 * Initializes the Stage 3 Orbital Hazard & Emergency Repair manager.
 */
export function initOrbitHazards(missionState, evaluation, cbs = {}) {
  stateRef = missionState;
  evalRef = evaluation;
  callbacks = cbs;
  resetOrbitHazards();
}

/**
 * Resets hull integrity, counters, and hazard timers on Orbit mount.
 */
export function resetOrbitHazards() {
  hullIntegrity = 100;
  anomaliesResolved = 0;
  anomaliesMissed = 0;
  activeHazard = null;
  resolvedBannerUntil = 0;
  resolvedBannerText = '';
  cycleIdx = 0;
  scheduleNext();
}

/**
 * Triggers a space hazard immediately (cycled through all 4 types when called manually).
 */
export function triggerRandomHazard(forcedKind = null) {
  if (!stateRef) return null;
  const kind = forcedKind && KIND_ORDER.includes(forcedKind)
    ? forcedKind
    : KIND_ORDER[cycleIdx++ % KIND_ORDER.length];
  const spec = buildHazardSpec(kind);
  activeHazard = {
    ...spec,
    remainingSec: spec.durationSec,
    startedAt: performance.now()
  };
  playAlertKlaxon();
  callbacks.onTrigger?.({ ...activeHazard });
  return { ...activeHazard };
}

/**
 * Attempts to resolve the current emergency hazard via UI button click or hotkey.
 */
export function resolveActiveHazard(key = null) {
  if (!activeHazard) return { ok: false, reason: 'none' };
  if (key !== null && key.toLowerCase() !== activeHazard.key) {
    return { ok: false, reason: 'wrong-key', expectedKey: activeHazard.key };
  }
  const resolved = activeHazard;
  activeHazard = null;
  const bonus = 75;
  anomaliesResolved += 1;
  hullIntegrity = Math.max(5, Math.min(100, hullIntegrity - (resolved.damageOnSave || 0)));
  resolvedBannerUntil = performance.now() + 3400;
  resolvedBannerText = 'SYSTEMS NOMINAL — ANOMALY RESOLVED (+75)';
  scheduleNext();
  playRepairSuccess();
  const payload = {
    ok: true,
    kind: resolved.kind,
    title: resolved.title,
    bonus,
    hardwareProtected: resolved.hardwareProtected,
    damageTaken: resolved.damageOnSave || 0,
    hullIntegrity,
    anomaliesResolved
  };
  callbacks.onResolve?.(payload);
  return payload;
}

export function applyHullDelta(delta, minHull = 5) {
  hullIntegrity = Math.max(minHull, Math.min(100, hullIntegrity + Number(delta || 0)));
  return Math.round(hullIntegrity);
}

/**
 * Advances real-time countdowns for scheduled and active hazards.
 */
export function updateOrbitHazards(realDt, { inEclipse = false, timeWarp = 1, tutorialActive = false } = {}) {
  if (tutorialActive) return;

  if (activeHazard) {
    activeHazard.remainingSec = Math.max(0, activeHazard.remainingSec - realDt);
    if (activeHazard.remainingSec <= 0) {
      const missed = activeHazard;
      activeHazard = null;
      anomaliesMissed += 1;
      hullIntegrity = Math.max(10, hullIntegrity - missed.hullLossOnMiss);
      scheduleNext();
      playHullSpark();
      callbacks.onExpire?.({
        kind: missed.kind,
        title: missed.title,
        hullLoss: missed.hullLossOnMiss,
        batteryLoss: missed.batteryLossOnMiss,
        dataLossRatio: missed.dataLossRatio,
        hullIntegrity,
        anomaliesMissed
      });
    }
    return;
  }

  if (timeWarp > 0) {
    nextScheduleSec -= realDt;
    if (nextScheduleSec <= 0) {
      const autoKind = inEclipse && (cycleIdx % 2 === 1) ? 'cryo' : null;
      triggerRandomHazard(autoKind);
    }
  }
}

/**
 * Returns an immutable telemetry snapshot of hull integrity and active anomaly status.
 */
export function getHazardSnapshot() {
  const now = performance.now();
  return {
    hullIntegrity: Math.round(hullIntegrity),
    anomaliesResolved,
    anomaliesMissed,
    resolvedBanner: now < resolvedBannerUntil ? resolvedBannerText : '',
    activeHazard: activeHazard
      ? {
          kind: activeHazard.kind,
          icon: activeHazard.icon,
          title: activeHazard.title,
          detail: activeHazard.detail,
          key: activeHazard.key,
          keyLabel: activeHazard.keyLabel,
          actionLabel: activeHazard.actionLabel,
          hardwareProtected: activeHazard.hardwareProtected,
          hardwareNote: activeHazard.hardwareNote,
          drainMult: activeHazard.drainMult,
          durationSec: activeHazard.durationSec,
          remainingSec: Number(activeHazard.remainingSec.toFixed(1)),
          pct: Math.max(0, Math.round((activeHazard.remainingSec / activeHazard.durationSec) * 100))
        }
      : null
  };
}
