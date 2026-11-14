import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CATALOG } from './catalog.js';
import { createBloomComposer, fbm2, hash2 } from './solarSystem.js';

const find = (arr, id) => arr.find((x) => x.id === id) || null;
let renderer = null, bloomComp = null, scene = null, camera = null, controls = null, resizeObserver = null;
let rafId = 0, craftRoot = null, motesPoints = null, autoRotate = true, exploded = false, meshCount = 0;
let pulseMeshes = [], animParts = [], subGroups = {}, popTarget = null, popProg = 1, camGoal = null;
const clock = new THREE.Clock();

const texCache = { kaptonBump: null, solarMap: null, floorMap: null, beamTex: null };

function getCleanroomTextures() {
  if (!texCache.kaptonBump) {
    const kc = document.createElement('canvas'); kc.width = 512; kc.height = 512;
    const kCtx = kc.getContext('2d'), img = kCtx.createImageData(512, 512), kd = img.data;
    for (let y = 0; y < 512; y += 1) {
      for (let x = 0; x < 512; x += 1) {
        const idx = (y * 512 + x) * 4;
        const c1 = fbm2(x * 0.045, y * 0.045, 4);
        const crease = Math.abs(Math.sin((x * 0.06 + c1 * 4.5)) * Math.cos((y * 0.06 - c1 * 3.8)));
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

  if (!texCache.floorMap) {
    const fc = document.createElement('canvas'); fc.width = 1024; fc.height = 1024;
    const fCtx = fc.getContext('2d');
    const rg = fCtx.createRadialGradient(512, 512, 40, 512, 512, 512);
    rg.addColorStop(0, '#0b1529'); rg.addColorStop(0.55, '#070d1b'); rg.addColorStop(1, '#03060e');
    fCtx.fillStyle = rg; fCtx.fillRect(0, 0, 1024, 1024);
    fCtx.strokeStyle = 'rgba(56,189,248,0.18)'; fCtx.lineWidth = 2;
    [150, 250, 360, 470].forEach((rad) => {
      fCtx.beginPath(); fCtx.arc(512, 512, rad, 0, Math.PI * 2); fCtx.stroke();
    });
    for (let a = 0; a < 36; a += 1) {
      const th = (a / 36) * Math.PI * 2;
      fCtx.beginPath();
      fCtx.moveTo(512 + Math.cos(th) * 150, 512 + Math.sin(th) * 150);
      fCtx.lineTo(512 + Math.cos(th) * 470, 512 + Math.sin(th) * 470);
      fCtx.strokeStyle = a % 3 === 0 ? 'rgba(56,189,248,0.16)' : 'rgba(56,189,248,0.06)';
      fCtx.stroke();
    }
    texCache.floorMap = new THREE.CanvasTexture(fc);
    texCache.floorMap.colorSpace = THREE.SRGBColorSpace;
  }

  if (!texCache.beamTex) {
    const bc = document.createElement('canvas'); bc.width = 32; bc.height = 128;
    const bCtx = bc.getContext('2d'), bg = bCtx.createLinearGradient(0, 0, 0, 128);
    bg.addColorStop(0, 'rgba(56,189,248,0.22)'); bg.addColorStop(0.6, 'rgba(56,189,248,0.07)'); bg.addColorStop(1, 'rgba(56,189,248,0)');
    bCtx.fillStyle = bg; bCtx.fillRect(0, 0, 32, 128);
    texCache.beamTex = new THREE.CanvasTexture(bc);
  }
  return texCache;
}

function disposeGroup(group) {
  if (!group) return;
  const cachedSet = new Set(Object.values(texCache).filter(Boolean));
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => {
        ['map', 'bumpMap', 'emissiveMap'].forEach((k) => { if (m[k] && !cachedSet.has(m[k])) m[k].dispose(); });
        m.dispose();
      });
    }
  });
}

function addPart(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.rotation.set(...rot);
  parent.add(m); meshCount += 1;
  return m;
}

function regAnim(obj, basePos, offset) {
  obj.position.set(...basePos);
  const base = new THREE.Vector3(...basePos);
  animParts.push({ obj, base, exp: base.clone().add(new THREE.Vector3(...offset)) });
}

