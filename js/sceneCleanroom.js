import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CATALOG } from './catalog.js';

const find = (arr, id) => arr.find((x) => x.id === id) || null;
let renderer = null, scene = null, camera = null, controls = null, resizeObserver = null;
let rafId = 0, craftRoot = null, autoRotate = true, exploded = false, meshCount = 0;
let pulseMeshes = [], animParts = [], subGroups = {}, popTarget = null, popProg = 1, camGoal = null;
const clock = new THREE.Clock();

function disposeGroup(group) {
  if (!group) return;
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
  });
}

function addPart(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  parent.add(m);
  meshCount += 1;
  return m;
}

function regAnim(obj, basePos, offset) {
  obj.position.set(...basePos);
  const base = new THREE.Vector3(...basePos);
  animParts.push({ obj, base, exp: base.clone().add(new THREE.Vector3(...offset)) });
}

function makeMats() {
  const std = (color, metalness, roughness, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  return {
    gold: std(0xd49b2a, 0.82, 0.28), rail: std(0x161b24, 0.75, 0.35),
    alloy: std(0x94a3b8, 0.85, 0.25), white: std(0xe2e8f0, 0.2, 0.48),
    solar: std(0x0f2d6b, 0.65, 0.22, { emissive: 0x06163a, emissiveIntensity: 0.4 }),
    lens: std(0x38bdf8, 0.9, 0.1, { emissive: 0x0284c7, emissiveIntensity: 0.45 }),
    shield: std(0xc0cad8, 0.9, 0.22, { side: THREE.DoubleSide }),
    dish: std(0xf1f5f9, 0.35, 0.35, { side: THREE.DoubleSide }),
    warn: new THREE.MeshStandardMaterial({ color: 0xef4444, wireframe: true, transparent: true, opacity: 0.85 })
  };
}

function buildBus(parent, busId, mats) {
  if (busId === 'espa-smallsat') {
    addPart(parent, new THREE.CylinderGeometry(0.92, 0.92, 1.38, 8), mats.alloy);
    addPart(parent, new THREE.TorusGeometry(0.9, 0.055, 10, 32), mats.rail, [0, -0.68, 0], [Math.PI / 2, 0, 0]);
    return { halfW: 0.92, halfH: 0.7, halfD: 0.92 };
  }
  if (busId === 'flagship-bus') {
    addPart(parent, new THREE.CylinderGeometry(1.15, 1.28, 1.6, 6), mats.gold);
    addPart(parent, new THREE.CylinderGeometry(1.22, 1.22, 0.16, 6), mats.rail, [0, 0.72, 0]);
    for (let k = 0; k < 3; k += 1) {
      addPart(parent, new THREE.CylinderGeometry(1.75 + k * 0.22, 1.75 + k * 0.22, 0.025, 5), mats.shield, [0, -0.78 - k * 0.13, 0]);
    }
    return { halfW: 1.25, halfH: 0.82, halfD: 1.25 };
  }
  const dims = busId === '3u-cubesat' ? { halfW: 0.34, halfH: 0.72, halfD: 0.34 } : { halfW: 0.62, halfH: 0.72, halfD: 0.36 };
  addPart(parent, new THREE.BoxGeometry(dims.halfW * 1.88, dims.halfH * 1.9, dims.halfD * 1.88), mats.gold);
  const rx = dims.halfW * 0.94, rz = dims.halfD * 0.94;
  [[-rx, -rz], [rx, -rz], [-rx, rz], [rx, rz]].forEach(([x, z]) => addPart(parent, new THREE.BoxGeometry(0.08, dims.halfH * 2.04, 0.08), mats.rail, [x, 0, z]));
  addPart(parent, new THREE.BoxGeometry(dims.halfW * 2.02, 0.08, dims.halfD * 2.02), mats.rail, [0, dims.halfH, 0]);
  addPart(parent, new THREE.BoxGeometry(dims.halfW * 2.02, 0.08, dims.halfD * 2.02), mats.rail, [0, -dims.halfH, 0]);
  return dims;
}

function buildSolar(parent, solarId, dims, mats) {
  const wrap = new THREE.Group();
  if (solarId === 'body-mounted') {
    [-1, 1].forEach((dir) => {
      const wing = new THREE.Group();
      addPart(wing, new THREE.BoxGeometry(0.05, dims.halfH * 1.55, dims.halfD * 1.55), mats.solar);
      regAnim(wing, [dir * (dims.halfW + 0.04), 0, 0], [dir * 0.55, 0, 0]);
      wrap.add(wing);
    });
  } else {
    const panels = solarId === 'high-eff-gimbal' ? 3 : 2;
    const pw = solarId === 'high-eff-gimbal' ? 1.15 : 0.75, ph = solarId === 'high-eff-gimbal' ? 0.95 : 0.62;
    [-1, 1].forEach((dir) => {
      const wing = new THREE.Group();
      addPart(wing, new THREE.CylinderGeometry(0.035, 0.035, 0.45, 10), mats.alloy, [dir * 0.22, 0, 0], [0, 0, Math.PI / 2]);
      for (let p = 0; p < panels; p += 1) {
        const cx = dir * (0.48 + p * (pw + 0.06) + pw * 0.5);
        addPart(wing, new THREE.BoxGeometry(pw, 0.04, ph), mats.solar, [cx, 0, 0]);
        addPart(wing, new THREE.BoxGeometry(pw + 0.03, 0.025, ph + 0.03), mats.rail, [cx, -0.022, 0]);
      }
      regAnim(wing, [dir * dims.halfW, 0.08, 0], [dir * 0.95, 0, 0]);
      wrap.add(wing);
    });
  }
  parent.add(wrap);
  return wrap;
}

function buildPayloads(parent, state, bus, dims, mats) {
  const group = new THREE.Group();
  const ids = state.instrumentIds || [];
  ids.forEach((instId, idx) => {
    const inst = find(CATALOG.space.instruments, instId);
    if (!inst) return;
    const pod = new THREE.Group();
    pod.position.set(ids.length === 1 ? 0 : (idx - (ids.length - 1) / 2) * 0.68, 0, 0);
    if (instId === 'ir-bolometer' || instId === 'cryo-ir-mapper') {
      const s = instId === 'cryo-ir-mapper' ? 1.45 : 0.85;
      addPart(pod, new THREE.CylinderGeometry(0.22 * s, 0.26 * s, 0.62 * s, 20), mats.white, [0, 0.31 * s, 0]);
      addPart(pod, new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 0.08 * s, 20), mats.lens, [0, 0.6 * s, 0]);
    } else if (instId === 'arctic-multispec' || instId === 'oci-hyperspec') {
      const s = instId === 'oci-hyperspec' ? 1.4 : 0.82;
      addPart(pod, new THREE.BoxGeometry(0.48 * s, 0.36 * s, 0.44 * s), mats.white, [0, 0.18 * s, 0]);
      addPart(pod, new THREE.CylinderGeometry(0.11 * s, 0.13 * s, 0.16 * s, 16), mats.lens, [0, 0.24 * s, 0.24 * s], [Math.PI / 2, 0, 0]);
    } else {
      addPart(pod, new THREE.CylinderGeometry(0.03, 0.03, 0.55, 10), mats.alloy, [0, 0.27, 0]);
      addPart(pod, new THREE.BoxGeometry(0.46, 0.14, 0.34), mats.gold, [0, 0.55, 0]);
    }
    if (inst.band !== state.wavelengthBand || (bus && !inst.classes.includes(bus.busClass))) {
      pulseMeshes.push(addPart(pod, new THREE.BoxGeometry(0.65, 0.72, 0.65), mats.warn.clone(), [0, 0.36, 0]));
    }
    group.add(pod);
  });
  regAnim(group, [0, dims.halfH + 0.02, 0], [0, 0.95, 0]);
  parent.add(group);
  return group;
}

