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
        { icon: '📡', title: 'Beam Down Thermal Heat Maps', text: 'Fly into a green Polar Ground Station cone and press [SPACE] to transmit thermal fire hotspot maps (+50 pts).' },
        { icon: '🔋', title: 'Manage Nightside Eclipse Power', text: 'Keep Battery above 25% while passing through Earth’s dark eclipse shadow; trigger [Q] Safe Mode if solar power dips.' },
        { icon: '🛡️', title: 'Survive Orbital Hazards for ★★★', text: 'Respond quickly to micrometeoroid debris or solar storm alerts ([D]/[F]/[T]/[R]) to protect Hull Integrity and win +75 bonus pts.' }
      ],
      proTip: 'Use 25x or 100x Time Warp to glide rapidly toward the next green Polar cone, then drop to 1x to nail your [SPACE] downlink!'
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
      about: 'Charged solar wind slamming into Earth’s poles sparks shimmering aurora while disrupting navigation signals and power grids. Your fluxgate magnetometer and plasma analyzer map geomagnetic storm currents straight across the polar oval.',
      tasks: [
        { icon: '🧭', title: 'Transmit Polar Storm Packets', text: 'Wait for a glowing green Polar Ground Station cone and press [SPACE] to downlink live auroral magnetic field sweeps.' },
        { icon: '☀️', title: 'Shield Optics During Solar Storms', text: 'Polar arcs face elevated solar particle storms—tap [F] Shield Optics promptly so radiation spikes do not wipe buffered science.' },
        { icon: '☄️', title: 'Scan Passing Space Rocks', text: 'Watch nearby near-Earth objects along your high-latitude arc and hit [E] Scan Asteroid (+60/+100 pts) for extra science!' }
      ],
      proTip: 'Keep Hull Integrity near 100% across the polar radiation belt—every clean anomaly repair awards +75 Flight Director pts!'
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
        { icon: '🌊', title: 'Downlink Heavy Hyperspectral Cubes', text: 'Multi-band ocean optics fill storage quickly—catch green Ground Station passes with [SPACE] before your buffer fills up.' },
        { icon: '🔋', title: 'Balance Dual-Payload Power Draw', text: 'Monitor Battery SoC through Earth’s nightside eclipse and trigger [Q] Cycle Power if optical + laser load drains below 25%.' },
        { icon: '🛠️', title: 'Clear Hazard Alerts Mid-Pass', text: 'A gimbal jam or solar flare blocks telemetry links until repaired—resolve alerts fast so your pass window is never wasted.' }
      ],
      proTip: 'Toggle between 🛰️ Chase Sat and 🌍 Full Orbit views to spot approaching coastline passes ahead of acquisition!'
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
      about: 'Optical cameras go blind above thick typhoon cloud decks right before dangerous landfalls. Your high-wattage Synthetic Aperture Radar (SAR) pulses right through cyclone walls day and night to track flood surges.',
      tasks: [
        { icon: '⚡', title: 'Power the High-Wattage SAR Wing', text: 'Active radar scanning draws heavy power—watch eclipse passages closely and trigger [T] Heaters or [Q] Safe Mode if needed.' },
        { icon: '📡', title: 'Deliver Emergency Storm Tracks', text: 'Hit [SPACE] inside green Ground Station cones to rush all-weather storm eye telemetry down with minimal latency.' },
        { icon: '🛡️', title: 'Dodge Orbital Debris Fields', text: 'Protect your wide SAR phased-array wing using [D] Thruster Dodge when debris warnings sound for +75 pts and 100% hull.' }
      ],
      proTip: 'Jump to 100x Time Warp over open ocean legs, then drop to 1x as the green Polar Station pulse ring expands!'
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
        { icon: '❄️', title: 'Guard Deep-Space Cryo Balance', text: 'Long elliptical transfer arcs bring extreme thermal swings—activate [T] Heaters or [F] Shielding immediately when alerts fire.' },
        { icon: '📡', title: 'Link with the Deep-Space Dish', text: 'Your high-apogee ellipse sweeps far out before diving back—hit [SPACE] whenever the Deep-Space Dish locks in green.' },
        { icon: '☄️', title: 'Scan Deep-Space Objects Along the Arc', text: 'Press [E] Scan Asteroid (+100 deep-space bonus) and keep anomalies resolved cleanly to earn an S-Rank Flight Director crest!' }
      ],
      proTip: 'Use 100x Time Warp along the slow outer apogee arc and switch to ☄️ Asteroid & Comet cam to line up bonus scans!'
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
        { icon: '☄️', title: 'Run Close-Range Asteroid Scans', text: 'Hit [E] Scan Asteroid (or frame targets with ☄️ Asteroid & Comet cam) whenever NEAs and comets pass within sensor range (+60/+100 pts).' },
        { icon: '⚙️', title: 'Keep Ion Drive & Gimbal Aligned', text: 'Counter solar flares ([F]), debris threats ([D]), and gimbal jams promptly so Xenon thrust and deep-space comms stay online.' },
        { icon: '📡', title: 'Transmit Deep-Space Assay Archive', text: 'Catch green Deep-Space Dish link passes with [SPACE] to deliver asteroid composition maps home for an S-Rank crest.' }
      ],
      proTip: 'Try 🌌 Full Solar System cam to see your deep elliptical transfer track sweeping past Venus, Earth, Mars, and the Asteroid Belt!'
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

export const SANDBOX_ORBIT_GUIDE_FALLBACK = {
  codename: 'SANDBOX FREEPLAY FLIGHT',
  headline: 'Custom Orbital Architecture · FREEPLAY',
  about: 'Unlimited budget and rocket payload mass let you test daring satellite builds without procurement caps. Push extreme sensors, RTGs, or Xenon Ion drives into real Keplerian orbits and watch how they withstand live space hazards.',
  tasks: [
    { icon: '📡', title: 'Test Green Ground Cones', text: 'Fly inside green Ground Station cones and press [SPACE] to transmit live science telemetry (+50 pts).' },
    { icon: '☄️', title: 'Scan Asteroids & Comets', text: 'Hit [E] Scan Asteroid and try ☄️ Asteroid & Comet or 🌌 Full Solar System camera presets.' },
    { icon: '⚠️', title: 'Stress-Test Orbital Hazards', text: 'Click ⚠️ Test Hazard or survive incoming debris, solar flares, and cryo freezes to verify your hardware protections.' }
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