function makeMats() {
  const tex = getCleanroomTextures();
  const std = (color, metalness, roughness, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  return {
    gold: std(0xeab308, 0.88, 0.26, { bumpMap: tex.kaptonBump, bumpScale: 0.032 }),
    rail: std(0x161b24, 0.78, 0.32),
    alloy: std(0x94a3b8, 0.86, 0.24),
    bronze: std(0xb45309, 0.88, 0.28),
    white: std(0xe2e8f0, 0.22, 0.45),
    solar: std(0x1e40af, 0.55, 0.2, { map: tex.solarMap, emissive: 0x091d4a, emissiveIntensity: 0.42 }),
    lens: std(0x38bdf8, 0.92, 0.08, { emissive: 0x0ea5e9, emissiveIntensity: 1.15 }),
    hdrCyan: new THREE.MeshBasicMaterial({ color: 0x7dd3fc }),
    shield: std(0xc0cad8, 0.9, 0.22, { side: THREE.DoubleSide }),
    dish: std(0xe2e8f0, 0.55, 0.3, { side: THREE.DoubleSide }),
    warn: new THREE.MeshStandardMaterial({ color: 0xef4444, wireframe: true, transparent: true, opacity: 0.85 })
  };
}

function buildReactionWheels(parent, mats) {
  const rwa = new THREE.Group();
  [[-0.14, 0.08, 0], [0.14, 0.08, 0], [0, -0.08, 0.14]].forEach(([x, y, z], i) => {
    addPart(rwa, new THREE.CylinderGeometry(0.11, 0.11, 0.07, 16), mats.alloy, [x, y, z], i === 2 ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]);
  });
  addPart(rwa, new THREE.BoxGeometry(0.24, 0.18, 0.22), mats.rail, [0, -0.08, -0.1]);
  regAnim(rwa, [0, 0, 0], [0, 0.1, 0.95]);
  parent.add(rwa);
}

function buildBus(parent, busId, mats) {
  buildReactionWheels(parent, mats);
  let dims;
  if (busId === 'espa-smallsat') {
    addPart(parent, new THREE.CylinderGeometry(0.92, 0.92, 1.38, 8), mats.alloy);
    addPart(parent, new THREE.CylinderGeometry(0.84, 0.84, 0.95, 8), mats.gold);
    addPart(parent, new THREE.TorusGeometry(0.9, 0.055, 10, 32), mats.rail, [0, -0.68, 0], [Math.PI / 2, 0, 0]);
    dims = { halfW: 0.92, halfH: 0.7, halfD: 0.92 };
  } else if (busId === 'flagship-bus') {
    addPart(parent, new THREE.CylinderGeometry(1.15, 1.28, 1.6, 6), mats.gold);
    addPart(parent, new THREE.CylinderGeometry(1.22, 1.22, 0.16, 6), mats.rail, [0, 0.72, 0]);
    for (let k = 0; k < 4; k += 1) {
      addPart(parent, new THREE.CylinderGeometry(1.75 + k * 0.22, 1.75 + k * 0.22, 0.025, 5), mats.shield, [0, -0.78 - k * 0.12, 0]);
    }
    dims = { halfW: 1.25, halfH: 0.82, halfD: 1.25 };
  } else {
    dims = busId === '3u-cubesat' ? { halfW: 0.34, halfH: 0.72, halfD: 0.34 } : { halfW: 0.62, halfH: 0.72, halfD: 0.36 };
    addPart(parent, new THREE.BoxGeometry(dims.halfW * 1.88, dims.halfH * 1.9, dims.halfD * 1.88), mats.gold);
    const rx = dims.halfW * 0.94, rz = dims.halfD * 0.94;
    [[-rx, -rz], [rx, -rz], [-rx, rz], [rx, rz]].forEach(([x, z]) => addPart(parent, new THREE.BoxGeometry(0.08, dims.halfH * 2.04, 0.08), mats.rail, [x, 0, z]));
    addPart(parent, new THREE.BoxGeometry(dims.halfW * 2.02, 0.08, dims.halfD * 2.02), mats.rail, [0, dims.halfH, 0]);
    addPart(parent, new THREE.BoxGeometry(dims.halfW * 2.02, 0.08, dims.halfD * 2.02), mats.rail, [0, -dims.halfH, 0]);
  }
  // RCS Thruster Quads on bus corners
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const cx = sx * dims.halfW * 0.86, cz = sz * dims.halfD * 0.86;
    addPart(parent, new THREE.BoxGeometry(0.08, 0.08, 0.08), mats.rail, [cx, dims.halfH * 0.86, cz]);
    addPart(parent, new THREE.ConeGeometry(0.032, 0.08, 8), mats.bronze, [cx + sx * 0.055, dims.halfH * 0.86, cz], [0, 0, -sx * Math.PI / 2]);
  });
  return dims;
}

