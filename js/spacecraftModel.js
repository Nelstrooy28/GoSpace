import * as THREE from 'three';
import { CATALOG } from './catalog.js';

const texCache = {};
const cachedTexSet = new Set();

export function isCachedCraftTexture(tex) {
  return cachedTexSet.has(tex);
}

function registerTex(key, canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  texCache[key] = tex;
  cachedTexSet.add(tex);
  return tex;
}

function getCraftTextures() {
  if (texCache.kapton) return texCache;

  const kc = document.createElement('canvas');
  kc.width = kc.height = 512;
  const kctx = kc.getContext('2d');
  kctx.fillStyle = '#d18a12';
  kctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 420; i++) {
    const x = (Math.sin(i * 12.9898) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 78.233) * 0.5 + 0.5) * 512;
    const w = 14 + (i % 30);
    const h = 10 + ((i * 7) % 24);
    kctx.fillStyle = i % 3 === 0 ? 'rgba(255,212,92,0.34)' : i % 3 === 1 ? 'rgba(130,68,6,0.34)' : 'rgba(245,172,40,0.28)';
    kctx.beginPath();
    kctx.moveTo(x, y);
    kctx.lineTo(x + w, y + (i % 9) - 4);
    kctx.lineTo(x + w * 0.5, y + h);
    kctx.closePath();
    kctx.fill();
  }
  kctx.strokeStyle = 'rgba(255,235,150,0.18)';
  kctx.lineWidth = 1.1;
  for (let s = 64; s < 512; s += 128) {
    kctx.beginPath(); kctx.moveTo(0, s); kctx.lineTo(512, s); kctx.stroke();
    kctx.beginPath(); kctx.moveTo(s, 0); kctx.lineTo(s, 512); kctx.stroke();
  }
  registerTex('kapton', kc);

  const kb = document.createElement('canvas');
  kb.width = kb.height = 512;
  const bctx = kb.getContext('2d');
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 560; i++) {
    const x = (Math.sin(i * 41.2) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 19.7) * 0.5 + 0.5) * 512;
    const g = 92 + (i % 90);
    bctx.fillStyle = `rgb(${g},${g},${g})`;
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.lineTo(x + 22, y + ((i % 7) - 3) * 4);
    bctx.lineTo(x + 9, y + 20);
    bctx.closePath();
    bctx.fill();
  }
  const bumpTex = new THREE.CanvasTexture(kb);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  texCache.kaptonBump = bumpTex;
  cachedTexSet.add(bumpTex);

  const cc = document.createElement('canvas');
  cc.width = cc.height = 256;
  const cctx = cc.getContext('2d');
  cctx.fillStyle = '#1b2432';
  cctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 8) {
    for (let x = 0; x < 256; x += 8) {
      cctx.fillStyle = ((x + y) / 8) % 2 === 0 ? '#243043' : '#141c28';
      cctx.fillRect(x, y, 7, 7);
    }
  }
  registerTex('carbon', cc);

  const wc = document.createElement('canvas');
  wc.width = wc.height = 256;
  const wctx = wc.getContext('2d');
  wctx.fillStyle = '#e7edf5';
  wctx.fillRect(0, 0, 256, 256);
  wctx.strokeStyle = 'rgba(148,163,184,0.22)';
  wctx.lineWidth = 1;
  for (let p = 0; p < 256; p += 16) {
    wctx.beginPath(); wctx.moveTo(p, 0); wctx.lineTo(p, 256); wctx.stroke();
    wctx.beginPath(); wctx.moveTo(0, p); wctx.lineTo(256, p); wctx.stroke();
  }
  registerTex('betaCloth', wc);

  const sc = document.createElement('canvas');
  sc.width = sc.height = 512;
  const sctx = sc.getContext('2d');
  sctx.fillStyle = '#071a3e';
  sctx.fillRect(0, 0, 512, 512);
  for (let y = 4; y < 512; y += 32) {
    for (let x = 4; x < 512; x += 64) {
      const grad = sctx.createLinearGradient(x, y, x + 58, y + 26);
      grad.addColorStop(0, '#0c2f6e');
      grad.addColorStop(0.5, '#13499f');
      grad.addColorStop(1, '#092356');
      sctx.fillStyle = grad;
      sctx.fillRect(x, y, 56, 24);
      sctx.fillStyle = 'rgba(186,230,253,0.45)';
      sctx.fillRect(x + 27, y, 2, 24);
      sctx.fillRect(x, y + 11, 56, 1);
    }
  }
  sctx.strokeStyle = '#94a3b8';
  sctx.lineWidth = 3;
  sctx.strokeRect(2, 2, 508, 508);
  registerTex('solar', sc);

  const sarC = document.createElement('canvas');
  sarC.width = sarC.height = 256;
  const sarCtx = sarC.getContext('2d');
  sarCtx.fillStyle = '#334155';
  sarCtx.fillRect(0, 0, 256, 256);
  for (let y = 8; y < 256; y += 32) {
    for (let x = 8; x < 256; x += 32) {
      sarCtx.fillStyle = '#94a3b8';
      sarCtx.fillRect(x, y, 24, 24);
      sarCtx.strokeStyle = '#cbd5e1';
      sarCtx.strokeRect(x + 3, y + 3, 18, 18);
    }
  }
  registerTex('sarTile', sarC);

  const lc = document.createElement('canvas');
  lc.width = 256; lc.height = 64;
  const lctx = lc.getContext('2d');
  lctx.fillStyle = '#0f172a';
  lctx.fillRect(0, 0, 256, 64);
  lctx.strokeStyle = '#f59e0b';
  lctx.lineWidth = 3;
  lctx.strokeRect(3, 3, 250, 58);
  lctx.fillStyle = '#f8fafc';
  lctx.font = '700 28px Orbitron, sans-serif';
  lctx.textAlign = 'center';
  lctx.fillText('GOSPACE', 128, 42);
  registerTex('logo', lc);

  return texCache;
}

