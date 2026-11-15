import { CATALOG, SCENARIOS, createInitialState, evaluateMissionDesign, getOptimalLoadoutForMission, getOrbitObjectivesStatus } from './catalog.js';
import { exportMissionVizJSON } from './missionVizPropagator.js';
import { focusSubsystem, getMeshCount, mountCleanroom, resetCamera, setAutoRotate, setExploded, unmountCleanroom, updateSpacecraft } from './sceneCleanroom.js';
import { mountLaunch, setLaunchCamera, triggerIgnition, unmountLaunch } from './sceneLaunch.js';
import { activateSafeMode, clearHoloSelection, focusCelestialBody, getHoloBodyScreenPos, getSensorCamMode, mountOrbit, mountShowcase, replayOrbitDeployment, resolveOrbitHazardChoice, returnToSatellite, scanAsteroid, seekOrbitToPass, setOrbitBriefingPaused, setOrbitCameraMode, setOrbitTimeWarp, setOrbitVictoryMode, setSensorCamEnabled, transmitScience, triggerTestHazard, unmountOrbit } from './sceneOrbit.js';
import { getMusicDebugState, initMusic, isMusicMuted, setHazardTension, setMood, toggleMusicMuted } from './music.js';
import { isMuted, playEquip, playHover, playRepairSuccess, playVictoryFanfare, playWarning, toggleMute } from './sfx.js';
import { isTutorialActive, notifyTutorialState, startInteractiveTutorial, stopTutorial } from './tutorial.js';
import { SUB_TABS, computeMissionDebriefSummary, renderHoloScannerCard, renderHud, renderLoadoutDock, renderMissionBriefing, renderOrbitObjectivesSidebar, renderResourcesList, renderSavedModal, renderStageHud, renderTitleOverlay, updateLaunchOverlay, updateOrbitOverlay } from './ui.js';

const STORAGE_ACTIVE = 'gospace_active_v1', STORAGE_SAVED = 'gospace_saved_v1', STORAGE_PROGRESS = 'gospace_progress_v2';
const readJson = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; } };
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const FOCUS_MAP = { busId: 'bus', instrumentIds: 'payload', solarId: 'solar', thermalId: 'thermal', transceiverId: 'comms', hullSkinId: 'bus' };

function createFreshRunSession(missionId) {
  return {
    missionId,
    currentScore: 0,
    downlinksCompleted: 0,
    scansCompleted: 0,
    anomaliesResolved: 0,
    hullIntegrity: 100,
    deployCompleted: false,
    holoInspected: false,
    orbitObjectivesMet: false,
    launchCompleted: false,
    launchInserted: false,
    unlockedStage: 'hangar'
  };
}

let stage = 'hangar', titleOpen = true, activeSegment = 'user', activeSub = 'obj', lastEval = null;
let missionState = (() => { const s = readJson(STORAGE_ACTIVE, null); return s?.scenarioId ? s : createInitialState('wildfiresat-l1', false); })();
let runSession = createFreshRunSession(missionState.scenarioId);
let activeScene = null, hudHidden = false, codexOpen = false, briefingOpen = false, sensorCamOpen = false, objectivesCollapsed = false, selectedHoloId = null, focusedHoloId = null;
let autoRotate = true, exploded = false, launchCam = 'trench', orbitWarp = 25, orbitCam = 'full';
let launchTelemetry = null, orbitTelemetry = null, orbitScore = 0, orbitSessionDirty = true;

function resetRunSession(missionId) {
  runSession = createFreshRunSession(missionId);
  orbitScore = 0;
  orbitTelemetry = null;
  launchTelemetry = null;
  orbitSessionDirty = true;
  selectedHoloId = null;
  focusedHoloId = null;
  briefingOpen = false;
  sensorCamOpen = false;
  objectivesCollapsed = false;
  orbitWarp = 25;
  orbitCam = 'full';
}

function syncOrbitObjectives(t = orbitTelemetry) {
  if (t && !t.deployActive && (t.deployProgress || 0) >= 0.99) {
    runSession.deployCompleted = true;
  }
  const objStatus = getOrbitObjectivesStatus(missionState, t, runSession);
  const prevMet = runSession.orbitObjectivesMet;
  runSession.orbitObjectivesMet = objStatus.canDebrief;
  renderOrbitObjectivesSidebar(stage === 'orbit' && !titleOpen ? 'orbit' : stage, missionState, t, runSession, objectivesCollapsed);
  if (prevMet !== runSession.orbitObjectivesMet && lastEval) {
    renderHud(lastEval, stage, { runSession, unlockedStages: getUnlockedStages(lastEval) });
  }
  return objStatus;
}

