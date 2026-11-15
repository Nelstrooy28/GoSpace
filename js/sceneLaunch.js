import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBloomComposer } from './solarSystem.js';
import { createSpaceportScenery, isCachedSceneryTexture } from './spaceportScenery.js';
import { buildSpacecraftModel, isCachedCraftTexture } from './spacecraftModel.js';
import { playCountdownBeep, playStageSep, startRocketRumbling, stopRocketRumbling } from './sfx.js';

let renderer = null, bloomComp = null, scene = null, camera = null, controls = null, resizeObserver = null, rafId = 0;
let rocketGroup = null, coreGroup = null, stage2Group = null, fairingL = null, fairingR = null, launchCraft = null, scenery = null;
let sideBoosters = [], arms = [], clamps = [];
let flames = [], sideFlames = [], mvacPlume = null, engineBells = [], mvacBell = null, vaporCone = null;
let puffs = [], sparks = [], trenchLight = null;
let camMode = 'trench', rocketSpec = null, lastRocketY = 0;
let ignitedCmd = false, igniteElapsed = 0, lastBeep = -1, rumbleOn = false, padClock = 0;
let becoDone = false, mecoDone = false, fairingDone = false, completed = false, lastHudMs = 0;
let updateCb = null, completeCb = null;

const clock = new THREE.Clock();
const launchTexCache = { ready: false, hullWhite: null, hullBlack: null, fairing: null };

function getLaunchTextures() {
  if (launchTexCache.ready) return launchTexCache;

  const makeHull = (bg, stripe, textCol) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = stripe;
    ctx.fillRect(0, 18, 512, 16); ctx.fillRect(0, 476, 512, 18);
    ctx.strokeStyle = 'rgba(148,163,184,0.22)'; ctx.lineWidth = 2;
    for (let y = 64; y < 460; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
    ctx.save();
    ctx.translate(256, 260); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = textCol; ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('G O S P A C E', 0, 0);
    ctx.restore();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const fc = document.createElement('canvas'); fc.width = 512; fc.height = 512;
  const fCtx = fc.getContext('2d');
  fCtx.fillStyle = '#e2e8f0'; fCtx.fillRect(0, 0, 512, 512);
  fCtx.fillStyle = '#0ea5e9'; fCtx.fillRect(212, 165, 88, 12);
  fCtx.fillStyle = '#0f172a'; fCtx.font = 'bold 34px sans-serif'; fCtx.textAlign = 'center';
  fCtx.fillText('GOSPACE', 256, 225);

  launchTexCache.hullWhite = makeHull('#f1f5f9', '#0f172a', '#0f172a');
  launchTexCache.hullBlack = makeHull('#18181b', '#94a3b8', '#e2e8f0');
  launchTexCache.fairing = Object.assign(new THREE.CanvasTexture(fc), { colorSpace: THREE.SRGBColorSpace });
  launchTexCache.ready = true;
  return launchTexCache;
}

function addMesh(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.rotation.set(...rot); parent.add(m);
  return m;
}

function createPlumeAssembly(r, height) {
  const grp = new THREE.Group();
  addMesh(
    grp,
    new THREE.ConeGeometry(r * 1.05, height, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }),
    [0, -height * 0.5, 0], [Math.PI, 0, 0]
  );
  addMesh(
    grp,
    new THREE.ConeGeometry(r * 0.52, height * 0.78, 14),
    new THREE.MeshBasicMaterial({ color: 0xfffbeb, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, depthWrite: false }),
    [0, -height * 0.39, 0], [Math.PI, 0, 0]
  );
  const diamonds = [];
  for (let d = 0; d < 6; d += 1) {
    const dm = addMesh(
      grp,
      new THREE.OctahedronGeometry(r * (0.44 - d * 0.055), 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false }),
      [0, -0.24 - d * (height * 0.14), 0]
    );
    dm.scale.set(0.72, 1.45, 0.72);
    diamonds.push(dm);
  }
  return { grp, diamonds };
}

