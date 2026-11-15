import { CATALOG, CELESTIAL_DATABASE, OFFICIAL_RESOURCES, SCENARIOS, getMissionOrbitGuide, getOrbitActiveDebuffs, getOrbitObjectivesStatus } from './catalog.js';
import { svgIcon, svgStars, stripEmoji } from './icons.js';
import { playRankStamp, playStarChime } from './sfx.js';

let debriefTimers = [];
let debriefRaf = 0;

function cancelDebriefAnim() {
  debriefTimers.forEach((id) => clearTimeout(id));
  debriefTimers = [];
  if (debriefRaf) { cancelAnimationFrame(debriefRaf); debriefRaf = 0; }
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function trimWords(text, maxWords = 12) {
  const clean = stripEmoji(text);
  const words = clean.split(' ').filter(Boolean);
  if (words.length <= maxWords) return clean;
  return `${words.slice(0, maxWords).join(' ')}...`;
}

export const SUB_TABS = {
  user: [{ id: 'obj', label: 'Goal' }, { id: 'band', label: 'Band' }, { id: 'lat', label: 'Latency' }],
  space: [
    { id: 'bus', label: 'Bus' },
    { id: 'inst', label: 'Payload' },
    { id: 'solar', label: 'Power' },
    { id: 'therm', label: 'Thermal' },
    { id: 'skin', label: 'Hull' }
  ],
  launch: [{ id: 'veh', label: 'Rocket' }, { id: 'orbit', label: 'Orbit' }],
  ground: [{ id: 'tx', label: 'Radio' }, { id: 'gs', label: 'Station' }]
};

const instMatchesBand = (i, bId) => i.band === bId || (i.extraBands || []).includes(bId);

const cardHtml = ({ field, id, name, pills, selected, ok = true, multi = false, tip = '' }) => `
  <button class="equip-card ${selected ? 'selected' : ''} ${ok ? '' : 'compat-bad'}" type="button"
    data-field="${field}" data-id="${id}" data-multi="${multi ? '1' : '0'}" data-tip="${esc(tip)}">
    <div class="equip-head equip-row-top">
      <span class="equip-name" title="${esc(name)}">${esc(name)}</span>
      ${selected
        ? `<span class="equip-check-badge" title="Equipped" aria-label="Equipped">${svgIcon('check')}</span>`
        : `<span class="spill ${ok ? 'ok' : 'bad'}">${ok ? '+' : '!'}</span>`}
    </div>
    <div class="stat-pills equip-row-stats">${pills.slice(0, 3).map((p) => `<span class="spill">${esc(p)}</span>`).join('')}</div>
  </button>`;

const CONTRACT_ART = {
  'wildfiresat-l1': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <rect width="110" height="100" fill="#090b0f"/>
    <path d="M-10 74 Q55 38 120 74 L120 105 L-10 105 Z" fill="#141821" stroke="#f59e0b" stroke-width="1.2"/>
    <circle cx="42" cy="70" r="8" fill="#f59e0b" fill-opacity="0.25"/><circle cx="42" cy="70" r="3" fill="#fbbf24"/>
    <circle cx="71" cy="76" r="6" fill="#ef4444" fill-opacity="0.3"/><circle cx="71" cy="76" r="2.5" fill="#fbbf24"/>
    <path d="M10 34 Q56 14 100 38" fill="none" stroke="#9ca3af" stroke-width="1.2" stroke-dasharray="4 3"/>
    <rect x="52" y="19" width="10" height="6" rx="1" fill="#fbbf24"/>
  </svg>`,
  'aurora-l1': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <rect width="110" height="100" fill="#090b0f"/>
    <path d="M10 34 Q36 16 58 32 T100 26" fill="none" stroke="#10b981" stroke-width="3" stroke-opacity="0.65" stroke-linecap="round"/>
    <circle cx="55" cy="76" r="32" fill="#141821" stroke="#f59e0b" stroke-width="1.1"/>
    <path d="M26 52 Q55 24 84 52" fill="none" stroke="#9ca3af" stroke-width="1.2" stroke-dasharray="3 3"/>
    <rect x="50" y="21" width="10" height="6" rx="1" fill="#10b981"/>
  </svg>`,
  'ocean-l2': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <rect width="110" height="100" fill="#090b0f"/>
    <circle cx="55" cy="52" r="28" fill="#111827" stroke="#38bdf8" stroke-width="1.2"/>
    <ellipse cx="55" cy="52" rx="15" ry="39" transform="rotate(14 55 52)" fill="none" stroke="#9ca3af" stroke-width="1.2" stroke-dasharray="4 3"/>
    <rect x="54" y="10" width="10" height="6" rx="1" fill="#f3f4f6" stroke="#f59e0b" stroke-width="0.8"/>
  </svg>`,
  'monsoon-l2': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <rect width="110" height="100" fill="#090b0f"/>
    <circle cx="55" cy="58" r="27" fill="#141821" stroke="#f59e0b" stroke-width="1.2"/>
    <path d="M40 58 Q55 42 70 58 Q55 72 40 58 Z" fill="none" stroke="#d1d5db" stroke-width="1.8"/>
    <rect x="47" y="12" width="18" height="5" rx="1" fill="#f59e0b"/>
  </svg>`,
  'lunar-l3': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <rect width="110" height="100" fill="#090b0f"/>
    <circle cx="55" cy="50" r="27" fill="#272d38" stroke="#9ca3af" stroke-width="1"/>
    <ellipse cx="55" cy="73" rx="11" ry="4.5" fill="#111827" stroke="#38bdf8" stroke-width="1.2"/>
    <path d="M14 78 Q38 14 96 34" fill="none" stroke="#fbbf24" stroke-width="1.3" stroke-dasharray="4 3"/>
    <circle cx="84" cy="27" r="3" fill="#fbbf24"/>
  </svg>`,
  'asteroid-l3': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <rect width="110" height="100" fill="#090b0f"/>
    <polygon points="40,36 62,28 80,44 74,66 50,74 30,58" fill="#374151" stroke="#d1d5db" stroke-width="1.1"/>
    <path d="M14 76 Q46 18 96 30" fill="none" stroke="#f59e0b" stroke-width="1.3" stroke-dasharray="4 3"/>
    <rect x="26" y="33" width="9" height="6" rx="1" fill="#fbbf24"/>
  </svg>`
};

const CONTRACT_META = {
  'wildfiresat-l1': { title: 'Arctic Wildfire Watch', wave: 'IR', obj: 'Detect boreal fires from 575km SSO.' },
  'aurora-l1': { title: 'Aurora Magnetosphere', wave: 'MAG', obj: 'Sample polar geomagnetic storms.' },
  'ocean-l2': { title: 'Coastal Ocean Pulse', wave: 'LIDAR', obj: 'Map coastal reefs & aerosols.' },
  'monsoon-l2': { title: 'Monsoon Cyclone Eye', wave: 'SAR', obj: 'Pierce storm clouds with SAR radar.' },
  'lunar-l3': { title: 'Lunar South Pole', wave: 'CRYO', obj: 'Survey shadowed craters for ice.' },
  'asteroid-l3': { title: 'NEA Prospector', wave: 'ION', obj: 'Rendezvous with metallic NEAs.' }
};

export function renderTitleOverlay(sandboxMode, activeScenarioId, progressMap = {}) {
  document.getElementById('mode-campaign-btn').classList.toggle('active', !sandboxMode);
  document.getElementById('mode-sandbox-btn').classList.toggle('active', sandboxMode);
  const pill = document.getElementById('title-mode-pill');
  if (pill) {
    pill.textContent = sandboxMode ? 'SANDBOX FREEPLAY' : 'SIMULATION';
    pill.classList.toggle('sandbox', sandboxMode);
  }
  document.getElementById('contract-grid').innerHTML = SCENARIOS.map((s) => {
    const m = CONTRACT_META[s.id] || { title: s.name, wave: 'OBS', obj: trimWords(s.summary, 9) };
    const selected = s.id === activeScenarioId;
    const prog = progressMap[s.id];
    const diffStars = Math.max(1, Math.min(3, (s.stars || '').split('★').length - 1 || s.level || 1));
    const earnedStars = Math.max(1, Math.min(3, prog?.stars || 1));
    const statusBadge = prog?.status === 'completed'
      ? `<span class="contract-status-badge is-done">${svgStars(earnedStars, earnedStars)}</span>`
      : (prog?.status === 'in_progress'
        ? '<span class="contract-status-badge is-progress">ACTIVE</span>'
        : '<span class="contract-status-badge">NEW</span>');
    const budBadge = sandboxMode
      ? '<span class="spill ok">INF</span>'
      : `<span class="spill ok">$${s.budgetLimitM}M</span>`;
    return `
    <div class="contract-card ${selected ? 'selected' : ''}" data-start-scenario="${s.id}" role="button" tabindex="0">
      <div class="contract-art">${CONTRACT_ART[s.id] || ''}</div>
      <div class="contract-body">
        <div class="contract-top">
          <span class="contract-stars" aria-label="Difficulty ${diffStars} of 3">${svgStars(diffStars, 3)}</span>
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
          <span class="btn-sci contract-cta ${selected ? 'active' : ''}">DEPLOY</span>
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
    const lbl = t.id === 'inst' ? `Payload ${(state.instrumentIds || []).length}/${bus?.payloadSlots || 1}` : t.label;
    return `<button class="btn-sci sub-chip ${t.id === activeSub ? 'active' : ''}" data-sub="${t.id}" type="button">${lbl}</button>`;
  }).join('');

  let cards = [];
  if (activeSub === 'obj') cards = CATALOG.user.objectives.map((o) => cardHtml({ field: 'userObjective', id: o.id, name: o.name, selected: state.userObjective === o.id, ok: o.id === sc.targetObjective, pills: [o.band.toUpperCase()], tip: o.tip }));
  else if (activeSub === 'band') cards = CATALOG.user.wavelengths.map((w) => cardHtml({ field: 'wavelengthBand', id: w.id, name: w.name, selected: state.wavelengthBand === w.id, ok: w.id === sc.targetBand, pills: [w.id === sc.targetBand ? 'TARGET' : 'ALT'], tip: w.tip }));
  else if (activeSub === 'lat') cards = CATALOG.user.latencies.map((l) => cardHtml({ field: 'latencyTier', id: l.id, name: l.name, selected: state.latencyTier === l.id, ok: l.id === sc.targetLatency, pills: [l.id === sc.targetLatency ? 'OPTIMAL' : 'TRADE'], tip: l.tip }));
  else if (activeSub === 'bus') cards = CATALOG.space.buses.map((b) => cardHtml({ field: 'busId', id: b.id, name: b.name, selected: state.busId === b.id, ok: true, pills: [`$${b.costM}M`, `${b.payloadSlots} SLOT`, `${b.payloadCapKg}kg`], tip: b.tip }));
  else if (activeSub === 'inst') cards = CATALOG.space.instruments.map((i) => cardHtml({ field: 'instrumentIds', id: i.id, name: i.name, multi: true, selected: state.instrumentIds.includes(i.id), ok: instMatchesBand(i, state.wavelengthBand) && (!bus || i.classes.includes(bus.busClass)), pills: [`$${i.costM}M`, `${i.massKg}kg`, `${i.powerW}W`], tip: `${i.tip} (+${i.sci} Sci)` }));
  else if (activeSub === 'solar') cards = CATALOG.space.solarArrays.map((s) => cardHtml({ field: 'solarId', id: s.id, name: s.name, selected: state.solarId === s.id, ok: true, pills: [`$${s.costM}M`, `+${s.genW}W`, s.zeroEclipseLoss ? 'RTG' : `${s.massKg}kg`], tip: s.tip }));
  else if (activeSub === 'therm') cards = CATALOG.space.thermalAdcs.map((t) => cardHtml({ field: 'thermalId', id: t.id, name: t.name, selected: state.thermalId === t.id, ok: (state.wavelengthBand !== 'cryo-ir' || t.cryoCapable) && (!sc.requiresIon || t.ionDrive), pills: [`$${t.costM}M`, `${t.powerW}W`, t.ionDrive ? 'ION' : (t.cryoCapable ? 'CRYO' : `+${t.lifeBonus}yr`)], tip: t.tip }));
  else if (activeSub === 'skin') cards = CATALOG.space.hullSkins.map((k) => cardHtml({ field: 'hullSkinId', id: k.id, name: k.name, selected: (state.hullSkinId || 'gold-kapton') === k.id, ok: true, pills: ['FREE', k.colorHex.toUpperCase()], tip: k.tip }));
  else if (activeSub === 'veh') cards = CATALOG.launch.vehicles.map((v) => cardHtml({ field: 'vehicleId', id: v.id, name: v.name, selected: state.vehicleId === v.id, ok: true, pills: [`$${v.costM}M`, `${v.maxPayloadKg}kg`, v.deepSpaceCapable ? 'DEEP' : 'LEO'], tip: v.tip }));
  else if (activeSub === 'orbit') cards = CATALOG.launch.orbits.map((o) => cardHtml({ field: 'orbitId', id: o.id, name: o.name, selected: state.orbitId === o.id, ok: o.id === sc.targetOrbit, pills: [`e=${o.e}`, `${o.iDeg}°`, o.deepSpace ? 'DEEP' : 'LEO'], tip: o.tip }));
  else if (activeSub === 'tx') cards = CATALOG.ground.transceivers.map((t) => cardHtml({ field: 'transceiverId', id: t.id, name: t.name, selected: state.transceiverId === t.id, ok: true, pills: [`$${t.costM}M`, `${t.mbps}Mb`, t.deepSpace ? 'DEEP' : `${t.massKg}kg`], tip: t.tip }));
  else cards = CATALOG.ground.stations.map((g) => cardHtml({ field: 'stationId', id: g.id, name: g.name, selected: state.stationId === g.id, ok: true, pills: [`$${g.costM}M`, `${g.passMinDay}m/d`, g.deepSpace ? 'DSN' : 'POLAR'], tip: g.tip }));

  document.getElementById('equipment-strip').innerHTML = cards.join('');
}

function getGaugeRows(ev) {
  const c = ev?.constraints;
  if (!c) return [];
  const entries = [
    { key: 'BUD', icon: 'budget', c: c.budget },
    { key: 'MASS', icon: 'mass', c: c.mass },
    { key: 'PWR', icon: 'power', c: c.power },
    { key: 'DATA', icon: 'data', c: c.data },
    { key: 'LIFE', icon: 'lifetime', c: c.lifetime },
    { key: 'SCI', icon: 'science', c: c.science }
  ];
  return entries.map(({ key, icon, c: item }) => ({
    key,
    icon,
    title: item.title,
    val: item.displayText,
    isInf: Boolean(item.isSandbox),
    pct: item.fillPct,
    ok: Boolean(item.ok),
    warn: Boolean(item.ok && item.warnNearCap),
    reason: item.limitReason,
    orbitSideEffect: item.orbitSideEffect,
    fixTab: item.fixTab
  }));
}

export function renderHud(ev, stage, opts = {}) {
  const { metrics, mel, cmlLevel, warnings, scenario, sandboxMode, allPopulated } = ev;
  const run = opts.runSession || {};
  const unlocked = opts.unlockedStages || { hangar: true, launch: Boolean(allPopulated), orbit: false, review: false };
  const stageLabels = { hangar: '01 HANGAR', launch: '02 PAD', orbit: '03 ORBIT', review: '04 REVIEW' };
  const stageIcons = { hangar: 'hangar', launch: 'launchpad', orbit: 'orbit', review: 'debrief' };
  const lockReasons = {
    hangar: 'Mission Hangar',
    launch: unlocked.launch ? 'Launchpad' : 'Locked: Equip all 4 segments',
    orbit: unlocked.orbit ? 'Orbital Ops' : 'Locked: Complete launch',
    review: unlocked.review ? 'Mission Review' : 'Locked: Complete orbit objectives'
  };
  document.querySelectorAll('#stage-switcher .stage-btn').forEach((b) => {
    const s = b.dataset.stage;
    const ok = Boolean(unlocked[s]);
    const isBreadcrumb = s !== 'hangar';
    b.disabled = isBreadcrumb || !ok;
    b.classList.toggle('is-locked', !ok);
    b.classList.toggle('is-breadcrumb', isBreadcrumb);
    b.classList.toggle('active', s === stage);
    if (isBreadcrumb) b.setAttribute('tabindex', '-1');
    else b.removeAttribute('tabindex');
    b.title = lockReasons[s] || '';
    b.innerHTML = `${svgIcon(stageIcons[s])}<span class="stage-lbl">${stageLabels[s]}</span>`;
  });

  const slBtn = document.getElementById('save-load-btn');
  if (slBtn) slBtn.hidden = stage !== 'hangar';
  const contractsBtn = document.getElementById('reopen-title-btn');
  if (contractsBtn) {
    const allowSwitch = stage === 'hangar';
    contractsBtn.hidden = !allowSwitch;
    contractsBtn.disabled = !allowSwitch;
    contractsBtn.title = allowSwitch ? 'Switch Contract' : 'Locked during flight';
  }
  const quitBtn = document.getElementById('quit-mission-btn');
  if (quitBtn) quitBtn.hidden = stage === 'review';
  const expBtn = document.getElementById('export-json-btn');
  if (expBtn) expBtn.hidden = stage !== 'review';

  document.querySelectorAll('#cml-dots .cnode').forEach((el, idx) => {
    el.className = `cnode ${idx < cmlLevel ? (cmlLevel === 4 ? 'lit-max' : 'lit') : ''}`;
  });
  document.getElementById('cml-badge').textContent = `CML ${cmlLevel}`;
  document.getElementById('scenario-badge').textContent = `M${scenario.level}${sandboxMode ? ' · FREE' : ''}`;

  const banner = document.getElementById('comms-banner');
  if (banner) banner.hidden = true;
  const mProg = document.getElementById('mission-progress-bar');
  if (mProg) mProg.hidden = true;

  document.getElementById('resource-gauges').innerHTML = getGaugeRows(ev).map((g) => {
    const toneClass = g.ok ? (g.warn ? 'warn' : 'ok') : 'bad';
    const itemTone = g.ok ? (g.warn ? 'is-near-cap' : 'is-nominal') : 'is-violation';
    const valClass = [g.isInf ? 'is-inf' : '', g.ok ? 'is-ok' : 'is-bad'].filter(Boolean).join(' ');
    const sideHtml = !g.ok
      ? `<div class="gm-tip-debuff">${esc(g.orbitSideEffect)}</div><div class="gm-tip-fix">Fix: ${esc(g.fixTab)}</div>`
      : `<div class="gm-tip-ok">Nominal</div>`;
    return `<div class="gm-item ${itemTone}" tabindex="0" data-constraint="${g.key}" aria-label="${esc(`${g.title} ${g.val}: ${g.reason}`)}">
      <div class="gm-top"><span>${svgIcon(g.icon)}${g.key}</span><b class="${valClass}">${esc(g.val)}</b></div>
      <div class="gm-bar"><div class="gm-fill ${toneClass}" style="width:${g.pct}%"></div></div>
      <div class="gm-tooltip" role="tooltip">
        <div class="gm-tip-head"><span>${esc(g.title)}</span><b>${esc(g.val)}</b></div>
        <div class="gm-tip-reason">${esc(g.reason)}</div>
        ${sideHtml}
      </div>
    </div>`;
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
    cta.innerHTML = !allPopulated ? `${svgIcon('lock')}Equip Parts` : (hasRisks ? `${svgIcon('warning')}Launch Risks` : `${svgIcon('rocket')}Roll Out`);
    cta.title = !allPopulated ? 'Equip all 4 mission segments' : (hasRisks ? warnings.map((w) => w.text).join(' | ') : 'Roll out to launchpad');
  } else if (stage === 'launch') {
    const readyOrbit = Boolean(unlocked.orbit);
    cta.disabled = !readyOrbit;
    cta.innerHTML = readyOrbit ? `${svgIcon('orbit')}Orbit` : `${svgIcon('rocket')}Ascent...`;
    cta.title = readyOrbit ? 'Enter Orbit' : 'Complete ascent first';
  } else if (stage === 'orbit') {
    const canFinish = Boolean(run.orbitObjectivesMet);
    cta.disabled = !canFinish;
    cta.classList.toggle('is-ready', canFinish);
    cta.innerHTML = canFinish ? `${svgIcon('debrief')}Debrief` : `${svgIcon('orbit')}In Progress`;
    cta.title = canFinish ? 'Open Mission Review' : 'Complete orbit objectives first';
  } else {
    cta.disabled = false;
    cta.innerHTML = `${svgIcon('hangar')}Hangar`;
    cta.title = 'Return to Hangar';
  }

  document.getElementById('mel-summary-meta').textContent = sandboxMode
    ? `${mel.length} · ${metrics.mass.totalKg}kg`
    : `${mel.length} · $${metrics.budget.usedM}M`;
  document.getElementById('mel-body').innerHTML = `<table class="mel-table"><thead><tr><th>Seg</th><th>Part</th><th>kg</th><th>W</th><th>$M</th></tr></thead><tbody>`
    + mel.map((r) => `<tr><td>${esc(r.segment)}</td><td>${esc(r.item)}</td><td>${r.massKg}</td><td>${r.powerW}</td><td>$${r.costM}</td></tr>`).join('') + '</tbody></table>';
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
    hud.innerHTML = `<div class="stage-card plate cam-pill-card">
      <button id="vp-autorotate-btn" class="btn-sci ${opts.autoRotate ? 'is-on' : ''}" type="button" title="Toggle Auto-Rotate">
        ${svgIcon('rotate')}<span>Rotate</span>
      </button>
      <button id="vp-explode-btn" class="btn-sci ${opts.exploded ? 'is-on' : ''}" type="button" title="Explode View">
        ${svgIcon('explode')}<span>Explode</span>
      </button>
      <button id="vp-reset-btn" class="btn-sci" type="button" title="Reset View">
        ${svgIcon('target')}<span>Reset</span>
      </button>
    </div>`;
    actions.innerHTML = '';
    return;
  }

  const decBox = document.getElementById('decision-alert-hud');
  if (decBox && stage !== 'orbit') { decBox.hidden = true; decBox.innerHTML = ''; }

  if (stage === 'launch') {
    hud.innerHTML = `<div class="stage-card plate ascent-card">
      <div class="card-head">
        <span>ASCENT</span>
        <div class="ascent-head-right">
          <span id="launch-phase-pill" class="badge-tag">ARMED</span>
          <button id="lch-skip-btn" class="btn-sci active skip-launch-btn" data-action="skip-launch" type="button" title="Skip to Orbit [ESC]">${svgIcon('skip')}Skip</button>
        </div>
      </div>
      <div class="ascent-stats-grid">
        <div class="ascent-stat"><span>ALT</span><strong id="lch-alt-val" class="tabular">0 km</strong></div>
        <div class="ascent-stat"><span>VEL</span><strong id="lch-vel-val" class="tabular">0.00 km/s</strong></div>
      </div>
      <div class="ascent-prog-wrap">
        <div class="ascent-prog-track"><div id="lch-prog-fill" class="ascent-prog-fill" style="width:0%"></div></div>
        <span id="lch-prog-pct" class="tabular">0%</span>
      </div>
      <div id="launch-telem" class="telem-mono">HOLD · 0%</div>
      <div id="lch-callout" class="callout-tag">PAD ARMED</div>
      <div class="btn-row ascent-cam-row">
        <button class="btn-sci ${opts.launchCam === 'trench' ? 'is-on' : ''}" data-lcam="trench" type="button">Pad</button>
        <button class="btn-sci ${opts.launchCam === 'track' ? 'is-on' : ''}" data-lcam="track" type="button">Track</button>
        <button class="btn-sci ${opts.launchCam === 'hull' ? 'is-on' : ''}" data-lcam="hull" type="button">Hull</button>
        <button class="btn-sci ${opts.launchCam === 'free' ? 'is-on' : ''}" data-lcam="free" type="button">Free</button>
      </div>
    </div>`;
    actions.innerHTML = `<button id="lch-ignite-btn" class="action-prompt is-ignite cta-btn" type="button">${svgIcon('rocket')}IGNITE <span class="keycap">SPACE</span></button>`;
    return;
  }

  if (stage === 'orbit') {
    const testHazBtn = state.sandboxMode === true
      ? `<button id="orb-test-hazard-btn" class="btn-sci danger" type="button">${svgIcon('warning')}Hazard</button>`
      : '';
    const unfoldBtn = !opts.deployCompleted
      ? `<button id="orb-replay-unfold-btn" class="btn-sci" type="button" title="Unfold Arrays [U]">${svgIcon('spacecraft')}Unfold <span class="keycap">U</span></button>`
      : '';
    const debOk = Boolean(opts.orbitObjectivesMet);
    const bufPkts = opts.onboardBuffer || 0;
    const battInit = opts.batterySoc ?? 84;
    const wVal = Number(opts.orbitWarp ?? 1);
    const warpBtns = [
      { w: 0, html: svgIcon('pause'), label: 'Pause' },
      { w: 1, html: `${svgIcon('play')}1x`, label: '1x' },
      { w: 5, html: '5x', label: '5x' },
      { w: 20, html: '20x', label: '20x' },
      { w: 100, html: '100x', label: '100x' }
    ].map((b) => `<button class="btn-sci warp-btn ${wVal === b.w ? 'active is-on' : ''}" data-warp="${b.w}" type="button" title="Time Warp ${b.label}">${b.html}</button>`).join('');

    hud.innerHTML = `<div class="stage-card plate orbit-ops-card">
      <div class="card-head">
        <span>ORBIT OPS</span>
        <div class="orb-head-pills">
          <span id="orb-buffer-pill" class="badge-tag orb-buffer-pill ${bufPkts > 0 ? 'is-loaded' : 'is-empty'}">BUF ${bufPkts}</span>
          <span id="orb-score-pill" class="badge-tag">PTS ${opts.orbitScore || 0}</span>
        </div>
      </div>

      <div class="hull-meter-row">
        <div class="hull-meter-head"><span class="hull-meter-lbl">${svgIcon('hull')}HULL</span><span id="orb-hull-pct" class="tabular">${opts.hullIntegrity ?? 100}%</span></div>
        <div class="hull-meter-track"><div id="orb-hull-fill" class="hull-meter-fill" style="width:${opts.hullIntegrity ?? 100}%"></div></div>
        <div class="hull-meter-head"><span class="hull-meter-lbl">${svgIcon('battery')}BATT</span><span id="orb-batt-pct" class="tabular">${battInit}%</span></div>
        <div class="hull-meter-track"><div id="orb-batt-fill" class="hull-meter-fill" style="width:${battInit}%"></div></div>
      </div>

      <div class="orbit-clock-row">
        <div class="orbit-clock-cell"><span class="orbit-clock-lbl">MET</span><span id="orb-met-val" class="orbit-clock-val tabular">00:00:00</span></div>
        <div class="orbit-clock-cell"><span class="orbit-clock-lbl">UTC</span><span id="orb-utc-val" class="orbit-clock-val tabular">14:00:00</span></div>
      </div>

      <div id="orb-eclipse-badge" class="eclipse-badge" hidden>ECLIPSE · NO SOLAR</div>
      <div id="orbit-telem" class="telem-mono">Propagating orbit...</div>

      <div class="btn-row">
        <button class="btn-sci ${opts.orbitCam === 'chase' ? 'is-on' : ''}" data-cam="chase" type="button">Chase</button>
        <button class="btn-sci ${opts.orbitCam === 'full' ? 'is-on' : ''}" data-cam="full" type="button">Orbit</button>
        <button class="btn-sci ${opts.orbitCam === 'asteroid' ? 'is-on' : ''}" data-cam="asteroid" type="button">Belt</button>
        <button class="btn-sci ${opts.orbitCam === 'solar' ? 'is-on' : ''}" data-cam="solar" type="button">System</button>
      </div>

      <div class="btn-row">
        <button id="orb-sensorcam-btn" class="btn-sci ${opts.sensorCamOpen ? 'is-on' : ''}" type="button" title="Sensor Cam [C]">${svgIcon('camera')}Cam <span class="keycap">C</span></button>
        <button id="hud-mission-guide-btn" class="btn-sci" type="button">${svgIcon('help')}Guide</button>
        ${unfoldBtn}
        ${testHazBtn}
        <button id="orb-debrief-btn" class="btn-sci ${debOk ? 'active' : ''}" type="button" ${debOk ? '' : 'disabled title="Finish orbit tasks first"'}>${svgIcon(debOk ? 'debrief' : 'lock')}${debOk ? 'Debrief' : 'Locked'}</button>
      </div>
    </div>`;

    actions.innerHTML = `<div class="flight-deck-stack">
      <div class="flight-action-row">
        <button id="orb-scan-btn" class="action-prompt is-status-pill" type="button" hidden>${svgIcon('scan')}<span class="keycap">E</span> SCAN</button>
        <button id="orb-transmit-btn" class="action-prompt is-cyan cta-btn" type="button" hidden>${svgIcon('transmit')}<span class="keycap">SPC</span> DOWNLINK</button>
      </div>
      <div class="warp-pill-bar plate" role="group" aria-label="Time Warp">${warpBtns}</div>
    </div>`;
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
  const budgetPenalty = budgetOverrun
    ? Math.min(250, Math.round(opts.budgetOverrunPenalty != null && opts.budgetOverrunPenalty > 0 ? opts.budgetOverrunPenalty : 200))
    : 0;
  const engPts = metrics.scienceScore * 10 + (cmlLevel === 4 ? 250 : 0) + budgetEfficiency - budgetPenalty;
  const totalScore = Math.max(0, downlinkPts + anomalyPts + scanPts + decisionPts + engPts);

  let starCount = (cmlLevel === 4 || sandboxMode) && metrics.scienceScore >= 85 && (oScore >= 50 || resolvedCount > 0)
    ? 3
    : (cmlLevel >= 3 ? 2 : 1);
  if (budgetOverrun) starCount = Math.min(2, starCount);
  const rankMeta = starCount === 3 && totalScore >= 1350
    ? { label: 'S-RANK // FLIGHT DIRECTOR', cls: 'rank-s', tip: '' }
    : starCount === 3
      ? { label: 'A-RANK // COMMANDER', cls: 'rank-a', tip: '' }
      : starCount === 2
        ? { label: 'B-RANK // ENGINEER', cls: 'rank-b', tip: budgetOverrun ? 'Budget overrun capped max rating at 2 stars.' : 'Reach CML 4 & >=85% Science for 3 stars.' }
        : { label: 'MISSION AT RISK', cls: 'rank-risk', tip: 'Resolve Hangar warnings and complete orbit downlink for 3 stars.' };

  const busObj = CATALOG.space.buses.find((b) => b.id === state.busId);
  const bandObj = CATALOG.user.wavelengths.find((w) => w.id === state.wavelengthBand);
  const ribbons = [];
  if (hullFinal >= 100) ribbons.push('100% Hull');
  if (resolvedCount >= 1) ribbons.push('Crisis Responder');
  if (!sandboxMode && metrics.budget.usedM <= metrics.budget.limitM * 0.9) ribbons.push('Under Budget');
  if (asteroidsScanned >= 1) ribbons.push('Deep Scanner');
  if (downlinkCount >= 1) ribbons.push('Downlink Lock');
  if (metrics.powerMargin >= 10 && (state.solarId === 'rtg-nuclear' || state.solarId === 'high-eff-gimbal' || (opts.batterySoc ?? 84) >= 50)) {
    ribbons.push('Eclipse Survivor');
  }
  if (!ribbons.length) ribbons.push('Concept Architect');

  const starSvg = (lit, idx) => `<svg class="debrief-star ${lit ? 'lit' : 'unlit'}" data-star-idx="${idx}" viewBox="0 0 64 64" aria-hidden="true">
    <polygon points="32,4 40.5,22 60,24.5 45.5,38 49.2,58 32,48.2 14.8,58 18.5,38 4,24.5 23.5,22" />
  </svg>`;

  const confettiHtml = starCount === 3
    ? `<div class="debrief-confetti" aria-hidden="true">${Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * 360;
        const dist = 60 + (i % 4) * 26;
        const col = i % 2 === 0 ? '#fbbf24' : '#10b981';
        return `<span class="confetti-bit" style="--tx:${Math.cos(angle * Math.PI / 180) * dist}px;--ty:${Math.sin(angle * Math.PI / 180) * dist - 12}px;--rot:${(i * 47) % 360}deg;--col:${col};--delay:${(i % 5) * 45}ms"></span>`;
      }).join('')}</div>`
    : '';

  if (rev.dataset.rendered === '1') return;
  rev.dataset.rendered = '1';
  cancelDebriefAnim();

  rev.innerHTML = `<div class="debrief-showcase plate">
    <div class="debrief-topbar">
      <div class="debrief-brand">
        <span class="debrief-kicker">MISSION DEBRIEF</span>
        <h2 class="debrief-title">${esc(scenario.name)}</h2>
        <div class="debrief-sub">${esc(orbitElements.name)} · Hull ${hullFinal}% · ${resolvedCount} Resolved</div>
      </div>
      <button id="rev-close-btn" class="btn-sci debrief-close-btn" type="button">${svgIcon('close')}Close <span class="keycap">ESC</span></button>
    </div>

    <div class="debrief-hero-band">
      <div class="debrief-stars-wrap">
        <div class="debrief-stars-row">${starSvg(starCount >= 1, 0)}${starSvg(starCount >= 2, 1)}${starSvg(starCount >= 3, 2)}</div>
        ${confettiHtml}
      </div>
      <div id="debrief-rank-crest" class="rank-crest ${rankMeta.cls}">${esc(rankMeta.label)}</div>
      <div class="debrief-total-pill">
        <span class="debrief-total-lbl">SCORE</span>
        <span id="debrief-total-num" class="debrief-total-num tabular">0</span>
      </div>
    </div>
    ${rankMeta.tip ? `<div class="debrief-risk-tip">${esc(rankMeta.tip)}</div>` : ''}

    <div class="debrief-main-grid">
      <section class="debrief-panel">
        <div class="debrief-sec-head">BREAKDOWN</div>
        <div class="score-rows">
          <div class="score-row"><span>Downlinks</span><strong>+${downlinkPts}</strong></div>
          <div class="score-row"><span>Hazards</span><strong>+${anomalyPts}</strong></div>
          <div class="score-row"><span>Science Scans</span><strong>+${scanPts}</strong></div>
          ${decisionPts ? `<div class="score-row"><span>Command</span><strong>${decisionPts >= 0 ? `+${decisionPts}` : decisionPts}</strong></div>` : ''}
          <div class="score-row"><span>Engineering</span><strong>+${metrics.scienceScore * 10 + (cmlLevel === 4 ? 250 : 0) + budgetEfficiency}</strong></div>
          ${budgetPenalty ? `<div class="score-row is-penalty"><span>Over-Budget</span><strong>-${budgetPenalty}</strong></div>` : ''}
        </div>
        <div class="debrief-sec-head" style="margin-top:6px">HONORS</div>
        <div class="ribbons-shelf">${ribbons.map((label) => `<span class="medal-chip">${esc(label)}</span>`).join('')}</div>
      </section>

      <section class="holo-card" id="debrief-holo-card">
        <div class="holo-glint" aria-hidden="true"></div>
        <div class="holo-head">ARCHIVE · ${esc(missionMatch.tag || 'ORBITER')}</div>
        <div class="holo-name">${esc(missionMatch.name)}</div>
        <p class="holo-detail">${esc(trimWords(missionMatch.detail, 18))}</p>
        <div class="holo-pills">
          <span class="holo-pill">Orbit: ${esc(orbitElements.name.split('(')[0].trim())}</span>
          <span class="holo-pill">Band: ${esc(bandObj?.name || state.wavelengthBand)}</span>
          <span class="holo-pill">Bus: ${esc(busObj?.name || state.busId)}</span>
        </div>
        <div class="holo-telemetry-mini">
          <span>Bud ${sandboxMode ? 'INF' : `$${metrics.budget.usedM}M`}</span>
          <span>Pwr ${metrics.powerMargin}%</span>
          <span>Sci ${metrics.scienceScore}%</span>
        </div>
      </section>
    </div>

    <div class="debrief-footer-nav">
      <button id="rev-menu-btn" class="btn-sci debrief-cta" type="button">${svgIcon('home')}Main Menu</button>
      <button id="rev-export-btn" class="btn-sci debrief-cta" type="button">${svgIcon('export')}Export JSON</button>
      <button id="rev-next-btn" class="btn-sci debrief-cta cta-btn is-primary" type="button">${svgIcon('rocket')}Next Mission</button>
    </div>
  </div>`;

  for (let i = 0; i < 3; i += 1) {
    const tId = setTimeout(() => {
      const starEl = rev.querySelector(`[data-star-idx="${i}"]`);
      if (starEl) starEl.classList.add('is-slammed');
      if (i < starCount) playStarChime(i);
    }, 140 + i * 240);
    debriefTimers.push(tId);
  }

  const stampId = setTimeout(() => {
    rev.querySelector('.debrief-confetti')?.classList.add('is-bursting');
    document.getElementById('debrief-rank-crest')?.classList.add('is-stamped');
    playRankStamp();
  }, 760);
  debriefTimers.push(stampId);

  const scoreEl = document.getElementById('debrief-total-num');
  const startMs = performance.now();
  const durMs = 850;
  const tickScore = (nowMs) => {
    const p = Math.min(1, (nowMs - startMs) / durMs);
    const eased = 1 - ((1 - p) ** 3);
    if (scoreEl) scoreEl.textContent = String(Math.round(totalScore * eased));
    if (p < 1) debriefRaf = requestAnimationFrame(tickScore);
    else debriefRaf = 0;
  };
  debriefRaf = requestAnimationFrame(tickScore);
}

export function updateLaunchOverlay(t) {
  document.getElementById('launch-phase-pill')?.replaceChildren(document.createTextNode(t.phase));
  document.getElementById('lch-callout')?.replaceChildren(document.createTextNode(t.callout));
  document.getElementById('lch-alt-val')?.replaceChildren(document.createTextNode(`${t.altitudeKm} km`));
  document.getElementById('lch-vel-val')?.replaceChildren(document.createTextNode(`${t.velocityKms} km/s`));
  const pf = document.getElementById('lch-prog-fill'); if (pf) pf.style.width = `${t.progressPct}%`;
  document.getElementById('lch-prog-pct')?.replaceChildren(document.createTextNode(`${t.progressPct}%`));
  const d = document.getElementById('launch-telem'); if (d) d.textContent = `${t.countdownLabel} · ${t.progressPct}%`;
  const ign = document.getElementById('lch-ignite-btn'); if (ign) ign.hidden = !t.armed;
}

export function updateOrbitOverlay(t, objStatus = null) {
  const destroyed = Boolean(t?.isDestroyed || (t?.hullIntegrity ?? 100) <= 0);
  const d = document.getElementById('orbit-telem');
  if (d && t) {
    if (destroyed) {
      d.textContent = 'HULL 0% — LOST';
    } else {
      const flags = [];
      if ((t.solarPausedSec || 0) > 0) flags.push(`SOLAR OFF ${t.solarPausedRealSec}s`);
      if ((t.commsPausedSec || 0) > 0) flags.push(`DL OFF ${t.commsPausedSec}s`);
      if (t.sensorCalibrating) flags.push(`RE-CAL ${t.sensorCalibratingSec}s`);
      if (t.brownoutLocked) flags.push('BROWNOUT');
      const flagStr = flags.length ? ` · ${flags[0]}` : '';
      d.textContent = `${t.altitudeKm}km · ${t.speedKms}km/s · ${t.stormActive ? 'FLARE' : (t.inEclipse ? 'ECLIPSE' : 'SUNLIT')}${flagStr}`;
    }
  }
  document.getElementById('orb-score-pill')?.replaceChildren(document.createTextNode(`PTS ${t?.missionScore ?? 0}`));
  document.querySelectorAll('[data-warp]').forEach((b) => {
    const on = Number(b.dataset.warp) === Number(t?.timeWarp);
    b.classList.toggle('is-on', on);
    b.classList.toggle('active', on);
  });

  const hull = destroyed ? 0 : Math.max(0, Math.min(100, t?.hullIntegrity ?? 100));
  const hullBarW = destroyed ? 0 : Math.max(0, Math.min(100, t?.hullExact ?? hull));
  const hullPct = document.getElementById('orb-hull-pct'); if (hullPct) hullPct.textContent = `${hull}%`;
  const hullFill = document.getElementById('orb-hull-fill');
  if (hullFill) {
    hullFill.style.width = `${hullBarW.toFixed(2)}%`;
    hullFill.style.background = hull >= 70 ? '#10b981' : (hull >= 40 ? '#f59e0b' : '#ef4444');
  }
  const batt = destroyed ? 0 : Math.max(0, Math.min(100, t?.batterySoc ?? 84));
  const battBarW = destroyed ? 0 : Math.max(0, Math.min(100, t?.batterySocExact ?? batt));
  const battPct = document.getElementById('orb-batt-pct'); if (battPct) battPct.textContent = `${batt}%`;
  const battFill = document.getElementById('orb-batt-fill');
  if (battFill) {
    battFill.style.width = `${battBarW.toFixed(2)}%`;
    battFill.style.background = t?.brownoutLocked || batt < 15 ? '#ef4444' : (batt < 40 ? '#f59e0b' : '#fbbf24');
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
        const shortDesc = trimWords(haz.detail, 12);
        hazBox.innerHTML = `<div class="hazard-head">
            <div class="hazard-title-wrap">
              <span class="hazard-kicker">${svgIcon('warning')} ANOMALY</span>
              <span class="hazard-title">${esc(stripEmoji(haz.title))}</span>
            </div>
            <span id="hazard-timer-pill" class="hazard-timer-pill">${haz.remainingSec.toFixed(1)}s</span>
          </div>
          <div class="hazard-desc">${esc(shortDesc)}</div>
          <div class="hazard-bar-track"><div id="hazard-bar-fill" class="hazard-bar-fill" style="width:${haz.pct}%"></div></div>
          <div class="hazard-choices">
            ${(haz.choices || []).map((c) => {
              const primaryBadge = c.badges && c.badges.length ? c.badges[0] : null;
              const impactTag = c.lowBattWarn
                ? `<span class="haz-badge is-bad">${svgIcon('battery')} ${esc(stripEmoji(c.lowBattText || 'LOW BATT'))}</span>`
                : (primaryBadge ? `<span class="haz-badge is-${esc(primaryBadge.cls || 'warn')}">${esc(stripEmoji(primaryBadge.text))}</span>` : '');
              return `<button class="hazard-choice-btn tone-${esc(c.tone || 'amber')}${c.lowBattWarn ? ' has-lowbatt' : ''}" data-choice-idx="${c.index}" type="button">
                <div class="hazard-choice-top">
                  <span class="hazard-keycap keycap">${esc(c.key)}</span>
                  <span class="hazard-choice-label">${esc(stripEmoji(c.label))}</span>
                </div>
                ${impactTag ? `<div class="hazard-badges">${impactTag}</div>` : ''}
              </button>`;
            }).join('')}
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
        const headText = stripEmoji(b?.title || (typeof hs.resolvedBanner === 'string' ? hs.resolvedBanner : 'NOMINAL'));
        const badgeText = stripEmoji(b?.badge || (b?.scoreDelta != null ? `${b.scoreDelta >= 0 ? '+' : ''}${b.scoreDelta}` : (isTimeout ? '-26% HULL' : '+40')));
        const descText = trimWords(b?.detail || (isTimeout ? 'Response timed out before mitigation.' : 'Anomaly protocol confirmed.'), 12);
        const pillStyle = isTimeout
          ? 'background:rgba(239,68,68,0.22);border-color:#ef4444;color:#fecaca'
          : 'background:rgba(16,185,129,0.22);border-color:#10b981;color:#d1fae5';
        hazBox.innerHTML = `<div class="hazard-head" style="color:${isTimeout ? '#fecaca' : '#6ee7b7'}"><span>${svgIcon(isTimeout ? 'explode' : 'check')} ${esc(headText)}</span><span class="hazard-timer-pill" style="${pillStyle}">${esc(badgeText)}</span></div>
          <div class="hazard-desc">${esc(descText)}</div>`;
      }
    } else {
      hazBox.hidden = true;
      hazBox.dataset.renderKey = '';
    }
  }

  document.getElementById('orb-met-val')?.replaceChildren(document.createTextNode((t?.metText || 'T+ 00:00:00').replace(/^T\+\s*/, '')));
  document.getElementById('orb-utc-val')?.replaceChildren(document.createTextNode((t?.utcText || '2026-11-15 14:00:00').split(' ')[1] || '14:00:00'));
  const eclBadge = document.getElementById('orb-eclipse-badge');
  if (eclBadge) eclBadge.hidden = !t?.inEclipse;
  const bufPill = document.getElementById('orb-buffer-pill');
  const bufPkts = t?.onboardBuffer ?? 0;
  if (bufPill) {
    bufPill.textContent = `BUF ${bufPkts}`;
    bufPill.classList.toggle('is-loaded', bufPkts > 0);
    bufPill.classList.toggle('is-empty', bufPkts <= 0);
  }

  const tx = document.getElementById('orb-transmit-btn');
  if (tx) {
    const dlPaused = (t?.commsPausedSec || 0) > 0;
    const dlCooling = (t?.downlinkCooldownSec || 0) > 0 || Boolean(t?.stationPassCooldownActive);
    const hasLinkLock = !destroyed && Boolean(t?.inLineOfSight);
    const readyToTx = hasLinkLock && !t?.brownoutLocked && !dlPaused && !dlCooling && (bufPkts >= 1 || Boolean(t?.tutorialActive));
    const showTxPill = readyToTx || (hasLinkLock && (bufPkts >= 1 || Boolean(t?.brownoutLocked) || dlPaused));
    tx.hidden = !showTxPill;
    tx.disabled = Boolean(destroyed || t?.brownoutLocked || dlPaused);
    tx.classList.remove('cta-btn', 'is-cooldown', 'is-standby', 'is-cyan', 'is-status-pill');
    if (t?.brownoutLocked) {
      tx.innerHTML = `${svgIcon('warning')} BROWNOUT &lt;15%`;
    } else if (dlPaused) {
      tx.innerHTML = `${svgIcon('pause')} DL PAUSED ${t.commsPausedSec}s`;
    } else if (dlCooling) {
      tx.innerHTML = `${svgIcon('transmit')} COOLDOWN ${t.downlinkCooldownSec || 1}s`;
      tx.classList.add('is-status-pill');
    } else if (readyToTx) {
      let pts = 50;
      const weakComms = Boolean(t?.activeDebuffs?.dataBottleneck?.active);
      if (weakComms) pts = Math.round(pts * 0.5);
      if ((t?.omniReducedDownlinks || 0) > 0) pts = Math.round(pts * 0.7);
      tx.classList.add('is-cyan', 'cta-btn');
      tx.innerHTML = `${svgIcon('transmit')} <span class="keycap">SPC</span> DOWNLINK +${pts}`;
    }
  }

  const scanBtn = document.getElementById('orb-scan-btn');
  if (scanBtn) {
    scanBtn.disabled = destroyed || Boolean(t?.brownoutLocked) || Boolean(t?.sensorCalibrating);
    scanBtn.classList.remove('cta-btn', 'is-swath-ready', 'is-cooldown', 'is-standby', 'is-cyan', 'is-status-pill');
    if (destroyed) {
      scanBtn.hidden = true;
    } else if (t?.sensorCalibrating) {
      scanBtn.hidden = false;
      scanBtn.innerHTML = `${svgIcon('rotate')} RE-CAL ${t.sensorCalibratingSec || 1}s`;
      scanBtn.classList.add('is-status-pill');
    } else if (t?.swathReady) {
      scanBtn.hidden = false;
      const basePts = t.swathZonePoints || 60;
      const sciBad = Boolean(t?.activeDebuffs?.scienceMismatch?.active);
      const scanPts = sciBad ? Math.round(basePts * 0.6) : basePts;
      scanBtn.innerHTML = `${svgIcon('scan')} <span class="keycap">E</span> SCAN +${scanPts}`;
      scanBtn.classList.add('is-swath-ready', 'cta-btn');
    } else if ((t?.swathCooldownSec || 0) > 0) {
      scanBtn.hidden = false;
      scanBtn.innerHTML = `${svgIcon('target')} ZONE ${t.swathCooldownSec}s`;
      scanBtn.classList.add('is-status-pill');
    } else if (t?.nextZoneName) {
      scanBtn.hidden = false;
      const degPart = typeof t.nextZoneDeg === 'number' && t.nextZoneDeg > 0 ? `${t.nextZoneDeg}°` : '~';
      scanBtn.innerHTML = `${svgIcon('target')} GATE ${degPart}`;
      scanBtn.classList.add('is-status-pill');
    } else {
      scanBtn.hidden = true;
    }
  }

  const unfoldBtn = document.getElementById('orb-replay-unfold-btn');
  if (unfoldBtn) {
    unfoldBtn.hidden = destroyed || (!t?.deployActive && (t?.deployProgress || 0) >= 0.99);
  }
  const debBtn = document.getElementById('orb-debrief-btn');
  const dlDone = !destroyed && (objStatus ? Boolean(objStatus.canDebrief) : (t?.downlinkCount || 0) >= 1);
  if (debBtn) {
    debBtn.disabled = !dlDone;
    debBtn.classList.toggle('active', dlDone);
    debBtn.classList.toggle('cta-btn', dlDone);
    debBtn.innerHTML = dlDone
      ? `${svgIcon('check')} Debrief`
      : `${svgIcon('goal')} ${objStatus ? `${objStatus.completedCount}/${objStatus.totalCount}` : `${Math.min(t?.downlinkCount || 0, 1)}/1`}`;
  }
  const db = document.getElementById('orbit-deploy-banner');
  if (db) {
    const active = Boolean(t?.deployActive && !t?.briefingPaused);
    db.hidden = !active;
    if (active) {
      const pct = Math.round((t.deployProgress || 0) * 100);
      db.textContent = `DEPLOYING ARRAYS ${pct}%`;
    }
  }
}

