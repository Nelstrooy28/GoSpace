import { SCENARIOS, createInitialState, evaluateMissionDesign } from './catalog.js';
import { exportMissionVizJSON } from './missionVizPropagator.js';
import { getMeshCount, mountCleanroom, resetCamera, setAutoRotate, setExploded, unmountCleanroom, updateSpacecraft } from './sceneCleanroom.js';
import { mountOrbit, setOrbitCameraMode, setOrbitTimeWarp, triggerOrbitStorm, unmountOrbit } from './sceneOrbit.js';
import { renderHud, renderResourcesList, renderSavedModal, renderSegmentPanel, renderViewport, updateCleanroomOverlay, updateOrbitOverlay } from './ui.js';

const STORAGE_ACTIVE = 'gospace_active_v1';
const STORAGE_SAVED = 'gospace_saved_v1';

const readJson = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; } };
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

let stage = 'cleanroom';
let activeSegment = 'user';
let missionState = (() => { const s = readJson(STORAGE_ACTIVE, null); return s?.scenarioId ? s : createInitialState('wildfiresat-l1', false); })();
let lastEval = null;
let cleanroomMounted = false;
let orbitMounted = false;
let autoRotate = true;
let exploded = false;
let orbitWarp = 20;
let orbitCam = 'earth';
let orbitTelemetry = null;

function updateDebug(evaluation) {
  window.__MISSION_DEBUG__ = {
    stage,
    scenarioId: missionState.scenarioId,
    cmlLevel: evaluation.cmlLevel,
    cleanroomActive: stage === 'cleanroom' && cleanroomMounted,
    meshCount: stage === 'cleanroom' ? getMeshCount() : 0,
    orbitActive: stage === 'orbit' && orbitMounted,
    orbitTelemetry,
    metrics: evaluation.metrics,
    warnings: evaluation.warnings
  };
}

function handleOrbitTelemetry(telem) {
  orbitTelemetry = telem;
  updateOrbitOverlay(lastEval, telem);
  if (window.__MISSION_DEBUG__) window.__MISSION_DEBUG__.orbitTelemetry = telem;
}

function renderAll() {
  lastEval = evaluateMissionDesign(missionState);
  writeJson(STORAGE_ACTIVE, missionState);
  document.getElementById('scenario-select').value = missionState.scenarioId;
  document.getElementById('sandbox-toggle').checked = Boolean(missionState.sandboxMode);
  document.querySelectorAll('.seg-tab').forEach((b) => b.classList.toggle('active', b.dataset.segment === activeSegment));
  document.querySelectorAll('.stage-btn').forEach((b) => b.classList.toggle('active', b.dataset.stage === stage));
  document.getElementById('segment-content').innerHTML = renderSegmentPanel(activeSegment, missionState, lastEval);
  renderHud(lastEval);

  if (stage === 'cleanroom') {
    if (orbitMounted) { unmountOrbit(); orbitMounted = false; orbitTelemetry = null; }
    renderViewport('cleanroom', missionState, lastEval);
    if (!cleanroomMounted) {
      mountCleanroom(document.getElementById('cleanroom-canvas-host'), missionState);
      cleanroomMounted = true; setAutoRotate(autoRotate); setExploded(exploded);
    } else {
      updateSpacecraft(missionState);
    }
    updateCleanroomOverlay(missionState, lastEval, { autoRotate, exploded, meshCount: getMeshCount() });
  } else if (stage === 'orbit') {
    if (cleanroomMounted) { unmountCleanroom(); cleanroomMounted = false; }
    renderViewport('orbit', missionState, lastEval);
    mountOrbit(document.getElementById('orbit-canvas-host'), missionState, lastEval, handleOrbitTelemetry);
    orbitMounted = true;
    setOrbitTimeWarp(orbitWarp);
    setOrbitCameraMode(orbitCam);
    updateOrbitOverlay(lastEval, orbitTelemetry || { altitudeKm: 0, speedKms: 0, inEclipse: false, stormActive: false, batterySoc: 84, bufferGb: 0.25, downlinkedGb: 0, linkedStation: 'Scanning', timeWarp: orbitWarp, cameraMode: orbitCam });
  } else {
    if (cleanroomMounted) { unmountCleanroom(); cleanroomMounted = false; }
    if (orbitMounted) { unmountOrbit(); orbitMounted = false; orbitTelemetry = null; }
    renderViewport('review', missionState, lastEval);
  }
  updateDebug(lastEval);
}

function openSaveModal() {
  renderSavedModal(readJson(STORAGE_SAVED, []), lastEval);
  document.getElementById('saveload-modal').showModal();
}

