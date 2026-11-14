import { CATALOG, OFFICIAL_RESOURCES, SCENARIOS } from './catalog.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const SUB_TABS = {
  user: [{ id: 'obj', label: 'Objective' }, { id: 'band', label: 'Band' }, { id: 'lat', label: 'Latency' }],
  space: [{ id: 'bus', label: 'Bus' }, { id: 'inst', label: 'Payload' }, { id: 'solar', label: 'Solar' }, { id: 'batt', label: 'Battery' }, { id: 'therm', label: 'Thermal' }],
  launch: [{ id: 'veh', label: 'Rocket' }, { id: 'orbit', label: 'Orbit' }],
  ground: [{ id: 'tx', label: 'Transceiver' }, { id: 'gs', label: 'Station' }]
};

const cardHtml = ({ field, id, icon, name, pills, selected, ok = true, multi = false, tip = '' }) => `
  <button class="equip-card ${selected ? 'selected' : ''} ${ok ? '' : 'compat-bad'}" type="button"
    data-field="${field}" data-id="${id}" data-multi="${multi ? '1' : '0'}" data-tip="${esc(tip)}">
    <div class="equip-head"><span>${icon} ${esc(name)}</span><span class="spill ${ok ? 'ok' : 'bad'}">${selected ? 'ON' : (ok ? 'FIT' : '!')}</span></div>
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
  'ocean-l2': `<svg viewBox="0 0 110 100" aria-hidden="true">
    <defs><radialGradient id="g-oc" cx="38%" cy="38%" r="60%"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="55%" stop-color="#0369a1"/><stop offset="100%" stop-color="#082f49"/></radialGradient></defs>
    <rect width="110" height="100" fill="#040a18"/>
    <circle cx="55" cy="52" r="30" fill="url(#g-oc)" stroke="#38bdf8" stroke-width="1.2"/>
    <path d="M34 48 Q52 40 68 55 T82 44" fill="none" stroke="#34d399" stroke-width="3" stroke-opacity="0.55" stroke-linecap="round"/>
    <ellipse cx="55" cy="52" rx="16" ry="41" transform="rotate(14 55 52)" fill="none" stroke="#7dd3fc" stroke-width="1.3" stroke-dasharray="4 3"/>
    <polygon points="59,13 43,54 71,58" fill="#38bdf8" fill-opacity="0.24"/>
    <rect x="54" y="10" width="10" height="6" rx="1.5" fill="#e2e8f0" stroke="#38bdf8" stroke-width="0.8"/>
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
};

const CONTRACT_META = {
  'wildfiresat-l1': { title: 'Operation Wildfire Watch', wave: 'THERMAL IR', lv: '300kg LV', obj: 'Detect Pacific Rim wildfire hotspots from 550km LEO.' },
  'ocean-l2': { title: 'Operation Ocean Pulse', wave: 'UV-VISIBLE', lv: '950kg LV', obj: 'Map global phytoplankton & polar ocean health in SSO.' },
  'lunar-l3': { title: 'Operation Lunar Icebreaker', wave: 'CRYO MID-IR', lv: '4500kg LV', obj: 'Survey shadowed Lunar South Pole craters for water ice.' },
};