function makeHullMaterial(skinId, tex, envMapIntensity) {
  if (skinId === 'silver-teflon') {
    return new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      bumpMap: tex.kaptonBump,
      bumpScale: 0.012,
      metalness: 0.86,
      roughness: 0.24,
      envMapIntensity
    });
  }
  if (skinId === 'matte-carbon') {
    return new THREE.MeshStandardMaterial({
      map: tex.carbon,
      bumpMap: tex.carbon,
      bumpScale: 0.008,
      metalness: 0.24,
      roughness: 0.62,
      envMapIntensity: envMapIntensity * 0.75
    });
  }
  if (skinId === 'white-beta') {
    return new THREE.MeshStandardMaterial({
      map: tex.betaCloth,
      bumpMap: tex.betaCloth,
      bumpScale: 0.006,
      metalness: 0.12,
      roughness: 0.56,
      envMapIntensity: envMapIntensity * 0.85
    });
  }
  return new THREE.MeshStandardMaterial({
    map: tex.kapton,
    bumpMap: tex.kaptonBump,
    bumpScale: 0.022,
    metalness: 0.78,
    roughness: 0.36,
    envMapIntensity
  });
}

function createSharedMats(skinId, envMapIntensity) {
  const tex = getCraftTextures();
  return {
    tex,
    hull: makeHullMaterial(skinId, tex, envMapIntensity),
    goldFoil: new THREE.MeshStandardMaterial({
      map: tex.kapton, bumpMap: tex.kaptonBump, bumpScale: 0.02,
      metalness: 0.8, roughness: 0.35, envMapIntensity
    }),
    alum: new THREE.MeshStandardMaterial({ color: 0xd8e3f0, metalness: 0.84, roughness: 0.26, envMapIntensity }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x263244, metalness: 0.72, roughness: 0.36, envMapIntensity }),
    carbonStrut: new THREE.MeshStandardMaterial({ map: tex.carbon, metalness: 0.3, roughness: 0.52, envMapIntensity }),
    copper: new THREE.MeshStandardMaterial({ color: 0xd97736, metalness: 0.82, roughness: 0.28, envMapIntensity }),
    solar: new THREE.MeshStandardMaterial({ map: tex.solar, metalness: 0.55, roughness: 0.2, envMapIntensity: envMapIntensity * 1.15 }),
    sarFace: new THREE.MeshStandardMaterial({ map: tex.sarTile, metalness: 0.68, roughness: 0.32, envMapIntensity }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x164e63, metalness: 0.1, roughness: 0.06, clearcoat: 1.0, reflectivity: 1.0, envMapIntensity: envMapIntensity * 1.3 }),
    whiteCeramic: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.14, roughness: 0.45, envMapIntensity }),
    logoMat: new THREE.MeshStandardMaterial({ map: tex.logo, roughness: 0.4, metalness: 0.2, envMapIntensity }),
    cyanGlow: new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x06b6d4, emissiveIntensity: 1.8, roughness: 0.2 }),
    amberGlow: new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0xea580c, emissiveIntensity: 1.5, roughness: 0.3 }),
    laserGlow: new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.6, roughness: 0.2 })
  };
}

function getBusDims(busId) {
  switch (busId) {
    case '1u-nanocube': return { shape: 'box', w: 0.42, h: 0.42, d: 0.42 };
    case '3u-cubesat': return { shape: 'box', w: 0.44, h: 0.94, d: 0.44 };
    case '6u-cubesat': return { shape: 'box', w: 0.72, h: 0.96, d: 0.44 };
    case '12u-cubesat': return { shape: 'box', w: 0.78, h: 1.06, d: 0.70 };
    case 'espa-smallsat': return { shape: 'cyl', segs: 8, w: 1.08, h: 1.04, d: 1.08 };
    case 'hex-orbiter': return { shape: 'cyl', segs: 6, w: 1.24, h: 1.12, d: 1.24 };
    case 'flagship-bus': return { shape: 'cyl', segs: 8, w: 1.56, h: 1.34, d: 1.56 };
    default: return { shape: 'box', w: 0.72, h: 0.96, d: 0.44 };
  }
}

