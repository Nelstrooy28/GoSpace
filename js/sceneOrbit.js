import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { generateOrbitTrack, propagateOrbit } from './missionVizPropagator.js';
import { createSpaceEnvironment } from './solarSystem.js';
import { playDownlinkPing, playSafeMode, playWarning } from './sfx.js';

const EARTH_R = 2.0, KM_TO_SCENE = EARTH_R / 6371;
const STATIONS = [{ id: 'inuvik', name: 'Arctic Polar Station', lat: 68.36, lon: -133.72 }, { id: 'nsn', name: 'Global Near-Space Network', lat: 37.94, lon: -75.46 }, { id: 'dsn', name: 'Deep-Space Dish Array', lat: 35.43, lon: -116.89 }];

let renderer = null, scene = null, camera = null, controls = null, resizeObserver = null, spaceEnv = null;
let rafId = 0, earthGroup = null, cloudMesh = null, satMesh = null, beamLine = null, scanLine = null, orbitLine = null;
let gsNodes = [], orbitPts = [], colorAttr = null, velArrow = null, orbitEl = null, stateRef = null, evalRef = null, telemetryCb = null;
let simTime = 0, timeWarp = 25, cameraMode = 'full', stormUntil = 0, safeModeUntil = 0, beamBoostUntil = 0, scanUntil = 0, scanTarget = null;
let batterySoc = 84, bufferGb = 0.25, downlinkedGb = 0, lastHudMs = 0, fitDist = 7.2, sunElapsed = 0;
let missionScore = 0, downlinkCount = 0, flareMitigated = 0, asteroidsScanned = 0, lastAutoFlare = 14, inLineOfSight = false, activeStationName = 'None', hazardNow = false;
const clock = new THREE.Clock(), trackCenter = new THREE.Vector3(), tmpSat = new THREE.Vector3(), tmpNext = new THREE.Vector3(), tmpGs = new THREE.Vector3(), tmpNorm = new THREE.Vector3();

function latLonToVec(latDeg, lonDeg, r) {
  const lat = (latDeg * Math.PI) / 180, lon = (lonDeg * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lon));
}

function makeEarthMaps() {
  const mk = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const lands = [[105, 86, 46, 32], [142, 158, 25, 40], [278, 84, 68, 30], [292, 146, 36, 42], [412, 166, 30, 22], [190, 52, 24, 14]];
  const map = mk(512, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#f1f5f9'); g.addColorStop(0.11, '#0c4a6e'); g.addColorStop(0.5, '#062c56'); g.addColorStop(0.89, '#0c4a6e'); g.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
    lands.forEach(([x, y, rx, ry], idx) => { ctx.fillStyle = idx % 2 ? '#2d6a4f' : '#3a7d44'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#a1884f'; ctx.beginPath(); ctx.ellipse(x + 6, y - 3, rx * 0.45, ry * 0.35, 0.1, 0, Math.PI * 2); ctx.fill(); });
  });
  const emissiveMap = mk(256, 128, (ctx) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 128); ctx.fillStyle = '#ffd166';
    lands.forEach(([x, y, rx, ry]) => { for (let k = 0; k < 14; k += 1) ctx.fillRect((x * 0.5) + ((k * 17) % Math.max(8, rx)) - rx * 0.45, (y * 0.5) + ((k * 13) % Math.max(6, ry)) - ry * 0.45, 1.8, 1.8); });
  });
  const cloudMap = mk(256, 128, (ctx) => {
    for (let i = 0; i < 48; i += 1) { ctx.fillStyle = `rgba(241,245,249,${0.12 + (i % 4) * 0.06})`; ctx.beginPath(); ctx.ellipse((i * 47) % 256, 18 + (i * 23) % 92, 18 + (i % 14), 5 + (i % 5), 0.15, 0, Math.PI * 2); ctx.fill(); }
  });
  return { map, emissiveMap, cloudMap };
}

function makeTagSprite(label, color) {
  const c = document.createElement('canvas'); c.width = 96; c.height = 48; const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(4,10,22,0.86)'; ctx.fillRect(8, 8, 80, 32); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(8, 8, 80, 32);
  ctx.fillStyle = color; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 48, 25);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  sp.scale.set(0.85, 0.42, 1); return sp;
}