function buildSolar(parent, solarId, dims, mats) {
  const wrap = new THREE.Group();
  if (solarId === 'body-mounted') {
    [-1, 1].forEach((dir) => {
      const wing = new THREE.Group();
      addPart(wing, new THREE.BoxGeometry(0.05, dims.halfH * 1.55, dims.halfD * 1.55), mats.solar);
      regAnim(wing, [dir * (dims.halfW + 0.04), 0, 0], [dir * 0.65, 0, 0]);
      wrap.add(wing);
    });
  } else {
    const panels = solarId === 'high-eff-gimbal' ? 3 : 2;
    const pw = solarId === 'high-eff-gimbal' ? 1.15 : 0.78, ph = solarId === 'high-eff-gimbal' ? 0.96 : 0.64;
    [-1, 1].forEach((dir) => {
      const wing = new THREE.Group();
      addPart(wing, new THREE.CylinderGeometry(0.04, 0.04, 0.48, 12), mats.alloy, [dir * 0.24, 0, 0], [0, 0, Math.PI / 2]);
      addPart(wing, new THREE.BoxGeometry(0.12, 0.14, 0.14), mats.rail, [dir * 0.08, 0, 0]);
      for (let p = 0; p < panels; p += 1) {
        const cx = dir * (0.5 + p * (pw + 0.06) + pw * 0.5);
        addPart(wing, new THREE.BoxGeometry(pw, 0.04, ph), mats.solar, [cx, 0, 0]);
        addPart(wing, new THREE.BoxGeometry(pw + 0.03, 0.025, ph + 0.03), mats.rail, [cx, -0.022, 0]);
      }
      regAnim(wing, [dir * dims.halfW, 0.08, 0], [dir * 1.1, 0, 0]);
      wrap.add(wing);
    });
  }
  parent.add(wrap);
  return wrap;
}

function buildPayloads(parent, state, bus, dims, mats) {
  const group = new THREE.Group(), ids = state.instrumentIds || [];
  ids.forEach((instId, idx) => {
    const inst = find(CATALOG.space.instruments, instId);
    if (!inst) return;
    const pod = new THREE.Group();
    pod.position.set(ids.length === 1 ? 0 : (idx - (ids.length - 1) / 2) * 0.7, 0, 0);
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
    } else {
      addPart(pod, new THREE.CylinderGeometry(0.032, 0.032, 0.55, 12), mats.alloy, [0, 0.27, 0]);
      addPart(pod, new THREE.BoxGeometry(0.46, 0.14, 0.34), mats.gold, [0, 0.55, 0]);
      addPart(pod, new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), mats.lens, [0.14, 0.64, 0]);
    }
    if (inst.band !== state.wavelengthBand || (bus && !inst.classes.includes(bus.busClass))) {
      pulseMeshes.push(addPart(pod, new THREE.BoxGeometry(0.68, 0.74, 0.68), mats.warn.clone(), [0, 0.37, 0]));
    }
    group.add(pod);
  });
  regAnim(group, [0, dims.halfH + 0.02, 0], [0, 1.05, 0]);
  parent.add(group);
  return group;
}