function addBusMesh(busGroup, busId, dims, mats) {
  const { shape, segs, w, h, d } = dims;
  if (shape === 'box') {
    const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.hull);
    core.castShadow = core.receiveShadow = true;
    busGroup.add(core);

    const railGeo = new THREE.BoxGeometry(0.042, h + 0.045, 0.042);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const rail = new THREE.Mesh(railGeo, mats.alum);
        rail.position.set(sx * (w / 2 + 0.004), 0, sz * (d / 2 + 0.004));
        busGroup.add(rail);
      }
    }
    const frameGeo = new THREE.BoxGeometry(w + 0.055, 0.045, d + 0.055);
    for (const sy of [-1, 1]) {
      const cap = new THREE.Mesh(frameGeo, mats.alum);
      cap.position.y = sy * (h / 2);
      busGroup.add(cap);
    }
    if (busId === '12u-cubesat') {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.06, d + 0.04), mats.darkMetal);
      busGroup.add(rib);
    }
  } else {
    const rad = w * 0.5;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.03, h, segs), mats.hull);
    core.castShadow = core.receiveShadow = true;
    busGroup.add(core);

    const topCollar = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.04, rad * 1.04, 0.06, segs), mats.alum);
    topCollar.position.y = h / 2 - 0.02;
    const botCollar = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.06, rad * 1.09, 0.09, segs), mats.darkMetal);
    botCollar.position.y = -h / 2 + 0.04;
    const midBand = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.03, rad * 1.03, 0.07, segs), mats.darkMetal);
    busGroup.add(topCollar, botCollar, midBand);

    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.038, h - 0.04, 0.038), mats.alum);
      strut.position.set(Math.sin(a) * rad, 0, Math.cos(a) * rad);
      strut.rotation.y = a;
      busGroup.add(strut);
    }

    if (busId === 'flagship-bus') {
      for (const sx of [-1, 1]) {
        const vault = new THREE.Mesh(new THREE.BoxGeometry(0.32, h * 0.55, 0.34), mats.carbonStrut);
        vault.position.set(sx * (rad * 0.92), -0.05, 0);
        busGroup.add(vault);
      }
    }
  }

  const plate = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.62, 0.56), 0.14), mats.logoMat);
  plate.position.set(0, -h * 0.2, d / 2 + 0.015);
  busGroup.add(plate);
}

const easeOutCubic = (x) => 1 - Math.pow(1 - THREE.MathUtils.clamp(x, 0, 1), 3);

function tagDeployable(obj, role) {
  obj.name = role;
  obj.userData.deployRest = {
    pos: obj.position.clone(),
    rot: obj.rotation.clone(),
    scale: obj.scale.clone()
  };
  return obj;
}

export function setDeploymentState(craftOrModel, progress) {
  const k = THREE.MathUtils.clamp(progress, 0, 1);
  if (craftOrModel && typeof craftOrModel.setDeployProgress === 'function') {
    craftOrModel.setDeployProgress(k);
    return;
  }
  const root = craftOrModel?.group || craftOrModel;
  if (!root || typeof root.traverse !== 'function') return;
  const kShield = easeOutCubic(THREE.MathUtils.clamp(k / (0.9 / 2.8), 0, 1));
  const kWings = easeOutCubic(THREE.MathUtils.clamp((k - 0.6 / 2.8) / (1.5 / 2.8), 0, 1));
  const kAnt = easeOutCubic(THREE.MathUtils.clamp((k - 1.7 / 2.8) / (1.1 / 2.8), 0, 1));
  root.traverse((obj) => {
    const rest = obj.userData?.deployRest;
    if (!rest) return;
    if (obj.name === 'sunshield') {
      obj.scale.set(THREE.MathUtils.lerp(0.28, rest.scale.x, kShield), rest.scale.y, THREE.MathUtils.lerp(0.28, rest.scale.z, kShield));
    } else if (obj.name === 'solarWingLeft' || obj.name === 'solarWingRight') {
      const side = obj.name === 'solarWingLeft' ? -1 : 1;
      obj.rotation.z = side * (1 - kWings) * (Math.PI * 0.5);
      obj.rotation.x = THREE.MathUtils.lerp(0, rest.rot.x, kWings);
    } else if (obj.name === 'commsAntenna' || obj.name === 'scienceBoom') {
      obj.scale.set(
        THREE.MathUtils.lerp(0.32, rest.scale.x, kAnt),
        THREE.MathUtils.lerp(0.22, rest.scale.y, kAnt),
        THREE.MathUtils.lerp(0.32, rest.scale.z, kAnt)
      );
    }
  });
}

