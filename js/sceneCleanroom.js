import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildSpacecraftModel, isCachedCraftTexture } from './spacecraftModel.js';

let renderer = null, scene = null, camera = null, controls = null, resizeObserver = null, envRT = null;
let rafId = 0, craftRoot = null, craftModel = null, autoRotate = true, exploded = false, meshCount = 0;
let popTarget = null, popProg = 1, camGoal = null;
const clock = new THREE.Clock();

// Display stand that rises from the floor to meet the craft's underside,
// plus camera framing sized to the craft's bounding sphere.
const FLOOR_Y = -1.95;
const STAND_RADIUS = 1.45;
const CAM_DIR = new THREE.Vector3(4.6, 2.7, 5.1).normalize();
const framing = { target: new THREE.Vector3(0, 0.2, 0), dist: 7.45 };
let stand = null, nadirLightRef = null, lastBusId = null;
const cleanTexCache = { floorMap: null, bgMap: null };

function getCleanroomMaps() {
  if (!cleanTexCache.floorMap) {
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
    cleanTexCache.floorMap = new THREE.CanvasTexture(fc);
    cleanTexCache.floorMap.colorSpace = THREE.SRGBColorSpace;
  }

  if (!cleanTexCache.bgMap) {
    const bc = document.createElement('canvas'); bc.width = 512; bc.height = 512;
    const bctx = bc.getContext('2d');
    const bg = bctx.createRadialGradient(256, 230, 30, 256, 256, 360);
    bg.addColorStop(0, '#1a2740'); bg.addColorStop(0.55, '#0f182a'); bg.addColorStop(1, '#090e18');
    bctx.fillStyle = bg; bctx.fillRect(0, 0, 512, 512);
    cleanTexCache.bgMap = new THREE.CanvasTexture(bc);
    cleanTexCache.bgMap.colorSpace = THREE.SRGBColorSpace;
  }
  return cleanTexCache;
}

function disposeSceneGroup(group) {
  if (!group) return;
  const localSet = new Set(Object.values(cleanTexCache).filter(Boolean));
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => {
        ['map', 'bumpMap', 'emissiveMap'].forEach((k) => {
          if (m[k] && !localSet.has(m[k]) && !isCachedCraftTexture(m[k])) m[k].dispose();
        });
        m.dispose();
      });
    }
  });
}

export function focusSubsystem(tag) {
  if (!camera || !controls) return;
  const presets = {
    payload: [[2.9, 2.7, 3.2], [0, 0.95, 0]],
    solar: [[5.8, 2.1, 4.6], [0, 0.1, 0]],
    comms: [[2.8, 2.5, 3.6], [0, 1.05, 0.3]],
    thermal: [[3.6, 1.1, 4.2], [0, -0.45, 0]],
    battery: [[3.2, 1.3, -4.1], [0, -0.2, 0]],
    bus: [[4.5, 2.6, 4.9], [0, 0.15, 0]]
  };
  const [p, t] = presets[tag] || presets.bus;
  camGoal = { pos: new THREE.Vector3(...p), target: new THREE.Vector3(...t) };
}

function framedCameraPos() {
  return framing.target.clone().addScaledVector(CAM_DIR, framing.dist);
}

// Measure the craft, raise the stand so its top sits just under the craft,
// shrink the stand for tiny buses, and size the camera distance to fit.
function fitStandAndFraming() {
  if (!craftModel || !stand) return;
  craftModel.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(craftModel.group);
  if (box.isEmpty()) return;

  const topY = Math.max(FLOOR_Y + 0.14, box.min.y - 0.03);
  const colH = topY - FLOOR_Y;
  const halfW = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.5;
  const radial = THREE.MathUtils.clamp(halfW * 1.15, 0.7, STAND_RADIUS) / STAND_RADIUS;
  stand.column.scale.set(radial, colH, radial);
  stand.column.position.y = FLOOR_Y + colH * 0.5;
  stand.top.scale.set(radial, radial, 1);
  stand.top.position.y = topY;
  stand.ring.scale.set(radial, radial, 1);
  stand.ring.position.y = topY + 0.005;
  if (nadirLightRef) nadirLightRef.position.y = topY + 0.02;

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = Math.max(0.5, sphere.radius);
  const fovHalf = THREE.MathUtils.degToRad((camera?.fov || 42) * 0.5);
  const minD = (controls?.minDistance ?? 2.2) + 0.3;
  const maxD = (controls?.maxDistance ?? 12) - 0.5;
  // ~2x the "just fits" distance: craft fills roughly half the view height.
  framing.dist = THREE.MathUtils.clamp((r / Math.sin(fovHalf)) * 2.05, minD, maxD);
  // Aim a little below centre so the glowing stand ring stays in frame.
  framing.target.set(0, sphere.center.y - r * 0.18, 0);
}

export function updateSpacecraft(missionState, focusTag = null) {
  if (!scene || !craftRoot) return meshCount;
  if (craftModel) {
    craftRoot.remove(craftModel.group);
    craftModel.dispose();
    craftModel = null;
  }
  craftModel = buildSpacecraftModel(missionState, { showWarnings: true, deployProgress: 1, envMapIntensity: 1.0 });
  craftModel.setExploded(exploded, !focusTag);
  craftRoot.add(craftModel.group);
  meshCount = craftModel.meshCount;

  // Measure before any pop-in scaling so the stand matches the final size.
  fitStandAndFraming();
  const busChanged = lastBusId !== null && lastBusId !== missionState.busId;
  lastBusId = missionState.busId;
  if (busChanged && !focusTag) camGoal = { pos: framedCameraPos(), target: framing.target.clone() };

  if (focusTag) {
    popTarget = craftModel.parts[focusTag] || craftModel.group;
    popProg = 0;
    popTarget.scale.setScalar(0.2);
    focusSubsystem(focusTag);
  }
  return meshCount;
}