function buildCommsAndThermal(parent, state, dims, mats) {
  const comms = new THREE.Group();
  if (state.transceiverId === 'uhf') {
    [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].forEach(([x, z]) => {
      addPart(comms, new THREE.CylinderGeometry(0.014, 0.014, 0.85, 8), mats.alloy, [x, 0.32, z], [z * 1.4, 0, -x * 1.4]);
    });
  } else if (state.transceiverId === 'sx-band') {
    addPart(comms, new THREE.BoxGeometry(0.38, 0.06, 0.38), mats.white, [0, 0.03, 0]);
    addPart(comms, new THREE.ConeGeometry(0.12, 0.24, 16), mats.gold, [0, 0.17, 0]);
  } else {
    addPart(comms, new THREE.CylinderGeometry(0.038, 0.045, 0.36, 12), mats.alloy, [0, 0.18, 0]);
    addPart(comms, new THREE.SphereGeometry(0.56, 28, 14, 0, Math.PI * 2, 2.12, 0.98), mats.dish, [0, 0.78, 0], [Math.PI, 0, 0]);
    for (let r = 0; r < 6; r += 1) {
      addPart(comms, new THREE.BoxGeometry(0.95, 0.015, 0.015), mats.alloy, [0, 0.36, 0], [0, (r * Math.PI) / 6, 0]);
    }
    for (let s = 0; s < 3; s += 1) {
      const a = (s * Math.PI * 2) / 3;
      addPart(comms, new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), mats.alloy, [Math.cos(a) * 0.22, 0.46, Math.sin(a) * 0.22], [Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55]);
    }
    addPart(comms, new THREE.SphereGeometry(0.045, 12, 10), mats.hdrCyan, [0, 0.64, 0]);
  }
  regAnim(comms, [0, dims.halfH + 0.05, dims.halfD * 0.55], [0, 1.45, 0.72]);
  parent.add(comms);

  const prop = new THREE.Group();
  (state.busId === 'flagship-bus' ? [-0.36, 0.36] : [0]).forEach((nx) => {
    addPart(prop, new THREE.CylinderGeometry(0.1, 0.24, 0.36, 20), mats.rail, [nx, -0.18, 0]);
    addPart(prop, new THREE.TorusGeometry(0.22, 0.018, 8, 20), mats.bronze, [nx, -0.34, 0], [Math.PI / 2, 0, 0]);
  });
  addPart(prop, new THREE.BoxGeometry(dims.halfW * 0.92, 0.42, 0.06), mats.white, [0, 0.25, -dims.halfD - 0.05]);
  // Dual Star Trackers
  const stSize = state.thermalId === 'cryocooler-st' ? 1.45 : 1.0;
  [-1, 1].forEach((sx) => {
    addPart(prop, new THREE.ConeGeometry(0.085 * stSize, 0.24 * stSize, 14), mats.rail, [sx * dims.halfW * 0.52, dims.halfH * 1.55, dims.halfD + 0.08], [Math.PI / 3, sx * 0.25, 0]);
    addPart(prop, new THREE.CylinderGeometry(0.045 * stSize, 0.045 * stSize, 0.04 * stSize, 12), mats.lens, [sx * dims.halfW * 0.52, dims.halfH * 1.55, dims.halfD + 0.08], [Math.PI / 3, sx * 0.25, 0]);
  });
  regAnim(prop, [0, -dims.halfH - 0.02, 0], [0, -0.95, 0]);
  parent.add(prop);
  return { comms, thermal: prop };
}

export function focusSubsystem(tag) {
  if (!camera || !controls) return;
  const presets = {
    payload: [[2.9, 2.7, 3.2], [0, 0.95, 0]], solar: [[5.8, 2.1, 4.6], [0, 0.1, 0]],
    comms: [[2.8, 2.5, 3.6], [0, 1.05, 0.3]], thermal: [[3.6, 1.1, 4.2], [0, -0.45, 0]], bus: [[4.5, 2.6, 4.9], [0, 0.15, 0]]
  };
  const [p, t] = presets[tag] || presets.bus;
  camGoal = { pos: new THREE.Vector3(...p), target: new THREE.Vector3(...t) };
}

export function updateSpacecraft(missionState, focusTag = null) {
  if (!scene || !craftRoot) return meshCount;
  disposeGroup(craftRoot); craftRoot.clear();
  meshCount = 0; pulseMeshes = []; animParts = [];
  const bus = find(CATALOG.space.buses, missionState.busId), mats = makeMats(), busGroup = new THREE.Group();
  const dims = buildBus(busGroup, missionState.busId, mats);
  craftRoot.add(busGroup);
  const solar = buildSolar(craftRoot, missionState.solarId, dims, mats);
  const payload = buildPayloads(craftRoot, missionState, bus, dims, mats);
  const { comms, thermal } = buildCommsAndThermal(craftRoot, missionState, dims, mats);
  subGroups = { bus: busGroup, solar, payload, comms, thermal };
  if (focusTag) { popTarget = subGroups[focusTag] || craftRoot; popProg = 0; popTarget.scale.setScalar(0.2); focusSubsystem(focusTag); }
  return meshCount;
}

function animate() {
  rafId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (craftRoot) { if (autoRotate) craftRoot.rotation.y += dt * 0.3; craftRoot.position.y = Math.sin(t * 1.4) * 0.04; }
  if (motesPoints) {
    const pos = motesPoints.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      let y = pos.getY(i) + dt * (0.14 + (i % 5) * 0.03);
      if (y > 3.6) y = -1.4;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }
  if (popTarget && popProg < 1) {
    popProg = Math.min(1, popProg + dt * 4.2);
    popTarget.scale.setScalar(popProg >= 1 ? 1 : 0.2 + 0.8 * popProg + Math.sin(popProg * Math.PI) * 0.1);
  }
  if (camGoal && camera && controls) {
    camera.position.lerp(camGoal.pos, Math.min(1, dt * 4.5));
    controls.target.lerp(camGoal.target, Math.min(1, dt * 5));
    if (camera.position.distanceTo(camGoal.pos) < 0.08) camGoal = null;
  }
  animParts.forEach((p) => p.obj.position.lerp(exploded ? p.exp : p.base, Math.min(1, dt * 7)));
  pulseMeshes.forEach((m) => { m.material.opacity = 0.4 + 0.45 * Math.abs(Math.sin(t * 4)); });
  controls.update();
  bloomComp ? bloomComp.composer.render() : renderer.render(scene, camera);
}