function buildInstrumentMesh(instId, mats, deployState) {
  const g = new THREE.Group();
  const baseBox = (bw, bh, bd, mat = mats.darkMetal) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
    m.castShadow = true;
    return m;
  };

  if (instId === 'ir-bolometer') {
    g.add(baseBox(0.34, 0.22, 0.30, mats.darkMetal));
    for (const sx of [-0.08, 0.08]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.18, 20), mats.copper);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(sx, 0.02, 0.18);
      const optic = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.03, 20), mats.lens);
      optic.rotation.x = Math.PI / 2;
      optic.position.set(sx, 0.02, 0.265);
      g.add(barrel, optic);
    }
    const radFin = baseBox(0.38, 0.025, 0.24, mats.alum);
    radFin.position.y = 0.13;
    g.add(radFin);
  } else if (instId === 'arctic-multispec') {
    g.add(baseBox(0.46, 0.16, 0.24, mats.alum));
    const slitColors = [0x38bdf8, 0x34d399, 0xf59e0b, 0xf87171];
    slitColors.forEach((col, i) => {
      const slit = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.05),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.15 })
      );
      slit.position.set(-0.15 + i * 0.1, 0, 0.13);
      g.add(slit);
    });
  } else if (instId === 'oci-hyperspec') {
    const body = baseBox(0.42, 0.28, 0.34, mats.whiteCeramic);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 24), mats.darkMetal);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 0.05, 0.18);
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.18, 16, 1, true), mats.goldFoil);
    hood.material.side = THREE.DoubleSide;
    hood.rotation.x = Math.PI / 2;
    hood.position.set(0, 0.05, 0.32);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), mats.lens);
    glass.position.set(0, 0.05, 0.29);
    g.add(body, drum, hood, glass);
  } else if (instId === 'sar-wing') {
    const yoke = baseBox(0.26, 0.10, 0.22, mats.alum);
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.05, 0.11);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.05, 0.56), mats.sarFace);
    panel.position.set(0, 0, 0.32);
    panel.castShadow = true;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.035, 0.60), mats.alum);
    frame.position.copy(panel.position);
    frame.position.y -= 0.015;
    hinge.add(panel, frame);
    tagDeployable(hinge, 'scienceBoom');
    g.add(yoke, hinge);
    deployState.sarHinges.push(hinge);
  } else if (instId === 'lidar-cloud') {
    g.add(baseBox(0.36, 0.22, 0.32, mats.carbonStrut));
    const rxBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.24, 24), mats.alum);
    rxBarrel.rotation.x = Math.PI / 2;
    rxBarrel.position.set(-0.07, 0.02, 0.20);
    const rxLens = new THREE.Mesh(new THREE.CircleGeometry(0.105, 22), mats.lens);
    rxLens.position.set(-0.07, 0.02, 0.322);
    const txBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 18), mats.darkMetal);
    txBarrel.rotation.x = Math.PI / 2;
    txBarrel.position.set(0.12, 0.04, 0.19);
    const laserRing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 10, 20), mats.laserGlow);
    laserRing.position.set(0.12, 0.04, 0.305);
    g.add(rxBarrel, rxLens, txBarrel, laserRing);
  } else if (instId === 'cryo-ir-mapper') {
    const baffle = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.25, 0.58, 24), mats.darkMetal);
    baffle.position.y = 0.26;
    baffle.castShadow = true;
    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.31, 0.22, 24), mats.whiteCeramic);
    shroud.position.y = 0.56;
    tagDeployable(shroud, 'scienceBoom');
    const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 6), mats.goldFoil);
    mirror.position.y = 0.52;
    const trip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), mats.alum);
    trip.position.y = 0.66;
    g.add(baffle, shroud, mirror, trip);
    deployState.baffleShrouds.push(shroud);
  } else if (instId === 'boom-mag') {
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.18, 16), mats.alum);
    g.add(canister);
    const ext = new THREE.Group();
    const len = 1.25;
    for (let i = 0; i < 6; i++) {
      const y0 = (i / 6) * len;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, len / 6 + 0.01, 6), mats.carbonStrut);
      seg.position.y = y0 + len / 12;
      ext.add(seg);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.008, 8, 6), mats.alum);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y0 + len / 6;
      ext.add(ring);
    }
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), mats.goldFoil);
    tip.position.y = len + 0.08;
    const flux = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 14), mats.cyanGlow);
    flux.position.set(0, len + 0.18, 0);
    ext.add(tip, flux);
    tagDeployable(ext, 'scienceBoom');
    g.add(ext);
    deployState.booms.push(ext);
  } else if (instId === 'neutron-spec') {
    g.add(baseBox(0.32, 0.14, 0.22, mats.darkMetal));
    for (const sx of [-0.11, 0.11]) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 6), mats.goldFoil);
      can.position.set(sx, 0.16, 0);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.03, 6), mats.copper);
      cap.position.set(sx, 0.29, 0);
      g.add(can, cap);
    }
  } else if (instId === 'plasma-analyzer') {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.14, 20), mats.alum);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.goldFoil);
    dome.position.y = 0.07;
    g.add(hat, dome);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.11), mats.copper);
      petal.position.set(Math.sin(a) * 0.17, 0.04, Math.cos(a) * 0.17);
      petal.rotation.y = a;
      petal.rotation.x = 0.3;
      g.add(petal);
    }
  } else {
    // optical-spyglass (plus fallback)
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.56, 24), mats.carbonStrut);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.20;
    const baffleRing = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 12, 24), mats.alum);
    baffleRing.position.z = 0.48;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.145, 24), mats.lens);
    lens.position.z = 0.475;
    g.add(barrel, baffleRing, lens);
  }
  return g;
}

function mountPayloads(payloadGroup, instIds, bus, dims, mats, deployState) {
  const slots = bus?.payloadSlots || 1;
  const active = (instIds || []).slice(0, Math.max(slots, 3));
  const { w, h, d } = dims;

  active.forEach((id, idx) => {
    const inst = buildInstrumentMesh(id, mats, deployState);
    if (idx === 0) {
      // Top zenith / forward deck (unobstructed pedestal side)
      inst.position.set(0, h * 0.5 + 0.11, d * 0.08);
      if (id === 'sar-wing') {
        inst.position.set(0, h * 0.12, d * 0.5 + 0.05);
      }
    } else if (idx === 1) {
      // Forward +Z face instrument bay
      if (id === 'boom-mag') {
        inst.position.set(w * 0.24, h * 0.46, -d * 0.25);
        inst.rotation.z = -0.38;
        inst.rotation.x = -0.25;
      } else if (id === 'sar-wing') {
        inst.position.set(0, -h * 0.06, d * 0.5 + 0.06);
      } else {
        inst.position.set(0, h * 0.14, d * 0.5 + 0.10);
      }
    } else {
      // 3rd hardpoint: upper-aft / angled boom bay away from ±X wings
      if (id === 'boom-mag') {
        inst.position.set(-w * 0.22, h * 0.46, -d * 0.28);
        inst.rotation.z = 0.36;
        inst.rotation.x = -0.28;
      } else if (id === 'sar-wing') {
        inst.position.set(0, h * 0.06, -d * 0.5 - 0.06);
        inst.rotation.y = Math.PI;
      } else {
        inst.position.set(0, h * 0.16, -d * 0.5 - 0.10);
        inst.rotation.y = Math.PI;
      }
    }
    payloadGroup.add(inst);
  });
}

