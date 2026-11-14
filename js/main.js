import { CATALOG, SCENARIOS, createInitialState, evaluateMissionDesign } from './catalog.js';
import { exportMissionVizJSON } from './missionVizPropagator.js';
import { focusSubsystem, getMeshCount, mountCleanroom, resetCamera, setAutoRotate, setExploded, unmountCleanroom, updateSpacecraft } from './sceneCleanroom.js';
import { mountLaunch, setLaunchCamera, triggerIgnition, unmountLaunch } from './sceneLaunch.js';
import { activateSafeMode, mountOrbit, mountShowcase, repairActiveHazard, scanAsteroid, seekOrbitToPass, setOrbitCameraMode, setOrbitTimeWarp, setOrbitVictoryMode, transmitScience, triggerTestHazard, unmountOrbit } from './sceneOrbit.js';
import { isMuted, playEquip, playHover, playVictoryFanfare, playWarning, toggleMute } from './sfx.js';
import { isTutorialActive, notifyTutorialState, startInteractiveTutorial, stopTutorial } from './tutorial.js';
import { SUB_TABS, renderHud, renderLoadoutDock, renderResourcesList, renderSavedModal, renderStageHud, renderTitleOverlay, updateLaunchOverlay, updateOrbitOverlay } from './ui.js';

const STORAGE_ACTIVE = 'gospace_active_v1', STORAGE_SAVED = 'gospace_saved_v1';
const readJson = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; } };
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const FOCUS_MAP = { busId: 'bus', instrumentIds: 'payload', solarId: 'solar', thermalId: 'thermal', transceiverId: 'comms', hullSkinId: 'bus' };

let stage = 'hangar', titleOpen = true, activeSegment = 'user', activeSub = 'obj', lastEval = null;
let missionState = (() => { const s = readJson(STORAGE_ACTIVE, null); return s?.scenarioId ? s : createInitialState('wildfiresat-l1', false); })();
let activeScene = null, hudHidden = false, codexOpen = false;
let autoRotate = true, exploded = false, launchCam = 'trench', orbitWarp = 25, orbitCam = 'full';
let launchTelemetry = null, orbitTelemetry = null, orbitScore = 0, orbitSessionDirty = true;

function unmountAll() {
  if (activeScene === 'hangar') unmountCleanroom();
  if (activeScene === 'launch') unmountLaunch();
  if (activeScene === 'orbit' || activeScene === 'showcase') unmountOrbit();
  activeScene = null;
}

function triggerWarpFlash() {
  const flash = document.getElementById('warp-flash');
  if (!flash) return;
  flash.classList.remove('active');
  void flash.offsetWidth;
  flash.classList.add('active');
}

function updateDebug(ev) {
  window.__MISSION_DEBUG__ = {
    stage, scenarioId: missionState.scenarioId, cmlLevel: ev.cmlLevel, titleOpen, hudHidden, muted: isMuted(),
    tutorialActive: isTutorialActive(),
    cleanroomActive: activeScene === 'hangar', meshCount: activeScene === 'hangar' ? getMeshCount() : 0,
    launchActive: activeScene === 'launch', launchTelemetry,
    orbitActive: activeScene === 'orbit', orbitTelemetry, orbitScore,
    metrics: ev.metrics, warnings: ev.warnings
  };
}

function spawnPopup(text) {
  const box = document.getElementById('score-popups'), el = document.createElement('div');
  el.className = 'pop-float'; el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 1450);
}

function setStage(nextStage, keepOrbit = false) {
  const prevStage = stage;
  stage = nextStage; codexOpen = false;
  if (stage === 'review' && prevStage !== 'review') playVictoryFanfare();
  if (stage === 'orbit' && prevStage === 'review') setOrbitVictoryMode(false, orbitCam);
  renderAll(!keepOrbit);
}

