import { CATALOG, OFFICIAL_RESOURCES } from './catalog.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function optionBtn({ field, id, label, meta, selected, badgeText, badgeKind, tip, multi }) {
  const badge = badgeText ? `<span class="badge badge-${badgeKind || 'ok'}">${esc(badgeText)}</span>` : '';
  return `<button class="opt-btn ${selected ? 'selected' : ''}" type="button" data-field="${field}" data-id="${id}" data-multi="${multi ? '1' : '0'}" title="${esc(tip)}">
    <span><strong>${esc(label)}</strong><span class="opt-meta">${esc(meta)}</span></span>${badge}
  </button>`;
}

const card = (title, tip, html) => `<div class="field-card"><div class="field-head"><span class="field-title">${esc(title)}</span></div><div class="field-tip">${esc(tip)}</div><div class="option-list">${html}</div></div>`;

export function renderSegmentPanel(segment, state, evaluation) {
  const sc = evaluation.scenario;
  const bus = CATALOG.space.buses.find((b) => b.id === state.busId);
  if (segment === 'user') {
    const obj = CATALOG.user.objectives.map((o) => optionBtn({ field: 'userObjective', id: o.id, label: o.name, meta: `Target band: ${o.band.toUpperCase()}`, selected: state.userObjective === o.id, tip: o.tip, badgeText: o.id === sc.targetObjective ? 'Mission Fit' : 'Alt', badgeKind: o.id === sc.targetObjective ? 'ok' : 'warn' })).join('');
    const band = CATALOG.user.wavelengths.map((w) => optionBtn({ field: 'wavelengthBand', id: w.id, label: w.name, meta: w.tip, selected: state.wavelengthBand === w.id, tip: w.tip, badgeText: w.id === sc.targetBand ? 'Target Band' : 'Mismatch', badgeKind: w.id === sc.targetBand ? 'ok' : 'bad' })).join('');
    const lat = CATALOG.user.latencies.map((l) => optionBtn({ field: 'latencyTier', id: l.id, label: l.name, meta: l.tip, selected: state.latencyTier === l.id, tip: l.tip, badgeText: l.id === sc.targetLatency ? 'Optimal' : 'Trade', badgeKind: l.id === sc.targetLatency ? 'ok' : 'warn' })).join('');
    return card('Science Objective', 'Defines what Earth or Lunar phenomenon your mission measures.', obj)
      + card('Wavelength Band (Webb Rule)', 'Instruments must match the chosen spectral band.', band)
      + card('Data Latency & Users', 'Determines ground network cadence for end users.', lat);
  }
  if (segment === 'space') {
    const busHtml = CATALOG.space.buses.map((b) => optionBtn({ field: 'busId', id: b.id, label: b.name, meta: `${b.massKg} kg · Cap ${b.payloadCapKg} kg · $${b.costM}M`, selected: state.busId === b.id, tip: b.tip, badgeText: b.busClass.toUpperCase(), badgeKind: 'ok' })).join('');
    const instHtml = CATALOG.space.instruments.map((i) => {
      const ok = i.band === state.wavelengthBand && (!bus || i.classes.includes(bus.busClass));
      const badgeText = ok ? 'Compatible' : (!bus || i.classes.includes(bus.busClass) ? 'Band Mismatch' : 'Bus Size!');
      return optionBtn({ field: 'instrumentIds', id: i.id, label: i.name, multi: true, meta: `${i.band.toUpperCase()} · ${i.massKg} kg · ${i.powerW} W · $${i.costM}M`, selected: state.instrumentIds.includes(i.id), tip: i.tip, badgeText, badgeKind: ok ? 'ok' : 'bad' });
    }).join('');
    const solar = CATALOG.space.solarArrays.map((s) => optionBtn({ field: 'solarId', id: s.id, label: s.name, meta: `${s.genW} W peak · ${s.massKg} kg · $${s.costM}M`, selected: state.solarId === s.id, tip: s.tip })).join('');
    const batt = CATALOG.space.batteries.map((b) => optionBtn({ field: 'batteryId', id: b.id, label: b.name, meta: `${b.wh} Wh · +${b.lifeBonus} yr · $${b.costM}M`, selected: state.batteryId === b.id, tip: b.tip })).join('');
    const therm = CATALOG.space.thermalAdcs.map((t) => optionBtn({ field: 'thermalId', id: t.id, label: t.name, meta: `${t.massKg} kg · ${t.powerW} W · $${t.costM}M`, selected: state.thermalId === t.id, tip: t.tip, badgeText: t.cryoCapable ? 'Cryo Ready' : 'Standard', badgeKind: t.cryoCapable ? 'ok' : 'warn' })).join('');
    return card('Spacecraft Bus (CubeSat 101 / MDL)', 'Chassis mass, power overhead, and payload capacity.', busHtml)
      + card('Science Instruments (Multi-Select)', 'Select 1+ sensors matching your band & bus.', instHtml)
      + card('Solar Arrays', 'Must cover load across orbital eclipse.', solar)
      + card('Battery Pack', 'Stores energy for eclipse & peak downlinks.', batt)
      + card('Thermal & ADCS', 'Pointing accuracy & active cooling for Cryo-IR.', therm);
  }
  if (segment === 'launch') {
    const veh = CATALOG.launch.vehicles.map((v) => optionBtn({ field: 'vehicleId', id: v.id, label: v.name, meta: `Max ${v.maxPayloadKg} kg · $${v.costM}M`, selected: state.vehicleId === v.id, tip: v.tip, badgeText: v.deepSpaceCapable ? 'HEO/Lunar' : 'LEO', badgeKind: 'ok' })).join('');
    const orb = CATALOG.launch.orbits.map((o) => optionBtn({ field: 'orbitId', id: o.id, label: o.name, meta: `a=${o.aKm} km · e=${o.e} · i=${o.iDeg}°`, selected: state.orbitId === o.id, tip: o.tip, badgeText: o.id === sc.targetOrbit ? 'Target Orbit' : 'Alt', badgeKind: o.id === sc.targetOrbit ? 'ok' : 'warn' })).join('');
    return card('Launch Vehicle', 'Total spacecraft mass must fit within launcher capability.', veh)
      + card('Target Keplerian Orbit', 'Propagated in 3D via NASA Mission Viz equations.', orb);
  }
  const tx = CATALOG.ground.transceivers.map((t) => optionBtn({ field: 'transceiverId', id: t.id, label: t.name, meta: `${t.mbps} Mbps · ${t.massKg} kg · $${t.costM}M`, selected: state.transceiverId === t.id, tip: t.tip, badgeText: t.deepSpace ? 'Deep Space' : 'LEO', badgeKind: 'ok' })).join('');
  const gs = CATALOG.ground.stations.map((g) => optionBtn({ field: 'stationId', id: g.id, label: g.name, meta: `${g.passMinDay} min/day · $${g.costM}M`, selected: state.stationId === g.id, tip: g.tip, badgeText: g.deepSpace ? 'DSN' : (g.realtimeCapable ? 'Low-Latency' : 'Ops'), badgeKind: 'ok' })).join('');
  return card('Onboard Transceiver', 'RF or optical downlink rate vs daily science data.', tx)
    + card('Ground Station Network', 'Antennas & pass minutes determine daily downlink volume.', gs);
}

