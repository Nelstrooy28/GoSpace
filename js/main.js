import { SCENARIOS, createInitialState, evaluateMissionDesign } from './catalog.js';
import { exportMissionVizJSON } from './missionVizPropagator.js';
import { getMeshCount, mountCleanroom, resetCamera, setAutoRotate, setExploded, unmountCleanroom, updateSpacecraft } from './sceneCleanroom.js';
import { mountLaunch, setLaunchCamera, unmountLaunch } from './sceneLaunch.js';
import { mountOrbit, setOrbitCameraMode, setOrbitTimeWarp, triggerOrbitStorm, unmountOrbit } from './sceneOrbit.js';
import { renderHud, renderResourcesList, renderSavedModal, renderSegmentPanel, renderStageHud, updateLaunchOverlay, updateOrbitOverlay } from './ui.js';

const STORAGE_ACTIVE = 'gospace_active_v1', STORAGE_SAVED = 'gospace_saved_v1';
const readJson = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; } };
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

let stage = 'hangar', activeSegment = 'user', lastEval = null;
let missionState = (() => { const s = readJson(STORAGE_ACTIVE, null); return s?.scenarioId ? s : createInitialState('wildfiresat-l1', false); })();
let activeScene = null, hudHidden = false, drawerCollapsed = false;
let autoRotate = true, exploded = false, launchCam = 'rocket', orbitWarp = 25, orbitCam = 'full';
let launchTelemetry = null, orbitTelemetry = null;

function unmountAll() {
  if (activeScene === 'hangar') unmountCleanroom();
  if (activeScene === 'launch') unmountLaunch();
  if (activeScene === 'orbit') unmountOrbit();
  activeScene = null;
}

function updateDebug(ev) {
  window.__MISSION_DEBUG__ = {
    stage, scenarioId: missionState.scenarioId, cmlLevel: ev.cmlLevel, hudHidden, drawerCollapsed,
    cleanroomActive: activeScene === 'hangar', meshCount: activeScene === 'hangar' ? getMeshCount() : 0,
    launchActive: activeScene === 'launch', launchTelemetry,
    orbitActive: activeScene === 'orbit', orbitTelemetry,
    metrics: ev.metrics, warnings: ev.warnings
  };
}

function setStage(nextStage) {
  stage = nextStage;
  drawerCollapsed = stage === 'launch' || stage === 'orbit' || stage === 'review';
  renderAll();
}

function applyHudVisibility() {
  document.getElementById('hud-layer').classList.toggle('is-hidden', hudHidden);
  document.getElementById('hud-restore-btn').hidden = !hudHidden;
  const drawer = document.getElementById('hangar-drawer');
  drawer.classList.toggle('is-collapsed', drawerCollapsed);
  document.getElementById('drawer-reopen-btn').hidden = !drawerCollapsed || stage === 'review';
}

function renderAll(rebuildScene = true) {
  lastEval = evaluateMissionDesign(missionState);
  writeJson(STORAGE_ACTIVE, missionState);
  document.getElementById('scenario-select').value = missionState.scenarioId;
  document.getElementById('sandbox-toggle').checked = Boolean(missionState.sandboxMode);
  document.querySelectorAll('.seg-tab').forEach((b) => b.classList.toggle('active', b.dataset.segment === activeSegment));
  document.querySelectorAll('.stage-btn').forEach((b) => b.classList.toggle('active', b.dataset.stage === stage));
  document.getElementById('segment-content').innerHTML = renderSegmentPanel(activeSegment, missionState, lastEval);
  renderHud(lastEval, stage);
  applyHudVisibility();

  const vp = document.getElementById('viewport-container');
  vp.dataset.stage = stage;

  if (stage === 'hangar') {
    if (activeScene !== 'hangar') {
      unmountAll();
      mountCleanroom(vp, missionState);
      activeScene = 'hangar'; setAutoRotate(autoRotate); setExploded(exploded);
    } else if (rebuildScene) {
      updateSpacecraft(missionState);
    }
  } else if (stage === 'launch') {
    if (activeScene !== 'launch' || rebuildScene) {
      unmountAll(); launchTelemetry = null;
      mountLaunch(vp, missionState, (t) => {
        launchTelemetry = t; updateLaunchOverlay(t);
        if (window.__MISSION_DEBUG__) window.__MISSION_DEBUG__.launchTelemetry = t;
      }, () => { if (stage === 'launch') setStage('orbit'); });
      activeScene = 'launch'; setLaunchCamera(launchCam);
    }
  } else if (stage === 'orbit') {
    if (activeScene !== 'orbit' || rebuildScene) {
      unmountAll(); orbitTelemetry = null;
      mountOrbit(vp, missionState, lastEval, (t) => {
        orbitTelemetry = t; updateOrbitOverlay(t);
        if (window.__MISSION_DEBUG__) window.__MISSION_DEBUG__.orbitTelemetry = t;
      });
      activeScene = 'orbit'; setOrbitTimeWarp(orbitWarp); setOrbitCameraMode(orbitCam);
    }
  } else {
    unmountAll();
  }

  renderStageHud(stage, missionState, lastEval, { autoRotate, exploded, meshCount: getMeshCount(), launchCam, orbitCam, orbitWarp });
  updateDebug(lastEval);
}

