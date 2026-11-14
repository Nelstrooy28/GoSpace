# Project Rules: MDL-X Space Mission Architect 3D (Single-Player)

## Tech Stack (Strict)
- **Architecture:** 100% client-side static web app (HTML5, CSS3, Vanilla JS ES Modules). No backend server, no Socket.io, no bundler required. Must work directly on GitHub Pages (`./` relative paths only).
- **3D Engine:** Three.js `0.160.0` + `OrbitControls` via `<script type="importmap">` from `unpkg.com`. Procedural 3D geometries/materials only (no external `.glb` files).
- **Persistence:** Use `localStorage` to save, load, and compare mission designs + Sandbox mode toggle.
- **Git Workflow:** Commit with author `Nelstrooy28 <nelstrooygalat28@gmail.com>` and `git push origin main` at the end of every completed step.

## File Structure (< 240 lines per file)
- `index.html` — Import map, NASA MDL layout, 3D viewport container & modals
- `styles.css` — Sleek dark NASA Mission Design Lab UI, resource bars & animations
- `js/missionVizPropagator.js` — NASA Mission Viz Keplerian 2D-ellipse-to-3D orbit propagator & JSON export
- `js/catalog.js` — NASA/CSA scenarios, buses, rockets, orbits, instruments & `evaluateMissionDesign()`
- `js/main.js` — Single-player state machine (Scenario -> 3D Cleanroom -> 3D Orbit Sim -> MDL Report)
- `js/sceneCleanroom.js` — Interactive 3D procedural spacecraft assembly & OrbitControls
- `js/sceneOrbit.js` — 3D Earth, sun/eclipse shadow, Keplerian orbit path, ground downlinks & crisis events
- `js/ui.js` — 6-resource HUD, 4 NASA Segment tabs, Master Equipment List (MEL), tooltips & Post-Mission Report

## Dev Server & Verification Rules
- Serve locally with `npx -y serve -l 3000 .` or `python -m http.server 3000` (free port 3000 first).
- Expose `window.__MISSION_DEBUG__` with `{ stage, scenarioId, metrics, warnings }` for browser checks.