function getGaugeRows(evaluation) {
  const { metrics, scenario, sandboxMode } = evaluation;
  return [
    { label: 'Budget', val: `$${metrics.budget.usedM}M / $${metrics.budget.limitM}M`, pct: Math.min(100, metrics.budget.pct), ok: sandboxMode || metrics.budget.usedM <= metrics.budget.limitM },
    { label: 'Total Mass', val: `${metrics.mass.totalKg} / ${metrics.mass.launchLimitKg} kg`, pct: Math.min(100, Math.round((metrics.mass.totalKg / Math.max(metrics.mass.launchLimitKg, 1)) * 100)), ok: sandboxMode || metrics.mass.totalKg <= metrics.mass.launchLimitKg },
    { label: 'Power Margin', val: `${metrics.powerMargin}%`, pct: Math.max(0, Math.min(100, metrics.powerMargin + 30)), ok: metrics.powerMargin >= 5 },
    { label: 'Data Margin', val: `${metrics.dataMargin}%`, pct: Math.max(0, Math.min(100, metrics.dataMargin + 25)), ok: metrics.dataMargin >= 5 },
    { label: 'Lifetime', val: `${metrics.lifetimeYears} / ${scenario.minLifetimeYr} yr`, pct: Math.min(100, Math.round((metrics.lifetimeYears / scenario.minLifetimeYr) * 100)), ok: metrics.lifetimeYears >= scenario.minLifetimeYr },
    { label: 'Science Score', val: `${metrics.scienceScore} / 100`, pct: metrics.scienceScore, ok: metrics.scienceScore >= scenario.minScience }
  ];
}

