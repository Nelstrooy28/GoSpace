import { generateOrbitTrack } from './missionVizPropagator.js';

export const OFFICIAL_RESOURCES = [
  { id: 1, agency: 'SYSTEMS', title: 'Design and Develop Science Missions', url: 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf?emrc=a454cf' },
  { id: 2, agency: 'DESIGN', title: 'Mission Design Telemetry & Lab Framework', url: 'https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/' },
  { id: 3, agency: 'MATURITY', title: 'Concept Maturity (CML 1–4) Framework', url: 'https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299' },
  { id: 4, agency: 'ORBIT', title: 'Keplerian 3D Orbit Trajectory Spec', url: 'https://nasa.github.io/mission-viz/' },
  { id: 5, agency: 'OPTICS', title: 'Space Observatory Wavelength Rules', url: 'https://science.nasa.gov/mission/webb/game-build-it-yourself/' },
  { id: 6, agency: 'CUBESAT', title: 'CubeSat 101 Systems Guide', url: 'https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf' },
  { id: 7, agency: 'SCIENCE', title: 'Arctic & Earth Observation Activities', url: 'https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp' }
];

export const SCENARIOS = [
  {
    id: 'wildfiresat-l1', level: 1, stars: '★☆☆', tag: 'Level 1 · CubeSat 101', badge: 'ARCTIC GUARDIAN', orbitIcon: '🛰️ SSO LEO 575km',
    name: 'WildFireSat & Arctic Thermal Monitor',
    summary: 'Detect boreal wildfires & Arctic heat anomalies from Sun-Synchronous LEO using a compact CubeSat.',
    targetBand: 'ir', targetObjective: 'wildfire-ir', targetOrbit: 'sso-leo', targetLatency: 'realtime',
    budgetLimitM: 24, minLifetimeYr: 2, minScience: 75,
    realMatch: { name: 'WildFireSat', tag: 'WILDFIRE FLEET', detail: 'Thermal IR wildfire monitoring mission paired with rapid heat-anomaly orbital analytics.' }
  },
  {
    id: 'ocean-l2', level: 2, stars: '★★☆', tag: 'Level 2 · SmallSat', badge: 'OCEAN SENTINEL', orbitIcon: '🌍 Polar LEO 680km',
    name: 'Coastal Ocean & Climate Radiometry',
    summary: 'Measure phytoplankton, coastal turbidity, and sea-ice dynamics with UV-Visible hyperspectral radiometry.',
    targetBand: 'uv-vis', targetObjective: 'ocean-color', targetOrbit: 'polar-leo', targetLatency: 'daily',
    budgetLimitM: 115, minLifetimeYr: 3, minScience: 80,
    realMatch: { name: 'PACE Climate Orbiter', tag: 'OCEAN COLOR MISSION', detail: 'Hyperspectral ocean-color & climate radiometry mission for plankton, aerosols, and coastal tracking.' }
  },
  {
    id: 'lunar-l3', level: 3, stars: '★★★', tag: 'Level 3 · Flagship / Lunar', badge: 'LUNAR PIONEER', orbitIcon: '🌙 Lunar Transfer',
    name: 'Lunar South Pole Volatiles & Deep Space Observatory',
    summary: 'Map shadowed lunar craters for water ice using cryogenic infrared spectroscopy and neutron detection.',
    targetBand: 'cryo-ir', targetObjective: 'lunar-volatiles', targetOrbit: 'lunar-transfer', targetLatency: 'archival',
    budgetLimitM: 500, minLifetimeYr: 5, minScience: 85,
    realMatch: { name: 'Lunar Trailblazer & Webb Space Observatory', tag: 'DEEP SPACE FLAGSHIP', detail: 'High-resolution lunar volatiles mapper combined with observatory-class cryogenic infrared thermal architecture.' }
  }
];

export const CATALOG = {
  user: {
    objectives: [
      { id: 'wildfire-ir', name: 'Wildfire Thermal Mapping', band: 'ir', tip: 'Monitor active fire radiative power across northern forests.' },
      { id: 'ocean-color', name: 'Hyperspectral Ocean Color', band: 'uv-vis', tip: 'Track coastal chlorophyll, aerosols, and marine ecosystems.' },
      { id: 'lunar-volatiles', name: 'Lunar Polar Water-Ice Survey', band: 'cryo-ir', tip: 'Detect OH/H2O signatures inside permanently shadowed craters.' }
    ],
    wavelengths: [
      { id: 'ir', name: 'Thermal IR (3-12 um)', tip: 'Detects surface heat signatures; fits CubeSat microbolometers.' },
      { id: 'uv-vis', name: 'UV-Visible (340-890 nm)', tip: 'Captures ocean color and atmospheric aerosol scattering.' },
      { id: 'cryo-ir', name: 'Cryogenic Mid-IR + Neutron', tip: 'Requires active cryocooler and heavy flagship optics.' }
    ],
    latencies: [
      { id: 'realtime', name: 'Low-Latency Alerts (<30 min)', tip: 'Essential for wildfire response teams via polar ground stations.' },
      { id: 'daily', name: 'Daily Science Ops (6-24 hr)', tip: 'Balanced cadence for global ocean & climate forecasting.' },
      { id: 'archival', name: 'Deep-Space Archive (>24 hr)', tip: 'High-volume deep-space science buffered for DSN passes.' }
    ]
  },
  space: {
    buses: [
      { id: '3u-cubesat', name: '3U CubeSat Bus', busClass: 'cubesat', massKg: 2.2, payloadCapKg: 2.0, basePowerW: 5, costM: 1.8, lifeBonus: 0, tip: 'CubeSat 101 standard 10x10x30 cm chassis.' },
      { id: '6u-cubesat', name: '6U CubeSat Bus', busClass: 'cubesat', massKg: 4.5, payloadCapKg: 8.0, basePowerW: 9, costM: 3.4, lifeBonus: 0.8, tip: 'Double-wide 6U bus with room for IR optics & deployables.' },
      { id: 'espa-smallsat', name: 'ESPA SmallSat Bus', busClass: 'smallsat', massKg: 85, payloadCapKg: 130, basePowerW: 65, costM: 22, lifeBonus: 2.2, tip: 'Modular SmallSat platform for hyperspectral ocean payloads.' },
      { id: 'flagship-bus', name: 'Deep-Space Flagship Bus', busClass: 'flagship', massKg: 780, payloadCapKg: 950, basePowerW: 240, costM: 145, lifeBonus: 5.0, tip: 'Radiation-hardened bus supporting cryo-telescopes & lunar transfer.' }
    ],
    instruments: [
      { id: 'ir-bolometer', name: 'Un-cooled IR Microbolometer', band: 'ir', classes: ['cubesat', 'smallsat'], massKg: 2.4, powerW: 11, dataMbDay: 900, costM: 2.6, sci: 44, tip: 'Lightweight thermal wildfire sensor (WildFireSat class).' },
      { id: 'arctic-multispec', name: 'Dual-Band Arctic Radiometer', band: 'ir', classes: ['cubesat', 'smallsat'], massKg: 1.6, powerW: 7, dataMbDay: 600, costM: 1.9, sci: 34, tip: 'Adds mid-IR hotspot verification and cloud masking.' },
      { id: 'oci-hyperspec', name: 'OCI UV-Vis Spectrometer', band: 'uv-vis', classes: ['smallsat', 'flagship'], massKg: 58, powerW: 95, dataMbDay: 14000, costM: 24, sci: 52, tip: 'Hyperspectral ocean radiometer modeled on PACE Climate Orbiter.' },
      { id: 'sar-altimeter', name: 'Compact Coastal Altimeter', band: 'uv-vis', classes: ['smallsat', 'flagship'], massKg: 28, powerW: 48, dataMbDay: 4200, costM: 12, sci: 32, tip: 'All-weather sea-state & ice-edge support instrument.' },
      { id: 'cryo-ir-mapper', name: 'Cryo-IR Volatiles Spectrometer', band: 'cryo-ir', classes: ['flagship'], massKg: 240, powerW: 310, dataMbDay: 22000, costM: 88, sci: 54, tip: 'Observatory-class cooled infrared mineral & ice mapper.' },
      { id: 'neutron-spec', name: 'Lunar Neutron Spectrometer', band: 'cryo-ir', classes: ['smallsat', 'flagship'], massKg: 42, powerW: 45, dataMbDay: 2500, costM: 26, sci: 36, tip: 'Measures epithermal neutrons to confirm subsurface hydrogen.' }
    ],
    solarArrays: [
      { id: 'body-mounted', name: 'Body-Mounted Si Panels', genW: 16, massKg: 1.0, costM: 0.6, tip: 'Simple, zero-deployment CubeSat panels (~16 W avg).' },
      { id: 'deployable-wings', name: 'Deployable GaAs Wings', genW: 68, massKg: 3.2, costM: 2.2, tip: 'Dual-wing triple-junction solar arrays for higher duty cycles.' },
      { id: 'high-eff-gimbal', name: 'Gimbaled High-Power Arrays', genW: 1250, massKg: 52, costM: 19, tip: 'Sun-tracking wings for SmallSat/Flagship power budgets.' }
    ],
    batteries: [
      { id: 'li-ion-compact', name: 'Compact Li-Ion Pack', wh: 90, massKg: 1.1, costM: 0.7, lifeBonus: 1.5, tip: 'Sufficient for short LEO eclipses.' },
      { id: 'li-ion-dual', name: 'Dual-String Li-Ion Array', wh: 650, massKg: 14, costM: 4.5, lifeBonus: 2.5, tip: 'High-cycle storage for SmallSat eclipse operations.' },
      { id: 'rad-hard-pack', name: 'Rad-Hardened Deep-Space Battery', wh: 3200, massKg: 68, costM: 21, lifeBonus: 4.0, tip: 'Built for lunar cold soak and multi-year missions.' }
    ],
    thermalAdcs: [
      { id: 'passive-mag', name: 'Passive Radiator + Magnetorquers', massKg: 0.9, powerW: 4, costM: 0.9, lifeBonus: 0.5, cryoCapable: false, tip: 'Low-cost CubeSat attitude & passive heat rejection.' },
      { id: 'rw-louver', name: 'Reaction Wheels + Thermal Louvers', massKg: 16, powerW: 28, costM: 6.5, lifeBonus: 1.2, cryoCapable: false, tip: 'Arcminute pointing precision for coastal imaging.' },
      { id: 'cryocooler-st', name: 'Active Cryocooler + Star Trackers', massKg: 92, powerW: 165, costM: 34, lifeBonus: 2.0, cryoCapable: true, tip: 'Required for Cryo-IR detectors & sub-arcsecond pointing.' }
    ]
  },
  launch: {
    vehicles: [
      { id: 'electron', name: 'Rocket Lab Electron', maxPayloadKg: 300, deepSpaceCapable: false, costM: 7.5, tip: 'Dedicated small launcher to Sun-Sync & Polar LEO.' },
      { id: 'falcon9-csli', name: 'Falcon 9 Rideshare', maxPayloadKg: 950, deepSpaceCapable: false, costM: 18.0, tip: 'Medium-lift orbital rideshare for CubeSats & SmallSats.' },
      { id: 'falcon-heavy', name: 'Falcon Heavy / Vulcan Heavy', maxPayloadKg: 4500, deepSpaceCapable: true, costM: 98.0, tip: 'Required mass & C3 energy for HEO and Lunar transfer.' }
    ],
    orbits: [
      { id: 'sso-leo', name: 'Sun-Synchronous LEO (575 km)', aKm: 6946, e: 0.002, iDeg: 97.7, raanDeg: 42, argPerigeeDeg: 90, meanAnomaly0Deg: 15, radPenalty: 0.2, deepSpace: false, tip: 'Consistent afternoon wildfire lighting; low radiation.' },
      { id: 'polar-leo', name: 'Polar Science LEO (680 km)', aKm: 7051, e: 0.003, iDeg: 98.1, raanDeg: 15, argPerigeeDeg: 45, meanAnomaly0Deg: 40, radPenalty: 0.3, deepSpace: false, tip: 'Global ocean & polar coverage every 14-15 orbits/day.' },
      { id: 'heo-molniya', name: 'HEO Molniya (600 x 39,700 km)', aKm: 26550, e: 0.737, iDeg: 63.4, raanDeg: 0, argPerigeeDeg: 270, meanAnomaly0Deg: 0, radPenalty: 1.4, deepSpace: true, tip: 'Long northern-hemisphere dwell; passes through Van Allen belts.' },
      { id: 'lunar-transfer', name: 'Lunar Transfer / High Orbit', aKm: 192000, e: 0.89, iDeg: 28.5, raanDeg: 20, argPerigeeDeg: 180, meanAnomaly0Deg: 10, radPenalty: 1.8, deepSpace: true, tip: 'High-energy trajectory to lunar south pole capture.' }
    ]
  },
  ground: {
    transceivers: [
      { id: 'uhf', name: 'UHF Telemetry Radio', massKg: 0.5, powerW: 6, mbps: 0.5, costM: 0.5, deepSpace: false, tip: 'Low-rate CubeSat beacon; bottleneck for rich imagery.' },
      { id: 'sx-band', name: 'S/X-Band High-Rate Transceiver', massKg: 2.2, powerW: 16, mbps: 45, costM: 2.1, deepSpace: false, tip: 'Rapid wildfire & ocean data dump over polar passes.' },
      { id: 'ka-optical', name: 'Ka-Band + Optical Terminal', massKg: 24, powerW: 85, mbps: 320, costM: 14.5, deepSpace: true, tip: 'High-bandwidth downlink built for SmallSat & Lunar range.' }
    ],
    stations: [
      { id: 'inuvik', name: 'Arctic Polar Station', passMinDay: 52, costM: 1.4, realtimeCapable: true, deepSpace: false, tip: 'High-latitude Arctic station ideal for polar and sun-sync passes.' },
      { id: 'nsn', name: 'Global Near-Space Network', passMinDay: 78, costM: 4.5, realtimeCapable: true, deepSpace: false, tip: 'Global ground station network for LEO and polar missions.' },
      { id: 'dsn', name: 'Deep-Space Dish Array', passMinDay: 110, costM: 26.0, realtimeCapable: false, deepSpace: true, tip: '70m deep-space dishes across three longitudes for HEO/Lunar links.' }
    ]
  }
};

const findById = (arr, id) => arr.find((x) => x.id === id) || null;

const PRESETS = {
  'wildfiresat-l1': { userObjective: 'wildfire-ir', wavelengthBand: 'ir', latencyTier: 'realtime', busId: '6u-cubesat', instrumentIds: ['ir-bolometer', 'arctic-multispec'], solarId: 'body-mounted', batteryId: 'li-ion-compact', thermalId: 'passive-mag', vehicleId: 'electron', orbitId: 'sso-leo', transceiverId: 'uhf', stationId: 'inuvik' },
  'ocean-l2': { userObjective: 'ocean-color', wavelengthBand: 'uv-vis', latencyTier: 'daily', busId: 'espa-smallsat', instrumentIds: ['oci-hyperspec'], solarId: 'deployable-wings', batteryId: 'li-ion-dual', thermalId: 'rw-louver', vehicleId: 'falcon9-csli', orbitId: 'polar-leo', transceiverId: 'sx-band', stationId: 'nsn' },
  'lunar-l3': { userObjective: 'lunar-volatiles', wavelengthBand: 'cryo-ir', latencyTier: 'archival', busId: 'flagship-bus', instrumentIds: ['cryo-ir-mapper', 'neutron-spec'], solarId: 'high-eff-gimbal', batteryId: 'rad-hard-pack', thermalId: 'rw-louver', vehicleId: 'falcon-heavy', orbitId: 'lunar-transfer', transceiverId: 'ka-optical', stationId: 'dsn' }
};

export function createInitialState(scenarioId = 'wildfiresat-l1', sandboxMode = false) {
  return { scenarioId, sandboxMode, ...(PRESETS[scenarioId] || PRESETS['wildfiresat-l1']) };
}

const CML_LABELS = {
  1: 'CML 1 · Concept Exploration',
  2: 'CML 2 · Initial Concept',
  3: 'CML 3 · Trade Study Active',
  4: 'CML 4 · Verified Point Design'
};

export function evaluateMissionDesign(state) {
  const sc = findById(SCENARIOS, state.scenarioId) || SCENARIOS[0];
  const obj = findById(CATALOG.user.objectives, state.userObjective);
  const band = findById(CATALOG.user.wavelengths, state.wavelengthBand);
  const lat = findById(CATALOG.user.latencies, state.latencyTier);
  const bus = findById(CATALOG.space.buses, state.busId);
  const insts = (state.instrumentIds || []).map((id) => findById(CATALOG.space.instruments, id)).filter(Boolean);
  const solar = findById(CATALOG.space.solarArrays, state.solarId);
  const batt = findById(CATALOG.space.batteries, state.batteryId);
  const therm = findById(CATALOG.space.thermalAdcs, state.thermalId);
  const veh = findById(CATALOG.launch.vehicles, state.vehicleId);
  const orbit = findById(CATALOG.launch.orbits, state.orbitId) || CATALOG.launch.orbits[0];
  const tx = findById(CATALOG.ground.transceivers, state.transceiverId);
  const gs = findById(CATALOG.ground.stations, state.stationId);

  const orbitStats = generateOrbitTrack(orbit, 96);
  const allPopulated = Boolean(obj && band && lat && bus && insts.length && solar && batt && therm && veh && orbit && tx && gs);

  const mel = [];
  const addMel = (segment, item, massKg = 0, powerW = 0, costM = 0) => {
    if (item) mel.push({ segment, item: item.name, massKg, powerW, costM });
  };
  addMel('Space · Bus', bus, bus?.massKg, bus?.basePowerW, bus?.costM);
  insts.forEach((i) => addMel('Space · Payload', i, i.massKg, i.powerW, i.costM));
  addMel('Space · Solar', solar, solar?.massKg, -(solar?.genW || 0), solar?.costM);
  addMel('Space · Battery', batt, batt?.massKg, 0, batt?.costM);
  addMel('Space · Thermal/ADCS', therm, therm?.massKg, therm?.powerW, therm?.costM);
  addMel('Launch', veh, 0, 0, veh?.costM);
  addMel('Ground · RF/Opt', tx, tx?.massKg, tx?.powerW, tx?.costM);
  addMel('Ground · Station', gs, 0, 0, gs?.costM);

  const payloadMassKg = insts.reduce((s, i) => s + i.massKg, 0) + (tx?.massKg || 0) + (therm?.massKg || 0);
  const totalMassKg = Number(mel.reduce((s, r) => s + r.massKg, 0).toFixed(1));
  const usedM = Number(mel.reduce((s, r) => s + r.costM, 0).toFixed(1));
  const avgLoadW = (bus?.basePowerW || 0) + insts.reduce((s, i) => s + i.powerW, 0) + (therm?.powerW || 0) + (tx?.powerW || 0) * 0.35;
  const avgGenW = (solar?.genW || 0) * Math.max(0.25, 1 - orbitStats.eclipseFraction);
  const powerMargin = Number((((avgGenW - avgLoadW) / Math.max(avgLoadW, 1)) * 100).toFixed(1));

  const generatedMbDay = insts.reduce((s, i) => s + i.dataMbDay, 0);
  const downlinkMbDay = (tx?.mbps || 0) * (gs?.passMinDay || 0) * 60 * 0.125 * (orbit.deepSpace && !tx?.deepSpace ? 0.05 : 1);
  const dataMargin = Number((((downlinkMbDay - generatedMbDay) / Math.max(generatedMbDay, 1)) * 100).toFixed(1));
  const lifetimeYears = Number(Math.max(0.5, (bus?.lifeBonus || 0) + (batt?.lifeBonus || 0) + (therm?.lifeBonus || 0) - orbit.radPenalty).toFixed(1));

  let science = insts.reduce((s, i) => s + (i.band === sc.targetBand ? i.sci : i.sci * 0.35), 0);
  if (obj?.id === sc.targetObjective) science += 12;
  if (band?.id === sc.targetBand) science += 10;
  if (lat?.id === sc.targetLatency) science += 8;
  if (orbit?.id === sc.targetOrbit) science += 8;
  if (powerMargin < 0) science -= 18;
  if (dataMargin < 0) science -= 18;
  const scienceScore = Math.max(0, Math.min(100, Math.round(science)));

  const warnings = [];
  const warn = (id, segment, text) => warnings.push({ id, segment, severity: 'error', text });
  if (!allPopulated) warn('incomplete', 'System', 'Populate all 4 Mission Segments (including at least 1 instrument).');
  if (!state.sandboxMode && usedM > sc.budgetLimitM) warn('budget', 'Cost', `Cost $${usedM}M exceeds $${sc.budgetLimitM}M mission cap.`);
  if (bus && payloadMassKg > bus.payloadCapKg) warn('bus-cap', 'Space', `Subsystem/payload (${payloadMassKg.toFixed(1)} kg) exceeds ${bus.name} limit (${bus.payloadCapKg} kg).`);
  if (!state.sandboxMode && veh && totalMassKg > veh.maxPayloadKg) warn('lv-cap', 'Launch', `Total mass (${totalMassKg} kg) exceeds ${veh.name} (${veh.maxPayloadKg} kg).`);
  if (powerMargin < 5) warn('power', 'Space', `Power margin (${powerMargin}%) too low across ${Math.round(orbitStats.eclipseFraction * 100)}% eclipse.`);
  if (dataMargin < 5) warn('data', 'Ground', `Downlink margin (${dataMargin}%) cannot clear ${generatedMbDay} MB/day.`);
  if (lifetimeYears < sc.minLifetimeYr) warn('life', 'Space', `Estimated lifetime (${lifetimeYears} yr) below ${sc.minLifetimeYr} yr goal.`);
  if (band && band.id !== sc.targetBand) warn('band', 'User', `${band.name} does not match scenario target (${sc.targetBand.toUpperCase()}).`);
  insts.forEach((i) => {
    if (band && i.band !== band.id) warn(`inst-band-${i.id}`, 'Space', `${i.name} wavelength mismatches ${band.name} (Webb rule).`);
    if (bus && !i.classes.includes(bus.busClass)) warn(`inst-bus-${i.id}`, 'Space', `${i.name} incompatible with ${bus.name} (Webb rule).`);
  });
  if ((band?.id === 'cryo-ir' || insts.some((i) => i.band === 'cryo-ir')) && !therm?.cryoCapable) warn('cryo', 'Space', 'Cryogenic IR requires Active Cryocooler + Star Trackers.');
  if (orbit.deepSpace && (!gs?.deepSpace || !veh?.deepSpaceCapable)) warn('deepspace', 'Launch', `${orbit.name} requires a heavy launcher and Deep-Space Dish Array.`);
  if (lat?.id === 'realtime' && gs && !gs.realtimeCapable) warn('latency', 'Ground', `${gs.name} cannot support <30 min real-time wildfire alerts.`);

  const cmlLevel = !allPopulated ? 1 : (warnings.length === 0 ? 4 : (warnings.length <= 2 ? 3 : 2));
  return {
    scenario: sc, allPopulated, cmlLevel, cmlLabel: CML_LABELS[cmlLevel],
    metrics: {
      budget: { usedM, limitM: sc.budgetLimitM, pct: Math.round((usedM / sc.budgetLimitM) * 100) },
      mass: { totalKg: totalMassKg, payloadKg: Number(payloadMassKg.toFixed(1)), busLimitKg: bus?.payloadCapKg || 0, launchLimitKg: veh?.maxPayloadKg || 0 },
      powerMargin, dataMargin, lifetimeYears, scienceScore
    },
    mel, warnings, orbitElements: orbit, orbitStats, missionMatch: sc.realMatch, sandboxMode: Boolean(state.sandboxMode)
  };
}