function mountLiveOrbit(vp, isVictory = false) {
  unmountAll(); orbitTelemetry = null; orbitScore = 0; orbitSessionDirty = false;
  mountOrbit(vp, missionState, lastEval, (t) => {
    orbitTelemetry = t; orbitScore = t.missionScore || 0; orbitWarp = t.timeWarp ?? orbitWarp; updateOrbitOverlay(t);
    if (window.__MISSION_DEBUG__) { window.__MISSION_DEBUG__.orbitTelemetry = t; window.__MISSION_DEBUG__.orbitScore = orbitScore; }
    notifyTutorialState();
  }, {
    victory: isVictory,
    onHazardEvent: (ev) => {
      if (ev.type === 'trigger') {
        orbitWarp = ev.timeWarp ?? 1;
        spawnPopup(`🚨 ${ev.icon} ANOMALY DETECTED · WARP 1x`);
      } else if (ev.type === 'resolve') {
        orbitScore += ev.bonus || 75;
        spawnPopup('+75 FLIGHT DIRECTOR BONUS · SYSTEMS NOMINAL!');
      } else if (ev.type === 'expire') {
        spawnPopup(`💥 HULL IMPACT -${ev.hullLoss}% · MISSED REPAIR`);
      }
    }
  });
  activeScene = 'orbit';
  if (!isVictory) { setOrbitTimeWarp(orbitWarp); setOrbitCameraMode(orbitCam); }
  else setOrbitTimeWarp(1);
}

function applyChrome() {
  document.getElementById('title-overlay').hidden = !titleOpen;
  document.getElementById('hud-layer').classList.toggle('is-hidden', hudHidden || titleOpen);
  document.getElementById('hud-restore-btn').hidden = !hudHidden || titleOpen;
  document.getElementById('codex-menu').hidden = !codexOpen || titleOpen;
  document.getElementById('menu-btn').setAttribute('aria-expanded', String(codexOpen));
  document.getElementById('mute-btn').textContent = isMuted() ? '🔇' : '🔊';
  const titleMute = document.getElementById('title-mute-btn');
  if (titleMute) titleMute.textContent = isMuted() ? '🔇 AUDIO: OFF' : '🔊 AUDIO: ON';
}

function renderAll(rebuildScene = true, focusTag = null) {
  lastEval = evaluateMissionDesign(missionState);
  writeJson(STORAGE_ACTIVE, missionState);
  document.getElementById('sandbox-toggle').checked = Boolean(missionState.sandboxMode);
  document.querySelectorAll('.seg-tab').forEach((b) => b.classList.toggle('active', b.dataset.segment === activeSegment));
  document.querySelectorAll('.stage-btn').forEach((b) => b.classList.toggle('active', b.dataset.stage === stage));
  renderTitleOverlay(Boolean(missionState.sandboxMode), missionState.scenarioId);
  renderLoadoutDock(activeSegment, activeSub, missionState, lastEval);
  renderHud(lastEval, stage);
  applyChrome();

  const vp = document.getElementById('viewport-container');
  vp.dataset.stage = titleOpen ? 'showcase' : stage;
  if (titleOpen) {
    if (activeScene !== 'showcase') {
      unmountAll();
      mountShowcase(vp, missionState);
      activeScene = 'showcase';
    }
  } else if (stage === 'hangar') {
    orbitSessionDirty = true;
    if (activeScene !== 'hangar') {
      unmountAll(); mountCleanroom(vp, missionState);
      activeScene = 'hangar'; setAutoRotate(autoRotate); setExploded(exploded);
    } else if (rebuildScene) updateSpacecraft(missionState, focusTag);
  } else if (stage === 'launch') {
    orbitSessionDirty = true;
    if (activeScene !== 'launch' || rebuildScene) {
      unmountAll(); launchTelemetry = null;
      mountLaunch(vp, missionState, (t) => {
        launchTelemetry = t; updateLaunchOverlay(t);
        if (window.__MISSION_DEBUG__) window.__MISSION_DEBUG__.launchTelemetry = t;
        notifyTutorialState();
      }, () => { if (stage === 'launch') setStage('orbit'); });
      activeScene = 'launch'; setLaunchCamera(launchCam);
    }
  } else if (stage === 'orbit') {
    if (activeScene !== 'orbit' || orbitSessionDirty) {
      mountLiveOrbit(vp, false);
    }
  } else if (stage === 'review') {
    if (activeScene !== 'orbit' || orbitSessionDirty) {
      mountLiveOrbit(vp, true);
    } else {
      setOrbitVictoryMode(true, orbitCam);
      setOrbitTimeWarp(1);
    }
  } else unmountAll();

  renderStageHud(stage, missionState, lastEval, {
    autoRotate, exploded, meshCount: getMeshCount(), launchCam, orbitCam, orbitWarp, orbitScore,
    anomaliesResolved: orbitTelemetry?.anomaliesResolved || 0,
    hullIntegrity: orbitTelemetry?.hullIntegrity ?? 100,
    downlinkCount: orbitTelemetry?.downlinkCount || 0,
    asteroidsScanned: orbitTelemetry?.asteroidsScanned || 0,
    downlinkPts: orbitTelemetry?.downlinkPts,
    anomalyPts: orbitTelemetry?.anomalyPts,
    scanPts: orbitTelemetry?.scanPts,
    batterySoc: orbitTelemetry?.batterySoc
  });
  updateDebug(lastEval);
  notifyTutorialState();
}