export function renderHud(evaluation) {
  const { metrics, mel, warnings, cmlLevel, cmlLabel, scenario, sandboxMode } = evaluation;
  const cmlEl = document.getElementById('cml-badge');
  cmlEl.className = `cml-badge cml-${cmlLevel}`;
  cmlEl.textContent = cmlLabel;
  document.getElementById('scenario-badge').textContent = `Level ${scenario.level}${sandboxMode ? ' · Sandbox' : ''}`;
  document.getElementById('resource-gauges').innerHTML = getGaugeRows(evaluation).map((g) => `
    <div class="gauge-card"><div class="gauge-top"><span>${g.label}</span><span>${g.ok ? 'OK' : 'CHECK'}</span></div>
    <div class="gauge-val">${g.val}</div><div class="bar-track"><div class="bar-fill" style="width:${g.pct}%;background:${g.ok ? 'var(--ok)' : 'var(--bad)'}"></div></div></div>`).join('');
  document.getElementById('warning-count').textContent = `${warnings.length} issue${warnings.length === 1 ? '' : 's'}`;
  document.getElementById('warnings-list').innerHTML = warnings.length
    ? warnings.map((w) => `<li class="warn-item"><strong>${esc(w.segment)}:</strong> ${esc(w.text)}</li>`).join('')
    : '<li class="warn-item ok"><strong>CML 4 Ready:</strong> All MDL constraints &amp; Webb compatibility checks passed.</li>';
  document.getElementById('mel-summary-meta').textContent = `${mel.length} subsystems · ${metrics.mass.totalKg} kg · $${metrics.budget.usedM}M`;
  document.getElementById('mel-body').innerHTML = `<table class="mel-table"><thead><tr><th>Segment</th><th>Component</th><th>Mass</th><th>Power</th><th>Cost</th></tr></thead><tbody>`
    + mel.map((r) => `<tr><td>${esc(r.segment)}</td><td>${esc(r.item)}</td><td>${r.massKg} kg</td><td>${r.powerW} W</td><td>$${r.costM}M</td></tr>`).join('') + '</tbody></table>';
}

export function updateCleanroomOverlay(state, evaluation, opts) {
  const bus = CATALOG.space.buses.find((b) => b.id === state.busId);
  const t = document.getElementById('cleanroom-title-pill'), m = document.getElementById('cleanroom-meta-pill');
  if (t) t.textContent = `${evaluation.scenario.name} · ${evaluation.cmlLabel}`;
  if (m) m.textContent = `${bus ? `${bus.name} (${bus.busClass.toUpperCase()})` : state.busId} · ${opts.meshCount} 3D parts`;
  document.getElementById('vp-autorotate-btn')?.classList.toggle('is-on', opts.autoRotate);
  document.getElementById('vp-explode-btn')?.classList.toggle('is-on', opts.exploded);
}

export function updateOrbitOverlay(evaluation, telem) {
  const title = document.getElementById('orbit-title-pill'), pill = document.getElementById('orbit-telem-pill');
  const risk = evaluation.cmlLevel < 4 && !evaluation.sandboxMode;
  if (title) {
    title.className = `vp-float-pill ${risk ? 'vp-warn-pill' : ''}`;
    title.textContent = `${evaluation.orbitElements.name} · ${risk ? `Test Launch Risk (CML ${evaluation.cmlLevel})` : evaluation.cmlLabel}`;
  }
  if (pill && telem) {
    const light = telem.stormActive ? 'SOLAR STORM' : (telem.inEclipse ? 'Earth Eclipse' : 'Sunlit');
    pill.textContent = `Alt ${telem.altitudeKm} km · ${telem.speedKms} km/s · ${light} · Batt ${telem.batterySoc}% · Buf ${telem.bufferGb} GB / DL ${telem.downlinkedGb} GB · Link: ${telem.linkedStation}`;
  }
  document.querySelectorAll('[data-warp]').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.warp) === (telem?.timeWarp ?? 20)));
  const camBtn = document.getElementById('orb-cam-btn');
  if (camBtn) camBtn.textContent = telem?.cameraMode === 'chase' ? 'Chase Sat' : 'Earth View';
  document.getElementById('orb-storm-btn')?.classList.toggle('is-on', Boolean(telem?.stormActive));
}

