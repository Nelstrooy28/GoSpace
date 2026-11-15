import { getHazardProtocol } from './catalog.js';
import { playAlertKlaxon, playHullSpark, playRepairSuccess, playWarning } from './sfx.js';

const KIND_ORDER = ['debris', 'cme', 'cryo', 'gimbal'];
const MAX_SIMULATION_AUTO_HAZARDS = 2;

let stateRef = null;
let evalRef = null;
let callbacks = {};
let hullIntegrity = 100;
let anomaliesResolved = 0;
let anomaliesMissed = 0;
let autoTriggeredCount = 0;
let milestone35Done = false;
let milestone70Done = false;
let activeHazard = null;
let nextScheduleSec = 42;
let cycleIdx = 0;
let resolvedBannerUntil = 0;
let resolvedBannerText = '';

function buildHazardSpec(kind) {
  const batt = callbacks.getBatterySoc ? callbacks.getBatterySoc() : 84;
  const proto = getHazardProtocol(kind, stateRef, batt);
  return {
    ...proto,
    hullLossOnMiss: 26,
    batteryLossOnMiss: 18,
    dataLossRatio: kind === 'cme' ? 0.3 : 0,
    drainMult: kind === 'cryo' ? 1.0 : 1.0
  };
}

function scheduleNext() {
  nextScheduleSec = stateRef?.sandboxMode ? (18 + Math.random() * 8) : 45;
}

/**
 * Initializes the Stage 3 Orbital Hazard & Emergency Response manager.
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
  autoTriggeredCount = 0;
  milestone35Done = false;
  milestone70Done = false;
  activeHazard = null;
  resolvedBannerUntil = 0;
  resolvedBannerText = '';
  cycleIdx = 0;
  nextScheduleSec = 42;
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
 * Resolves the active anomaly using one of the 3 ConOps engineering choices (index 0, 1, 2).
 */
export function resolveActiveHazardChoice(choiceIdx = 0) {
  if (!activeHazard) return { ok: false, reason: 'none' };
  const idx = Number(choiceIdx);
  const batt = callbacks.getBatterySoc ? callbacks.getBatterySoc() : 84;
  const proto = getHazardProtocol(activeHazard.kind, stateRef, batt);
  const chosen = proto.choices[idx];
  if (!chosen) return { ok: false, reason: 'invalid-choice' };

  const resolved = activeHazard;
  activeHazard = null;
  const scoreDelta = chosen.scoreDelta || 0;
  const rawHullDelta = chosen.hullDelta || 0;
  const hazMult = evalRef?.designRisks?.lowLifetime ? 1.35 : 1.0;
  const hullDelta = rawHullDelta < 0 ? Math.round(rawHullDelta * hazMult) : rawHullDelta;
  anomaliesResolved += 1;
  hullIntegrity = Math.max(0, Math.min(100, hullIntegrity + hullDelta));
  resolvedBannerUntil = hullIntegrity > 0 ? performance.now() + 3600 : 0;
  resolvedBannerText = chosen.toast;
  scheduleNext();
  if (hullDelta <= -10) playWarning(); else playRepairSuccess();

  const payload = {
    ok: true,
    kind: resolved.kind,
    title: resolved.title,
    choiceIndex: idx,
    choice: chosen,
    bonus: scoreDelta,
    scoreDelta,
    hullDelta,
    batteryDelta: chosen.batteryDelta || 0,
    solarPauseSec: chosen.solarPauseSec || 0,
    sensorOfflineSec: chosen.sensorOfflineSec || 0,
    commsPauseSec: chosen.commsPauseSec || 0,
    omniReducedCount: chosen.omniReducedCount || 0,
    toast: chosen.toast,
    hullIntegrity,
    anomaliesResolved
  };
  callbacks.onResolve?.(payload);
  return payload;
}

/**
 * Legacy helper preserving numeric hotkey ('1'|'2'|'3') or default index 0 resolution.
 */
export function resolveActiveHazard(key = null) {
  if (!activeHazard) return { ok: false, reason: 'none' };
  if (key === '1' || key === '2' || key === '3') {
    return resolveActiveHazardChoice(Number(key) - 1);
  }
  return resolveActiveHazardChoice(0);
}