function createEngineCluster(parent, radius, yPos, bellMat) {
  addMesh(parent, new THREE.CylinderGeometry(radius * 0.24, radius * 0.32, 0.24, 10), bellMat, [0, yPos, 0]);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    addMesh(parent, new THREE.CylinderGeometry(radius * 0.18, radius * 0.25, 0.22, 10), bellMat, [Math.cos(a) * radius * 0.62, yPos, Math.sin(a) * radius * 0.62]);
  }
}

function addGridFinsAndLegs(parent, r, stageTopY, darkMat, alloyMat) {
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const fin = addMesh(parent, new THREE.BoxGeometry(0.18, 0.26, 0.03), alloyMat, [Math.cos(a) * (r + 0.08), stageTopY - 0.18, Math.sin(a) * (r + 0.08)], [0, -a, 0]);
    fin.rotation.x = 0.05;
    addMesh(parent, new THREE.BoxGeometry(0.11, 0.85, 0.09), darkMat, [Math.cos(a) * (r + 0.03), 0.72, Math.sin(a) * (r + 0.03)], [0, -a, 0]);
  }
}

function buildRocket(missionState) {
  const tex = getLaunchTextures();
  const vId = missionState.vehicleId;
  const isElectron = vId === 'electron' || vId === 'air-drop';
  const isHeavy = vId === 'falcon-heavy' || vId === 'twin-heavy';
  const r = vId === 'air-drop' ? 0.18 : vId === 'electron' ? 0.22 : vId === 'rideshare-pod' ? 0.26 : vId === 'falcon-heavy' ? 0.34 : 0.29;
  const bH = vId === 'air-drop' ? 2.75 : vId === 'electron' ? 3.2 : vId === 'rideshare-pod' ? 3.55 : vId === 'twin-heavy' ? 3.85 : vId === 'falcon-heavy' ? 4.35 : 3.9;
  rocketSpec = { r, bH, fairingBaseY: bH + 1.28, isHeavy };

  const hullMat = new THREE.MeshStandardMaterial({ map: isElectron ? tex.hullBlack : tex.hullWhite, metalness: 0.32, roughness: 0.42 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x161b24, metalness: 0.68, roughness: 0.36 });
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.82, roughness: 0.26 });
  const fairingMat = new THREE.MeshStandardMaterial({ map: tex.fairing, metalness: 0.25, roughness: 0.38, side: THREE.DoubleSide });
  const bellMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.28, emissive: 0xff5500, emissiveIntensity: 0 });
  engineBells.push(bellMat);

  rocketGroup = new THREE.Group();
  coreGroup = new THREE.Group();
  stage2Group = new THREE.Group();
  rocketGroup.add(coreGroup, stage2Group);

  // Stage 1 Core + LOX downcomer pipe + Engine skirt + Plume
  addMesh(coreGroup, new THREE.CylinderGeometry(r, r, bH, 28), hullMat, [0, bH / 2 + 0.32, 0]);
  addMesh(coreGroup, new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.38, 28), isElectron ? silverMat : darkMat, [0, bH + 0.14, 0]);
  addMesh(coreGroup, new THREE.CylinderGeometry(0.035, 0.035, bH * 0.9, 10), silverMat, [r + 0.02, bH * 0.52 + 0.28, 0]);
  createEngineCluster(coreGroup, r, 0.2, bellMat);
  if (!isElectron) addGridFinsAndLegs(coreGroup, r, bH, darkMat, silverMat);

  const f0 = createPlumeAssembly(r, 2.25);
  f0.grp.position.set(0, 0.12, 0); f0.grp.visible = false;
  coreGroup.add(f0.grp); flames.push(f0);

  // Heavy-Lift Twin Strap-On Boosters
  if (isHeavy) {
    [-0.74, 0.74].forEach((bx, bIdx) => {
      const sb = new THREE.Group();
      addMesh(sb, new THREE.CylinderGeometry(r * 0.9, r * 0.9, bH * 0.92, 24), hullMat, [0, bH * 0.46 + 0.32, 0]);
      addMesh(sb, new THREE.ConeGeometry(r * 0.9, 0.68, 24), hullMat, [0, bH * 0.92 + 0.66, 0]);
      addMesh(sb, new THREE.BoxGeometry(0.45, 0.07, 0.08), darkMat, [-bx * 0.45, bH * 0.78, 0]);
      addMesh(sb, new THREE.BoxGeometry(0.45, 0.07, 0.08), darkMat, [-bx * 0.45, 1.05, 0]);
      addGridFinsAndLegs(sb, r * 0.9, bH * 0.92, darkMat, silverMat);
      createEngineCluster(sb, r * 0.9, 0.22, bellMat);
      const fb = createPlumeAssembly(r * 0.88, 2.05);
      fb.grp.position.set(0, 0.14, 0); fb.grp.visible = false;
      sb.add(fb.grp); sideFlames.push(fb);
      sb.position.set(bx, 0, 0);
      rocketGroup.add(sb);
      sideBoosters.push({ grp: sb, dir: bIdx === 0 ? -1 : 1 });
    });
  }

  // Stage 2 + Vacuum Bell & Plume
  const s2Y = bH + 0.34;
  addMesh(stage2Group, new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.95, 26), hullMat, [0, s2Y + 0.48, 0]);
  mvacBell = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3, emissive: 0xff4500, emissiveIntensity: 0 });
  addMesh(stage2Group, new THREE.CylinderGeometry(r * 0.36, r * 0.64, 0.32, 18), mvacBell, [0, s2Y - 0.1, 0]);
  mvacPlume = addMesh(
    stage2Group,
    new THREE.ConeGeometry(r * 1.15, 1.75, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }),
    [0, s2Y - 1.08, 0], [Math.PI, 0, 0]
  );
  mvacPlume.visible = false;

  // Player Configured Payload Spacecraft inside Fairing (identical to Hangar build, stowed at t=0)
  const fairBaseY = s2Y + 0.94;
  launchCraft = buildSpacecraftModel(missionState, { showWarnings: false, deployProgress: 0, envMapIntensity: 0.85, castShadow: false, receiveShadow: false });
  launchCraft.group.updateMatrixWorld(true);
  const craftBox = new THREE.Box3().setFromObject(launchCraft.group);
  const craftSize = new THREE.Vector3(); craftBox.getSize(craftSize);
  const maxHorizR = Math.max(craftSize.x, craftSize.z) * 0.5;
  const fitScale = Math.min(0.26, (r * 0.98) / Math.max(maxHorizR, 0.45), 1.18 / Math.max(craftSize.y, 0.9));
  launchCraft.group.scale.setScalar(fitScale);
  launchCraft.group.position.set(0, fairBaseY + 0.1 - craftBox.min.y * fitScale, 0);
  stage2Group.add(launchCraft.group);

  // Payload Attach Fitting (PAF) + Dedicated Stage 2 Reveal Fill Lights
  addMesh(stage2Group, new THREE.CylinderGeometry(Math.max(r * 0.45, fitScale * 0.65), r * 0.72, 0.14, 20), darkMat, [0, fairBaseY + 0.04, 0]);
  const s2Key = new THREE.PointLight(0xfffbeb, 1.8, 8); s2Key.position.set(1.3, fairBaseY + 1.25, 1.5); stage2Group.add(s2Key);
  const s2Fill = new THREE.PointLight(0x93c5fd, 1.1, 8); s2Fill.position.set(-1.3, fairBaseY + 0.9, -1.2); stage2Group.add(s2Fill);

  // Fairing Halves + Prandtl-Glauert Max-Q Vapor Cone
  const fairR = Math.max(r * 1.26, maxHorizR * fitScale + 0.05);
  fairingL = new THREE.Group(); fairingL.position.set(0, fairBaseY, 0);
  addMesh(fairingL, new THREE.CylinderGeometry(fairR, r * 1.06, 1.04, 18, 1, false, Math.PI / 2, Math.PI), fairingMat, [0, 0.52, 0]);
  addMesh(fairingL, new THREE.ConeGeometry(fairR, 0.72, 18, 1, false, Math.PI / 2, Math.PI), fairingMat, [0, 1.4, 0]);
  fairingR = new THREE.Group(); fairingR.position.set(0, fairBaseY, 0);
  addMesh(fairingR, new THREE.CylinderGeometry(fairR, r * 1.06, 1.04, 18, 1, false, -Math.PI / 2, Math.PI), fairingMat, [0, 0.52, 0]);
  addMesh(fairingR, new THREE.ConeGeometry(fairR, 0.72, 18, 1, false, -Math.PI / 2, Math.PI), fairingMat, [0, 1.4, 0]);
  stage2Group.add(fairingL, fairingR);

  vaporCone = addMesh(
    rocketGroup,
    new THREE.ConeGeometry(r * 3.8, 1.65, 28, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    [0, fairBaseY + 0.35, 0]
  );

  scene.add(rocketGroup);
}

