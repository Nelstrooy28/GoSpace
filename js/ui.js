import { CATALOG, OFFICIAL_RESOURCES } from './catalog.js';
import { propagateOrbit } from './missionVizPropagator.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function optionBtn({ field, id, label, meta, selected, badgeText, badgeKind, tip, multi }) {
  const badge = badgeText ? `<span class="badge badge-${badgeKind || 'ok'}">${esc(badgeText)}</span>` : '';
  return `<button class="opt-btn ${selected ? 'selected' : ''}" type="button" data-field="${field}" data-id="${id}" data-multi="${multi ? '1' : '0'}" title="${esc(tip)}">
    <span><strong>${esc(label)}</strong><span class="opt-meta">${esc(meta)}</span></span>${badge}
  </button>`;
}

function renderFieldCard(title, tip, buttonsHtml) {
  return `<div class="field-card"><div class="field-head"><span class="field-title">${esc(title)}</span></div><div class="field-tip">${esc(tip)}</div><div class="option-list">${buttonsHtml}</div></div>`;
}

export function renderSegmentPanel(segment, state, evaluation) {
  const sc = evaluation.scenario;
  const bus = CATALOG.space.buses.find((b) => b.id === state.busId);
  if (segment === 'user') {
    const objHtml = CATALOG.user.objectives.map((o) => optionBtn({
      field: 'userObjective', id: o.id, label: o.name, meta: `Target band: ${o.band.toUpperCase()}`,
      selected: state.userObjective === o.id, tip: o.tip,
      badgeText: o.id === sc.targetObjective ? 'Mission Fit' : 'Alt', badgeKind: o.id === sc.targetObjective ? 'ok' : 'warn'
    })).join('');
    const bandHtml = CATALOG.user.wavelengths.map((w) => optionBtn({
      field: 'wavelengthBand', id: w.id, label: w.name, meta: w.tip,
      selected: state.wavelengthBand === w.id, tip: w.tip,
      badgeText: w.id === sc.targetBand ? 'Target Band' : 'Mismatch', badgeKind: w.id === sc.targetBand ? 'ok' : 'bad'
    })).join('');
    const latHtml = CATALOG.user.latencies.map((l) => optionBtn({
      field: 'latencyTier', id: l.id, label: l.name, meta: l.tip,
      selected: state.latencyTier === l.id, tip: l.tip,
      badgeText: l.id === sc.targetLatency ? 'Optimal' : 'Trade', badgeKind: l.id === sc.targetLatency ? 'ok' : 'warn'
    })).join('');
    return renderFieldCard('Science Objective', 'Defines what Earth or Lunar phenomenon your mission measures.', objHtml)
      + renderFieldCard('Wavelength Band (Webb Rule)', 'Instruments must match the chosen spectral band.', bandHtml)
      + renderFieldCard('Data Latency & Users', 'Determines ground network cadence for end users.', latHtml);
  }
  if (segment === 'space') {
    const busHtml = CATALOG.space.buses.map((b) => optionBtn({
      field: 'busId', id: b.id, label: b.name, meta: `${b.massKg} kg · Cap ${b.payloadCapKg} kg · $${b.costM}M`,
      selected: state.busId === b.id, tip: b.tip, badgeText: b.busClass.toUpperCase(), badgeKind: 'ok'
    })).join('');
    const instHtml = CATALOG.space.instruments.map((inst) => {
      const bandOk = inst.band === state.wavelengthBand;
      const busOk = !bus || inst.classes.includes(bus.busClass);
      const badgeText = bandOk && busOk ? 'Compatible' : (!busOk ? 'Bus Size!' : 'Band Mismatch');
      return optionBtn({
        field: 'instrumentIds', id: inst.id, label: inst.name, multi: true,
        meta: `${inst.band.toUpperCase()} · ${inst.massKg} kg · ${inst.powerW} W · $${inst.costM}M`,
        selected: state.instrumentIds.includes(inst.id), tip: inst.tip,
        badgeText, badgeKind: bandOk && busOk ? 'ok' : 'bad'
      });
    }).join('');
    const solarHtml = CATALOG.space.solarArrays.map((s) => optionBtn({
      field: 'solarId', id: s.id, label: s.name, meta: `${s.genW} W peak · ${s.massKg} kg · $${s.costM}M`,
      selected: state.solarId === s.id, tip: s.tip
    })).join('');
    const battHtml = CATALOG.space.batteries.map((b) => optionBtn({
      field: 'batteryId', id: b.id, label: b.name, meta: `${b.wh} Wh · +${b.lifeBonus} yr · $${b.costM}M`,
      selected: state.batteryId === b.id, tip: b.tip
    })).join('');
    const thermHtml = CATALOG.space.thermalAdcs.map((t) => optionBtn({
      field: 'thermalId', id: t.id, label: t.name, meta: `${t.massKg} kg · ${t.powerW} W · $${t.costM}M`,
      selected: state.thermalId === t.id, tip: t.tip,
      badgeText: t.cryoCapable ? 'Cryo Ready' : 'Standard', badgeKind: t.cryoCapable ? 'ok' : 'warn'
    })).join('');
    return renderFieldCard('Spacecraft Bus (CubeSat 101 / MDL)', 'Chassis mass, power overhead, and payload capacity.', busHtml)
      + renderFieldCard('Science Instruments (Multi-Select)', 'Select 1+ sensors matching your band & bus.', instHtml)
      + renderFieldCard('Solar Arrays', 'Must cover load across orbital eclipse.', solarHtml)
      + renderFieldCard('Battery Pack', 'Stores energy for eclipse & peak downlinks.', battHtml)
      + renderFieldCard('Thermal & ADCS', 'Pointing accuracy & active cooling for Cryo-IR.', thermHtml);
  }
  if (segment === 'launch') {
    const vehHtml = CATALOG.launch.vehicles.map((v) => optionBtn({
      field: 'vehicleId', id: v.id, label: v.name, meta: `Max ${v.maxPayloadKg} kg · $${v.costM}M`,
      selected: state.vehicleId === v.id, tip: v.tip,
      badgeText: v.deepSpaceCapable ? 'HEO/Lunar' : 'LEO', badgeKind: 'ok'
    })).join('');
    const orbHtml = CATALOG.launch.orbits.map((o) => optionBtn({
      field: 'orbitId', id: o.id, label: o.name, meta: `a=${o.aKm} km · e=${o.e} · i=${o.iDeg}°`,
      selected: state.orbitId === o.id, tip: o.tip,
      badgeText: o.id === sc.targetOrbit ? 'Target Orbit' : 'Alt', badgeKind: o.id === sc.targetOrbit ? 'ok' : 'warn'
    })).join('');
    return renderFieldCard('Launch Vehicle', 'Total spacecraft mass must fit within launcher capability.', vehHtml)
      + renderFieldCard('Target Keplerian Orbit', 'Propagated in 3D via NASA Mission Viz equations.', orbHtml);
  }
  const txHtml = CATALOG.ground.transceivers.map((t) => optionBtn({
    field: 'transceiverId', id: t.id, label: t.name, meta: `${t.mbps} Mbps · ${t.massKg} kg · $${t.costM}M`,
    selected: state.transceiverId === t.id, tip: t.tip,
    badgeText: t.deepSpace ? 'Deep Space' : 'LEO', badgeKind: 'ok'
  })).join('');
  const gsHtml = CATALOG.ground.stations.map((g) => optionBtn({
    field: 'stationId', id: g.id, label: g.name, meta: `${g.passMinDay} min/day · $${g.costM}M`,
    selected: state.stationId === g.id, tip: g.tip,
    badgeText: g.deepSpace ? 'DSN' : (g.realtimeCapable ? 'Low-Latency' : 'Ops'), badgeKind: 'ok'
  })).join('');
  return renderFieldCard('Onboard Transceiver', 'RF or optical downlink rate vs daily science data.', txHtml)
    + renderFieldCard('Ground Station Network', 'Antennas & pass minutes determine daily downlink volume.', gsHtml);
}