export function clearActiveHazard() {
  activeHazard = null;
  resolvedBannerUntil = 0;
  resolvedBannerText = '';
}

export function applyHullDelta(delta, minHull = 0) {
  hullIntegrity = Math.max(minHull, Math.min(100, hullIntegrity + Number(delta || 0)));
  return Math.round(hullIntegrity);
}

/**
 * Advances real-time countdowns for scheduled and active hazards.
 */
export function updateOrbitHazards(realDt, { inEclipse = false, timeWarp = 1, tutorialActive = false, destroyed = false, milestonePct = 0 } = {}) {
  if (tutorialActive || destroyed) return;

  if (activeHazard) {
    activeHazard.remainingSec = Math.max(0, activeHazard.remainingSec - realDt);
    if (activeHazard.remainingSec <= 0) {
      const missed = activeHazard;
      activeHazard = null;
      anomaliesMissed += 1;
      const hazMult = evalRef?.designRisks?.lowLifetime ? 1.35 : 1.0;
      const effHullLoss = Math.round(missed.hullLossOnMiss * hazMult);
      hullIntegrity = Math.max(0, hullIntegrity - effHullLoss);
      resolvedBannerUntil = hullIntegrity > 0 ? performance.now() + 3600 : 0;
      resolvedBannerText = `💥 RESPONSE TIMED OUT — -${effHullLoss}% HULL & -${missed.batteryLossOnMiss}% BATTERY!`;
      scheduleNext();
      playHullSpark();
      callbacks.onExpire?.({
        kind: missed.kind,
        title: missed.title,
        hullLoss: effHullLoss,
        batteryLoss: missed.batteryLossOnMiss,
        dataLossRatio: missed.dataLossRatio,
        hullIntegrity,
        anomaliesMissed
      });
    }
    return;
  }

  const canAutoTrigger = stateRef?.sandboxMode || autoTriggeredCount < MAX_SIMULATION_AUTO_HAZARDS;
  if (!canAutoTrigger || timeWarp <= 0) return;

  if (!stateRef?.sandboxMode) {
    if (!milestone35Done && milestonePct >= 30) {
      milestone35Done = true;
      autoTriggeredCount += 1;
      triggerRandomHazard(inEclipse ? 'cryo' : null);
      return;
    }
    if (!milestone70Done && milestonePct >= 65) {
      milestone70Done = true;
      autoTriggeredCount += 1;
      triggerRandomHazard(inEclipse ? 'cryo' : (cycleIdx % 2 === 1 ? 'gimbal' : null));
      return;
    }
  }

  nextScheduleSec -= realDt;
  if (nextScheduleSec <= 0) {
    if (!stateRef?.sandboxMode) {
      if (!milestone35Done) milestone35Done = true;
      else if (!milestone70Done) milestone70Done = true;
    }
    autoTriggeredCount += 1;
    const autoKind = inEclipse && (cycleIdx % 2 === 1) ? 'cryo' : null;
    triggerRandomHazard(autoKind);
  }
}

/**
 * Returns an immutable telemetry snapshot of hull integrity and active anomaly status.
 */
export function getHazardSnapshot() {
  const now = performance.now();
  const batt = callbacks.getBatterySoc ? callbacks.getBatterySoc() : 84;
  let activeSnap = null;
  if (activeHazard) {
    const liveProto = getHazardProtocol(activeHazard.kind, stateRef, batt);
    activeSnap = {
      kind: activeHazard.kind,
      icon: activeHazard.icon,
      title: activeHazard.title,
      detail: activeHazard.detail,
      choices: liveProto.choices,
      drainMult: activeHazard.drainMult,
      durationSec: activeHazard.durationSec,
      remainingSec: Number(activeHazard.remainingSec.toFixed(1)),
      pct: Math.max(0, Math.round((activeHazard.remainingSec / activeHazard.durationSec) * 100))
    };
  }
  return {
    hullIntegrity: Math.round(hullIntegrity),
    anomaliesResolved,
    anomaliesMissed,
    lowBattery: batt < 15,
    resolvedBanner: now < resolvedBannerUntil ? resolvedBannerText : '',
    activeHazard: activeSnap
  };
}