function getProgressMap() {
  return readJson(STORAGE_PROGRESS, {});
}

function saveMissionProgress(missionId, patch) {
  if (!missionId) return;
  const map = getProgressMap();
  const prev = map[missionId] || { status: 'not_started', stars: 0, bestScore: 0 };
  map[missionId] = {
    ...prev,
    ...patch,
    stars: Math.max(prev.stars || 0, patch.stars || 0),
    bestScore: Math.max(prev.bestScore || 0, patch.bestScore || 0),
    updatedAt: new Date().toISOString()
  };
  writeJson(STORAGE_PROGRESS, map);
}

function getUnlockedStages(ev = lastEval) {
  const canLaunch = Boolean(ev?.allPopulated);
  const canOrbit = canLaunch && Boolean(runSession.launchCompleted);
  const canReview = canOrbit && Boolean(runSession.orbitObjectivesMet);
  return { hangar: true, launch: canLaunch, orbit: canOrbit, review: canReview };
}

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
    musicMuted: isMusicMuted(), music: getMusicDebugState(),
    tutorialActive: isTutorialActive(),
    cleanroomActive: activeScene === 'hangar', meshCount: activeScene === 'hangar' ? getMeshCount() : 0,
    launchActive: activeScene === 'launch', launchTelemetry,
    orbitActive: activeScene === 'orbit', orbitTelemetry, orbitScore,
    briefingOpen, briefingPaused: Boolean(orbitTelemetry?.briefingPaused ?? (activeScene === 'orbit' && briefingOpen)),
    sensorCamOpen, sensorCamMode: getSensorCamMode(missionState).mode,
    selectedHoloId, focusedHoloId, getHoloScreenPos: getHoloBodyScreenPos,
    runSession: { ...runSession },
    unlockedStages: getUnlockedStages(ev),
    progressMap: getProgressMap(),
    metrics: ev.metrics, warnings: ev.warnings, designRisks: ev.designRisks
  };
}

function spawnPopup(text) {
  const box = document.getElementById('score-popups'), el = document.createElement('div');
  el.className = 'pop-float'; el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 1450);
}

function setStage(nextStage, keepOrbit = false, forceUnlock = false) {
  const unlocked = getUnlockedStages(lastEval);
  if (!forceUnlock && !isTutorialActive() && !unlocked[nextStage]) {
    playWarning();
    const lockMsg = nextStage === 'launch'
      ? '🔒 Equip all 4 mission segments first to unlock Launch!'
      : (nextStage === 'orbit'
        ? '🔒 Complete Rocket Launch sequence first to unlock Orbit!'
        : '🔒 Complete Mission Objectives in Orbit first to unlock Debrief!');
    spawnPopup(lockMsg);
    return false;
  }
  if (forceUnlock) {
    if (nextStage === 'orbit') runSession.launchCompleted = true;
    if (nextStage === 'review') { runSession.launchCompleted = true; runSession.orbitObjectivesMet = true; }
  }
  const prevStage = stage;
  stage = nextStage; codexOpen = false;
  if (stage === 'orbit' && prevStage === 'launch' && !isTutorialActive()) briefingOpen = true;
  else if (stage !== 'orbit') {
    briefingOpen = false;
    sensorCamOpen = false;
    selectedHoloId = null;
    focusedHoloId = null;
    setSensorCamEnabled(false);
    clearHoloSelection();
  }
  if (stage === 'review' && prevStage !== 'review') {
    playVictoryFanfare();
    const sum = computeMissionDebriefSummary(lastEval, getStageHudOpts());
    saveMissionProgress(missionState.scenarioId, { status: 'completed', stars: sum.starCount, bestScore: sum.totalScore });
  }
  if (stage === 'orbit' && prevStage === 'review') setOrbitVictoryMode(false, orbitCam);
  if (activeScene === 'orbit' && keepOrbit) setOrbitBriefingPaused(briefingOpen);
  renderAll(!keepOrbit);
  return true;
}

