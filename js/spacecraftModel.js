import * as THREE from 'three';
import { CATALOG } from './catalog.js';
import { fbm2 } from './solarSystem.js';

const find = (arr, id) => arr.find((x) => x.id === id) || null;
const texCache = { kaptonBump: null, solarMap: null };

export function isCachedCraftTexture(tex) {
  return Boolean(tex && (tex === texCache.kaptonBump || tex === texCache.solarMap));
}

function getCraftTextures() {
  if (!texCache.kaptonBump) {
    const kc = document.createElement('canvas'); kc.width = 512; kc.height = 512;
    const kCtx = kc.getContext('2d'), img = kCtx.createImageData(512, 512), kd = img.data;
    for (let y = 0; y < 512; y += 1) {
      for (let x = 0; x < 512; x += 1) {
        const idx = (y * 512 + x) * 4;
        const c1 = fbm2(x * 0.045, y * 0.045, 4);
        const crease = Math.abs(Math.sin(x * 0.06 + c1 * 4.5) * Math.cos(y * 0.06 - c1 * 3.8));
        const v = Math.round(90 + crease * 155);
        kd[idx] = v; kd[idx + 1] = v; kd[idx + 2] = v; kd[idx + 3] = 255;
      }
    }
    kCtx.putImageData(img, 0, 0);
    texCache.kaptonBump = new THREE.CanvasTexture(kc);
    texCache.kaptonBump.wrapS = texCache.kaptonBump.wrapT = THREE.RepeatWrapping;
  }

  if (!texCache.solarMap) {
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 512;
    const sCtx = sc.getContext('2d');
    sCtx.fillStyle = '#071a4a';
    sCtx.fillRect(0, 0, 512, 512);
    const cols = 4, rows = 8, cw = 512 / cols, ch = 512 / rows;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = c * cw + 4, y = r * ch + 3, w = cw - 8, h = ch - 6;
        const g = sCtx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, '#0f3478'); g.addColorStop(0.5, '#1749a6'); g.addColorStop(1, '#0c2d68');
        sCtx.fillStyle = g;
        sCtx.fillRect(x, y, w, h);
        sCtx.strokeStyle = 'rgba(186,230,253,0.45)';
        sCtx.lineWidth = 1.4;
        sCtx.strokeRect(x, y, w, h);
        sCtx.fillStyle = 'rgba(203,213,225,0.32)';
        for (let f = 1; f < 4; f += 1) sCtx.fillRect(x, y + (h * f) / 4, w, 1);
        sCtx.fillRect(x + w * 0.5 - 1, y, 2, h);
      }
    }
    texCache.solarMap = new THREE.CanvasTexture(sc);
    texCache.solarMap.colorSpace = THREE.SRGBColorSpace;
  }
  return texCache;
}

function makeMats(envScale) {
  const tex = getCraftTextures();
  const std = (color, metalness, roughness, baseEnv = 1.05, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: baseEnv * envScale, ...extra });
  return {
    gold: std(0xebb328, 0.85, 0.32, 1.2, { bumpMap: tex.kaptonBump, bumpScale: 0.024 }),
    rail: std(0x283244, 0.65, 0.42, 1.0),
    alloy: std(0xa8b5c7, 0.78, 0.32, 1.15),
    bronze: std(0xc96a1b, 0.76, 0.34, 1.1),
    white: std(0xe2e8f0, 0.16, 0.48, 0.9),
    solar: std(0x1d4ed8, 0.5, 0.25, 1.15, { map: tex.solarMap, emissive: 0x091d4a, emissiveIntensity: 0.08 }),
    lens: std(0x0284c7, 0.7, 0.08, 1.2, { emissive: 0x0369a1, emissiveIntensity: 0.16 }),
    hdrCyan: std(0x38bdf8, 0.55, 0.32, 1.1),
    shield: std(0xcbd5e1, 0.74, 0.34, 1.1, { side: THREE.DoubleSide }),
    dish: std(0xe2e8f0, 0.42, 0.38, 1.0, { side: THREE.DoubleSide }),
    batt: std(0x0f766e, 0.52, 0.36, 0.95),
    warn: new THREE.MeshStandardMaterial({ color: 0xef4444, wireframe: true, transparent: true, opacity: 0.85 })
  };
}