export function renderHud(evaluation) {
  const { metrics, mel, warnings, cmlLevel, cmlLabel, scenario, sandboxMode } = evaluation;
  const cmlEl = document.getElementById('cml-badge');
  cmlEl.className = `cml-badge cml-${cmlLevel}`;
  cmlEl.textContent = cmlLabel;
  document.getElementById('scenario-badge').textContent = `Level ${scenario.level}${sandboxMode ? ' · Sandbox' : ''}`;

  const gauges = [
    { label: 'Budget', val: `$${metrics.budget.usedM}M / $${metrics.budget.limitM}M`, pct: Math.min(100, metrics.budget.pct), ok: sandboxMode || metrics.budget.usedM <= metrics.budget.limitM },
    { label: 'Total Mass', val: `${metrics.mass.totalKg} / ${metrics.mass.launchLimitKg} kg`, pct: Math.min(100, Math.round((metrics.mass.totalKg / Math.max(metrics.mass.launchLimitKg, 1)) * 100)), ok: sandboxMode || metrics.mass.totalKg <= metrics.mass.launchLimitKg },
    { label: 'Power Margin', val: `${metrics.powerMargin}%`, pct: Math.max(0, Math.min(100, metrics.powerMargin + 30)), ok: metrics.powerMargin >= 5 },
    { label: 'Data Margin', val: `${metrics.dataMargin}%`, pct: Math.max(0, Math.min(100, Math.min(100, metrics.dataMargin + 25))), ok: metrics.dataMargin >= 5 },
    { label: 'Lifetime', val: `${metrics.lifetimeYears} / ${scenario.minLifetimeYr} yr`, pct: Math.min(100, Math.round((metrics.lifetimeYears / scenario.minLifetimeYr) * 100)), ok: metrics.lifetimeYears >= scenario.minLifetimeYr },
    { label: 'Science Score', val: `${metrics.scienceScore} / 100`, pct: metrics.scienceScore, ok: metrics.scienceScore >= scenario.minScience }
  ];
  document.getElementById('resource-gauges').innerHTML = gauges.map((g) => `
    <div class="gauge-card">
      <div class="gauge-top"><span>${g.label}</span><span>${g.ok ? 'OK' : 'CHECK'}</span></div>
      <div class="gauge-val">${g.val}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${g.pct}%;background:${g.ok ? 'var(--ok)' : 'var(--bad)'}"></div></div>
    </div>`).join('');

  document.getElementById('warning-count').textContent = `${warnings.length} issue${warnings.length === 1 ? '' : 's'}`;
  document.getElementById('warnings-list').innerHTML = warnings.length
    ? warnings.map((w) => `<li class="warn-item"><strong>${esc(w.segment)}:</strong> ${esc(w.text)}</li>`).join('')
    : '<li class="warn-item ok"><strong>CML 4 Ready:</strong> All MDL constraints &amp; Webb compatibility checks passed.</li>';

  document.getElementById('mel-summary-meta').textContent = `${mel.length} subsystems · ${metrics.mass.totalKg} kg · $${metrics.budget.usedM}M`;
  document.getElementById('mel-body').innerHTML = `<table class="mel-table"><thead><tr><th>Segment</th><th>Component</th><th>Mass</th><th>Power</th><th>Cost</th></tr></thead><tbody>`
    + mel.map((r) => `<tr><td>${esc(r.segment)}</td><td>${esc(r.item)}</td><td>${r.massKg} kg</td><td>${r.powerW} W</td><td>$${r.costM}M</td></tr>`).join('')
    + '</tbody></table>';
}