function buildSpaceportAndHorizon() {
  scenery = createSpaceportScenery(scene);

  // Concrete Octagonal Launch Mount, Flame Trench & Deflector
  const concrete = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 });
  const darkSlate = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.6, roughness: 0.42 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.72, roughness: 0.3 });

  addMesh(scene, new THREE.CylinderGeometry(9.6, 12.2, 1.35, 8), concrete, [0, -0.58, 0]);
  addMesh(scene, new THREE.BoxGeometry(2.4, 0.48, 18.5), darkSlate, [0, 0.02, 0]);
  const deflector = addMesh(scene, new THREE.CylinderGeometry(0.95, 1.65, 2.2, 4), darkSlate, [0, -0.15, 0], [0, Math.PI / 4, 0]);
  deflector.scale.set(1.2, 0.45, 2.0);

  // 4 Hydraulic Hold-Down Clamps
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const pv = new THREE.Group();
    pv.position.set(Math.cos(a) * 0.82, 0.22, Math.sin(a) * 0.82);
    pv.rotation.y = -a;
    addMesh(pv, new THREE.BoxGeometry(0.5, 0.18, 0.16), steel, [-0.25, 0.12, 0]);
    scene.add(pv); clamps.push(pv);
  }

  // Lattice Umbilical Tower (LUT) with X-bracing, Elevator & Top Crane
  const towerX = -2.25, colOff = 0.45, tierH = 1.15;
  [[-colOff, -colOff], [colOff, -colOff], [-colOff, colOff], [colOff, colOff]].forEach(([cx, cz]) => {
    addMesh(scene, new THREE.CylinderGeometry(0.055, 0.065, 7.2, 8), steel, [towerX + cx, 3.6, cz]);
  });
  for (let lv = 1; lv <= 6; lv += 1) {
    const ty = lv * tierH;
    addMesh(scene, new THREE.BoxGeometry(1.02, 0.06, 1.02), darkSlate, [towerX, ty, 0]);
    addMesh(scene, new THREE.CylinderGeometry(0.022, 0.022, 1.42, 6), steel, [towerX, ty - tierH * 0.5, colOff], [0, 0, Math.PI / 4]);
    addMesh(scene, new THREE.CylinderGeometry(0.022, 0.022, 1.42, 6), steel, [towerX, ty - tierH * 0.5, -colOff], [0, 0, -Math.PI / 4]);
  }
  addMesh(scene, new THREE.BoxGeometry(0.32, 6.8, 0.32), darkSlate, [towerX, 3.4, 0]);
  addMesh(scene, new THREE.BoxGeometry(2.1, 0.18, 0.28), steel, [towerX + 0.5, 7.15, 0]);

  // 2 Umbilical Swing Arms + 1 Payload Access Arm
  [2.3, 3.8, 5.15].forEach((ay, idx) => {
    const pv = new THREE.Group(); pv.position.set(towerX + colOff, ay, 0);
    addMesh(pv, new THREE.BoxGeometry(1.45, idx === 2 ? 0.24 : 0.12, idx === 2 ? 0.32 : 0.14), idx === 2 ? silver : steel, [0.72, 0, 0]);
    scene.add(pv); arms.push(pv);
  });

  trenchLight = new THREE.PointLight(0xf97316, 0, 36); trenchLight.position.set(0, 0.9, 1.4);
  scene.add(trenchLight);

  // 72 Steam/Smoke Puffs & 40 Ember/Sep Sparks
  const puffGeo = new THREE.SphereGeometry(0.32, 8, 8);
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.45 });
  for (let i = 0; i < 72; i += 1) {
    const m = new THREE.Mesh(puffGeo, puffMat.clone()); m.visible = false; scene.add(m);
    puffs.push({ m, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1 });
  }
  const sparkGeo = new THREE.SphereGeometry(0.045, 6, 6), sparkMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  for (let i = 0; i < 40; i += 1) {
    const sm = new THREE.Mesh(sparkGeo, sparkMat); sm.visible = false; scene.add(sm);
    sparks.push({ m: sm, vx: 0, vy: 0, vz: 0, life: 0 });
  }
}