function makeWingPanel(length, width, mats, copperBack = false) {
  const wg = new THREE.Group();
  const front = new THREE.Mesh(new THREE.BoxGeometry(length, 0.022, width), mats.solar);
  front.castShadow = front.receiveShadow = true;
  const backMat = copperBack ? mats.copper : mats.carbonStrut;
  const back = new THREE.Mesh(new THREE.BoxGeometry(length + 0.02, 0.016, width + 0.02), backMat);
  back.position.y = -0.012;
  wg.add(front, back);
  return wg;
}

function buildPowerSystem(solarGroup, solarId, dims, mats, deployState) {
  const { w, h, d } = dims;
  const attachX = w * 0.5 + 0.04;

  if (solarId === 'body-mounted') {
    for (const sx of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.025, h * 0.72, d * 0.72), mats.solar);
      plate.position.set(sx * (w * 0.5 + 0.018), 0, 0);
      solarGroup.add(plate);
    }
    return;
  }

  if (solarId === 'rtg-nuclear') {
    for (const sx of [-1, 1]) {
      const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 10), mats.alum);
      mount.rotation.z = sx * 1.15;
      mount.position.set(sx * (attachX + 0.08), -h * 0.18, -d * 0.16);
      const can = new THREE.Group();
      can.position.set(sx * (attachX + 0.28), -h * 0.28, -d * 0.22);
      can.rotation.z = sx * 0.42;
      can.rotation.x = -0.25;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.56, 16), mats.darkMetal);
      const glowRing = new THREE.Mesh(new THREE.CylinderGeometry(0.136, 0.136, 0.34, 16), mats.amberGlow);
      can.add(body, glowRing);
      for (let f = 0; f < 8; f++) {
        const a = (f / 8) * Math.PI * 2;
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.54, 0.10), mats.darkMetal);
        fin.position.set(Math.sin(a) * 0.17, 0, Math.cos(a) * 0.17);
        fin.rotation.y = a;
        can.add(fin);
      }
      solarGroup.add(mount, can);
      deployState.rtgGlows.push(glowRing);
    }
    return;
  }

  if (solarId === 'quad-xwing') {
    const bankAngles = [0.46, -0.46];
    for (const sx of [-1, 1]) {
      for (const tilt of bankAngles) {
        const hinge = new THREE.Group();
        hinge.position.set(sx * attachX, 0, 0);
        const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), mats.alum);
        yoke.rotation.z = Math.PI / 2;
        yoke.position.x = sx * 0.09;
        const panel = makeWingPanel(1.38, 0.40, mats, false);
        panel.position.set(sx * 0.86, 0, 0);
        hinge.add(yoke, panel);
        hinge.rotation.x = tilt;
        tagDeployable(hinge, sx < 0 ? 'solarWingLeft' : 'solarWingRight');
        solarGroup.add(hinge);
        deployState.wings.push({ group: hinge, side: sx, baseTiltX: tilt, deployedZ: 0 });
      }
    }
    return;
  }

  if (solarId === 'rollout-blanket') {
    for (const sx of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(sx * attachX, 0.02, 0);
      for (const bz of [-0.26, 0.26]) {
        const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.05, 8), mats.carbonStrut);
        boom.rotation.z = Math.PI / 2;
        boom.position.set(sx * 1.04, 0, bz);
        hinge.add(boom);
      }
      const blanket = makeWingPanel(1.92, 0.56, mats, true);
      blanket.position.set(sx * 1.02, 0, 0);
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.62, 14), mats.goldFoil);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(sx * 2.02, 0, 0);
      hinge.add(blanket, roller);
      hinge.rotation.x = 0.22;
      tagDeployable(hinge, sx < 0 ? 'solarWingLeft' : 'solarWingRight');
      solarGroup.add(hinge);
      deployState.wings.push({ group: hinge, side: sx, baseTiltX: 0.22, deployedZ: 0 });
    }
    return;
  }

  const segCount = solarId === 'high-eff-gimbal' ? 3 : 2;
  const segLen = solarId === 'high-eff-gimbal' ? 0.66 : 0.58;
  const segW = solarId === 'high-eff-gimbal' ? 0.62 : 0.44;
  for (const sx of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(sx * attachX, 0, 0);
    const gimbal = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.20, 12), mats.alum);
    gimbal.rotation.z = Math.PI / 2;
    gimbal.position.x = sx * 0.10;
    hinge.add(gimbal);
    for (let k = 0; k < segCount; k++) {
      const p = makeWingPanel(segLen, segW, mats, false);
      p.position.x = sx * (0.20 + segLen * 0.5 + k * (segLen + 0.03));
      hinge.add(p);
    }
    hinge.rotation.x = 0.24;
    tagDeployable(hinge, sx < 0 ? 'solarWingLeft' : 'solarWingRight');
    solarGroup.add(hinge);
    deployState.wings.push({ group: hinge, side: sx, baseTiltX: 0.24, deployedZ: 0 });
  }
}