function openMissionBriefing() {
  briefingOpen = true;
  codexOpen = false;
  applyChrome();
  if (activeScene === 'orbit') setOrbitBriefingPaused(true);
  renderMissionBriefing(lastEval, stage, true);
  updateDebug(lastEval);
}

function closeMissionBriefing(confirm = false) {
  if (!briefingOpen) return;
  briefingOpen = false;
  if (confirm) playRepairSuccess(); else playHover();
  if (activeScene === 'orbit') setOrbitBriefingPaused(false);
  if (orbitTelemetry?.deployActive || (!briefingOpen && stage === 'orbit')) {
    orbitCam = 'chase';
    renderStageHud(stage, missionState, lastEval, getStageHudOpts());
  }
  renderMissionBriefing(lastEval, stage, false);
  updateDebug(lastEval);
}

function handleReplayUnfold() {
  if (stage !== 'orbit' || titleOpen || briefingOpen) return;
  if (replayOrbitDeployment()) {
    orbitCam = 'chase';
    focusedHoloId = null;
    renderStageHud(stage, missionState, lastEval, getStageHudOpts());
    renderHoloScannerCard(selectedHoloId, focusedHoloId);
    updateDebug(lastEval);
  }
}

function getStageHudOpts() {
  return {
    autoRotate, exploded, meshCount: getMeshCount(), launchCam, orbitCam, orbitWarp, orbitScore, sensorCamOpen,
    anomaliesResolved: orbitTelemetry?.anomaliesResolved || 0,
    hullIntegrity: orbitTelemetry?.hullIntegrity ?? 100,
    downlinkCount: orbitTelemetry?.downlinkCount || 0,
    asteroidsScanned: orbitTelemetry?.asteroidsScanned || 0,
    downlinkPts: orbitTelemetry?.downlinkPts,
    anomalyPts: orbitTelemetry?.anomalyPts,
    scanPts: orbitTelemetry?.scanPts,
    decisionPts: orbitTelemetry?.decisionPts ?? 0,
    batterySoc: orbitTelemetry?.batterySoc,
    launchInserted: runSession.launchInserted,
    orbitObjectivesMet: runSession.orbitObjectivesMet
  };
}

function toggleSensorCam(forceState = null) {
  if (stage !== 'orbit' || titleOpen) return;
  sensorCamOpen = forceState === null ? !sensorCamOpen : Boolean(forceState);
  playEquip();
  setSensorCamEnabled(sensorCamOpen);
  renderStageHud(stage, missionState, lastEval, getStageHudOpts());
  updateDebug(lastEval);
}

