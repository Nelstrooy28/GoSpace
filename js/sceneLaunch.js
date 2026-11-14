import * as THREE from 'three';
import { playCountdownBeep, startRocketRumbling, stopRocketRumbling } from './sfx.js';

let renderer = null, scene = null, camera = null, resizeObserver = null, rafId = 0;
let rocketGroup = null, boosterGroup = null, stage2Group = null, fairingL = null, fairingR = null;
let wingL = null, wingR = null, armPivot = null, padGroup = null, flames = [], puffs = [];
let starMat = null, trenchLight = null, skyColor = null, camMode = 'rocket';
let ignitedCmd = false, igniteElapsed = 0, lastBeep = -1, rumbleOn = false, padClock = 0;
let completed = false, lastHudMs = 0, updateCb = null, completeCb = null;
const clock = new THREE.Clock();
const SKY_PAD = new THREE.Color(0x164e87), SKY_MID = new THREE.Color(0x0b1d3a), SKY_SPACE = new THREE.Color(0x040810);

function addMesh(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.rotation.set(...rot); parent.add(m); return m;
}

function buildRocket(vehicleId) {
  const isElectron = vehicleId === 'electron', isHeavy = vehicleId === 'falcon-heavy';
  const r = isElectron ? 0.16 : 0.24;
  const dark = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7, roughness: 0.35 });
  const body = new THREE.MeshStandardMaterial({ color: isElectron ? 0x18181b : 0xf1f5f9, metalness: 0.35, roughness: 0.38 });
  const accent = new THREE.MeshStandardMaterial({ color: isElectron ? 0xef4444 : 0x0f172a, metalness: 0.5, roughness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });
  const solar = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.6, roughness: 0.25 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.9 });

  rocketGroup = new THREE.Group();
  boosterGroup = new THREE.Group();
  stage2Group = new THREE.Group();
  rocketGroup.add(boosterGroup, stage2Group);

  const bH = isElectron ? 2.1 : 2.7;
  addMesh(boosterGroup, new THREE.CylinderGeometry(r, r, bH, 20), body, [0, bH / 2 + 0.2, 0]);
  addMesh(boosterGroup, new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.22, 20), accent, [0, bH + 0.08, 0]);
  const f0 = addMesh(boosterGroup, new THREE.ConeGeometry(r * 0.9, 1.35, 16), flameMat, [0, -0.45, 0], [Math.PI, 0, 0]);
  f0.visible = false; flames.push(f0);

  if (isHeavy) {
    [-0.56, 0.56].forEach((bx) => {
      addMesh(boosterGroup, new THREE.CylinderGeometry(r * 0.88, r * 0.88, bH * 0.92, 18), body, [bx, bH * 0.46 + 0.2, 0]);
      addMesh(boosterGroup, new THREE.ConeGeometry(r * 0.88, 0.52, 18), body, [bx, bH * 0.92 + 0.46, 0]);
      addMesh(boosterGroup, new THREE.BoxGeometry(0.32, 0.06, 0.08), dark, [bx * 0.5, bH * 0.72, 0]);
      const fb = addMesh(boosterGroup, new THREE.ConeGeometry(r * 0.75, 1.2, 14), flameMat, [bx, -0.35, 0], [Math.PI, 0, 0]);
      fb.visible = false; flames.push(fb);
    });
  }

  const s2Y = bH + 0.2;
  addMesh(stage2Group, new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.85, 20), body, [0, s2Y + 0.42, 0]);
  // Payload & unfolding solar wings inside fairing
  const satY = s2Y + 1.1;
  addMesh(stage2Group, new THREE.BoxGeometry(0.2, 0.28, 0.2), gold, [0, satY, 0]);
  wingL = new THREE.Group(); wingL.position.set(-0.1, satY, 0);
  addMesh(wingL, new THREE.BoxGeometry(0.42, 0.025, 0.16), solar, [-0.24, 0, 0]);
  wingL.rotation.z = Math.PI / 2; stage2Group.add(wingL);
  wingR = new THREE.Group(); wingR.position.set(0.1, satY, 0);
  addMesh(wingR, new THREE.BoxGeometry(0.42, 0.025, 0.16), solar, [0.24, 0, 0]);
  wingR.rotation.z = -Math.PI / 2; stage2Group.add(wingR);

  // Two-half payload fairing
  const fMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.3, roughness: 0.35, side: THREE.DoubleSide });
  fairingL = new THREE.Group(); fairingL.position.set(0, s2Y + 0.85, 0);
  addMesh(fairingL, new THREE.CylinderGeometry(r * 1.18, r * 1.05, 0.78, 14, 1, false, Math.PI / 2, Math.PI), fMat, [0, 0.39, 0]);
  addMesh(fairingL, new THREE.ConeGeometry(r * 1.18, 0.55, 14, 1, false, Math.PI / 2, Math.PI), fMat, [0, 1.05, 0]);
  fairingR = new THREE.Group(); fairingR.position.set(0, s2Y + 0.85, 0);
  addMesh(fairingR, new THREE.CylinderGeometry(r * 1.18, r * 1.05, 0.78, 14, 1, false, -Math.PI / 2, Math.PI), fMat, [0, 0.39, 0]);
  addMesh(fairingR, new THREE.ConeGeometry(r * 1.18, 0.55, 14, 1, false, -Math.PI / 2, Math.PI), fMat, [0, 1.05, 0]);
  stage2Group.add(fairingL, fairingR);
  scene.add(rocketGroup);
}

