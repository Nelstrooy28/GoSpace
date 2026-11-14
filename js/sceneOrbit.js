import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { generateOrbitTrack, propagateOrbit } from './missionVizPropagator.js';
import { playDownlinkPing, playSafeMode, playWarning } from './sfx.js';

const EARTH_R = 2.0, KM_TO_SCENE = EARTH_R / 6371;
const STATIONS = [
  { id: 'inuvik', name: 'Arctic Polar Station', lat: 68.36, lon: -133.72 },
  { id: 'nsn', name: 'Global Near-Space Network', lat: 37.94, lon: -75.46 },
  { id: 'dsn', name: 'Deep-Space Dish Array', lat: 35.43, lon: -116.89 }
];

let renderer = null, scene = null, camera = null, controls = null, resizeObserver = null;
let rafId = 0, earthGroup = null, satMesh = null, beamLine = null, orbitLine = null;
let gsNodes = [], orbitEl = null, stateRef = null, evalRef = null, telemetryCb = null;
let simTime = 0, timeWarp = 25, cameraMode = 'full', stormUntil = 0, safeModeUntil = 0, beamBoostUntil = 0;
let batterySoc = 84, bufferGb = 0.25, downlinkedGb = 0, lastHudMs = 0, fitDist = 6.8;
let missionScore = 0, downlinkCount = 0, flareMitigated = 0, lastAutoFlare = 10, inLineOfSight = false, activeStationName = 'None', hazardNow = false;
const clock = new THREE.Clock(), trackCenter = new THREE.Vector3(), tmpSat = new THREE.Vector3(), tmpGs = new THREE.Vector3(), tmpNorm = new THREE.Vector3();

function latLonToVec(latDeg, lonDeg, r) {
  const lat = (latDeg * Math.PI) / 180, lon = (lonDeg * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lon));
}

