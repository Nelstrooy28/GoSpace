import { SCENARIOS, createInitialState, evaluateMissionDesign } from './catalog.js';
import { exportMissionVizJSON } from './missionVizPropagator.js';
import { renderHud, renderResourcesList, renderSavedModal, renderSegmentPanel, renderViewport } from './ui.js';

const STORAGE_ACTIVE = 'gospace_active_v1';
const STORAGE_SAVED = 'gospace_saved_v1';

let stage = 'cleanroom';
let activeSegment = 'user';
let missionState = loadActiveState();
let lastEval = null;

function loadActiveState() {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.scenarioId) return parsed;
    }
  } catch { /* ignore storage errors */ }
  return createInitialState('wildfiresat-l1', false);
}

function saveActiveState() {
  try {
    localStorage.setItem(STORAGE_ACTIVE, JSON.stringify(missionState));
  } catch { /* ignore storage errors */ }
}

function getSavedDesigns() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SAVED) || '[]');
  } catch {
    return [];
  }
}

function setSavedDesigns(list) {
  try {
    localStorage.setItem(STORAGE_SAVED, JSON.stringify(list));
  } catch { /* ignore storage errors */ }
}

function updateDebug(evaluation) {
  window.__MISSION_DEBUG__ = {
    stage,
    scenarioId: missionState.scenarioId,
    cmlLevel: evaluation.cmlLevel,
    metrics: evaluation.metrics,
    warnings: evaluation.warnings
  };
}

function renderAll() {
  lastEval = evaluateMissionDesign(missionState);
  saveActiveState();

  document.getElementById('scenario-select').value = missionState.scenarioId;
  document.getElementById('sandbox-toggle').checked = Boolean(missionState.sandboxMode);

  document.querySelectorAll('.seg-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.segment === activeSegment);
  });
  document.querySelectorAll('.stage-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.stage === stage);
  });

  document.getElementById('segment-content').innerHTML = renderSegmentPanel(activeSegment, missionState, lastEval);
  renderHud(lastEval);
  renderViewport(stage, missionState, lastEval);
  updateDebug(lastEval);
}

function initScenarioSelect() {
  const select = document.getElementById('scenario-select');
  select.innerHTML = SCENARIOS.map((s) => `<option value="${s.id}">${s.tag}: ${s.name}</option>`).join('');
  select.addEventListener('change', (e) => {
    missionState = createInitialState(e.target.value, missionState.sandboxMode);
    renderAll();
  });
}

function bindEvents() {
  document.getElementById('sandbox-toggle').addEventListener('change', (e) => {
    missionState.sandboxMode = e.target.checked;
    renderAll();
  });

  document.getElementById('segment-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.seg-tab');
    if (!tab) return;
    activeSegment = tab.dataset.segment;
    renderAll();
  });

  document.getElementById('segment-content').addEventListener('click', (e) => {
    const btn = e.target.closest('.opt-btn');
    if (!btn) return;
    const { field, id, multi } = btn.dataset;
    if (multi === '1') {
      const current = new Set(missionState[field] || []);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      missionState[field] = [...current];
    } else {
      missionState[field] = id;
    }
    renderAll();
  });

  document.getElementById('stage-switcher').addEventListener('click', (e) => {
    const btn = e.target.closest('.stage-btn');
    if (!btn) return;
    stage = btn.dataset.stage;
    renderAll();
  });

  document.getElementById('mel-toggle').addEventListener('click', () => {
    const body = document.getElementById('mel-body');
    const expanded = body.hasAttribute('hidden');
    if (expanded) body.removeAttribute('hidden');
    else body.setAttribute('hidden', '');
    document.getElementById('mel-toggle').setAttribute('aria-expanded', String(expanded));
  });

  document.getElementById('resources-btn').addEventListener('click', () => {
    renderResourcesList();
    document.getElementById('resources-modal').showModal();
  });

  document.getElementById('export-json-btn').addEventListener('click', () => {
    if (lastEval) exportMissionVizJSON(missionState, lastEval);
  });

  document.getElementById('save-load-btn').addEventListener('click', () => {
    renderSavedModal(getSavedDesigns(), lastEval);
    document.getElementById('saveload-modal').showModal();
  });

  document.getElementById('save-design-btn').addEventListener('click', () => {
    const input = document.getElementById('design-name-input');
    const name = (input.value || '').trim() || `${lastEval.scenario.name.slice(0, 22)} (${lastEval.cmlLabel.slice(0, 5)})`;
    const saved = getSavedDesigns();
    saved.unshift({
      name,
      savedAt: new Date().toISOString(),
      cmlLevel: lastEval.cmlLevel,
      budgetM: lastEval.metrics.budget.usedM,
      massKg: lastEval.metrics.mass.totalKg,
      scienceScore: lastEval.metrics.scienceScore,
      state: structuredClone(missionState)
    });
    setSavedDesigns(saved.slice(0, 12));
    input.value = '';
    renderSavedModal(getSavedDesigns(), lastEval);
  });

  document.getElementById('saved-designs-list').addEventListener('click', (e) => {
    const loadBtn = e.target.closest('[data-load-idx]');
    const cmpBtn = e.target.closest('[data-cmp-idx]');
    const delBtn = e.target.closest('[data-del-idx]');
    const saved = getSavedDesigns();
    if (loadBtn) {
      const item = saved[Number(loadBtn.dataset.loadIdx)];
      if (item?.state) {
        missionState = item.state;
        document.getElementById('saveload-modal').close();
        renderAll();
      }
    } else if (cmpBtn) {
      const item = saved[Number(cmpBtn.dataset.cmpIdx)];
      if (item) {
        const dCost = (lastEval.metrics.budget.usedM - item.budgetM).toFixed(1);
        const dSci = lastEval.metrics.scienceScore - item.scienceScore;
        const box = document.getElementById('compare-box');
        box.textContent = `Comparing Active vs "${item.name}": CML ${lastEval.cmlLevel} vs ${item.cmlLevel} · Cost Δ ${dCost >= 0 ? '+' : ''}$${dCost}M · Science Δ ${dSci >= 0 ? '+' : ''}${dSci} pts · Mass ${lastEval.metrics.mass.totalKg} kg vs ${item.massKg} kg`;
      }
    } else if (delBtn) {
      saved.splice(Number(delBtn.dataset.delIdx), 1);
      setSavedDesigns(saved);
      renderSavedModal(saved, lastEval);
    }
  });

  document.querySelectorAll('.close-modal').forEach((btn) => {
    btn.addEventListener('click', () => document.getElementById(btn.dataset.close).close());
  });
}

initScenarioSelect();
bindEvents();
renderAll();
