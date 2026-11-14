import { CATALOG, OFFICIAL_RESOURCES } from './catalog.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function optionBtn({ field, id, label, meta, selected, badgeText, badgeKind, tip, multi }) {
  const badge = badgeText ? `<span class="badge badge-${badgeKind || 'ok'}">${esc(badgeText)}</span>` : '';
  return `<button class="opt-btn ${selected ? 'selected' : ''}" type="button" data-field="${field}" data-id="${id}" data-multi="${multi ? '1' : '0'}" title="${esc(tip)}">
    <span><strong>${esc(label)}</strong><span class="opt-meta">${esc(meta)}</span></span>${badge}
  </button>`;
}

const card = (title, tip, html) => `<div class="field-card"><div class="field-title">${esc(title)}</div><div class="field-tip">${esc(tip)}</div><div class="option-list">${html}</div></div>`;

export function renderSegmentPanel(segment, state, evaluation) {
  const sc = evaluation.scenario;
  const bus = CATALOG.space.buses.find((b) => b.id === state.busId);
  if (segment === 'user') {
    return card('Science Objective', 'What Earth or Lunar science question your mission answers.', CATALOG.user.objectives.map((o) => optionBtn({ field: 'userObjective', id: o.id, label: o.name, meta: `Band: ${o.band.toUpperCase()}`, selected: state.userObjective === o.id, tip: o.tip, badgeText: o.id === sc.targetObjective ? 'Fit' : 'Alt', badgeKind: o.id === sc.targetObjective ? 'ok' : 'warn' })).join(''))
      + card('Wavelength Band (Webb Rule)', 'Instruments must match the selected spectral band.', CATALOG.user.wavelengths.map((w) => optionBtn({ field: 'wavelengthBand', id: w.id, label: w.name, meta: w.tip, selected: state.wavelengthBand === w.id, tip: w.tip, badgeText: w.id === sc.targetBand ? 'Target' : 'Mismatch', badgeKind: w.id === sc.targetBand ? 'ok' : 'bad' })).join(''))
      + card('Data Latency & Users', 'Ground pass cadence required by end users.', CATALOG.user.latencies.map((l) => optionBtn({ field: 'latencyTier', id: l.id, label: l.name, meta: l.tip, selected: state.latencyTier === l.id, tip: l.tip, badgeText: l.id === sc.targetLatency ? 'Optimal' : 'Trade', badgeKind: l.id === sc.targetLatency ? 'ok' : 'warn' })).join(''));
  }
  if (segment === 'space') {
    return card('Spacecraft Bus (CubeSat 101 / MDL)', 'Chassis mass, power, and payload capacity.', CATALOG.space.buses.map((b) => optionBtn({ field: 'busId', id: b.id, label: b.name, meta: `${b.massKg} kg · Cap ${b.payloadCapKg} kg · $${b.costM}M`, selected: state.busId === b.id, tip: b.tip, badgeText: b.busClass.toUpperCase(), badgeKind: 'ok' })).join(''))
      + card('Science Instruments', 'Multi-select sensors matching band & bus.', CATALOG.space.instruments.map((i) => {
        const ok = i.band === state.wavelengthBand && (!bus || i.classes.includes(bus.busClass));
        const badgeText = ok ? 'OK' : (!bus || i.classes.includes(bus.busClass) ? 'Band' : 'Bus!');
        return optionBtn({ field: 'instrumentIds', id: i.id, label: i.name, multi: true, meta: `${i.band.toUpperCase()} · ${i.massKg} kg · ${i.powerW} W · $${i.costM}M`, selected: state.instrumentIds.includes(i.id), tip: i.tip, badgeText, badgeKind: ok ? 'ok' : 'bad' });
      }).join(''))
      + card('Solar Arrays', 'Power generation across orbital eclipse.', CATALOG.space.solarArrays.map((s) => optionBtn({ field: 'solarId', id: s.id, label: s.name, meta: `${s.genW} W · ${s.massKg} kg · $${s.costM}M`, selected: state.solarId === s.id, tip: s.tip })).join(''))
      + card('Battery Pack', 'Energy storage for eclipse & downlinks.', CATALOG.space.batteries.map((b) => optionBtn({ field: 'batteryId', id: b.id, label: b.name, meta: `${b.wh} Wh · +${b.lifeBonus} yr · $${b.costM}M`, selected: state.batteryId === b.id, tip: b.tip })).join(''))
      + card('Thermal & ADCS', 'Pointing precision & cryocooling.', CATALOG.space.thermalAdcs.map((t) => optionBtn({ field: 'thermalId', id: t.id, label: t.name, meta: `${t.massKg} kg · ${t.powerW} W · $${t.costM}M`, selected: state.thermalId === t.id, tip: t.tip, badgeText: t.cryoCapable ? 'Cryo' : 'Std', badgeKind: t.cryoCapable ? 'ok' : 'warn' })).join(''));
  }
  if (segment === 'launch') {
    return card('Launch Vehicle', 'Sets rocket model & mass-to-orbit limit.', CATALOG.launch.vehicles.map((v) => optionBtn({ field: 'vehicleId', id: v.id, label: v.name, meta: `Max ${v.maxPayloadKg} kg · $${v.costM}M`, selected: state.vehicleId === v.id, tip: v.tip, badgeText: v.deepSpaceCapable ? 'Heavy' : 'LEO', badgeKind: 'ok' })).join(''))
      + card('Target Keplerian Orbit', 'Propagated in 3D via NASA Mission Viz.', CATALOG.launch.orbits.map((o) => optionBtn({ field: 'orbitId', id: o.id, label: o.name, meta: `a=${o.aKm} km · e=${o.e} · i=${o.iDeg}°`, selected: state.orbitId === o.id, tip: o.tip, badgeText: o.id === sc.targetOrbit ? 'Target' : 'Alt', badgeKind: o.id === sc.targetOrbit ? 'ok' : 'warn' })).join(''));
  }
  return card('Onboard Transceiver', 'RF/Optical downlink rate vs science volume.', CATALOG.ground.transceivers.map((t) => optionBtn({ field: 'transceiverId', id: t.id, label: t.name, meta: `${t.mbps} Mbps · ${t.massKg} kg · $${t.costM}M`, selected: state.transceiverId === t.id, tip: t.tip, badgeText: t.deepSpace ? 'Deep' : 'LEO', badgeKind: 'ok' })).join(''))
    + card('Ground Station Network', 'Antennas & pass minutes for downlinks.', CATALOG.ground.stations.map((g) => optionBtn({ field: 'stationId', id: g.id, label: g.name, meta: `${g.passMinDay} min/day · $${g.costM}M`, selected: state.stationId === g.id, tip: g.tip, badgeText: g.deepSpace ? 'DSN' : 'Fast', badgeKind: 'ok' })).join(''));
}

