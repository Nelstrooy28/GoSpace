# GoSpace — 3D Space Mission Architect

**Live Demo:** [https://nelstrooy28.github.io/GoSpace/](https://nelstrooy28.github.io/GoSpace/)  
**Repository:** [https://github.com/Nelstrooy28/GoSpace](https://github.com/Nelstrooy28/GoSpace)

**GoSpace** is a 100% client-side 3D space mission architect and orbital flight simulator built with Three.js and Vanilla ES Modules. Design real-world Earth, lunar, and deep-space missions across **4 Mission Segments**, assemble procedural 45+ part spacecraft in a 3D cleanroom hangar, validate **Concept Maturity (CML 1–4)**, launch multi-stage rockets from a coastal spaceport, command live Keplerian orbital operations, and explore interactive 3D Solar System Holo-Cards.

## Key Features & 4-Stage Gameplay Loop

### 0. 3D Home Screen & Interactive Flight Academy (`js/sceneOrbit.js`, `js/tutorial.js`)
- **Live Orbital Showcase:** Rotating GLSL day/night terminator Earth, procedural spacecraft, Moon, and starfield right behind the title menu.
- **Campaign Contracts & Sandbox Freeplay:** Launch curated missions (*Arctic Wildfire Watch*, *Ionosphere & Aurora Scout*, *Coastal Ocean & Reef Pulse*, *Monsoon & Cyclone Eye*, *Lunar South Pole Icebreaker*, *Asteroid & Comet Prospector*) or toggle **Sandbox Freeplay** for unlimited budget and payload mass.
- **7-Step Interactive Flight Academy:** Guided `How to Play` onboarding spotlight (`js/tutorial.js`) walking through Hangar engineering, launch ignition, and live orbital downlinks.

### 1. Spacecraft Hangar (`js/sceneCleanroom.js`, `js/spacecraftModel.js`)
- **45+ Procedural 3D Components Across 4 Segments:** Configure **Objective** (mission goal, spectral band, latency), **Sat Bus & Payload** (CubeSat to Flagship buses, multi-slot science instruments, solar arrays/RTGs, propulsion/thermal, hull skins), **Rocket** (launch vehicle & Keplerian orbit), and **Comms** (RF/Ka/optical transceivers & ground networks).
- **`🪄 Auto-Build` CML-4 Optimizer:** One-click button in the Hangar bar equips a verified CML-4 winning spacecraft loadout tuned to the active contract's mass and budget caps.
- **Cleanroom Inspection Tools:** `Auto-Spin`, `Explode`, `Reset`, and subsystem camera snap (`Bus`, `Payload`, `Solar`, `Comms`), plus pulsing compatibility warning cages, live resource gauges, and an itemized **Master Equipment List (MEL)**.

### 2. Coastal 3D Rocket Launchpad (`js/sceneLaunch.js`, `js/spaceportScenery.js`)
- **Procedural Spaceport & Pad:** Coastal horizon, lattice umbilical tower, swing arms, flame trench, cryogenic boil-off venting, and hold-down clamps.
- **Stowed Payload Fairing & Staging:** Your custom Hangar spacecraft rides compactly stowed (`deployProgress = 0`) inside the payload fairing through `[SPACE]` countdown, Max-Q vapor cone, booster/stage separation, and fairing jettison (`Pad`, `Track`, `Hull`, and `Free` cameras).

### 3. Playable 3D Orbit Simulator (`js/sceneOrbit.js`, `js/missionVizPropagator.js`, `js/solarSystem.js`, `js/orbitHazards.js`)
- **Orbital Insertion Briefing Pop-Up (`📋 Mission Guide`):** Automatically introduces each contract's scientific mission and 3 Orbit Objectives when entering Orbit while safely pausing hazard timers until you click `🚀 BEGIN ORBITAL OPERATIONS [SPACE]`.
- **Staged Zero-G Satellite Unfolding (`[U]` to Replay):** Upon closing the briefing (or anytime via `🛰️ Replay Unfold [U]`), watch a smooth 2.8-second 3-stage cubic-out deployment sequence—sunshield & shoulder latches release (`0.0s–0.9s`), solar array wings hinge `90°` flat (`0.6s–2.1s`), and high-gain antennas & science booms telescope outward (`1.7s–2.8s`) with metallic lock flashes and staged servo audio.
- **Live "Satellite Eye" Payload `📷 Sensor Cam [C]`:** Toggleable corner PiP instrument display adapting live to your equipped payloads (Thermal IR FLIR, SAR Radar/LiDAR, Hyperspectral Ocean/Reef, or Magnetometer/Neutron Flux) synchronized with orbital ground track and eclipse state.
- **Clickable Solar System & Ground Station Holo-Cards:** Click The Sun, Mercury, Venus, Earth, The Moon, Mars, Main Asteroid Belt, Jupiter, Saturn, Uranus, Neptune, Comet `C/2026 GOSPACE`, or any 3D Ground Station pin (`Arctic Polar Station`, `Global Near-Space Network`, `Deep-Space Dish Array`) directly in 3D space to highlight it with a cyan holo-ring, open its telemetry card, **`🎥 Zoom to Body`**, or return **`🛰️ Back to My Satellite`**.
- **Orbital Operations & Emergency Hazards:** `[SPACE]` to downlink science inside green station cones (`+50 pts`), `[E]` to scan near-Earth asteroids/comets (`+60–100 pts`), `[Q]` for eclipse/flare Safe Mode, `1x`/`25x`/`100x`/`Pause` Time Warp, and real-time orbital emergencies (*Orbital Debris Swarm*, *Solar Flare / CME*, *Deep Cryo Freeze*, *Gimbal Drift*) resolved via hotkeys `[D]`/`[F]`/`[T]`/`[R]`.

### 4. Flight Readiness Debrief & Adaptive Space Synth (`js/ui.js`, `js/music.js`, `js/sfx.js`)
- **Arcade Debrief Screen:** Sequenced `★`–`★★★` star slam, rank crest (`S-RANK` to `MISSION AT RISK`), telemetry score breakdown, Mission Ribbons, unlocked Spacecraft Archive card, and streamlined 3-button controls (`✕ CLOSE [ESC]`, `🏠 BACK TO MENU`, `▶ NEXT MISSION`).
- **Adaptive Web Audio Space Synth (`js/music.js`) & SFX (`js/sfx.js`):** Procedural polyphonic soundtrack with 3s stereo cosmic reverb, feedback delay, smooth 1.5s crossfades across all stages (`menu`, `hangar`, `launch`, `orbit`, `debrief`), hazard-tension modulation, and independent `🎵 Music` and `🔊 SFX` toggles saved in `localStorage`.

## Project Architecture

| File | Responsibility |
| --- | --- |
| `index.html`, `styles.css`, `.nojekyll` | Static shell, Three.js import map (`0.160.0`), responsive glassmorphic HUD styles, and GitHub Pages bypass marker |
| `js/main.js` | Application state, stage router, keyboard shortcuts, persistence (`localStorage`), and `window.__MISSION_DEBUG__` |
| `js/catalog.js` | Contracts, 45+ parts catalog, CML-4 rules, `getOptimalLoadoutForMission()`, mission `orbitGuide`, and `CELESTIAL_DATABASE` |
| `js/ui.js` | HUD cards, loadout dock, MEL drawer, Mission Briefing modal, 3-button Debrief, and Holo-Scanner Cards |
| `js/spacecraftModel.js` | Shared procedural spacecraft assembly, articulated deployment rigs (`setDeploymentState`), and lock flashes |
| `js/sceneCleanroom.js` | Hangar 3D studio turntable, explosion view, subsystem camera focus, and warning cages |
| `js/sceneLaunch.js` & `js/spaceportScenery.js` | Coastal spaceport environment, launch physics, flames, steam/sparks, and multi-stage fairing separation |
| `js/sceneOrbit.js`, `js/solarSystem.js`, `js/orbitHazards.js` | Keplerian 3D orbit visualizer, ShaderMaterial Earth/Sun, planets, 3D raycast picking, Sensor Cam, and anomaly FX |
| `js/missionVizPropagator.js` | Two-body Keplerian propagator, eclipse calculations, and `gospace-trajectory.json` export |
| `js/music.js` & `js/sfx.js` | Zero-dependency procedural Web Audio ambient synth engine, servo/latch audio, and alert/victory SFX |
| `js/tutorial.js` | 7-step interactive onboarding spotlight overlay |

## Space Engineering References

- [Spacecraft Systems Engineering Guide](https://en.wikipedia.org/wiki/Spacecraft_design)
- [Mission Design Telemetry & Lab Framework](https://en.wikipedia.org/wiki/Concurrent_engineering)
- [Concept Maturity & Readiness Scale (1–4)](https://en.wikipedia.org/wiki/Technology_readiness_level)
- [Keplerian 3D Orbit Trajectory Spec](https://en.wikipedia.org/wiki/Keplerian_elements)
- [Space Observatory Wavelength Rules](https://en.wikipedia.org/wiki/Infrared_astronomy)
- [CubeSat Systems & Standards](https://www.cubesat.org/cubesatinfo)
- [Arctic & Earth Observation Activities](https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp)

## Run Locally & GitHub Pages Deployment

- **Zero backend, zero build step:** Uses Vanilla JS ES Modules, `./` relative paths, `.nojekyll`, and Three.js `0.160.0` via `<script type="importmap">` (`unpkg.com`), deploying directly from `main` on **GitHub Pages**: [https://nelstrooy28.github.io/GoSpace/](https://nelstrooy28.github.io/GoSpace/).
- **Serve locally on port 3000:**
  ```bash
  python -m http.server 3000
  # or: npx -y serve -l 3000 .
  ```
  Then open `http://localhost:3000/`.
