import { generateOrbitTrack } from './missionVizPropagator.js';

export const OFFICIAL_RESOURCES = [
  { id: 1, agency: 'SYSTEMS', title: 'Spacecraft Systems Engineering Guide', url: 'https://en.wikipedia.org/wiki/Spacecraft_design' },
  { id: 2, agency: 'DESIGN', title: 'Mission Design Telemetry & Lab Framework', url: 'https://en.wikipedia.org/wiki/Concurrent_engineering' },
  { id: 3, agency: 'MATURITY', title: 'Concept Maturity & Readiness Scale (1–4)', url: 'https://en.wikipedia.org/wiki/Technology_readiness_level' },
  { id: 4, agency: 'ORBIT', title: 'Keplerian 3D Orbit Trajectory Spec', url: 'https://en.wikipedia.org/wiki/Keplerian_elements' },
  { id: 5, agency: 'OPTICS', title: 'Space Observatory Wavelength Rules', url: 'https://en.wikipedia.org/wiki/Infrared_astronomy' },
  { id: 6, agency: 'CUBESAT', title: 'CubeSat Systems & Standards', url: 'https://www.cubesat.org/cubesatinfo' },
  { id: 7, agency: 'SCIENCE', title: 'Arctic & Earth Observation Activities', url: 'https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp' }
];

export const SCENARIOS = [
  {
    id: 'wildfiresat-l1', level: 1, stars: '★☆☆', tag: 'Level 1 · CubeSat 101', badge: 'THERMAL IR', orbitIcon: '🛰️ SSO LEO 575km',
    name: 'Arctic Wildfire Watch',
    summary: 'Detect boreal wildfires & Arctic heat anomalies from Sun-Synchronous LEO on a tight CubeSat budget.',
    targetBand: 'ir', targetObjective: 'wildfire-ir', targetOrbit: 'sso-leo', targetLatency: 'realtime',
    budgetLimitM: 24, minLifetimeYr: 2, minScience: 75,
    realMatch: { name: 'WildFireSat', tag: 'WILDFIRE FLEET', detail: 'Thermal IR wildfire monitoring mission paired with rapid heat-anomaly orbital analytics.' },
    orbitGuide: {
      codename: 'OPERATION BOREAL WATCH',
      headline: 'Arctic Wildfire Watch · ★☆☆',
      about: 'High-latitude boreal wildfires ignite remote forests long before ground crews spot smoke. Your thermal infrared CubeSat measures mid-infrared heat signatures from Sun-Synchronous polar orbit to alert responders within minutes.',
      tasks: [
        { icon: '🔬', title: '1. Scan Zones -> 2. Buffer -> 3. Downlink', text: '1. Press [E] over Science Zones to fill your Data Buffer -> 2. Press [SPACE] over Ground Dishes to transmit! (3 Scans · 2 Downlinks)' },
        { icon: '🔋', title: 'Manage Nightside Eclipse Power', text: 'Keep Battery above 25% while passing through Earth’s dark eclipse shadow via your equipped Solar & Battery power margin.' },
        { icon: '🛡️', title: 'Resolve Mid-Orbit Space Events', text: 'Counter micrometeoroid or solar alerts cleanly with [1][2][3] tactical choices to protect Hull Integrity and earn bonus Science.' }
      ],
      proTip: 'Use 5x or 20x Time Warp to glide between Wildfire Plumes and Ground Dishes—each zone resets after 0.45 orbits and downlinks recharge every 10s!'
    }
  },
  {
    id: 'aurora-l1', level: 1, stars: '★☆☆', tag: 'Level 1 · Magnetics', badge: 'MAG-PLASMA', orbitIcon: '🌌 High-Arctic 680km',
    name: 'Ionosphere & Aurora Scout',
    summary: 'Measure geomagnetic storms and auroral particle currents across high-inclination polar orbits.',
    targetBand: 'mag-plasma', targetObjective: 'aurora-mag', targetOrbit: 'polar-leo', targetLatency: 'realtime',
    budgetLimitM: 32, minLifetimeYr: 2.5, minScience: 75,
    realMatch: { name: 'Swarm / e-POP Aurora Scout', tag: 'SPACE WEATHER', detail: 'Compact boom magnetometer & plasma analyzer mission mapping high-latitude ionospheric currents.' },
    orbitGuide: {
      codename: 'OPERATION POLAR CURTAIN',
      headline: 'Ionosphere & Aurora Scout · ★☆☆',
      about: 'Charged solar wind slamming into Earth’s poles drives geomagnetic storm currents while disrupting navigation signals and power grids. Your fluxgate magnetometer and plasma analyzer map cusp particle surges across high-latitude orbits.',
      tasks: [
        { icon: '🔬', title: '1. Scan Cusps -> 2. Buffer -> 3. Downlink', text: '1. Press [E] over Science Zones to fill your Data Buffer -> 2. Press [SPACE] over Ground Dishes to transmit! (3 Scans · 2 Downlinks)' },
        { icon: '☀️', title: 'Shield Optics During Solar Storms', text: 'Polar arcs face elevated solar particle surges—choose [1][2][3] ConOps protocols promptly so radiation spikes do not breach hull.' },
        { icon: '📡', title: 'Complete Multi-Pass Relays', text: 'Each Ground Station allows 1 downlink per flyover pass—capture multiple Magnetosphere Cusps while cruising to the next dish.' }
      ],
      proTip: 'Keep Hull Integrity high across the polar belt—every resolved mid-flight event unlocks Checklist progress and bonus points!'
    }
  },
  {
    id: 'ocean-l2', level: 2, stars: '★★☆', tag: 'Level 2 · SmallSat', badge: 'UV-VIS + LIDAR', orbitIcon: '🌊 Polar LEO 680km',
    name: 'Coastal Ocean & Reef Pulse',
    summary: 'Measure global phytoplankton, coral reef clarity, and coastal aerosols with Hyperspectral + LiDAR optics.',
    targetBand: 'uv-vis', targetObjective: 'ocean-color', targetOrbit: 'polar-leo', targetLatency: 'daily',
    budgetLimitM: 125, minLifetimeYr: 3, minScience: 80,
    realMatch: { name: 'PACE Coastal & Reef Orbiter', tag: 'OCEAN RADIOMETRY', detail: 'Hyperspectral radiometer paired with cloud/aerosol LiDAR for plankton and ocean color science.' },
    orbitGuide: {
      codename: 'OPERATION REEF SPECTRUM',
      headline: 'Coastal Ocean & Reef Pulse · ★★☆',
      about: 'Microscopic ocean phytoplankton generate half of Earth’s oxygen while coastal coral reefs signal warming ocean waters. Your Hyperspectral + LiDAR SmallSat captures crisp turquoise chlorophyll spectra and vertical aerosol profiles.',
      tasks: [
        { icon: '🌊', title: '1. Scan Reef Blooms -> 2. Buffer -> 3. Downlink', text: '1. Press [E] over Science Zones to fill your Data Buffer -> 2. Press [SPACE] over Ground Dishes to transmit! (4 Scans · 3 Downlinks)' },
        { icon: '🌑', title: 'Survive Earth Eclipse Passage', text: 'Endure 1 full nightside Earth eclipse pass while monitoring dual-payload power draw and maintaining positive battery margin.' },
        { icon: '🛠️', title: 'Resolve 2 Mid-Flight Space Events', text: 'A gimbal jam or solar flare tests flight ops mid-mission—select [1][2][3] engineering responses to keep science on schedule.' }
      ],
      proTip: 'Toggle Sensor Cam [C] when entering a Cyan Reef Bloom swath to watch live multi-band capture sweeps fill your buffer!'
    }
  },
  {
    id: 'monsoon-l2', level: 2, stars: '★★☆', tag: 'Level 2 · Radar Ops', badge: 'SAR RADAR', orbitIcon: '🌀 Medium SSO 575km',
    name: 'Monsoon & Cyclone All-Weather Eye',
    summary: 'Pierce dense storm clouds day and night using high-power Synthetic Aperture Radar imaging.',
    targetBand: 'rf-sar', targetObjective: 'cyclone-sar', targetOrbit: 'sso-leo', targetLatency: 'realtime',
    budgetLimitM: 155, minLifetimeYr: 3.5, minScience: 80,
    realMatch: { name: 'Sentinel / NISAR-Class Radar Eye', tag: 'ALL-WEATHER SAR', detail: 'High-wattage phased-array radar satellite delivering flood and cyclone mapping through thick cloud cover.' },
    orbitGuide: {
      codename: 'OPERATION CYCLONE PENETRATOR',
      headline: 'Monsoon & Cyclone All-Weather Eye · ★★☆',
      about: 'Optical cameras go blind above thick typhoon cloud decks right before dangerous landfalls. Your high-wattage Synthetic Aperture Radar (SAR) pulses right through cyclone eyewalls day and night to track flood surges.',
      tasks: [
        { icon: '🌀', title: '1. Scan Cyclone Eyes -> 2. Buffer -> 3. Downlink', text: '1. Press [E] over Science Zones to fill your Data Buffer -> 2. Press [SPACE] over Ground Dishes to transmit! (4 Scans · 3 Downlinks)' },
        { icon: '🌑', title: 'Endure Nightside Eclipse Power Draw', text: 'Complete 1 full eclipse transit smoothly without tripping power brownout.' },
        { icon: '🛡️', title: 'Resolve 2 Orbital ConOps Events', text: 'Protect your wide SAR phased-array wing through 2 mid-flight hazard protocols using [1][2][3].' }
      ],
      proTip: 'Jump to 5x or 20x Time Warp over open ocean legs, capture Cyclone Eyes on flyover with [E], then catch Ground Dish passes with [SPACE]!'
    }
  },
  {
    id: 'lunar-l3', level: 3, stars: '★★★', tag: 'Level 3 · Lunar Polar', badge: 'CRYO IR + NEUTRON', orbitIcon: '🌙 Lunar Orbit',
    name: 'Lunar South Pole Icebreaker',
    summary: 'Map permanently shadowed lunar craters for water ice using Cryo-IR spectroscopy and neutron detection.',
    targetBand: 'cryo-ir', targetObjective: 'lunar-volatiles', targetOrbit: 'lunar-transfer', targetLatency: 'archival',
    budgetLimitM: 520, minLifetimeYr: 5, minScience: 85,
    realMatch: { name: 'Lunar Polar Volatiles Flagship', tag: 'LUNAR ICEBREAKER', detail: 'Cryogenic infrared observatory coupled with neutron spectrometer and sunshield thermal control.' },
    orbitGuide: {
      codename: 'OPERATION SHACKLETON ICE',
      headline: 'Lunar South Pole Icebreaker · ★★★',
      about: 'Sunbeams have not touched the floors of deep Lunar South Pole craters for billions of years, trapping ancient pockets of water ice. Your cryogenic IR telescope and neutron spectrometer map subsurface hydrogen reserves for future explorers.',
      tasks: [
        { icon: '🌑', title: '1. Scan Lunar Craters -> 2. Buffer -> 3. Downlink', text: '1. Press [E] over Science Zones to fill your Data Buffer -> 2. Press [SPACE] over Ground Dishes to transmit! (5 Scans · 4 Downlinks)' },
        { icon: '❄️', title: 'Guard Deep-Space Cryo Balance', text: 'Long elliptical transfer arcs bring extreme thermal swings—resolve 2 mid-flight Space Hazards cleanly with [1][2][3].' },
        { icon: '📡', title: 'Relay Through Global Deep-Space Dishes', text: 'Transmit 1 buffered volatile dataset per Ground Station pass until all 4 archival downlinks are logged.' }
      ],
      proTip: 'Use 5x or 20x Time Warp along outer apogee arcs while sweeping Lunar crater scan gates, then downlink on each station link window!'
    }
  },
  {
    id: 'asteroid-l3', level: 3, stars: '★★★', tag: 'Level 3 · Deep Space', badge: 'ION + PROSPECT', orbitIcon: '☄️ Deep Elliptical',
    name: 'Near-Earth Asteroid Prospector',
    summary: 'Rendezvous with metallic near-Earth asteroids using multispectral optics, spectrometers, and Xenon Ion propulsion.',
    targetBand: 'deep-spec', targetObjective: 'asteroid-prospect', targetOrbit: 'lunar-transfer', targetLatency: 'archival',
    requiresIon: true,
    budgetLimitM: 640, minLifetimeYr: 6, minScience: 85,
    realMatch: { name: 'Psyche / Dawn Ion Prospector', tag: 'DEEP-SPACE ION', detail: 'Ion-propelled deep-space orbiter combining optical spyglass, multispectral imager, and gamma/neutron spectrometer.' },
    orbitGuide: {
      codename: 'OPERATION PSYCHE PROSPECTOR',
      headline: 'Near-Earth Asteroid Prospector · ★★★',
      about: 'Metallic near-Earth asteroids expose primordial iron-nickel planetary cores and water-bearing minerals from the birth of our solar system. Your Xenon Ion explorer pairs high-resolution optics with elemental spectrometers to prospect them up close.',
      tasks: [
        { icon: '☄️', title: '1. Prospect Waypoints -> 2. Buffer -> 3. Downlink', text: '1. Press [E] over Science Zones to fill your Data Buffer -> 2. Press [SPACE] over Ground Dishes to transmit! (5 Scans · 4 Downlinks)' },
        { icon: '⚙️', title: 'Resolve 2 Deep-Space ConOps Hazards', text: 'Counter solar flares, debris swarms, and cryo/gimbal faults via [1][2][3] to keep Xenon thrust & assay archives safe.' },
        { icon: '📡', title: 'Deliver 4 Deep-Space Downlinks', text: 'Buffer asteroid spectroscopy datasets along the ellipse, then transmit 1 per Ground Station pass with [SPACE].' }
      ],
      proTip: 'Try 🌌 Full Solar System cam to watch your deep transfer ellipse sweeping past asteroids, Comet C/2026 GOSPACE, and the planets!'
    }
  }
];