function init() {
  const select = document.getElementById('scenario-select');
  select.innerHTML = SCENARIOS.map((s) => `<option value="${s.id}">${s.tag}: ${s.name}</option>`).join('');
  select.addEventListener('change', (e) => { missionState = createInitialState(e.target.value, missionState.sandboxMode); renderAll(); });
  document.getElementById('sandbox-toggle').addEventListener('change', (e) => { missionState.sandboxMode = e.target.checked; renderAll(); });
  document.getElementById('segment-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.seg-tab');
    if (tab) { activeSegment = tab.dataset.segment; renderAll(); }
  });
  document.getElementById('segment-content').addEventListener('click', (e) => {
    const btn = e.target.closest('.opt-btn');
    if (!btn) return;
    const { field, id, multi } = btn.dataset;
    if (multi === '1') {
      const set = new Set(missionState[field] || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      missionState[field] = [...set];
    } else {
      missionState[field] = id;
    }
    renderAll();
  });
  document.getElementById('stage-switcher').addEventListener('click', (e) => {
    const btn = e.target.closest('.stage-btn');
    if (btn) { stage = btn.dataset.stage; renderAll(); }
  });
  document.getElementById('viewport-container').addEventListener('click', (e) => {
    if (e.target.closest('#vp-autorotate-btn')) {
      autoRotate = !autoRotate; setAutoRotate(autoRotate);
      updateCleanroomOverlay(missionState, lastEval, { autoRotate, exploded, meshCount: getMeshCount() });
    } else if (e.target.closest('#vp-explode-btn')) {
      exploded = !exploded; setExploded(exploded);
      updateCleanroomOverlay(missionState, lastEval, { autoRotate, exploded, meshCount: getMeshCount() });
    } else if (e.target.closest('#vp-reset-btn')) {
      resetCamera();
    } else if (e.target.closest('[data-warp]')) {
      orbitWarp = Number(e.target.closest('[data-warp]').dataset.warp);
      setOrbitTimeWarp(orbitWarp);
      updateOrbitOverlay(lastEval, { ...(orbitTelemetry || {}), timeWarp: orbitWarp, cameraMode: orbitCam });
    } else if (e.target.closest('#orb-cam-btn')) {
      orbitCam = orbitCam === 'earth' ? 'chase' : 'earth';
      setOrbitCameraMode(orbitCam);
      updateOrbitOverlay(lastEval, { ...(orbitTelemetry || {}), timeWarp: orbitWarp, cameraMode: orbitCam });
    } else if (e.target.closest('#orb-storm-btn')) {
      triggerOrbitStorm();
    } else if (e.target.closest('#rev-export-btn')) {
      if (lastEval) exportMissionVizJSON(missionState, lastEval);
    } else if (e.target.closest('#rev-save-btn')) {
      openSaveModal();
    } else if (e.target.closest('#rev-back-btn')) {
      stage = 'cleanroom'; renderAll();
    }
  });
  document.getElementById('mel-toggle').addEventListener('click', () => {
    const body = document.getElementById('mel-body'), open = body.hasAttribute('hidden');
    if (open) body.removeAttribute('hidden'); else body.setAttribute('hidden', '');
    document.getElementById('mel-toggle').setAttribute('aria-expanded', String(open));
  });
  document.getElementById('resources-btn').addEventListener('click', () => { renderResourcesList(); document.getElementById('resources-modal').showModal(); });
  document.getElementById('export-json-btn').addEventListener('click', () => { if (lastEval) exportMissionVizJSON(missionState, lastEval); });
  document.getElementById('save-load-btn').addEventListener('click', openSaveModal);
  document.getElementById('save-design-btn').addEventListener('click', () => {
    const input = document.getElementById('design-name-input');
    const name = (input.value || '').trim() || `${lastEval.scenario.name.slice(0, 22)} (CML ${lastEval.cmlLevel})`;
    const saved = readJson(STORAGE_SAVED, []);
    saved.unshift({ name, savedAt: new Date().toISOString(), cmlLevel: lastEval.cmlLevel, budgetM: lastEval.metrics.budget.usedM, massKg: lastEval.metrics.mass.totalKg, scienceScore: lastEval.metrics.scienceScore, state: structuredClone(missionState) });
    writeJson(STORAGE_SAVED, saved.slice(0, 12));
    input.value = '';
    renderSavedModal(readJson(STORAGE_SAVED, []), lastEval);
  });
  document.getElementById('saved-designs-list').addEventListener('click', (e) => {
    const saved = readJson(STORAGE_SAVED, []);
    const l = e.target.closest('[data-load-idx]'), c = e.target.closest('[data-cmp-idx]'), d = e.target.closest('[data-del-idx]');
    if (l && saved[Number(l.dataset.loadIdx)]?.state) {
      missionState = saved[Number(l.dataset.loadIdx)].state;
      document.getElementById('saveload-modal').close(); renderAll();
    } else if (c && saved[Number(c.dataset.cmpIdx)]) {
      const item = saved[Number(c.dataset.cmpIdx)];
      const dc = (lastEval.metrics.budget.usedM - item.budgetM).toFixed(1), ds = lastEval.metrics.scienceScore - item.scienceScore;
      document.getElementById('compare-box').textContent = `Comparing Active vs "${item.name}": CML ${lastEval.cmlLevel} vs ${item.cmlLevel} · Cost Δ ${dc >= 0 ? '+' : ''}$${dc}M · Science Δ ${ds >= 0 ? '+' : ''}${ds} pts · Mass ${lastEval.metrics.mass.totalKg} kg vs ${item.massKg} kg`;
    } else if (d) {
      saved.splice(Number(d.dataset.delIdx), 1); writeJson(STORAGE_SAVED, saved); renderSavedModal(saved, lastEval);
    }
  });
  document.querySelectorAll('.close-modal').forEach((b) => b.addEventListener('click', () => document.getElementById(b.dataset.close).close()));
  renderAll();
}

init();
