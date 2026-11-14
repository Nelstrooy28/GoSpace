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

export function renderTitleOverlay(sandboxMode, activeScenarioId) {
  document.getElementById('mode-campaign-btn').classList.toggle('active', !sandboxMode);
  document.getElementById('mode-sandbox-btn').classList.toggle('active', sandboxMode);
  document.getElementById('contract-grid').innerHTML = SCENARIOS.map((s) => `
    <div class="contract-card">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center"><span class="contract-stars">${s.stars}</span><span class="badge-tag">${esc(s.badge)}</span></div>
        <h3 style="margin:6px 0 4px;font-size:13.5px">${esc(s.name)}</h3>
        <p style="margin:0;font-size:11px;color:var(--muted);line-height:1.35">${esc(s.summary)}</p>
      </div>
      <div>
        <div class="stat-pills" style="margin-bottom:7px"><span class="spill">${esc(s.orbitIcon)}</span><span class="spill ok">CAP $${s.budgetLimitM}M</span><span class="spill">${s.minLifetimeYr}YR+</span></div>
        <button class="btn-sci ${s.id === activeScenarioId ? 'active' : ''}" style="width:100%" data-start-scenario="${s.id}" type="button">LAUNCH CONTRACT ›</button>
      </div>
    </div>`).join('');
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
      <div><h2 style="margin:0">${esc(scenario.name)}</h2><div style="color:var(--muted);font-size:11.5px">${esc(orbitElements.name)} · Orbit Bonus +${oScore} pts</div></div>
      <div class="stars-reveal">${'★'.repeat(starCount)}${'☆'.repeat(3 - starCount)}</div>
    </div>
    <div class="collectible-card"><span style="font-size:26px">🏆</span><div><div class="badge-tag" style="display:inline-block;margin-bottom:3px">REAL-WORLD SPACECRAFT MATCH · ${esc(missionMatch.tag || 'SPACECRAFT')}</div>
      <div style="font-weight:700">${esc(missionMatch.name)}</div><div style="font-size:11px;color:var(--muted)">${esc(missionMatch.detail)}</div></div></div>
    <div style="font-family:var(--font-hud);font-size:10px;color:var(--cyan);margin-top:8px">MISSION DESIGN TELEMETRY</div>
    <div class="vp-grid" style="margin:6px 0 10px">${getGaugeRows(ev).map((g) => `<div class="vp-stat"><div style="font-size:10px;color:var(--muted)">${g.label}</div><div style="font-family:var(--font-hud);font-size:13px">${esc(g.val)}</div></div>`).join('')}</div>
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