export const CATALOG = {
  user: {
    objectives: [
      { id: 'wildfire-ir', name: 'Wildfire Thermal Mapping', band: 'ir', tip: 'Monitor active fire radiative power across boreal forests.' },
      { id: 'aurora-mag', name: 'Auroral Field & Plasma Survey', band: 'mag-plasma', tip: 'Sample geomagnetic field lines and ionospheric storm currents.' },
      { id: 'ocean-color', name: 'Hyperspectral Ocean & Reef Color', band: 'uv-vis', tip: 'Track coastal chlorophyll, reefs, and atmospheric aerosols.' },
      { id: 'cyclone-sar', name: 'All-Weather Cyclone Radar', band: 'rf-sar', tip: 'Map floodplains & hurricane eyes through dense storm clouds.' },
      { id: 'lunar-volatiles', name: 'Lunar Polar Water-Ice Survey', band: 'cryo-ir', tip: 'Detect OH/H2O signatures inside shadowed polar craters.' },
      { id: 'asteroid-prospect', name: 'Near-Earth Asteroid Prospecting', band: 'deep-spec', tip: 'Map mineral composition and mass of metallic/carbonaceous NEAs.' }
    ],
    wavelengths: [
      { id: 'ir', name: 'Thermal IR (3–12 μm)', tip: 'Detects surface heat signatures; fits CubeSat microbolometers.' },
      { id: 'mag-plasma', name: 'Magnetics & Plasma Particles', tip: 'In-situ magnetic fluxgate and charged-particle space weather.' },
      { id: 'uv-vis', name: 'UV-Visible + LiDAR (340–890 nm)', tip: 'Captures ocean color, coral reefs, and vertical aerosol profiles.' },
      { id: 'rf-sar', name: 'L/X-Band SAR Microwave', tip: 'Active radar pulses penetrating thick clouds day and night.' },
      { id: 'cryo-ir', name: 'Cryogenic Mid-IR + Neutron', tip: 'Requires deployable cryo sunshield and cooled observatory optics.' },
      { id: 'deep-spec', name: 'Deep-Space Optical & Gamma Spec', tip: 'High-res optical mapping paired with elemental spectroscopy.' }
    ],
    latencies: [
      { id: 'realtime', name: 'Low-Latency Alerts (<30 min)', tip: 'Fast polar downlinks for fire & cyclone emergency teams.' },
      { id: 'daily', name: 'Daily Science Ops (6–24 hr)', tip: 'Balanced cadence for global ocean & climate forecasting.' },
      { id: 'archival', name: 'Deep-Space Archive (>24 hr)', tip: 'High-volume deep-space science buffered for DSN dish passes.' }
    ]
  },
  space: {
    buses: [
      { id: '1u-nanocube', name: '1U NanoCube', busClass: 'cubesat', payloadSlots: 1, massKg: 1.3, payloadCapKg: 1.6, basePowerW: 3, costM: 1.1, lifeBonus: 0.4, tip: 'Ultra-compact 10x10x10 cm nanosat with 1 payload slot.' },
      { id: '3u-cubesat', name: '3U CubeSat', busClass: 'cubesat', payloadSlots: 1, massKg: 2.8, payloadCapKg: 3.8, basePowerW: 5, costM: 1.8, lifeBonus: 0.7, tip: 'Standard 10x10x30 cm CubeSat chassis with 1 payload slot.' },
      { id: '6u-cubesat', name: '6U Pro CubeSat', busClass: 'cubesat', payloadSlots: 2, massKg: 4.5, payloadCapKg: 8.5, basePowerW: 9, costM: 3.4, lifeBonus: 1.0, tip: 'Double-wide 6U CubeSat supporting 2 simultaneous payloads.' },
      { id: '12u-cubesat', name: '12U Heavy CubeSat', busClass: 'cubesat', payloadSlots: 2, massKg: 14, payloadCapKg: 18, basePowerW: 16, costM: 6.5, lifeBonus: 1.5, tip: 'High-volume 12U frame with 2 slots for larger thermal/space weather optics.' },
      { id: 'espa-smallsat', name: 'Octagonal SmallSat Bus', busClass: 'smallsat', payloadSlots: 2, massKg: 85, payloadCapKg: 135, basePowerW: 65, costM: 22, lifeBonus: 2.5, tip: 'Agile 8-sided SmallSat platform with 2 payload mounting bays.' },
      { id: 'hex-orbiter', name: 'Modular Hex Orbiter', busClass: 'smallsat', payloadSlots: 3, massKg: 180, payloadCapKg: 320, basePowerW: 110, costM: 46, lifeBonus: 3.6, tip: 'Heavy 6-sided orbital bus supporting 3 science instruments & SAR power.' },
      { id: 'flagship-bus', name: 'Flagship Deep-Space Bus', busClass: 'flagship', payloadSlots: 3, massKg: 780, payloadCapKg: 980, basePowerW: 220, costM: 145, lifeBonus: 5.0, tip: 'Radiation-hardened flagship hub supporting 3 heavy observatory payloads.' }
    ],
    instruments: [
      { id: 'ir-bolometer', name: 'Micro Thermal IR Camera', band: 'ir', classes: ['cubesat', 'smallsat'], massKg: 2.4, powerW: 11, dataMbDay: 900, costM: 2.6, sci: 48, tip: 'Lightweight thermal wildfire camera (WildFireSat class).' },
      { id: 'arctic-multispec', name: 'Wide-Swath Multispectral Imager', band: 'ir', extraBands: ['deep-spec', 'uv-vis'], classes: ['cubesat', 'smallsat', 'flagship'], massKg: 1.6, powerW: 7, dataMbDay: 600, costM: 1.9, sci: 38, tip: 'Adds mid-IR cloud masking and deep-space mineral color bands.' },
      { id: 'oci-hyperspec', name: 'Hyperspectral Ocean Radiometer', band: 'uv-vis', classes: ['smallsat', 'flagship'], massKg: 58, powerW: 95, dataMbDay: 14000, costM: 24, sci: 50, tip: 'Precision ocean-color spectrometer mapping chlorophyll & coastal ecosystems.' },
      { id: 'sar-wing', name: 'Synthetic Aperture Radar (SAR) Wing', band: 'rf-sar', classes: ['smallsat', 'flagship'], massKg: 92, powerW: 340, dataMbDay: 22000, costM: 32, sci: 60, tip: 'All-weather active microwave radar wing; demands high solar power.' },
      { id: 'lidar-cloud', name: 'Cloud & Aerosol LiDAR Laser', band: 'uv-vis', extraBands: ['rf-sar'], classes: ['smallsat', 'flagship'], massKg: 34, powerW: 85, dataMbDay: 5200, costM: 16, sci: 36, tip: 'Active laser altimetry & reef depth/aerosol profiling.' },
      { id: 'cryo-ir-mapper', name: 'Cryogenic Deep-IR Telescope', band: 'cryo-ir', classes: ['flagship'], massKg: 240, powerW: 270, dataMbDay: 20000, costM: 88, sci: 54, tip: 'Observatory-class cooled infrared telescope for shadowed lunar craters.' },
      { id: 'boom-mag', name: 'Boom Fluxgate Magnetometer', band: 'mag-plasma', extraBands: ['deep-spec'], classes: ['cubesat', 'smallsat', 'flagship'], massKg: 1.1, powerW: 4, dataMbDay: 300, costM: 1.6, sci: 46, tip: 'Extends sensor tip on lattice boom away from bus magnetic noise.' },
      { id: 'neutron-spec', name: 'Gamma/Neutron Ice Spectrometer', band: 'cryo-ir', extraBands: ['deep-spec'], classes: ['smallsat', 'flagship'], massKg: 42, powerW: 45, dataMbDay: 2500, costM: 26, sci: 40, tip: 'Detects subsurface hydrogen/water ice and asteroid metal ratios.' },
      { id: 'plasma-analyzer', name: 'Solar & Dust Plasma Analyzer', band: 'mag-plasma', extraBands: ['deep-spec'], classes: ['cubesat', 'smallsat', 'flagship'], massKg: 1.8, powerW: 6, dataMbDay: 450, costM: 2.1, sci: 38, tip: 'Electrostatic Faraday cup analyzer for auroral & solar wind ions.' },
      { id: 'optical-spyglass', name: 'High-Res Optical Spyglass', band: 'deep-spec', extraBands: ['uv-vis'], classes: ['smallsat', 'flagship'], massKg: 110, powerW: 95, dataMbDay: 18000, costM: 44, sci: 48, tip: 'Long-focal baffled telescope for asteroid & planetary surface mapping.' }
    ],
    solarArrays: [
      { id: 'body-mounted', name: 'Body-Mounted Solar', genW: 16, massKg: 1.0, costM: 0.6, lifeBonus: 1.2, tip: 'Simple zero-deployment hull cells (~16 W avg).' },
      { id: 'deployable-wings', name: 'Deployable Dual Solar Wings', genW: 72, massKg: 3.2, costM: 2.2, lifeBonus: 1.6, tip: 'Dual-wing triple-junction solar arrays for CubeSats (~72 W).' },
      { id: 'quad-xwing', name: 'Quad X-Wing Solar Array', genW: 380, massKg: 18, costM: 8.5, lifeBonus: 2.0, tip: '4 diagonal angled X-wings delivering broad sun-angle power.' },
      { id: 'rollout-blanket', name: 'Roll-Out Flexible Blanket Array', genW: 760, massKg: 32, costM: 14, lifeBonus: 2.2, tip: 'Lightweight twin tubular booms unrolling wide high-watt solar sheets.' },
      { id: 'high-eff-gimbal', name: 'Compact Li-Ion + Triple-Junction Wings', genW: 1450, massKg: 54, costM: 22, lifeBonus: 2.8, tip: 'Integrated high-cycle Li-Ion storage & sun-tracking 3-panel wings.' },
      { id: 'rtg-nuclear', name: 'Radioisotope Generator (RTG)', genW: 620, massKg: 58, costM: 68, lifeBonus: 4.0, zeroEclipseLoss: true, tip: 'Nuclear finned cylinder: heavy/pricey, ZERO eclipse or deep-space power loss!' }
    ],
    batteries: [
      { id: 'li-ion-compact', name: 'Compact Li-Ion Pack', wh: 90, massKg: 1.1, costM: 0.7, lifeBonus: 0.3, tip: 'Baseline eclipse power storage.' },
      { id: 'li-ion-dual', name: 'Dual-String Li-Ion Array', wh: 650, massKg: 14, costM: 4.5, lifeBonus: 0.8, tip: 'High-cycle SmallSat eclipse storage.' },
      { id: 'rad-hard-pack', name: 'Rad-Hardened Deep-Space Battery', wh: 3200, massKg: 68, costM: 21, lifeBonus: 1.4, tip: 'Deep-space cold-soak battery pack.' }
    ],
    thermalAdcs: [
      { id: 'passive-mag', name: 'Passive Reaction Wheels Only', massKg: 0.9, powerW: 4, costM: 0.9, lifeBonus: 1.6, cryoCapable: false, tip: 'Lightweight magnetorquers, reaction wheels & passive radiator louver.' },
      { id: 'cold-gas-rcs', name: 'Cold-Gas RCS Micro-Thrusters', massKg: 3.2, powerW: 6, costM: 2.4, lifeBonus: 2.2, cryoCapable: false, tip: 'Nitrogen propellant tank + micro thruster quads for nimble slewing.' },
      { id: 'green-monoprop', name: 'Green Monopropellant Thruster', massKg: 14, powerW: 18, costM: 8.5, lifeBonus: 3.0, cryoCapable: false, tip: 'Catalytic thruster + spherical tank for station-keeping & drag makeup.' },
      { id: 'xenon-ion', name: 'Xenon Hall-Effect Ion Thruster', massKg: 28, powerW: 220, costM: 28, lifeBonus: 5.5, deepSpaceCapable: true, ionDrive: true, cryoCapable: false, tip: 'High-Isp glowing xenon plasma engine: massive lifetime/delta-V boost (+220W load).' },
      { id: 'cryocooler-st', name: 'Deployable Cryo Sunshield & Radiators', massKg: 74, powerW: 155, costM: 34, lifeBonus: 4.2, cryoCapable: true, tip: '4-layer sunshield + active cryocooler unlocking Cryogenic IR bonus.' }
    ],
    hullSkins: [
      { id: 'gold-kapton', name: 'Classic Gold Kapton Foil', colorHex: '#ebb328', tip: 'Iconic crinkled amber gold MLI thermal blanket.' },
      { id: 'silver-teflon', name: 'Silver Cryo Teflon', colorHex: '#dbeafe', tip: 'High-reflectance specular silver-white fluoropolymer tape.' },
      { id: 'matte-carbon', name: 'Matte Stealth Carbon', colorHex: '#1f2937', tip: 'Low-albedo carbon-composite structural panels.' },
      { id: 'white-beta', name: 'Aerospace White Beta-Cloth', colorHex: '#f1f5f9', tip: 'Woven silica thermal-control white outer layer.' }
    ]
  },
  launch: {
    vehicles: [
      { id: 'air-drop', name: 'Air-Drop Micro Booster', maxPayloadKg: 120, deepSpaceCapable: false, costM: 4.8, tip: 'Wing-launched solid/liquid micro rocket for 1U–6U LEO missions.' },
      { id: 'electron', name: 'Carbon Small-Lift', maxPayloadKg: 300, deepSpaceCapable: false, costM: 7.5, tip: 'Dedicated composite small launcher to Sun-Sync & Polar LEO.' },
      { id: 'rideshare-pod', name: 'Orbital Rideshare Pod', maxPayloadKg: 550, deepSpaceCapable: false, costM: 12.5, tip: 'Shared ESPA ring deployment pod balancing cost and payload mass.' },
      { id: 'falcon9-csli', name: 'Reusable Medium Booster', maxPayloadKg: 1100, deepSpaceCapable: false, costM: 19.0, tip: 'Propulsive-landing medium booster for heavy SmallSats.' },
      { id: 'twin-heavy', name: 'Twin-Booster Heavy Lift', maxPayloadKg: 3200, deepSpaceCapable: true, costM: 68.0, tip: 'Triple-core launcher with C3 energy for GTO, Molniya & Lunar runs.' },
      { id: 'falcon-heavy', name: 'Super-Heavy Deep-Space Stack', maxPayloadKg: 5200, deepSpaceCapable: true, costM: 105.0, tip: 'Maximum payload and escape-velocity stack for Flagship deep-space probes.' }
    ],
    orbits: [
      { id: 'eq-leo', name: 'Equatorial LEO (480 km)', aKm: 6851, e: 0.002, iDeg: 5.5, raanDeg: 10, argPerigeeDeg: 0, meanAnomaly0Deg: 25, radPenalty: 0.15, deepSpace: false, tip: 'Low-inclination tropical belt orbit; lowest launch delta-V.' },
      { id: 'sso-leo', name: 'Sun-Synchronous Polar LEO (575 km)', aKm: 6946, e: 0.002, iDeg: 97.7, raanDeg: 42, argPerigeeDeg: 90, meanAnomaly0Deg: 15, radPenalty: 0.2, deepSpace: false, tip: 'Consistent afternoon solar lighting for wildfires and SAR.' },
      { id: 'polar-leo', name: 'High-Arctic Polar (680 km)', aKm: 7051, e: 0.004, iDeg: 89.2, raanDeg: 15, argPerigeeDeg: 45, meanAnomaly0Deg: 40, radPenalty: 0.3, deepSpace: false, tip: 'True polar sweep crossing auroral ovals and oceans 14x/day.' },
      { id: 'heo-molniya', name: 'Highly Elliptical Molniya (600 x 39,700 km)', aKm: 26550, e: 0.737, iDeg: 63.4, raanDeg: 0, argPerigeeDeg: 270, meanAnomaly0Deg: 0, radPenalty: 1.4, deepSpace: true, tip: 'Long northern-hemisphere dwell; crosses Van Allen radiation belts.' },
      { id: 'gto-transfer', name: 'Geostationary Transfer (GTO)', aKm: 24360, e: 0.73, iDeg: 27.0, raanDeg: 35, argPerigeeDeg: 178, meanAnomaly0Deg: 12, radPenalty: 1.5, deepSpace: true, tip: 'High-apogee equatorial transfer ellipse requiring heavy C3.' },
      { id: 'lunar-transfer', name: 'Lunar & Deep-Space Elliptical', aKm: 192000, e: 0.89, iDeg: 28.5, raanDeg: 20, argPerigeeDeg: 180, meanAnomaly0Deg: 10, radPenalty: 1.8, deepSpace: true, tip: 'Deep-space trajectory for Lunar polar capture and asteroid flybys.' }
    ]
  },
  ground: {
    transceivers: [
      { id: 'uhf', name: 'UHF Quad Whip Rods', massKg: 0.5, powerW: 6, mbps: 0.5, costM: 0.5, deepSpace: false, tip: 'Low-rate CubeSat telemetry rods; bottlenecks image-heavy payloads.' },
      { id: 's-band', name: 'S-Band Patch Antenna', massKg: 1.4, powerW: 11, mbps: 14, costM: 1.4, deepSpace: false, tip: 'Flush S-Band array clearing CubeSat & plasma telemetry cleanly.' },
      { id: 'sx-band', name: 'X-Band Horn Transceiver', massKg: 2.2, powerW: 16, mbps: 45, costM: 2.1, deepSpace: false, tip: 'High-speed corrugated horn radio for rapid thermal & polar passes.' },
      { id: 'ka-mesh', name: 'Ka-Band Deployable Mesh Dish', massKg: 14, powerW: 52, mbps: 180, costM: 9.5, deepSpace: true, tip: 'Unfurling parabolic mesh dish for high-rate radar & ocean sweeps.' },
      { id: 'ka-optical', name: 'Deep-Space Laser Optical Comm', massKg: 24, powerW: 85, mbps: 420, costM: 18.5, deepSpace: true, tip: 'Gimbaled laser turret delivering maximum bandwidth across lunar distances.' }
    ],
    stations: [
      { id: 'inuvik', name: 'Arctic Polar Dish', passMinDay: 52, costM: 1.4, realtimeCapable: true, deepSpace: false, tip: 'High-latitude Arctic station ideal for polar and sun-sync passes.' },
      { id: 'nsn', name: 'Global Near-Space Network', passMinDay: 82, costM: 4.5, realtimeCapable: true, deepSpace: false, tip: 'Distributed global ground stations supporting LEO, radar & alerts.' },
      { id: 'dsn', name: 'Deep-Space Dish Array', passMinDay: 120, costM: 26.0, realtimeCapable: false, deepSpace: true, tip: '70m deep-space dishes across three longitudes for Lunar & asteroid links.' }
    ]
  }
};

