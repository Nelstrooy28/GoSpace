# GoSpace — 3D Space Mission Architect

**GoSpace** is a 100% client-side 3D space mission architect built for orbital mission systems design. Players and aspiring systems engineers architect Earth and lunar science missions across **4 Mission Segments**, assemble procedural 3D spacecraft in a cleanroom, validate their point design against **Concept Maturity (CML 1–4)**, launch multi-stage rockets from the pad, and command live ground downlinks in a 3D Keplerian orbit simulator.

## Gameplay Across 4 Mission Stages

1. **Spacecraft Hangar (`js/sceneCleanroom.js`)**
   - Configure all **4 Mission Segments**: **User** (science objective, wavelength band, latency), **Space** (3U/6U CubeSat, ESPA SmallSat, or Flagship bus, multi-select instruments, solar arrays, batteries, thermal/ADCS), **Launch** (vehicle & Keplerian orbit), and **Ground** (RF/optical transceiver & ground network).
   - Inspect your spacecraft procedurally built in real time with Three.js (`Auto-Spin`, `Explode`, `Reset`, and subsystem camera snap), complete with pulsing warning cages when instruments violate spectral band or bus-class rules.
   - Track live **Mission Design Telemetry** (Budget, Mass, Power, Data, Life, Science) and an itemized **Master Equipment List (MEL)** to advance from **CML 1** to **CML 4 (Flight Ready)**.

2. **3D Rocket Launchpad (`js/sceneLaunch.js`)**
   - Trigger pad countdown and liftoff (`[SPACE]` or button), monitor ascent speed/altitude telemetry ring, watch stage separation & fairing jettison, and toggle between `Pad Cam` and `Rocket Cam`.

3. **Playable 3D Orbit Simulator (`js/sceneOrbit.js` & `js/missionVizPropagator.js`)**
   - Propagates your orbit from 2D Keplerian ellipse elements (`a`, `e`, `i`, RAAN, argument of perigee, true anomaly) into 3D space around a procedural Earth (plus Moon for HEO/Lunar trajectories).
   - Tracks altitude, orbital velocity, Earth Eclipse Shadow vs. sunlit charging, battery state of charge, and line-of-sight RF/optical links to **Arctic Polar Station**, **Global Near-Space Network**, and **Deep-Space Dish Array**.
   - Interactive gameplay: press `[SPACE]` over a ground station radar cone to transmit science (`+50 pts`) and press `[E]` during eclipses or solar flares to cycle power safe mode (`+75 pts`).

4. **Flight Readiness Debrief (`js/ui.js`)**
   - Generates a **Flight Readiness Debrief** (`★`–`★★★` rating, rank, and 6 telemetry stats) and unlocks a **Real-World Spacecraft Match** (*WildFireSat*, *PACE Climate Orbiter*, or *Lunar Trailblazer & Webb Space Observatory*).
   - Export 3D trajectory & point design data (`gospace-trajectory.json`) or save/compare builds via `localStorage`.

## Space Engineering References

- [Design and Develop Science Missions](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf?emrc=a454cf)
- [Mission Design Telemetry & Lab Framework](https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/)
- [Concept Maturity (CML 1–4) Framework](https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299)
- [Keplerian 3D Orbit Trajectory Spec](https://nasa.github.io/mission-viz/)
- [Space Observatory Wavelength Rules](https://science.nasa.gov/mission/webb/game-build-it-yourself/)
- [CubeSat 101 Systems Guide](https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf)
- [Arctic & Earth Observation Activities](https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp)

## Run Locally & GitHub Pages Deployment

- **Zero backend, zero build step:** Uses Vanilla JS ES Modules, `./` relative paths, and Three.js `0.160.0` via `<script type="importmap">` (`unpkg.com`), making it directly deployable on **GitHub Pages**.
- **Serve locally on port 3000:** `npx -y serve -l 3000 .` or `python -m http.server 3000` -> open `http://localhost:3000/`.