export function renderViewport(stage, state, evaluation) {
  const vp = document.getElementById('viewport-container');
  vp.dataset.stage = stage;
  const { scenario, orbitElements, orbitStats, metrics, missionMatch, cmlLevel, cmlLabel } = evaluation;
  const live = propagateOrbit(orbitElements, 600);
  if (stage === 'cleanroom') {
    vp.innerHTML = `<div class="vp-card" data-viewport-hook="cleanroom-3d">
      <h3>Cleanroom Point Design · ${esc(scenario.name)}</h3>
      <p class="field-tip">${esc(scenario.summary)} (3D Cleanroom assembly mounts here in Milestone 2.)</p>
    </div>
    <div class="vp-grid">
      <div class="vp-stat"><div class="vp-stat-label">Spacecraft Bus</div><div class="vp-stat-val">${esc(state.busId)}</div></div>
      <div class="vp-stat"><div class="vp-stat-label">Instruments (${state.instrumentIds.length})</div><div class="vp-stat-val">${esc(state.instrumentIds.join(', ') || 'None')}</div></div>
      <div class="vp-stat"><div class="vp-stat-label">Payload / Cap</div><div class="vp-stat-val">${metrics.mass.payloadKg} / ${metrics.mass.busLimitKg} kg</div></div>
      <div class="vp-stat"><div class="vp-stat-label">JPL Gate</div><div class="vp-stat-val">${esc(cmlLabel)}</div></div>
    </div>`;
    return;
  }
  if (stage === 'orbit') {
    vp.innerHTML = `<div class="vp-card" data-viewport-hook="orbit-3d">
      <h3>NASA Mission Viz Keplerian Propagator · ${esc(orbitElements.name)}</h3>
      <p class="field-tip">3D Earth, eclipse shadow cone &amp; downlink beams mount here in Milestone 2. Live 2D-ellipse-to-3D state at t=600s:</p>
    </div>
    <div class="vp-grid">
      <div class="vp-stat"><div class="vp-stat-label">ECI Position [x, y, z] km</div><div class="vp-stat-val">${live.position.map((n) => Math.round(n)).join(', ')}</div></div>
      <div class="vp-stat"><div class="vp-stat-label">Apogee / Perigee</div><div class="vp-stat-val">${orbitStats.apogeeKm} / ${orbitStats.perigeeKm} km</div></div>
      <div class="vp-stat"><div class="vp-stat-label">Period / Mean Speed</div><div class="vp-stat-val">${(orbitStats.periodSec / 60).toFixed(1)} min · ${orbitStats.meanSpeedKms} km/s</div></div>
      <div class="vp-stat"><div class="vp-stat-label">Eclipse Fraction</div><div class="vp-stat-val">${Math.round(orbitStats.eclipseFraction * 100)}% (${live.inEclipse ? 'In Shadow' : 'Sunlit'})</div></div>
    </div>`;
    return;
  }
  vp.innerHTML = `<div class="vp-card">
    <h3>Flight Review &amp; Real Mission Match</h3>
    <p><strong>Status:</strong> ${esc(cmlLabel)} ${cmlLevel === 4 ? '— Approved for Flight!' : '— Resolve remaining trade warnings for CML 4.'}</p>
    <p><strong>Real NASA/CSA Match:</strong> ${esc(missionMatch.name)}</p>
    <p class="field-tip">${esc(missionMatch.detail)}</p>
  </div>
  <div class="vp-grid">
    <div class="vp-stat"><div class="vp-stat-label">Science Return</div><div class="vp-stat-val">${metrics.scienceScore} / 100</div></div>
    <div class="vp-stat"><div class="vp-stat-label">Mission Cost</div><div class="vp-stat-val">$${metrics.budget.usedM}M / $${metrics.budget.limitM}M</div></div>
    <div class="vp-stat"><div class="vp-stat-label">Power / Data Margins</div><div class="vp-stat-val">${metrics.powerMargin}% / ${metrics.dataMargin}%</div></div>
    <div class="vp-stat"><div class="vp-stat-label">Orbit Lifetime</div><div class="vp-stat-val">${metrics.lifetimeYears} yr (Min ${scenario.minLifetimeYr} yr)</div></div>
  </div>`;
}