const findById = (arr, id) => arr.find((x) => x.id === id) || null;

const PRESETS = {
  'wildfiresat-l1': { userObjective: 'wildfire-ir', wavelengthBand: 'ir', latencyTier: 'realtime', busId: '6u-cubesat', instrumentIds: ['ir-bolometer', 'arctic-multispec'], solarId: 'body-mounted', batteryId: 'li-ion-compact', thermalId: 'passive-mag', hullSkinId: 'gold-kapton', vehicleId: 'electron', orbitId: 'sso-leo', transceiverId: 'uhf', stationId: 'inuvik' },
  'aurora-l1': { userObjective: 'aurora-mag', wavelengthBand: 'mag-plasma', latencyTier: 'realtime', busId: '6u-cubesat', instrumentIds: ['boom-mag', 'plasma-analyzer'], solarId: 'deployable-wings', batteryId: 'li-ion-compact', thermalId: 'cold-gas-rcs', hullSkinId: 'silver-teflon', vehicleId: 'electron', orbitId: 'polar-leo', transceiverId: 's-band', stationId: 'inuvik' },
  'ocean-l2': { userObjective: 'ocean-color', wavelengthBand: 'uv-vis', latencyTier: 'daily', busId: 'espa-smallsat', instrumentIds: ['oci-hyperspec', 'lidar-cloud'], solarId: 'rollout-blanket', batteryId: 'li-ion-dual', thermalId: 'green-monoprop', hullSkinId: 'white-beta', vehicleId: 'falcon9-csli', orbitId: 'polar-leo', transceiverId: 'ka-mesh', stationId: 'nsn' },
  'monsoon-l2': { userObjective: 'cyclone-sar', wavelengthBand: 'rf-sar', latencyTier: 'realtime', busId: 'hex-orbiter', instrumentIds: ['sar-wing', 'lidar-cloud'], solarId: 'rollout-blanket', batteryId: 'li-ion-dual', thermalId: 'green-monoprop', hullSkinId: 'matte-carbon', vehicleId: 'falcon9-csli', orbitId: 'sso-leo', transceiverId: 'ka-mesh', stationId: 'nsn' },
  'lunar-l3': { userObjective: 'lunar-volatiles', wavelengthBand: 'cryo-ir', latencyTier: 'archival', busId: 'flagship-bus', instrumentIds: ['cryo-ir-mapper', 'neutron-spec'], solarId: 'high-eff-gimbal', batteryId: 'rad-hard-pack', thermalId: 'cryocooler-st', hullSkinId: 'silver-teflon', vehicleId: 'falcon-heavy', orbitId: 'lunar-transfer', transceiverId: 'ka-optical', stationId: 'dsn' },
  'asteroid-l3': { userObjective: 'asteroid-prospect', wavelengthBand: 'deep-spec', latencyTier: 'archival', busId: 'flagship-bus', instrumentIds: ['optical-spyglass', 'arctic-multispec', 'neutron-spec'], solarId: 'rtg-nuclear', batteryId: 'rad-hard-pack', thermalId: 'xenon-ion', hullSkinId: 'gold-kapton', vehicleId: 'falcon-heavy', orbitId: 'lunar-transfer', transceiverId: 'ka-optical', stationId: 'dsn' }
};