function buildPadAndSky() {
  padGroup = new THREE.Group();
  const concrete = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x991b1b, metalness: 0.6, roughness: 0.45 });
  addMesh(padGroup, new THREE.BoxGeometry(5.5, 0.3, 5.5), concrete, [0, -0.15, 0]);
  addMesh(padGroup, new THREE.BoxGeometry(1.4, 0.34, 5.8), new THREE.MeshStandardMaterial({ color: 0x0f172a }), [0, -0.14, 0]);
  addMesh(padGroup, new THREE.BoxGeometry(0.45, 4.3, 0.45), steel, [-1.45, 2.15, 0]);
  armPivot = new THREE.Group(); armPivot.position.set(-1.25, 3.0, 0);
  addMesh(armPivot, new THREE.BoxGeometry(1.1, 0.14, 0.16), steel, [0.55, 0, 0]);
  padGroup.add(armPivot);
  scene.add(padGroup);

  trenchLight = new THREE.PointLight(0xf97316, 0, 18);
  trenchLight.position.set(0, 0.6, 0.8);
  scene.add(trenchLight);

  const puffGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 24; i += 1) {
    const m = new THREE.Mesh(puffGeo, puffMat.clone());
    m.visible = false;
    scene.add(m);
    puffs.push({ m, vx: 0, vy: 0, vz: 0, life: 0 });
  }

  const stars = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i += 1) {
    const u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, r = 180, s = Math.sqrt(1 - u * u);
    stars[i * 3] = r * s * Math.cos(phi); stars[i * 3 + 1] = Math.abs(r * u) + 5; stars[i * 3 + 2] = r * s * Math.sin(phi);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  starMat = new THREE.PointsMaterial({ color: 0xe2e8f0, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0 });
  scene.add(new THREE.Points(sg, starMat));
}