function triggerSparkBurst(yWorld, count = 28, speed = 3.2) {
  let spawned = 0;
  sparks.forEach((sp, i) => {
    if (sp.life <= 0 && spawned < count) {
      spawned += 1;
      const ang = (i / count) * Math.PI * 2;
      sp.life = 1; sp.m.visible = true;
      sp.m.position.set(0, yWorld, 0);
      sp.vx = Math.cos(ang) * (speed * 0.6 + Math.random() * speed);
      sp.vy = (Math.random() - 0.5) * speed * 0.8;
      sp.vz = Math.sin(ang) * (speed * 0.6 + Math.random() * speed);
    }
  });
}

function updateCameras(dt, ry, prevRy, shakeAmt, elapsed = 0) {
  const sx = (Math.random() - 0.5) * shakeAmt, sy = (Math.random() - 0.5) * shakeAmt;
  if (controls) controls.enabled = camMode === 'free';
  if (camMode === 'free' && controls) {
    const dy = ry - prevRy;
    camera.position.y += dy;
    controls.target.y += dy;
    controls.update();
    return;
  }
  if (ignitedCmd && elapsed >= 10.1 && rocketSpec) {
    // Cut to Stage 2 Payload Reveal camera during Fairing Separation & Solar Deployment
    const satFocusY = ry + rocketSpec.fairingBaseY + 0.58;
    camera.position.set(2.1 + sx * 0.25, satFocusY + 0.72 + sy * 0.25, 2.45);
    camera.lookAt(0, satFocusY, 0);
    return;
  }
  if (camMode === 'trench') {
    camera.position.set(7.4 + sx, 1.35 + sy, 8.8);
    camera.lookAt(0, ry + 2.4, 0);
  } else if (camMode === 'track') {
    camera.position.set(12.2 + sx, Math.max(4.2, ry * 0.35 + 4.2) + sy, 14.5);
    camera.lookAt(0, ry + 2.6, 0);
  } else if (camMode === 'hull' && rocketSpec) {
    const camY = ry + rocketSpec.fairingBaseY - 0.15;
    camera.position.set(rocketSpec.r + 0.32 + sx * 0.35, camY, 0.24 + sy * 0.35);
    camera.lookAt(0.05, Math.max(-1.0, camY - 9.0), 0);
  }
}