const OPTIMAL_LOADOUTS = {
  'wildfiresat-l1': { userObjective: 'wildfire-ir', wavelengthBand: 'ir', latencyTier: 'realtime', busId: '6u-cubesat', instrumentIds: ['ir-bolometer', 'arctic-multispec'], solarId: 'deployable-wings', batteryId: 'li-ion-compact', thermalId: 'passive-mag', hullSkinId: 'gold-kapton', vehicleId: 'electron', orbitId: 'sso-leo', transceiverId: 'sx-band', stationId: 'inuvik' },
  'aurora-l1': { userObjective: 'aurora-mag', wavelengthBand: 'mag-plasma', latencyTier: 'realtime', busId: '6u-cubesat', instrumentIds: ['boom-mag', 'plasma-analyzer'], solarId: 'deployable-wings', batteryId: 'li-ion-compact', thermalId: 'cold-gas-rcs', hullSkinId: 'silver-teflon', vehicleId: 'electron', orbitId: 'polar-leo', transceiverId: 's-band', stationId: 'inuvik' },
  'ocean-l2': { userObjective: 'ocean-color', wavelengthBand: 'uv-vis', latencyTier: 'daily', busId: 'espa-smallsat', instrumentIds: ['oci-hyperspec', 'lidar-cloud'], solarId: 'rollout-blanket', batteryId: 'li-ion-dual', thermalId: 'green-monoprop', hullSkinId: 'white-beta', vehicleId: 'falcon9-csli', orbitId: 'polar-leo', transceiverId: 'ka-mesh', stationId: 'nsn' },
  'monsoon-l2': { userObjective: 'cyclone-sar', wavelengthBand: 'rf-sar', latencyTier: 'realtime', busId: 'espa-smallsat', instrumentIds: ['sar-wing'], solarId: 'high-eff-gimbal', batteryId: 'li-ion-dual', thermalId: 'green-monoprop', hullSkinId: 'matte-carbon', vehicleId: 'falcon9-csli', orbitId: 'sso-leo', transceiverId: 'ka-mesh', stationId: 'nsn' },
  'lunar-l3': { userObjective: 'lunar-volatiles', wavelengthBand: 'cryo-ir', latencyTier: 'archival', busId: 'flagship-bus', instrumentIds: ['cryo-ir-mapper', 'neutron-spec'], solarId: 'high-eff-gimbal', batteryId: 'rad-hard-pack', thermalId: 'cryocooler-st', hullSkinId: 'silver-teflon', vehicleId: 'falcon-heavy', orbitId: 'lunar-transfer', transceiverId: 'ka-optical', stationId: 'dsn' },
  'asteroid-l3': { userObjective: 'asteroid-prospect', wavelengthBand: 'deep-spec', latencyTier: 'archival', busId: 'flagship-bus', instrumentIds: ['optical-spyglass', 'arctic-multispec', 'plasma-analyzer'], solarId: 'high-eff-gimbal', batteryId: 'rad-hard-pack', thermalId: 'xenon-ion', hullSkinId: 'gold-kapton', vehicleId: 'falcon-heavy', orbitId: 'lunar-transfer', transceiverId: 'ka-optical', stationId: 'dsn' }
};

export function getOptimalLoadoutForMission(missionId) {
  const key = OPTIMAL_LOADOUTS[missionId] ? missionId : 'wildfiresat-l1';
  const build = OPTIMAL_LOADOUTS[key];
  return { ...build, instrumentIds: [...build.instrumentIds] };
}

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
  const skin = findById(CATALOG.space.hullSkins, state.hullSkinId || 'gold-kapton');
  const veh = findById(CATALOG.launch.vehicles, state.vehicleId);
  const orbit = findById(CATALOG.launch.orbits, state.orbitId) || CATALOG.launch.orbits[0];
  const tx = findById(CATALOG.ground.transceivers, state.transceiverId);
  const gs = findById(CATALOG.ground.stations, state.stationId);

  const orbitStats = generateOrbitTrack(orbit, 96);
  const allPopulated = Boolean(obj && band && lat && bus && insts.length && solar && therm && veh && orbit && tx && gs);

  const mel = [];
  const addMel = (segment, item, massKg = 0, powerW = 0, costM = 0) => {
    if (item) mel.push({ segment, item: item.name, massKg, powerW, costM });
  };
  addMel('Space · Bus', bus, bus?.massKg, bus?.basePowerW, bus?.costM);
  insts.forEach((i) => addMel('Space · Payload', i, i.massKg, i.powerW, i.costM));
  addMel('Space · Power', solar, solar?.massKg, -(solar?.genW || 0), solar?.costM);
  addMel('Space · Prop/Thermal', therm, therm?.massKg, therm?.powerW, therm?.costM);
  addMel('Space · Skin', skin, 0, 0, 0);
  addMel('Launch', veh, 0, 0, veh?.costM);
  addMel('Ground · RF/Opt', tx, tx?.massKg, tx?.powerW, tx?.costM);
  addMel('Ground · Station', gs, 0, 0, gs?.costM);

  const payloadMassKg = insts.reduce((s, i) => s + i.massKg, 0) + (tx?.massKg || 0) + (therm?.massKg || 0);
  const totalMassKg = Number(mel.reduce((s, r) => s + r.massKg, 0).toFixed(1));
  const usedM = Number(mel.reduce((s, r) => s + r.costM, 0).toFixed(1));
  const avgLoadW = (bus?.basePowerW || 0) + insts.reduce((s, i) => s + i.powerW, 0) + (therm?.powerW || 0) + (tx?.powerW || 0) * 0.35;
  const eclipseMult = solar?.zeroEclipseLoss ? 1.0 : Math.max(0.25, 1 - orbitStats.eclipseFraction);
  const avgGenW = (solar?.genW || 0) * eclipseMult;
  const powerMargin = Number((((avgGenW - avgLoadW) / Math.max(avgLoadW, 1)) * 100).toFixed(1));

  const generatedMbDay = insts.reduce((s, i) => s + i.dataMbDay, 0);
  const downlinkMbDay = (tx?.mbps || 0) * (gs?.passMinDay || 0) * 60 * 0.125 * (orbit.deepSpace && !tx?.deepSpace ? 0.05 : 1);
  const dataMargin = Number((((downlinkMbDay - generatedMbDay) / Math.max(generatedMbDay, 1)) * 100).toFixed(1));
  const lifetimeYears = Number(Math.max(0.5, (bus?.lifeBonus || 0) + (solar?.lifeBonus || 0) + (therm?.lifeBonus || 0) - orbit.radPenalty).toFixed(1));

  const instMatchesBand = (i, bId) => i.band === bId || (i.extraBands || []).includes(bId);
  let science = insts.reduce((s, i) => s + (instMatchesBand(i, sc.targetBand) ? i.sci : i.sci * 0.35), 0);
  if (obj?.id === sc.targetObjective) science += 12;
  if (band?.id === sc.targetBand) science += 10;
  if (lat?.id === sc.targetLatency) science += 8;
  if (orbit?.id === sc.targetOrbit) science += 8;
  if (therm?.cryoCapable && sc.targetBand === 'cryo-ir') science += 6;
  if (therm?.ionDrive && sc.requiresIon) science += 8;
  if (powerMargin < 0) science -= 18;
  if (dataMargin < 0) science -= 18;
  const scienceScore = Math.max(0, Math.min(100, Math.round(science)));

  const warnings = [];
  const warn = (id, segment, text) => warnings.push({ id, segment, severity: 'error', text });
  if (!allPopulated) warn('incomplete', 'System', 'Populate all 4 Mission Segments (including at least 1 instrument).');
  if (!state.sandboxMode && usedM > sc.budgetLimitM) warn('budget', 'Cost', `Cost $${usedM}M exceeds $${sc.budgetLimitM}M mission cap.`);
  if (bus && insts.length > (bus.payloadSlots || 1)) warn('slots', 'Space', `Equipped ${insts.length} instruments; ${bus.name} supports ${bus.payloadSlots} payload slot(s).`);
  if (bus && payloadMassKg > bus.payloadCapKg) warn('bus-cap', 'Space', `Subsystem/payload (${payloadMassKg.toFixed(1)} kg) exceeds ${bus.name} limit (${bus.payloadCapKg} kg).`);
  if (!state.sandboxMode && veh && totalMassKg > veh.maxPayloadKg) warn('lv-cap', 'Launch', `Total mass (${totalMassKg} kg) exceeds ${veh.name} (${veh.maxPayloadKg} kg).`);
  if (powerMargin < 5) warn('power', 'Space', `Power margin (${powerMargin}%) too low across ${solar?.zeroEclipseLoss ? 'RTG ops' : `${Math.round(orbitStats.eclipseFraction * 100)}% eclipse`}.`);
  if (dataMargin < 5) warn('data', 'Ground', `Downlink margin (${dataMargin}%) cannot clear ${generatedMbDay} MB/day.`);
  if (lifetimeYears < sc.minLifetimeYr) warn('life', 'Space', `Estimated lifetime (${lifetimeYears} yr) below ${sc.minLifetimeYr} yr goal.`);
  if (band && band.id !== sc.targetBand) warn('band', 'User', `${band.name} does not match scenario target (${sc.targetBand.toUpperCase()}).`);
  insts.forEach((i) => {
    if (band && !instMatchesBand(i, band.id)) warn(`inst-band-${i.id}`, 'Space', `${i.name} wavelength mismatches ${band.name} (Observatory rule).`);
    if (bus && !i.classes.includes(bus.busClass)) warn(`inst-bus-${i.id}`, 'Space', `${i.name} incompatible with ${bus.name} (Bus class rule).`);
  });
  if ((band?.id === 'cryo-ir' || insts.some((i) => i.band === 'cryo-ir')) && !therm?.cryoCapable) warn('cryo', 'Space', 'Cryogenic IR requires Deployable Cryo Sunshield & Radiators.');
  if (sc.requiresIon && !therm?.ionDrive) warn('ion', 'Space', 'Deep-Space Asteroid mission requires Xenon Hall-Effect Ion Thruster.');
  if (orbit.deepSpace && (!gs?.deepSpace || !veh?.deepSpaceCapable)) warn('deepspace', 'Launch', `${orbit.name} requires a heavy launcher and Deep-Space Dish Array.`);
  if (lat?.id === 'realtime' && gs && !gs.realtimeCapable) warn('latency', 'Ground', `${gs.name} cannot support <30 min real-time alerts.`);

  const designRisks = {
    massOverrun: !state.sandboxMode && Boolean((veh && totalMassKg > veh.maxPayloadKg) || (bus && payloadMassKg > bus.payloadCapKg)),
    lowPowerMargin: powerMargin < 5,
    weakCommsMargin: dataMargin < 5 || Boolean(lat?.id === 'realtime' && gs && !gs.realtimeCapable) || Boolean(orbit.deepSpace && !tx?.deepSpace),
    wavelengthMismatch: Boolean(band && band.id !== sc.targetBand) || insts.some((i) => (band && !instMatchesBand(i, band.id)) || !instMatchesBand(i, sc.targetBand)),
    budgetOverrun: !state.sandboxMode && usedM > sc.budgetLimitM,
    lowLifetime: lifetimeYears < sc.minLifetimeYr
  };

  const cmlLevel = !allPopulated ? 1 : (warnings.length === 0 ? 4 : (warnings.length <= 2 ? 3 : 2));
  return {
    scenario: sc, allPopulated, cmlLevel, cmlLabel: CML_LABELS[cmlLevel],
    metrics: {
      budget: { usedM, limitM: sc.budgetLimitM, pct: Math.round((usedM / sc.budgetLimitM) * 100) },
      mass: { totalKg: totalMassKg, payloadKg: Number(payloadMassKg.toFixed(1)), busLimitKg: bus?.payloadCapKg || 0, launchLimitKg: veh?.maxPayloadKg || 0 },
      powerMargin, dataMargin, lifetimeYears, scienceScore
    },
    mel, warnings, designRisks, orbitElements: orbit, orbitStats, missionMatch: sc.realMatch, sandboxMode: Boolean(state.sandboxMode)
  };
}

