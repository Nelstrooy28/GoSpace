import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { generateOrbitTrack, propagateOrbit } from './missionVizPropagator.js';

const EARTH_R = 2.0;
const KM_TO_SCENE = EARTH_R / 6371;
const STATIONS = [
  { id: 'inuvik', name: 'CSA Inuvik', lat: 68.36, lon: -133.72 },
  { id: 'nsn', name: 'NASA NSN', lat: 37.94, lon: -75.46 },
  { id: 'dsn', name: 'NASA DSN', lat: 35.43, lon: -116.89 }
];

let renderer = null, scene = null, camera = null, controls = null, resizeObserver = null;
let rafId = 0, earthGroup = null, satMesh = null, beamLine = null, orbitLine = null;
let gsNodes = [], orbitEl = null, stateRef = null, evalRef = null, telemetryCb = null;
let simTime = 0, timeWarp = 20, cameraMode = 'earth', stormUntil = 0;
let batterySoc = 84, bufferGb = 0.25, downlinkedGb = 0, lastHudMs = 0;
const clock = new THREE.Clock();
const ORIGIN = new THREE.Vector3(0, 0, 0);
const tmpSat = new THREE.Vector3(), tmpGs = new THREE.Vector3(), tmpNorm = new THREE.Vector3();

function latLonToVec(latDeg, lonDeg, r) {
  const lat = (latDeg * Math.PI) / 180, lon = (lonDeg * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lon));
}

function makePlanetTex(isMoon = false) {
  const c = document.createElement('canvas');
  c.width = isMoon ? 128 : 512; c.height = isMoon ? 64 : 256;
  const ctx = c.getContext('2d');
  if (isMoon) {
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, 0, 128, 64);
    for (let i = 0; i < 28; i += 1) {
      ctx.fillStyle = i % 2 ? '#64748b' : '#cbd5e1';
      ctx.beginPath();
      ctx.arc((i * 37) % 128, (i * 23) % 64, 2 + (i % 5), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#e2e8f0'); g.addColorStop(0.1, '#0c4a6e');
    g.addColorStop(0.5, '#072f5f'); g.addColorStop(0.9, '#0c4a6e'); g.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#2d6a4f';
    [[115, 92, 42, 34], [150, 165, 26, 40], [285, 86, 62, 32], [295, 145, 34, 42], [415, 168, 28, 22]].forEach(([x, y, rx, ry]) => {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 16; i += 1) ctx.fillRect((i * 43) % 480, 28 + (i * 19) % 190, 48, 5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function disposeScene() {
  if (!scene) return;
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    }
  });
}

function buildWorld(missionState, evaluation) {
  orbitEl = evaluation.orbitElements;
  const deep = Boolean(orbitEl.deepSpace);
  const starPos = new Float32Array(750 * 3);
  for (let i = 0; i < 750; i += 1) {
    const u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, r = 340, s = Math.sqrt(1 - u * u);
    starPos[i * 3] = r * s * Math.cos(phi); starPos[i * 3 + 1] = r * u; starPos[i * 3 + 2] = r * s * Math.sin(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcbd5e1, size: 1.1, sizeAttenuation: false })));

  scene.add(new THREE.AmbientLight(0x475569, 0.65));
  const sun = new THREE.DirectionalLight(0xfffbeb, 2.5);
  sun.position.set(120, 0, 0);
  scene.add(sun);

  earthGroup = new THREE.Group();
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 44, 28), new THREE.MeshStandardMaterial({ map: makePlanetTex(false), roughness: 0.75, metalness: 0.08 })));
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.045, 36, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.14, side: THREE.BackSide })));
  const shadow = new THREE.Mesh(new THREE.CylinderGeometry(EARTH_R * 0.98, EARTH_R * 0.98, 22, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  shadow.rotation.z = Math.PI / 2; shadow.position.x = -11;
  scene.add(shadow);

  gsNodes = STATIONS.map((gs) => {
    const active = gs.id === missionState.stationId;
    const m = new THREE.Mesh(new THREE.SphereGeometry(active ? 0.085 : 0.06, 12, 10), new THREE.MeshBasicMaterial({ color: active ? 0x22c55e : 0xf59e0b }));
    const localPos = latLonToVec(gs.lat, gs.lon, EARTH_R * 1.02);
    m.position.copy(localPos);
    earthGroup.add(m);
    return { ...gs, active, mesh: m, localNorm: localPos.clone().normalize() };
  });
  scene.add(earthGroup);

  if (deep || missionState.scenarioId === 'lunar-l3') {
    const moon = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 0.27, 24, 16), new THREE.MeshStandardMaterial({ map: makePlanetTex(true), roughness: 0.9 }));
    moon.position.set(orbitEl.id === 'lunar-transfer' ? -82 : -14, 5, -18);
    scene.add(moon);
  }

  const track = generateOrbitTrack(orbitEl, 140);
  const pts = track.points.map((p) => new THREE.Vector3(p.position[0] * KM_TO_SCENE, p.position[1] * KM_TO_SCENE, p.position[2] * KM_TO_SCENE));
  orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 }));
  scene.add(orbitLine);

  satMesh = new THREE.Group();
  const scale = deep ? 1.8 : 0.9;
  satMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.14 * scale, 0.18 * scale), new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.25 })));
  satMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.64 * scale, 0.03 * scale, 0.14 * scale), new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x0f172a })));
  scene.add(satMesh);

  const bGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  beamLine = new THREE.Line(bGeo, new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 }));
  beamLine.visible = false;
  scene.add(beamLine);

  camera.position.set(...(orbitEl.id === 'lunar-transfer' ? [34, 24, 48] : (deep ? [10, 7, 13] : [4.6, 3.0, 5.2])));
  controls.maxDistance = orbitEl.id === 'lunar-transfer' ? 240 : 48;
  controls.target.set(0, 0, 0);
  controls.update();
}