function animate() {
  rafId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  // Craft rests on its stand (turntable spin only, no floating bob).
  if (craftRoot && autoRotate) craftRoot.rotation.y += dt * 0.3;
  if (popTarget && popProg < 1) {
    popProg = Math.min(1, popProg + dt * 4.2);
    popTarget.scale.setScalar(popProg >= 1 ? 1 : 0.2 + 0.8 * popProg + Math.sin(popProg * Math.PI) * 0.1);
  }
  if (camGoal && camera && controls) {
    camera.position.lerp(camGoal.pos, Math.min(1, dt * 4.5));
    controls.target.lerp(camGoal.target, Math.min(1, dt * 5));
    if (camera.position.distanceTo(camGoal.pos) < 0.08) camGoal = null;
  }
  craftModel?.update(dt, t);
  controls.update();
  renderer.render(scene, camera);
}

export const setAutoRotate = (v) => { autoRotate = Boolean(v); };
export const setExploded = (v) => { exploded = Boolean(v); craftModel?.setExploded(exploded); fitStandAndFraming(); };
export const getMeshCount = () => meshCount;
export function resetCamera() {
  if (!camera || !controls) return;
  camGoal = null;
  camera.position.copy(framedCameraPos());
  controls.target.copy(framing.target);
  controls.update();
}

export function mountCleanroom(container, missionState) {
  unmountCleanroom();
  const w = Math.max(container.clientWidth, 320), h = Math.max(container.clientHeight, 320);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x090e18, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const tex = getCleanroomMaps();
  scene = new THREE.Scene();
  scene.background = tex.bgMap;
  scene.fog = new THREE.FogExp2(0x090e18, 0.014);

  const pmrem = new THREE.PMREMGenerator(renderer);
  envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  pmrem.dispose();

  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 2.2, maxDistance: 12, maxPolarAngle: Math.PI * 0.85 });
  controls.addEventListener('start', () => { camGoal = null; });
  resetCamera();

  // 4-point cleanroom studio lighting + hemisphere ambient wrap + soft shadows
  scene.add(new THREE.HemisphereLight(0xddeeff, 0x1e293b, 0.75));
  const keyLight = new THREE.DirectionalLight(0xfff6e8, 2.4);
  keyLight.position.set(4.5, 7.5, 5.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 22;
  keyLight.shadow.camera.left = -4.5;
  keyLight.shadow.camera.right = 4.5;
  keyLight.shadow.camera.top = 4.5;
  keyLight.shadow.camera.bottom = -4.5;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x9ecbff, 1.3);
  fillLight.position.set(-6, 3.5, 4);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x66d9ff, 1.6);
  rimLight.position.set(-2, 5, -6);
  scene.add(rimLight);

  const nadirLight = new THREE.PointLight(0xdbeeff, 1.2, 12);
  nadirLight.position.set(0, -1.35, 0);
  scene.add(nadirLight);
  nadirLightRef = nadirLight;

  // Cleanroom bay ribs & matte dark-slate floor + illuminated open-bottom turntable pedestal
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x162238, metalness: 0.55, roughness: 0.5, envMapIntensity: 0.7 });
  for (let i = 0; i < 4; i += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(8.85, 0.04, 8, 64, Math.PI), ribMat);
    rib.position.y = -1.95;
    rib.rotation.y = (i * Math.PI) / 4;
    scene.add(rib);
  }

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64),
    new THREE.MeshStandardMaterial({ map: tex.floorMap, roughness: 0.82, metalness: 0.15, envMapIntensity: 0.6 })
  );
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.95; floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(14, 28, 0x284b7a, 0x132542);
  grid.position.y = -1.938;
  scene.add(grid);

  // Display stand: unit-height tapered column scaled in Y to reach the craft,
  // capped by a lit top disc and the cyan halo ring (see fitStandAndFraming).
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x1e2b45, metalness: 0.5, roughness: 0.4, envMapIntensity: 1.1 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(STAND_RADIUS, STAND_RADIUS * 1.12, 1, 48, 1, true), pedMat);
  ped.position.y = -1.87; ped.receiveShadow = true; ped.castShadow = true; scene.add(ped);

  const pedTop = new THREE.Mesh(new THREE.CircleGeometry(STAND_RADIUS, 48), pedMat);
  pedTop.rotation.x = -Math.PI / 2; pedTop.position.y = -1.81; pedTop.receiveShadow = true; scene.add(pedTop);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(STAND_RADIUS + 0.07, 0.026, 12, 64),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.45 })
  );
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.805; scene.add(ring);
  stand = { column: ped, top: pedTop, ring };

  craftRoot = new THREE.Group();
  scene.add(craftRoot);
  lastBusId = null;
  updateSpacecraft(missionState);
  resetCamera();

  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !container) return;
    const nw = Math.max(container.clientWidth, 1), nh = Math.max(container.clientHeight, 1);
    camera.aspect = nw / nh; camera.updateProjectionMatrix();
    renderer.setSize(nw, nh, false);
  });
  resizeObserver.observe(container);
  clock.start();
  animate();
  return meshCount;
}

export function unmountCleanroom() {
  if (rafId) cancelAnimationFrame(rafId); rafId = 0;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (controls) { controls.dispose(); controls = null; }
  if (envRT) { envRT.dispose(); envRT = null; }
  if (craftModel) { craftModel.dispose(); craftModel = null; }
  if (scene) { disposeSceneGroup(scene); scene = null; }
  if (renderer) { renderer.domElement?.remove(); renderer.dispose(); renderer = null; }
  craftRoot = null; popTarget = null; camGoal = null; meshCount = 0;
  stand = null; nadirLightRef = null; lastBusId = null;
}
