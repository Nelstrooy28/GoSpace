import * as THREE from 'three';
import { createBloomComposer } from './solarSystem.js';
import { playCountdownBeep, startRocketRumbling, stopRocketRumbling } from './sfx.js';

let renderer = null, bloomComp = null, scene = null, camera = null, resizeObserver = null, rafId = 0;
let rocketGroup = null, boosterGroup = null, stage2Group = null, fairingL = null, fairingR = null;
let wingL = null, wingR = null, armUpper = null, armLower = null, padGroup = null;
let flames = [], stage2Plume = null, puffs = [], sepSparks = [], mastBeacons = [];
let starMat = null, skyMat = null, trenchLight = null, camMode = 'rocket';
let ignitedCmd = false, igniteElapsed = 0, lastBeep = -1, rumbleOn = false, sepTriggered = false, padClock = 0;
let completed = false, lastHudMs = 0, updateCb = null, completeCb = null;
const clock = new THREE.Clock();

function addMesh(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.rotation.set(...rot); parent.add(m); return m;
}

function makeSkyDomeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uClimb: { value: 0 } },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uClimb;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 padHorizon = vec3(0.42, 0.64, 0.88);
        vec3 padZenith = vec3(0.06, 0.24, 0.52);
        vec3 stratoHorizon = vec3(0.14, 0.22, 0.45);
        vec3 stratoZenith = vec3(0.02, 0.04, 0.12);
        vec3 spaceCol = vec3(0.01, 0.02, 0.05);

        vec3 daySky = mix(padHorizon, padZenith, pow(h, 0.55));
        vec3 midSky = mix(stratoHorizon, stratoZenith, pow(h, 0.5));
        vec3 col = uClimb < 0.5 ? mix(daySky, midSky, uClimb * 2.0) : mix(midSky, spaceCol, (uClimb - 0.5) * 2.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false
  });
}