function makePlanetTex(isMoon = false) {
  const c = document.createElement('canvas'); c.width = isMoon ? 128 : 512; c.height = isMoon ? 64 : 256;
  const ctx = c.getContext('2d');
  if (isMoon) {
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, 0, 128, 64);
    for (let i = 0; i < 28; i += 1) { ctx.fillStyle = i % 2 ? '#64748b' : '#cbd5e1'; ctx.beginPath(); ctx.arc((i * 37) % 128, (i * 23) % 64, 2 + (i % 5), 0, Math.PI * 2); ctx.fill(); }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#e2e8f0'); g.addColorStop(0.1, '#0c4a6e'); g.addColorStop(0.5, '#072f5f'); g.addColorStop(0.9, '#0c4a6e'); g.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256); ctx.fillStyle = '#2d6a4f';
    [[115, 92, 42, 34], [150, 165, 26, 40], [285, 86, 62, 32], [295, 145, 34, 42], [415, 168, 28, 22]].forEach(([x, y, rx, ry]) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; for (let i = 0; i < 16; i += 1) ctx.fillRect((i * 43) % 480, 28 + (i * 19) % 190, 48, 5);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function applyCameraPreset(mode) {
  if (!camera || !controls) return;
  if (mode === 'full') { camera.position.set(trackCenter.x + fitDist * 0.56, trackCenter.y + fitDist * 0.44, trackCenter.z + fitDist * 0.72); controls.target.copy(trackCenter); }
  else if (mode === 'polar') { camera.position.set(trackCenter.x, fitDist * 1.18, trackCenter.z + 0.05); controls.target.copy(trackCenter); }
  else if (mode === 'chase' && satMesh) {
    controls.target.copy(tmpSat); const dir = tmpSat.length() > 0.1 ? tmpSat.clone().normalize() : new THREE.Vector3(1, 0.4, 1);
    camera.position.copy(tmpSat).addScaledVector(dir, orbitEl?.deepSpace ? 4.5 : 2.1).add(new THREE.Vector3(0, 0.9, 1.2));
  }
  controls.update();
}

function buildWorld(missionState, evaluation) {
  orbitEl = evaluation.orbitElements; const deep = Boolean(orbitEl.deepSpace);
  const starPos = new Float32Array(800 * 3);
  for (let i = 0; i < 800; i += 1) {
    const u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, r = 720, s = Math.sqrt(1 - u * u);
    starPos[i * 3] = r * s * Math.cos(phi); starPos[i * 3 + 1] = r * u; starPos[i * 3 + 2] = r * s * Math.sin(phi);
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcbd5e1, size: 1.2, sizeAttenuation: false })));
  scene.add(new THREE.AmbientLight(0x475569, 0.7));
  const sun = new THREE.DirectionalLight(0xfffbeb, 2.5); sun.position.set(160, 0, 0); scene.add(sun);

  earthGroup = new THREE.Group();
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 44, 28), new THREE.MeshStandardMaterial({ map: makePlanetTex(false), roughness: 0.75, metalness: 0.08 })));
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.045, 36, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.16, side: THREE.BackSide })));
  const shadow = new THREE.Mesh(new THREE.CylinderGeometry(EARTH_R * 0.98, EARTH_R * 0.98, 22, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  shadow.rotation.z = Math.PI / 2; shadow.position.x = -11; scene.add(shadow);

  gsNodes = STATIONS.map((gs) => {
    const active = gs.id === missionState.stationId;
    const m = new THREE.Mesh(new THREE.SphereGeometry(active ? 0.095 : 0.06, 12, 10), new THREE.MeshBasicMaterial({ color: active ? 0x22c55e : 0xf59e0b }));
    const localPos = latLonToVec(gs.lat, gs.lon, EARTH_R * 1.02);
    m.position.copy(localPos);
    const localNorm = localPos.clone().normalize();
    let cone = null;
    if (active) {
      cone = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.88, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), localNorm);
      cone.position.copy(localPos).addScaledVector(localNorm, 0.44);
      earthGroup.add(cone);
    }
    earthGroup.add(m);
    return { ...gs, active, mesh: m, cone, localNorm };
  });
  scene.add(earthGroup);

  const track = generateOrbitTrack(orbitEl, 150);
  const pts = track.points.map((p) => new THREE.Vector3(p.position[0] * KM_TO_SCENE, p.position[1] * KM_TO_SCENE, p.position[2] * KM_TO_SCENE));
  const box = new THREE.Box3().setFromPoints(pts); box.getCenter(trackCenter);
  const sphere = new THREE.Sphere(); box.getBoundingSphere(sphere);
  fitDist = Math.max(6.4, sphere.radius * 2.55);

  if (deep || missionState.scenarioId === 'lunar-l3') {
    let apogeePt = pts[0]; pts.forEach((p) => { if (p.lengthSq() > apogeePt.lengthSq()) apogeePt = p; });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(deep ? EARTH_R * 0.45 : EARTH_R * 0.27, 24, 16), new THREE.MeshStandardMaterial({ map: makePlanetTex(true), roughness: 0.9 }));
    moon.position.copy(orbitEl.id === 'lunar-transfer' ? apogeePt.clone().multiplyScalar(1.04) : new THREE.Vector3(-12, 4, -14));
    scene.add(moon);
  }

  orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 }));
  scene.add(orbitLine);

  satMesh = new THREE.Group();
  const scale = orbitEl.id === 'lunar-transfer' ? 3.2 : (deep ? 1.8 : 0.9);
  satMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.14 * scale, 0.18 * scale), new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.25 })));
  satMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.64 * scale, 0.03 * scale, 0.14 * scale), new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x0f172a })));
  scene.add(satMesh);

  const bGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  beamLine = new THREE.Line(bGeo, new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.92 }));
  beamLine.visible = false; scene.add(beamLine);
  controls.maxDistance = Math.max(60, fitDist * 3.2); applyCameraPreset(cameraMode);
}