function buildCommsSystem(commsGroup, txId, dims, mats, deployState) {
  const { w, h, d } = dims;
  const basePos = new THREE.Vector3(-w * 0.28, h * 0.5 + 0.02, -d * 0.18);

  if (txId === 'uhf') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      const pivot = new THREE.Group();
      pivot.position.set(Math.sin(a) * (w * 0.34), h * 0.5, Math.cos(a) * (d * 0.34));
      pivot.rotation.y = a;
      pivot.rotation.x = 0.85;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.52, 8), mats.alum);
      rod.position.y = 0.26;
      pivot.add(rod);
      tagDeployable(pivot, 'commsAntenna');
      commsGroup.add(pivot);
      deployState.whips.push(pivot);
    }
    return;
  }

  if (txId === 's-band') {
    const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.045, 6), mats.whiteCeramic);
    patch.position.set(w * 0.24, h * 0.5 + 0.03, d * 0.14);
    const copperRim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.052, 6), mats.copper);
    copperRim.position.copy(patch.position);
    commsGroup.add(patch, copperRim);
    return;
  }

  if (txId === 'sx-band') {
    const antPivot = new THREE.Group();
    antPivot.position.copy(basePos);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.18, 12), mats.alum);
    mast.position.set(0, 0.08, 0);
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.05, 0.22, 20, 1, true), mats.copper);
    horn.material.side = THREE.DoubleSide;
    horn.position.set(0, 0.24, 0);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.016, 10, 20), mats.alum);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.35, 0);
    antPivot.add(mast, horn, collar);
    tagDeployable(antPivot, 'commsAntenna');
    commsGroup.add(antPivot);
    deployState.antRotPivots.push({ group: antPivot, stowedX: -1.35, deployedX: 0 });
    return;
  }

  if (txId === 'ka-mesh') {
    const root = new THREE.Group();
    root.position.copy(basePos).add(new THREE.Vector3(-0.08, 0.16, -0.04));
    root.rotation.set(-0.28, 0, 0.22);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.24, 10), mats.alum);
    mast.position.y = -0.08;
    root.add(mast);

    const meshGroup = new THREE.Group();
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, metalness: 0.72, roughness: 0.32, transparent: true, opacity: 0.72, wireframe: false, side: THREE.DoubleSide
    });
    const bowl = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.04, 0.0),
      new THREE.Vector2(0.24, 0.05),
      new THREE.Vector2(0.46, 0.18)
    ], 24), dishMat);
    meshGroup.add(bowl);
    for (let r = 0; r < 12; r++) {
      const a = (r / 12) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.46), mats.carbonStrut);
      rib.position.set(Math.sin(a) * 0.23, 0.08, Math.cos(a) * 0.23);
      rib.rotation.y = a;
      rib.rotation.x = -0.34;
      meshGroup.add(rib);
    }
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.028, 0.22, 12), mats.goldFoil);
    feed.position.y = 0.24;
    meshGroup.add(feed);
    tagDeployable(meshGroup, 'commsAntenna');
    root.add(meshGroup);
    tagDeployable(root, 'commsAntenna');
    commsGroup.add(root);
    deployState.dishGroups.push(meshGroup);
    deployState.antRotPivots.push({ group: root, stowedX: -1.18, deployedX: -0.28 });
    return;
  }

  // ka-optical: precision laser gimbal turret
  const turretPivot = new THREE.Group();
  turretPivot.position.copy(basePos);
  const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 16), mats.darkMetal);
  turretBase.position.set(0, 0.06, 0);
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.09), mats.alum);
  yoke.position.set(0, 0.18, 0);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 20), mats.whiteCeramic);
  head.rotation.x = Math.PI * 0.35;
  head.position.set(0, 0.22, 0.04);
  const laserPort = new THREE.Mesh(new THREE.CircleGeometry(0.068, 20), mats.lens);
  laserPort.rotation.x = -Math.PI * 0.15;
  laserPort.position.set(0, 0.28, 0.14);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), mats.cyanGlow);
  beacon.position.copy(laserPort.position).add(new THREE.Vector3(0, 0.01, 0.01));
  turretPivot.add(turretBase, yoke, head, laserPort, beacon);
  tagDeployable(turretPivot, 'commsAntenna');
  commsGroup.add(turretPivot);
  deployState.antRotPivots.push({ group: turretPivot, stowedX: -0.95, deployedX: 0 });
}