function createPlumeAssembly(r, height, includeDiamonds = true) {
  const grp = new THREE.Group();
  const outer = addMesh(
    grp,
    new THREE.ConeGeometry(r * 0.95, height, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }),
    [0, -height * 0.5, 0],
    [Math.PI, 0, 0]
  );
  const inner = addMesh(
    grp,
    new THREE.ConeGeometry(r * 0.48, height * 0.76, 14),
    new THREE.MeshBasicMaterial({ color: 0xfffbeb, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    [0, -height * 0.38, 0],
    [Math.PI, 0, 0]
  );
  const diamonds = [];
  if (includeDiamonds) {
    for (let d = 0; d < 5; d += 1) {
      const dm = addMesh(
        grp,
        new THREE.OctahedronGeometry(r * (0.42 - d * 0.06), 0),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
        [0, -0.26 - d * (height * 0.17), 0]
      );
      dm.scale.set(0.75, 1.45, 0.75);
      diamonds.push(dm);
    }
  }
  return { grp, outer, inner, diamonds };
}

function buildRocket(vehicleId) {
  const isElectron = vehicleId === 'electron', isHeavy = vehicleId === 'falcon-heavy';
  const r = isElectron ? 0.17 : 0.25;
  const dark = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.75, roughness: 0.3 });
  const body = new THREE.MeshStandardMaterial({ color: isElectron ? 0x18181b : 0xf1f5f9, metalness: 0.38, roughness: 0.35 });
  const accent = new THREE.MeshStandardMaterial({ color: isElectron ? 0xef4444 : 0x0f172a, metalness: 0.55, roughness: 0.38 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.24 });
  const solar = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.62, roughness: 0.22 });

  rocketGroup = new THREE.Group();
  boosterGroup = new THREE.Group();
  stage2Group = new THREE.Group();
  rocketGroup.add(boosterGroup, stage2Group);

  const bH = isElectron ? 2.15 : 2.75;
  addMesh(boosterGroup, new THREE.CylinderGeometry(r, r, bH, 24), body, [0, bH / 2 + 0.2, 0]);
  addMesh(boosterGroup, new THREE.CylinderGeometry(r * 1.03, r * 1.03, 0.24, 24), accent, [0, bH + 0.08, 0]);
  addMesh(boosterGroup, new THREE.CylinderGeometry(r * 0.65, r * 0.92, 0.22, 16), dark, [0, 0.12, 0]);

  const f0 = createPlumeAssembly(r, 1.65, true);
  f0.grp.position.set(0, 0.05, 0);
  f0.grp.visible = false;
  boosterGroup.add(f0.grp);
  flames.push(f0);

  if (isHeavy) {
    [-0.58, 0.58].forEach((bx) => {
      addMesh(boosterGroup, new THREE.CylinderGeometry(r * 0.88, r * 0.88, bH * 0.92, 20), body, [bx, bH * 0.46 + 0.2, 0]);
      addMesh(boosterGroup, new THREE.ConeGeometry(r * 0.88, 0.54, 20), body, [bx, bH * 0.92 + 0.47, 0]);
      addMesh(boosterGroup, new THREE.BoxGeometry(0.32, 0.06, 0.08), dark, [bx * 0.5, bH * 0.72, 0]);
      const fb = createPlumeAssembly(r * 0.85, 1.45, true);
      fb.grp.position.set(bx, 0.1, 0);
      fb.grp.visible = false;
      boosterGroup.add(fb.grp);
      flames.push(fb);
    });
  }

  const s2Y = bH + 0.2;
  addMesh(stage2Group, new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.88, 22), body, [0, s2Y + 0.44, 0]);
  addMesh(stage2Group, new THREE.CylinderGeometry(r * 0.42, r * 0.68, 0.24, 16), dark, [0, s2Y - 0.08, 0]);

  stage2Plume = addMesh(
    stage2Group,
    new THREE.ConeGeometry(r * 0.72, 1.25, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }),
    [0, s2Y - 0.72, 0],
    [Math.PI, 0, 0]
  );
  stage2Plume.visible = false;

  // Custom satellite & folding solar arrays inside payload fairing
  const satY = s2Y + 1.12;
  addMesh(stage2Group, new THREE.BoxGeometry(0.22, 0.28, 0.22), gold, [0, satY, 0]);
  wingL = new THREE.Group(); wingL.position.set(-0.11, satY, 0);
  addMesh(wingL, new THREE.BoxGeometry(0.45, 0.025, 0.17), solar, [-0.25, 0, 0]);
  wingL.rotation.z = Math.PI / 2; stage2Group.add(wingL);
  wingR = new THREE.Group(); wingR.position.set(0.11, satY, 0);
  addMesh(wingR, new THREE.BoxGeometry(0.45, 0.025, 0.17), solar, [0.25, 0, 0]);
  wingR.rotation.z = -Math.PI / 2; stage2Group.add(wingR);

  // Two-half payload fairing
  const fMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.35, roughness: 0.32, side: THREE.DoubleSide });
  fairingL = new THREE.Group(); fairingL.position.set(0, s2Y + 0.88, 0);
  addMesh(fairingL, new THREE.CylinderGeometry(r * 1.2, r * 1.05, 0.82, 16, 1, false, Math.PI / 2, Math.PI), fMat, [0, 0.41, 0]);
  addMesh(fairingL, new THREE.ConeGeometry(r * 1.2, 0.56, 16, 1, false, Math.PI / 2, Math.PI), fMat, [0, 1.1, 0]);
  fairingR = new THREE.Group(); fairingR.position.set(0, s2Y + 0.88, 0);
  addMesh(fairingR, new THREE.CylinderGeometry(r * 1.2, r * 1.05, 0.82, 16, 1, false, -Math.PI / 2, Math.PI), fMat, [0, 0.41, 0]);
  addMesh(fairingR, new THREE.ConeGeometry(r * 1.2, 0.56, 16, 1, false, -Math.PI / 2, Math.PI), fMat, [0, 1.1, 0]);
  stage2Group.add(fairingL, fairingR);

  // Separation spark pool (attached to stage2 interstage at sep time)
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const sparkGeo = new THREE.SphereGeometry(0.038, 6, 6);
  for (let i = 0; i < 36; i += 1) {
    const sm = new THREE.Mesh(sparkGeo, sparkMat);
    sm.visible = false;
    scene.add(sm);
    sepSparks.push({ m: sm, vx: 0, vy: 0, vz: 0, life: 0 });
  }
  scene.add(rocketGroup);
}