export const SANDBOX_ORBIT_GUIDE_FALLBACK = {
  codename: 'SANDBOX FREEPLAY FLIGHT',
  headline: 'Custom Orbital Architecture · FREEPLAY',
  about: 'Unlimited budget and rocket payload mass let you test daring satellite builds without procurement caps. Push extreme sensors, RTGs, or Xenon Ion drives into real Keplerian orbits and watch how they withstand live space hazards.',
  tasks: [
    { icon: '🔬', title: '1. Scan Zones -> 2. Buffer -> 3. Downlink', text: '1. Press [E] over Science Zones to fill your Data Buffer -> 2. Press [SPACE] over Ground Dishes to transmit!' },
    { icon: '📡', title: 'Test Multi-Pass Downlinks', text: 'Each Ground Station recharges on a 10s (or 0.18-orbit) downlink cooldown, and each scanned Scan Gate resets in 0.45 orbits.' },
    { icon: '⚠️', title: 'Stress-Test Orbital Hazards', text: 'Click ⚠️ Trigger Hazard or survive incoming debris, solar flares, and cryo freezes via [1][2][3] ConOps protocols.' }
  ],
  proTip: 'Equip Xenon Ion, Cryo Sunshields, or RTGs in the Hangar to unlock zero-damage emergency counter-moves in Orbit!'
};

export function getMissionOrbitGuide(scenario, sandboxMode = false) {
  const g = scenario?.orbitGuide;
  if (!g) return SANDBOX_ORBIT_GUIDE_FALLBACK;
  if (!sandboxMode) return g;
  return {
    ...g,
    codename: `${g.codename} · SANDBOX`,
    headline: `${scenario.name} · SANDBOX FREEPLAY`,
    proTip: `Sandbox Active (unlimited budget & rocket mass): ${g.proTip}`
  };
}