export function renderViewport(stage, state, evaluation) {
  const vp = document.getElementById('viewport-container');
  vp.dataset.stage = stage;
  vp.classList.toggle('is-3d', stage === 'cleanroom' || stage === 'orbit');
  if (stage === 'cleanroom') {
    if (!document.getElementById('cleanroom-canvas-host')) {
      vp.innerHTML = `<div id="cleanroom-canvas-host" class="canvas-host" data-viewport-hook="cleanroom-3d"></div>
      <div class="vp-overlay-top"><div class="vp-float-pill" id="cleanroom-title-pill"></div>
        <div class="vp-overlay-actions"><button id="vp-autorotate-btn" class="btn btn-secondary is-on" type="button">Auto-Rotate</button><button id="vp-explode-btn" class="btn btn-secondary" type="button">Exploded View</button><button id="vp-reset-btn" class="btn btn-secondary" type="button">Reset Camera</button></div>
      </div><div class="vp-overlay-bottom"><div class="vp-float-pill" id="cleanroom-meta-pill"></div><div class="vp-float-pill">Drag: Orbit · Scroll: Zoom</div></div>`;
    }
    return;
  }
  if (stage === 'orbit') {
    if (!document.getElementById('orbit-canvas-host')) {
      vp.innerHTML = `<div id="orbit-canvas-host" class="canvas-host" data-viewport-hook="orbit-3d"></div>
      <div class="vp-overlay-top"><div class="vp-float-pill" id="orbit-title-pill"></div>
        <div class="vp-overlay-actions">
          <button class="btn btn-secondary" data-warp="1" type="button">1x</button><button class="btn btn-secondary is-on" data-warp="20" type="button">20x</button><button class="btn btn-secondary" data-warp="100" type="button">100x</button><button class="btn btn-secondary" data-warp="0" type="button">Pause</button>
          <button id="orb-cam-btn" class="btn btn-secondary" type="button">Earth View</button><button id="orb-storm-btn" class="btn btn-secondary" type="button">Test Eclipse / Solar Storm</button>
        </div>
      </div><div class="vp-overlay-bottom"><div class="vp-float-pill" id="orbit-telem-pill">Propagating orbit...</div><div class="vp-float-pill">Drag: Orbit · Scroll: Zoom</div></div>`;
    }
    return;
  }
  const { scenario, orbitElements, metrics, missionMatch, cmlLevel, cmlLabel, sandboxMode } = evaluation;
  const bus = CATALOG.space.buses.find((b) => b.id === state.busId);
  const band = CATALOG.user.wavelengths.find((w) => w.id === state.wavelengthBand);
  const grade = cmlLevel === 4 ? (metrics.scienceScore >= 90 ? 'Grade S' : 'Grade A') : (cmlLevel === 3 ? 'Grade B' : 'Mission Risk');
  const risk = cmlLevel < 4 && !sandboxMode;
  vp.innerHTML = `<div class="vp-card"><div class="grade-row"><div><h3>GoSpace MDL Flight Review · ${esc(scenario.name)}</h3>
    <p><strong>Gate:</strong> ${esc(cmlLabel)} ${risk ? '— Anomaly risks active; fix warnings for CML 4.' : '— Verified for Flight!'}</p></div>
    <span class="grade-badge ${risk ? 'grade-risk' : ''}">${grade}</span></div>
    <div class="review-actions"><button id="rev-export-btn" class="btn btn-primary" type="button">Export Mission Viz JSON</button><button id="rev-save-btn" class="btn btn-secondary" type="button">Save Design</button><button id="rev-back-btn" class="btn btn-secondary" type="button">Back to Cleanroom</button></div>
  </div>
  <div class="vp-card"><h3>Real NASA &amp; CSA Mission Match: ${esc(missionMatch.name)}</h3><p class="field-tip">${esc(missionMatch.detail)}</p>
    <p><strong>Your Point Design Comparison:</strong> ${esc(bus?.name || state.busId)} · ${esc(orbitElements.name)} · ${esc(band?.name || state.wavelengthBand)}</p></div>
  <div class="vp-grid">${getGaugeRows(evaluation).map((g) => `<div class="vp-stat"><div class="vp-stat-label">${g.label} (${g.ok ? 'PASS' : 'RISK'})</div><div class="vp-stat-val">${g.val}</div></div>`).join('')}</div>`;
}

export function renderResourcesList() {
  document.getElementById('resources-list').innerHTML = OFFICIAL_RESOURCES.map((r) => `<li><span><strong>[${r.agency}]</strong> ${esc(r.title)}</span><a href="${r.url}" target="_blank" rel="noopener noreferrer">Open Resource</a></li>`).join('');
}

export function renderSavedModal(savedList, currentEval) {
  const listEl = document.getElementById('saved-designs-list');
  listEl.innerHTML = savedList.length
    ? savedList.map((d, idx) => `<div class="saved-row"><span><strong>${esc(d.name)}</strong> · CML ${d.cmlLevel} · $${d.budgetM}M · Sci ${d.scienceScore}</span><span><button class="btn btn-secondary" data-load-idx="${idx}" type="button">Load</button> <button class="btn btn-secondary" data-cmp-idx="${idx}" type="button">Compare</button> <button class="btn btn-secondary" data-del-idx="${idx}" type="button">Del</button></span></div>`).join('')
    : '<p class="field-tip">No saved designs yet. Save your current point design above.</p>';
  document.getElementById('compare-box').innerHTML = `<strong>Active Design:</strong> CML ${currentEval.cmlLevel} · $${currentEval.metrics.budget.usedM}M · ${currentEval.metrics.mass.totalKg} kg · Sci ${currentEval.metrics.scienceScore}/100`;
}
