import { getHazardProtocol } from './catalog.js';
import { stripEmoji } from './icons.js';
import { playAlertKlaxon, playHullSpark, playRepairSuccess, playWarning } from './sfx.js';

const KIND_ORDER = ['debris', 'cme', 'cryo', 'gimbal'];
const POST_ACTION_GRACE_MS = 4000;

let stateRef = null;
let evalRef = null;
let callbacks = {};
let hullIntegrity = 100;
let anomaliesResolved = 0;
let anomaliesMissed = 0;
let activeHazard = null;
let firstHazardScheduled = false;
let nextHazardDelaySec = 17;
let nextHazardAtMs = 0;
let lastHazardId = '';
let lastPlayerActionMs = 0;
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
    drainMult: 1.0
  };
}

function computeNextHazardDelaySec(requiredEvents = 2, isFirst = false) {
  if (isFirst) {
    return 14 + Math.random() * 6; // 14s - 20s active flight after briefing & array deploy
  }
  if (anomaliesResolved < requiredEvents) {
    return Math.min(16, 11 + Math.random() * 5); // <= 16s cap until Space Events objective met
  }
  return Math.max(18, 32 + Math.random() * 10); // 32s - 42s ongoing ambient danger (min 18s cooldown)
}

function scheduleNext(requiredEvents = 2, isFirst = false) {
  nextHazardDelaySec = computeNextHazardDelaySec(requiredEvents, isFirst);
  nextHazardAtMs = performance.now() + nextHazardDelaySec * 1000;
}

function selectContextualHazardKind({ inEclipse = false, inLineOfSight = false, onboardBuffer = 0 } = {}) {
  let pool = [];
  if (inEclipse) {
    pool = ['cryo', 'cryo', 'cryo', 'debris'];
  } else {
    pool = ['cme', 'debris', 'cme', 'debris'];
  }
  if (inLineOfSight || onboardBuffer >= 2) {
    pool.push('gimbal', 'gimbal');
  }
  const filtered = pool.filter((k) => k !== lastHazardId);
  const candidates = filtered.length ? filtered : KIND_ORDER.filter((k) => k !== lastHazardId);
  return candidates[Math.floor(Math.random() * candidates.length)] || 'debris';
}

/**
 * Records an orbit player action ([E] / [SPACE]) to enforce a 4.0s hazard grace buffer.
 */
export function recordOrbitPlayerAction() {
  lastPlayerActionMs = performance.now();
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
  activeHazard = null;
  firstHazardScheduled = false;
  resolvedBannerUntil = 0;
  resolvedBannerText = '';
  lastHazardId = '';
  lastPlayerActionMs = 0;
  cycleIdx = 0;
  nextHazardDelaySec = 17;
  nextHazardAtMs = 0;
}

/**
 * Triggers a space hazard immediately (cycled through all 4 types when called manually).
 */
export function triggerRandomHazard(forcedKind = null) {
  if (!stateRef) return null;
  const kind = forcedKind && KIND_ORDER.includes(forcedKind)
    ? forcedKind
    : KIND_ORDER[cycleIdx++ % KIND_ORDER.length];
  lastHazardId = kind;
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
export function resolveActiveHazardChoice(choiceIdx = 0, requiredEvents = 2) {
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
  resolvedBannerText = stripEmoji(chosen.toast);
  scheduleNext(requiredEvents, false);
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
    toast: stripEmoji(chosen.toast),
    hullIntegrity,
    anomaliesResolved
  };
  callbacks.onResolve?.(payload);
  return payload;
}

/**
 * Legacy helper preserving numeric hotkey ('1'|'2'|'3') or default index 0 resolution.
 */
export function resolveActiveHazard(key = null, requiredEvents = 2) {
  if (!activeHazard) return { ok: false, reason: 'none' };
  if (key === '1' || key === '2' || key === '3') {
    return resolveActiveHazardChoice(Number(key) - 1, requiredEvents);
  }
  return resolveActiveHazardChoice(0, requiredEvents);
}

export function clearActiveHazard() {
  activeHazard = null;
  resolvedBannerUntil = 0;
  resolvedBannerText = '';
}

export function applyHullDelta(delta, minHull = 0) {
  hullIntegrity = Math.max(minHull, Math.min(100, hullIntegrity + Number(delta || 0)));
  if (hullIntegrity <= 0.001) hullIntegrity = 0;
  return hullIntegrity <= 0 ? 0 : Number(hullIntegrity.toFixed(2));
}

/**
 * Advances real-time countdowns for scheduled and active hazards.
 */
export function updateOrbitHazards(
  realDt,
  {
    inEclipse = false,
    inLineOfSight = false,
    onboardBuffer = 0,
    deployCompleted = true,
    requiredEvents = 2,
    timeWarp = 1,
    tutorialActive = false,
    destroyed = false
  } = {}
) {
  if (tutorialActive || destroyed) return;

  const now = performance.now();

  if (activeHazard) {
    activeHazard.remainingSec = Math.max(0, activeHazard.remainingSec - realDt);
    if (activeHazard.remainingSec <= 0) {
      const missed = activeHazard;
      activeHazard = null;
      anomaliesMissed += 1;
      const hazMult = evalRef?.designRisks?.lowLifetime ? 1.35 : 1.0;
      const effHullLoss = Math.round(missed.hullLossOnMiss * hazMult);
      hullIntegrity = Math.max(0, hullIntegrity - effHullLoss);
      resolvedBannerUntil = hullIntegrity > 0 ? now + 3600 : 0;
      resolvedBannerText = `RESPONSE TIMED OUT — -${effHullLoss}% HULL & -${missed.batteryLossOnMiss}% BATTERY!`;
      scheduleNext(requiredEvents, false);
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

  if (timeWarp <= 0 || !deployCompleted) return;

  if (!firstHazardScheduled) {
    firstHazardScheduled = true;
    scheduleNext(requiredEvents, true);
    return;
  }

  nextHazardDelaySec = Math.max(0, nextHazardDelaySec - realDt);
  nextHazardAtMs = now + nextHazardDelaySec * 1000;

  const graceElapsed = now - lastPlayerActionMs;
  if (nextHazardDelaySec <= 0 && graceElapsed >= POST_ACTION_GRACE_MS) {
    const chosenKind = selectContextualHazardKind({ inEclipse, inLineOfSight, onboardBuffer });
    triggerRandomHazard(chosenKind);
    scheduleNext(requiredEvents, false);
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
  const graceRemSec = lastPlayerActionMs > 0
    ? Number((Math.max(0, POST_ACTION_GRACE_MS - (now - lastPlayerActionMs)) / 1000).toFixed(1))
    : 0;
  return {
    hullIntegrity: hullIntegrity <= 0 ? 0 : Math.max(1, Math.round(hullIntegrity)),
    hullExact: Number(hullIntegrity.toFixed(2)),
    anomaliesResolved,
    anomaliesMissed,
    lowBattery: batt < 15,
    resolvedBanner: now < resolvedBannerUntil ? resolvedBannerText : '',
    activeHazard: activeSnap,
    nextHazardAtMs,
    nextHazardInSec: Number(nextHazardDelaySec.toFixed(1)),
    graceRemSec,
    lastHazardId
  };
}