function getGaugeRows(evaluation) {
  const { metrics, scenario, sandboxMode } = evaluation;
  return [
    { label: 'Budget', val: `$${metrics.budget.usedM}/${metrics.budget.limitM}M`, pct: Math.min(100, metrics.budget.pct), ok: sandboxMode || metrics.budget.usedM <= metrics.budget.limitM },
    { label: 'Mass', val: `${metrics.mass.totalKg}/${metrics.mass.launchLimitKg}kg`, pct: Math.min(100, Math.round((metrics.mass.totalKg / Math.max(metrics.mass.launchLimitKg, 1)) * 100)), ok: sandboxMode || metrics.mass.totalKg <= metrics.mass.launchLimitKg },
    { label: 'Power', val: `${metrics.powerMargin}%`, pct: Math.max(0, Math.min(100, metrics.powerMargin + 30)), ok: metrics.powerMargin >= 5 },
    { label: 'Data', val: `${metrics.dataMargin}%`, pct: Math.max(0, Math.min(100, metrics.dataMargin + 25)), ok: metrics.dataMargin >= 5 },
    { label: 'Life', val: `${metrics.lifetimeYears}/${scenario.minLifetimeYr}yr`, pct: Math.min(100, Math.round((metrics.lifetimeYears / scenario.minLifetimeYr) * 100)), ok: metrics.lifetimeYears >= scenario.minLifetimeYr },
    { label: 'Science', val: `${metrics.scienceScore}/100`, pct: metrics.scienceScore, ok: metrics.scienceScore >= scenario.minScience }
  ];
}