function mountLiveOrbit(vp, isVictory = false) {
  unmountAll(); orbitTelemetry = null; orbitScore = 0; orbitSessionDirty = false;
  mountOrbit(vp, missionState, lastEval, (t) => {
    orbitTelemetry = t; orbitScore = t.missionScore || 0; orbitWarp = t.timeWarp ?? orbitWarp;
    runSession.currentScore = orbitScore;
    runSession.downlinksCompleted = t.downlinkCount || 0;
    runSession.scansCompleted = t.asteroidsScanned || 0;
    runSession.anomaliesResolved = t.anomaliesResolved || 0;
    runSession.hullIntegrity = t.hullIntegrity ?? 100;
    const objStatus = syncOrbitObjectives(t);
    updateOrbitOverlay(t, objStatus);
    if (window.__MISSION_DEBUG__) {
      window.__MISSION_DEBUG__.orbitTelemetry = t;
      window.__MISSION_DEBUG__.orbitScore = orbitScore;
      window.__MISSION_DEBUG__.briefingPaused = t.briefingPaused;
      window.__MISSION_DEBUG__.runSession = { ...runSession };
      window.__MISSION_DEBUG__.objectivesStatus = objStatus;
      window.__MISSION_DEBUG__.unlockedStages = getUnlockedStages(lastEval);
    }
    notifyTutorialState();
  }, {
    victory: isVictory,
    paused: briefingOpen && !isVictory,
    sensorCam: sensorCamOpen && !isVictory,
    onSelectHolo: (holoId) => {
      selectedHoloId = holoId;
      if (holoId) runSession.holoInspected = true;
      syncOrbitObjectives(orbitTelemetry);
      renderHoloScannerCard(selectedHoloId, focusedHoloId);
      updateDebug(lastEval);
    },
    onHazardEvent: (ev) => {
      setHazardTension(ev.type === 'trigger');
      if (window.__MISSION_DEBUG__) window.__MISSION_DEBUG__.music = getMusicDebugState();
      if (ev.type === 'trigger') {
        spawnPopup(`🚨 ${ev.icon} ANOMALY DETECTED · CHOOSE RESPONSE [1][2][3]`);
      } else if (ev.type === 'resolve') {
        orbitScore += ev.scoreDelta ?? ev.bonus ?? 0;
        runSession.currentScore = orbitScore;
        if (typeof ev.anomaliesResolved === 'number') runSession.anomaliesResolved = ev.anomaliesResolved;
        if (typeof ev.hullIntegrity === 'number') runSession.hullIntegrity = ev.hullIntegrity;
        syncOrbitObjectives(orbitTelemetry);
        spawnPopup(ev.toast || `+${ev.scoreDelta ?? 0} PTS · ANOMALY MITIGATED!`);
      } else if (ev.type === 'expire') {
        if (typeof ev.hullIntegrity === 'number') runSession.hullIntegrity = ev.hullIntegrity;
        syncOrbitObjectives(orbitTelemetry);
        spawnPopup('💥 ANOMALY TIMED OUT — -26% HULL & -18% BATTERY!');
      }
    }
  });
  activeScene = 'orbit';
  if (!isVictory) {
    setOrbitTimeWarp(orbitWarp);
    if (!briefingOpen) {
      orbitCam = 'chase';
    } else {
      setOrbitCameraMode(orbitCam);
    }
    setOrbitBriefingPaused(briefingOpen);
    setSensorCamEnabled(sensorCamOpen);
  }
  else { setOrbitTimeWarp(1); setSensorCamEnabled(false); }
}

function applyChrome() {
  document.getElementById('title-overlay').hidden = !titleOpen;
  document.getElementById('hud-layer').classList.toggle('is-hidden', hudHidden || titleOpen);
  document.getElementById('hud-restore-btn').hidden = !hudHidden || titleOpen;
  document.getElementById('codex-menu').hidden = !codexOpen || titleOpen;
  document.getElementById('menu-btn').setAttribute('aria-expanded', String(codexOpen));
  const sfxMuted = isMuted();
  const musMuted = isMusicMuted();
  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) {
    muteBtn.textContent = sfxMuted ? '🔇 SFX' : '🔊 SFX';
    muteBtn.classList.toggle('is-muted', sfxMuted);
    muteBtn.setAttribute('aria-pressed', String(!sfxMuted));
  }
  const musicBtn = document.getElementById('music-toggle-btn');
  if (musicBtn) {
    musicBtn.textContent = musMuted ? '🔇 Music' : '🎵 Music';
    musicBtn.classList.toggle('is-muted', musMuted);
    musicBtn.setAttribute('aria-pressed', String(!musMuted));
  }
  const titleMute = document.getElementById('title-mute-btn');
  if (titleMute) {
    titleMute.textContent = sfxMuted ? '🔇 SFX: OFF' : '🔊 SFX: ON';
    titleMute.classList.toggle('is-muted', sfxMuted);
    titleMute.setAttribute('aria-pressed', String(!sfxMuted));
  }
  const titleMusic = document.getElementById('title-music-btn');
  if (titleMusic) {
    titleMusic.textContent = musMuted ? '🔇 MUSIC: OFF' : '🎵 MUSIC: ON';
    titleMusic.classList.toggle('is-muted', musMuted);
    titleMusic.setAttribute('aria-pressed', String(!musMuted));
  }
}