function buildThermalPropulsion(thermGroup, thermId, dims, mats, deployState) {
  const { w, h, d } = dims;

  // Perimeter thermal / fairing release latches on bus shoulders (unlatch 0.0s-0.9s)
  for (let i = 0; i < 4; i++) {
    const sx = i % 2 === 0 ? -1 : 1;
    const sz = i < 2 ? -1 : 1;
    const latch = new THREE.Group();
    latch.position.set(sx * (w * 0.44), h * 0.48, sz * (d * 0.42));
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.032, 0.09), mats.alum);
    clamp.position.set(sx * 0.03, 0.015, 0);
    latch.add(clamp);
    tagDeployable(latch, 'sunshield');
    thermGroup.add(latch);
    deployState.latches.push({ group: latch, side: sx });
  }

  if (thermId === 'cryocooler-st') {
    const shieldRoot = new THREE.Group();
    shieldRoot.position.set(0, -h * 0.42, 0);
    for (let layer = 0; layer < 4; layer++) {
      const scale = 1.0 - layer * 0.07;
      const kite = new THREE.Mesh(
        new THREE.BoxGeometry(w * 1.48 * scale, 0.012, d * 1.65 * scale),
        layer === 0 ? mats.goldFoil : mats.alum
      );
      kite.rotation.y = Math.PI * 0.25;
      kite.position.y = -layer * 0.055;
      tagDeployable(kite, 'sunshield');
      shieldRoot.add(kite);
      deployState.sunshieldLayers.push({ mesh: kite, layer });
    }
    tagDeployable(shieldRoot, 'sunshield');
    const radWing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.03), mats.whiteCeramic);
    radWing.position.set(0, 0.15, -d * 0.56);
    thermGroup.add(shieldRoot, radWing);
    return;
  }

  if (thermId === 'xenon-ion') {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.14, 24), mats.darkMetal);
    collar.rotation.x = Math.PI * 0.5;
    collar.position.set(0, -h * 0.30, -d * 0.5 - 0.06);
    const hallRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 14, 28), mats.cyanGlow);
    hallRing.position.set(0, -h * 0.30, -d * 0.5 - 0.14);
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.20, 0.55, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
    );
    plume.rotation.x = -Math.PI * 0.5;
    plume.position.set(0, -h * 0.30, -d * 0.5 - 0.42);
    const xenonTank = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), mats.copper);
    xenonTank.position.set(w * 0.24, -h * 0.24, -d * 0.42);
    thermGroup.add(collar, hallRing, plume, xenonTank);
    deployState.ionGlows.push({ ring: hallRing, plume });
    return;
  }

  if (thermId === 'green-monoprop') {
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mats.alum);
    tank.position.set(0, -h * 0.22, -d * 0.48);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.22, 18), mats.darkMetal);
    bell.rotation.x = Math.PI * 0.5;
    bell.position.set(0, -h * 0.32, -d * 0.62);
    thermGroup.add(tank, bell);
    return;
  }

  if (thermId === 'cold-gas-rcs') {
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), mats.alum);
    tank.position.set(0, -h * 0.26, -d * 0.45);
    thermGroup.add(tank);
    for (const sx of [-1, 1]) {
      const quad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.10), mats.darkMetal);
      quad.position.set(sx * (w * 0.44), -h * 0.34, d * 0.42);
      thermGroup.add(quad);
    }
    return;
  }

  // passive-mag louvers
  const louver = new THREE.Mesh(new THREE.BoxGeometry(w * 0.48, 0.20, 0.03), mats.darkMetal);
  louver.position.set(0, -h * 0.18, -d * 0.5 - 0.02);
  thermGroup.add(louver);
}

/**
 * Shared procedural 3D spacecraft factory used by Hangar, Launch Fairing, and Orbit.
 * Reads live missionState across bus, multi-slot payloads, solar/RTG, prop/thermal, comms, and hullSkinId.
 */
