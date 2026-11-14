# GoSpace — 3D Space Mission Architect

**GoSpace** is a 100% client-side 3D space mission design laboratory built for NASA Space Apps. Students and aspiring systems engineers architect Earth and lunar science missions across NASA's four official mission segments, assemble procedural 3D spacecraft in a cleanroom, validate their point design against **JPL Concept Maturity Levels (CML 1–4)**, and fly their spacecraft in a live 3D Keplerian orbit simulator.

## Gameplay Across 3 Lifecycle Stages

1. **Cleanroom Point Design (`js/sceneCleanroom.js`)**
   - Configure all **4 NASA Mission Segments**: **User** (science objective, wavelength band, latency), **Space** (3U/6U CubeSat, ESPA SmallSat, or Flagship bus, multi-select instruments, solar arrays, batteries, thermal/ADCS), **Launch** (vehicle & Keplerian orbit), and **Ground** (RF/optical transceiver & ground network).
   - Inspect your spacecraft procedurally built in real time with Three.js (`Auto-Rotate`, `Exploded View`, `Reset Camera`), complete with pulsing warning cages when instruments violate James Webb-style wavelength or bus-class compatibility.
   - Monitor live **6-Resource MDL Telemetry** (Budget, Mass, Power Margin, Data Margin, Lifetime, Science Score) and an itemized **Master Equipment List (MEL)** to advance from **CML 1** to **CML 4 (Verified Point Design)**.

2. **Mission Viz Orbit Sim (`js/sceneOrbit.js` & `js/missionVizPropagator.js`)**
   - Propagates your chosen orbit from 2D Keplerian ellipse elements (`a`, `e`, `i`, RAAN, argument of perigee, true anomaly) into 3D space around a procedural Earth (plus a Moon reference body for HEO/Lunar trajectories).
   - Tracks live altitude, orbital velocity, **Earth Eclipse Shadow** vs. sunlit charging, battery state of charge, science buffer/downlink volume, and glowing line-of-sight RF/optical links to **CSA Inuvik**, **NASA NSN**, and **NASA DSN**.
   - Includes **Time Warp** (`1x`, `20x`, `100x`, `Pause`), **Earth View / Chase Sat** camera focus, and a **Test Eclipse / Solar Storm** stress test.

3. **Flight Review & Real Mission Match (`js/ui.js`)**
   - Generates a final **GoSpace MDL Flight Review** (`Grade S / A / B / Mission Risk`) across all 6 gauges and pairs your point design with a **Real NASA & CSA Mission Match** (*CSA WildFireSat & NASA FireSense*, *NASA PACE & CSA RADARSAT Constellation*, or *NASA Lunar Trailblazer & JWST*).
   - Export NASA Mission Viz-compatible trajectory & point design data (`gospace-mission-viz.json`) or save/compare multiple designs via `localStorage`.

## Official NASA & CSA Resources (6 NASA + 1 CSA)

1. [Design and Develop Science Missions (NASA)](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf?emrc=a454cf)
2. [Mission Design Lab — MDL (NASA GSFC)](https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/)
3. [Concept Maturity Levels — CMLs (NASA JPL)](https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299)
4. [NASA Mission Viz](https://nasa.github.io/mission-viz/)
5. [A Learning Game About Telescopes (NASA Webb)](https://science.nasa.gov/mission/webb/game-build-it-yourself/)
6. [CubeSat 101 (NASA CSLI)](https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf)
7. [CSA Digital Games and Activities (Canadian Space Agency)](https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp)

## Run Locally & GitHub Pages Deployment

- **Zero backend, zero build step:** Uses Vanilla JS ES Modules, `./` relative paths, and Three.js `0.160.0` via `<script type="importmap">` (`unpkg.com`), making it directly deployable on **GitHub Pages**.
- **Serve locally on port 3000:**
  ```bash
  npx -y serve -l 3000 .
  # or
  python -m http.server 3000
  ```
  Then open `http://localhost:3000/`.