function buildPadAndSky() {
  skyMat = makeSkyDomeMaterial();
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(280, 32, 24), skyMat));

  padGroup = new THREE.Group();
  const concrete = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.86 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x991b1b, metalness: 0.65, roughness: 0.42 });
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.72, roughness: 0.35 });
  const ocean = new THREE.Mesh(
    new THREE.RingGeometry(12, 240, 64),
    new THREE.MeshStandardMaterial({ color: 0x07264a, roughness: 0.25, metalness: 0.45 })
  );
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -0.35;
  padGroup.add(ocean);

  addMesh(padGroup, new THREE.CylinderGeometry(10, 12, 0.4, 32), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }), [0, -0.35, 0]);
  addMesh(padGroup, new THREE.BoxGeometry(6.2, 0.32, 6.2), concrete, [0, -0.16, 0]);
  addMesh(padGroup, new THREE.BoxGeometry(1.5, 0.36, 6.4), new THREE.MeshStandardMaterial({ color: 0x090d16 }), [0, -0.14, 0]);

  // Service Tower & Dual Articulated Umbilical Swing Arms
  addMesh(padGroup, new THREE.BoxGeometry(0.55, 4.7, 0.55), steel, [-1.55, 2.35, 0]);
  addMesh(padGroup, new THREE.BoxGeometry(0.85, 0.18, 0.85), steel, [-1.55, 4.72, 0]);
  armUpper = new THREE.Group(); armUpper.position.set(-1.3, 3.25, 0);
  addMesh(armUpper, new THREE.BoxGeometry(1.15, 0.12, 0.16), steel, [0.58, 0, 0]);
  armLower = new THREE.Group(); armLower.position.set(-1.3, 2.05, 0);
  addMesh(armLower, new THREE.BoxGeometry(1.15, 0.12, 0.16), steel, [0.58, 0, 0]);
  padGroup.add(armUpper, armLower);

  // 4 Tall Lightning Masts with HDR-bloom red warning beacons
  [[-3.8, -3.8], [3.8, -3.8], [-3.8, 3.8], [3.8, 3.8]].forEach(([mx, mz]) => {
    addMesh(padGroup, new THREE.CylinderGeometry(0.04, 0.12, 6.4, 8), mastMat, [mx, 3.1, mz]);
    const beacon = addMesh(padGroup, new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b }), [mx, 6.38, mz]);
    mastBeacons.push(beacon);
  });
  scene.add(padGroup);

  // Pad Floodlight & Flame-Trench Fire Light
  const floodLight = new THREE.SpotLight(0xe0f2fe, 14, 24, Math.PI / 4, 0.5);
  floodLight.position.set(4.5, 6.5, 5.5);
  floodLight.target.position.set(0, 2.2, 0);
  scene.add(floodLight, floodLight.target);

  trenchLight = new THREE.PointLight(0xf97316, 0, 26);
  trenchLight.position.set(0, 0.8, 1.0);
  scene.add(trenchLight);

  // 44-puff Water-Deluge Steam Pool
  const puffGeo = new THREE.SphereGeometry(0.26, 8, 8);
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.48 });
  for (let i = 0; i < 44; i += 1) {
    const m = new THREE.Mesh(puffGeo, puffMat.clone());
    m.visible = false; scene.add(m);
    puffs.push({ m, vx: 0, vy: 0, vz: 0, life: 0 });
  }

  const stars = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i += 1) {
    const u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, r = 230, s = Math.sqrt(1 - u * u);
    stars[i * 3] = r * s * Math.cos(phi); stars[i * 3 + 1] = Math.abs(r * u) + 5; stars[i * 3 + 2] = r * s * Math.sin(phi);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  starMat = new THREE.PointsMaterial({ color: 0xe2e8f0, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0 });
  scene.add(new THREE.Points(sg, starMat));
}