export const CELESTIAL_DATABASE = {
  sun: {
    id: 'sun',
    name: 'The Sun',
    emblem: '☀️',
    accent: '#fbbf24',
    classification: 'G-Type Main-Sequence Star',
    stats: {
      gravity: '274.0 m/s²',
      dayLength: '25.4 Earth days',
      orbitalPeriod: '230 Myr (Galactic)',
      tempRange: '5,500 °C surface · 15M °C core',
      distanceAU: '0.00 AU'
    },
    scienceFact: 'Containing 99.86% of the Solar System’s mass, the Sun fuses 600 million tons of hydrogen into helium every second while driving space weather across every planetary magnetosphere. Robotic sentinels like Parker Solar Probe and ESA’s Solar Orbiter dive into its superheated corona to forecast coronal mass ejections.'
  },
  mercury: {
    id: 'mercury',
    name: 'Mercury',
    emblem: '🪨',
    accent: '#cbd5e1',
    classification: 'Terrestrial Planet',
    stats: {
      gravity: '3.70 m/s²',
      dayLength: '1,408 hrs (58.6d)',
      orbitalPeriod: '88 Earth days',
      tempRange: '-180 °C to +430 °C',
      distanceAU: '0.39 AU'
    },
    scienceFact: 'Mercury possesses an oversized iron core spanning roughly 85% of its radius and hides permanently shadowed polar craters cold enough to trap water ice. Following MESSENGER’s orbital mapping, the joint ESA/JAXA BepiColombo mission uses electric ion propulsion and solar shields to probe its faint magnetosphere.'
  },
  venus: {
    id: 'venus',
    name: 'Venus',
    emblem: '🌫️',
    accent: '#fde68a',
    classification: 'Terrestrial Planet',
    stats: {
      gravity: '8.87 m/s²',
      dayLength: '5,832 hrs (Retrograde)',
      orbitalPeriod: '225 Earth days',
      tempRange: '+462 °C surface avg',
      distanceAU: '0.72 AU'
    },
    scienceFact: 'Shrouded in thick sulfuric-acid clouds and 92-bar carbon dioxide pressure, Venus experiences a runaway greenhouse hotter than Mercury’s equator despite reflecting most sunlight. Orbiters such as JAXA’s Akatsuki and upcoming radar mappers like VERITAS and EnVision peer beneath its clouds to study active volcanism.'
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    emblem: '🌍',
    accent: '#38bdf8',
    classification: 'Oceanic Terrestrial Planet',
    stats: {
      gravity: '9.81 m/s²',
      dayLength: '23h 56m',
      orbitalPeriod: '365.25 days',
      tempRange: '-89 °C to +57 °C',
      distanceAU: '1.00 AU'
    },
    scienceFact: 'Earth is the only known world sustaining global liquid surface oceans, plate tectonics, and a protective dipole magnetosphere that deflects ionizing solar wind. Fleets of Earth-observation satellites including CSA’s WildFireSat, Swarm, and Sentinel constellations monitor wildfire heat, reefs, and ice loss in real time.'
  },
  moon: {
    id: 'moon',
    name: 'The Moon',
    emblem: '🌙',
    accent: '#e2e8f0',
    classification: 'Terrestrial Natural Satellite',
    stats: {
      gravity: '1.62 m/s²',
      dayLength: '708.7 hrs (Tidally Locked)',
      orbitalPeriod: '27.3 days',
      tempRange: '-246 °C craters to +121 °C',
      distanceAU: '1.00 AU (384,400 km)'
    },
    scienceFact: 'Tidally locked to Earth, the Moon preserves a 4-billion-year impact record alongside volatile water-ice deposits hidden inside South Pole craters such as Shackleton. Lunar Reconnaissance Orbiter, Chandrayaan-3, and Artemis polar scouts map hydrogen ice and shadowed illumination corridors for future habitats.'
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    emblem: '🔴',
    accent: '#fb923c',
    classification: 'Terrestrial Planet',
    stats: {
      gravity: '3.72 m/s²',
      dayLength: '24h 37m (1 Sol)',
      orbitalPeriod: '687 Earth days',
      tempRange: '-140 °C to +20 °C',
      distanceAU: '1.52 AU'
    },
    scienceFact: 'Carved by ancient river deltas and crowned by Olympus Mons, Mars retains polar CO₂ and water-ice caps beneath a wispy 0.6% carbon-dioxide atmosphere. Rovers Curiosity and Perseverance—supported by Ingenuity’s historic rotorcraft flights and Mars Reconnaissance Orbiter—search Jezero Crater for ancient biosignatures.'
  },
  'asteroid-belt': {
    id: 'asteroid-belt',
    name: 'Main Asteroid Belt',
    emblem: '☄️',
    accent: '#94a3b8',
    classification: 'Main-Belt Debris Zone',
    stats: {
      gravity: '0.01–0.28 m/s²',
      dayLength: '4–18 hrs rotation',
      orbitalPeriod: '3.2–6.0 years',
      tempRange: '-110 °C to -30 °C',
      distanceAU: '2.2–3.2 AU'
    },
    scienceFact: 'Between Mars and Jupiter orbit hundreds of thousands of primordial planetesimals sculpted by Jovian gravitational resonances into silicate, metallic, and carbon-rich worlds. Sample-return pioneers Hayabusa2 and OSIRIS-REx alongside Dawn’s survey of Vesta and Ceres unlocked pristine clues to planet formation.'
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    emblem: '🟠',
    accent: '#fdba74',
    classification: 'Gas Giant',
    stats: {
      gravity: '24.79 m/s²',
      dayLength: '9h 55m',
      orbitalPeriod: '11.86 years',
      tempRange: '-145 °C cloud tops',
      distanceAU: '5.20 AU'
    },
    scienceFact: 'Over twice as massive as all other planets combined, Jupiter spins in under ten hours, powering banded jet streams, megawatt polar auroras, and intense radiation belts. While the Juno polar orbiter probes its deep metallic-hydrogen interior, JUICE and Europa Clipper race toward icy ocean moons Europa and Ganymede.'
  },
  saturn: {
    id: 'saturn',
    name: 'Saturn',
    emblem: '🪐',
    accent: '#fcd34d',
    classification: 'Ringed Gas Giant',
    stats: {
      gravity: '10.44 m/s²',
      dayLength: '10h 33m',
      orbitalPeriod: '29.45 years',
      tempRange: '-178 °C cloud tops',
      distanceAU: '9.54 AU'
    },
    scienceFact: 'Less dense than liquid water, Saturn wears a shimmering 282,000-km ring system sculpted by shepherd moons and Enceladus’s cryogenic water plumes. Over 13 years in orbit, the Cassini-Huygens mission revealed a hexagonal polar jet stream and landed on Titan’s liquid-methane shorelines—soon to be explored by Dragonfly.'
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus',
    emblem: '🩵',
    accent: '#67e8f9',
    classification: 'Ice Giant',
    stats: {
      gravity: '8.69 m/s²',
      dayLength: '17h 14m',
      orbitalPeriod: '84.0 years',
      tempRange: '-224 °C (Coldest)',
      distanceAU: '19.2 AU'
    },
    scienceFact: 'Tipped sideways at a dramatic 97.8° axial tilt, Uranus rolls around the Sun with 42-year polar summers and winters above a pressurized mantle of water, ammonia, and methane ices. Voyager 2 remains the sole spacecraft ever to fly past its faint dark rings and canyon-scarred moon Miranda in 1986.'
  },
  neptune: {
    id: 'neptune',
    name: 'Neptune',
    emblem: '🔵',
    accent: '#60a5fa',
    classification: 'Ice Giant',
    stats: {
      gravity: '11.15 m/s²',
      dayLength: '16h 06m',
      orbitalPeriod: '164.8 years',
      tempRange: '-214 °C cloud tops',
      distanceAU: '30.1 AU'
    },
    scienceFact: 'Driven by internal heat, Neptune whips supersonic methane winds above 2,100 km/h—faster than any other planet despite receiving tiny sunlight at the Solar System’s edge. During Voyager 2’s 1989 flyby, its cameras captured active nitrogen geysers erupting across Triton’s frost-coated plains.'
  },
  'gs-inuvik': {
    id: 'gs-inuvik',
    name: 'Arctic Polar Station (Inuvik)',
    emblem: '📡',
    accent: '#34d399',
    classification: 'Polar Downlink Station',
    stats: {
      gravity: '9.82 m/s² (68.4° N)',
      dayLength: '14 passes / day',
      orbitalPeriod: 'S / X / Ka-Band',
      tempRange: '-42 °C to +22 °C',
      distanceAU: '1.00 AU · 13m Dish'
    },
    scienceFact: 'Positioned inside the Arctic Circle at 68.36° N, high-latitude polar ground dishes catch Sun-Synchronous and Polar LEO satellites on nearly every single orbit around Earth. Its radome-protected S/X/Ka-band antennas rush urgent wildfire hotspot and ice-sheet telemetry to mission ops within seconds.'
  },
  'gs-nsn': {
    id: 'gs-nsn',
    name: 'Global Near-Space Network',
    emblem: '📡',
    accent: '#38bdf8',
    classification: 'Mid-Latitude Tracking Complex',
    stats: {
      gravity: '9.80 m/s² (37.9° N)',
      dayLength: '24/7 Relay Coverage',
      orbitalPeriod: 'S / Ka / Optical',
      tempRange: '-10 °C to +35 °C',
      distanceAU: '1.00 AU · 18m Dish'
    },
    scienceFact: 'Mid-latitude coastal tracking arrays coordinate high-rate launch ascent telemetry, CubeSat command uplinks, and orbital anomaly recovery passes across inclinations from 35° to Polar. Dual S-band and optical ground terminals deliver continuous health monitoring during atmospheric entry and orbital insertion.'
  },
  'gs-dsn': {
    id: 'gs-dsn',
    name: 'Deep-Space Dish Array',
    emblem: '🛰️',
    accent: '#a78bfa',
    classification: 'Deep-Space Telemetry Array',
    stats: {
      gravity: '9.80 m/s² (35.4° N)',
      dayLength: 'Continuous Interplanetary',
      orbitalPeriod: 'X / Ka / Laser Link',
      tempRange: '-5 °C to +44 °C',
      distanceAU: '1.00 AU · 70m Array'
    },
    scienceFact: 'Steerable 70-meter parabolic reflectors in arid desert basins detect whisper-faint attowatt radio signals arriving across millions of kilometers from lunar, Martian, and outer-planet probes. Three longitudinally spaced arrays maintain uninterrupted contact with deep-space spacecraft as Earth rotates.'
  },
  'gs-svalbard': {
    id: 'gs-svalbard',
    name: 'Svalbard Polar Relay',
    emblem: '📡',
    accent: '#22d3ee',
    classification: 'High-Arctic Telemetry Hub',
    stats: {
      gravity: '9.83 m/s² (78.2° N)',
      dayLength: '14 polar passes / day',
      orbitalPeriod: 'S / X / Ka-Band',
      tempRange: '-30 °C to +10 °C',
      distanceAU: '1.00 AU · 14m Radome'
    },
    scienceFact: 'Located inside the High Arctic at 78.23° N in Svalbard, Norway, this extreme-latitude dish complex tracks polar-orbiting climate, wildfire, and space-weather satellites on nearly every revolution around Earth.'
  },
  'gs-canberra': {
    id: 'gs-canberra',
    name: 'Southern Cross Dish Complex',
    emblem: '📡',
    accent: '#34d399',
    classification: 'Southern Hemisphere Tracking Station',
    stats: {
      gravity: '9.80 m/s² (35.4° S)',
      dayLength: 'Continuous Hemisphere Link',
      orbitalPeriod: 'S / X / Ka / Optical',
      tempRange: '-4 °C to +39 °C',
      distanceAU: '1.00 AU · 70m & 34m Array'
    },
    scienceFact: 'Anchored in a quiet valley in southeastern Australia at 35.40° S, the Southern Cross tracking complex bridges the global ground network during southern-hemisphere passes and deep-space lunar and asteroid conjunctions.'
  },
  'gs-hartebeesthoek': {
    id: 'gs-hartebeesthoek',
    name: 'Southern Meridian Relay',
    emblem: '📡',
    accent: '#22d3ee',
    classification: 'Afro-Atlantic Tracking Complex',
    stats: {
      gravity: '9.79 m/s² (25.9° S)',
      dayLength: 'Continuous Meridian Link',
      orbitalPeriod: 'S / X / Ka-Band',
      tempRange: '+2 °C to +34 °C',
      distanceAU: '1.00 AU · 26m Dish'
    },
    scienceFact: 'Situated in a shielded highveld valley at 25.89° S, 27.69° E, the Southern Meridian Relay fills the crucial Afro-Atlantic and Indian Ocean gap for equatorial, HEO, and cislunar deep-space spacecraft passes.'
  },
  comet: {
    id: 'comet',
    name: 'Comet C/2026 GOSPACE',
    emblem: '🌠',
    accent: '#67e8f9',
    classification: 'Volatile Deep-Space Comet',
    stats: {
      gravity: '0.0005 m/s²',
      dayLength: '7.4 hrs spin',
      orbitalPeriod: '76 Years (Eccentric)',
      tempRange: '-200 °C to +45 °C coma',
      distanceAU: '1.05 AU (Perihelion)'
    },
    scienceFact: 'Composed of pristine water ice, frozen CO₂, and silicate dust, active comets sprout twin plasma-ion and golden dust tails pushed away by solar radiation and solar wind. Rendezvous missions like ESA’s Rosetta orbiter and Philae lander sampled comet 67P’s organics up close.'
  }
};