export function buildSpacecraftModel(missionState, options = {}) {
  const { deployProgress = 1, envMapIntensity = 1.0 } = options;
  const bus = CATALOG.space.buses.find((b) => b.id === missionState.busId) || CATALOG.space.buses[2];
  const dims = getBusDims(bus.id);
  const mats = createSharedMats(missionState.hullSkinId || 'gold-kapton', envMapIntensity);

  const group = new THREE.Group();
  const busGroup = new THREE.Group();
  const payloadGroup = new THREE.Group();
  const solarGroup = new THREE.Group();
  const commsGroup = new THREE.Group();
  const thermalGroup = new THREE.Group();
  const batteryGroup = new THREE.Group();

  const battBox = new THREE.Mesh(new THREE.BoxGeometry(dims.w * 0.38, dims.h * 0.24, 0.10), mats.carbonStrut);
  battBox.position.set(0, -dims.h * 0.12, -dims.d * 0.46);
  batteryGroup.add(battBox);

  const deployState = {
    wings: [], booms: [], sarHinges: [], whips: [], dishGroups: [], antRotPivots: [],
    baffleShrouds: [], latches: [], sunshieldLayers: [], ionGlows: [], rtgGlows: []
  };
  let lockFlashAmt = 0;
  let lastProgress = deployProgress;

  addBusMesh(busGroup, bus.id, dims, mats);
  mountPayloads(payloadGroup, missionState.instrumentIds, bus, dims, mats, deployState);
  buildPowerSystem(solarGroup, missionState.solarId, dims, mats, deployState);
  buildCommsSystem(commsGroup, missionState.transceiverId, dims, mats, deployState);
  buildThermalPropulsion(thermalGroup, missionState.thermalId, dims, mats, deployState);

  group.add(busGroup, payloadGroup, solarGroup, commsGroup, thermalGroup, batteryGroup);

  function triggerLockFlash(strength = 1.0) {
    lockFlashAmt = Math.max(lockFlashAmt, strength);
  }

  function setDeployProgress(t) {
    const k = THREE.MathUtils.clamp(t, 0, 1);
    const kShield = easeOutCubic(THREE.MathUtils.clamp(k / (0.9 / 2.8), 0, 1));
    const kWings = easeOutCubic(THREE.MathUtils.clamp((k - 0.6 / 2.8) / (1.5 / 2.8), 0, 1));
    const kAnt = easeOutCubic(THREE.MathUtils.clamp((k - 1.7 / 2.8) / (1.1 / 2.8), 0, 1));

    // Metallic lock flash as each stage snaps into final rest position
    if (lastProgress < 0.32 && k >= 0.32) triggerLockFlash(0.75);
    if (lastProgress < 0.75 && k >= 0.75) triggerLockFlash(1.0);
    if (lastProgress < 0.99 && k >= 0.99) triggerLockFlash(1.1);
    lastProgress = k;

    deployState.latches.forEach((l) => {
      l.group.rotation.z = l.side * THREE.MathUtils.lerp(0.95, -0.65, kShield);
    });
    deployState.sunshieldLayers.forEach((s) => {
      const xy = THREE.MathUtils.lerp(0.24, 1.0, kShield);
      s.mesh.scale.set(xy, 1, xy);
      s.mesh.position.y = -s.layer * THREE.MathUtils.lerp(0.012, 0.06, kShield);
    });
    deployState.wings.forEach((w) => {
      w.group.rotation.z = w.side * (1 - kWings) * (Math.PI * 0.5);
      w.group.rotation.x = THREE.MathUtils.lerp(0, w.baseTiltX, kWings);
      w.group.scale.x = THREE.MathUtils.lerp(0.45, 1.0, kWings);
    });
    deployState.booms.forEach((b) => {
      b.scale.y = THREE.MathUtils.lerp(0.14, 1.0, kAnt);
    });
    deployState.baffleShrouds.forEach((s) => {
      const rest = s.userData?.deployRest;
      if (rest) s.position.y = THREE.MathUtils.lerp(rest.pos.y - 0.14, rest.pos.y, kAnt);
    });
    deployState.sarHinges.forEach((h) => {
      h.rotation.x = THREE.MathUtils.lerp(-1.48, 0.28, kAnt);
    });
    deployState.whips.forEach((p) => {
      p.rotation.x = THREE.MathUtils.lerp(0.06, 0.85, kAnt);
    });
    deployState.antRotPivots.forEach((a) => {
      a.group.rotation.x = THREE.MathUtils.lerp(a.stowedX, a.deployedX, kAnt);
    });
    deployState.dishGroups.forEach((d) => {
      const s = THREE.MathUtils.lerp(0.24, 1.0, kAnt);
      d.scale.set(s, 1, s);
    });
    deployState.ionGlows.forEach((g) => {
      g.plume.visible = k > 0.6;
    });
  }

  function setExploded(amount) {
    const raw = typeof amount === 'boolean' ? (amount ? 1 : 0) : Number(amount || 0);
    const a = THREE.MathUtils.clamp(raw, 0, 1) * 0.72;
    payloadGroup.position.set(0, a * 0.55, a * 0.35);
    solarGroup.position.set(0, 0, 0);
    deployState.wings.forEach((w) => { w.group.position.x = w.side * (dims.w * 0.5 + 0.04 + a * 0.55); });
    commsGroup.position.set(-a * 0.35, a * 0.65, -a * 0.25);
    thermalGroup.position.set(0, -a * 0.45, -a * 0.55);
    batteryGroup.position.set(0, 0, -a * 0.42);
  }

  function update(dt, elapsed = 0) {
    const pulse = 1.3 + Math.sin(elapsed * 4.5) * 0.45;
    deployState.ionGlows.forEach((g) => {
      g.ring.material.emissiveIntensity = pulse * 1.4;
      g.plume.scale.set(1, 0.92 + Math.sin(elapsed * 12) * 0.12, 1);
    });
    deployState.rtgGlows.forEach((r) => {
      r.material.emissiveIntensity = 1.2 + Math.sin(elapsed * 2.2) * 0.35;
    });
    if (lockFlashAmt > 0.001) {
      lockFlashAmt = Math.max(0, lockFlashAmt - (dt || 0.016) * 3.4);
      mats.alum.emissive.setHex(0x7dd3fc);
      mats.alum.emissiveIntensity = lockFlashAmt * 1.15;
      mats.goldFoil.emissive.setHex(0xfde68a);
      mats.goldFoil.emissiveIntensity = lockFlashAmt * 0.95;
    } else if (mats.alum.emissiveIntensity !== 0) {
      mats.alum.emissiveIntensity = 0;
      mats.goldFoil.emissiveIntensity = 0;
    }
  }

  setDeployProgress(deployProgress);
  lockFlashAmt = 0;

  let meshCount = 0;
  group.traverse((obj) => {
    if (obj.isMesh) meshCount += 1;
  });

  function dispose() {
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const list = Array.isArray(obj.material) ? obj.material : [obj.material];
        list.forEach((m) => {
          if (m.map && !cachedTexSet.has(m.map)) m.map.dispose();
          if (m.bumpMap && !cachedTexSet.has(m.bumpMap)) m.bumpMap.dispose();
          m.dispose();
        });
      }
    });
  }

  return {
    group,
    parts: { bus: busGroup, payload: payloadGroup, solar: solarGroup, comms: commsGroup, thermal: thermalGroup, battery: batteryGroup, ...deployState },
    dims: { ...dims, halfH: dims.h * 0.5 },
    meshCount,
    setExploded,
    setDeployProgress,
    triggerLockFlash,
    update,
    dispose
  };
}