function animate() {
  rafId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  padClock += dt;
  if (ignitedCmd) igniteElapsed += dt;
  const elapsed = ignitedCmd ? igniteElapsed : 0;

  const skyT = THREE.MathUtils.clamp((elapsed - 2.5) / 5.0, 0, 1);
  if (skyT < 0.5) skyColor.copy(SKY_PAD).lerp(SKY_MID, skyT * 2);
  else skyColor.copy(SKY_MID).lerp(SKY_SPACE, (skyT - 0.5) * 2);
  scene.background = skyColor;
  if (starMat) starMat.opacity = THREE.MathUtils.clamp((elapsed - 3.5) / 3.5, 0, 1);

  if (ignitedCmd) {
    const beepIdx = elapsed < 0.8 ? 0 : (elapsed < 1.6 ? 1 : (elapsed < 2.4 ? 2 : (elapsed < 3.0 ? 3 : -1)));
    if (beepIdx > lastBeep && beepIdx >= 0) { lastBeep = beepIdx; playCountdownBeep(beepIdx === 3); }
    if (elapsed >= 2.5 && !rumbleOn) { rumbleOn = true; startRocketRumbling(); }
  }
  if (armPivot) armPivot.rotation.y = elapsed > 2.2 ? THREE.MathUtils.lerp(armPivot.rotation.y, 1.25, dt * 4) : 0;
  const ignited = ignitedCmd && elapsed >= 2.6;
  flames.forEach((f) => { f.visible = ignited && elapsed < 8.4; if (f.visible) f.scale.set(1, 0.85 + Math.random() * 0.4, 1); });
  if (trenchLight) trenchLight.intensity = ignited && elapsed < 5.5 ? 5 + Math.random() * 3 : (ignitedCmd ? 0 : 0.8 + Math.sin(padClock * 3) * 0.4);

  let altKm = 0, velKms = 0, phase = ignitedCmd ? 'COUNTDOWN' : 'ARMED ON PAD', callout = ignitedCmd ? 'T-MINUS' : 'READY FOR IGNITION';
  let cdLabel = !ignitedCmd ? 'HOLD' : (elapsed < 0.85 ? 'T-3' : (elapsed < 1.7 ? 'T-2' : (elapsed < 2.55 ? 'T-1' : 'IGNITION')));
  if (elapsed >= 3.0) {
    const tFlight = elapsed - 3.0;
    rocketGroup.position.y = Math.pow(tFlight, 1.85) * 1.15;
    altKm = Math.round(Math.min(240, tFlight * tFlight * 3.1));
    velKms = Number(Math.min(7.7, tFlight * 0.94).toFixed(2));
    phase = elapsed < 8.2 ? 'LIFTOFF & MAX-Q' : 'ORBIT INSERTION';
    callout = elapsed < 5.0 ? 'LIFTOFF!' : (elapsed < 8.2 ? 'MAX-Q!' : 'FAIRING SEPARATION!');
    cdLabel = `T+${tFlight.toFixed(1)}s`;
  }

  if (elapsed >= 8.2) { boosterGroup.position.y -= dt * 3.2; boosterGroup.rotation.z += dt * 0.25; }
  if (elapsed >= 8.5) {
    fairingL.position.x -= dt * 1.15; fairingL.rotation.z += dt * 0.55;
    fairingR.position.x += dt * 1.15; fairingR.rotation.z -= dt * 0.55;
    wingL.rotation.z = THREE.MathUtils.lerp(wingL.rotation.z, 0, dt * 4);
    wingR.rotation.z = THREE.MathUtils.lerp(wingR.rotation.z, 0, dt * 4);
  }

  const venting = (!ignitedCmd && Math.floor(padClock * 10) % 3 === 0) || (ignited && elapsed < 8.0);
  puffs.forEach((p, idx) => {
    if (venting && p.life <= 0 && idx % 3 === Math.floor(padClock * 20) % 3) {
      p.life = 1; p.m.visible = true;
      p.m.position.set((Math.random() - 0.5) * 0.4, rocketGroup.position.y + (ignited ? -0.2 : 1.4), (Math.random() - 0.5) * 0.4);
      p.vx = (Math.random() - 0.5) * (ignited ? 1.6 : 0.6); p.vy = ignited ? -1.2 - Math.random() : 0.35; p.vz = (Math.random() - 0.5) * 1.4;
    }
    if (p.life > 0) {
      p.life -= dt * 1.4;
      p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
      p.m.scale.setScalar(1 + (1 - p.life) * 2.2); p.m.material.opacity = Math.max(0, p.life * (ignited ? 0.5 : 0.25));
      if (p.life <= 0) p.m.visible = false;
    }
  });

  const ry = rocketGroup.position.y, shake = ignited && elapsed < 7.0 ? 0.045 : 0;
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  if (camMode === 'pad') { camera.position.set(5.4 + sx, 2.2 + sy, 6.2); camera.lookAt(0, ry + 1.8, 0); }
  else { camera.position.set(2.5 + sx, ry + 3.2 + sy, 3.4); camera.lookAt(0, ry + 2.5, 0); }

  const now = performance.now();
  if (updateCb && now - lastHudMs > 90) {
    lastHudMs = now;
    updateCb({ phase, callout, countdownLabel: cdLabel, altitudeKm: altKm, velocityKms: velKms, progressPct: Math.min(100, Math.round((elapsed / 11.2) * 100)), camMode, armed: !ignitedCmd });
  }
  renderer.render(scene, camera);
  if (ignitedCmd && elapsed >= 11.2 && !completed) { completed = true; stopRocketRumbling(); completeCb?.(); }
}

export const setLaunchCamera = (m) => { camMode = m; };
export function triggerIgnition() {
  if (ignitedCmd) return false;
  ignitedCmd = true; igniteElapsed = 0; lastBeep = -1; rumbleOn = false;
  return true;
}

export function mountLaunch(container, missionState, onUpdate, onComplete) {
  unmountLaunch();
  updateCb = onUpdate; completeCb = onComplete;
  ignitedCmd = false; igniteElapsed = 0; padClock = 0; completed = false; lastHudMs = 0; lastBeep = -1; rumbleOn = false;
  const w = Math.max(container.clientWidth, 320), h = Math.max(container.clientHeight, 320);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  skyColor = SKY_PAD.clone();
  scene.background = skyColor;
  camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 400);
  scene.add(new THREE.AmbientLight(0xdbeafe, 0.8));
  const sun = new THREE.DirectionalLight(0xfffbeb, 2.2); sun.position.set(8, 14, 10); scene.add(sun);

  buildPadAndSky();
  buildRocket(missionState.vehicleId);
  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !container) return;
    const nw = Math.max(container.clientWidth, 1), nh = Math.max(container.clientHeight, 1);
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh, false);
  });
  resizeObserver.observe(container);
  clock.start();
  animate();
}

export function unmountLaunch() {
  stopRocketRumbling();
  ignitedCmd = false; rumbleOn = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (scene) {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    scene = null;
  }
  if (renderer) { renderer.domElement?.remove(); renderer.dispose(); renderer = null; }
  rocketGroup = boosterGroup = stage2Group = fairingL = fairingR = wingL = wingR = armPivot = padGroup = starMat = trenchLight = null;
  flames = []; puffs = [];
}