export const HAZARD_PROTOCOLS = {
  debris: {
    kind: 'debris',
    icon: '☄️',
    title: 'MICROMETEOROID / DEBRIS CONJUNCTION',
    detail: 'High-velocity orbital fragment cloud intersecting your ground track.',
    durationSec: 14.0,
    buildChoices: (state) => {
      const hasThruster = ['cold-gas-rcs', 'green-monoprop', 'xenon-ion'].includes(state?.thermalId);
      return [
        hasThruster
          ? {
              index: 0, key: '1', label: 'Collision Avoidance Burn',
              batteryDelta: -12, hullDelta: 0, scoreDelta: 40,
              tone: 'amber', badges: [{ text: '0% Hull', cls: 'ok' }, { text: '-12% Batt', cls: 'warn' }, { text: '+40 PTS', cls: 'ok' }],
              toast: '🚀 Collision Avoidance Burn Executed — Debris Cleared! (+40 PTS)'
            }
          : {
              index: 0, key: '1', label: 'Edge-On Attitude Profile (Wheels)',
              batteryDelta: 0, hullDelta: -4, scoreDelta: 40,
              tone: 'amber', badges: [{ text: '-4% Hull Graze', cls: 'warn' }, { text: 'No Thruster', cls: 'warn' }, { text: '+40 PTS', cls: 'ok' }],
              toast: '🛰️ Edge-On Attitude Profile Held — Minor Debris Graze! (+40 PTS)'
            },
        {
          index: 1, key: '2', label: 'Feather Solar Arrays Edge-On',
          batteryDelta: 0, hullDelta: 0, solarPauseSec: 8, scoreDelta: 30,
          tone: 'green', badges: [{ text: '0% Hull', cls: 'ok' }, { text: '8s Solar Pause', cls: 'warn' }, { text: '+30 PTS', cls: 'ok' }],
          toast: '🛡️ Solar Wings Feathered — Debris Cleared! (+30 PTS)'
        },
        {
          index: 2, key: '3', label: 'Hold Nadir & Track Debris Flux',
          batteryDelta: 0, hullDelta: -22, scoreDelta: 160,
          tone: 'red', badges: [{ text: '+160 Science', cls: 'ok' }, { text: '-22% Hull', cls: 'bad' }],
          toast: '🔭 Debris Flux Logged — Rare Impact Telemetry Captured! (+160 PTS)'
        }
      ];
    }
  },
  cme: {
    kind: 'cme',
    icon: '☀️',
    title: 'SOLAR PROTON STORM (CME)',
    detail: 'Coronal mass ejection particle surge sweeping through magnetosphere.',
    durationSec: 14.0,
    buildChoices: () => [
      {
        index: 0, key: '1', label: 'Enter Faraday Safe-Hold',
        batteryDelta: 0, hullDelta: 0, sensorOfflineSec: 8, commsPauseSec: 8, scoreDelta: 30,
        tone: 'green', badges: [{ text: '0% Damage', cls: 'ok' }, { text: '8s Sensor/DL Pause', cls: 'warn' }, { text: '+30 PTS', cls: 'ok' }],
        toast: '🛡️ Faraday Safe-Hold Engaged — Avionics Shielded! (+30 PTS)'
      },
      {
        index: 1, key: '2', label: 'Magnetorquer Bus Reroute',
        batteryDelta: -18, hullDelta: -5, scoreDelta: 75,
        tone: 'amber', badges: [{ text: 'Sensors Active', cls: 'ok' }, { text: '-18% Batt', cls: 'warn' }, { text: '-5% Hull', cls: 'warn' }, { text: '+75 PTS', cls: 'ok' }],
        toast: '🧲 Magnetorquer Bus Reroute Executed — Surge Dumped! (+75 PTS)'
      },
      {
        index: 2, key: '3', label: 'Sample High-Energy Flare Plasma',
        batteryDelta: -25, hullDelta: -18, scoreDelta: 190,
        tone: 'red', badges: [{ text: '+190 Science', cls: 'ok' }, { text: '-25% Batt', cls: 'warn' }, { text: '-18% Hull', cls: 'bad' }],
        toast: '⚡ High-Energy Flare Plasma Sampled! (+190 PTS)'
      }
    ]
  },
  cryo: {
    kind: 'cryo',
    icon: '❄️',
    title: 'DEEP ECLIPSE THERMAL DROP',
    detail: 'External skin and propellant lines dropping below -145 °C in deep umbra.',
    durationSec: 14.0,
    buildChoices: () => [
      {
        index: 0, key: '1', label: 'Engage Survival Heaters',
        batteryDelta: -24, hullDelta: 0, scoreDelta: 40,
        tone: 'amber', badges: [{ text: '0% Hull', cls: 'ok' }, { text: '-24% Batt', cls: 'warn' }, { text: '+40 PTS', cls: 'ok' }],
        toast: '🔥 Survival Heaters Engaged — Bus Temp Stabilized! (+40 PTS)'
      },
      {
        index: 1, key: '2', label: 'Passive Barbecue Thermal Roll',
        batteryDelta: -6, hullDelta: 0, commsPauseSec: 7, scoreDelta: 50,
        tone: 'green', badges: [{ text: '0% Hull', cls: 'ok' }, { text: '-6% Batt', cls: 'warn' }, { text: '7s DL Pause', cls: 'warn' }, { text: '+50 PTS', cls: 'ok' }],
        toast: '🔄 Barbecue Thermal Roll Stabilized Bus! (+50 PTS)'
      },
      {
        index: 2, key: '3', label: 'Cold-Soak Cryo Calibration',
        batteryDelta: 0, hullDelta: -16, scoreDelta: 150,
        tone: 'red', badges: [{ text: '+150 Science', cls: 'ok' }, { text: '-16% Hull', cls: 'bad' }],
        toast: '❄️ Cold-Soak Cryo Baseline Calibrated! (+150 PTS)'
      }
    ]
  },
  gimbal: {
    kind: 'gimbal',
    icon: '📡',
    title: 'HIGH-GAIN ANTENNA GIMBAL JAM',
    detail: 'Primary parabolic dish actuator stalled off nadir station tracking axis.',
    durationSec: 14.0,
    buildChoices: () => [
      {
        index: 0, key: '1', label: 'Failover to Omni Backup Antenna',
        batteryDelta: 0, hullDelta: 0, omniReducedCount: 1, scoreDelta: 35,
        tone: 'green', badges: [{ text: '0% Cost', cls: 'ok' }, { text: 'Next DL 70% Pts', cls: 'warn' }, { text: '+35 PTS', cls: 'ok' }],
        toast: '📡 Omni Backup Active — Next Downlink at 70% Pts! (+35 PTS)'
      },
      {
        index: 1, key: '2', label: 'Surge Gimbal Heater & Torque',
        batteryDelta: -18, hullDelta: 0, scoreDelta: 65,
        tone: 'amber', badges: [{ text: '100% Dish', cls: 'ok' }, { text: '-18% Batt', cls: 'warn' }, { text: '+65 PTS', cls: 'ok' }],
        toast: '⚙️ Gimbal De-Iced at Full Torque — 100% Dish Restored! (+65 PTS)'
      },
      {
        index: 2, key: '3', label: 'Overdrive RF Power Amplifier',
        batteryDelta: -20, hullDelta: -12, scoreDelta: 140,
        tone: 'red', badges: [{ text: '+140 Science', cls: 'ok' }, { text: '-20% Batt', cls: 'warn' }, { text: '-12% Hull', cls: 'bad' }],
        toast: '⚡ RF Amplifier Overdriven — Telemetry Forced Through! (+140 PTS)'
      }
    ]
  }
};

export function getHazardProtocol(kind, missionState, batterySoc = 84) {
  const tpl = HAZARD_PROTOCOLS[kind] || HAZARD_PROTOCOLS.debris;
  const lowBattery = batterySoc < 15;
  const choices = tpl.buildChoices(missionState).map((c) => {
    const powerHeavy = (c.batteryDelta || 0) <= -12;
    const lowBattWarn = lowBattery && powerHeavy;
    return {
      ...c,
      lowBattWarn,
      lowBattText: lowBattWarn ? 'LOW BATT -> BROWNOUT RISK' : ''
    };
  });
  return {
    kind: tpl.kind,
    icon: tpl.icon,
    title: tpl.title,
    detail: tpl.detail,
    durationSec: tpl.durationSec,
    choices
  };
}

export const MISSION_SCIENCE_ZONES = {
  'wildfiresat-l1': [
    { id: 'wf-mackenzie', name: 'Mackenzie Wildfire Plume', category: 'Thermal Plume', targetBody: 'earth', orbitFrac: 0.12, points: 75, color: '#f97316' },
    { id: 'wf-taiga', name: 'Siberian Taiga Front', category: 'Thermal Plume', targetBody: 'earth', orbitFrac: 0.30, points: 75, color: '#fbbf24' },
    { id: 'wf-yukon', name: 'Yukon Crown Hotspot', category: 'Thermal Plume', targetBody: 'earth', orbitFrac: 0.48, points: 80, color: '#f97316' },
    { id: 'wf-quebec', name: 'Labrador Boreal Swath', category: 'Thermal Plume', targetBody: 'earth', orbitFrac: 0.68, points: 75, color: '#38bdf8' },
    { id: 'wf-alpine', name: 'Southern Ridge Bushfire', category: 'Thermal Plume', targetBody: 'earth', orbitFrac: 0.86, points: 85, color: '#fbbf24' }
  ],
  'aurora-l1': [
    { id: 'au-ncusp', name: 'Northern Polar Cusp', category: 'Magnetosphere Cusp', targetBody: 'earth', orbitFrac: 0.12, points: 75, color: '#34d399' },
    { id: 'au-birkeland', name: 'Birkeland Current Arc', category: 'Magnetosphere Cusp', targetBody: 'earth', orbitFrac: 0.30, points: 80, color: '#22d3ee' },
    { id: 'au-substorm', name: 'Substorm Oval Core', category: 'Magnetosphere Cusp', targetBody: 'earth', orbitFrac: 0.48, points: 85, color: '#38bdf8' },
    { id: 'au-scusp', name: 'Southern Polar Cusp', category: 'Magnetosphere Cusp', targetBody: 'earth', orbitFrac: 0.68, points: 80, color: '#34d399' },
    { id: 'au-jet', name: 'Auroral Electrojet Sheet', category: 'Magnetosphere Cusp', targetBody: 'earth', orbitFrac: 0.86, points: 75, color: '#fbbf24' }
  ],
  'ocean-l2': [
    { id: 'oc-barrier', name: 'Great Barrier Reef Bloom', category: 'Coastal Reef Bloom', targetBody: 'earth', orbitFrac: 0.12, points: 85, color: '#22d3ee' },
    { id: 'oc-belize', name: 'Mesoamerican Coral Shelf', category: 'Coastal Reef Bloom', targetBody: 'earth', orbitFrac: 0.30, points: 85, color: '#34d399' },
    { id: 'oc-natl', name: 'North Atlantic Plankton Swirl', category: 'Coastal Reef Bloom', targetBody: 'earth', orbitFrac: 0.48, points: 90, color: '#38bdf8' },
    { id: 'oc-humboldt', name: 'Humboldt Upwelling Front', category: 'Coastal Reef Bloom', targetBody: 'earth', orbitFrac: 0.68, points: 85, color: '#22d3ee' },
    { id: 'oc-triangle', name: 'Coral Triangle Archipelago', category: 'Coastal Reef Bloom', targetBody: 'earth', orbitFrac: 0.86, points: 95, color: '#fbbf24' }
  ],
  'monsoon-l2': [
    { id: 'mn-bengal', name: 'Bay of Bengal Eyewall', category: 'Cyclone Eye', targetBody: 'earth', orbitFrac: 0.12, points: 90, color: '#38bdf8' },
    { id: 'mn-wpac', name: 'West Pacific Super-Typhoon', category: 'Cyclone Eye', targetBody: 'earth', orbitFrac: 0.30, points: 95, color: '#fbbf24' },
    { id: 'mn-mekong', name: 'Mekong Floodplain Basin', category: 'SAR Flood Swath', targetBody: 'earth', orbitFrac: 0.48, points: 85, color: '#22d3ee' },
    { id: 'mn-atl', name: 'Atlantic Hurricane Vortex', category: 'Cyclone Eye', targetBody: 'earth', orbitFrac: 0.68, points: 90, color: '#38bdf8' },
    { id: 'mn-coral', name: 'Coral Sea Storm Core', category: 'Cyclone Eye', targetBody: 'earth', orbitFrac: 0.86, points: 90, color: '#fbbf24' }
  ],
  'lunar-l3': [
    { id: 'ln-outbound', name: 'Cislunar Cryo Calibration Gate', category: 'Lunar Corridor', targetBody: 'earth', orbitFrac: 0.12, points: 95, color: '#22d3ee' },
    { id: 'ln-shackleton', name: 'Shackleton Rim Cryo Sweep', category: 'Lunar Crater PSR', targetBody: 'moon', orbitFrac: 0.30, points: 110, color: '#67e8f9' },
    { id: 'ln-cabeus', name: 'Cabeus Volatile Basin Scan', category: 'Lunar Crater PSR', targetBody: 'moon', orbitFrac: 0.48, points: 115, color: '#38bdf8' },
    { id: 'ln-shoemaker', name: 'Shoemaker Ice Trap Window', category: 'Lunar Crater PSR', targetBody: 'moon', orbitFrac: 0.68, points: 110, color: '#a78bfa' },
    { id: 'ln-inbound', name: 'Return Neutron Spectrometer Arc', category: 'Lunar Corridor', targetBody: 'earth', orbitFrac: 0.86, points: 100, color: '#fbbf24' }
  ],
  'asteroid-l3': [
    { id: 'as-peri', name: 'Deep-Space Optical Calibration', category: 'Transfer Waypoint', targetBody: 'earth', orbitFrac: 0.12, points: 100, color: '#fbbf24' },
    { id: 'as-nea1', name: 'Silicate NEA-2026 Waypoint', category: 'Asteroid Target', targetBody: 'nea', neaIndex: 0, orbitFrac: 0.30, points: 105, color: '#22d3ee' },
    { id: 'as-nea2', name: 'Metallic M-Type NEA-2027', category: 'Asteroid Target', targetBody: 'nea', neaIndex: 1, orbitFrac: 0.48, points: 115, color: '#38bdf8' },
    { id: 'as-comet', name: 'Comet C/2026 GOSPACE Coma', category: 'Comet Flyby', targetBody: 'comet', orbitFrac: 0.68, points: 135, color: '#67e8f9' },
    { id: 'as-nea3', name: 'Carbonaceous NEA-2028 Assay', category: 'Asteroid Target', targetBody: 'nea', neaIndex: 2, orbitFrac: 0.86, points: 110, color: '#fbbf24' }
  ]
};