function openSaveModal() {
  renderSavedModal(readJson(STORAGE_SAVED, []), lastEval);
  document.getElementById('saveload-modal').showModal();
}

function init() {
  const select = document.getElementById('scenario-select');
  select.innerHTML = SCENARIOS.map((s) => `<option value="${s.id}">${s.tag}: ${s.name}</option>`).join('');
  select.addEventListener('change', (e) => { missionState = createInitialState(e.target.value, missionState.sandboxMode); renderAll(true); });
  document.getElementById('sandbox-toggle').addEventListener('change', (e) => { missionState.sandboxMode = e.target.checked; renderAll(false); });
  document.getElementById('segment-tabs').addEventListener('click', (e) => {
    const t = e.target.closest('.seg-tab'); if (t) { activeSegment = t.dataset.segment; renderAll(false); }
  });
  document.getElementById('segment-content').addEventListener('click', (e) => {
    const btn = e.target.closest('.opt-btn'); if (!btn) return;
    const { field, id, multi } = btn.dataset;
    if (multi === '1') {
      const s = new Set(missionState[field] || []);
      if (s.has(id)) s.delete(id); else s.add(id);
      missionState[field] = [...s];
    } else missionState[field] = id;
    renderAll(true);
  });
  document.getElementById('stage-switcher').addEventListener('click', (e) => {
    const btn = e.target.closest('.stage-btn'); if (btn) setStage(btn.dataset.stage);
  });
  document.getElementById('launch-cta-btn').addEventListener('click', () => {
    setStage(stage === 'hangar' ? 'launch' : (stage === 'launch' ? 'orbit' : (stage === 'orbit' ? 'review' : 'hangar')));
  });
  document.getElementById('drawer-toggle').addEventListener('click', () => { drawerCollapsed = true; applyHudVisibility(); updateDebug(lastEval); });
  document.getElementById('drawer-reopen-btn').addEventListener('click', () => { drawerCollapsed = false; applyHudVisibility(); updateDebug(lastEval); });
  document.getElementById('toggle-hud-btn').addEventListener('click', () => { hudHidden = true; applyHudVisibility(); updateDebug(lastEval); });
  document.getElementById('hud-restore-btn').addEventListener('click', () => { hudHidden = false; applyHudVisibility(); updateDebug(lastEval); });
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      hudHidden = !hudHidden; applyHudVisibility(); updateDebug(lastEval);
    }
  });
  document.getElementById('stage-hud').addEventListener('click', (e) => {
    if (e.target.closest('#vp-autorotate-btn')) { autoRotate = !autoRotate; setAutoRotate(autoRotate); renderStageHud(stage, missionState, lastEval, { autoRotate, exploded, meshCount: getMeshCount() }); }
    else if (e.target.closest('#vp-explode-btn')) { exploded = !exploded; setExploded(exploded); renderStageHud(stage, missionState, lastEval, { autoRotate, exploded, meshCount: getMeshCount() }); }
    else if (e.target.closest('#vp-reset-btn')) resetCamera();
    else if (e.target.closest('#lch-pad-btn')) { launchCam = 'pad'; setLaunchCamera('pad'); renderStageHud(stage, missionState, lastEval, { launchCam }); }
    else if (e.target.closest('#lch-rkt-btn')) { launchCam = 'rocket'; setLaunchCamera('rocket'); renderStageHud(stage, missionState, lastEval, { launchCam }); }
    else if (e.target.closest('#lch-skip-btn')) setStage('orbit');
    else if (e.target.closest('[data-cam]')) { orbitCam = e.target.closest('[data-cam]').dataset.cam; setOrbitCameraMode(orbitCam); renderStageHud(stage, missionState, lastEval, { orbitCam, orbitWarp }); }
    else if (e.target.closest('[data-warp]')) { orbitWarp = Number(e.target.closest('[data-warp]').dataset.warp); setOrbitTimeWarp(orbitWarp); renderStageHud(stage, missionState, lastEval, { orbitCam, orbitWarp }); }
    else if (e.target.closest('#orb-storm-btn')) triggerOrbitStorm();
  });
  document.getElementById('review-overlay').addEventListener('click', (e) => {
    if (e.target.closest('#rev-export-btn')) exportMissionVizJSON(missionState, lastEval);
    else if (e.target.closest('#rev-save-btn')) openSaveModal();
    else if (e.target.closest('#rev-back-btn')) setStage('hangar');
  });
  document.getElementById('mel-toggle').addEventListener('click', () => {
    const d = document.getElementById('mel-drawer'); d.hidden = !d.hidden;
    document.getElementById('mel-toggle').setAttribute('aria-expanded', String(!d.hidden));
  });
  document.getElementById('resources-btn').addEventListener('click', () => { renderResourcesList(); document.getElementById('resources-modal').showModal(); });
  document.getElementById('export-json-btn').addEventListener('click', () => { if (lastEval) exportMissionVizJSON(missionState, lastEval); });
  document.getElementById('save-load-btn').addEventListener('click', openSaveModal);
  document.getElementById('save-design-btn').addEventListener('click', () => {
    const input = document.getElementById('design-name-input');
    const name = (input.value || '').trim() || `${lastEval.scenario.name.slice(0, 22)} (CML ${lastEval.cmlLevel})`;
    const saved = readJson(STORAGE_SAVED, []);
    saved.unshift({ name, savedAt: new Date().toISOString(), cmlLevel: lastEval.cmlLevel, budgetM: lastEval.metrics.budget.usedM, massKg: lastEval.metrics.mass.totalKg, scienceScore: lastEval.metrics.scienceScore, state: structuredClone(missionState) });
    writeJson(STORAGE_SAVED, saved.slice(0, 12)); input.value = '';
    renderSavedModal(readJson(STORAGE_SAVED, []), lastEval);
  });
  document.getElementById('saved-designs-list').addEventListener('click', (e) => {
    const saved = readJson(STORAGE_SAVED, []), l = e.target.closest('[data-load-idx]'), c = e.target.closest('[data-cmp-idx]'), d = e.target.closest('[data-del-idx]');
    if (l && saved[Number(l.dataset.loadIdx)]?.state) { missionState = saved[Number(l.dataset.loadIdx)].state; document.getElementById('saveload-modal').close(); renderAll(true); }
    else if (c && saved[Number(c.dataset.cmpIdx)]) {
      const item = saved[Number(c.dataset.cmpIdx)], dc = (lastEval.metrics.budget.usedM - item.budgetM).toFixed(1), ds = lastEval.metrics.scienceScore - item.scienceScore;
      document.getElementById('compare-box').textContent = `Comparing Active vs "${item.name}": CML ${lastEval.cmlLevel} vs ${item.cmlLevel} · Cost Δ ${dc >= 0 ? '+' : ''}$${dc}M · Science Δ ${ds >= 0 ? '+' : ''}${ds} pts`;
    } else if (d) { saved.splice(Number(d.dataset.delIdx), 1); writeJson(STORAGE_SAVED, saved); renderSavedModal(saved, lastEval); }
  });
  document.querySelectorAll('.close-modal').forEach((b) => b.addEventListener('click', () => document.getElementById(b.dataset.close).close()));
  renderAll(true);
}

init();