export function buildSpacecraftModel(missionState, options = {}) {
  const {
    showWarnings = true,
    deployProgress = 1,
    envMapIntensity = 1.0,
    castShadow = true,
    receiveShadow = true
  } = options;

  const root = new THREE.Group();
  const mats = makeMats(envMapIntensity);
  const animParts = [];
  const pulseMeshes = [];
  const deployHooks = [];
  let meshCount = 0;
  let explodeTarget = 0;
  let explodeCur = 0;

  const addPart = (parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.castShadow = castShadow;
    m.receiveShadow = receiveShadow;
    parent.add(m);
    meshCount += 1;
    return m;
  };

  const regAnim = (obj, basePos, offset) => {
    obj.position.set(...basePos);
    const base = new THREE.Vector3(...basePos);
    animParts.push({ obj, base, exp: base.clone().add(new THREE.Vector3(...offset)) });
  };

  // 1. Spacecraft Bus & Internal Reaction Wheels + Corner RCS Quads
  const busMeta = find(CATALOG.space.buses, missionState.busId);
  const busGroup = new THREE.Group();
  const rwa = new THREE.Group();
  [[-0.14, 0.08, 0], [0.14, 0.08, 0], [0, -0.08, 0.14]].forEach(([x, y, z], i) => {
    addPart(rwa, new THREE.CylinderGeometry(0.11, 0.11, 0.07, 16), mats.alloy, [x, y, z], i === 2 ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]);
  });
  addPart(rwa, new THREE.BoxGeometry(0.24, 0.18, 0.22), mats.rail, [0, -0.08, -0.1]);
  regAnim(rwa, [0, 0, 0], [0, 0.1, 0.95]);
  busGroup.add(rwa);

  let dims;
  if (missionState.busId === 'espa-smallsat') {
    addPart(busGroup, new THREE.CylinderGeometry(0.92, 0.92, 1.38, 8), mats.alloy);
    addPart(busGroup, new THREE.CylinderGeometry(0.84, 0.84, 0.95, 8), mats.gold);
    addPart(busGroup, new THREE.TorusGeometry(0.9, 0.055, 10, 32), mats.rail, [0, -0.68, 0], [Math.PI / 2, 0, 0]);
    dims = { halfW: 0.92, halfH: 0.7, halfD: 0.92 };
  } else if (missionState.busId === 'flagship-bus') {
    addPart(busGroup, new THREE.CylinderGeometry(1.15, 1.28, 1.6, 6), mats.gold);
    addPart(busGroup, new THREE.CylinderGeometry(1.22, 1.22, 0.16, 6), mats.rail, [0, 0.72, 0]);
    for (let k = 0; k < 4; k += 1) {
      addPart(busGroup, new THREE.CylinderGeometry(1.75 + k * 0.22, 1.75 + k * 0.22, 0.025, 5), mats.shield, [0, -0.78 - k * 0.12, 0]);
    }
    dims = { halfW: 1.25, halfH: 0.82, halfD: 1.25 };
  } else {
    dims = missionState.busId === '3u-cubesat' ? { halfW: 0.34, halfH: 0.72, halfD: 0.34 } : { halfW: 0.62, halfH: 0.72, halfD: 0.36 };
    addPart(busGroup, new THREE.BoxGeometry(dims.halfW * 1.88, dims.halfH * 1.9, dims.halfD * 1.88), mats.gold);
    const rx = dims.halfW * 0.94, rz = dims.halfD * 0.94;
    [[-rx, -rz], [rx, -rz], [-rx, rz], [rx, rz]].forEach(([x, z]) => addPart(busGroup, new THREE.BoxGeometry(0.08, dims.halfH * 2.04, 0.08), mats.rail, [x, 0, z]));
    addPart(busGroup, new THREE.BoxGeometry(dims.halfW * 2.02, 0.08, dims.halfD * 2.02), mats.rail, [0, dims.halfH, 0]);
    addPart(busGroup, new THREE.BoxGeometry(dims.halfW * 2.02, 0.08, dims.halfD * 2.02), mats.rail, [0, -dims.halfH, 0]);
  }
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const cx = sx * dims.halfW * 0.86, cz = sz * dims.halfD * 0.86;
    addPart(busGroup, new THREE.BoxGeometry(0.08, 0.08, 0.08), mats.rail, [cx, dims.halfH * 0.86, cz]);
    addPart(busGroup, new THREE.ConeGeometry(0.032, 0.08, 8), mats.bronze, [cx + sx * 0.055, dims.halfH * 0.86, cz], [0, 0, -sx * Math.PI / 2]);
  });
  root.add(busGroup);

  // 2. Solar Arrays (supports smooth folded-inside-fairing -> deployed wings animation)
  const solarWrap = new THREE.Group();
  const solarId = missionState.solarId;
  if (solarId === 'body-mounted') {
    [-1, 1].forEach((dir) => {
      const wing = new THREE.Group();
      addPart(wing, new THREE.BoxGeometry(0.05, dims.halfH * 1.55, dims.halfD * 1.55), mats.solar);
      regAnim(wing, [dir * (dims.halfW + 0.04), 0, 0], [dir * 0.65, 0, 0]);
      solarWrap.add(wing);
    });
  } else {
    const panels = solarId === 'high-eff-gimbal' ? 3 : 2;
    const pw = solarId === 'high-eff-gimbal' ? 1.15 : 0.78;
    const ph = solarId === 'high-eff-gimbal' ? 0.96 : 0.64;
    [-1, 1].forEach((dir) => {
      const wing = new THREE.Group();
      addPart(wing, new THREE.CylinderGeometry(0.04, 0.04, 0.48, 12), mats.alloy, [dir * 0.24, 0, 0], [0, 0, Math.PI / 2]);
      addPart(wing, new THREE.BoxGeometry(0.12, 0.14, 0.14), mats.rail, [dir * 0.08, 0, 0]);
      const segs = [];
      for (let p = 0; p < panels; p += 1) {
        const seg = new THREE.Group();
        addPart(seg, new THREE.BoxGeometry(pw, 0.04, ph), mats.solar, [0, 0, 0]);
        addPart(seg, new THREE.BoxGeometry(pw + 0.03, 0.025, ph + 0.03), mats.rail, [0, -0.022, 0]);
        wing.add(seg);
        segs.push({ seg, cxFull: dir * (0.5 + p * (pw + 0.06) + pw * 0.5), cxStowed: dir * (0.28 + p * 0.05) });
      }
      regAnim(wing, [dir * dims.halfW, 0.08, 0], [dir * 1.1, 0, 0]);
      solarWrap.add(wing);
      deployHooks.push((t) => {
        wing.rotation.z = dir * Math.PI * 0.485 * (1 - t);
        segs.forEach(({ seg, cxFull, cxStowed }) => {
          seg.position.x = THREE.MathUtils.lerp(cxStowed, cxFull, t);
          seg.scale.x = 0.52 + 0.48 * t;
        });
      });
    });
  }
  root.add(solarWrap);

  // 3. Science Payload Deck (+Y)
  const payloadGroup = new THREE.Group();
  const instIds = missionState.instrumentIds || [];
  instIds.forEach((instId, idx) => {
    const inst = find(CATALOG.space.instruments, instId);
    if (!inst) return;
    const pod = new THREE.Group();
    pod.position.set(instIds.length === 1 ? 0 : (idx - (instIds.length - 1) / 2) * 0.7, 0, 0);
    if (instId === 'ir-bolometer' || instId === 'cryo-ir-mapper') {
      const s = instId === 'cryo-ir-mapper' ? 1.42 : 0.88;
      addPart(pod, new THREE.CylinderGeometry(0.24 * s, 0.27 * s, 0.62 * s, 24), mats.white, [0, 0.31 * s, 0]);
      addPart(pod, new THREE.CylinderGeometry(0.26 * s, 0.24 * s, 0.16 * s, 24, 1, true), mats.rail, [0, 0.66 * s, 0]);
      addPart(pod, new THREE.TorusGeometry(0.21 * s, 0.025 * s, 8, 24), mats.alloy, [0, 0.61 * s, 0], [Math.PI / 2, 0, 0]);
      addPart(pod, new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 0.05 * s, 24), mats.lens, [0, 0.59 * s, 0]);
    } else if (instId === 'arctic-multispec' || instId === 'oci-hyperspec') {
      const s = instId === 'oci-hyperspec' ? 1.38 : 0.84;
      addPart(pod, new THREE.BoxGeometry(0.48 * s, 0.36 * s, 0.44 * s), mats.white, [0, 0.18 * s, 0]);
      addPart(pod, new THREE.CylinderGeometry(0.12 * s, 0.14 * s, 0.18 * s, 18), mats.rail, [0, 0.24 * s, 0.24 * s], [Math.PI / 2, 0, 0]);
      addPart(pod, new THREE.CylinderGeometry(0.095 * s, 0.095 * s, 0.04 * s, 18), mats.lens, [0, 0.24 * s, 0.32 * s], [Math.PI / 2, 0, 0]);
    } else if (instId === 'sar-altimeter') {
      addPart(pod, new THREE.CylinderGeometry(0.036, 0.036, 0.48, 12), mats.alloy, [0, 0.24, 0]);
      const paddle = new THREE.Group();
      paddle.position.set(0, 0.48, 0);
      addPart(paddle, new THREE.BoxGeometry(0.68, 0.06, 0.34), mats.gold, [0, 0, 0]);
      addPart(paddle, new THREE.BoxGeometry(0.62, 0.02, 0.06), mats.rail, [0, 0.04, 0.08]);
      addPart(paddle, new THREE.BoxGeometry(0.62, 0.02, 0.06), mats.rail, [0, 0.04, -0.08]);
      addPart(paddle, new THREE.ConeGeometry(0.075, 0.14, 14), mats.bronze, [0, 0.11, 0], [Math.PI, 0, 0]);
      pod.add(paddle);
      deployHooks.push((t) => { paddle.rotation.z = -Math.PI * 0.44 * (1 - t); });
    } else {
      addPart(pod, new THREE.BoxGeometry(0.42, 0.16, 0.32), mats.gold, [0, 0.1, 0]);
      addPart(pod, new THREE.CylinderGeometry(0.07, 0.07, 0.46, 14), mats.alloy, [-0.1, 0.34, 0]);
      addPart(pod, new THREE.CylinderGeometry(0.07, 0.07, 0.46, 14), mats.alloy, [0.1, 0.34, 0]);
      addPart(pod, new THREE.CylinderGeometry(0.055, 0.055, 0.06, 12), mats.lens, [0, 0.21, 0.14], [Math.PI / 2, 0, 0]);
    }
    if (showWarnings && (inst.band !== missionState.wavelengthBand || (busMeta && !inst.classes.includes(busMeta.busClass)))) {
      pulseMeshes.push(addPart(pod, new THREE.BoxGeometry(0.68, 0.74, 0.68), mats.warn.clone(), [0, 0.37, 0]));
    }
    payloadGroup.add(pod);
  });
  regAnim(payloadGroup, [0, dims.halfH + 0.02, 0], [0, 1.05, 0]);
  root.add(payloadGroup);

  // 4. Ground Comms Array (+Y deck)
  const commsGroup = new THREE.Group();
  if (missionState.transceiverId === 'uhf') {
    const whips = [];
    [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].forEach(([x, z]) => {
      const m = addPart(commsGroup, new THREE.CylinderGeometry(0.014, 0.014, 0.85, 8), mats.alloy, [x, 0.32, z], [z * 1.4, 0, -x * 1.4]);
      whips.push({ m, x, z });
    });
    deployHooks.push((t) => {
      const splay = 0.15 + 1.25 * t;
      whips.forEach(({ m, x, z }) => { m.rotation.set(z * splay, 0, -x * splay); });
    });
  } else if (missionState.transceiverId === 'sx-band') {
    addPart(commsGroup, new THREE.BoxGeometry(0.38, 0.06, 0.38), mats.white, [0, 0.03, 0]);
    addPart(commsGroup, new THREE.ConeGeometry(0.12, 0.24, 16), mats.gold, [0, 0.17, 0]);
  } else {
    const dishHead = new THREE.Group();
    addPart(dishHead, new THREE.CylinderGeometry(0.038, 0.045, 0.36, 12), mats.alloy, [0, 0.18, 0]);
    addPart(dishHead, new THREE.SphereGeometry(0.56, 28, 14, 0, Math.PI * 2, 2.12, 0.98), mats.dish, [0, 0.78, 0], [Math.PI, 0, 0]);
    for (let r = 0; r < 6; r += 1) {
      addPart(dishHead, new THREE.BoxGeometry(0.95, 0.015, 0.015), mats.alloy, [0, 0.36, 0], [0, (r * Math.PI) / 6, 0]);
    }
    for (let s = 0; s < 3; s += 1) {
      const a = (s * Math.PI * 2) / 3;
      addPart(dishHead, new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), mats.alloy, [Math.cos(a) * 0.22, 0.46, Math.sin(a) * 0.22], [Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55]);
    }
    addPart(dishHead, new THREE.SphereGeometry(0.045, 12, 10), mats.hdrCyan, [0, 0.64, 0]);
    commsGroup.add(dishHead);
    deployHooks.push((t) => {
      dishHead.rotation.x = -0.52 * (1 - t);
      dishHead.scale.setScalar(0.66 + 0.34 * t);
    });
  }
  regAnim(commsGroup, [0, dims.halfH + 0.05, dims.halfD * 0.55], [0, 1.45, 0.72]);
  root.add(commsGroup);

  // 5. Battery Pack Module (mounted on aft/lower bus wall)
  const battGroup = new THREE.Group();
  if (missionState.batteryId === 'rad-hard-pack') {
    addPart(battGroup, new THREE.BoxGeometry(dims.halfW * 0.82, 0.36, 0.16), mats.gold, [0, 0, 0]);
    for (let f = -2; f <= 2; f += 1) {
      addPart(battGroup, new THREE.BoxGeometry(0.04, 0.38, 0.19), mats.rail, [f * dims.halfW * 0.14, 0, 0]);
    }
  } else if (missionState.batteryId === 'li-ion-dual') {
    [-0.14, 0.14].forEach((bx) => addPart(battGroup, new THREE.BoxGeometry(0.22, 0.32, 0.12), mats.batt, [bx, 0, 0]));
    addPart(battGroup, new THREE.BoxGeometry(0.46, 0.05, 0.14), mats.bronze, [0, 0.17, 0]);
  } else {
    addPart(battGroup, new THREE.BoxGeometry(0.26, 0.22, 0.09), mats.batt, [0, 0, 0]);
    addPart(battGroup, new THREE.BoxGeometry(0.22, 0.04, 0.1), mats.alloy, [0, 0.11, 0]);
  }
  regAnim(battGroup, [0, -dims.halfH * 0.25, -dims.halfD - 0.05], [0, -0.3, -0.85]);
  root.add(battGroup);

  // 6. Propulsion + Thermal Louvers + Dual Star Trackers (-Y / +Z)
  const propGroup = new THREE.Group();
  (missionState.busId === 'flagship-bus' ? [-0.36, 0.36] : [0]).forEach((nx) => {
    addPart(propGroup, new THREE.CylinderGeometry(0.1, 0.24, 0.36, 20), mats.rail, [nx, -0.18, 0]);
    addPart(propGroup, new THREE.TorusGeometry(0.22, 0.018, 8, 20), mats.bronze, [nx, -0.34, 0], [Math.PI / 2, 0, 0]);
  });

  if (missionState.thermalId === 'cryocooler-st') {
    addPart(propGroup, new THREE.BoxGeometry(dims.halfW * 0.96, 0.44, 0.08), mats.white, [0, 0.26, -dims.halfD - 0.06]);
    addPart(propGroup, new THREE.CylinderGeometry(0.11, 0.11, 0.36, 16), mats.gold, [dims.halfW * 0.56, dims.halfH + 0.14, -dims.halfD * 0.55]);
    addPart(propGroup, new THREE.TorusGeometry(0.12, 0.02, 8, 16), mats.bronze, [dims.halfW * 0.56, dims.halfH + 0.26, -dims.halfD * 0.55], [Math.PI / 2, 0, 0]);
  } else if (missionState.thermalId === 'rw-louver') {
    addPart(propGroup, new THREE.BoxGeometry(dims.halfW * 0.92, 0.42, 0.06), mats.rail, [0, 0.25, -dims.halfD - 0.05]);
    for (let l = -1; l <= 1; l += 1) {
      addPart(propGroup, new THREE.BoxGeometry(dims.halfW * 0.86, 0.07, 0.04), mats.white, [0, 0.25 + l * 0.12, -dims.halfD - 0.08], [0.35, 0, 0]);
    }
  } else {
    addPart(propGroup, new THREE.BoxGeometry(dims.halfW * 0.86, 0.36, 0.05), mats.white, [0, 0.24, -dims.halfD - 0.05]);
    addPart(propGroup, new THREE.CylinderGeometry(0.02, 0.02, dims.halfW * 0.9, 8), mats.bronze, [0, 0.44, -dims.halfD - 0.06], [0, 0, Math.PI / 2]);
  }

  const stSize = missionState.thermalId === 'cryocooler-st' ? 1.45 : 1.0;
  [-1, 1].forEach((sx) => {
    addPart(propGroup, new THREE.ConeGeometry(0.085 * stSize, 0.24 * stSize, 14), mats.rail, [sx * dims.halfW * 0.52, dims.halfH * 1.55, dims.halfD + 0.08], [Math.PI / 3, sx * 0.25, 0]);
    addPart(propGroup, new THREE.CylinderGeometry(0.045 * stSize, 0.045 * stSize, 0.04 * stSize, 12), mats.lens, [sx * dims.halfW * 0.52, dims.halfH * 1.55, dims.halfD + 0.08], [Math.PI / 3, sx * 0.25, 0]);
  });
  regAnim(propGroup, [0, -dims.halfH - 0.02, 0], [0, -0.95, 0]);
  root.add(propGroup);

  const setDeployProgress = (t) => {
    const c = THREE.MathUtils.clamp(t, 0, 1);
    deployHooks.forEach((fn) => fn(c));
  };
  setDeployProgress(deployProgress);

  const applyExplode = (alpha) => {
    animParts.forEach((p) => p.obj.position.lerpVectors(p.base, p.exp, alpha));
  };

  const setExploded = (amount, immediate = false) => {
    explodeTarget = typeof amount === 'boolean' ? (amount ? 1 : 0) : THREE.MathUtils.clamp(amount, 0, 1);
    if (immediate) {
      explodeCur = explodeTarget;
      applyExplode(explodeCur);
    }
  };

  const update = (dt = 0.016, elapsed = 0) => {
    if (Math.abs(explodeCur - explodeTarget) > 0.0005) {
      explodeCur = THREE.MathUtils.lerp(explodeCur, explodeTarget, Math.min(1, dt * 7));
      applyExplode(explodeCur);
    }
    pulseMeshes.forEach((m) => { m.material.opacity = 0.4 + 0.45 * Math.abs(Math.sin(elapsed * 4)); });
  };

  const dispose = () => {
    root.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => {
          ['map', 'bumpMap', 'emissiveMap'].forEach((k) => {
            if (m[k] && !isCachedCraftTexture(m[k])) m[k].dispose();
          });
          m.dispose();
        });
      }
    });
  };

  return {
    group: root,
    parts: { bus: busGroup, solar: solarWrap, payload: payloadGroup, comms: commsGroup, thermal: propGroup, battery: battGroup },
    dims,
    meshCount,
    pulseMeshes,
    setExploded,
    setDeployProgress,
    update,
    dispose
  };
}