export function getMissionScienceZones(scenarioId) {
  return (MISSION_SCIENCE_ZONES[scenarioId] || MISSION_SCIENCE_ZONES['wildfiresat-l1']).map((z) => ({ ...z }));
}

export const ORBIT_MISSION_TARGETS = {
  'wildfiresat-l1': { scanTarget: 3, downlinks: 2, eventTarget: 1, eclipseTarget: 0, scanLabel: 'Capture Thermal Scans ([E])' },
  'aurora-l1': { scanTarget: 3, downlinks: 2, eventTarget: 1, eclipseTarget: 0, scanLabel: 'Scan Mag-Cusps ([E])' },
  'ocean-l2': { scanTarget: 4, downlinks: 3, eventTarget: 2, eclipseTarget: 1, scanLabel: 'Capture Reef Scans ([E])' },
  'monsoon-l2': { scanTarget: 4, downlinks: 3, eventTarget: 2, eclipseTarget: 1, scanLabel: 'Scan Cyclone Eyes ([E])' },
  'lunar-l3': { scanTarget: 5, downlinks: 4, eventTarget: 2, eclipseTarget: 0, scanLabel: 'Scan Lunar Craters ([E])' },
  'asteroid-l3': { scanTarget: 5, downlinks: 4, eventTarget: 2, eclipseTarget: 0, scanLabel: 'Prospect Waypoints ([E])' }
};

export function getOrbitObjectivesStatus(state, telemetry = null, run = null) {
  const scenarioId = state?.scenarioId || 'wildfiresat-l1';
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];
  const isSandbox = Boolean(state?.sandboxMode);

  const deployProgress = telemetry?.deployProgress ?? 0;
  const deployDone = Boolean(run?.deployCompleted || (telemetry && !telemetry.deployActive && deployProgress >= 0.99));
  const dl = Math.max(telemetry?.downlinkCount || 0, run?.downlinksCompleted || 0);
  const scans = Math.max(telemetry?.scienceScansCount ?? telemetry?.asteroidsScanned ?? 0, run?.scansCompleted || 0);
  const hazResolved = Math.max(telemetry?.anomaliesResolved || 0, run?.anomaliesResolved || 0);
  const eclipsesSurvived = Math.max(telemetry?.eclipsesSurvived || 0, run?.eclipsesSurvived || 0);
  const inEclipseNow = Boolean(telemetry?.inEclipse);
  const hull = Math.max(0, Math.round(telemetry?.hullIntegrity ?? run?.hullIntegrity ?? 100));
  const holoDone = Boolean(run?.holoInspected || telemetry?.selectedHoloId);
  const destroyed = Boolean(telemetry?.isDestroyed || hull <= 0);

  if (isSandbox) {
    const tasks = [
      {
        id: 'unfold',
        title: 'Deploy Arrays ([U] / Auto)',
        progressText: deployDone ? '1 / 1' : `${Math.round(deployProgress * 100)}%`,
        complete: deployDone,
        badgeText: deployDone ? '✅ COMPLETE' : '⬜ INCOMPLETE',
        required: false
      },
      {
        id: 'scans',
        title: 'Scan Science Zone ([E])',
        progressText: `${Math.min(scans, 1)} / 1`,
        complete: scans >= 1,
        badgeText: scans >= 1 ? '✅ COMPLETE' : '⬜ INCOMPLETE',
        required: false
      },
      {
        id: 'downlink',
        title: 'Transmit 1 Downlink ([SPACE])',
        progressText: `${Math.min(dl, 1)} / 1`,
        complete: dl >= 1,
        badgeText: dl >= 1 ? '✅ COMPLETE' : '⬜ INCOMPLETE',
        required: true
      },
      {
        id: 'holo',
        title: 'Inspect Planet Holo-Card',
        progressText: holoDone ? '1 / 1' : '0 / 1',
        complete: holoDone,
        badgeText: holoDone ? '✅ COMPLETE' : '⬜ INCOMPLETE',
        required: false
      },
      {
        id: 'hazard',
        title: 'Resolve 1 Space Event',
        progressText: `${Math.min(hazResolved, 1)} / 1`,
        complete: hazResolved >= 1,
        badgeText: hazResolved >= 1 ? '✅ COMPLETE' : '⬜ INCOMPLETE',
        required: false
      }
    ];
    const completedCount = tasks.filter((item) => item.complete).length;
    const canDebrief = dl >= 1 && hull > 0 && !destroyed;
    return {
      isSandbox: true,
      scenarioId,
      scenarioName: scenario.name,
      subtitle: 'SANDBOX EXPLORER (OPTIONAL)',
      tasks,
      completedCount,
      totalCount: tasks.length,
      pct: Math.round((completedCount / tasks.length) * 100),
      milestonePct: Math.round(((deployDone ? 0.5 : 0) + Math.min(1, scans) + Math.min(1, dl)) / 2.5 * 100),
      isDestroyed: destroyed,
      canDebrief
    };
  }

  const tgt = ORBIT_MISSION_TARGETS[scenarioId] || ORBIT_MISSION_TARGETS['wildfiresat-l1'];
  const orbitSpec = CATALOG.launch.orbits.find((o) => o.id === state?.orbitId) || CATALOG.launch.orbits[0];
  const hasEclipseShadow = telemetry?.orbitHasShadow
    ?? (telemetry?.eclipseFraction !== undefined
      ? telemetry.eclipseFraction > 0
      : (run?.orbitHasShadow ?? (generateOrbitTrack(orbitSpec, 48).eclipseFraction > 0)));
  const needEclipse = tgt.eclipseTarget > 0 && hasEclipseShadow;
  const reqScans = tgt.scanTarget + (tgt.eclipseTarget > 0 && !hasEclipseShadow ? 1 : 0);

  const tasks = [
    {
      id: 'unfold',
      title: 'Deploy Arrays ([U] / Auto)',
      progressText: deployDone ? '100%' : `${Math.round(deployProgress * 100)}%`,
      complete: deployDone,
      badgeText: deployDone ? '✅ COMPLETE' : '⬜ INCOMPLETE',
      required: true
    },
    {
      id: 'scans',
      title: tgt.scanLabel,
      progressText: `${Math.min(scans, reqScans)} / ${reqScans}`,
      complete: scans >= reqScans,
      badgeText: scans >= reqScans ? '✅ COMPLETE' : '⬜ INCOMPLETE',
      required: true
    },
    {
      id: 'downlink',
      title: 'Ground Downlinks ([SPACE])',
      progressText: `${Math.min(dl, tgt.downlinks)} / ${tgt.downlinks}`,
      complete: dl >= tgt.downlinks,
      badgeText: dl >= tgt.downlinks ? '✅ COMPLETE' : '⬜ INCOMPLETE',
      required: true
    }
  ];
  if (needEclipse) {
    tasks.push({
      id: 'eclipse',
      title: 'Survive 1 Eclipse Pass',
      progressText: eclipsesSurvived >= tgt.eclipseTarget ? '1 / 1' : (inEclipseNow ? '🌑 IN SHADOW' : '0 / 1'),
      complete: !destroyed && eclipsesSurvived >= tgt.eclipseTarget,
      badgeText: eclipsesSurvived >= tgt.eclipseTarget ? '✅ COMPLETE' : (inEclipseNow ? '🌑 ENDURING' : '⬜ INCOMPLETE'),
      required: true
    });
  }
  tasks.push(
    {
      id: 'events',
      title: `Resolve ${tgt.eventTarget} Space Event${tgt.eventTarget > 1 ? 's' : ''}`,
      progressText: `${Math.min(hazResolved, tgt.eventTarget)} / ${tgt.eventTarget}`,
      complete: hazResolved >= tgt.eventTarget,
      badgeText: hazResolved >= tgt.eventTarget ? '✅ COMPLETE' : '⬜ INCOMPLETE',
      required: true
    },
    {
      id: 'integrity',
      title: 'Spacecraft Integrity',
      progressText: destroyed ? '0%' : `${hull}%`,
      complete: !destroyed && hull >= 40,
      isWarning: destroyed || hull < 40,
      badgeText: destroyed ? '💥 0% DESTROYED' : (hull >= 40 ? '✅ INTACT' : '⚠️ AT RISK'),
      required: true
    }
  );

  const opsTotal = 0.5 + reqScans + tgt.downlinks + (needEclipse ? tgt.eclipseTarget : 0);
  const opsDone = (deployDone ? 0.5 : 0) + Math.min(scans, reqScans) + Math.min(dl, tgt.downlinks) + (needEclipse ? Math.min(eclipsesSurvived, tgt.eclipseTarget) : 0);
  const milestonePct = Math.round((opsDone / Math.max(1, opsTotal)) * 100);

  const completedCount = tasks.filter((item) => item.complete).length;
  const canDebrief = tasks.every((item) => item.complete) && hull > 0 && !destroyed;
  return {
    isSandbox: false,
    scenarioId,
    scenarioName: scenario.name,
    subtitle: `${scenario.tag} · OBJECTIVES`,
    tasks,
    completedCount,
    totalCount: tasks.length,
    pct: Math.round((completedCount / tasks.length) * 100),
    milestonePct,
    isDestroyed: destroyed,
    canDebrief
  };
}

export function getOrbitActiveDebuffs(ev, telemetry = null) {
  if (!ev) return [];
  const risks = ev.designRisks || {};
  const sandbox = Boolean(ev.sandboxMode);
  const metrics = ev.metrics || {};
  const debuffs = [];

  if (risks.massOverrun) {
    debuffs.push({
      id: 'mass',
      icon: '🔥',
      title: 'Over-Mass',
      effect: 'Atmospheric Drag: -0.5% Hull/s',
      firing: Boolean(telemetry && !telemetry.briefingPaused && !telemetry.isDestroyed)
    });
  }
  if (risks.lowPowerMargin || (metrics.powerMargin ?? 0) < 0) {
    debuffs.push({
      id: 'power',
      icon: '⚡',
      title: 'Power Deficit',
      effect: 'Eclipse Brownout: 2.5x Batt Drain',
      firing: Boolean(telemetry?.inEclipse || telemetry?.brownoutLocked)
    });
  }
  if (risks.weakCommsMargin) {
    debuffs.push({
      id: 'comms',
      icon: '📡',
      title: 'Comms Bottleneck',
      effect: 'Packet Loss: -50% Downlink Pts',
      firing: Boolean(telemetry?.inLineOfSight)
    });
  }
  if (risks.wavelengthMismatch) {
    debuffs.push({
      id: 'band',
      icon: '🔬',
      title: 'Wavelength Mismatch',
      effect: 'Spectral Noise: -40% Science',
      firing: Boolean(telemetry?.inLineOfSight)
    });
  }
  if (!sandbox && risks.budgetOverrun) {
    debuffs.push({
      id: 'budget',
      icon: '💰',
      title: 'Over-Budget',
      effect: 'Cost Overrun: -200 Pts & -1 ★ Cap',
      firing: false
    });
  }
  if (risks.lowLifetime) {
    debuffs.push({
      id: 'life',
      icon: '🛡️',
      title: 'Fragile Frame',
      effect: 'Fragile Frame: +35% Hazard Damage',
      firing: Boolean(telemetry?.hazardState?.activeHazard)
    });
  }
  return debuffs;
}