function animate() {
  rafId = requestAnimationFrame(animate);
  const realDt = Math.min(clock.getDelta(), 0.05);
  const simDt = realDt * timeWarp;
  simTime += simDt;
  if (earthGroup) earthGroup.rotation.y += simDt * ((Math.PI * 2) / 86400);

  const prop = propagateOrbit(orbitEl, simTime);
  tmpSat.set(prop.position[0] * KM_TO_SCENE, prop.position[1] * KM_TO_SCENE, prop.position[2] * KM_TO_SCENE);
  if (satMesh) {
    satMesh.position.copy(tmpSat);
    satMesh.lookAt(0, 0, 0);
    if (cameraMode === 'chase') controls.target.lerp(tmpSat, 0.12);
    else controls.target.lerp(ORIGIN, 0.12);
  }

  const stormActive = performance.now() < stormUntil;
  const inDark = prop.inEclipse || stormActive;
  const pwrRate = inDark ? -0.45 : Math.max(0.15, (evalRef.metrics.powerMargin + 25) * 0.012);
  if (simDt > 0) {
    batterySoc = Math.max(5, Math.min(100, batterySoc + pwrRate * (simDt / 60)));
    bufferGb = Math.min(32, bufferGb + (simDt / 86400) * 1.6);
  }

  let linkedName = 'None';
  const activeGs = gsNodes.find((g) => g.active) || gsNodes[0];
  if (activeGs && beamLine) {
    activeGs.mesh.getWorldPosition(tmpGs);
    tmpNorm.copy(activeGs.localNorm).applyQuaternion(earthGroup.quaternion);
    const losDot = tmpSat.clone().sub(tmpGs).normalize().dot(tmpNorm);
    const rangeOk = orbitEl.deepSpace ? true : tmpSat.distanceTo(tmpGs) < 5.5;
    if (losDot > 0.08 && rangeOk && !stormActive) {
      linkedName = activeGs.name;
      beamLine.visible = true;
      beamLine.geometry.setFromPoints([tmpSat, tmpGs]);
      if (simDt > 0 && bufferGb > 0) {
        const xfer = Math.min(bufferGb, (simDt / 60) * 0.08);
        bufferGb -= xfer; downlinkedGb += xfer;
      }
    } else {
      beamLine.visible = false;
    }
  }

  const now = performance.now();
  if (telemetryCb && now - lastHudMs > 120) {
    lastHudMs = now;
    telemetryCb({
      altitudeKm: Math.round(prop.altitudeKm),
      speedKms: Number(prop.speedKms.toFixed(2)),
      inEclipse: prop.inEclipse,
      stormActive,
      batterySoc: Math.round(batterySoc),
      bufferGb: Number(bufferGb.toFixed(2)),
      downlinkedGb: Number(downlinkedGb.toFixed(2)),
      linkedStation: linkedName,
      timeWarp, cameraMode
    });
  }
  controls.update();
  renderer.render(scene, camera);
}

export const setOrbitTimeWarp = (w) => { timeWarp = Number(w); };
export const setOrbitCameraMode = (m) => { cameraMode = m; };
export const triggerOrbitStorm = () => { stormUntil = performance.now() + 6000; };

export function mountOrbit(container, missionState, evaluation, onTelemetry) {
  unmountOrbit();
  stateRef = missionState; evalRef = evaluation; telemetryCb = onTelemetry;
  simTime = 0; batterySoc = 84; bufferGb = 0.25; downlinkedGb = 0; stormUntil = 0; lastHudMs = 0;
  const w = Math.max(container.clientWidth, 320), h = Math.max(container.clientHeight, 320);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 700);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 2.8 });
  buildWorld(stateRef, evalRef);

  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !container) return;
    const nw = Math.max(container.clientWidth, 1), nh = Math.max(container.clientHeight, 1);
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh, false);
  });
  resizeObserver.observe(container);
  clock.start();
  animate();
}

export function unmountOrbit() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (controls) { controls.dispose(); controls = null; }
  disposeScene(); scene = null;
  if (renderer) { renderer.domElement?.remove(); renderer.dispose(); renderer = null; }
  earthGroup = null; satMesh = null; beamLine = null; orbitLine = null; gsNodes = [];
}