function animate() {
  rafId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  padClock += dt;
  if (ignitedCmd) igniteElapsed += dt;
  const elapsed = ignitedCmd ? igniteElapsed : 0;

  const skyT = THREE.MathUtils.clamp((elapsed - 2.4) / 5.4, 0, 1);
  if (skyMat) skyMat.uniforms.uClimb.value = skyT;
  if (starMat) starMat.opacity = THREE.MathUtils.clamp((elapsed - 3.6) / 3.8, 0, 1);
  const beaconPulse = (Math.sin(padClock * 5.0) * 0.5 + 0.5) > 0.35;
  mastBeacons.forEach((b) => { b.visible = beaconPulse; });

  if (ignitedCmd) {
    const beepIdx = elapsed < 0.8 ? 0 : (elapsed < 1.6 ? 1 : (elapsed < 2.4 ? 2 : (elapsed < 3.0 ? 3 : -1)));
    if (beepIdx > lastBeep && beepIdx >= 0) { lastBeep = beepIdx; playCountdownBeep(beepIdx === 3); }
    if (elapsed >= 2.5 && !rumbleOn) { rumbleOn = true; startRocketRumbling(); }
  }
  if (armUpper && armLower) {
    const targetRot = elapsed > 2.0 ? 1.32 : 0;
    armUpper.rotation.y = THREE.MathUtils.lerp(armUpper.rotation.y, targetRot, dt * 4.5);
    armLower.rotation.y = THREE.MathUtils.lerp(armLower.rotation.y, targetRot * 0.92, dt * 4.5);
  }

  const ignited = ignitedCmd && elapsed >= 2.6;
  flames.forEach((f) => {
    f.grp.visible = ignited && elapsed < 8.4;
    if (f.grp.visible) {
      f.grp.scale.set(1, 0.88 + Math.random() * 0.42, 1);
      f.diamonds.forEach((dm, idx) => { dm.visible = Math.sin(padClock * 42 + idx) > -0.3; });
    }
  });
  if (stage2Plume) {
    stage2Plume.visible = ignited && elapsed >= 8.3;
    if (stage2Plume.visible) stage2Plume.scale.set(1, 0.9 + Math.random() * 0.25, 1);
  }
  if (trenchLight) trenchLight.intensity = ignited && elapsed < 5.6 ? 8 + Math.random() * 4 : 0;

  let altKm = 0, velKms = 0, phase = ignitedCmd ? 'COUNTDOWN' : 'ARMED ON PAD', callout = ignitedCmd ? 'T-MINUS' : 'READY FOR IGNITION';
  let cdLabel = !ignitedCmd ? 'HOLD' : (elapsed < 0.85 ? 'T-3' : (elapsed < 1.7 ? 'T-2' : (elapsed < 2.55 ? 'T-1' : 'IGNITION')));
  if (elapsed >= 3.0) {
    const tFlight = elapsed - 3.0;
    rocketGroup.position.y = Math.pow(tFlight, 1.85) * 1.15;
    altKm = Math.round(Math.min(240, tFlight * tFlight * 3.1));
    velKms = Number(Math.min(7.7, tFlight * 0.94).toFixed(2));
    phase = elapsed < 8.2 ? 'LIFTOFF & MAX-Q' : 'ORBIT INSERTION';
    callout = elapsed < 5.0 ? 'LIFTOFF!' : (elapsed < 8.2 ? 'MAX-Q!' : 'MECO · FAIRING SEP!');
    cdLabel = `T+${tFlight.toFixed(1)}s`;
  }

  if (elapsed >= 8.2) {
    if (!sepTriggered) {
      sepTriggered = true;
      sepSparks.forEach((sp, i) => {
        const ang = (i / sepSparks.length) * Math.PI * 2;
        sp.life = 1; sp.m.visible = true;
        sp.m.position.set(0, rocketGroup.position.y + 2.75, 0);
        sp.vx = Math.cos(ang) * (1.8 + Math.random() * 2.2);
        sp.vy = (Math.random() - 0.5) * 1.8;
        sp.vz = Math.sin(ang) * (1.8 + Math.random() * 2.2);
      });
    }
    boosterGroup.position.y -= dt * 3.4; boosterGroup.rotation.z += dt * 0.28;
  }
  if (elapsed >= 8.5) {
    fairingL.position.x -= dt * 1.25; fairingL.rotation.z += dt * 0.58;
    fairingR.position.x += dt * 1.25; fairingR.rotation.z -= dt * 0.58;
    wingL.rotation.z = THREE.MathUtils.lerp(wingL.rotation.z, 0, dt * 4.5);
    wingR.rotation.z = THREE.MathUtils.lerp(wingR.rotation.z, 0, dt * 4.5);
  }
  sepSparks.forEach((sp) => {
    if (sp.life > 0) {
      sp.life -= dt * 1.5;
      sp.m.position.x += sp.vx * dt; sp.m.position.y += sp.vy * dt; sp.m.position.z += sp.vz * dt;
      sp.m.scale.setScalar(Math.max(0.1, sp.life));
      if (sp.life <= 0) sp.m.visible = false;
    }
  });

  // Water-deluge & exhaust steam particles
  const delugeActive = (ignitedCmd && elapsed >= 1.9 && elapsed < 7.6);
  const preVent = !ignitedCmd && Math.floor(padClock * 10) % 3 === 0;
  puffs.forEach((p, idx) => {
    if ((preVent || delugeActive) && p.life <= 0 && idx % 3 === Math.floor(padClock * 24) % 3) {
      p.life = 1; p.m.visible = true;
      if (preVent) {
        p.m.position.set((Math.random() - 0.5) * 0.3, 2.4, (Math.random() - 0.5) * 0.3);
        p.vx = (Math.random() - 0.5) * 0.6; p.vy = 0.4; p.vz = (Math.random() - 0.5) * 0.6;
      } else {
        const side = idx % 2 === 0 ? 1 : -1;
        p.m.position.set(side * (0.4 + Math.random() * 0.5), 0.15, (Math.random() - 0.5) * 0.6);
        p.vx = side * (2.6 + Math.random() * 2.4); p.vy = 0.6 + Math.random() * 1.4; p.vz = (Math.random() - 0.5) * 2.6;
      }
    }
    if (p.life > 0) {
      p.life -= dt * 1.15;
      p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
      p.m.scale.setScalar(1 + (1 - p.life) * 3.1); p.m.material.opacity = Math.max(0, p.life * (ignited ? 0.52 : 0.25));
      if (p.life <= 0) p.m.visible = false;
    }
  });

  const ry = rocketGroup.position.y, shake = ignited && elapsed < 7.0 ? 0.048 : 0;
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  if (camMode === 'pad') { camera.position.set(5.8 + sx, 2.3 + sy, 6.6); camera.lookAt(0, ry + 1.9, 0); }
  else { camera.position.set(2.6 + sx, ry + 3.3 + sy, 3.6); camera.lookAt(0, ry + 2.6, 0); }

  const now = performance.now();
  if (updateCb && now - lastHudMs > 90) {
    lastHudMs = now;
    updateCb({ phase, callout, countdownLabel: cdLabel, altitudeKm: altKm, velocityKms: velKms, progressPct: Math.min(100, Math.round((elapsed / 11.2) * 100)), camMode, armed: !ignitedCmd });
  }
  bloomComp ? bloomComp.composer.render() : renderer.render(scene, camera);
  if (ignitedCmd && elapsed >= 11.2 && !completed) { completed = true; stopRocketRumbling(); completeCb?.(); }
}