function buildCommsAndThermal(parent, state, dims, mats) {
  const comms = new THREE.Group();
  if (state.transceiverId === 'uhf') {
    [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].forEach(([x, z]) => {
      addPart(comms, new THREE.CylinderGeometry(0.015, 0.015, 0.82, 8), mats.alloy, [x, 0.32, z], [z * 1.4, 0, -x * 1.4]);
    });
  } else if (state.transceiverId === 'sx-band') {
    addPart(comms, new THREE.BoxGeometry(0.36, 0.06, 0.36), mats.white, [0, 0.03, 0]);
    addPart(comms, new THREE.ConeGeometry(0.11, 0.22, 16), mats.gold, [0, 0.16, 0]);
  } else {
    addPart(comms, new THREE.CylinderGeometry(0.035, 0.04, 0.35, 12), mats.alloy, [0, 0.17, 0]);
    addPart(comms, new THREE.SphereGeometry(0.55, 24, 12, 0, Math.PI * 2, 2.15, 0.95), mats.dish, [0, 0.78, 0], [Math.PI, 0, 0]);
    addPart(comms, new THREE.CylinderGeometry(0.03, 0.06, 0.24, 12), mats.gold, [0, 0.48, 0]);
  }
  regAnim(comms, [0, dims.halfH + 0.05, dims.halfD * 0.55], [0, 1.35, 0.65]);
  parent.add(comms);

  const prop = new THREE.Group();
  (state.busId === 'flagship-bus' ? [-0.35, 0.35] : [0]).forEach((nx) => {
    addPart(prop, new THREE.CylinderGeometry(0.1, 0.22, 0.34, 18), mats.rail, [nx, -0.18, 0]);
  });
  addPart(prop, new THREE.BoxGeometry(dims.halfW * 0.9, 0.42, 0.06), mats.white, [0, 0.25, -dims.halfD - 0.05]);
  const stSize = state.thermalId === 'cryocooler-st' ? 1.5 : 1.0;
  addPart(prop, new THREE.ConeGeometry(0.09 * stSize, 0.24 * stSize, 12), mats.rail, [-dims.halfW * 0.5, dims.halfH * 1.55, dims.halfD + 0.08], [Math.PI / 3, 0, 0]);
  regAnim(prop, [0, -dims.halfH - 0.02, 0], [0, -0.85, 0]);
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
  if (craftRoot) { if (autoRotate) craftRoot.rotation.y += dt * 0.32; craftRoot.position.y = Math.sin(t * 1.4) * 0.04; }
  if (popTarget && popProg < 1) {
    popProg = Math.min(1, popProg + dt * 4.2);
    popTarget.scale.setScalar(popProg >= 1 ? 1 : 0.2 + 0.8 * popProg + Math.sin(popProg * Math.PI) * 0.1);
  }
  if (camGoal && camera && controls) {
    camera.position.lerp(camGoal.pos, Math.min(1, dt * 4.5)); controls.target.lerp(camGoal.target, Math.min(1, dt * 5));
    if (camera.position.distanceTo(camGoal.pos) < 0.08) camGoal = null;
  }
  animParts.forEach((p) => p.obj.position.lerp(exploded ? p.exp : p.base, Math.min(1, dt * 7)));
  pulseMeshes.forEach((m) => { m.material.opacity = 0.4 + 0.45 * Math.abs(Math.sin(t * 4)); });
  controls.update(); renderer.render(scene, camera);
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
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 2.2, maxDistance: 12, maxPolarAngle: Math.PI * 0.48 });
  controls.addEventListener('start', () => { camGoal = null; });
  resetCamera();

  scene.add(new THREE.AmbientLight(0xdbeafe, 0.65));
  [[0xffffff, 2.3, 6, 8, 5], [0x38bdf8, 1.4, -6, 4, -5], [0xfbbf24, 0.65, 2, -3, 4]].forEach(([c, i, x, y, z]) => {
    const l = new THREE.DirectionalLight(c, i); l.position.set(x, y, z); scene.add(l);
  });
  const grid = new THREE.GridHelper(14, 28, 0x253452, 0x131d33); grid.position.y = -1.65; scene.add(grid);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.75, 0.14, 48), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.35 }));
  ped.position.y = -1.58; scene.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.025, 10, 64), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.7 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.51; scene.add(ring);

  craftRoot = new THREE.Group(); scene.add(craftRoot); updateSpacecraft(missionState);
  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !container) return;
    const nw = Math.max(container.clientWidth, 1), nh = Math.max(container.clientHeight, 1);
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh, false);
  });
  resizeObserver.observe(container); clock.start(); animate();
  return meshCount;
}

function unmountAllCleanup() {
  if (rafId) cancelAnimationFrame(rafId); rafId = 0;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (controls) { controls.dispose(); controls = null; }
  if (scene) { disposeGroup(scene); scene = null; }
  if (renderer) { renderer.domElement?.remove(); renderer.dispose(); renderer = null; }
  craftRoot = null; pulseMeshes = []; animParts = []; subGroups = {}; popTarget = null; camGoal = null; meshCount = 0;
}
export function unmountCleanroom() { unmountAllCleanup(); }