function applyCameraPreset(mode) {
  if (!camera || !controls) return;
  if (mode === 'full') { camera.position.set(trackCenter.x + fitDist * 0.56, trackCenter.y + fitDist * 0.44, trackCenter.z + fitDist * 0.72); controls.target.copy(trackCenter); }
  else if (mode === 'chase' && satMesh) { controls.target.copy(tmpSat.clone().multiplyScalar(0.35)); const dir = tmpSat.length() > 0.1 ? tmpSat.clone().normalize() : new THREE.Vector3(1, 0.4, 1); camera.position.copy(tmpSat).addScaledVector(dir, orbitEl?.deepSpace ? 4.2 : 1.75).add(new THREE.Vector3(0, 0.65, 0.9)); }
  else if (mode === 'asteroid' && spaceEnv) { const { nea } = spaceEnv.findNearestNea(tmpSat); controls.target.copy(nea.mesh.position); camera.position.copy(nea.mesh.position).add(new THREE.Vector3(2.4, 1.5, 3.2)); }
  else if (mode === 'solar') { controls.target.set(85, 0, -25); camera.position.set(18, 78, 196); }
  controls.update();
}

function buildWorld(missionState, evaluation) {
  orbitEl = evaluation.orbitElements; const deep = Boolean(orbitEl.deepSpace);
  scene.add(new THREE.AmbientLight(0x334155, 0.45));
  const sunLight = new THREE.DirectionalLight(0xfff7e6, 2.7); sunLight.position.set(260, 0, 0); scene.add(sunLight);

  const maps = makeEarthMaps();
  earthGroup = new THREE.Group();
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 48, 32), new THREE.MeshStandardMaterial({ map: maps.map, emissiveMap: maps.emissiveMap, emissive: 0xffb347, emissiveIntensity: 0.42, roughness: 0.72, metalness: 0.08 })));
  cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.018, 40, 24), new THREE.MeshStandardMaterial({ map: maps.cloudMap, transparent: true, opacity: 0.82, depthWrite: false }));
  earthGroup.add(cloudMesh);
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.072, 36, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })));

  const umbra = new THREE.Mesh(new THREE.CylinderGeometry(EARTH_R * 0.99, EARTH_R * 0.62, 28, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false }));
  umbra.rotation.z = Math.PI / 2; umbra.position.x = -14; scene.add(umbra);
  const refGrid = new THREE.PolarGridHelper(16, 12, 4, 48, 0x1e3a5f, 0x0f2544); refGrid.material.transparent = true; refGrid.material.opacity = 0.22; scene.add(refGrid);

  gsNodes = STATIONS.map((gs) => {
    const active = gs.id === missionState.stationId, localPos = latLonToVec(gs.lat, gs.lon, EARTH_R * 1.02), localNorm = localPos.clone().normalize();
    const m = new THREE.Mesh(new THREE.SphereGeometry(active ? 0.095 : 0.06, 12, 10), new THREE.MeshBasicMaterial({ color: active ? 0x22c55e : 0xf59e0b }));
    m.position.copy(localPos); earthGroup.add(m);
    let cone = null;
    if (active) {
      cone = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.88, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), localNorm); cone.position.copy(localPos).addScaledVector(localNorm, 0.44); earthGroup.add(cone);
    }
    return { ...gs, active, mesh: m, cone, localNorm };
  });
  scene.add(earthGroup);

  const track = generateOrbitTrack(orbitEl, 150);
  orbitPts = track.points.map((p) => new THREE.Vector3(p.position[0] * KM_TO_SCENE, p.position[1] * KM_TO_SCENE, p.position[2] * KM_TO_SCENE));
  const box = new THREE.Box3().setFromPoints(orbitPts); box.getCenter(trackCenter);
  const sphere = new THREE.Sphere(); box.getBoundingSphere(sphere); fitDist = Math.max(6.4, sphere.radius * 2.55);

  let pePt = orbitPts[0], apPt = orbitPts[0];
  orbitPts.forEach((p) => { if (p.lengthSq() < pePt.lengthSq()) pePt = p; if (p.lengthSq() > apPt.lengthSq()) apPt = p; });
  const peTag = makeTagSprite('Pe', '#10b981'); peTag.position.copy(pePt).add(new THREE.Vector3(0, 0.45, 0)); scene.add(peTag);
  const apTag = makeTagSprite('Ap', '#f59e0b'); apTag.position.copy(apPt).add(new THREE.Vector3(0, 0.55, 0)); scene.add(apTag);

  const moonPos = orbitEl.id === 'lunar-transfer' ? apPt.clone().multiplyScalar(1.04) : new THREE.Vector3(-14, 3.5, -16);
  spaceEnv = createSpaceEnvironment(scene, { moonPos, moonScale: deep ? EARTH_R * 0.44 : EARTH_R * 0.3 });

  const oGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
  colorAttr = new THREE.BufferAttribute(new Float32Array(orbitPts.length * 3), 3);
  oGeo.setAttribute('color', colorAttr);
  orbitLine = new THREE.Line(oGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 }));
  scene.add(orbitLine);

  satMesh = new THREE.Group();
  const sc = orbitEl.id === 'lunar-transfer' ? 3.2 : (deep ? 1.8 : 0.92);
  satMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.18 * sc, 0.14 * sc, 0.18 * sc), new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.25 })));
  satMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.66 * sc, 0.03 * sc, 0.14 * sc), new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x0f172a })));
  velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.72 * sc, 0x38bdf8, 0.2 * sc, 0.1 * sc);
  satMesh.add(velArrow); scene.add(satMesh);

  beamLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.92 }));
  scanLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95 }));
  beamLine.visible = false; scanLine.visible = false; scene.add(beamLine, scanLine);
  controls.maxDistance = 420; applyCameraPreset(cameraMode);
}

