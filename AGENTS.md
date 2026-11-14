# Project Rules: MDL-X Space Mission Architect 3D (Single-Player)

## Tech Stack (Strict)
- **Architecture:** 100% client-side static web app (HTML5, CSS3, Vanilla JS ES Modules). No backend server, no Socket.io, no bundler required. Must work directly on GitHub Pages (`./` relative paths only).
- **3D Engine:** Three.js `0.160.0` + `OrbitControls` via `<script type="importmap">` from `unpkg.com`. Procedural 3D geometries/materials only (no external `.glb` files).
- **Persistence:** Use `localStorage` to save, load, and compare mission designs + Sandbox mode toggle.
- **Git Workflow:** Commit with author `Nelstrooy28 <nelstrooygalat28@gmail.com>` and `git push origin main` at the end of every completed step.

## File Structure (< 250 lines per file)
- `index.html` — Import map, full-screen 3D viewport & floating glassmorphic game HUD overlays
- `styles.css` — Deep-space glassmorphic game HUD, collapsible drawers, launch CTA & animations
- `js/missionVizPropagator.js` — Keplerian 2D-ellipse-to-3D orbit propagator & 3D trajectory JSON export
- `js/catalog.js` — Mission scenarios, buses, rockets, orbits, instruments & `evaluateMissionDesign()`
- `js/main.js` — Single-player 4-stage state machine (Hangar -> Launchpad -> Orbit -> Debrief)
- `js/sceneCleanroom.js` — Interactive 3D Hangar procedural spacecraft assembly & OrbitControls
- `js/sceneLaunch.js` — Procedural 3D Launchpad, multi-stage rocket liftoff, sky-to-space ascent & fairing jettison
- `js/sceneOrbit.js` — Unobstructed full-view 3D Earth, Moon, sun/eclipse shadow, Keplerian orbit & interactive downlinks
- `js/sfx.js` — Procedural Web Audio synthesizer (UI clicks, equip lock, rocket rumble, downlink ping & victory fanfare)
- `js/ui.js` — Sci-fi HUD, title mission cards, loadout dock, Codex menu, launch tachometer & 3-star debrief

## Dev Server & Verification Rules
- Serve locally with `npx -y serve -l 3000 .` or `python -m http.server 3000` (free port 3000 first).
- Expose `window.__MISSION_DEBUG__` with `{ stage, scenarioId, cmlLevel, metrics, warnings }` for browser checks.