export const setLaunchCamera = (m) => { camMode = m; };
export function triggerIgnition() {
  if (ignitedCmd) return false;
  ignitedCmd = true; igniteElapsed = 0; lastBeep = -1; rumbleOn = false; sepTriggered = false;
  return true;
}

export function mountLaunch(container, missionState, onUpdate, onComplete) {
  unmountLaunch();
  updateCb = onUpdate; completeCb = onComplete;
  ignitedCmd = false; igniteElapsed = 0; padClock = 0; completed = false; lastHudMs = 0; lastBeep = -1; rumbleOn = false; sepTriggered = false;

  const w = Math.max(container.clientWidth, 320), h = Math.max(container.clientHeight, 320);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 450);
  bloomComp = createBloomComposer(renderer, scene, camera, w, h, { strength: 0.68, radius: 0.48, threshold: 0.76 });

  scene.add(new THREE.AmbientLight(0xdbeafe, 0.85));
  const sun = new THREE.DirectionalLight(0xfffbeb, 2.3); sun.position.set(10, 16, 12); scene.add(sun);

  buildPadAndSky();
  buildRocket(missionState.vehicleId);
  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !container) return;
    const nw = Math.max(container.clientWidth, 1), nh = Math.max(container.clientHeight, 1);
    camera.aspect = nw / nh; camera.updateProjectionMatrix();
    renderer.setSize(nw, nh, false);
    bloomComp?.setSize(nw, nh);
  });
  resizeObserver.observe(container); clock.start(); animate();
}

export function unmountLaunch() {
  stopRocketRumbling(); ignitedCmd = false; rumbleOn = false;
  if (rafId) cancelAnimationFrame(rafId); rafId = 0;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (bloomComp) { bloomComp.dispose(); bloomComp = null; }
  if (scene) {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    scene = null;
  }
  if (renderer) { renderer.domElement?.remove(); renderer.dispose(); renderer = null; }
  rocketGroup = boosterGroup = stage2Group = fairingL = fairingR = wingL = wingR = armUpper = armLower = padGroup = starMat = skyMat = trenchLight = stage2Plume = null;
  flames = []; puffs = []; sepSparks = []; mastBeacons = [];
}