function animate() {
  rafId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  padClock += dt;
  if (ignitedCmd) igniteElapsed += dt;
  const elapsed = ignitedCmd ? igniteElapsed : 0;

  if (ignitedCmd) {
    const beepIdx = elapsed < 0.8 ? 0 : (elapsed < 1.6 ? 1 : (elapsed < 2.4 ? 2 : (elapsed < 3.0 ? 3 : -1)));
    if (beepIdx > lastBeep && beepIdx >= 0) { lastBeep = beepIdx; playCountdownBeep(beepIdx === 3); }
    if (elapsed >= 2.1 && !rumbleOn) { rumbleOn = true; startRocketRumbling(); }
  }

  // Retract Umbilical & Payload Access Arms at T-2.5s..T-0s, release hold-down clamps at T-0
  arms.forEach((arm, idx) => { arm.rotation.y = elapsed > 0.5 ? THREE.MathUtils.lerp(arm.rotation.y, -1.42 - idx * 0.06, dt * 3.8) : 0; });
  clamps.forEach((cl) => { cl.rotation.z = elapsed >= 3.0 ? THREE.MathUtils.lerp(cl.rotation.z, 0.78, dt * 10) : 0; });

  // Engine Bell Heating & Multi-Layered Plumes expanding at high altitude
  const s1Active = ignitedCmd && elapsed >= 2.2 && elapsed < 9.4;
  const altScale = 1 + THREE.MathUtils.clamp((elapsed - 3.0) / 6.4, 0, 1) * 1.45;
  engineBells.forEach((bm) => { bm.emissiveIntensity = THREE.MathUtils.lerp(bm.emissiveIntensity, elapsed >= 1.8 && elapsed < 9.6 ? 2.4 : 0, dt * 6); });
  const updatePlume = (f, vis) => {
    f.grp.visible = vis;
    if (vis) {
      f.grp.scale.set(altScale, 0.88 + Math.random() * 0.38, altScale);
      f.diamonds.forEach((dm, idx) => { dm.visible = Math.sin(padClock * 44 + idx) > -0.25 && elapsed < 8.4; });
    }
  };
  flames.forEach((f) => updatePlume(f, s1Active));
  sideFlames.forEach((f) => updatePlume(f, s1Active && elapsed < 7.8));
  if (mvacBell) mvacBell.emissiveIntensity = THREE.MathUtils.lerp(mvacBell.emissiveIntensity, elapsed >= 9.45 ? 1.8 : 0, dt * 5);
  if (mvacPlume) {
    mvacPlume.visible = ignitedCmd && elapsed >= 9.5;
    if (mvacPlume.visible) mvacPlume.scale.set(1.2, 0.9 + Math.random() * 0.25, 1.2);
  }
  if (trenchLight) trenchLight.intensity = s1Active && elapsed < 6.4 ? 14 + Math.random() * 6 : 0;

  let altKm = 0, velKms = 0, phase = ignitedCmd ? 'COUNTDOWN' : 'ARMED ON PAD', callout = ignitedCmd ? 'T-MINUS' : 'READY FOR IGNITION';
  let cdLabel = !ignitedCmd ? 'HOLD' : (elapsed < 0.85 ? 'T-3' : (elapsed < 1.7 ? 'T-2' : (elapsed < 2.55 ? 'T-1' : 'IGNITION')));

  const prevRy = lastRocketY;
  if (elapsed >= 3.0) {
    const tf = elapsed - 3.0;
    rocketGroup.position.y = Math.pow(tf, 1.92) * 1.28;
    altKm = Math.round(Math.min(245, tf * tf * 2.12));
    velKms = Number(Math.min(7.8, tf * 0.72).toFixed(2));
    phase = elapsed < 5.8 ? 'LIFTOFF & PITCHOVER' : (elapsed < 7.6 ? 'MAX-Q TRANSONIC' : (elapsed < 9.4 ? 'MAIN ENGINE ASCENT' : 'VACUUM ORBIT INSERTION'));
    if (elapsed < 5.6) callout = 'LIFTOFF · TOWER CLEAR!';
    else if (elapsed < 7.6) callout = 'MAX-Q · MAXIMUM DYNAMIC PRESSURE';
    else if (elapsed < 9.4) callout = becoDone ? 'BECO · SIDE BOOSTER SEP!' : 'SUPERSONIC ASCENT';
    else if (elapsed < 10.6) callout = 'MECO · STAGE 2 IGNITION!';
    else callout = 'FAIRING SEP · ORBITAL INSERTION!';
    cdLabel = `T+${tf.toFixed(1)}s`;
  }
  lastRocketY = rocketGroup.position.y;

  // Max-Q Prandtl-Glauert Vapor Cone
  if (vaporCone) {
    const mq = elapsed >= 5.8 && elapsed <= 7.5 ? Math.sin(((elapsed - 5.8) / 1.7) * Math.PI) : 0;
    vaporCone.material.opacity = mq * 0.42;
    vaporCone.scale.setScalar(0.85 + mq * 0.45);
  }

  // Side-Booster Separation (7.8s), Stage 1 Sep (9.4s), Fairing Sep + Solar Deploy (10.6s)
  if (rocketSpec?.isHeavy && elapsed >= 7.8) {
    if (!becoDone) { becoDone = true; playStageSep(); triggerSparkBurst(rocketGroup.position.y + 1.4, 18, 2.4); }
    sideBoosters.forEach((sb) => {
      sb.grp.position.x += sb.dir * dt * 2.2;
      sb.grp.position.y -= dt * 3.6;
      sb.grp.rotation.z -= sb.dir * dt * 0.45;
    });
  }
  if (elapsed >= 9.4) {
    if (!mecoDone) { mecoDone = true; playStageSep(); triggerSparkBurst(rocketGroup.position.y + rocketSpec.bH + 0.35, 28, 3.2); }
    coreGroup.position.y -= dt * 4.5;
    coreGroup.rotation.z += dt * 0.22;
  }
  if (elapsed >= 10.6) {
    if (!fairingDone) { fairingDone = true; playStageSep(); }
    fairingL.position.x -= dt * 1.45; fairingL.rotation.z += dt * 0.62;
    fairingR.position.x += dt * 1.45; fairingR.rotation.z -= dt * 0.62;
    launchCraft?.update?.(dt, elapsed);
  }

  sparks.forEach((sp) => {
    if (sp.life > 0) {
      sp.life -= dt * 1.5;
      sp.m.position.x += sp.vx * dt; sp.m.position.y += sp.vy * dt; sp.m.position.z += sp.vz * dt;
      sp.m.scale.setScalar(Math.max(0.1, sp.life));
      if (sp.life <= 0) sp.m.visible = false;
    }
  });

  // Pooled Cryo Venting, Trench Blast & Vertical Ascent Exhaust Trail
  const spawnMode = !ignitedCmd || elapsed < 1.9 ? 'cryo' : (elapsed < 5.6 ? 'trench' : (elapsed < 9.2 ? 'trail' : 'none'));
  const spawnModulo = spawnMode === 'cryo' ? 4 : 1;
  puffs.forEach((p, idx) => {
    if (spawnMode !== 'none' && p.life <= 0 && (idx % spawnModulo === Math.floor(padClock * 30) % spawnModulo)) {
      p.life = 1; p.maxLife = spawnMode === 'cryo' ? 1.5 : 1.9; p.m.visible = true;
      if (spawnMode === 'cryo') {
        p.m.position.set(rocketSpec.r + 0.08, 2.8 + (idx % 2) * 0.9, (Math.random() - 0.5) * 0.15);
        p.vx = 0.55 + Math.random() * 0.4; p.vy = -0.28; p.vz = (Math.random() - 0.5) * 0.35;
        p.m.scale.setScalar(0.35);
      } else if (spawnMode === 'trench') {
        const end = idx % 2 === 0 ? 1 : -1;
        p.m.position.set((Math.random() - 0.5) * 0.8, 0.25, end * (1.2 + Math.random() * 1.4));
        p.vx = (Math.random() - 0.5) * 3.0; p.vy = 0.4 + Math.random() * 1.3; p.vz = end * (6.2 + Math.random() * 4.2);
        p.m.scale.setScalar(0.95);
      } else {
        p.m.position.set((Math.random() - 0.5) * 0.3, rocketGroup.position.y - 0.8, (Math.random() - 0.5) * 0.3);
        p.vx = (Math.random() - 0.5) * 0.9; p.vy = -1.6 - Math.random() * 1.2; p.vz = (Math.random() - 0.5) * 0.9;
        p.m.scale.setScalar(0.85);
      }
    }
    if (p.life > 0) {
      p.life -= dt / p.maxLife;
      p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
      p.m.scale.addScalar(dt * (spawnMode === 'cryo' ? 0.55 : 2.3));
      p.m.material.opacity = Math.max(0, p.life * (spawnMode === 'cryo' ? 0.24 : 0.48));
      if (p.life <= 0) p.m.visible = false;
    }
  });

  const maxQShake = elapsed >= 5.8 && elapsed <= 7.5 ? 0.065 : 0;
  const vib = ignitedCmd && elapsed >= 2.2 && elapsed < 9.4 ? Math.max(0.032, maxQShake) : 0;
  scenery?.update(dt, elapsed, padClock, rocketGroup.position.y, s1Active && elapsed < 7.2 ? 1.0 : 0.0);
  updateCameras(dt, rocketGroup.position.y, prevRy, vib, elapsed);

  const now = performance.now();
  if (updateCb && now - lastHudMs > 90) {
    lastHudMs = now;
    updateCb({ phase, callout, countdownLabel: cdLabel, altitudeKm: altKm, velocityKms: velKms, progressPct: Math.min(100, Math.round((elapsed / 13.8) * 100)), camMode, armed: !ignitedCmd });
  }
  bloomComp ? bloomComp.composer.render() : renderer.render(scene, camera);
  if (ignitedCmd && elapsed >= 13.8 && !completed) { completed = true; stopRocketRumbling(); completeCb?.(); }
}