function renderAll(rebuildScene = true, focusTag = null) {
  lastEval = evaluateMissionDesign(missionState);
  writeJson(STORAGE_ACTIVE, missionState);
  document.getElementById('sandbox-toggle').checked = Boolean(missionState.sandboxMode);
  document.querySelectorAll('.seg-tab').forEach((b) => b.classList.toggle('active', b.dataset.segment === activeSegment));
  const unlocked = getUnlockedStages(lastEval);
  renderTitleOverlay(Boolean(missionState.sandboxMode), missionState.scenarioId, getProgressMap());
  renderLoadoutDock(activeSegment, activeSub, missionState, lastEval);
  renderHud(lastEval, stage, { runSession, unlockedStages: unlocked });
  applyChrome();

  const vp = document.getElementById('viewport-container');
  vp.dataset.stage = titleOpen ? 'showcase' : stage;
  if (titleOpen) {
    briefingOpen = false;
    sensorCamOpen = false;
    selectedHoloId = null;
    focusedHoloId = null;
    setOrbitBriefingPaused(false);
    setSensorCamEnabled(false);
    clearHoloSelection();
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
        if (!runSession.launchInserted && t.progressPct >= 95) {
          runSession.launchInserted = true;
          const skipBtn = document.getElementById('lch-skip-btn');
          if (skipBtn) { skipBtn.disabled = false; skipBtn.title = 'Enter Orbit Stage'; }
        }
        if (window.__MISSION_DEBUG__) window.__MISSION_DEBUG__.launchTelemetry = t;
        notifyTutorialState();
      }, () => {
        runSession.launchCompleted = true;
        runSession.launchInserted = true;
        if (stage === 'launch') setStage('orbit', false, true);
      });
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

  renderStageHud(stage, missionState, lastEval, getStageHudOpts());
  renderOrbitObjectivesSidebar(titleOpen ? 'showcase' : stage, missionState, orbitTelemetry, runSession, objectivesCollapsed);
  renderMissionBriefing(lastEval, stage, briefingOpen && !titleOpen && stage !== 'review');
  renderHoloScannerCard(stage === 'orbit' && !titleOpen && !briefingOpen ? selectedHoloId : null, focusedHoloId);
  if (titleOpen || stage !== 'orbit') setHazardTension(false);
  setMood(titleOpen ? 'menu' : (stage === 'review' ? 'debrief' : stage));
  updateDebug(lastEval);
  notifyTutorialState();
}