export const renderResourcesList = () => {
  document.getElementById('resources-list').innerHTML = OFFICIAL_RESOURCES.map((r) => `<li><span><strong>[${r.agency}]</strong> ${esc(r.title)}</span><a href="${r.url}" target="_blank" rel="noopener noreferrer">Open</a></li>`).join('');
};

export function renderSavedModal(savedList, currentEval) {
  document.getElementById('saved-designs-list').innerHTML = savedList.length ? savedList.map((d, idx) => `<div class="saved-row"><span><strong>${esc(d.name)}</strong> · CML ${d.cmlLevel} · $${d.budgetM}M · Sci ${d.scienceScore}</span><span><button class="btn-sci" data-load-idx="${idx}" type="button">Load</button> <button class="btn-sci" data-cmp-idx="${idx}" type="button">Diff</button> <button class="btn-sci" data-del-idx="${idx}" type="button">Del</button></span></div>`).join('') : '<p style="color:var(--muted)">No saved designs.</p>';
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
  const startLabel = stage === 'orbit' ? 'Start' : 'Close';

  el.innerHTML = `<div class="briefing-card plate" role="dialog" aria-modal="true" aria-labelledby="brief-title-heading">
    <div class="brief-topbar">
      <div class="brief-head-copy">
        <span class="brief-kicker">${svgIcon('orbit')} ORBIT BRIEFING</span>
        <h2 id="brief-title-heading" class="brief-title">${esc(stripEmoji(guide.headline))}</h2>
        <div class="brief-sub">${esc(stripEmoji(ev.orbitElements.name))} · ${esc(ev.metrics.mass.totalKg)} kg</div>
      </div>
      <button id="brief-close-btn" class="brief-close-btn" type="button" title="Close [ESC]" aria-label="Close">${svgIcon('close')}</button>
    </div>

    <section class="brief-story">
      <p class="brief-about">${esc(trimWords(guide.about, 12))}</p>
    </section>

    <div class="brief-tasks">
      ${guide.tasks.map((t, idx) => `<div class="brief-task-card">
        <span class="brief-step-num">0${idx + 1}</span>
        <div class="brief-task-copy">
          <strong>${esc(stripEmoji(t.title))}</strong>
          <p>${esc(trimWords(t.text, 10))}</p>
        </div>
      </div>`).join('')}
    </div>

    <div class="brief-keybinds" aria-label="Controls">
      <span><span class="keycap">E</span> Scan</span>
      <span><span class="keycap">SPC</span> Downlink</span>
      <span><span class="keycap">1-3</span> Hazard</span>
      <span><span class="keycap">U</span> Unfold</span>
    </div>

    <div class="brief-actions">
      <button id="brief-start-btn" class="brief-start-btn cta-btn" type="button">${svgIcon('play')} ${startLabel} <span class="keycap">SPACE</span></button>
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
  card.style.setProperty('--holo-accent', data.accent || '#f59e0b');

  card.innerHTML = `<div class="holo-scan-head">
    <div class="holo-scan-title-wrap">
      <div>
        <div class="holo-scan-kicker">${svgIcon('target')} SCANNER</div>
        <h3 class="holo-scan-name">${esc(stripEmoji(data.name))}</h3>
      </div>
    </div>
    <button id="holo-close-btn" class="holo-scan-close" type="button" aria-label="Close">${svgIcon('close')}</button>
  </div>

  <div class="holo-scan-class-row">
    <span class="holo-class-pill">${esc(stripEmoji(data.classification))}</span>
    <span class="holo-dist-pill">${esc(data.stats.distanceAU)}</span>
  </div>

  <div class="holo-stats-grid">
    <div class="holo-stat-cell"><span>GRAVITY</span><strong>${esc(data.stats.gravity)}</strong></div>
    <div class="holo-stat-cell"><span>PERIOD</span><strong>${esc(data.stats.orbitalPeriod)}</strong></div>
  </div>

  <p class="holo-scan-fact">${esc(trimWords(data.scienceFact, 16))}</p>

  <div class="holo-scan-actions">
    <button id="holo-zoom-btn" class="btn-sci ${focusedHoloId === data.id ? 'is-on' : ''}" type="button">${svgIcon('camera')} Zoom</button>
    <button id="holo-return-btn" class="btn-sci" type="button">${svgIcon('spacecraft')} Satellite</button>
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
  const budgetPenalty = budgetOverrun
    ? Math.min(250, Math.round(opts.budgetOverrunPenalty != null && opts.budgetOverrunPenalty > 0 ? opts.budgetOverrunPenalty : 200))
    : 0;
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
        <span>${svgIcon('warning')} ${esc(stripEmoji(decision.title))}</span>
        <span id="decision-timer-pill" class="decision-timer">${decision.remainingSec.toFixed(1)}s</span>
      </div>
      <div class="decision-desc">${esc(trimWords(decision.prompt, 12))}</div>
      <div class="decision-actions">
        <button id="dec-opt-risky" class="btn-sci decision-btn is-risky" type="button">
          <span>${esc(stripEmoji(decision.risky.label))}</span>
          <small>${esc(stripEmoji(decision.risky.deltaText))}</small>
        </button>
        <button id="dec-opt-safe" class="btn-sci decision-btn is-safe" type="button">
          <span>${esc(stripEmoji(decision.safe.label))}</span>
          <small>${esc(stripEmoji(decision.safe.deltaText))}</small>
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
  const rawDebuffs = evaluation ? [...getOrbitActiveDebuffs(evaluation, telemetry, state)] : [];
  const debuffs = rawDebuffs.map((d) => ({
    ...d,
    shortTag: d.id === 'mass' ? 'DRAG'
      : (d.id === 'power' ? 'PWR'
        : (d.id === 'life' ? 'RAD'
          : (d.id === 'comms' ? 'LOSS'
            : (d.id === 'band' ? 'SCI' : 'BUD')))),
    shortRate: stripEmoji(d.effect).split('&')[0].replace(/\s*\([^)]*x\)/g, '').trim()
  }));

  const warpNum = telemetry?.timeWarp ?? 1;
  if ((telemetry?.solarPausedSec || 0) > 0) {
    debuffs.push({
      id: 'temp-solar',
      shortTag: 'SOLAR OFF',
      shortRate: `${telemetry.solarPausedRealSec ?? telemetry.solarPausedSec}s`,
      title: `Solar Paused (${telemetry.solarPausedSec}s @ ${warpNum}x)`,
      effect: 'Charging Halted',
      firing: true
    });
  }
  if ((telemetry?.commsPausedSec || 0) > 0) {
    debuffs.push({
      id: 'temp-comms',
      shortTag: 'DL OFF',
      shortRate: `${telemetry.commsPausedSec}s`,
      title: 'Comms Paused',
      effect: `Locked @ ${warpNum}x`,
      firing: true
    });
  }
  if (telemetry?.sensorCalibrating) {
    debuffs.push({
      id: 'temp-recal',
      shortTag: 'RE-CAL',
      shortRate: `${telemetry.sensorCalibratingSec}s`,
      title: 'Sensor Re-calibrating',
      effect: 'Drift recovery',
      firing: true
    });
  }
  if (telemetry?.brownoutLocked) {
    debuffs.push({
      id: 'temp-brownout',
      shortTag: 'BROWNOUT',
      shortRate: `${telemetry.batterySoc ?? 0}%`,
      title: 'Power Brownout (<15%)',
      effect: 'Payloads shed until 15%',
      firing: true
    });
  }

  const debuffSig = debuffs.map((d) => `${d.id}:${d.firing ? 1 : 0}:${d.shortRate}`).join('|');
  const debuffsHtml = debuffs.length
    ? `<div class="orb-debuffs-list">${debuffs.map((d) => `
        <div class="orb-debuff-pill ${d.firing ? 'is-firing' : ''}" data-tip="${esc(`${stripEmoji(d.title)}: ${stripEmoji(d.effect)}`)}" title="${esc(`${stripEmoji(d.title)}: ${stripEmoji(d.effect)}`)}">
          <span class="orb-debuff-tag">${esc(d.shortTag)}</span>
          <span class="orb-debuff-rate tabular">${esc(d.shortRate)}</span>
        </div>`).join('')}</div>`
    : '<div class="orb-debuff-nominal">NOMINAL</div>';

  const sig = `${status.scenarioId}|${status.isSandbox ? 1 : 0}|${collapsed ? 1 : 0}|${status.isDestroyed ? 1 : 0}|${status.completedCount}|${status.canDebrief ? 1 : 0}|${status.tasks.map((t) => `${t.progressText}:${t.complete ? 1 : 0}`).join('|')}`;
  if (box.dataset.renderKey === sig) {
    const debBox = document.getElementById('orb-debuffs-sec');
    if (debBox && debBox.dataset.debuffKey !== debuffSig) {
      debBox.dataset.debuffKey = debuffSig;
      debBox.innerHTML = `<div class="orb-debuffs-head">DEBUFFS</div>${debuffsHtml}`;
    }
    return status;
  }
  box.dataset.renderKey = sig;

  box.innerHTML = `<div class="orb-obj-head">
      <div class="orb-obj-head-top">
        <span class="orb-obj-kicker">${svgIcon('goal')} OBJECTIVES</span>
        <div class="orb-obj-head-right">
          <span class="orb-obj-count ${status.canDebrief ? 'is-done' : ''}">${status.completedCount}/${status.totalCount}</span>
          <button id="orb-obj-collapse-btn" class="orb-obj-collapse" type="button" aria-expanded="${collapsed ? 'false' : 'true'}" title="${collapsed ? 'Expand' : 'Collapse'}">${svgIcon(collapsed ? 'chevron-right' : 'chevron-down')}</button>
        </div>
      </div>
    </div>
    <div class="orb-obj-track"><div class="orb-obj-fill" style="width:${status.pct}%"></div></div>
    <div class="orb-obj-body">
      <ul class="orb-obj-list">
        ${status.tasks.map((t, idx) => `
          <li class="orb-obj-item ${t.complete ? 'is-complete' : (t.isWarning ? 'is-risk' : 'is-pending')}">
            <span class="orb-obj-check">${t.complete ? svgIcon('check') : `0${idx + 1}`}</span>
            <span class="orb-obj-label">${esc(stripEmoji(t.title).replace(/\(\[.*?\]\s*\/\s*Auto\)|\(\[.*?\]\)/g, '').trim())}</span>
            <span class="orb-obj-val tabular">${esc(stripEmoji(t.progressText))}</span>
          </li>`).join('')}
      </ul>
      <div id="orb-debuffs-sec" class="orb-debuffs-sec" data-debuff-key="${esc(debuffSig)}">
        <div class="orb-debuffs-head">DEBUFFS</div>
        ${debuffsHtml}
      </div>
      <button id="orb-obj-debrief-btn" class="orb-obj-footer-btn ${status.canDebrief ? 'is-unlocked cta-btn' : ''}" type="button" ${status.canDebrief ? '' : 'disabled'}>
        ${status.isDestroyed ? `${svgIcon('explode')} VEHICLE LOST` : (status.canDebrief ? `${svgIcon('check')} Finish & Review` : `${svgIcon('lock')} Incomplete`)}
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
  const scName = ev?.scenario?.name || 'Mission';
  const key = `${scName}|${reason}|${debuffs.map((d) => d.id).join(',')}`;
  el.hidden = false;
  if (el.dataset.key === key) return;
  el.dataset.key = key;

  const causeText = stripEmoji(reason || 'Hull Integrity Failure');
  const debuffNote = debuffs.length
    ? `<div class="loss-debuffs"><strong>Debuffs:</strong> ${debuffs.map((d) => esc(stripEmoji(d.title))).join(' · ')}</div>`
    : '';

  el.innerHTML = `<div class="loss-card plate" role="alertdialog" aria-modal="true" aria-labelledby="loss-title">
      <div class="loss-kicker">${svgIcon('explode')} TELEMETRY LOST // STAGE 03</div>
      <h2 id="loss-title" class="loss-title">VEHICLE LOST (0% HULL)</h2>
      <div class="loss-cause-box"><span>CAUSE</span><strong>${esc(causeText)}</strong></div>
      ${debuffNote}
      <div class="loss-actions">
        <button id="loss-hangar-btn" class="loss-btn is-fix" type="button">${svgIcon('hangar')} Hangar</button>
        <button id="loss-retry-btn" class="loss-btn is-retry cta-btn" type="button">${svgIcon('restart')} Retry</button>
        <button id="loss-menu-btn" class="loss-btn is-menu" type="button">${svgIcon('home')} Main Menu</button>
      </div>
    </div>`;
}

export function renderQuitConfirmModal(open, scenarioName = 'Active Mission') {
  const el = document.getElementById('quit-modal-overlay');
  if (!el) return;
  if (!open) {
    el.hidden = true;
    el.dataset.key = '';
    el.innerHTML = '';
    return;
  }
  const name = scenarioName || 'Active Mission';
  el.hidden = false;
  if (el.dataset.key === name && el.innerHTML) return;
  el.dataset.key = name;
  el.innerHTML = `<div class="quit-modal-card plate" role="alertdialog" aria-modal="true" aria-labelledby="quit-modal-title">
      <div class="quit-kicker">${svgIcon('warning')} MISSION CONTROL</div>
      <h2 id="quit-modal-title" class="quit-title">QUIT MISSION?</h2>
      <p class="quit-sub">Unsaved flight progress on <strong>${esc(stripEmoji(name))}</strong> will reset.</p>
      <div class="quit-actions">
        <button id="quit-resume-btn" class="quit-btn is-resume cta-btn" type="button">${svgIcon('play')} Resume</button>
        <button id="quit-hangar-btn" class="quit-btn is-hangar" type="button">${svgIcon('restart')} Restart</button>
        <button id="quit-menu-btn" class="quit-btn is-danger danger" type="button">${svgIcon('quit')} Main Menu</button>
      </div>
    </div>`;
}