export function renderHud(evaluation, stage) {
  const { metrics, mel, cmlLevel, cmlLabel, scenario, sandboxMode } = evaluation;
  const cmlEl = document.getElementById('cml-badge');
  cmlEl.className = `cml-badge cml-${cmlLevel}`;
  cmlEl.textContent = cmlLabel;
  document.getElementById('cml-xp-fill').style.width = `${cmlLevel * 25}%`;
  document.getElementById('scenario-badge').textContent = `L${scenario.level}${sandboxMode ? ' · Sandbox' : ''}`;
  document.getElementById('resource-gauges').innerHTML = getGaugeRows(evaluation).map((g) => `
    <div class="gauge-card"><div class="gauge-top"><span>${g.label}</span><span>${g.ok ? 'OK' : '!'}</span></div>
    <div class="gauge-val">${g.val}</div><div class="bar-track"><div class="bar-fill" style="width:${g.pct}%;background:${g.ok ? 'var(--ok)' : 'var(--bad)'}"></div></div></div>`).join('');
  const cta = document.getElementById('launch-cta-btn');
  cta.textContent = stage === 'hangar' ? 'LAUNCH MISSION' : (stage === 'launch' ? 'SKIP TO ORBIT >>' : (stage === 'orbit' ? 'FLIGHT DEBRIEF >>' : 'BACK TO HANGAR'));
  document.getElementById('mel-summary-meta').textContent = `${mel.length} items · ${metrics.mass.totalKg} kg · $${metrics.budget.usedM}M`;
  document.getElementById('mel-body').innerHTML = `<table class="mel-table"><thead><tr><th>Segment</th><th>Component</th><th>Mass</th><th>Power</th><th>Cost</th></tr></thead><tbody>`
    + mel.map((r) => `<tr><td>${esc(r.segment)}</td><td>${esc(r.item)}</td><td>${r.massKg} kg</td><td>${r.powerW} W</td><td>$${r.costM}M</td></tr>`).join('') + '</tbody></table>';
}