const openSaveModal = () => { renderSavedModal(readJson(STORAGE_SAVED, []), lastEval); document.getElementById('saveload-modal').showModal(); };
const handleTransmit = () => {
  const r = transmitScience();
  if (r.ok) {
    orbitScore += r.points;
    runSession.currentScore = orbitScore;
    runSession.downlinksCompleted += 1;
    if (orbitTelemetry) orbitTelemetry.downlinkCount = Math.max(orbitTelemetry.downlinkCount || 0, runSession.downlinksCompleted);
    syncOrbitObjectives(orbitTelemetry);
    let suffix = r.weakComms ? ' · BOTTLENECK -50%' : (r.wavelengthMismatch ? ' · MISMATCH -40%' : '');
    if (r.omniReduced) suffix += ' · OMNI 70%';
    spawnPopup(`+${r.points} DATA DOWNLINKED (${r.station})${suffix}!`);
    renderHud(lastEval, stage, { runSession, unlockedStages: getUnlockedStages(lastEval) });
    updateDebug(lastEval);
    notifyTutorialState();
  } else if (r.reason === 'brownout') {
    playWarning();
    spawnPopup('🔋 POWER BROWNOUT! Recharge to 15% in sunlight to transmit.');
  } else if (r.reason === 'paused') {
    playWarning();
    spawnPopup(`⏸️ Downlink paused (${r.pausedSec}s)`);
  }
};
const handleSafeMode = () => { const r = activateSafeMode(); orbitScore += r.points; spawnPopup(r.hazard ? `+${r.points} FLARE SHIELDED!` : `+${r.points} POWER CYCLED!`); };
const handleScanAsteroid = () => {
  const r = scanAsteroid();
  if (r.ok) {
    orbitScore += r.points;
    runSession.currentScore = orbitScore;
    runSession.scansCompleted += 1;
    if (orbitTelemetry) {
      orbitTelemetry.asteroidsScanned = Math.max(orbitTelemetry.asteroidsScanned || 0, runSession.scansCompleted);
      orbitTelemetry.missionScore = Math.max(orbitTelemetry.missionScore || 0, orbitScore);
    }
    syncOrbitObjectives(orbitTelemetry);
    spawnPopup(`+${r.points} ${r.isComet ? 'COMET' : 'ASTEROID'} ${r.id} SCANNED!`);
  }
};
const handleHazardChoice = (choiceIdx = 0) => { resolveOrbitHazardChoice(choiceIdx); };

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
    const targetId = scenarioId || missionState.scenarioId;
    missionState = createInitialState(targetId, sandboxMode);
    resetRunSession(targetId);
    const prog = getProgressMap()[targetId];
    if (!prog || prog.status === 'not_started') saveMissionProgress(targetId, { status: 'in_progress' });
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
      resetRunSession('wildfiresat-l1');
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
    goToStage: (next) => setStage(next, false, true),
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
  document.getElementById('title-music-btn')?.addEventListener('click', () => { toggleMusicMuted(); applyChrome(); updateDebug(lastEval); });
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
  document.getElementById('music-toggle-btn')?.addEventListener('click', () => { toggleMusicMuted(); applyChrome(); updateDebug(lastEval); });
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
  document.getElementById('autobuild-btn')?.addEventListener('click', () => {
    const optimal = getOptimalLoadoutForMission(missionState.scenarioId);
    missionState = { ...missionState, ...optimal };
    playRepairSuccess();
    renderAll(true, null);
    spawnPopup('Optimal CML-4 Build Equipped — Ready for Launch!');
  });
  document.getElementById('launch-cta-btn').addEventListener('click', () => {
    playEquip();
    setStage(stage === 'hangar' ? 'launch' : (stage === 'launch' ? 'orbit' : (stage === 'orbit' ? 'review' : 'hangar')));
  });
  document.getElementById('stage-hud').addEventListener('click', (e) => {
    if (e.target.closest('[data-snap]')) focusSubsystem(e.target.closest('[data-snap]').dataset.snap);
    else if (e.target.closest('#vp-autorotate-btn')) { autoRotate = !autoRotate; setAutoRotate(autoRotate); renderStageHud(stage, missionState, lastEval, getStageHudOpts()); }
    else if (e.target.closest('#vp-explode-btn')) { exploded = !exploded; setExploded(exploded); renderStageHud(stage, missionState, lastEval, getStageHudOpts()); }
    else if (e.target.closest('#vp-reset-btn')) resetCamera();
    else if (e.target.closest('[data-lcam]')) { launchCam = e.target.closest('[data-lcam]').dataset.lcam; setLaunchCamera(launchCam); renderStageHud(stage, missionState, lastEval, getStageHudOpts()); }
    else if (e.target.closest('#lch-skip-btn')) {
      if (runSession.launchInserted || isTutorialActive()) setStage('orbit', false, true);
      else { playWarning(); spawnPopup('🔒 Ignite and complete rocket launch to unlock Orbit!'); }
    }
    else if (e.target.closest('[data-cam]')) {
      orbitCam = e.target.closest('[data-cam]').dataset.cam;
      focusedHoloId = null;
      setOrbitCameraMode(orbitCam);
      renderStageHud(stage, missionState, lastEval, getStageHudOpts());
      renderHoloScannerCard(selectedHoloId, focusedHoloId);
    }
    else if (e.target.closest('[data-warp]')) { orbitWarp = Number(e.target.closest('[data-warp]').dataset.warp); setOrbitTimeWarp(orbitWarp); renderStageHud(stage, missionState, lastEval, getStageHudOpts()); }
    else if (e.target.closest('#orb-test-hazard-btn')) { if (missionState.sandboxMode) triggerTestHazard(); }
    else if (e.target.closest('#orb-replay-unfold-btn')) handleReplayUnfold();
    else if (e.target.closest('#orb-sensorcam-btn')) toggleSensorCam();
    else if (e.target.closest('#hud-mission-guide-btn')) { playEquip(); openMissionBriefing(); }
    else if (e.target.closest('#orb-debrief-btn')) {
      if (runSession.orbitObjectivesMet) { playEquip(); setStage('review', true); }
      else { playWarning(); spawnPopup('🔒 Complete at least 1 Science Downlink in Orbit first!'); }
    }
  });
  document.getElementById('holo-scanner-card')?.addEventListener('click', (e) => {
    if (e.target.closest('#holo-close-btn')) {
      playHover();
      selectedHoloId = null;
      focusedHoloId = null;
      clearHoloSelection();
      renderHoloScannerCard(null);
      updateDebug(lastEval);
    } else if (e.target.closest('#holo-zoom-btn')) {
      if (!selectedHoloId) return;
      playEquip();
      focusedHoloId = selectedHoloId;
      orbitCam = 'holo';
      focusCelestialBody(selectedHoloId);
      renderStageHud(stage, missionState, lastEval, getStageHudOpts());
      renderHoloScannerCard(selectedHoloId, focusedHoloId);
      updateDebug(lastEval);
    } else if (e.target.closest('#holo-return-btn')) {
      playEquip();
      focusedHoloId = null;
      orbitCam = 'chase';
      returnToSatellite();
      renderStageHud(stage, missionState, lastEval, getStageHudOpts());
      renderHoloScannerCard(selectedHoloId, focusedHoloId);
      updateDebug(lastEval);
    }
  });
  document.getElementById('sensor-cam-close-btn')?.addEventListener('click', () => toggleSensorCam(false));
  document.getElementById('briefing-overlay')?.addEventListener('click', (e) => {
    if (e.target.closest('#brief-close-btn')) closeMissionBriefing(false);
    else if (e.target.closest('#brief-start-btn')) closeMissionBriefing(true);
  });
  document.getElementById('orbit-objectives-sidebar')?.addEventListener('click', (e) => {
    if (e.target.closest('#orb-obj-collapse-btn')) {
      playHover();
      objectivesCollapsed = !objectivesCollapsed;
      renderOrbitObjectivesSidebar(stage === 'orbit' && !titleOpen ? 'orbit' : stage, missionState, orbitTelemetry, runSession, objectivesCollapsed);
    } else if (e.target.closest('#orb-obj-debrief-btn')) {
      playEquip();
      setStage('review');
    }
  });
  document.getElementById('hazard-alert-hud').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-choice-idx]');
    if (btn) handleHazardChoice(Number(btn.dataset.choiceIdx));
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
    } else if (e.target.closest('#rev-next-btn')) {
      playEquip();
      const idx = (SCENARIOS.findIndex((s) => s.id === missionState.scenarioId) + 1) % SCENARIOS.length;
      const nextId = SCENARIOS[idx].id;
      missionState = createInitialState(nextId, missionState.sandboxMode);
      resetRunSession(nextId);
      const prog = getProgressMap()[nextId];
      if (!prog || prog.status === 'not_started') saveMissionProgress(nextId, { status: 'in_progress' });
      setStage('hangar');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    const k = e.key.toLowerCase();
    if (briefingOpen && !titleOpen) {
      if (e.key === 'Escape') { e.preventDefault(); closeMissionBriefing(false); return; }
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); closeMissionBriefing(true); return; }
    }
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
    else if (k === 'u' && stage === 'orbit' && !titleOpen && !briefingOpen) handleReplayUnfold();
    else if (k === 'c' && stage === 'orbit' && !titleOpen) toggleSensorCam();
    else if (k === 'q' && stage === 'orbit' && !titleOpen) handleSafeMode();
    else if (['1', '2', '3'].includes(k) && stage === 'orbit' && !titleOpen && !briefingOpen) handleHazardChoice(Number(k) - 1);
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
    if (l && saved[Number(l.dataset.loadIdx)]?.state) {
      missionState = saved[Number(l.dataset.loadIdx)].state;
      resetRunSession(missionState.scenarioId);
      stage = 'hangar';
      document.getElementById('saveload-modal').close();
      renderAll(true);
    }
    else if (c && saved[Number(c.dataset.cmpIdx)]) { const it = saved[Number(c.dataset.cmpIdx)]; document.getElementById('compare-box').textContent = `Diff vs "${it.name}": CML ${lastEval.cmlLevel} vs ${it.cmlLevel} · Δ$${(lastEval.metrics.budget.usedM - it.budgetM).toFixed(1)}M · ΔSci ${lastEval.metrics.scienceScore - it.scienceScore}`; }
    else if (d) { saved.splice(Number(d.dataset.delIdx), 1); writeJson(STORAGE_SAVED, saved); renderSavedModal(saved, lastEval); }
  });
  document.querySelectorAll('.close-modal').forEach((b) => b.addEventListener('click', () => document.getElementById(b.dataset.close).close()));
  initMusic();
  renderAll(true);
}
init();
