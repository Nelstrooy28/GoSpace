import * as THREE from 'three';

const RESOLUTION_DUR = 1.4;
const TMP_V1 = new THREE.Vector3();
const TMP_V2 = new THREE.Vector3();
const TMP_V3 = new THREE.Vector3();
const TMP_FWD = new THREE.Vector3(0, 0, 1);
const TMP_SUN_DIR = new THREE.Vector3();
const TMP_VEL_DIR = new THREE.Vector3();

function normalizeHazardType(raw) {
  if (raw === 'cme' || raw === 'solar') return 'solar';
  if (raw === 'cryo' || raw === 'eclipse') return 'eclipse';
  if (raw === 'gimbal' || raw === 'antenna') return 'antenna';
  return 'debris';
}

function createSoftParticleTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.32, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function easeOutCubic(t) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - ((1 - x) ** 3);
}

function easeInOutSine(t) {
  const x = Math.max(0, Math.min(1, t));
  return -(Math.cos(Math.PI * x) - 1) * 0.5;
}

export function createHazardFxController(scene) {
  const fxRoot = new THREE.Group();
  fxRoot.visible = false;
  scene.add(fxRoot);

  const velGroup = new THREE.Group();
  const sunGroup = new THREE.Group();
  const craftGroup = new THREE.Group();
  fxRoot.add(velGroup, sunGroup, craftGroup);

  const geometries = [];
  const materials = [];
  const textures = [];

  const trackGeo = (g) => { geometries.push(g); return g; };
  const trackMat = (m) => { materials.push(m); return m; };
  const softTex = createSoftParticleTexture();
  textures.push(softTex);

  // Full Orbit outer telemetry warning halo (fades to 0 smoothly inside Chase Sat)
  const haloRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(2.55, 2.95, 48)),
    trackMat(new THREE.MeshBasicMaterial({
      color: 0xf97316, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending
    }))
  );
  const haloPulse = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(2.75, 0.055, 8, 56)),
    trackMat(new THREE.MeshBasicMaterial({
      color: 0xfbbf24, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending
    }))
  );
  fxRoot.add(haloRing, haloPulse);

  // ===================================================================
  // 1. DEBRIS ACTIVE RIG (40 streaks + 14 tumbling rocks + radar ring)
  // ===================================================================
  const debrisActiveGroup = new THREE.Group();
  debrisActiveGroup.visible = false;
  velGroup.add(debrisActiveGroup);

  const STREAK_COUNT = 40;
  const streakPos = new Float32Array(STREAK_COUNT * 6);
  const streakCol = new Float32Array(STREAK_COUNT * 6);
  const streakSeeds = [];
  for (let i = 0; i < STREAK_COUNT; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const rad = 0.28 + Math.random() * 1.45;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    const z = -4.5 + Math.random() * 9.0;
    const len = 0.42 + Math.random() * 0.55;
    streakSeeds.push({ x, y, z, len, speed: 21 + Math.random() * 11 });
    const hotAmber = i % 3 === 0;
    const r = 1.0;
    const g = hotAmber ? 0.68 : 0.94;
    const b = hotAmber ? 0.24 : 0.98;
    const base = i * 6;
    streakPos[base] = x; streakPos[base + 1] = y; streakPos[base + 2] = z;
    streakPos[base + 3] = x; streakPos[base + 4] = y; streakPos[base + 5] = z + len;
    streakCol[base] = r; streakCol[base + 1] = g; streakCol[base + 2] = b;
    streakCol[base + 3] = r * 0.45; streakCol[base + 4] = g * 0.35; streakCol[base + 5] = b * 0.2;
  }
  const streakGeo = trackGeo(new THREE.BufferGeometry());
  const streakPosAttr = new THREE.BufferAttribute(streakPos, 3);
  streakGeo.setAttribute('position', streakPosAttr);
  streakGeo.setAttribute('color', new THREE.BufferAttribute(streakCol, 3));
  const streakMat = trackMat(new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const debrisStreaks = new THREE.LineSegments(streakGeo, streakMat);
  debrisActiveGroup.add(debrisStreaks);

  const rockGeo = trackGeo(new THREE.IcosahedronGeometry(0.055, 0));
  const rockMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0xd4c4ad, roughness: 0.65, metalness: 0.45, emissive: 0x3b1e08, emissiveIntensity: 0.35
  }));
  const rocks = [];
  for (let i = 0; i < 14; i += 1) {
    const mesh = new THREE.Mesh(rockGeo, rockMat);
    const s = 0.65 + (i % 5) * 0.26;
    mesh.scale.setScalar(s);
    const ang = (i / 14) * Math.PI * 2 + 0.3;
    const rad = 0.35 + (i % 4) * 0.34;
    const z = -4.5 + (i / 14) * 9.0;
    mesh.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, z);
    debrisActiveGroup.add(mesh);
    rocks.push({
      mesh, rad, ang,
      speed: 22 + (i % 4) * 3.5,
      rx: 4.5 + (i % 3) * 2.2,
      ry: 5.2 + (i % 5) * 1.9
    });
  }

  const debrisRadarRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.18, 0.022, 8, 56)),
    trackMat(new THREE.MeshBasicMaterial({
      color: 0xf43f5e, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending
    }))
  );
  debrisActiveGroup.add(debrisRadarRing);

  // ===================================================================
  // 2. SOLAR STORM / CME ACTIVE RIG (90 plasma + 2 bow shock + 5 arcs + light)
  // ===================================================================
  const solarActiveGroup = new THREE.Group();
  solarActiveGroup.visible = false;
  sunGroup.add(solarActiveGroup);

  const PLASMA_COUNT = 90;
  const plasmaPos = new Float32Array(PLASMA_COUNT * 3);
  const plasmaSeeds = [];
  for (let i = 0; i < PLASMA_COUNT; i += 1) {
    const rad = 0.18 + Math.random() * 1.55;
    const ang = Math.random() * Math.PI * 2;
    const z = -3.4 + Math.random() * 6.8;
    plasmaSeeds.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, z, speed: 5.2 + Math.random() * 4.8 });
    plasmaPos[i * 3] = plasmaSeeds[i].x;
    plasmaPos[i * 3 + 1] = plasmaSeeds[i].y;
    plasmaPos[i * 3 + 2] = z;
  }
  const plasmaGeo = trackGeo(new THREE.BufferGeometry());
  const plasmaPosAttr = new THREE.BufferAttribute(plasmaPos, 3);
  plasmaGeo.setAttribute('position', plasmaPosAttr);
  const plasmaMat = trackMat(new THREE.PointsMaterial({
    color: 0xfbbf24, map: softTex, size: 0.19, sizeAttenuation: true,
    transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const plasmaPoints = new THREE.Points(plasmaGeo, plasmaMat);
  solarActiveGroup.add(plasmaPoints);

  const bowMat1 = trackMat(new THREE.MeshBasicMaterial({
    color: 0xf97316, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const bowMat2 = trackMat(new THREE.MeshBasicMaterial({
    color: 0xfef08a, transparent: true, opacity: 0.13, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending, wireframe: true
  }));
  const bowGeo = trackGeo(new THREE.SphereGeometry(1.32, 24, 14, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.42));
  const bowShell1 = new THREE.Mesh(bowGeo, bowMat1);
  bowShell1.rotation.x = Math.PI / 2;
  bowShell1.position.z = -0.25;
  const bowShell2 = new THREE.Mesh(bowGeo, bowMat2);
  bowShell2.rotation.x = Math.PI / 2;
  bowShell2.scale.setScalar(1.16);
  bowShell2.position.z = -0.35;
  solarActiveGroup.add(bowShell1, bowShell2);

  const esdArcs = [];
  const esdMat = trackMat(new THREE.LineBasicMaterial({
    color: 0xa78bfa, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  for (let i = 0; i < 5; i += 1) {
    const pts = new Float32Array(7 * 3);
    const geo = trackGeo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(geo, esdMat);
    craftGroup.add(line);
    line.visible = false;
    esdArcs.push({ line, attr: geo.getAttribute('position') });
  }
  const solarLight = new THREE.PointLight(0xffb347, 0, 12);
  solarLight.position.set(0, 0, -2.0);
  solarActiveGroup.add(solarLight);

  // ===================================================================
  // 3. ECLIPSE / CRYO ACTIVE RIG (60 rime + 10 vapor puffs + shell + blue light)
  // ===================================================================
  const eclipseActiveGroup = new THREE.Group();
  eclipseActiveGroup.visible = false;
  craftGroup.add(eclipseActiveGroup);

  const RIME_COUNT = 60;
  const rimePos = new Float32Array(RIME_COUNT * 3);
  const rimeSeeds = [];
  for (let i = 0; i < RIME_COUNT; i += 1) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r = 0.55 + Math.random() * 0.85;
    const x = r * Math.sin(ph) * Math.cos(th);
    const y = r * Math.cos(ph);
    const z = r * Math.sin(ph) * Math.sin(th);
    rimeSeeds.push({
      bx: x, by: y, bz: z, x, y, z,
      vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16, vz: (Math.random() - 0.5) * 0.16,
      nx: x / Math.max(0.01, r), ny: y / Math.max(0.01, r), nz: z / Math.max(0.01, r)
    });
    rimePos[i * 3] = x; rimePos[i * 3 + 1] = y; rimePos[i * 3 + 2] = z;
  }
  const rimeGeo = trackGeo(new THREE.BufferGeometry());
  const rimePosAttr = new THREE.BufferAttribute(rimePos, 3);
  rimeGeo.setAttribute('position', rimePosAttr);
  const rimeMat = trackMat(new THREE.PointsMaterial({
    color: 0xa5f3fc, map: softTex, size: 0.14, sizeAttenuation: true,
    transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const rimePoints = new THREE.Points(rimeGeo, rimeMat);
  eclipseActiveGroup.add(rimePoints);

  const vaporPuffs = [];
  const puffGeo = trackGeo(new THREE.SphereGeometry(0.18, 10, 8));
  for (let i = 0; i < 10; i += 1) {
    const pMat = trackMat(new THREE.MeshBasicMaterial({
      color: 0xe0f2fe, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    const m = new THREE.Mesh(puffGeo, pMat);
    const a = (i / 10) * Math.PI * 2;
    m.userData = { dir: new THREE.Vector3(Math.cos(a), ((i % 3) - 1) * 0.5, Math.sin(a)).normalize(), phase: i / 10 };
    eclipseActiveGroup.add(m);
    vaporPuffs.push(m);
  }

  const frostShellMat = trackMat(new THREE.MeshBasicMaterial({
    color: 0x67e8f9, wireframe: true, transparent: true, opacity: 0.22,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const frostShell = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(0.96, 1)), frostShellMat);
  eclipseActiveGroup.add(frostShell);

  const coldLight = new THREE.PointLight(0x3388ff, 0, 10);
  coldLight.position.set(0.6, 0.8, 0.9);
  eclipseActiveGroup.add(coldLight);

  // ===================================================================
  // 4. ANTENNA GIMBAL ACTIVE RIG (3 arcs + 18 sparks + red/amber RF rings)
  // ===================================================================
  const antennaActiveGroup = new THREE.Group();
  antennaActiveGroup.visible = false;
  craftGroup.add(antennaActiveGroup);

  const antArcMat = trackMat(new THREE.LineBasicMaterial({
    color: 0xfde047, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const antArcs = [];
  for (let i = 0; i < 3; i += 1) {
    const geo = trackGeo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(5 * 3), 3));
    const line = new THREE.Line(geo, antArcMat);
    antennaActiveGroup.add(line);
    antArcs.push({ line, attr: geo.getAttribute('position') });
  }

  const ANT_SPARK_COUNT = 18;
  const antSparkPos = new Float32Array(ANT_SPARK_COUNT * 3);
  const antSparkSeeds = [];
  for (let i = 0; i < ANT_SPARK_COUNT; i += 1) {
    antSparkSeeds.push({
      phase: Math.random(),
      vx: (Math.random() - 0.5) * 1.9,
      vy: 0.4 + Math.random() * 1.4,
      vz: (Math.random() - 0.5) * 1.9
    });
  }
  const antSparkGeo = trackGeo(new THREE.BufferGeometry());
  const antSparkAttr = new THREE.BufferAttribute(antSparkPos, 3);
  antSparkGeo.setAttribute('position', antSparkAttr);
  const antSparkMat = trackMat(new THREE.PointsMaterial({
    color: 0xfb923c, map: softTex, size: 0.13, sizeAttenuation: true,
    transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const antSparks = new THREE.Points(antSparkGeo, antSparkMat);
  antennaActiveGroup.add(antSparks);

  const rfLossRings = [];
  const rfLossGeo = trackGeo(new THREE.TorusGeometry(0.32, 0.018, 8, 32));
  for (let i = 0; i < 2; i += 1) {
    const rMat = trackMat(new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xf43f5e : 0xf59e0b, transparent: true, opacity: 0.78,
      depthWrite: false, blending: THREE.AdditiveBlending
    }));
    const ring = new THREE.Mesh(rfLossGeo, rMat);
    ring.rotation.x = Math.PI / 2;
    antennaActiveGroup.add(ring);
    rfLossRings.push(ring);
  }

  // ===================================================================
  // RESOLUTION FX RIGS (1.4s choice-specific visual effects)
  // ===================================================================
  const resolveGroup = new THREE.Group();
  resolveGroup.visible = false;
  craftGroup.add(resolveGroup);

  // RCS thruster cone plumes (Debris [1])
  const rcsGroup = new THREE.Group();
  rcsGroup.visible = false;
  const rcsMat = trackMat(new THREE.MeshBasicMaterial({
    color: 0xbae6fd, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const rcsGeo = trackGeo(new THREE.ConeGeometry(0.11, 0.65, 12));
  const rcsJet1 = new THREE.Mesh(rcsGeo, rcsMat);
  rcsJet1.rotation.z = Math.PI / 2;
  rcsJet1.position.set(-0.62, 0.14, 0.24);
  const rcsJet2 = new THREE.Mesh(rcsGeo, rcsMat);
  rcsJet2.rotation.z = Math.PI / 2;
  rcsJet2.position.set(-0.62, -0.14, -0.24);
  rcsGroup.add(rcsJet1, rcsJet2);
  resolveGroup.add(rcsGroup);

  // Faraday dome + Omni spherical pulses + Radar lock sphere
  const shieldDomeMat = trackMat(new THREE.MeshBasicMaterial({
    color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.0,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const shieldDome = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(1.12, 2)), shieldDomeMat);
  shieldDome.visible = false;
  resolveGroup.add(shieldDome);

  const radarPingMat = trackMat(new THREE.MeshBasicMaterial({
    color: 0x22d3ee, transparent: true, opacity: 0, wireframe: true,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const radarPingSphere = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.0, 20, 14)), radarPingMat);
  radarPingSphere.visible = false;
  resolveGroup.add(radarPingSphere);

  // Orthogonal emerald magnetorquer dipole rings (Solar [2])
  const dipoleGroup = new THREE.Group();
  dipoleGroup.visible = false;
  const dipoleMat1 = trackMat(new THREE.MeshBasicMaterial({
    color: 0x34d399, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const dipoleMat2 = trackMat(new THREE.MeshBasicMaterial({
    color: 0x22d3ee, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const dipoleRing1 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.08, 0.028, 10, 48)), dipoleMat1);
  const dipoleRing2 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.08, 0.028, 10, 48)), dipoleMat2);
  dipoleRing2.rotation.y = Math.PI / 2;
  dipoleGroup.add(dipoleRing1, dipoleRing2);
  resolveGroup.add(dipoleGroup);

  // Omni triple expanding rings/spheres (Antenna [1])
  const omniSpheres = [];
  const omniGeo = trackGeo(new THREE.SphereGeometry(0.95, 18, 14));
  for (let i = 0; i < 3; i += 1) {
    const m = trackMat(new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0x34d399 : 0x38bdf8, wireframe: true,
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    const s = new THREE.Mesh(omniGeo, m);
    s.visible = false;
    resolveGroup.add(s);
    omniSpheres.push(s);
  }

  // Spectrometer / Cryo scan / RF overdrive cone beams
  const beamConeMat = trackMat(new THREE.MeshBasicMaterial({
    color: 0xa855f7, transparent: true, opacity: 0, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const beamCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.68, 2.2, 20, 1, true)), beamConeMat);
  beamCone.visible = false;
  resolveGroup.add(beamCone);

  // Thermal heater core (Eclipse [1] / Antenna [2])
  const heaterCoreMat = trackMat(new THREE.MeshBasicMaterial({
    color: 0xff6622, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const heaterCore = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.76, 16, 12)), heaterCoreMat);
  heaterCore.visible = false;
  const heaterPoint = new THREE.PointLight(0xff6622, 0, 10);
  resolveGroup.add(heaterCore, heaterPoint);

  // Impact / overload metallic spark fountain (26 particles)
  const IMPACT_COUNT = 26;
  const impactPos = new Float32Array(IMPACT_COUNT * 3);
  const impactVel = [];
  for (let i = 0; i < IMPACT_COUNT; i += 1) {
    impactVel.push(new THREE.Vector3(
      (Math.random() - 0.5) * 3.8,
      (Math.random() - 0.5) * 3.8,
      (Math.random() - 0.5) * 3.8
    ));
  }
  const impactGeo = trackGeo(new THREE.BufferGeometry());
  const impactAttr = new THREE.BufferAttribute(impactPos, 3);
  impactGeo.setAttribute('position', impactAttr);
  const impactMat = trackMat(new THREE.PointsMaterial({
    color: 0xfde047, map: softTex, size: 0.16, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const impactPoints = new THREE.Points(impactGeo, impactMat);
  impactPoints.visible = false;
  resolveGroup.add(impactPoints);

  // Runtime state
  let activeType = null;
  let activeElapsed = 0;
  let esdTick = 0;
  let resolveState = null; // { type, choiceIndex, elapsed, damaged, disperseIce }
  let cachedScale = 0.25;
  let stutterTargets = [];
  let cachedDishes = [];
  let lastCraftModel = null;

  function captureSubgroupTargets(satModel) {
    stutterTargets = [];
    cachedDishes = [];
    if (!satModel?.parts) return;
    if (satModel.parts.antRotPivots?.length) {
      satModel.parts.antRotPivots.forEach((p) => {
        if (p?.group) stutterTargets.push({ group: p.group, baseRx: p.group.rotation.x, baseRy: p.group.rotation.y, baseRz: p.group.rotation.z });
      });
    } else if (satModel.parts.comms) {
      stutterTargets.push({ group: satModel.parts.comms, baseRx: satModel.parts.comms.rotation.x, baseRy: satModel.parts.comms.rotation.y, baseRz: satModel.parts.comms.rotation.z });
    }
    if (satModel.parts.dishGroups?.length) {
      satModel.parts.dishGroups.forEach((d) => { if (d) cachedDishes.push(d); });
    }
  }

  function restoreCraftActuators(satModel) {
    const model = satModel || lastCraftModel;
    if (model?.group) {
      model.group.position.x = 0;
      model.group.rotation.z = 0;
    }
    if (model?.parts?.wings) {
      model.parts.wings.forEach((w) => {
        if (w?.group) w.group.rotation.x = w.baseTiltX ?? 0;
      });
    }
    stutterTargets.forEach((t) => {
      t.group.rotation.set(t.baseRx, t.baseRy, t.baseRz);
    });
  }

  function computeAntennaLocalAnchor(satModel) {
    const targetObj = satModel?.parts?.antRotPivots?.[0]?.group || satModel?.parts?.dishGroups?.[0] || satModel?.parts?.comms;
    if (targetObj && fxRoot) {
      targetObj.getWorldPosition(TMP_V1);
      craftGroup.worldToLocal(TMP_V1);
      if (Number.isFinite(TMP_V1.x) && TMP_V1.lengthSq() < 4.0) {
        return TMP_V1.clone();
      }
    }
    return new THREE.Vector3(-0.18, 0.52, -0.1);
  }

  function hideAllActiveRigs() {
    debrisActiveGroup.visible = false;
    solarActiveGroup.visible = false;
    eclipseActiveGroup.visible = false;
    antennaActiveGroup.visible = false;
    solarLight.intensity = 0;
    coldLight.intensity = 0;
    esdArcs.forEach((a) => { a.line.visible = false; });
  }

  function hideAllResolveRigs() {
    resolveGroup.visible = false;
    rcsGroup.visible = false;
    shieldDome.visible = false;
    radarPingSphere.visible = false;
    dipoleGroup.visible = false;
    omniSpheres.forEach((s) => { s.visible = false; });
    beamCone.visible = false;
    heaterCore.visible = false;
    heaterPoint.intensity = 0;
    impactPoints.visible = false;
  }

  function regenerateEsdArcs() {
    esdArcs.forEach(({ attr }) => {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      let cx = 0.56 * Math.sin(ph) * Math.cos(th);
      let cy = 0.56 * Math.cos(ph);
      let cz = 0.56 * Math.sin(ph) * Math.sin(th);
      for (let v = 0; v < 7; v += 1) {
        attr.setXYZ(v, cx, cy, cz);
        cx += (Math.random() - 0.5) * 0.42;
        cy += (Math.random() - 0.5) * 0.42;
        cz += (Math.random() - 0.5) * 0.42;
      }
      attr.needsUpdate = true;
    });
  }

  function resetRimeParticles() {
    rimeSeeds.forEach((r, i) => {
      r.x = r.bx; r.y = r.by; r.z = r.bz;
      rimePosAttr.setXYZ(i, r.x, r.y, r.z);
    });
    rimePosAttr.needsUpdate = true;
  }

  function syncSpatial(context = {}) {
    if (context.satWorldPos) fxRoot.position.copy(context.satWorldPos);
    if (context.spacecraftScale) {
      cachedScale = Math.max(0.14, context.spacecraftScale * 1.35);
      fxRoot.scale.setScalar(cachedScale);
    }
    if (context.satQuaternion) {
      craftGroup.quaternion.copy(context.satQuaternion);
    }
    if (context.velocityDir && context.velocityDir.lengthSq() > 0.0001) {
      TMP_VEL_DIR.copy(context.velocityDir).normalize();
      velGroup.quaternion.setFromUnitVectors(TMP_FWD, TMP_VEL_DIR);
    }
    if (context.satWorldPos) {
      if (context.sunWorldPos) TMP_SUN_DIR.subVectors(context.satWorldPos, context.sunWorldPos);
      else TMP_SUN_DIR.set(-1, 0, 0);
      if (TMP_SUN_DIR.lengthSq() > 0.0001) {
        TMP_SUN_DIR.normalize();
        sunGroup.quaternion.setFromUnitVectors(TMP_FWD, TMP_SUN_DIR);
      }
    }
  }

  function startHazardFx(hazardType, context = {}) {
    const type = normalizeHazardType(hazardType);
    if (context.satModel) lastCraftModel = context.satModel;
    restoreCraftActuators(context.satModel);
    hideAllResolveRigs();
    resolveState = null;

    activeType = type;
    activeElapsed = 0;
    esdTick = 0;
    fxRoot.visible = true;
    syncSpatial(context);

    hideAllActiveRigs();
    if (type === 'debris') {
      debrisActiveGroup.visible = true;
      haloRing.material.color.setHex(0xf97316);
      haloPulse.material.color.setHex(0xf43f5e);
    } else if (type === 'solar') {
      solarActiveGroup.visible = true;
      esdArcs.forEach((a) => { a.line.visible = true; });
      regenerateEsdArcs();
      haloRing.material.color.setHex(0xfbbf24);
      haloPulse.material.color.setHex(0xf59e0b);
    } else if (type === 'eclipse') {
      eclipseActiveGroup.visible = true;
      resetRimeParticles();
      rimeMat.opacity = 0.85;
      frostShellMat.opacity = 0.22;
      haloRing.material.color.setHex(0x38bdf8);
      haloPulse.material.color.setHex(0x67e8f9);
    } else if (type === 'antenna') {
      captureSubgroupTargets(context.satModel || lastCraftModel);
      antennaActiveGroup.visible = true;
      const anchor = computeAntennaLocalAnchor(context.satModel || lastCraftModel);
      antennaActiveGroup.position.copy(anchor);
      haloRing.material.color.setHex(0xf43f5e);
      haloPulse.material.color.setHex(0xf59e0b);
    }
  }

  function resolveHazardFx(choiceIndex = 0, outcome = {}, context = {}) {
    const type = normalizeHazardType(outcome?.kind || activeType || 'debris');
    const idx = choiceIndex === 'timeout' ? 'timeout' : Number(choiceIndex || 0);
    if (context.satModel) lastCraftModel = context.satModel;

    // Preserve active stutter restore target if resolving antenna
    if (type === 'antenna' && !stutterTargets.length) {
      captureSubgroupTargets(context.satModel || lastCraftModel);
    }
    if (type === 'antenna') {
      stutterTargets.forEach((t) => t.group.rotation.set(t.baseRx, t.baseRy, t.baseRz));
    }

    const keepIceDisperse = type === 'eclipse' && idx === 0;
    hideAllActiveRigs();
    if (keepIceDisperse) {
      eclipseActiveGroup.visible = true;
      frostShell.visible = false;
      vaporPuffs.forEach((p) => { p.visible = false; });
      coldLight.intensity = 0;
    }

    activeType = null;
    fxRoot.visible = true;
    syncSpatial(context);

    hideAllResolveRigs();
    resolveGroup.visible = true;

    const damaged = idx === 'timeout' || (outcome?.hullDelta || 0) < 0;
    resolveState = { type, choiceIndex: idx, elapsed: 0, damaged, keepIceDisperse };

    for (let i = 0; i < IMPACT_COUNT; i += 1) {
      impactPos[i * 3] = 0;
      impactPos[i * 3 + 1] = 0;
      impactPos[i * 3 + 2] = 0;
      const spd = 1.8 + Math.random() * 2.5;
      impactVel[i].set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize().multiplyScalar(spd);
    }
    impactAttr.needsUpdate = true;

    if (damaged) {
      impactPoints.visible = true;
      impactMat.opacity = 1.0;
    }

    if (type === 'debris') {
      if (idx === 0) {
        rcsGroup.visible = true;
      } else if (idx === 2 || idx === 'timeout') {
        radarPingSphere.visible = true;
        radarPingMat.color.setHex(idx === 'timeout' ? 0xf43f5e : 0x22d3ee);
      }
    } else if (type === 'solar') {
      if (idx === 0) {
        shieldDome.visible = true;
        shieldDomeMat.color.setHex(0x38bdf8);
      } else if (idx === 1) {
        dipoleGroup.visible = true;
      } else {
        beamCone.visible = true;
        beamCone.rotation.set(0, 0, Math.PI / 2);
        beamCone.position.set(1.05, 0, 0);
        beamConeMat.color.setHex(0xa855f7);
      }
    } else if (type === 'eclipse') {
      if (idx === 0) {
        heaterCore.visible = true;
        heaterCoreMat.color.setHex(0xff6622);
      } else if (idx === 2 || idx === 'timeout') {
        beamCone.visible = true;
        beamCone.rotation.set(Math.PI, 0, 0);
        beamCone.position.set(0, 1.05, 0);
        beamConeMat.color.setHex(0x22d3ee);
      }
    } else if (type === 'antenna') {
      const anchor = computeAntennaLocalAnchor(context.satModel || lastCraftModel);
      if (idx === 0) {
        omniSpheres.forEach((s) => {
          s.position.copy(anchor);
          s.visible = true;
        });
      } else if (idx === 1) {
        heaterCore.visible = true;
        heaterCore.position.copy(anchor);
        heaterCore.scale.setScalar(0.55);
        heaterCoreMat.color.setHex(0xf59e0b);
      } else {
        beamCone.visible = true;
        beamCone.position.copy(anchor).add(new THREE.Vector3(0, 0.9, 0));
        beamCone.rotation.set(Math.PI, 0, 0);
        beamConeMat.color.setHex(0xe879f9);
      }
    }
  }

  function update(dt, context = {}) {
    const realDt = Math.min(0.05, Math.max(0.0001, dt || 0.016));
    if (context.satModel) lastCraftModel = context.satModel;
    const satModel = context.satModel || lastCraftModel;

    if (!activeType && !resolveState) {
      if (fxRoot.visible) clear(satModel);
      return;
    }

    syncSpatial(context);

    // Outer halo telemetry fade (0 in Chase Sat < 3.6, visible in Full Orbit >= 6.5)
    let haloAlpha = 0;
    if (activeType && context.cameraPos && context.satWorldPos) {
      const dist = context.cameraPos.distanceTo(context.satWorldPos);
      const t = Math.max(0, Math.min(1, (dist - 3.6) / 2.9));
      haloAlpha = t * (0.44 + 0.24 * Math.sin(activeElapsed * 6.5));
    }
    haloRing.material.opacity = haloAlpha;
    haloPulse.material.opacity = haloAlpha * 0.82;
    if (haloAlpha > 0.01 && context.cameraPos) {
      haloRing.lookAt(context.cameraPos);
      haloPulse.lookAt(context.cameraPos);
      const pScale = 1 + 0.14 * Math.sin(activeElapsed * 4.2);
      haloPulse.scale.setScalar(pScale);
    }

    // Active continuous hazard loop
    if (activeType) {
      activeElapsed += realDt;

      if (activeType === 'debris') {
        for (let i = 0; i < STREAK_COUNT; i += 1) {
          const s = streakSeeds[i];
          s.z -= s.speed * realDt;
          if (s.z < -4.5) s.z += 9.0;
          const base = i * 6;
          streakPos[base + 2] = s.z;
          streakPos[base + 5] = s.z + s.len;
        }
        streakPosAttr.needsUpdate = true;

        rocks.forEach((r) => {
          r.mesh.position.z -= r.speed * realDt;
          if (r.mesh.position.z < -4.5) r.mesh.position.z += 9.0;
          r.mesh.rotation.x += r.rx * realDt;
          r.mesh.rotation.y += r.ry * realDt;
        });

        debrisRadarRing.rotation.z += realDt * 2.8;
        debrisRadarRing.scale.setScalar(1 + 0.1 * Math.sin(activeElapsed * 9));
      } else if (activeType === 'solar') {
        for (let i = 0; i < PLASMA_COUNT; i += 1) {
          const p = plasmaSeeds[i];
          p.z += p.speed * realDt;
          if (p.z > 3.4) p.z -= 6.8;
          plasmaPos[i * 3 + 2] = p.z;
        }
        plasmaPosAttr.needsUpdate = true;

        bowShell1.scale.setScalar(1 + 0.045 * Math.sin(activeElapsed * 7.2));
        bowShell2.scale.setScalar(1.16 + 0.055 * Math.cos(activeElapsed * 5.8));
        bowMat1.opacity = 0.12 + 0.06 * Math.abs(Math.sin(activeElapsed * 6.0));
        solarLight.intensity = 2.6 + 1.1 * Math.sin(activeElapsed * 9.0);

        esdTick += realDt;
        if (esdTick >= 0.07) {
          esdTick = 0;
          regenerateEsdArcs();
        }
      } else if (activeType === 'eclipse') {
        for (let i = 0; i < RIME_COUNT; i += 1) {
          const r = rimeSeeds[i];
          r.x += r.vx * realDt;
          r.y += r.vy * realDt;
          r.z += r.vz * realDt;
          if ((r.x * r.x + r.y * r.y + r.z * r.z) > 2.2) {
            r.x = r.bx; r.y = r.by; r.z = r.bz;
          }
          rimePos[i * 3] = r.x;
          rimePos[i * 3 + 1] = r.y;
          rimePos[i * 3 + 2] = r.z;
        }
        rimePosAttr.needsUpdate = true;

        vaporPuffs.forEach((m) => {
          m.userData.phase = (m.userData.phase + realDt * 0.48) % 1;
          const t = m.userData.phase;
          m.position.copy(m.userData.dir).multiplyScalar(0.32 + t * 0.95);
          m.scale.setScalar(0.65 + t * 1.15);
          m.material.opacity = 0.18 * Math.sin(t * Math.PI);
        });

        frostShell.visible = true;
        frostShell.rotation.y += realDt * 0.35;
        frostShellMat.opacity = 0.11 + 0.11 * (0.5 + 0.5 * Math.sin(activeElapsed * 3.4));
        coldLight.intensity = 2.2 + 0.6 * Math.sin(activeElapsed * 2.8);
      } else if (activeType === 'antenna') {
        const stutter = Math.sin(activeElapsed * 45) * 0.07;
        const stutterY = Math.cos(activeElapsed * 33) * 0.045;
        stutterTargets.forEach((t) => {
          t.group.rotation.x = t.baseRx + stutter;
          t.group.rotation.y = t.baseRy + stutterY;
        });

        esdTick += realDt;
        if (esdTick >= 0.085) {
          esdTick = 0;
          antArcs.forEach(({ attr }) => {
            let ax = 0, ay = 0, az = 0;
            for (let v = 0; v < 5; v += 1) {
              attr.setXYZ(v, ax, ay, az);
              ax += (Math.random() - 0.5) * 0.28;
              ay += (Math.random() - 0.5) * 0.28;
              az += (Math.random() - 0.5) * 0.28;
            }
            attr.needsUpdate = true;
          });
        }

        for (let i = 0; i < ANT_SPARK_COUNT; i += 1) {
          const sp = antSparkSeeds[i];
          sp.phase = (sp.phase + realDt * 1.9) % 1;
          const t = sp.phase * 0.35;
          antSparkPos[i * 3] = sp.vx * t;
          antSparkPos[i * 3 + 1] = sp.vy * t;
          antSparkPos[i * 3 + 2] = sp.vz * t;
        }
        antSparkAttr.needsUpdate = true;

        rfLossRings.forEach((ring, i) => {
          const p = (activeElapsed * 1.45 + i * 0.5) % 1;
          ring.scale.setScalar(0.75 + p * 1.95);
          ring.material.opacity = (1 - p) * 0.78;
        });
      }
    }

    // 1.4s choice-specific resolution sequence
    if (resolveState) {
      resolveState.elapsed += realDt;
      const p = Math.min(1, resolveState.elapsed / RESOLUTION_DUR);
      const { type, choiceIndex, damaged, keepIceDisperse } = resolveState;

      if (damaged) {
        for (let i = 0; i < IMPACT_COUNT; i += 1) {
          impactPos[i * 3] += impactVel[i].x * realDt;
          impactPos[i * 3 + 1] += impactVel[i].y * realDt;
          impactPos[i * 3 + 2] += impactVel[i].z * realDt;
        }
        impactAttr.needsUpdate = true;
        impactMat.opacity = Math.max(0, 1 - p * 1.25);
      }

      if (type === 'debris') {
        if (choiceIndex === 0) {
          const dodgeCurve = Math.sin(p * Math.PI);
          if (satModel?.group) {
            satModel.group.position.x = dodgeCurve * Math.max(0.24, Math.min(0.38, (context.spacecraftScale || 0.25) * 1.35));
          }
          const plumeEnvelope = Math.sin(Math.min(1, p * 1.45) * Math.PI);
          rcsMat.opacity = 0.88 * Math.max(0, plumeEnvelope);
          rcsGroup.scale.set(0.85 + 0.5 * Math.sin(p * 28), 1, 1);
        } else if (choiceIndex === 1) {
          // Feather wings ~80 deg for ~1.2s then smoothly back
          let featherT = 0;
          if (p < 0.2) featherT = easeOutCubic(p / 0.2);
          else if (p < 0.82) featherT = 1;
          else featherT = 1 - easeInOutSine((p - 0.82) / 0.18);
          const featherRad = featherT * (80 * Math.PI / 180);
          if (satModel?.parts?.wings) {
            satModel.parts.wings.forEach((w) => {
              if (w?.group) w.group.rotation.x = (w.baseTiltX ?? 0) + featherRad;
            });
          }
        } else {
          radarPingSphere.scale.setScalar(0.45 + easeOutCubic(p) * 2.2);
          radarPingMat.opacity = 0.82 * (1 - p);
        }
      } else if (type === 'solar') {
        if (choiceIndex === 0) {
          const sc = p < 0.35 ? easeOutCubic(p / 0.35) : 1.0;
          shieldDome.scale.setScalar(0.55 + sc * 0.72);
          shieldDome.rotation.y += realDt * 1.4;
          shieldDomeMat.opacity = (p < 0.75 ? 0.68 : 0.68 * (1 - (p - 0.75) / 0.25));
        } else if (choiceIndex === 1) {
          dipoleRing1.rotation.z += realDt * 9.5;
          dipoleRing1.rotation.x += realDt * 5.0;
          dipoleRing2.rotation.y += realDt * 9.5;
          dipoleRing2.rotation.z -= realDt * 4.5;
          const op = Math.sin(p * Math.PI) * 0.9;
          dipoleMat1.opacity = op;
          dipoleMat2.opacity = op;
        } else {
          beamConeMat.opacity = Math.sin(p * Math.PI) * 0.52;
        }
      } else if (type === 'eclipse') {
        if (choiceIndex === 0) {
          const env = Math.sin(p * Math.PI);
          heaterCore.scale.setScalar(0.7 + 0.35 * Math.sin(p * 18));
          heaterCoreMat.opacity = 0.58 * env;
          heaterPoint.intensity = 5.5 * env;
          if (keepIceDisperse) {
            for (let i = 0; i < RIME_COUNT; i += 1) {
              const r = rimeSeeds[i];
              r.x += r.nx * 2.2 * realDt;
              r.y += r.ny * 2.2 * realDt;
              r.z += r.nz * 2.2 * realDt;
              rimePos[i * 3] = r.x;
              rimePos[i * 3 + 1] = r.y;
              rimePos[i * 3 + 2] = r.z;
            }
            rimePosAttr.needsUpdate = true;
            rimeMat.opacity = Math.max(0, 0.85 * (1 - p * 1.15));
          }
        } else if (choiceIndex === 1) {
          if (satModel?.group) {
            satModel.group.rotation.z = easeInOutSine(p) * Math.PI * 2;
          }
        } else {
          beamConeMat.opacity = Math.sin(p * Math.PI) * 0.48;
          beamCone.rotation.y += realDt * 2.6;
        }
      } else if (type === 'antenna') {
        if (choiceIndex === 0) {
          omniSpheres.forEach((s, i) => {
            const localP = Math.max(0, Math.min(1, (p - i * 0.16) / 0.68));
            s.visible = localP > 0 && localP < 1;
            s.scale.setScalar(0.18 + localP * 2.1);
            s.material.opacity = 0.72 * (1 - localP);
          });
        } else if (choiceIndex === 1) {
          const env = Math.sin(p * Math.PI);
          heaterCoreMat.opacity = 0.5 * env;
          heaterPoint.intensity = 3.2 * env;
          const sweepRad = easeInOutSine(p) * Math.PI * 2;
          stutterTargets.forEach((t) => {
            t.group.rotation.y = t.baseRy + sweepRad;
          });
        } else {
          beamConeMat.opacity = Math.sin(p * Math.PI) * 0.55;
        }
      }

      if (p >= 1) {
        clear(satModel);
      }
    }
  }

  function clear(satModel) {
    activeType = null;
    resolveState = null;
    hideAllActiveRigs();
    hideAllResolveRigs();
    haloRing.material.opacity = 0;
    haloPulse.material.opacity = 0;
    fxRoot.visible = false;
    restoreCraftActuators(satModel);
  }

  function dispose() {
    clear();
    if (fxRoot.parent) fxRoot.parent.remove(fxRoot);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    geometries.length = 0;
    materials.length = 0;
    textures.length = 0;
  }

  return {
    startHazardFx,
    resolveHazardFx,
    update,
    clear,
    dispose
  };
}