export function renderStageHud(stage, state, evaluation, opts) {
  const hud = document.getElementById('stage-hud');
  const rev = document.getElementById('review-overlay');
  rev.hidden = stage !== 'review';
  if (stage === 'hangar') {
    const bus = CATALOG.space.buses.find((b) => b.id === state.busId);
    const warns = evaluation.warnings;
    hud.innerHTML = `<div class="stage-card glass">
      <div class="drawer-head" style="padding:0 0 6px;border-bottom:1px solid var(--border)"><strong>3D Hangar Controls</strong><span id="cleanroom-meta-pill" class="pill">${esc(bus?.busClass.toUpperCase() || '')} · ${opts.meshCount} parts</span></div>
      <div class="btn-row">
        <button id="vp-autorotate-btn" class="btn ${opts.autoRotate ? 'is-on' : ''}" type="button">Auto-Rotate</button>
        <button id="vp-explode-btn" class="btn ${opts.exploded ? 'is-on' : ''}" type="button">Exploded View</button>
        <button id="vp-reset-btn" class="btn" type="button">Reset Cam</button>
      </div></div>
      <div class="stage-card glass"><div class="drawer-head" style="padding:0 0 6px;border-bottom:1px solid var(--border)"><strong>Trade-Study Gate</strong><span class="pill">${warns.length} issue${warns.length === 1 ? '' : 's'}</span></div>
      ${warns.length ? warns.map((w) => `<div class="warn-item"><strong>${esc(w.segment)}:</strong> ${esc(w.text)}</div>`).join('') : '<div class="warn-item ok"><strong>CML 4 Ready:</strong> Verified Point Design!</div>'}
    </div>`;
    return;
  }
  if (stage === 'launch') {
    const risk = evaluation.cmlLevel < 4 && !evaluation.sandboxMode;
    hud.innerHTML = `<div class="stage-card glass">
      <div class="drawer-head" style="padding:0 0 6px;border-bottom:1px solid var(--border)"><strong>Launch Telemetry</strong><span id="launch-phase-pill" class="pill">COUNTDOWN</span></div>
      ${risk ? `<div class="warn-item">Test Launch Risk (CML ${evaluation.cmlLevel})</div>` : ''}
      <div id="launch-telem" class="telem-mono">T-3 · Alt 0 km · Vel 0.00 km/s · 0%</div>
      <div class="btn-row">
        <button id="lch-pad-btn" class="btn ${opts.launchCam === 'pad' ? 'is-on' : ''}" type="button">Pad Cam</button>
        <button id="lch-rkt-btn" class="btn ${opts.launchCam === 'rocket' ? 'is-on' : ''}" type="button">Rocket Cam</button>
        <button id="lch-skip-btn" class="btn btn-primary" type="button">Skip to Orbit &gt;&gt;</button>
      </div></div>`;
    return;
  }
  if (stage === 'orbit') {
    const risk = evaluation.cmlLevel < 4 && !evaluation.sandboxMode;
    hud.innerHTML = `<div class="stage-card glass">
      <div class="drawer-head" style="padding:0 0 6px;border-bottom:1px solid var(--border)"><strong>Full-View Orbit Controls</strong><span class="pill">${esc(evaluation.orbitElements.id)}</span></div>
      ${risk ? `<div class="warn-item">Unverified Orbit Test (CML ${evaluation.cmlLevel})</div>` : ''}
      <div class="btn-row">
        <button class="btn ${opts.orbitCam === 'full' ? 'is-on' : ''}" data-cam="full" type="button">Full Orbit View</button>
        <button class="btn ${opts.orbitCam === 'chase' ? 'is-on' : ''}" data-cam="chase" type="button">Chase Satellite</button>
        <button class="btn ${opts.orbitCam === 'polar' ? 'is-on' : ''}" data-cam="polar" type="button">Top-Down Polar</button>
        <button class="btn ${opts.orbitCam === 'free' ? 'is-on' : ''}" data-cam="free" type="button">Free Cam</button>
      </div>
      <div class="btn-row">
        <button class="btn ${opts.orbitWarp === 1 ? 'is-on' : ''}" data-warp="1" type="button">1x</button>
        <button class="btn ${opts.orbitWarp === 25 ? 'is-on' : ''}" data-warp="25" type="button">25x</button>
        <button class="btn ${opts.orbitWarp === 100 ? 'is-on' : ''}" data-warp="100" type="button">100x</button>
        <button class="btn ${opts.orbitWarp === 0 ? 'is-on' : ''}" data-warp="0" type="button">Pause</button>
        <button id="orb-storm-btn" class="btn" type="button">Test Eclipse / Solar Storm</button>
      </div>
      <div id="orbit-telem" class="telem-mono">Propagating Keplerian orbit...</div>
    </div>`;
    return;
  }
  hud.innerHTML = '';
  const { scenario, orbitElements, metrics, missionMatch, cmlLevel, cmlLabel, sandboxMode } = evaluation;
  const bus = CATALOG.space.buses.find((b) => b.id === state.busId);
  const band = CATALOG.user.wavelengths.find((w) => w.id === state.wavelengthBand);
  const grade = cmlLevel === 4 ? (metrics.scienceScore >= 90 ? 'Grade S' : 'Grade A') : (cmlLevel === 3 ? 'Grade B' : 'Mission Risk');
  const risk = cmlLevel < 4 && !sandboxMode;
  rev.innerHTML = `<div class="vp-card glass"><div class="grade-row"><div><h2 style="margin:0 0 4px">GoSpace MDL Debrief · ${esc(scenario.name)}</h2>
    <div><strong>Gate:</strong> ${esc(cmlLabel)} ${risk ? '— Anomaly risks active; resolve warnings for CML 4.' : '— Verified for Flight!'}</div></div>
    <span class="grade-badge ${risk ? 'grade-risk' : ''}">${grade}</span></div>
    <div class="btn-row" style="margin-top:10px"><button id="rev-export-btn" class="btn btn-primary" type="button">Export Mission Viz JSON</button><button id="rev-save-btn" class="btn" type="button">Save Design</button><button id="rev-back-btn" class="btn" type="button">Back to Hangar</button></div>
  </div>
  <div class="vp-card glass"><h3 style="margin:0 0 4px">Real NASA &amp; CSA Mission Match: ${esc(missionMatch.name)}</h3><p class="field-tip" style="margin:0 0 6px">${esc(missionMatch.detail)}</p>
    <div><strong>Your Design:</strong> ${esc(bus?.name || state.busId)} · ${esc(orbitElements.name)} · ${esc(band?.name || state.wavelengthBand)}</div></div>
  <div class="vp-grid">${getGaugeRows(evaluation).map((g) => `<div class="vp-stat"><div class="vp-stat-label">${g.label} (${g.ok ? 'PASS' : 'RISK'})</div><div class="vp-stat-val">${g.val}</div></div>`).join('')}</div>`;
}