function animate() {
  rafId = requestAnimationFrame(animate);
  const now = performance.now(), realDt = Math.min(clock.getDelta(), 0.05), simDt = realDt * timeWarp;
  simTime += simDt; sunElapsed += realDt;
  if (earthGroup) earthGroup.rotation.y += simDt * ((Math.PI * 2) / 86400);
  if (cloudMesh) cloudMesh.rotation.y += realDt * 0.015;
  spaceEnv?.update(realDt, sunElapsed);

  const prop = propagateOrbit(orbitEl, simTime), nextP = propagateOrbit(orbitEl, simTime + 5);
  tmpSat.set(prop.position[0] * KM_TO_SCENE, prop.position[1] * KM_TO_SCENE, prop.position[2] * KM_TO_SCENE);
  tmpNext.set(nextP.position[0] * KM_TO_SCENE, nextP.position[1] * KM_TO_SCENE, nextP.position[2] * KM_TO_SCENE);
  if (satMesh) {
    satMesh.position.copy(tmpSat);
    if (velArrow) velArrow.setDirection(tmpNext.sub(tmpSat).normalize());
    if (cameraMode === 'chase') controls.target.lerp(tmpSat, 0.12);
  }
  if (colorAttr && orbitPts.length) {
    const head = Math.floor(((prop.trueAnomalyDeg / 360) * (orbitPts.length - 1)));
    for (let i = 0; i < orbitPts.length; i += 1) {
      const distBack = (head - i + orbitPts.length) % orbitPts.length;
      const wake = Math.max(0.18, 1 - distBack / (orbitPts.length * 0.55));
      colorAttr.setXYZ(i, distBack < 14 ? 0.95 : 0.22 * wake, 0.75 * wake, 1.0 * wake);
    }
    colorAttr.needsUpdate = true;
  }

  if (simTime > 12 && simTime - lastAutoFlare > 24 && now > stormUntil) { stormUntil = now + 5500; lastAutoFlare = simTime; playWarning(); }
  const stormActive = now < stormUntil, safeModeActive = now < safeModeUntil;
  hazardNow = prop.inEclipse || stormActive;
  const pwrRate = safeModeActive ? 0.35 : (hazardNow ? -0.45 : Math.max(0.15, (evalRef.metrics.powerMargin + 25) * 0.012));
  if (simDt > 0) { batterySoc = Math.max(5, Math.min(100, batterySoc + pwrRate * (simDt / 60))); bufferGb = Math.min(32, bufferGb + (simDt / 86400) * 1.6); }

  inLineOfSight = false; activeStationName = 'None';
  const activeGs = gsNodes.find((g) => g.active) || gsNodes[0];
  if (activeGs && beamLine) {
    activeGs.mesh.getWorldPosition(tmpGs); tmpNorm.copy(activeGs.localNorm).applyQuaternion(earthGroup.quaternion);
    const losDot = tmpSat.clone().sub(tmpGs).normalize().dot(tmpNorm), rangeOk = orbitEl.deepSpace ? true : tmpSat.distanceTo(tmpGs) < 5.5;
    if (activeGs.cone) activeGs.cone.material.opacity = 0.16 + 0.14 * Math.abs(Math.sin(now * 0.004));
    if (losDot > 0.08 && rangeOk && !stormActive) {
      inLineOfSight = true; activeStationName = activeGs.name; beamLine.visible = true;
      beamLine.material.color.setHex(now < beamBoostUntil ? 0x34d399 : 0x22d3ee); beamLine.geometry.setFromPoints([tmpSat, tmpGs]);
      if (simDt > 0 && bufferGb > 0) { const xfer = Math.min(bufferGb, (simDt / 60) * 0.08); bufferGb -= xfer; downlinkedGb += xfer; }
    } else beamLine.visible = false;
  }
  if (scanLine) { scanLine.visible = now < scanUntil && Boolean(scanTarget); if (scanLine.visible) scanLine.geometry.setFromPoints([tmpSat, scanTarget.mesh.position]); }

  if (telemetryCb && now - lastHudMs > 120) {
    lastHudMs = now;
    const nearest = spaceEnv?.findNearestNea(tmpSat);
    telemetryCb({
      altitudeKm: Math.round(prop.altitudeKm), speedKms: Number(prop.speedKms.toFixed(2)), inEclipse: prop.inEclipse, stormActive, safeModeActive, inLineOfSight,
      batterySoc: Math.round(batterySoc), bufferGb: Number(bufferGb.toFixed(2)), downlinkedGb: Number(downlinkedGb.toFixed(2)), linkedStation: activeStationName,
      missionScore, downlinkCount, flareMitigated, asteroidsScanned, nearestNeaId: nearest?.nea.id || '', nearestNeaDist: nearest ? Number(nearest.dist.toFixed(1)) : 99,
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
  const xfer = Math.max(0.15, Math.min(bufferGb, 1.4)); bufferGb = Math.max(0, bufferGb - xfer); downlinkedGb += xfer;
  downlinkCount += 1; missionScore += 50; beamBoostUntil = performance.now() + 900; playDownlinkPing();
  return { ok: true, points: 50, station: activeStationName };
}
export function activateSafeMode() {
  safeModeUntil = performance.now() + 6500; batterySoc = Math.min(100, batterySoc + 8);
  const pts = hazardNow ? 75 : 25; missionScore += pts; if (hazardNow) flareMitigated += 1;
  playSafeMode(); return { ok: true, points: pts, hazard: hazardNow };
}
export function scanAsteroid() {
  if (!spaceEnv) return { ok: false, points: 0 };
  const { nea } = spaceEnv.findNearestNea(tmpSat);
  scanTarget = nea; scanUntil = performance.now() + 1200; asteroidsScanned += 1; missionScore += 60;
  playDownlinkPing(); return { ok: true, points: 60, id: nea.id };
}

export function mountOrbit(container, missionState, evaluation, onTelemetry) {
  unmountOrbit(); stateRef = missionState; evalRef = evaluation; telemetryCb = onTelemetry;
  simTime = 0; sunElapsed = 0; batterySoc = 84; bufferGb = 0.25; downlinkedGb = 0; stormUntil = 0; safeModeUntil = 0;
  beamBoostUntil = 0; scanUntil = 0; scanTarget = null; missionScore = 0; downlinkCount = 0; flareMitigated = 0; asteroidsScanned = 0; lastAutoFlare = 14; lastHudMs = 0;
  const w = Math.max(container.clientWidth, 320), h = Math.max(container.clientHeight, 320);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false); renderer.outputColorSpace = THREE.SRGBColorSpace; container.appendChild(renderer.domElement);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 2600);
  controls = new OrbitControls(camera, renderer.domElement); Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 2.5 });
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
  spaceEnv?.dispose(); spaceEnv = null;
  if (scene) {
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); }); });
    scene = null;
  }
  if (renderer) { renderer.domElement?.remove(); renderer.dispose(); renderer = null; }
  earthGroup = cloudMesh = satMesh = beamLine = scanLine = orbitLine = velArrow = colorAttr = null; gsNodes = []; orbitPts = [];
}