export function setLaunchCamera(m) {
  camMode = m;
  if (m === 'free' && controls && camera && rocketGroup) {
    controls.target.set(0, rocketGroup.position.y + 2.4, 0);
    camera.position.set(7.5, rocketGroup.position.y + 4.8, 9.5);
    controls.update();
  }
}

export function triggerIgnition() {
  if (ignitedCmd) return false;
  ignitedCmd = true; igniteElapsed = 0; lastBeep = -1; rumbleOn = false;
  becoDone = false; mecoDone = false; fairingDone = false;
  return true;
}

export function mountLaunch(container, missionState, onUpdate, onComplete) {
  unmountLaunch();
  updateCb = onUpdate; completeCb = onComplete;
  ignitedCmd = false; igniteElapsed = 0; padClock = 0; lastRocketY = 0; completed = false; lastHudMs = 0;
  lastBeep = -1; rumbleOn = false; becoDone = false; mecoDone = false; fairingDone = false;

  const w = Math.max(container.clientWidth, 320), h = Math.max(container.clientHeight, 320);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 800);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 2.5, maxDistance: 45, enabled: camMode === 'free' });

  bloomComp = createBloomComposer(renderer, scene, camera, w, h, { strength: 0.65, radius: 0.46, threshold: 0.76 });

  scene.add(new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.85));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); sun.position.set(16, 20, 14); scene.add(sun);
  const sunsetRim = new THREE.DirectionalLight(0xff9e5e, 1.35); sunsetRim.position.set(-28, 7, -42); scene.add(sunsetRim);

  buildSpaceportAndHorizon();
  buildRocket(missionState);
  setLaunchCamera(camMode);

  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !container) return;
    const nw = Math.max(container.clientWidth, 1), nh = Math.max(container.clientHeight, 1);
    camera.aspect = nw / nh; camera.updateProjectionMatrix();
    renderer.setSize(nw, nh, false);
    bloomComp?.setSize(nw, nh);
  });
  resizeObserver.observe(container);
  clock.start();
  animate();
}