const openSaveModal = () => { renderSavedModal(readJson(STORAGE_SAVED, []), lastEval); document.getElementById('saveload-modal').showModal(); };
const handleTransmit = () => {
  const r = transmitScience();
  if (r.ok) {
    orbitScore += r.points;
    if (orbitTelemetry) orbitTelemetry.downlinkCount = (orbitTelemetry.downlinkCount || 0) + 1;
    spawnPopup(`+${r.points} DATA DOWNLINKED (${r.station})!`);
    notifyTutorialState();
  }
};
const handleSafeMode = () => { const r = activateSafeMode(); orbitScore += r.points; spawnPopup(r.hazard ? `+${r.points} FLARE SHIELDED!` : `+${r.points} POWER CYCLED!`); };
const handleScanAsteroid = () => { const r = scanAsteroid(); if (r.ok) { orbitScore += r.points; spawnPopup(`+${r.points} ${r.isComet ? 'COMET' : 'ASTEROID'} ${r.id} SCANNED!`); } };
const handleRepairHazard = (key = null) => { repairActiveHazard(key); };

function init() {
  let lastTitleHover = null;
  document.getElementById('title-overlay')?.addEventListener('mouseover', (e) => {
    const el = e.target.closest('.menu-btn, .contract-card, #title-mute-btn');
    if (el && el !== lastTitleHover) { lastTitleHover = el; playHover(); }
    else if (!el) lastTitleHover = null;
  });
  const startMissionFromTitle = (scenarioId, sandboxMode) => {
    playEquip();
    triggerWarpFlash();
    if (scenarioId) missionState = createInitialState(scenarioId, sandboxMode);
    else missionState.sandboxMode = sandboxMode;
    titleOpen = false;
    stage = 'hangar';
    renderAll(true);
  };
  const tutorialCallbacks = {
    getContext: () => ({ stage, titleOpen, activeSegment, activeSub, missionState, lastEval, launchTelemetry, orbitTelemetry }),
    setupStarterBuild: () => {
      triggerWarpFlash();
      titleOpen = false;
      stage = 'hangar';
      activeSegment = 'user';
      activeSub = 'obj';
      codexOpen = false;
      hudHidden = false;
      missionState = {
        ...createInitialState('wildfiresat-l1', false),
        instrumentIds: ['arctic-multispec'],
        solarId: 'body-mounted',
        vehicleId: 'falcon9-csli',
        transceiverId: 'uhf',
      };
      renderAll(true);
    },
    setSegment: (seg, sub) => {
      activeSegment = seg;
      activeSub = sub || SUB_TABS[seg][0].id;
      renderAll(false);
    },
    selectPart: (field, id, mode) => {
      if (field === 'instrumentIds') {
        const s = new Set(missionState.instrumentIds || []);
        if (mode === 'add') s.add(id);
        else if (s.has(id)) s.delete(id); else s.add(id);
        missionState.instrumentIds = [...s];
      } else {
        missionState[field] = id;
      }
      playEquip();
      renderAll(true, FOCUS_MAP[field] || null);
    },
    goToStage: (next) => setStage(next),
    igniteLaunch: () => triggerIgnition(),
    setOrbitWarp: (w) => {
      orbitWarp = Number(w);
      setOrbitTimeWarp(orbitWarp);
      if (stage === 'orbit') renderStageHud(stage, missionState, lastEval, { orbitCam, orbitWarp, orbitScore });
    },
    seekPass: () => seekOrbitToPass(110),
    transmitNow: () => handleTransmit(),
    returnHome: () => { titleOpen = true; renderAll(true); },
  };

  document.getElementById('mode-campaign-btn').addEventListener('click', () => { stopTutorial(); startMissionFromTitle(null, false); });
  document.getElementById('mode-sandbox-btn').addEventListener('click', () => { stopTutorial(); startMissionFromTitle(null, true); });
  document.getElementById('how-to-play-btn')?.addEventListener('click', () => {
    playEquip();
    startInteractiveTutorial(tutorialCallbacks);
  });
  document.getElementById('replay-tutorial-btn')?.addEventListener('click', () => {
    playEquip();
    codexOpen = false;
    startInteractiveTutorial(tutorialCallbacks);
  });
  document.getElementById('title-mute-btn')?.addEventListener('click', () => { toggleMute(); applyChrome(); updateDebug(lastEval); });
  document.getElementById('contract-grid').addEventListener('click', (e) => {
    const card = e.target.closest('[data-start-scenario]');
    if (!card) return;
    startMissionFromTitle(card.dataset.startScenario, missionState.sandboxMode);
  });
  document.getElementById('contract-grid').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('[data-start-scenario]');
    if (!card) return;
    e.preventDefault();
    startMissionFromTitle(card.dataset.startScenario, missionState.sandboxMode);
  });
  document.getElementById('active-mission-pill').addEventListener('click', () => { titleOpen = true; renderAll(true); });
  document.getElementById('reopen-title-btn').addEventListener('click', () => { titleOpen = true; codexOpen = false; renderAll(true); });
  document.getElementById('sandbox-toggle').addEventListener('change', (e) => { missionState.sandboxMode = e.target.checked; renderAll(false); });
  document.getElementById('menu-btn').addEventListener('click', () => { codexOpen = !codexOpen; applyChrome(); });
  document.getElementById('mute-btn').addEventListener('click', () => { toggleMute(); applyChrome(); updateDebug(lastEval); });
  document.getElementById('toggle-hud-btn').addEventListener('click', () => { hudHidden = true; codexOpen = false; applyChrome(); updateDebug(lastEval); });
  document.getElementById('hud-restore-btn').addEventListener('click', () => { hudHidden = false; applyChrome(); updateDebug(lastEval); });

  document.getElementById('segment-tabs').addEventListener('click', (e) => {
    const t = e.target.closest('.seg-tab'); if (!t) return;
    playHover(); activeSegment = t.dataset.segment; activeSub = SUB_TABS[activeSegment][0].id; renderAll(false);
  });
  document.getElementById('sub-pills').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]'); if (!b) return;
    playHover(); activeSub = b.dataset.sub; renderLoadoutDock(activeSegment, activeSub, missionState, lastEval);
  });
  document.getElementById('equipment-strip').addEventListener('click', (e) => {
    const btn = e.target.closest('.equip-card'); if (!btn) return;
    const { field, id, multi } = btn.dataset;
    if (multi === '1') {
      const bus = CATALOG.space.buses.find((b) => b.id === missionState.busId);
      const slots = bus?.payloadSlots || 1;
      const cur = [...(missionState[field] || [])];
      if (cur.includes(id)) missionState[field] = cur.filter((x) => x !== id);
      else if (slots <= 1) missionState[field] = [id];
      else if (cur.length >= slots) missionState[field] = [...cur.slice(-(slots - 1)), id];
      else missionState[field] = [...cur, id];
    } else {
      missionState[field] = id;
    }
    renderAll(true, FOCUS_MAP[field] || null);
    if (btn.classList.contains('compat-bad')) playWarning(); else playEquip();
  });

  const tip = document.getElementById('game-tooltip');
  document.body.addEventListener('mouseover', (e) => {
    const btn = e.target.closest('.equip-card, .btn-sci, .btn-rollout, .stage-btn');
    if (btn) playHover();
    const card = e.target.closest('.equip-card[data-tip]');
    if (!card || !card.dataset.tip) { tip.hidden = true; return; }
    const r = card.getBoundingClientRect();
    tip.textContent = card.dataset.tip; tip.hidden = false;
    tip.style.left = `${Math.min(window.innerWidth - 250, Math.max(8, r.left))}px`;
    tip.style.top = `${Math.max(8, r.top - tip.offsetHeight - 8)}px`;
  });
  document.getElementById('equipment-strip').addEventListener('mouseleave', () => { tip.hidden = true; });

  document.getElementById('stage-switcher').addEventListener('click', (e) => { const b = e.target.closest('.stage-btn'); if (b) setStage(b.dataset.stage); });
  document.getElementById('launch-cta-btn').addEventListener('click', () => {
    playEquip();
    setStage(stage === 'hangar' ? 'launch' : (stage === 'launch' ? 'orbit' : (stage === 'orbit' ? 'review' : 'hangar')));
  });
  document.getElementById('stage-hud').addEventListener('click', (e) => {
    if (e.target.closest('[data-snap]')) focusSubsystem(e.target.closest('[data-snap]').dataset.snap);
    else if (e.target.closest('#vp-autorotate-btn')) { autoRotate = !autoRotate; setAutoRotate(autoRotate); renderStageHud(stage, missionState, lastEval, { autoRotate, exploded, meshCount: getMeshCount() }); }
    else if (e.target.closest('#vp-explode-btn')) { exploded = !exploded; setExploded(exploded); renderStageHud(stage, missionState, lastEval, { autoRotate, exploded, meshCount: getMeshCount() }); }
    else if (e.target.closest('#vp-reset-btn')) resetCamera();
    else if (e.target.closest('[data-lcam]')) { launchCam = e.target.closest('[data-lcam]').dataset.lcam; setLaunchCamera(launchCam); renderStageHud(stage, missionState, lastEval, { launchCam }); }
    else if (e.target.closest('#lch-skip-btn')) setStage('orbit');
    else if (e.target.closest('[data-cam]')) { orbitCam = e.target.closest('[data-cam]').dataset.cam; setOrbitCameraMode(orbitCam); renderStageHud(stage, missionState, lastEval, { orbitCam, orbitWarp, orbitScore, hullIntegrity: orbitTelemetry?.hullIntegrity ?? 100 }); }
    else if (e.target.closest('[data-warp]')) { orbitWarp = Number(e.target.closest('[data-warp]').dataset.warp); setOrbitTimeWarp(orbitWarp); renderStageHud(stage, missionState, lastEval, { orbitCam, orbitWarp, orbitScore, hullIntegrity: orbitTelemetry?.hullIntegrity ?? 100 }); }
    else if (e.target.closest('#orb-test-hazard-btn')) triggerTestHazard();
    else if (e.target.closest('#orb-debrief-btn')) { playEquip(); setStage('review', true); }
  });
  document.getElementById('hazard-alert-hud').addEventListener('click', (e) => {
    if (e.target.closest('#hazard-repair-btn')) handleRepairHazard(null);
  });
  document.getElementById('center-action-hud').addEventListener('click', (e) => {
    if (e.target.closest('#lch-ignite-btn')) triggerIgnition();
    else if (e.target.closest('#orb-transmit-btn')) handleTransmit();
    else if (e.target.closest('#orb-scan-btn')) handleScanAsteroid();
    else if (e.target.closest('#orb-safemode-btn')) handleSafeMode();
  });
  document.getElementById('review-overlay').addEventListener('click', (e) => {
    if (e.target.closest('#rev-close-btn')) {
      playEquip();
      setStage('orbit', true);
      setOrbitTimeWarp(orbitWarp || 1);
    } else if (e.target.closest('#rev-menu-btn')) {
      playEquip();
      triggerWarpFlash();
      titleOpen = true;
      stage = 'hangar';
      orbitSessionDirty = true;
      renderAll(true);
    } else if (e.target.closest('#rev-export-btn')) {
      exportMissionVizJSON(missionState, lastEval);
    } else if (e.target.closest('#rev-save-btn')) {
      openSaveModal();
    } else if (e.target.closest('#rev-back-btn')) {
      playEquip();
      orbitSessionDirty = true;
      setStage('hangar');
    } else if (e.target.closest('#rev-next-btn')) {
      playEquip();
      orbitSessionDirty = true;
      const idx = (SCENARIOS.findIndex((s) => s.id === missionState.scenarioId) + 1) % SCENARIOS.length;
      missionState = createInitialState(SCENARIOS[idx].id, missionState.sandboxMode);
      setStage('hangar');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    const k = e.key.toLowerCase();
    if (e.key === 'Escape' && stage === 'review' && !titleOpen) {
      e.preventDefault();
      playEquip();
      setStage('orbit', true);
      setOrbitTimeWarp(orbitWarp || 1);
      return;
    }
    if (k === 'h' && !titleOpen) { hudHidden = !hudHidden; applyChrome(); updateDebug(lastEval); }
    else if (e.code === 'Space' && !titleOpen) {
      if (stage === 'launch') { e.preventDefault(); triggerIgnition(); }
      else if (stage === 'orbit') { e.preventDefault(); handleTransmit(); }
    } else if (k === 'e' && stage === 'orbit' && !titleOpen) handleScanAsteroid();
    else if (k === 'q' && stage === 'orbit' && !titleOpen) handleSafeMode();
    else if (['d', 'f', 't', 'r'].includes(k) && stage === 'orbit' && !titleOpen) handleRepairHazard(k);
  });

  document.getElementById('mel-toggle').addEventListener('click', () => { const d = document.getElementById('mel-drawer'); d.hidden = !d.hidden; codexOpen = false; applyChrome(); });
  document.getElementById('resources-btn').addEventListener('click', () => { renderResourcesList(); codexOpen = false; applyChrome(); document.getElementById('resources-modal').showModal(); });
  document.getElementById('export-json-btn').addEventListener('click', () => { codexOpen = false; applyChrome(); if (lastEval) exportMissionVizJSON(missionState, lastEval); });
  document.getElementById('save-load-btn').addEventListener('click', () => { codexOpen = false; applyChrome(); openSaveModal(); });
  document.getElementById('save-design-btn').addEventListener('click', () => {
    const input = document.getElementById('design-name-input'), name = (input.value || '').trim() || `${lastEval.scenario.name.slice(0, 20)} (CML ${lastEval.cmlLevel})`;
    const saved = readJson(STORAGE_SAVED, []);
    saved.unshift({ name, savedAt: new Date().toISOString(), cmlLevel: lastEval.cmlLevel, budgetM: lastEval.metrics.budget.usedM, massKg: lastEval.metrics.mass.totalKg, scienceScore: lastEval.metrics.scienceScore, state: structuredClone(missionState) });
    writeJson(STORAGE_SAVED, saved.slice(0, 12)); input.value = ''; renderSavedModal(readJson(STORAGE_SAVED, []), lastEval);
  });
  document.getElementById('saved-designs-list').addEventListener('click', (e) => {
    const saved = readJson(STORAGE_SAVED, []), l = e.target.closest('[data-load-idx]'), c = e.target.closest('[data-cmp-idx]'), d = e.target.closest('[data-del-idx]');
    if (l && saved[Number(l.dataset.loadIdx)]?.state) { missionState = saved[Number(l.dataset.loadIdx)].state; document.getElementById('saveload-modal').close(); renderAll(true); }
    else if (c && saved[Number(c.dataset.cmpIdx)]) { const it = saved[Number(c.dataset.cmpIdx)]; document.getElementById('compare-box').textContent = `Diff vs "${it.name}": CML ${lastEval.cmlLevel} vs ${it.cmlLevel} · Δ$${(lastEval.metrics.budget.usedM - it.budgetM).toFixed(1)}M · ΔSci ${lastEval.metrics.scienceScore - it.scienceScore}`; }
    else if (d) { saved.splice(Number(d.dataset.delIdx), 1); writeJson(STORAGE_SAVED, saved); renderSavedModal(saved, lastEval); }
  });
  document.querySelectorAll('.close-modal').forEach((b) => b.addEventListener('click', () => document.getElementById(b.dataset.close).close()));
  renderAll(true);
}
init();