export function renderResourcesList() {
  document.getElementById('resources-list').innerHTML = OFFICIAL_RESOURCES.map((r) => `
    <li><span><strong>[${r.agency}]</strong> ${esc(r.title)}</span><a href="${r.url}" target="_blank" rel="noopener noreferrer">Open Resource</a></li>`).join('');
}

export function renderSavedModal(savedList, currentEval) {
  const listEl = document.getElementById('saved-designs-list');
  if (!savedList.length) {
    listEl.innerHTML = '<p class="field-tip">No saved designs yet. Save your current point design above.</p>';
  } else {
    listEl.innerHTML = savedList.map((d, idx) => `<div class="saved-row">
      <span><strong>${esc(d.name)}</strong> · CML ${d.cmlLevel} · $${d.budgetM}M · Sci ${d.scienceScore}</span>
      <span><button class="btn btn-secondary" data-load-idx="${idx}" type="button">Load</button> <button class="btn btn-secondary" data-cmp-idx="${idx}" type="button">Compare</button> <button class="btn btn-secondary" data-del-idx="${idx}" type="button">Del</button></span>
    </div>`).join('');
  }
  document.getElementById('compare-box').innerHTML = `<strong>Active Design:</strong> CML ${currentEval.cmlLevel} · $${currentEval.metrics.budget.usedM}M · ${currentEval.metrics.mass.totalKg} kg · Sci ${currentEval.metrics.scienceScore}/100`;
}
