# Project Rules: MDL-X Space Mission Architect 3D (Single-Player)

## Tech Stack (Strict)
- **Architecture:** 100% client-side static web app (HTML5, CSS3, Vanilla JS ES Modules). No backend server, no Socket.io, no bundler required. Must work directly on GitHub Pages (`./` relative paths only).
- **3D Engine:** Three.js `0.160.0` + `OrbitControls` via `<script type="importmap">` from `unpkg.com`. Procedural 3D geometries/materials only (no external `.glb` files).
- **Persistence:** Use `localStorage` to save, load, and compare mission designs + Sandbox mode toggle.
- **Git Workflow:** Commit with author `Nelstrooy28 <nelstrooygalat28@gmail.com>` and `git push origin main` at the end of every completed step.

## Modular High-Fidelity 3D Rule
Keep logic cleanly separated across modular ES files (`index.html`, `styles.css`, `js/main.js`, `js/ui.js`, `js/catalog.js`, `js/missionVizPropagator.js`, `js/sfx.js`, `js/music.js`, `js/tutorial.js`, `js/spacecraftModel.js`, `js/sceneCleanroom.js`, `js/sceneLaunch.js`, `js/spaceportScenery.js`, `js/sceneOrbit.js`, `js/orbitHazards.js`, `js/solarSystem.js`), with NO artificial line-count cap. Prioritize rich 3D visual detail, custom GLSL shaders, high-resolution procedural `<canvas>` textures, particle effects, and complete code—never truncate or simplify visuals to save lines.

## Dev Server & Verification Rules
- Serve locally with `npx -y serve -l 3000 .` or `python -m http.server 3000` (free port 3000 first).
- Expose `window.__MISSION_DEBUG__` with `{ stage, scenarioId, cmlLevel, metrics, warnings }` for browser checks.