export function renderTitleOverlay(sandboxMode, activeScenarioId) {
  document.getElementById('mode-campaign-btn').classList.toggle('active', !sandboxMode);
  document.getElementById('mode-sandbox-btn').classList.toggle('active', sandboxMode);
  const pill = document.getElementById('title-mode-pill');
  if (pill) {
    pill.textContent = sandboxMode ? 'SANDBOX FREEPLAY · ALL SYSTEMS UNLOCKED' : 'CAMPAIGN MODE · ENGINEERED CONTRACTS';
    pill.classList.toggle('sandbox', sandboxMode);
  }
  document.getElementById('contract-grid').innerHTML = SCENARIOS.map((s) => {
    const m = CONTRACT_META[s.id] || { title: s.name, wave: s.orbitIcon, lv: 'LV READY', obj: s.summary };
    const selected = s.id === activeScenarioId;
    return `
    <div class="contract-card ${selected ? 'selected' : ''}" data-start-scenario="${s.id}" role="button" tabindex="0">
      <div class="contract-art">${CONTRACT_ART[s.id] || ''}</div>
      <div class="contract-body">
        <div class="contract-top">
          <span class="contract-stars">${s.stars}</span>
          <span class="badge-tag">${esc(m.wave)}</span>
        </div>
        <h3 class="contract-title">${esc(m.title)}</h3>
        <p class="contract-obj">${esc(m.obj)}</p>
        <div class="contract-footer">
          <div class="stat-pills">
            <span class="spill">${esc(m.lv)}</span>
            <span class="spill ok">$${s.budgetLimitM}M</span>
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
  document.getElementById('sub-pills').innerHTML = tabs.map((t) => `<button class="btn-sci sub-chip ${t.id === activeSub ? 'active' : ''}" data-sub="${t.id}" type="button">${t.label}</button>`).join('');

  let cards = [];
  if (activeSub === 'obj') cards = CATALOG.user.objectives.map((o) => cardHtml({ field: 'userObjective', id: o.id, icon: '🎯', name: o.name, selected: state.userObjective === o.id, ok: o.id === sc.targetObjective, pills: [o.band.toUpperCase()], tip: o.tip }));
  else if (activeSub === 'band') cards = CATALOG.user.wavelengths.map((w) => cardHtml({ field: 'wavelengthBand', id: w.id, icon: '🌈', name: w.name, selected: state.wavelengthBand === w.id, ok: w.id === sc.targetBand, pills: [w.id === sc.targetBand ? 'TARGET BAND' : 'ALT BAND'], tip: w.tip }));
  else if (activeSub === 'lat') cards = CATALOG.user.latencies.map((l) => cardHtml({ field: 'latencyTier', id: l.id, icon: '⏱️', name: l.name, selected: state.latencyTier === l.id, ok: l.id === sc.targetLatency, pills: [l.id === sc.targetLatency ? 'OPTIMAL' : 'TRADE'], tip: l.tip }));
  else if (activeSub === 'bus') cards = CATALOG.space.buses.map((b) => cardHtml({ field: 'busId', id: b.id, icon: '🛰️', name: b.name, selected: state.busId === b.id, ok: true, pills: [`$${b.costM}M`, `${b.massKg}kg`, `Cap ${b.payloadCapKg}kg`], tip: b.tip }));
  else if (activeSub === 'inst') cards = CATALOG.space.instruments.map((i) => cardHtml({ field: 'instrumentIds', id: i.id, icon: '🔭', name: i.name, multi: true, selected: state.instrumentIds.includes(i.id), ok: i.band === state.wavelengthBand && (!bus || i.classes.includes(bus.busClass)), pills: [`$${i.costM}M`, `${i.massKg}kg`, `+${i.sci} Sci`], tip: i.tip }));
  else if (activeSub === 'solar') cards = CATALOG.space.solarArrays.map((s) => cardHtml({ field: 'solarId', id: s.id, icon: '☀️', name: s.name, selected: state.solarId === s.id, ok: true, pills: [`$${s.costM}M`, `${s.genW}W`, `${s.massKg}kg`], tip: s.tip }));
  else if (activeSub === 'batt') cards = CATALOG.space.batteries.map((b) => cardHtml({ field: 'batteryId', id: b.id, icon: '🔋', name: b.name, selected: state.batteryId === b.id, ok: true, pills: [`$${b.costM}M`, `${b.wh}Wh`, `+${b.lifeBonus}yr`], tip: b.tip }));
  else if (activeSub === 'therm') cards = CATALOG.space.thermalAdcs.map((t) => cardHtml({ field: 'thermalId', id: t.id, icon: '❄️', name: t.name, selected: state.thermalId === t.id, ok: state.wavelengthBand !== 'cryo-ir' || t.cryoCapable, pills: [`$${t.costM}M`, `${t.powerW}W`, t.cryoCapable ? 'CRYO' : 'STD'], tip: t.tip }));
  else if (activeSub === 'veh') cards = CATALOG.launch.vehicles.map((v) => cardHtml({ field: 'vehicleId', id: v.id, icon: '🚀', name: v.name, selected: state.vehicleId === v.id, ok: true, pills: [`$${v.costM}M`, `Max ${v.maxPayloadKg}kg`, v.deepSpaceCapable ? 'HEAVY' : 'LEO'], tip: v.tip }));
  else if (activeSub === 'orbit') cards = CATALOG.launch.orbits.map((o) => cardHtml({ field: 'orbitId', id: o.id, icon: '🛸', name: o.name, selected: state.orbitId === o.id, ok: o.id === sc.targetOrbit, pills: [`e=${o.e}`, `i=${o.iDeg}°`, o.deepSpace ? 'DEEP' : 'LEO'], tip: o.tip }));
  else if (activeSub === 'tx') cards = CATALOG.ground.transceivers.map((t) => cardHtml({ field: 'transceiverId', id: t.id, icon: '📡', name: t.name, selected: state.transceiverId === t.id, ok: true, pills: [`$${t.costM}M`, `${t.mbps}Mbps`, `${t.massKg}kg`], tip: t.tip }));
  else cards = CATALOG.ground.stations.map((g) => cardHtml({ field: 'stationId', id: g.id, icon: '🏔️', name: g.name, selected: state.stationId === g.id, ok: true, pills: [`$${g.costM}M`, `${g.passMinDay}m/d`, g.deepSpace ? 'DSN' : 'POLAR'], tip: g.tip }));

  document.getElementById('equipment-strip').innerHTML = cards.join('');
}

function getGaugeRows(ev) {
  const { metrics, scenario, sandboxMode } = ev;
  return [
    { key: 'BUD', label: 'Budget', val: `$${metrics.budget.usedM}/${metrics.budget.limitM}M`, pct: Math.min(100, metrics.budget.pct), ok: sandboxMode || metrics.budget.usedM <= metrics.budget.limitM },
    { key: 'MASS', label: 'Mass', val: `${metrics.mass.totalKg}/${metrics.mass.launchLimitKg}kg`, pct: Math.min(100, (metrics.mass.totalKg / Math.max(metrics.mass.launchLimitKg, 1)) * 100), ok: sandboxMode || metrics.mass.totalKg <= metrics.mass.launchLimitKg },
    { key: 'PWR', label: 'Power', val: `${metrics.powerMargin}%`, pct: Math.max(0, Math.min(100, metrics.powerMargin + 30)), ok: metrics.powerMargin >= 5 },
    { key: 'DATA', label: 'Data', val: `${metrics.dataMargin}%`, pct: Math.max(0, Math.min(100, metrics.dataMargin + 25)), ok: metrics.dataMargin >= 5 },
    { key: 'LIFE', label: 'Life', val: `${metrics.lifetimeYears}/${scenario.minLifetimeYr}yr`, pct: Math.min(100, (metrics.lifetimeYears / scenario.minLifetimeYr) * 100), ok: metrics.lifetimeYears >= scenario.minLifetimeYr },
    { key: 'SCI', label: 'Science', val: `${metrics.scienceScore}%`, pct: metrics.scienceScore, ok: metrics.scienceScore >= scenario.minScience }
  ];
}

export function renderHud(ev, stage) {
  const { metrics, mel, cmlLevel, warnings, scenario, sandboxMode } = ev;
  document.querySelectorAll('#cml-dots .cnode').forEach((el, idx) => {
    el.className = `cnode ${idx < cmlLevel ? (cmlLevel === 4 ? 'lit-max' : 'lit') : ''}`;
  });
  document.getElementById('cml-badge').textContent = `CML ${cmlLevel} · ${cmlLevel === 4 ? 'FLIGHT READY' : (cmlLevel === 3 ? 'TRADE STUDY' : 'CONCEPT')}`;
  document.getElementById('scenario-badge').textContent = `L${scenario.level}${sandboxMode ? ' · FREEPLAY' : ''}`;

  const banner = document.getElementById('comms-banner');
  banner.classList.toggle('ok', warnings.length === 0);
  document.getElementById('comms-text').textContent = warnings.length ? `CHIEF ENG: ${warnings[0].text}` : 'CHIEF ENG: All 4 segments green — cleared for pad rollout!';

  document.getElementById('resource-gauges').innerHTML = getGaugeRows(ev).map((g) => {
    const lit = Math.max(1, Math.round((g.pct / 100) * 5));
    const cells = [0, 1, 2, 3, 4].map((i) => `<span class="seg-cell ${i < lit ? (g.ok ? 'on-ok' : 'on-bad') : ''}"></span>`).join('');
    return `<div class="gm-item"><div class="gm-top"><span>${g.key}</span><b>${esc(g.val)}</b></div><div class="seg-meter">${cells}</div></div>`;
  }).join('');

  const cta = document.getElementById('launch-cta-btn');
  cta.classList.toggle('is-ready', stage === 'hangar' && (cmlLevel === 4 || sandboxMode));
  cta.textContent = stage === 'hangar' ? '🚀 ROLL OUT TO PAD' : (stage === 'launch' ? 'SKIP TO ORBIT >>' : (stage === 'orbit' ? '🏁 COMPLETE MISSION' : '🔄 HANGAR'));

  document.getElementById('mel-summary-meta').textContent = `${mel.length} · ${metrics.mass.totalKg}kg · $${metrics.budget.usedM}M`;
  document.getElementById('mel-body').innerHTML = `<table class="mel-table"><thead><tr><th>Seg</th><th>Item</th><th>Mass</th><th>Pwr</th><th>Cost</th></tr></thead><tbody>`
    + mel.map((r) => `<tr><td>${esc(r.segment)}</td><td>${esc(r.item)}</td><td>${r.massKg}kg</td><td>${r.powerW}W</td><td>$${r.costM}M</td></tr>`).join('') + '</tbody></table>';
}

export function renderStageHud(stage, state, ev, opts) {
  const hud = document.getElementById('stage-hud'), actions = document.getElementById('center-action-hud');
  const rev = document.getElementById('review-overlay'), loadout = document.getElementById('hangar-loadout');
  loadout.hidden = stage !== 'hangar'; rev.hidden = stage !== 'review';

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
      </div></div>`;
    actions.innerHTML = ''; return;
  }
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
        <button id="lch-skip-btn" class="btn-sci active" type="button">Skip &gt;&gt;</button>
      </div></div>`;
    actions.innerHTML = `<button id="lch-ignite-btn" class="action-prompt" type="button">🔥 PRESS [SPACE] OR CLICK TO IGNITE</button>`;
    return;
  }
  if (stage === 'orbit') {
    hud.innerHTML = `<div class="stage-card plate">
      <div class="card-head"><span>ORBITAL OPS</span><span id="orb-score-pill" class="badge-tag">SCORE ${opts.orbitScore || 0}</span></div>
      <div class="btn-row">
        <button class="btn-sci ${opts.orbitCam === 'chase' ? 'is-on' : ''}" data-cam="chase" type="button">🛰️ Chase Sat</button>
        <button class="btn-sci ${opts.orbitCam === 'full' ? 'is-on' : ''}" data-cam="full" type="button">🌍 Full Orbit</button>
        <button class="btn-sci ${opts.orbitCam === 'asteroid' ? 'is-on' : ''}" data-cam="asteroid" type="button">☄️ Asteroid &amp; Comet</button>
        <button class="btn-sci ${opts.orbitCam === 'solar' ? 'is-on' : ''}" data-cam="solar" type="button">🌌 Full Solar System</button>
      </div>
      <div class="btn-row">
        <button class="btn-sci ${opts.orbitWarp === 1 ? 'is-on' : ''}" data-warp="1" type="button">1x</button>
        <button class="btn-sci ${opts.orbitWarp === 25 ? 'is-on' : ''}" data-warp="25" type="button">25x</button>
        <button class="btn-sci ${opts.orbitWarp === 100 ? 'is-on' : ''}" data-warp="100" type="button">100x</button>
        <button class="btn-sci ${opts.orbitWarp === 0 ? 'is-on' : ''}" data-warp="0" type="button">Pause</button>
        <button id="orb-storm-btn" class="btn-sci" type="button">⚡ Flare</button>
      </div>
      <div id="orbit-telem" class="telem-mono">Propagating Keplerian track...</div></div>`;
    actions.innerHTML = `<button id="orb-transmit-btn" class="action-prompt is-cyan" type="button" hidden>📡 [SPACE] TRANSMIT SCIENCE (+50)</button>
      <button id="orb-scan-btn" class="action-prompt is-cyan" type="button">☄️ [E] SCAN ASTEROID (+60)</button>
      <button id="orb-safemode-btn" class="action-prompt" type="button" hidden>🛡️ [Q] CYCLE POWER / SAFE MODE</button>`;
    return;
  }
  hud.innerHTML = ''; actions.innerHTML = '';
  const { scenario, orbitElements, metrics, missionMatch, cmlLevel, sandboxMode } = ev;
  const oScore = opts.orbitScore || 0, totalScore = metrics.scienceScore * 10 + oScore + (cmlLevel === 4 ? 250 : 0);
  const starCount = (cmlLevel === 4 || sandboxMode) && metrics.scienceScore >= 85 && oScore >= 50 ? 3 : (cmlLevel >= 3 ? 2 : 1);
  const rank = starCount === 3 ? 'FLIGHT DIRECTOR' : (starCount === 2 ? 'SENIOR ENGINEER' : 'CADET');
  rev.innerHTML = `<div class="vp-card plate">
    <div class="card-head"><span>FLIGHT READINESS DEBRIEF</span><span class="badge-tag">${rank} · ${totalScore} PTS</span></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0">
      <div><h2 style="margin:0;font-size:20px">${esc(scenario.name)}</h2><div style="color:var(--muted);font-size:14px">${esc(orbitElements.name)} · Orbit Bonus +${oScore} pts</div></div>
      <div class="stars-reveal">${'★'.repeat(starCount)}${'☆'.repeat(3 - starCount)}</div>
    </div>
    <div class="collectible-card"><span style="font-size:28px">🏆</span><div><div class="badge-tag" style="display:inline-block;margin-bottom:4px">REAL-WORLD SPACECRAFT MATCH · ${esc(missionMatch.tag || 'SPACECRAFT')}</div>
      <div style="font-weight:700;font-size:16px">${esc(missionMatch.name)}</div><div style="font-size:14px;color:var(--muted)">${esc(missionMatch.detail)}</div></div></div>
    <div style="font-family:var(--font-hud);font-size:14px;color:var(--cyan);margin-top:10px">MISSION DESIGN TELEMETRY</div>
    <div class="vp-grid" style="margin:6px 0 12px">${getGaugeRows(ev).map((g) => `<div class="vp-stat"><div style="font-size:13.5px;color:var(--muted)">${g.label}</div><div style="font-family:var(--font-hud);font-size:16px">${esc(g.val)}</div></div>`).join('')}</div>
    <div class="btn-row"><button id="rev-next-btn" class="btn-sci active" type="button">🔄 Play Next Mission</button><button id="rev-back-btn" class="btn-sci" type="button">🛠️ Tweak Build</button><button id="rev-export-btn" class="btn-sci" type="button">📥 Export 3D Trajectory JSON</button><button id="rev-save-btn" class="btn-sci" type="button">💾 Save</button></div></div>`;
}

export function updateLaunchOverlay(t) {
  document.getElementById('launch-phase-pill')?.replaceChildren(document.createTextNode(t.phase));
  document.getElementById('lch-callout')?.replaceChildren(document.createTextNode(t.callout));
  const d = document.getElementById('launch-telem'); if (d) d.textContent = `${t.countdownLabel} · ${t.altitudeKm} km · ${t.velocityKms} km/s · ${t.progressPct}%`;
  const ring = document.getElementById('lch-ring-fg'); if (ring) ring.style.strokeDashoffset = String((188.5 * (1 - Math.min(1, t.velocityKms / 7.8))).toFixed(1));
  const ign = document.getElementById('lch-ignite-btn'); if (ign) ign.hidden = !t.armed;
}

export function updateOrbitOverlay(t) {
  const d = document.getElementById('orbit-telem');
  if (d && t) d.textContent = `ALT ${t.altitudeKm}km · ${t.speedKms}km/s · ${t.stormActive ? 'SOLAR FLARE!' : (t.inEclipse ? 'ECLIPSE' : 'SUNLIT')} | BATT ${t.batterySoc}% · ${t.nearestNeaId || 'NEA'}`;
  document.getElementById('orb-score-pill')?.replaceChildren(document.createTextNode(`SCORE ${t.missionScore}`));
  document.getElementById('orb-storm-btn')?.classList.toggle('is-on', Boolean(t?.stormActive));
  const tx = document.getElementById('orb-transmit-btn'); if (tx) tx.hidden = !t?.inLineOfSight;
  const sm = document.getElementById('orb-safemode-btn'); if (sm) sm.hidden = !(t?.inEclipse || t?.stormActive) || Boolean(t?.safeModeActive);
}

export const renderResourcesList = () => { document.getElementById('resources-list').innerHTML = OFFICIAL_RESOURCES.map((r) => `<li><span><strong>[${r.agency}]</strong> ${esc(r.title)}</span><a href="${r.url}" target="_blank" rel="noopener noreferrer">Open</a></li>`).join(''); };
export function renderSavedModal(savedList, currentEval) {
  document.getElementById('saved-designs-list').innerHTML = savedList.length ? savedList.map((d, idx) => `<div class="saved-row"><span><strong>${esc(d.name)}</strong> · CML ${d.cmlLevel} · $${d.budgetM}M · Sci ${d.scienceScore}</span><span><button class="btn-sci" data-load-idx="${idx}" type="button">Load</button> <button class="btn-sci" data-cmp-idx="${idx}" type="button">Cmp</button> <button class="btn-sci" data-del-idx="${idx}" type="button">Del</button></span></div>`).join('') : '<p style="color:var(--muted)">No saved designs yet.</p>';
  document.getElementById('compare-box').innerHTML = `<strong>Active:</strong> CML ${currentEval.cmlLevel} · $${currentEval.metrics.budget.usedM}M · ${currentEval.metrics.mass.totalKg} kg · Sci ${currentEval.metrics.scienceScore}/100`;
}