export function unmountLaunch() {
  stopRocketRumbling(); ignitedCmd = false; rumbleOn = false;
  if (rafId) cancelAnimationFrame(rafId); rafId = 0;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (controls) { controls.dispose(); controls = null; }
  if (bloomComp) { bloomComp.dispose(); bloomComp = null; }
  if (launchCraft) { launchCraft.dispose(); launchCraft = null; }
  if (scenery) { scenery.dispose(); scenery = null; }
  if (scene) {
    const cached = new Set(Object.values(launchTexCache).filter((v) => v && typeof v === 'object'));
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          ['map', 'bumpMap', 'emissiveMap'].forEach((k) => { if (m[k] && !cached.has(m[k]) && !isCachedCraftTexture(m[k]) && !isCachedSceneryTexture(m[k])) m[k].dispose(); });
          m.dispose();
        });
      }
    });
    scene = null;
  }
  if (renderer) { renderer.domElement?.remove(); renderer.dispose(); renderer = null; }
  rocketGroup = coreGroup = stage2Group = fairingL = fairingR = launchCraft = scenery = null;
  mvacPlume = mvacBell = vaporCone = trenchLight = rocketSpec = null;
  sideBoosters = []; arms = []; clamps = []; flames = []; sideFlames = [];
  engineBells = []; puffs = []; sparks = [];
}