function animate() {
  rafId = requestAnimationFrame(animate);
  const now = performance.now(), realDt = Math.min(clock.getDelta(), 0.05), simDt = realDt * timeWarp;
  simTime += simDt;
  if (earthGroup) earthGroup.rotation.y += simDt * ((Math.PI * 2) / 86400);

  const prop = propagateOrbit(orbitEl, simTime);
  tmpSat.set(prop.position[0] * KM_TO_SCENE, prop.position[1] * KM_TO_SCENE, prop.position[2] * KM_TO_SCENE);
  if (satMesh) {
    satMesh.position.copy(tmpSat); satMesh.lookAt(0, 0, 0);
    if (cameraMode === 'chase') controls.target.lerp(tmpSat, 0.15);
  }

  if (simTime > 12 && simTime - lastAutoFlare > 22 && now > stormUntil) {
    stormUntil = now + 5500; lastAutoFlare = simTime; playWarning();
  }
  const stormActive = now < stormUntil, safeModeActive = now < safeModeUntil;
  hazardNow = prop.inEclipse || stormActive;
  const pwrRate = safeModeActive ? 0.35 : (hazardNow ? -0.45 : Math.max(0.15, (evalRef.metrics.powerMargin + 25) * 0.012));
  if (simDt > 0) {
    batterySoc = Math.max(5, Math.min(100, batterySoc + pwrRate * (simDt / 60)));
    bufferGb = Math.min(32, bufferGb + (simDt / 86400) * 1.6);
  }

  inLineOfSight = false; activeStationName = 'None';
  const activeGs = gsNodes.find((g) => g.active) || gsNodes[0];
  if (activeGs && beamLine) {
    activeGs.mesh.getWorldPosition(tmpGs);
    tmpNorm.copy(activeGs.localNorm).applyQuaternion(earthGroup.quaternion);
    const losDot = tmpSat.clone().sub(tmpGs).normalize().dot(tmpNorm);
    const rangeOk = orbitEl.deepSpace ? true : tmpSat.distanceTo(tmpGs) < 5.5;
    if (activeGs.cone) activeGs.cone.material.opacity = 0.16 + 0.14 * Math.abs(Math.sin(now * 0.004));
    if (losDot > 0.08 && rangeOk && !stormActive) {
      inLineOfSight = true; activeStationName = activeGs.name;
      beamLine.visible = true;
      beamLine.material.color.setHex(now < beamBoostUntil ? 0x34d399 : 0x22d3ee);
      beamLine.geometry.setFromPoints([tmpSat, tmpGs]);
      if (simDt > 0 && bufferGb > 0) {
        const xfer = Math.min(bufferGb, (simDt / 60) * 0.08);
        bufferGb -= xfer; downlinkedGb += xfer;
      }
    } else beamLine.visible = false;
  }

  if (telemetryCb && now - lastHudMs > 120) {
    lastHudMs = now;
    telemetryCb({
      altitudeKm: Math.round(prop.altitudeKm), speedKms: Number(prop.speedKms.toFixed(2)),
      inEclipse: prop.inEclipse, stormActive, safeModeActive, inLineOfSight,
      batterySoc: Math.round(batterySoc), bufferGb: Number(bufferGb.toFixed(2)), downlinkedGb: Number(downlinkedGb.toFixed(2)),
      linkedStation: activeStationName, missionScore, downlinkCount, flareMitigated,
      timeWarp, cameraMode, fitDist: Number(fitDist.toFixed(1))
    });
  }
  controls.update(); renderer.render(scene, camera);
}

export const setOrbitTimeWarp = (w) => { timeWarp = Number(w); };
export const setOrbitCameraMode = (m) => { cameraMode = m; applyCameraPreset(m); };
export const triggerOrbitStorm = () => { stormUntil = performance.now() + 6000; playWarning(); };
export function transmitScience() {
  if (!inLineOfSight) return { ok: false, points: 0, station: 'None' };
  const xfer = Math.max(0.15, Math.min(bufferGb, 1.4));
  bufferGb = Math.max(0, bufferGb - xfer); downlinkedGb += xfer;
  downlinkCount += 1; missionScore += 50; beamBoostUntil = performance.now() + 900;
  playDownlinkPing();
  return { ok: true, points: 50, station: activeStationName };
}
export function activateSafeMode() {
  safeModeUntil = performance.now() + 6500;
  batterySoc = Math.min(100, batterySoc + 8);
  const pts = hazardNow ? 75 : 25;
  missionScore += pts; if (hazardNow) flareMitigated += 1;
  playSafeMode();
  return { ok: true, points: pts, hazard: hazardNow };
}

export function mountOrbit(container, missionState, evaluation, onTelemetry) {
  unmountOrbit();
  stateRef = missionState; evalRef = evaluation; telemetryCb = onTelemetry;
  simTime = 0; batterySoc = 84; bufferGb = 0.25; downlinkedGb = 0; stormUntil = 0; safeModeUntil = 0;
  beamBoostUntil = 0; missionScore = 0; downlinkCount = 0; flareMitigated = 0; lastAutoFlare = 10; lastHudMs = 0;
  const w = Math.max(container.clientWidth, 320), h = Math.max(container.clientHeight, 320);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; container.appendChild(renderer.domElement);

  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1600);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 2.8 });
  buildWorld(stateRef, evalRef);

  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !container) return;
    const nw = Math.max(container.clientWidth, 1), nh = Math.max(container.clientHeight, 1);
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh, false);
  });
  resizeObserver.observe(container); clock.start(); animate();
}

export function unmountOrbit() {
  if (rafId) cancelAnimationFrame(rafId); rafId = 0;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (controls) { controls.dispose(); controls = null; }
  if (scene) {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    scene = null;
  }
  if (renderer) { renderer.domElement?.remove(); renderer.dispose(); renderer = null; }
  earthGroup = satMesh = beamLine = orbitLine = null; gsNodes = [];
}
