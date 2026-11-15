import { CATALOG, CELESTIAL_DATABASE, OFFICIAL_RESOURCES, SCENARIOS, getMissionOrbitGuide, getOrbitActiveDebuffs, getOrbitObjectivesStatus } from './catalog.js';
import { playRankStamp, playStarChime } from './sfx.js';

let debriefTimers = [];
let debriefRaf = 0;

function cancelDebriefAnim() {
  debriefTimers.forEach((id) => clearTimeout(id));
  debriefTimers = [];
  if (debriefRaf) { cancelAnimationFrame(debriefRaf); debriefRaf = 0; }
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const SUB_TABS = {
  user: [{ id: 'obj', label: 'Objective' }, { id: 'band', label: 'Band' }, { id: 'lat', label: 'Latency' }],
  space: [
    { id: 'bus', label: 'Bus' },
    { id: 'inst', label: 'Payload' },
    { id: 'solar', label: 'Solar & RTG' },
    { id: 'therm', label: 'Thrusters & Thermal' },
    { id: 'skin', label: 'Hull Skin' }
  ],
  launch: [{ id: 'veh', label: 'Rocket' }, { id: 'orbit', label: 'Orbit' }],
  ground: [{ id: 'tx', label: 'Transceiver' }, { id: 'gs', label: 'Station' }]
};

const instMatchesBand = (i, bId) => i.band === bId || (i.extraBands || []).includes(bId);

const cardHtml = ({ field, id, icon, name, pills, selected, ok = true, multi = false, tip = '' }) => `
  <button class="equip-card ${selected ? 'selected' : ''} ${ok ? '' : 'compat-bad'}" type="button"
    data-field="${field}" data-id="${id}" data-multi="${multi ? '1' : '0'}" data-tip="${esc(tip)}">
    <div class="equip-head"><span class="equip-name" title="${esc(name)}">${icon} ${esc(name)}</span>${selected
      ? '<span class="equip-check-badge" title="Equipped" aria-label="Equipped">✓</span>'
      : `<span class="spill ${ok ? 'ok' : 'bad'}">${ok ? 'FIT' : '!'}</span>`}</div>
    <div class="stat-pills">${pills.map((p) => `<span class="spill">${esc(p)}</span>`).join('')}</div>
  </button>`;

const CONTRACT_ART = {
  'wildfiresat-l1': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <defs><radialGradient id="g-wf" cx="45%" cy="72%" r="68%"><stop offset="0%" stop-color="#1e3a8a"/><stop offset="65%" stop-color="#0b1b3d"/><stop offset="100%" stop-color="#040814"/></radialGradient></defs>
    <rect width="110" height="100" fill="#050a18"/>
    <path d="M-10 74 Q55 38 120 74 L120 105 L-10 105 Z" fill="url(#g-wf)" stroke="#38bdf8" stroke-width="1.2"/>
    <path d="M8 82 Q55 56 102 82 M22 92 Q55 72 88 92" fill="none" stroke="#38bdf8" stroke-opacity="0.35" stroke-width="0.9" stroke-dasharray="3 3"/>
    <circle cx="42" cy="70" r="9" fill="#f97316" fill-opacity="0.28"/><circle cx="42" cy="70" r="3.2" fill="#fbbf24"/>
    <circle cx="71" cy="76" r="7" fill="#ef4444" fill-opacity="0.32"/><circle cx="71" cy="76" r="2.6" fill="#fde047"/>
    <path d="M10 34 Q56 14 100 38" fill="none" stroke="#7dd3fc" stroke-width="1.4" stroke-dasharray="4 3"/>
    <rect x="52" y="19" width="10" height="6" rx="1.5" fill="#fbbf24" stroke="#ffffff" stroke-width="0.8"/>
    <polygon points="57,26 40,68 74,72" fill="#f97316" fill-opacity="0.16"/>
  </svg>`,
  'aurora-l1': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <defs><radialGradient id="g-au" cx="50%" cy="68%" r="60%"><stop offset="0%" stop-color="#0e7490"/><stop offset="60%" stop-color="#0f172a"/><stop offset="100%" stop-color="#030712"/></radialGradient></defs>
    <rect width="110" height="100" fill="#030712"/>
    <path d="M10 34 Q36 16 58 32 T100 26" fill="none" stroke="#34d399" stroke-width="4" stroke-opacity="0.7" stroke-linecap="round"/>
    <path d="M16 42 Q44 26 68 40 T98 34" fill="none" stroke="#a855f7" stroke-width="2.6" stroke-opacity="0.65" stroke-linecap="round"/>
    <circle cx="55" cy="76" r="32" fill="url(#g-au)" stroke="#38bdf8" stroke-width="1.1"/>
    <path d="M26 52 Q55 24 84 52" fill="none" stroke="#7dd3fc" stroke-width="1.2" stroke-dasharray="3 3"/>
    <rect x="50" y="21" width="10" height="6" rx="1.5" fill="#34d399" stroke="#ffffff" stroke-width="0.8"/>
  </svg>`,
  'ocean-l2': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <defs><radialGradient id="g-oc" cx="38%" cy="38%" r="60%"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="55%" stop-color="#0369a1"/><stop offset="100%" stop-color="#082f49"/></radialGradient></defs>
    <rect width="110" height="100" fill="#040a18"/>
    <circle cx="55" cy="52" r="30" fill="url(#g-oc)" stroke="#38bdf8" stroke-width="1.2"/>
    <path d="M34 48 Q52 40 68 55 T82 44" fill="none" stroke="#34d399" stroke-width="3" stroke-opacity="0.55" stroke-linecap="round"/>
    <ellipse cx="55" cy="52" rx="16" ry="41" transform="rotate(14 55 52)" fill="none" stroke="#7dd3fc" stroke-width="1.3" stroke-dasharray="4 3"/>
    <polygon points="59,13 43,54 71,58" fill="#38bdf8" fill-opacity="0.24"/>
    <rect x="54" y="10" width="10" height="6" rx="1.5" fill="#e2e8f0" stroke="#38bdf8" stroke-width="0.8"/>
  </svg>`,
  'monsoon-l2': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <defs><radialGradient id="g-mn" cx="50%" cy="56%" r="58%"><stop offset="0%" stop-color="#1d4ed8"/><stop offset="70%" stop-color="#0f172a"/><stop offset="100%" stop-color="#040814"/></radialGradient></defs>
    <rect width="110" height="100" fill="#040814"/>
    <circle cx="55" cy="58" r="28" fill="url(#g-mn)" stroke="#38bdf8" stroke-width="1.2"/>
    <path d="M40 58 Q55 42 70 58 Q55 72 40 58 Z" fill="none" stroke="#bae6fd" stroke-width="2.2" stroke-opacity="0.8"/>
    <circle cx="55" cy="58" r="4.5" fill="#020617" stroke="#7dd3fc" stroke-width="1.2"/>
    <polygon points="56,16 32,62 78,62" fill="#38bdf8" fill-opacity="0.22"/>
    <rect x="47" y="12" width="18" height="5" rx="1" fill="#f59e0b" stroke="#ffffff" stroke-width="0.8"/>
  </svg>`,
  'lunar-l3': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <defs><radialGradient id="g-lu" cx="42%" cy="36%" r="58%"><stop offset="0%" stop-color="#cbd5e1"/><stop offset="70%" stop-color="#64748b"/><stop offset="100%" stop-color="#1e293b"/></radialGradient></defs>
    <rect width="110" height="100" fill="#040814"/>
    <circle cx="55" cy="50" r="28" fill="url(#g-lu)" stroke="#94a3b8" stroke-width="1"/>
    <circle cx="43" cy="39" r="5" fill="#475569" fill-opacity="0.55"/>
    <circle cx="67" cy="44" r="4" fill="#334155" fill-opacity="0.55"/>
    <ellipse cx="55" cy="73" rx="12" ry="5" fill="#0f172a" stroke="#38bdf8" stroke-width="1.4"/>
    <ellipse cx="55" cy="73" rx="6" ry="2.5" fill="#7dd3fc" fill-opacity="0.55"/>
    <path d="M14 78 Q38 14 96 34" fill="none" stroke="#fbbf24" stroke-width="1.4" stroke-dasharray="4 3"/>
    <circle cx="84" cy="27" r="3.5" fill="#fbbf24" stroke="#ffffff" stroke-width="0.9"/>
  </svg>`,
  'asteroid-l3': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <defs><radialGradient id="g-as" cx="40%" cy="40%" r="55%"><stop offset="0%" stop-color="#94a3b8"/><stop offset="65%" stop-color="#475569"/><stop offset="100%" stop-color="#1e293b"/></radialGradient></defs>
    <rect width="110" height="100" fill="#030712"/>
    <polygon points="40,36 62,28 80,44 74,66 50,74 30,58" fill="url(#g-as)" stroke="#cbd5e1" stroke-width="1.1"/>
    <circle cx="50" cy="48" r="5" fill="#334155"/><circle cx="64" cy="56" r="3.5" fill="#1e293b"/>
    <path d="M14 76 Q46 18 96 30" fill="none" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="4 3"/>
    <circle cx="30" cy="36" r="4" fill="#22d3ee"/><circle cx="24" cy="44" r="6" fill="#06b6d4" fill-opacity="0.28"/>
    <rect x="26" y="33" width="9" height="6" rx="1" fill="#fbbf24" stroke="#ffffff" stroke-width="0.8"/>
  </svg>`,
};

const CONTRACT_META = {
  'wildfiresat-l1': { title: 'Arctic Wildfire Watch', wave: 'THERMAL IR', lv: '300kg LV', obj: 'Detect boreal wildfires & Arctic hotspots from 575km SSO.' },
  'aurora-l1': { title: 'Ionosphere & Aurora Scout', wave: 'MAG-PLASMA', lv: '300kg LV', obj: 'Sample geomagnetic storms & auroral currents across polar arcs.' },
  'ocean-l2': { title: 'Coastal Ocean & Reef Pulse', wave: 'UV-VIS + LIDAR', lv: '1100kg LV', obj: 'Measure coastal plankton, reefs & aerosols with LiDAR.' },
  'monsoon-l2': { title: 'Monsoon & Cyclone Eye', wave: 'SAR RADAR', lv: '1100kg LV', obj: 'Pierce storm clouds day and night with phased-array SAR.' },
  'lunar-l3': { title: 'Lunar South Pole Icebreaker', wave: 'CRYO IR + NEUTRON', lv: '5200kg LV', obj: 'Survey shadowed Lunar South Pole craters for water ice.' },
  'asteroid-l3': { title: 'Near-Earth Asteroid Prospector', wave: 'ION + PROSPECT', lv: '5200kg LV', obj: 'Rendezvous with metallic NEAs via Xenon Ion + Spectroscopy.' },
};

export function renderTitleOverlay(sandboxMode, activeScenarioId, progressMap = {}) {
  document.getElementById('mode-campaign-btn').classList.toggle('active', !sandboxMode);
  document.getElementById('mode-sandbox-btn').classList.toggle('active', sandboxMode);
  const pill = document.getElementById('title-mode-pill');
  if (pill) {
    pill.textContent = sandboxMode ? 'SANDBOX FREEPLAY · ALL SYSTEMS UNLOCKED' : 'SIMULATION MODE · ENGINEERED CONTRACTS';
    pill.classList.toggle('sandbox', sandboxMode);
  }
  document.getElementById('contract-grid').innerHTML = SCENARIOS.map((s) => {
    const m = CONTRACT_META[s.id] || { title: s.name, wave: s.orbitIcon, lv: 'LV READY', obj: s.summary };
    const selected = s.id === activeScenarioId;
    const prog = progressMap[s.id];
    const statusBadge = prog?.status === 'completed'
      ? `<span class="contract-status-badge is-done">Completed ${'★'.repeat(Math.max(1, Math.min(3, prog.stars || 1)))}</span>`
      : (prog?.status === 'in_progress'
        ? '<span class="contract-status-badge is-progress">In Progress</span>'
        : '<span class="contract-status-badge">Not Started</span>');
    const budBadge = sandboxMode
      ? '<span class="spill ok" title="Unlimited Sandbox Budget"><span class="inf-sym">∞</span></span>'
      : `<span class="spill ok">$${s.budgetLimitM}M</span>`;
    return `
    <div class="contract-card ${selected ? 'selected' : ''}" data-start-scenario="${s.id}" role="button" tabindex="0">
      <div class="contract-art">${CONTRACT_ART[s.id] || ''}</div>
      <div class="contract-body">
        <div class="contract-top">
          <span class="contract-stars">${s.stars}</span>
          ${statusBadge}
        </div>
        <h3 class="contract-title">${esc(m.title)}</h3>
        <p class="contract-obj">${esc(m.obj)}</p>
        <div class="contract-footer">
          <div class="stat-pills">
            <span class="spill">${esc(m.wave)}</span>
            ${budBadge}
            <span class="spill">${s.minLifetimeYr}YR</span>
          </div>
          <span class="btn-sci contract-cta ${selected ? 'active' : ''}">DEPLOY ›</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

export function renderLoadoutDock(segment, subGroup, state, evaluation) {
  const sc = evaluation.scenario, bus = CATALOG.space.buses.find((b) => b.id === state.busId);
  const tabs = SUB_TABS[segment] || SUB_TABS.user;
  const activeSub = tabs.some((t) => t.id === subGroup) ? subGroup : tabs[0].id;
  document.getElementById('sub-pills').innerHTML = tabs.map((t) => {
    const lbl = t.id === 'inst' ? `Payloads (${(state.instrumentIds || []).length}/${bus?.payloadSlots || 1} Slots)` : t.label;
    return `<button class="btn-sci sub-chip ${t.id === activeSub ? 'active' : ''}" data-sub="${t.id}" type="button">${lbl}</button>`;
  }).join('');

  let cards = [];
  if (activeSub === 'obj') cards = CATALOG.user.objectives.map((o) => cardHtml({ field: 'userObjective', id: o.id, icon: '🎯', name: o.name, selected: state.userObjective === o.id, ok: o.id === sc.targetObjective, pills: [o.band.toUpperCase()], tip: o.tip }));
  else if (activeSub === 'band') cards = CATALOG.user.wavelengths.map((w) => cardHtml({ field: 'wavelengthBand', id: w.id, icon: '🌈', name: w.name, selected: state.wavelengthBand === w.id, ok: w.id === sc.targetBand, pills: [w.id === sc.targetBand ? 'TARGET BAND' : 'ALT BAND'], tip: w.tip }));
  else if (activeSub === 'lat') cards = CATALOG.user.latencies.map((l) => cardHtml({ field: 'latencyTier', id: l.id, icon: '⏱️', name: l.name, selected: state.latencyTier === l.id, ok: l.id === sc.targetLatency, pills: [l.id === sc.targetLatency ? 'OPTIMAL' : 'TRADE'], tip: l.tip }));
  else if (activeSub === 'bus') cards = CATALOG.space.buses.map((b) => cardHtml({ field: 'busId', id: b.id, icon: '🛰️', name: b.name, selected: state.busId === b.id, ok: true, pills: [`$${b.costM}M`, `${b.payloadSlots} Slot${b.payloadSlots > 1 ? 's' : ''}`, `Cap ${b.payloadCapKg}kg`], tip: b.tip }));
  else if (activeSub === 'inst') cards = CATALOG.space.instruments.map((i) => cardHtml({ field: 'instrumentIds', id: i.id, icon: '🔭', name: i.name, multi: true, selected: state.instrumentIds.includes(i.id), ok: instMatchesBand(i, state.wavelengthBand) && (!bus || i.classes.includes(bus.busClass)), pills: [`$${i.costM}M`, `${i.massKg}kg`, `${i.powerW}W`, `+${i.sci} Sci`], tip: i.tip }));
  else if (activeSub === 'solar') cards = CATALOG.space.solarArrays.map((s) => cardHtml({ field: 'solarId', id: s.id, icon: s.zeroEclipseLoss ? '☢️' : '☀️', name: s.name, selected: state.solarId === s.id, ok: true, pills: [`$${s.costM}M`, `${s.genW}W`, s.zeroEclipseLoss ? '0% ECLIPSE' : `${s.massKg}kg`], tip: s.tip }));
  else if (activeSub === 'therm') cards = CATALOG.space.thermalAdcs.map((t) => cardHtml({ field: 'thermalId', id: t.id, icon: t.ionDrive ? '⚡' : '❄️', name: t.name, selected: state.thermalId === t.id, ok: (state.wavelengthBand !== 'cryo-ir' || t.cryoCapable) && (!sc.requiresIon || t.ionDrive), pills: [`$${t.costM}M`, `${t.powerW}W`, t.ionDrive ? 'ION' : (t.cryoCapable ? 'CRYO' : `+${t.lifeBonus}yr`)], tip: t.tip }));
  else if (activeSub === 'skin') cards = CATALOG.space.hullSkins.map((k) => cardHtml({ field: 'hullSkinId', id: k.id, icon: '🎨', name: k.name, selected: (state.hullSkinId || 'gold-kapton') === k.id, ok: true, pills: ['FREE', k.colorHex.toUpperCase()], tip: k.tip }));
  else if (activeSub === 'veh') cards = CATALOG.launch.vehicles.map((v) => cardHtml({ field: 'vehicleId', id: v.id, icon: '🚀', name: v.name, selected: state.vehicleId === v.id, ok: true, pills: [`$${v.costM}M`, `Max ${v.maxPayloadKg}kg`, v.deepSpaceCapable ? 'DEEP-SPACE' : 'LEO'], tip: v.tip }));
  else if (activeSub === 'orbit') cards = CATALOG.launch.orbits.map((o) => cardHtml({ field: 'orbitId', id: o.id, icon: '🛸', name: o.name, selected: state.orbitId === o.id, ok: o.id === sc.targetOrbit, pills: [`e=${o.e}`, `i=${o.iDeg}°`, o.deepSpace ? 'DEEP' : 'LEO'], tip: o.tip }));
  else if (activeSub === 'tx') cards = CATALOG.ground.transceivers.map((t) => cardHtml({ field: 'transceiverId', id: t.id, icon: '📡', name: t.name, selected: state.transceiverId === t.id, ok: true, pills: [`$${t.costM}M`, `${t.mbps}Mbps`, t.deepSpace ? 'DEEP' : `${t.massKg}kg`], tip: t.tip }));
  else cards = CATALOG.ground.stations.map((g) => cardHtml({ field: 'stationId', id: g.id, icon: '🏔️', name: g.name, selected: state.stationId === g.id, ok: true, pills: [`$${g.costM}M`, `${g.passMinDay}m/d`, g.deepSpace ? 'DSN' : 'POLAR'], tip: g.tip }));

  document.getElementById('equipment-strip').innerHTML = cards.join('');
}

function getGaugeRows(ev) {
  const { metrics, scenario, sandboxMode } = ev;
  return [
    { key: 'BUD', label: 'Budget', val: sandboxMode ? '∞' : `$${metrics.budget.usedM}/${metrics.budget.limitM}M`, isInf: sandboxMode, tip: sandboxMode ? 'Unlimited Sandbox Budget' : '', pct: sandboxMode ? 100 : Math.min(100, metrics.budget.pct), ok: sandboxMode || metrics.budget.usedM <= metrics.budget.limitM },
    { key: 'MASS', label: 'Mass', val: sandboxMode ? `${metrics.mass.totalKg}kg / ∞` : `${metrics.mass.totalKg}/${metrics.mass.launchLimitKg}kg`, isInf: false, tip: sandboxMode ? 'Unlimited Rocket Payload Mass' : '', pct: sandboxMode ? 100 : Math.min(100, (metrics.mass.totalKg / Math.max(metrics.mass.launchLimitKg, 1)) * 100), ok: sandboxMode || metrics.mass.totalKg <= metrics.mass.launchLimitKg },
    { key: 'PWR', label: 'Power', val: `${metrics.powerMargin}%`, pct: Math.max(0, Math.min(100, metrics.powerMargin + 30)), ok: metrics.powerMargin >= 5 },
    { key: 'DATA', label: 'Data', val: `${metrics.dataMargin}%`, pct: Math.max(0, Math.min(100, metrics.dataMargin + 25)), ok: metrics.dataMargin >= 5 },
    { key: 'LIFE', label: 'Life', val: `${metrics.lifetimeYears}/${scenario.minLifetimeYr}yr`, pct: Math.min(100, (metrics.lifetimeYears / scenario.minLifetimeYr) * 100), ok: metrics.lifetimeYears >= scenario.minLifetimeYr },
    { key: 'SCI', label: 'Science', val: `${metrics.scienceScore}%`, pct: metrics.scienceScore, ok: metrics.scienceScore >= scenario.minScience }
  ];
}

export function renderHud(ev, stage, opts = {}) {
  const { metrics, mel, cmlLevel, warnings, scenario, sandboxMode, allPopulated } = ev;
  const run = opts.runSession || {};
  const unlocked = opts.unlockedStages || { hangar: true, launch: Boolean(allPopulated), orbit: false, review: false };
  const stageLabels = { hangar: '1. HANGAR', launch: '2. PAD', orbit: '3. ORBIT', review: '4. DEBRIEF' };
  const lockReasons = {
    hangar: 'Mission Hangar assembly',
    launch: unlocked.launch ? 'Roll out to launchpad' : 'Locked: Equip all 4 core mission segments first',
    orbit: unlocked.orbit ? 'Orbital operations' : 'Locked: Complete rocket launch sequence first',
    review: unlocked.review ? 'Mission Debrief' : 'Locked: Complete Mission Objectives in Orbit first'
  };
  document.querySelectorAll('#stage-switcher .stage-btn').forEach((b) => {
    const s = b.dataset.stage;
    const ok = Boolean(unlocked[s]);
    b.disabled = !ok;
    b.classList.toggle('is-locked', !ok);
    b.classList.toggle('active', s === stage);
    b.title = lockReasons[s] || '';
    b.textContent = ok ? stageLabels[s] : `🔒 ${stageLabels[s]}`;
  });

  document.querySelectorAll('#cml-dots .cnode').forEach((el, idx) => {
    el.className = `cnode ${idx < cmlLevel ? (cmlLevel === 4 ? 'lit-max' : 'lit') : ''}`;
  });
  document.getElementById('cml-badge').textContent = `CML ${cmlLevel} · ${cmlLevel === 4 ? 'FLIGHT READY' : (cmlLevel === 3 ? 'TRADE STUDY' : 'CONCEPT')}`;
  document.getElementById('scenario-badge').textContent = `L${scenario.level}${sandboxMode ? ' · FREEPLAY' : ''}`;

  const banner = document.getElementById('comms-banner');
  if (banner) {
    const showAdvisor = stage === 'hangar' && warnings.length > 0;
    banner.hidden = !showAdvisor;
    banner.classList.toggle('ok', !showAdvisor);
    const commsText = document.getElementById('comms-text');
    if (commsText) {
      commsText.textContent = showAdvisor ? `CHIEF ENG: ${warnings[0].text}` : '';
    }
  }

  const mProg = document.getElementById('mission-progress-bar');
  if (mProg) {
    mProg.hidden = stage === 'review';
    if (stage !== 'review') {
      const s1 = Boolean(allPopulated);
      const s2 = Boolean(run.launchCompleted);
      const dl = run.downlinksCompleted || 0;
      const s3 = dl >= 1;
      const s4 = Boolean(run.orbitObjectivesMet);
      const pct = (s1 ? 25 : 0) + (s2 ? 25 : 0) + (s3 ? 25 : 0) + (s4 ? 25 : 0);
      mProg.innerHTML = `<div class="mprog-head"><span>MISSION PROGRESS · ${esc(scenario.name)}</span><span class="mprog-pct">${pct}%</span></div>
        <div class="mprog-track"><div class="mprog-fill" style="width:${pct}%"></div></div>
        <div class="mprog-steps">
          <span class="mprog-step ${s1 ? 'is-done' : 'is-active'}">${s1 ? '✓' : '○'} Parts Equipped</span>
          <span class="mprog-step ${s2 ? 'is-done' : (stage === 'launch' ? 'is-active' : '')}">${s2 ? '✓' : '○'} Launched</span>
          <span class="mprog-step ${s3 ? 'is-done' : (stage === 'orbit' ? 'is-active' : '')}">${s3 ? '✓' : '○'} Downlinks ${Math.min(dl, 1)}/1</span>
          <span class="mprog-step ${s4 ? 'is-done' : ''}">${s4 ? '✓' : '🔒'} Ready for Debrief</span>
        </div>`;
    }
  }

  document.getElementById('resource-gauges').innerHTML = getGaugeRows(ev).map((g) => {
    const lit = Math.max(1, Math.round((g.pct / 100) * 5));
    const cells = [0, 1, 2, 3, 4].map((i) => `<span class="seg-cell ${i < lit ? (g.ok ? 'on-ok' : 'on-bad') : ''}"></span>`).join('');
    const tipAttr = g.tip ? ` title="${esc(g.tip)}"` : '';
    return `<div class="gm-item"${tipAttr}><div class="gm-top"><span>${g.key}</span><b class="${g.isInf ? 'is-inf' : ''}">${esc(g.val)}</b></div><div class="seg-meter">${cells}</div></div>`;
  }).join('');

  const autoBtn = document.getElementById('autobuild-btn');
  if (autoBtn) {
    autoBtn.hidden = stage !== 'hangar';
    autoBtn.classList.toggle('is-complete', cmlLevel === 4);
  }
  const cta = document.getElementById('launch-cta-btn');
  const hasRisks = !sandboxMode && allPopulated && warnings.length > 0;
  cta.classList.toggle('is-ready', stage === 'hangar' && allPopulated && !hasRisks);
  cta.classList.toggle('is-risk', stage === 'hangar' && hasRisks);
  if (stage === 'hangar') {
    cta.disabled = !allPopulated;
    cta.textContent = !allPopulated ? '🔒 EQUIP ALL 4 SEGMENTS' : (hasRisks ? '⚠️ LAUNCH WITH DESIGN RISKS' : '🚀 ROLL OUT TO PAD');
    cta.title = !allPopulated ? 'Populate User, Space, Launch & Ground segments' : (hasRisks ? warnings.map((w) => w.text).join(' | ') : 'Roll out spacecraft to Launchpad 39G');
  } else if (stage === 'launch') {
    const readyOrbit = Boolean(unlocked.orbit);
    cta.disabled = !readyOrbit;
    cta.textContent = readyOrbit ? '🛰️ ENTER ORBIT >>' : '🚀 ASCENT IN PROGRESS...';
    cta.title = readyOrbit ? 'Enter Orbit Stage' : 'Ignite rocket and complete ascent to unlock Orbit';
  } else if (stage === 'orbit') {
    const canFinish = Boolean(run.orbitObjectivesMet);
    cta.disabled = !canFinish;
    cta.classList.toggle('is-ready', canFinish);
    cta.textContent = canFinish ? '🏁 COMPLETE MISSION' : '🔒 FINISH OBJECTIVES FIRST';
    cta.title = canFinish ? 'Open Mission Debrief' : 'Complete the Mission Objectives Sidebar tasks in Orbit first';
  } else {
    cta.disabled = false;
    cta.textContent = '🔄 HANGAR';
    cta.title = 'Return to Hangar';
  }

  document.getElementById('mel-summary-meta').textContent = sandboxMode
    ? `${mel.length} · ${metrics.mass.totalKg}kg · ∞`
    : `${mel.length} · ${metrics.mass.totalKg}kg · $${metrics.budget.usedM}M`;
  document.getElementById('mel-body').innerHTML = `<table class="mel-table"><thead><tr><th>Seg</th><th>Item</th><th>Mass</th><th>Pwr</th><th>Cost</th></tr></thead><tbody>`
    + mel.map((r) => `<tr><td>${esc(r.segment)}</td><td>${esc(r.item)}</td><td>${r.massKg}kg</td><td>${r.powerW}W</td><td>$${r.costM}M</td></tr>`).join('') + '</tbody></table>';
}

export function renderStageHud(stage, state, ev, opts) {
  const hud = document.getElementById('stage-hud'), actions = document.getElementById('center-action-hud');
  const rev = document.getElementById('review-overlay'), loadout = document.getElementById('hangar-loadout');
  loadout.hidden = stage !== 'hangar'; rev.hidden = stage !== 'review';

  const hBox = document.getElementById('hazard-alert-hud');
  if (hBox && stage !== 'orbit') { hBox.hidden = true; hBox.innerHTML = ''; }
  const pip = document.getElementById('sensor-cam-pip');
  if (pip) pip.hidden = stage !== 'orbit' || !opts.sensorCamOpen;
  if (stage !== 'review') { cancelDebriefAnim(); rev.dataset.rendered = ''; }
  if (stage === 'hangar') {
    hud.innerHTML = `<div class="stage-card plate">
      <div class="card-head"><span>HANGAR CAMERA</span><span class="badge-tag">${opts.meshCount} PARTS</span></div>
      <div class="btn-row">
        <button class="btn-sci" data-snap="bus" type="button">Bus</button><button class="btn-sci" data-snap="payload" type="button">Payload</button>
        <button class="btn-sci" data-snap="solar" type="button">Solar</button><button class="btn-sci" data-snap="comms" type="button">Comms</button>
      </div>
      <div class="btn-row">
        <button id="vp-autorotate-btn" class="btn-sci ${opts.autoRotate ? 'is-on' : ''}" type="button">Auto-Spin</button>
        <button id="vp-explode-btn" class="btn-sci ${opts.exploded ? 'is-on' : ''}" type="button">Explode</button>
        <button id="vp-reset-btn" class="btn-sci" type="button">Reset</button>
        <button id="hud-mission-guide-btn" class="btn-sci guide-pill" type="button">📋 Mission Guide</button>
      </div></div>`;
    actions.innerHTML = ''; return;
  }
  const decBox = document.getElementById('decision-alert-hud');
  if (decBox && stage !== 'orbit') { decBox.hidden = true; decBox.innerHTML = ''; }
  if (stage === 'launch') {
    hud.innerHTML = `<div class="stage-card plate">
      <div class="card-head"><span>ASCENT TELEMETRY</span><span id="launch-phase-pill" class="badge-tag">ARMED ON PAD</span></div>
      <div class="tacho-wrap">
        <svg class="tacho-svg" viewBox="0 0 80 80"><circle class="tacho-bg" cx="40" cy="40" r="30"/><circle id="lch-ring-fg" class="tacho-fg" cx="40" cy="40" r="30" stroke-dasharray="188.5" stroke-dashoffset="188.5"/></svg>
        <div><div id="lch-callout" class="callout-tag">READY FOR IGNITION</div><div id="launch-telem" class="telem-mono">HOLD · 0 km · 0.00 km/s</div></div>
      </div>
      <div class="btn-row">
        <button class="btn-sci ${opts.launchCam === 'trench' ? 'is-on' : ''}" data-lcam="trench" type="button">🎥 Pad Trench</button>
        <button class="btn-sci ${opts.launchCam === 'track' ? 'is-on' : ''}" data-lcam="track" type="button">🎥 Tower Track</button>
        <button class="btn-sci ${opts.launchCam === 'hull' ? 'is-on' : ''}" data-lcam="hull" type="button">🎥 Rocket Hull Cam</button>
        <button class="btn-sci ${opts.launchCam === 'free' ? 'is-on' : ''}" data-lcam="free" type="button">🎥 Free Cam</button>
        <button id="lch-skip-btn" class="btn-sci active" type="button" ${opts.launchInserted ? '' : 'disabled title="Complete rocket ascent first to unlock Orbit"'}>Skip &gt;&gt;</button>
      </div></div>`;
    actions.innerHTML = `<button id="lch-ignite-btn" class="action-prompt" type="button">🔥 PRESS [SPACE] OR CLICK TO IGNITE</button>`;
    return;
  }
  if (stage === 'orbit') {
    const risks = ev.designRisks || {};
    const riskMsgs = [];
    if (risks.massOverrun) riskMsgs.push('Drag Decay (-0.5%/s Hull)');
    if (risks.lowPowerMargin) riskMsgs.push('Eclipse Brownout Risk (2.5x drain)');
    if (risks.weakCommsMargin) riskMsgs.push('Packet Bottleneck (-50% downlink pts)');
    if (risks.wavelengthMismatch) riskMsgs.push('Wavelength Mismatch (-40% science)');
    const testHazBtn = state.sandboxMode
      ? '<button id="orb-test-hazard-btn" class="btn-sci" type="button">⚠️ Trigger Hazard</button>'
      : '';
    const debOk = Boolean(opts.orbitObjectivesMet);
    const bufPkts = opts.onboardBuffer || 0;
    hud.innerHTML = `<div class="stage-card plate">
      <div class="card-head"><span>ORBITAL OPS</span><div class="orb-head-pills"><span id="orb-buffer-pill" class="badge-tag orb-buffer-pill ${bufPkts > 0 ? 'is-loaded' : 'is-empty'}" title="Buffered Science Packets ready for Ground Station downlink">💾 BUFFER: ${bufPkts} Packet${bufPkts === 1 ? '' : 's'}</span><span id="orb-score-pill" class="badge-tag">SCORE ${opts.orbitScore || 0}</span></div></div>
      <div class="orbit-clock-row">
        <div class="orbit-clock-cell"><span class="orbit-clock-lbl">MET</span><span id="orb-met-val" class="orbit-clock-val">T+ 00:00:00</span></div>
        <div class="orbit-clock-cell"><span class="orbit-clock-lbl">UTC</span><span id="orb-utc-val" class="orbit-clock-val">2026-11-15 14:00:00</span></div>
      </div>
      <div id="orb-eclipse-badge" class="eclipse-badge" hidden>🌑 ECLIPSE SHADOW · SOLAR ARRAY OUTPUT DROPPED</div>
      ${riskMsgs.length ? `<div class="design-risk-banner">⚠️ ACTIVE RISKS: ${esc(riskMsgs.join(' · '))}</div>` : ''}
      <div class="btn-row">
        <button class="btn-sci ${opts.orbitCam === 'chase' ? 'is-on' : ''}" data-cam="chase" type="button">🛰️ Chase Sat</button>
        <button class="btn-sci ${opts.orbitCam === 'full' ? 'is-on' : ''}" data-cam="full" type="button">🌍 Full Orbit</button>
        <button class="btn-sci ${opts.orbitCam === 'asteroid' ? 'is-on' : ''}" data-cam="asteroid" type="button">☄️ Asteroid &amp; Comet</button>
        <button class="btn-sci ${opts.orbitCam === 'solar' ? 'is-on' : ''}" data-cam="solar" type="button">🌌 Full Solar System</button>
      </div>
      <div class="btn-row">
        <button class="btn-sci ${opts.orbitWarp === 1 ? 'is-on' : ''}" data-warp="1" type="button">1x</button>
        <button class="btn-sci ${opts.orbitWarp === 2 ? 'is-on' : ''}" data-warp="2" type="button">2x</button>
        <button class="btn-sci ${opts.orbitWarp === 5 ? 'is-on' : ''}" data-warp="5" type="button">5x</button>
        <button class="btn-sci ${opts.orbitWarp === 0 ? 'is-on' : ''}" data-warp="0" type="button">Pause</button>
        ${testHazBtn}
        <button id="orb-replay-unfold-btn" class="btn-sci" type="button" title="Replay Zero-G Satellite Unfolding [U]">🛰️ Replay Unfold [U]</button>
        <button id="orb-sensorcam-btn" class="btn-sci ${opts.sensorCamOpen ? 'is-on' : ''}" type="button">📷 Sensor Cam [C]</button>
        <button id="hud-mission-guide-btn" class="btn-sci guide-pill" type="button">📋 Mission Guide</button>
        <button id="orb-debrief-btn" class="btn-sci ${debOk ? 'active' : ''}" type="button" ${debOk ? '' : 'disabled title="Complete Mission Objectives Sidebar tasks in Orbit to unlock Debrief"'}>${debOk ? '🏆 View Debrief' : '🔒 Debrief (Tasks)'}</button>
      </div>
      <div class="hull-meter-row">
        <div class="hull-meter-head"><span>HULL INTEGRITY</span><span id="orb-hull-pct">${opts.hullIntegrity ?? 100}%</span></div>
        <div class="hull-meter-track"><div id="orb-hull-fill" class="hull-meter-fill" style="width:${opts.hullIntegrity ?? 100}%"></div></div>
      </div>
      <div id="orbit-telem" class="telem-mono">Propagating Keplerian track...</div></div>`;
    actions.innerHTML = `<button id="orb-transmit-btn" class="action-prompt is-cyan" type="button" hidden>📡 [SPACE] TRANSMIT SCIENCE (+50)</button>
      <button id="orb-scan-btn" class="action-prompt is-cyan is-standby" type="button">🔍 [E] SCAN SCIENCE ZONE (FLY INTO RING)</button>
      <button id="orb-safemode-btn" class="action-prompt" type="button" hidden>🛡️ [Q] CYCLE POWER / SAFE MODE</button>`;
    return;
  }
  hud.innerHTML = ''; actions.innerHTML = '';
  const { scenario, orbitElements, metrics, missionMatch, cmlLevel, sandboxMode, designRisks } = ev;
  const oScore = opts.orbitScore || 0;
  const resolvedCount = opts.anomaliesResolved || 0;
  const hullFinal = opts.hullIntegrity ?? 100;
  const downlinkCount = opts.downlinkCount || 0;
  const asteroidsScanned = opts.asteroidsScanned || 0;
  const downlinkPts = opts.downlinkPts ?? downlinkCount * 50;
  const anomalyPts = opts.anomalyPts ?? resolvedCount * 75;
  const decisionPts = opts.decisionPts ?? 0;
  const scanPts = opts.scanPts ?? Math.max(0, oScore - downlinkPts - anomalyPts - decisionPts);
  const budgetOverrun = Boolean(!sandboxMode && designRisks?.budgetOverrun);
  const budgetEfficiency = !sandboxMode && metrics.budget.usedM <= metrics.budget.limitM
    ? Math.round((metrics.budget.limitM - metrics.budget.usedM) * 4)
    : 0;
  const budgetPenalty = budgetOverrun ? 200 : 0;
  const engPts = metrics.scienceScore * 10 + (cmlLevel === 4 ? 250 : 0) + budgetEfficiency - budgetPenalty;
  const totalScore = Math.max(0, downlinkPts + anomalyPts + scanPts + decisionPts + engPts);

  let starCount = (cmlLevel === 4 || sandboxMode) && metrics.scienceScore >= 85 && (oScore >= 50 || resolvedCount > 0)
    ? 3
    : (cmlLevel >= 3 ? 2 : 1);
  if (budgetOverrun) starCount = Math.min(2, starCount);
  const rankMeta = starCount === 3 && totalScore >= 1350
    ? { label: 'S-RANK // FLIGHT DIRECTOR', cls: 'rank-s', tip: '' }
    : starCount === 3
      ? { label: 'A-RANK // MISSION COMMANDER', cls: 'rank-a', tip: '' }
      : starCount === 2
        ? { label: 'B-RANK // SYSTEMS ENGINEER', cls: 'rank-b', tip: budgetOverrun ? 'Budget Overrun capped max rating at 2 ★ (-200 pts). Keep cost within mission cap for 3 ★!' : 'Reach CML 4 with >=85% Science and >=50 Orbit Ops pts for 3 stars.' }
        : { label: 'MISSION AT RISK', cls: 'rank-risk', tip: 'Fix yellow warnings in Hangar (CML 4) and downlink science in Orbit to hit 3 stars!' };

  const busObj = CATALOG.space.buses.find((b) => b.id === state.busId);
  const bandObj = CATALOG.user.wavelengths.find((w) => w.id === state.wavelengthBand);
  const ribbons = [];
  if (hullFinal >= 100) ribbons.push({ icon: '🛡️', label: 'Flawless Hull (100%)' });
  if (resolvedCount >= 1) ribbons.push({ icon: '⚡', label: 'Crisis Responder' });
  if (!sandboxMode && metrics.budget.usedM <= metrics.budget.limitM * 0.9) ribbons.push({ icon: '💎', label: 'Under-Budget Ace' });
  if (asteroidsScanned >= 1) ribbons.push({ icon: '☄️', label: 'Asteroid Hunter' });
  if (downlinkCount >= 1) ribbons.push({ icon: '📡', label: 'Deep-Space Broadcaster' });
  if (metrics.powerMargin >= 10 && (state.solarId === 'rtg-nuclear' || state.solarId === 'high-eff-gimbal' || (opts.batterySoc ?? 84) >= 50)) {
    ribbons.push({ icon: '🔋', label: 'Eclipse Survivor' });
  }
  if (!ribbons.length) ribbons.push({ icon: '🛠️', label: 'Concept Architect' });

  const starSvg = (lit, idx) => `<svg class="debrief-star ${lit ? 'lit' : 'unlit'}" data-star-idx="${idx}" viewBox="0 0 64 64" aria-hidden="true">
    <polygon points="32,4 40.5,22 60,24.5 45.5,38 49.2,58 32,48.2 14.8,58 18.5,38 4,24.5 23.5,22" />
  </svg>`;

  const confettiHtml = starCount === 3
    ? `<div class="debrief-confetti" aria-hidden="true">${Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * 360;
        const dist = 65 + (i % 4) * 28;
        const col = i % 3 === 0 ? '#fbbf24' : (i % 3 === 1 ? '#38bdf8' : '#34d399');
        return `<span class="confetti-bit" style="--tx:${Math.cos(angle * Math.PI / 180) * dist}px;--ty:${Math.sin(angle * Math.PI / 180) * dist - 14}px;--rot:${(i * 47) % 360}deg;--col:${col};--delay:${(i % 5) * 45}ms"></span>`;
      }).join('')}</div>`
    : '';

  if (rev.dataset.rendered === '1') return;
  rev.dataset.rendered = '1';
  cancelDebriefAnim();

  rev.innerHTML = `<div class="debrief-showcase plate">
    <div class="debrief-topbar">
      <div class="debrief-brand">
        <span class="debrief-kicker">GOSPACE MISSION DEBRIEF</span>
        <h2 class="debrief-title">${esc(scenario.name)}</h2>
        <div class="debrief-sub">${esc(orbitElements.name)} · Hull ${hullFinal}% · ${resolvedCount} Anomalies Resolved</div>
      </div>
      <button id="rev-close-btn" class="debrief-close-btn" type="button">✕ CLOSE [ESC]</button>
    </div>

    <div class="debrief-hero-band">
      <div class="debrief-stars-wrap">
        <div class="debrief-stars-row">${starSvg(starCount >= 1, 0)}${starSvg(starCount >= 2, 1)}${starSvg(starCount >= 3, 2)}</div>
        ${confettiHtml}
      </div>
      <div id="debrief-rank-crest" class="rank-crest ${rankMeta.cls}">${esc(rankMeta.label)}</div>
      <div class="debrief-total-pill">
        <span class="debrief-total-lbl">TOTAL SCORE</span>
        <span id="debrief-total-num" class="debrief-total-num">0</span>
      </div>
    </div>
    ${rankMeta.tip ? `<div class="debrief-risk-tip">💡 ${esc(rankMeta.tip)}</div>` : ''}

    <div class="debrief-main-grid">
      <section class="debrief-panel">
        <div class="debrief-sec-head">SCORE BREAKDOWN &amp; TELEMETRY</div>
        <div class="score-rows">
          <div class="score-row"><span>📡 Science Data Downlinked</span><strong>+${downlinkPts} PTS</strong></div>
          <div class="score-row"><span>🛠️ Space Anomalies Repaired</span><strong>+${anomalyPts} PTS</strong></div>
          <div class="score-row"><span>☄️ Asteroid &amp; Deep-Space Scans</span><strong>+${scanPts} PTS</strong></div>
          ${decisionPts ? `<div class="score-row"><span>⚡ Tactical Command Decisions</span><strong>${decisionPts >= 0 ? `+${decisionPts}` : decisionPts} PTS</strong></div>` : ''}
          <div class="score-row"><span>💰 Engineering &amp; Budget Efficiency</span><strong>+${metrics.scienceScore * 10 + (cmlLevel === 4 ? 250 : 0) + budgetEfficiency} PTS</strong></div>
          ${budgetPenalty ? `<div class="score-row" style="color:#fda4af"><span>💸 Budget Overrun Penalty (Max 2 ★)</span><strong>-${budgetPenalty} PTS</strong></div>` : ''}
        </div>
        <div class="debrief-sec-head" style="margin-top:10px">EARNED MISSION RIBBONS</div>
        <div class="ribbons-shelf">${ribbons.map((r) => `<span class="medal-chip">${r.icon} ${esc(r.label)}</span>`).join('')}</div>
      </section>

      <section class="holo-card" id="debrief-holo-card">
        <div class="holo-glint" aria-hidden="true"></div>
        <div class="holo-head">UNLOCKED SPACECRAFT ARCHIVE · ${esc(missionMatch.tag || 'ORBITER')}</div>
        <div class="holo-name">🏆 ${esc(missionMatch.name)}</div>
        <p class="holo-detail">${esc(missionMatch.detail)}</p>
        <div class="holo-pills">
          <span class="holo-pill">🛰️ Orbit: ${esc(orbitElements.name.split('(')[0].trim())}</span>
          <span class="holo-pill">🔭 Band: ${esc(bandObj?.name || state.wavelengthBand)}</span>
          <span class="holo-pill">🧰 Bus: ${esc(busObj?.name || state.busId)}</span>
        </div>
        <div class="holo-telemetry-mini">
          <span title="${sandboxMode ? 'Unlimited Sandbox Budget' : ''}">Budget ${sandboxMode ? '∞' : `$${metrics.budget.usedM}M`}</span>
          <span>Power ${metrics.powerMargin}%</span>
          <span>Science ${metrics.scienceScore}%</span>
        </div>
      </section>
    </div>

    <div class="debrief-footer-nav">
      <button id="rev-menu-btn" class="debrief-cta" type="button">🏠 BACK TO MENU</button>
      <button id="rev-next-btn" class="debrief-cta is-primary" type="button">▶ NEXT MISSION</button>
    </div>
  </div>`;

  // Sequenced star slam with rising chimes (250ms stagger)
  for (let i = 0; i < 3; i += 1) {
    const tId = setTimeout(() => {
      const starEl = rev.querySelector(`[data-star-idx="${i}"]`);
      if (starEl) starEl.classList.add('is-slammed');
      if (i < starCount) playStarChime(i);
    }, 140 + i * 250);
    debriefTimers.push(tId);
  }

  // Confetti burst + rank crest stamp
  const stampId = setTimeout(() => {
    rev.querySelector('.debrief-confetti')?.classList.add('is-bursting');
    document.getElementById('debrief-rank-crest')?.classList.add('is-stamped');
    playRankStamp();
  }, 780);
  debriefTimers.push(stampId);

  // Rolling score counter over 900ms
  const scoreEl = document.getElementById('debrief-total-num');
  const startMs = performance.now();
  const durMs = 900;
  const tickScore = (nowMs) => {
    const p = Math.min(1, (nowMs - startMs) / durMs);
    const eased = 1 - ((1 - p) ** 3);
    if (scoreEl) scoreEl.textContent = String(Math.round(totalScore * eased));
    if (p < 1) debriefRaf = requestAnimationFrame(tickScore);
    else debriefRaf = 0;
  };
  debriefRaf = requestAnimationFrame(tickScore);

  // Subtle 3D mouse tilt on holographic twin card
  const holo = document.getElementById('debrief-holo-card');
  if (holo) {
    holo.addEventListener('mousemove', (evMove) => {
      const r = holo.getBoundingClientRect();
      const nx = (evMove.clientX - r.left) / Math.max(r.width, 1) - 0.5;
      const ny = (evMove.clientY - r.top) / Math.max(r.height, 1) - 0.5;
      holo.style.transform = `perspective(800px) rotateY(${(nx * 10).toFixed(2)}deg) rotateX(${(-ny * 9).toFixed(2)}deg)`;
    });
    holo.addEventListener('mouseleave', () => {
      holo.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
    });
  }
}

export function updateLaunchOverlay(t) {
  document.getElementById('launch-phase-pill')?.replaceChildren(document.createTextNode(t.phase));
  document.getElementById('lch-callout')?.replaceChildren(document.createTextNode(t.callout));
  const d = document.getElementById('launch-telem'); if (d) d.textContent = `${t.countdownLabel} · ${t.altitudeKm} km · ${t.velocityKms} km/s · ${t.progressPct}%`;
  const ring = document.getElementById('lch-ring-fg'); if (ring) ring.style.strokeDashoffset = String((188.5 * (1 - Math.min(1, t.velocityKms / 7.8))).toFixed(1));
  const ign = document.getElementById('lch-ignite-btn'); if (ign) ign.hidden = !t.armed;
}

export function updateOrbitOverlay(t, objStatus = null) {
  const destroyed = Boolean(t?.isDestroyed || (t?.hullIntegrity ?? 100) <= 0);
  const d = document.getElementById('orbit-telem');
  if (d && t) {
    if (destroyed) {
      d.textContent = '💥 HULL BREACHED (0%) — VEHICLE LOST';
    } else {
      const flags = [];
      if ((t.solarPausedSec || 0) > 0) flags.push(`SOLAR PAUSED ${t.solarPausedSec}s`);
      if ((t.commsPausedSec || 0) > 0) flags.push(`DL PAUSED ${t.commsPausedSec}s`);
      if ((t.omniReducedDownlinks || 0) > 0) flags.push('OMNI 70%');
      const flagStr = flags.length ? ` · ${flags.join(' · ')}` : '';
      d.textContent = `ALT ${t.altitudeKm}km · ${t.speedKms}km/s · ${t.stormActive ? 'SOLAR FLARE!' : (t.inEclipse ? 'ECLIPSE' : 'SUNLIT')} | BATT ${t.batterySoc}%${flagStr} · ${t.nearestNeaId || 'NEA'}`;
    }
  }
  document.getElementById('orb-score-pill')?.replaceChildren(document.createTextNode(`SCORE ${t.missionScore}`));
  document.querySelectorAll('#stage-hud [data-warp]').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.warp) === Number(t?.timeWarp)));
  const hull = destroyed ? 0 : Math.max(0, Math.min(100, t?.hullIntegrity ?? 100));
  const hullPct = document.getElementById('orb-hull-pct'); if (hullPct) hullPct.textContent = `${hull}%`;
  const hullFill = document.getElementById('orb-hull-fill');
  if (hullFill) {
    hullFill.style.width = `${hull}%`;
    hullFill.style.background = hull >= 70 ? '#10b981' : (hull >= 40 ? '#f59e0b' : '#ef4444');
  }
  const hazBox = document.getElementById('hazard-alert-hud');
  const hs = t?.hazardState;
  if (hazBox && hs) {
    if (destroyed) {
      hazBox.hidden = true;
      hazBox.dataset.renderKey = '';
    } else if (hs.activeHazard) {
      const haz = hs.activeHazard;
      const renderKey = `${haz.kind}|${hs.lowBattery ? 1 : 0}|${haz.choices?.length || 0}`;
      hazBox.hidden = false;
      hazBox.classList.remove('is-nominal');
      if (hazBox.dataset.renderKey !== renderKey) {
        hazBox.dataset.renderKey = renderKey;
        hazBox.innerHTML = `<div class="hazard-head">
            <div class="hazard-title-wrap">
              <span class="hazard-kicker">MISSION CONTROL ANOMALY PROTOCOL</span>
              <span class="hazard-title">${haz.icon} ${esc(haz.title)}</span>
            </div>
            <span id="hazard-timer-pill" class="hazard-timer-pill">${haz.remainingSec.toFixed(1)}s</span>
          </div>
          <div class="hazard-desc">${esc(haz.detail)}</div>
          <div class="hazard-bar-track"><div id="hazard-bar-fill" class="hazard-bar-fill" style="width:${haz.pct}%"></div></div>
          <div class="hazard-choices">
            ${(haz.choices || []).map((c) => `
              <button class="hazard-choice-btn tone-${esc(c.tone || 'amber')}${c.lowBattWarn ? ' has-lowbatt' : ''}" data-choice-idx="${c.index}" type="button">
                <div class="hazard-choice-top">
                  <span class="hazard-keycap">[${esc(c.key)}]</span>
                  <span class="hazard-choice-label">${esc(c.label)}</span>
                </div>
                <div class="hazard-badges">
                  ${(c.badges || []).map((b) => `<span class="haz-badge is-${esc(b.cls || 'warn')}">${esc(b.text)}</span>`).join('')}
                  ${c.lowBattWarn ? `<span class="hazard-lowbatt-tag">⚠️ ${esc(c.lowBattText || 'LOW BATT -> BROWNOUT RISK')}</span>` : ''}
                </div>
              </button>`).join('')}
          </div>`;
      } else {
        const tp = document.getElementById('hazard-timer-pill');
        if (tp) tp.textContent = `${haz.remainingSec.toFixed(1)}s`;
        const bf = document.getElementById('hazard-bar-fill');
        if (bf) bf.style.width = `${haz.pct}%`;
      }
    } else if (hs.resolvedBanner) {
      hazBox.hidden = false;
      const b = typeof hs.resolvedBanner === 'object' ? hs.resolvedBanner : null;
      const isTimeout = Boolean(b?.expired || b?.isTimeout || (typeof hs.resolvedBanner === 'string' && /timeout|timed out|impact/i.test(hs.resolvedBanner)));
      hazBox.classList.toggle('is-nominal', !isTimeout);
      const bKey = b ? `ban:${b.title}|${b.scoreDelta ?? ''}|${isTimeout ? 1 : 0}` : `ban:${String(hs.resolvedBanner)}`;
      if (hazBox.dataset.renderKey !== bKey) {
        hazBox.dataset.renderKey = bKey;
        const headText = b?.title || (typeof hs.resolvedBanner === 'string' ? hs.resolvedBanner : '✅ SYSTEMS NOMINAL — ANOMALY RESOLVED');
        const badgeText = b?.badge || (b?.scoreDelta != null ? `${b.scoreDelta >= 0 ? '+' : ''}${b.scoreDelta} PTS` : (isTimeout ? '-26% HULL' : '+40 PTS'));
        const descText = b?.detail || (isTimeout ? 'Anomaly timer expired before Mission Control executed mitigation.' : 'Telemetry confirmed anomaly protocol execution.');
        const pillStyle = isTimeout
          ? 'background:rgba(239,68,68,0.28);border-color:#f87171;color:#fee2e2'
          : 'background:rgba(16,185,129,0.28);border-color:#34d399;color:#d1fae5';
        hazBox.innerHTML = `<div class="hazard-head" style="color:${isTimeout ? '#fecaca' : '#a7f3d0'}"><span>${esc(headText)}</span><span class="hazard-timer-pill" style="${pillStyle}">${esc(badgeText)}</span></div>
          <div class="hazard-desc">${esc(descText)}</div>`;
      }
    } else {
      hazBox.hidden = true;
      hazBox.dataset.renderKey = '';
    }
  }
  document.getElementById('orb-met-val')?.replaceChildren(document.createTextNode(t?.metText || 'T+ 00:00:00'));
  document.getElementById('orb-utc-val')?.replaceChildren(document.createTextNode(t?.utcText || '2026-11-15 14:00:00'));
  const eclBadge = document.getElementById('orb-eclipse-badge');
  if (eclBadge) eclBadge.hidden = !t?.inEclipse;
  const bufPill = document.getElementById('orb-buffer-pill');
  const bufPkts = t?.onboardBuffer ?? 0;
  if (bufPill) {
    bufPill.textContent = `💾 BUFFER: ${bufPkts} Packet${bufPkts === 1 ? '' : 's'}`;
    bufPill.classList.toggle('is-loaded', bufPkts > 0);
    bufPill.classList.toggle('is-empty', bufPkts <= 0);
  }
  const tx = document.getElementById('orb-transmit-btn');
  if (tx) {
    tx.hidden = destroyed || !t?.inLineOfSight;
    const dlPaused = (t?.commsPausedSec || 0) > 0;
    tx.disabled = Boolean(destroyed || t?.brownoutLocked || dlPaused);
    tx.classList.remove('is-cooldown', 'is-standby');
    if (t?.brownoutLocked) {
      tx.textContent = '🔋 BROWNOUT: RECHARGE TO 15% IN SUNLIGHT';
    } else if (dlPaused) {
      tx.textContent = `⏸️ DOWNLINK PAUSED (${t.commsPausedSec}s)`;
    } else if (t?.stationPassCooldownActive) {
      tx.textContent = '⏳ PASS USED — EXIT CONE FOR NEXT DISH';
      tx.classList.add('is-cooldown');
    } else if (bufPkts < 1 && !t?.tutorialActive) {
      tx.textContent = '💾 BUFFER EMPTY — SCAN ZONE [E] FIRST';
      tx.classList.add('is-standby');
    } else {
      let pts = 50;
      if (t?.designRisks?.weakCommsMargin) pts = Math.round(pts * 0.5);
      if (t?.designRisks?.wavelengthMismatch) pts = Math.round(pts * 0.6);
      if ((t?.omniReducedDownlinks || 0) > 0) pts = Math.round(pts * 0.7);
      const omniTag = (t?.omniReducedDownlinks || 0) > 0 ? ' · OMNI 70%' : '';
      tx.textContent = `📡 [SPACE] TRANSMIT SCIENCE (+${pts})${omniTag}`;
    }
  }
  const scanBtn = document.getElementById('orb-scan-btn');
  if (scanBtn) {
    scanBtn.hidden = destroyed;
    scanBtn.disabled = destroyed;
    scanBtn.classList.remove('is-swath-ready', 'is-cooldown', 'is-standby');
    if (t?.swathReady) {
      scanBtn.textContent = `🔬 IN SCAN ZONE — PRESS [E] TO CAPTURE SCIENCE (+${t.swathZonePoints || 60})`;
      scanBtn.classList.add('is-swath-ready');
    } else if ((t?.swathCooldownSec || 0) > 0) {
      scanBtn.textContent = `⏳ ${(t.swathZoneName || 'ZONE').toUpperCase()} COOLDOWN (${t.swathCooldownSec}s)`;
      scanBtn.classList.add('is-cooldown');
    } else if (t?.nextZoneName) {
      scanBtn.textContent = `🔍 NEXT SCAN: ${t.nextZoneName} · ${t.nextZoneEtaSec}s (~${t.nextZoneDistKm} km)`;
      scanBtn.classList.add('is-standby');
    } else {
      scanBtn.textContent = '🔍 [E] SCAN SCIENCE ZONE (FLY INTO RING)';
      scanBtn.classList.add('is-standby');
    }
  }
  const debBtn = document.getElementById('orb-debrief-btn');
  const dlDone = !destroyed && (objStatus ? Boolean(objStatus.canDebrief) : (t?.downlinkCount || 0) >= 1);
  if (debBtn) {
    debBtn.disabled = !dlDone;
    debBtn.classList.toggle('active', dlDone);
    debBtn.textContent = dlDone
      ? '🏆 View Debrief'
      : `🔒 Debrief (${objStatus ? `${objStatus.completedCount}/${objStatus.totalCount}` : `${Math.min(t?.downlinkCount || 0, 1)}/1`})`;
  }
  const sm = document.getElementById('orb-safemode-btn'); if (sm) sm.hidden = destroyed || !(t?.inEclipse || t?.stormActive) || Boolean(t?.safeModeActive);
  const db = document.getElementById('orbit-deploy-banner');
  if (db) {
    const active = Boolean(t?.deployActive && !t?.briefingPaused);
    db.hidden = !active;
    if (active) {
      const pct = Math.round((t.deployProgress || 0) * 100);
      db.textContent = `🛰️ DEPLOYING SOLAR ARRAYS & HIGH-GAIN ANTENNA... ${pct}%`;
    }
  }
}

export const renderResourcesList = () => { document.getElementById('resources-list').innerHTML = OFFICIAL_RESOURCES.map((r) => `<li><span><strong>[${r.agency}]</strong> ${esc(r.title)}</span><a href="${r.url}" target="_blank" rel="noopener noreferrer">Open</a></li>`).join(''); };
export function renderSavedModal(savedList, currentEval) {
  document.getElementById('saved-designs-list').innerHTML = savedList.length ? savedList.map((d, idx) => `<div class="saved-row"><span><strong>${esc(d.name)}</strong> · CML ${d.cmlLevel} · $${d.budgetM}M · Sci ${d.scienceScore}</span><span><button class="btn-sci" data-load-idx="${idx}" type="button">Load</button> <button class="btn-sci" data-cmp-idx="${idx}" type="button">Cmp</button> <button class="btn-sci" data-del-idx="${idx}" type="button">Del</button></span></div>`).join('') : '<p style="color:var(--muted)">No saved designs yet.</p>';
  document.getElementById('compare-box').innerHTML = `<strong>Active:</strong> CML ${currentEval.cmlLevel} · $${currentEval.metrics.budget.usedM}M · ${currentEval.metrics.mass.totalKg} kg · Sci ${currentEval.metrics.scienceScore}/100`;
}

export function renderMissionBriefing(ev, stage, open) {
  const el = document.getElementById('briefing-overlay');
  if (!el) return;
  if (!open || !ev) {
    el.hidden = true;
    el.dataset.key = '';
    return;
  }
  const key = `${ev.scenario.id}|${ev.sandboxMode ? 1 : 0}|${stage}`;
  el.hidden = false;
  if (el.dataset.key === key) return;
  el.dataset.key = key;

  const guide = getMissionOrbitGuide(ev.scenario, ev.sandboxMode);
  const startLabel = stage === 'orbit'
    ? '🚀 BEGIN ORBITAL OPERATIONS [SPACE]'
    : '✓ CLOSE BRIEFING · BACK TO HANGAR [SPACE]';

  el.innerHTML = `<div class="briefing-card plate" role="dialog" aria-modal="true" aria-labelledby="brief-title-heading">
    <div class="brief-topbar">
      <div class="brief-head-copy">
        <span class="brief-kicker">ORBITAL INSERTION BRIEFING · ${esc(guide.codename)}</span>
        <h2 id="brief-title-heading" class="brief-title">${esc(guide.headline)}</h2>
        <div class="brief-sub">${esc(ev.orbitElements.name)} · Spacecraft Mass ${esc(ev.metrics.mass.totalKg)} kg · ${stage === 'orbit' ? 'ORBIT HAZARDS PAUSED' : 'PRE-FLIGHT BRIEFING'}</div>
      </div>
      <button id="brief-close-btn" class="brief-close-btn" type="button" title="Close Briefing [ESC]" aria-label="Close Mission Briefing">✕</button>
    </div>

    <section class="brief-story">
      <div class="brief-sec-head">🌍 WHAT THIS MISSION IS ABOUT</div>
      <p class="brief-about">${esc(guide.about)}</p>
    </section>

    <section class="brief-objectives">
      <div class="brief-sec-head">🎯 YOUR ORBIT OBJECTIVES</div>
      <div class="brief-tasks">
        ${guide.tasks.map((t, idx) => `<div class="brief-task-card">
          <span class="brief-step-num">${idx + 1}</span>
          <span class="brief-task-ico" aria-hidden="true">${t.icon}</span>
          <div class="brief-task-copy">
            <strong>${esc(t.title)}</strong>
            <p>${esc(t.text)}</p>
          </div>
        </div>`).join('')}
      </div>
    </section>

    <div class="brief-tip">💡 <strong>PRO TIP:</strong> ${esc(guide.proTip)}</div>

    <div class="brief-keybinds" aria-label="Orbital Controls">
      <span><kbd>[SPACE]</kbd> Downlink Buffer at Ground Dish</span>
      <span><kbd>[E]</kbd> Scan Science Zone</span>
      <span><kbd>[1x–5x]</kbd> Time Warp</span>
      <span><kbd>[Click / Hotkey]</kbd> Fix Hazards</span>
    </div>

    <div class="brief-actions">
      <button id="brief-start-btn" class="brief-start-btn" type="button">${startLabel}</button>
    </div>
  </div>`;
}

export function renderHoloScannerCard(holoId, focusedHoloId = null) {
  const card = document.getElementById('holo-scanner-card');
  if (!card) return;
  const data = holoId ? CELESTIAL_DATABASE[holoId] : null;
  if (!data) {
    card.hidden = true;
    card.dataset.holoId = '';
    return;
  }
  const key = `${data.id}|${focusedHoloId === data.id ? 1 : 0}`;
  card.hidden = false;
  if (card.dataset.renderKey === key) return;
  card.dataset.renderKey = key;
  card.dataset.holoId = data.id;
  card.style.setProperty('--holo-accent', data.accent || '#38bdf8');

  card.innerHTML = `<div class="holo-scan-head">
    <div class="holo-scan-title-wrap">
      <span class="holo-scan-emblem" aria-hidden="true">${data.emblem}</span>
      <div>
        <div class="holo-scan-kicker">HOLO-SCANNER TELEMETRY</div>
        <h3 class="holo-scan-name">${esc(data.name)}</h3>
      </div>
    </div>
    <button id="holo-close-btn" class="holo-scan-close" type="button" title="Close Scanner Card" aria-label="Close Holo-Scanner Card">✕</button>
  </div>

  <div class="holo-scan-class-row">
    <span class="holo-class-pill">${esc(data.classification)}</span>
    <span class="holo-dist-pill">${esc(data.stats.distanceAU)}</span>
  </div>

  <div class="holo-stats-grid">
    <div class="holo-stat-cell"><span>GRAVITY</span><strong>${esc(data.stats.gravity)}</strong></div>
    <div class="holo-stat-cell"><span>ROTATION / PASSES</span><strong>${esc(data.stats.dayLength)}</strong></div>
    <div class="holo-stat-cell"><span>ORBIT / BAND</span><strong>${esc(data.stats.orbitalPeriod)}</strong></div>
    <div class="holo-stat-cell"><span>TEMPERATURE</span><strong>${esc(data.stats.tempRange)}</strong></div>
  </div>

  <p class="holo-scan-fact">${esc(data.scienceFact)}</p>

  <div class="holo-scan-actions">
    <button id="holo-zoom-btn" class="btn-sci ${focusedHoloId === data.id ? 'is-on' : ''}" type="button">🎥 Zoom to Body</button>
    <button id="holo-return-btn" class="btn-sci" type="button">🛰️ Back to My Satellite</button>
  </div>`;
}

export function computeMissionDebriefSummary(ev, opts = {}) {
  const { metrics, cmlLevel, sandboxMode, designRisks } = ev;
  const oScore = opts.orbitScore || 0;
  const resolvedCount = opts.anomaliesResolved || 0;
  const downlinkCount = opts.downlinkCount || 0;
  const downlinkPts = opts.downlinkPts ?? downlinkCount * 50;
  const anomalyPts = opts.anomalyPts ?? resolvedCount * 75;
  const decisionPts = opts.decisionPts ?? 0;
  const scanPts = opts.scanPts ?? Math.max(0, oScore - downlinkPts - anomalyPts - decisionPts);
  const budgetOverrun = Boolean(!sandboxMode && designRisks?.budgetOverrun);
  const budgetEfficiency = !sandboxMode && metrics.budget.usedM <= metrics.budget.limitM
    ? Math.round((metrics.budget.limitM - metrics.budget.usedM) * 4)
    : 0;
  const budgetPenalty = budgetOverrun ? 200 : 0;
  const engPts = metrics.scienceScore * 10 + (cmlLevel === 4 ? 250 : 0) + budgetEfficiency - budgetPenalty;
  const totalScore = Math.max(0, downlinkPts + anomalyPts + scanPts + decisionPts + engPts);
  let starCount = (cmlLevel === 4 || sandboxMode) && metrics.scienceScore >= 85 && (oScore >= 50 || resolvedCount > 0)
    ? 3
    : (cmlLevel >= 3 ? 2 : 1);
  if (budgetOverrun) starCount = Math.min(2, starCount);
  return { totalScore, starCount, budgetOverrun, budgetPenalty };
}

export function renderDecisionCard(decision) {
  const el = document.getElementById('decision-alert-hud');
  if (!el) return;
  if (!decision) {
    el.hidden = true;
    el.innerHTML = '';
    el.dataset.decisionId = '';
    return;
  }
  el.hidden = false;
  if (el.dataset.decisionId !== decision.id) {
    el.dataset.decisionId = decision.id;
    el.innerHTML = `<div class="decision-head">
        <span>⚡ MISSION CONTROL DECISION · ${esc(decision.title)}</span>
        <span id="decision-timer-pill" class="decision-timer">${decision.remainingSec.toFixed(1)}s</span>
      </div>
      <div class="decision-desc">${esc(decision.prompt)}</div>
      <div class="decision-actions">
        <button id="dec-opt-risky" class="btn-sci decision-btn is-risky" type="button">
          <span>${esc(decision.risky.label)}</span>
          <small>${esc(decision.risky.deltaText)}</small>
        </button>
        <button id="dec-opt-safe" class="btn-sci decision-btn is-safe" type="button">
          <span>${esc(decision.safe.label)}</span>
          <small>${esc(decision.safe.deltaText)} (Default)</small>
        </button>
      </div>`;
  } else {
    const tp = document.getElementById('decision-timer-pill');
    if (tp) tp.textContent = `${decision.remainingSec.toFixed(1)}s`;
  }
}

export function renderOrbitObjectivesSidebar(stage, state, telemetry = null, run = null, collapsed = false, evaluation = null) {
  const box = document.getElementById('orbit-objectives-sidebar');
  if (!box) return;
  if (stage !== 'orbit') {
    box.hidden = true;
    box.dataset.renderKey = '';
    return null;
  }
  box.hidden = false;
  box.classList.toggle('is-collapsed', Boolean(collapsed));
  const status = getOrbitObjectivesStatus(state, telemetry, run);
  const debuffs = evaluation ? getOrbitActiveDebuffs(evaluation, telemetry) : [];
  const debuffSig = debuffs.map((d) => `${d.id}:${d.firing ? 1 : 0}`).join(',');
  const sig = `${status.scenarioId}|${status.isSandbox ? 1 : 0}|${collapsed ? 1 : 0}|${status.isDestroyed ? 1 : 0}|${status.completedCount}|${status.canDebrief ? 1 : 0}|${status.tasks.map((t) => `${t.progressText}:${t.badgeText}`).join('|')}|${debuffSig}`;
  if (box.dataset.renderKey === sig) return status;
  box.dataset.renderKey = sig;

  const debuffsHtml = debuffs.length
    ? `<div class="orb-debuffs-list">${debuffs.map((d) => `
        <div class="orb-debuff-pill ${d.firing ? 'is-firing' : ''}">
          <div class="orb-debuff-top"><span>${d.icon} ${esc(d.title)}</span>${d.firing ? '<span class="orb-debuff-live">ACTIVE</span>' : ''}</div>
          <div class="orb-debuff-eff">${esc(d.effect)}</div>
        </div>`).join('')}</div>`
    : '<div class="orb-debuff-nominal">✅ ZERO DESIGN DEBUFFS — NOMINAL</div>';

  const destroyedBanner = status.isDestroyed && status.isSandbox
    ? '<div class="orb-obj-destroyed-tag">💥 0% DESTROYED — VEHICLE LOST</div>'
    : '';

  box.innerHTML = `<div class="orb-obj-head">
      <div class="orb-obj-head-top">
        <strong class="orb-obj-name" title="${esc(status.scenarioName)}">${esc(status.scenarioName)}</strong>
        <button id="orb-obj-collapse-btn" class="orb-obj-collapse" type="button" aria-expanded="${collapsed ? 'false' : 'true'}" title="${collapsed ? 'Expand Mission Objectives' : 'Collapse Mission Objectives'}">${collapsed ? '▸' : '▾'}</button>
      </div>
      <div class="orb-obj-subrow">
        <span class="orb-obj-kicker">${esc(status.isSandbox ? 'SANDBOX OPTIONAL' : 'MISSION OBJECTIVES')}</span>
        <span class="orb-obj-count ${status.canDebrief ? 'is-done' : ''}">${status.completedCount} / ${status.totalCount} Complete</span>
      </div>
    </div>
    <div class="orb-obj-track"><div class="orb-obj-fill" style="width:${status.pct}%"></div></div>
    <div class="orb-obj-body">
      <ul class="orb-obj-list">
        ${status.tasks.map((t) => `
          <li class="orb-obj-item ${t.complete ? 'is-complete' : (t.isWarning ? 'is-risk' : 'is-pending')}">
            <div class="orb-obj-row-top">
              <span class="orb-obj-label">${esc(t.title)}</span>
              <span class="orb-obj-val">${esc(t.progressText)}</span>
            </div>
            <div class="orb-obj-pill ${t.complete ? 'is-ok' : (t.isWarning ? 'is-bad' : 'is-wait')}">${esc(t.badgeText)}</div>
          </li>`).join('')}
      </ul>
      ${destroyedBanner}
      <div class="orb-debuffs-sec">
        <div class="orb-debuffs-head">⚠️ ACTIVE DESIGN DEBUFFS</div>
        ${debuffsHtml}
      </div>
      <button id="orb-obj-debrief-btn" class="orb-obj-footer-btn ${status.canDebrief ? 'is-unlocked' : ''}" type="button" ${status.canDebrief ? '' : 'disabled'}>
        ${status.isDestroyed ? '💥 VEHICLE LOST (0% HULL)' : (status.canDebrief ? '🏆 FINISH MISSION &amp; DEBRIEF ▶' : '🔒 Finish Incomplete Tasks')}
      </button>
    </div>`;
  return status;
}

export function renderLossOfVehicleModal(open, reason = '', ev = null) {
  const el = document.getElementById('loss-overlay');
  if (!el) return;
  if (!open) {
    el.hidden = true;
    el.dataset.key = '';
    el.innerHTML = '';
    return;
  }
  const debuffs = ev ? getOrbitActiveDebuffs(ev, null) : [];
  const scName = ev?.scenario?.name || 'Orbital Mission';
  const key = `${scName}|${reason}|${debuffs.map((d) => d.id).join(',')}`;
  el.hidden = false;
  if (el.dataset.key === key) return;
  el.dataset.key = key;

  const causeText = reason || 'Unmitigated Orbital Hazard';
  const debuffNote = debuffs.length
    ? `<div class="loss-debuffs"><strong>Contributing Constraints:</strong> ${debuffs.map((d) => `${d.icon} ${esc(d.title)} (${esc(d.effect)})`).join(' · ')}</div>`
    : '';

  el.innerHTML = `<div class="loss-card plate" role="alertdialog" aria-modal="true" aria-labelledby="loss-title">
      <div class="loss-kicker">EMERGENCY TELEMETRY LOSS // STAGE 3 FAILURE</div>
      <h2 id="loss-title" class="loss-title">💥 LOSS OF VEHICLE — HULL BREACHED (0%)</h2>
      <p class="loss-desc">Telemetry carrier lost for <strong>${esc(scName)}</strong> after structural integrity dropped to zero.</p>
      <div class="loss-cause-box"><span>PRIMARY CAUSE</span><strong>${esc(causeText)}</strong></div>
      ${debuffNote}
      <div class="loss-actions">
        <button id="loss-hangar-btn" class="loss-btn is-fix" type="button">🔧 FIX DESIGN IN HANGAR</button>
        <button id="loss-retry-btn" class="loss-btn is-retry" type="button">🔄 RETRY ORBIT</button>
        <button id="loss-menu-btn" class="loss-btn is-menu" type="button">🏠 BACK TO MENU</button>
      </div>
    </div>`;
}