export const setAutoRotate = (v) => { autoRotate = Boolean(v); };
export const setExploded = (v) => { exploded = Boolean(v); };
export const getMeshCount = () => meshCount;
export function resetCamera() {
  if (!camera || !controls) return;
  camGoal = null; camera.position.set(4.6, 2.9, 5.1); controls.target.set(0, 0.2, 0); controls.update();
}

export function mountCleanroom(container, missionState) {
  unmountCleanroom();
  const w = Math.max(container.clientWidth, 320), h = Math.max(container.clientHeight, 320);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x040914, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040914, 0.035);
  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 2.2, maxDistance: 12, maxPolarAngle: Math.PI * 0.48 });
  controls.addEventListener('start', () => { camGoal = null; });
  resetCamera();

  bloomComp = createBloomComposer(renderer, scene, camera, w, h, { strength: 0.54, radius: 0.42, threshold: 0.78 });

  scene.add(new THREE.AmbientLight(0xdbeafe, 0.72));
  [[0xffffff, 2.5, 6, 8, 5], [0x38bdf8, 1.5, -6, 4, -5], [0xfbbf24, 0.7, 2, -3, 4]].forEach(([c, i, x, y, z]) => {
    const l = new THREE.DirectionalLight(c, i); l.position.set(x, y, z); scene.add(l);
  });

  // Reflective dark epoxy cleanroom floor, turntable & overhead truss spotlights
  const tex = getCleanroomTextures();
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64),
    new THREE.MeshStandardMaterial({ map: tex.floorMap, roughness: 0.24, metalness: 0.65 })
  );
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.66;
  scene.add(floor);

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.78, 0.14, 48), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.28 }));
  ped.position.y = -1.58; scene.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.64, 0.028, 12, 64), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.51; scene.add(ring);

  const truss = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.06, 8, 48), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.35 }));
  truss.rotation.x = Math.PI / 2; truss.position.y = 3.7; scene.add(truss);
  [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((a) => {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(2.1, 5.1, 24, 1, true),
      new THREE.MeshBasicMaterial({ map: tex.beamTex, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.set(Math.cos(a) * 1.4, 1.15, Math.sin(a) * 1.4);
    beam.rotation.z = Math.cos(a) * 0.26;
    beam.rotation.x = -Math.sin(a) * 0.26;
    scene.add(beam);
  });

  // Floating cleanroom dust motes
  const mPos = new Float32Array(160 * 3);
  for (let i = 0; i < 160; i += 1) {
    mPos[i * 3] = (hash2(i, 1) - 0.5) * 6.5;
    mPos[i * 3 + 1] = -1.4 + hash2(i, 2) * 5.0;
    mPos[i * 3 + 2] = (hash2(i, 3) - 0.5) * 6.5;
  }
  const mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  motesPoints = new THREE.Points(mGeo, new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.035, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(motesPoints);

  craftRoot = new THREE.Group(); scene.add(craftRoot); updateSpacecraft(missionState);
  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !container) return;
    const nw = Math.max(container.clientWidth, 1), nh = Math.max(container.clientHeight, 1);
    camera.aspect = nw / nh; camera.updateProjectionMatrix();
    renderer.setSize(nw, nh, false);
    bloomComp?.setSize(nw, nh);
  });
  resizeObserver.observe(container); clock.start(); animate();
  return meshCount;
}

export function unmountCleanroom() {
  if (rafId) cancelAnimationFrame(rafId); rafId = 0;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (controls) { controls.dispose(); controls = null; }
  if (bloomComp) { bloomComp.dispose(); bloomComp = null; }
  if (scene) { disposeGroup(scene); scene = null; }
  if (renderer) { renderer.domElement?.remove(); renderer.dispose(); renderer = null; }
  craftRoot = motesPoints = null; pulseMeshes = []; animParts = []; subGroups = {}; popTarget = null; camGoal = null; meshCount = 0;
}