export function updateLaunchOverlay(t) {
  const p = document.getElementById('launch-phase-pill'), d = document.getElementById('launch-telem');
  if (p) p.textContent = t.phase;
  if (d) d.textContent = `${t.countdownLabel} · Alt ${t.altitudeKm} km · Vel ${t.velocityKms} km/s · ${t.progressPct}%`;
}

export function updateOrbitOverlay(t) {
  const d = document.getElementById('orbit-telem');
  if (d && t) {
    const light = t.stormActive ? 'SOLAR STORM' : (t.inEclipse ? 'Eclipse' : 'Sunlit');
    d.textContent = `Alt ${t.altitudeKm} km · ${t.speedKms} km/s · ${light} | Batt ${t.batterySoc}% · Buf ${t.bufferGb} GB / DL ${t.downlinkedGb} GB | Link: ${t.linkedStation}`;
  }
  document.getElementById('orb-storm-btn')?.classList.toggle('is-on', Boolean(t?.stormActive));
}

export function renderResourcesList() {
  document.getElementById('resources-list').innerHTML = OFFICIAL_RESOURCES.map((r) => `<li><span><strong>[${r.agency}]</strong> ${esc(r.title)}</span><a href="${r.url}" target="_blank" rel="noopener noreferrer">Open</a></li>`).join('');
}

export function renderSavedModal(savedList, currentEval) {
  document.getElementById('saved-designs-list').innerHTML = savedList.length
    ? savedList.map((d, idx) => `<div class="saved-row"><span><strong>${esc(d.name)}</strong> · CML ${d.cmlLevel} · $${d.budgetM}M · Sci ${d.scienceScore}</span><span><button class="btn" data-load-idx="${idx}" type="button">Load</button> <button class="btn" data-cmp-idx="${idx}" type="button">Compare</button> <button class="btn" data-del-idx="${idx}" type="button">Del</button></span></div>`).join('')
    : '<p class="field-tip">No saved designs yet.</p>';
  document.getElementById('compare-box').innerHTML = `<strong>Active:</strong> CML ${currentEval.cmlLevel} · $${currentEval.metrics.budget.usedM}M · ${currentEval.metrics.mass.totalKg} kg · Sci ${currentEval.metrics.scienceScore}/100`;
}
