import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { generateOrbitTrack, propagateOrbit } from './missionVizPropagator.js';
import { createBloomComposer, createSpaceEnvironment, fbm2, hash2, isCachedSpaceTexture } from './solarSystem.js';
import { buildSpacecraftModel, isCachedCraftTexture } from './spacecraftModel.js';
import { playDownlinkPing, playSafeMode, playWarning } from './sfx.js';

const EARTH_R = 2.0, KM_TO_SCENE = EARTH_R / 6371;
const SUN_DIR = new THREE.Vector3(1, 0, 0);
const STATIONS = [
  { id: 'inuvik', name: 'Arctic Polar Station', lat: 68.36, lon: -133.72 },
  { id: 'nsn', name: 'Global Near-Space Network', lat: 37.94, lon: -75.46 },
  { id: 'dsn', name: 'Deep-Space Dish Array', lat: 35.43, lon: -116.89 }
];

let renderer = null, bloomComp = null, scene = null, camera = null, controls = null, resizeObserver = null, spaceEnv = null, envRT = null;
let rafId = 0, earthGroup = null, earthMat = null, cloudMesh = null, atmoMat = null, earthshineLight = null;
let satMesh = null, satModel = null, satFitR = 0.25, targetReticle = null, thrusterGlow = null, beamLine = null, beamHalo = null, scanLine = null;
let orbitLine = null, ribbonMesh = null, lineColorAttr = null, ribbonColorAttr = null;
let gsNodes = [], gsPulseRing = null, orbitPts = [], velArrow = null, orbitEl = null, stateRef = null, evalRef = null, telemetryCb = null;
let simTime = 0, timeWarp = 25, cameraMode = 'full', watchCometNext = false, hasPrevSat = false, showcaseMode = false;
let stormUntil = 0, safeModeUntil = 0, beamBoostUntil = 0, scanUntil = 0, scanTarget = null, parallaxHandler = null;
let batterySoc = 84, bufferGb = 0.25, downlinkedGb = 0, lastHudMs = 0, fitDist = 7.2, sunElapsed = 0;
let missionScore = 0, downlinkCount = 0, flareMitigated = 0, asteroidsScanned = 0, lastAutoFlare = 14;
let inLineOfSight = false, activeStationName = 'None', hazardNow = false;

const parallaxTarget = new THREE.Vector2(), parallaxCur = new THREE.Vector2();

const camTween = {
  active: false, t: 0, dur: 0.78,
  fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(),
  fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3()
};

const clock = new THREE.Clock(), trackCenter = new THREE.Vector3(), prevSat = new THREE.Vector3();
const tmpSat = new THREE.Vector3(), tmpNext = new THREE.Vector3(), tmpGs = new THREE.Vector3(), tmpNorm = new THREE.Vector3();
const tmpY = new THREE.Vector3(), tmpZ = new THREE.Vector3(), tmpX = new THREE.Vector3(), satBasis = new THREE.Matrix4();
const earthTexCache = { ready: false, map: null, waterMaskMap: null, bumpMap: null, nightMap: null, cloudMap: null, umbraMap: null, reticleMap: null };

function latLonToVec(latDeg, lonDeg, r) {
  const lat = (latDeg * Math.PI) / 180, lon = (lonDeg * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lon));
}

function continentSignal(u, v) {
  const lon = u * Math.PI * 2;
  const ridge = fbm2(u * 6.5 + 1.3, v * 4.2 + 0.7, 5);
  const fine = fbm2(u * 18.0 + 4.1, v * 12.0 + 2.3, 3);
  const bias = Math.sin(lon * 2.0 - 0.6) * 0.08 + Math.cos(lon * 3.0 + 1.1) * 0.05;
  const latFactor = Math.cos((v - 0.5) * Math.PI);
  return ridge * 0.76 + fine * 0.24 + bias - (1 - latFactor) * 0.08;
}

function getEarthMaps() {
  if (earthTexCache.ready) return earthTexCache;
  const w = 1024, h = 512;
  const diffC = document.createElement('canvas'); diffC.width = w; diffC.height = h;
  const maskC = document.createElement('canvas'); maskC.width = w; maskC.height = h;
  const bmpC = document.createElement('canvas'); bmpC.width = w; bmpC.height = h;
  const cityC = document.createElement('canvas'); cityC.width = w; cityC.height = h;

  const dCtx = diffC.getContext('2d'), mCtx = maskC.getContext('2d'), bCtx = bmpC.getContext('2d'), ctCtx = cityC.getContext('2d');
  const dImg = dCtx.createImageData(w, h), mImg = mCtx.createImageData(w, h), bImg = bCtx.createImageData(w, h);
  const dd = dImg.data, md = mImg.data, bd = bImg.data;
  ctCtx.fillStyle = '#000'; ctCtx.fillRect(0, 0, w, h);

  const seaLevel = 0.54;
  for (let y = 0; y < h; y += 1) {
    const v = y / h, lat = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < w; x += 1) {
      const u = x / w, idx = (y * w + x) * 4;
      const elev = continentSignal(u, v);
      const moisture = fbm2(u * 9 + 7.2, v * 5 + 3.1, 3);
      const polarIce = lat > 0.87 - fbm2(u * 12, v * 6, 2) * 0.07;

      let r = 0, g = 0, b = 0, waterMask = 0, bump = 128;
      if (polarIce) {
        r = 238; g = 245; b = 252; waterMask = 35; bump = 165;
      } else if (elev < seaLevel) {
        const depth = Math.max(0, Math.min(1, (seaLevel - elev) / 0.25));
        const shelf = Math.max(0, 1 - (seaLevel - elev) / 0.045);
        r = Math.round(7 + (1 - depth) * 14 + shelf * 24);
        g = Math.round(32 + (1 - depth) * 48 + shelf * 78);
        b = Math.round(76 + (1 - depth) * 72 + shelf * 56);
        waterMask = 255;
        bump = 92;
      } else {
        const hNorm = Math.min(1, (elev - seaLevel) / 0.28);
        if (hNorm > 0.78) { r = 214; g = 220; b = 226; }
        else if (lat < 0.42 && moisture < 0.44) { r = 186 - hNorm * 35; g = 148 - hNorm * 30; b = 88 - hNorm * 20; }
        else { r = 42 + hNorm * 58; g = 104 + hNorm * 38; b = 56 + hNorm * 24; }
        waterMask = 0;
        bump = Math.min(255, Math.round(135 + hNorm * 115));

        if (lat < 0.72 && hNorm < 0.35 && hash2(x, y) > 0.992 && moisture > 0.42) {
          ctCtx.fillStyle = `rgba(255,216,128,${0.7 + hash2(y, x) * 0.3})`;
          ctCtx.fillRect(x, y, 2, 2);
        }
      }
      dd[idx] = r; dd[idx + 1] = g; dd[idx + 2] = b; dd[idx + 3] = 255;
      md[idx] = waterMask; md[idx + 1] = waterMask; md[idx + 2] = waterMask; md[idx + 3] = 255;
      bd[idx] = bump; bd[idx + 1] = bump; bd[idx + 2] = bump; bd[idx + 3] = 255;
    }
  }
  dCtx.putImageData(dImg, 0, 0); mCtx.putImageData(mImg, 0, 0); bCtx.putImageData(bImg, 0, 0);

  for (let i = 0; i < 65; i += 1) {
    const ux = hash2(i, 51), vy = 0.18 + hash2(i, 73) * 0.64;
    if (continentSignal(ux, vy) > seaLevel + 0.01) {
      const cx = ux * w, cy = vy * h, glow = ctCtx.createRadialGradient(cx, cy, 0.5, cx, cy, 8 + (i % 8));
      glow.addColorStop(0, 'rgba(255,214,120,0.95)'); glow.addColorStop(0.5, 'rgba(251,146,60,0.38)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctCtx.fillStyle = glow; ctCtx.beginPath(); ctCtx.arc(cx, cy, 8 + (i % 8), 0, Math.PI * 2); ctCtx.fill();
    }
  }

  const cldC = document.createElement('canvas'); cldC.width = w; cldC.height = h;
  const clCtx = cldC.getContext('2d'), clImg = clCtx.createImageData(w, h), cld = clImg.data;
  for (let y = 0; y < h; y += 1) {
    const v = y / h;
    for (let x = 0; x < w; x += 1) {
      const u = x / w, idx = (y * w + x) * 4;
      const swirl = fbm2(u * 10 + Math.sin(v * 8) * 0.35, v * 6, 4);
      const wisp = fbm2(u * 24 + swirl * 2.2, v * 14, 3);
      const cov = Math.max(0, (swirl * 0.6 + wisp * 0.4) - 0.52) / 0.48;
      cld[idx] = 244; cld[idx + 1] = 248; cld[idx + 2] = 255;
      cld[idx + 3] = Math.min(235, Math.round(cov * 290));
    }
  }
  clCtx.putImageData(clImg, 0, 0);

  const uCan = document.createElement('canvas'); uCan.width = 16; uCan.height = 128;
  const uCtx = uCan.getContext('2d'), ug = uCtx.createLinearGradient(0, 0, 0, 128);
  ug.addColorStop(0, 'rgba(2,6,23,0)'); ug.addColorStop(0.55, 'rgba(2,6,23,0.10)'); ug.addColorStop(1, 'rgba(2,6,23,0.22)');
  uCtx.fillStyle = ug; uCtx.fillRect(0, 0, 16, 128);

  earthTexCache.map = Object.assign(new THREE.CanvasTexture(diffC), { colorSpace: THREE.SRGBColorSpace });
  earthTexCache.waterMaskMap = new THREE.CanvasTexture(maskC);
  earthTexCache.bumpMap = new THREE.CanvasTexture(bmpC);
  earthTexCache.nightMap = Object.assign(new THREE.CanvasTexture(cityC), { colorSpace: THREE.SRGBColorSpace });
  earthTexCache.cloudMap = Object.assign(new THREE.CanvasTexture(cldC), { colorSpace: THREE.SRGBColorSpace });
  earthTexCache.umbraMap = new THREE.CanvasTexture(uCan);
  earthTexCache.ready = true;
  return earthTexCache;
}

function makeEarthTerminatorMaterial(maps) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDiffuse: { value: maps.map },
      uWaterMask: { value: maps.waterMaskMap },
      uBump: { value: maps.bumpMap },
      uNight: { value: maps.nightMap },
      uSunDir: { value: SUN_DIR }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform sampler2D uDiffuse;
      uniform sampler2D uWaterMask;
      uniform sampler2D uBump;
      uniform sampler2D uNight;
      uniform vec3 uSunDir;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 sunDir = normalize(uSunDir);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);

        float bx = texture2D(uBump, vUv + vec2(0.0012, 0.0)).r - texture2D(uBump, vUv - vec2(0.0012, 0.0)).r;
        float relief = 1.0 + bx * 0.65;

        vec3 albedo = texture2D(uDiffuse, vUv).rgb * relief;
        float waterMask = texture2D(uWaterMask, vUv).r;
        float sunDot = dot(n, sunDir);

        float dayLit = smoothstep(-0.08, 0.22, sunDot);
        float twilight = exp(-pow((sunDot - 0.02) * 7.2, 2.0));
        vec3 termScatter = vec3(1.0, 0.45, 0.14) * twilight * 0.26;

        vec3 halfVec = normalize(sunDir + viewDir);
        float spec = pow(max(0.0, dot(n, halfVec)), 54.0) * waterMask * smoothstep(-0.02, 0.24, sunDot);

        float nightMask = smoothstep(0.14, -0.22, sunDot);
        vec3 cities = texture2D(uNight, vUv).rgb * nightMask * 1.55;

        vec3 dayColor = albedo * (0.08 + 1.08 * dayLit) + termScatter + vec3(1.0, 0.96, 0.88) * spec * 1.05;
        gl_FragColor = vec4(dayColor + cities, 1.0);
      }
    `
  });
}

function makeAtmosphereRimMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uSunDir: { value: SUN_DIR } },
    vertexShader: `
      varying vec3 vWorldNormal; varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir; varying vec3 vWorldNormal; varying vec3 vWorldPos;
      void main() {
        vec3 n = normalize(vWorldNormal), viewDir = normalize(cameraPosition - vWorldPos);
        float d = dot(viewDir, n);
        float rim = smoothstep(0.0, 0.44, -d) * pow(clamp(1.0 + d, 0.0, 1.0), 2.1);
        float daySide = 0.22 + 0.78 * smoothstep(-0.35, 0.55, dot(n, normalize(uSunDir)));
        vec3 atmoColor = mix(vec3(0.08, 0.28, 0.75), vec3(0.32, 0.78, 1.0), daySide);
        gl_FragColor = vec4(atmoColor * rim * daySide * 1.15, rim * 0.85);
      }
    `,
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
}

function makeTagSprite(label, color) {
  const c = document.createElement('canvas'); c.width = 224; c.height = 56;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(4,10,22,0.88)'; ctx.fillRect(6, 6, 212, 44);
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(6, 6, 212, 44);
  ctx.fillStyle = color; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 112, 29);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(1.55, 0.39, 1);
  return sp;
}

function buildOrbitRibbon(points, halfWidth) {
  const n = points.length, pos = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 3), idx = [];
  const up = new THREE.Vector3(0, 1, 0), tang = new THREE.Vector3(), side = new THREE.Vector3();
  for (let i = 0; i < n; i += 1) {
    const p = points[i], next = points[(i + 1) % n];
    tang.subVectors(next, p).normalize();
    side.crossVectors(tang, up);
    if (side.lengthSq() < 0.001) side.set(1, 0, 0);
    side.normalize().multiplyScalar(halfWidth);

    const a = p.clone().add(side), b = p.clone().sub(side), v0 = i * 2, v1 = i * 2 + 1;
    pos[v0 * 3] = a.x; pos[v0 * 3 + 1] = a.y; pos[v0 * 3 + 2] = a.z;
    pos[v1 * 3] = b.x; pos[v1 * 3 + 1] = b.y; pos[v1 * 3 + 2] = b.z;
    if (i < n - 1) idx.push(v0, v1, (i + 1) * 2, v1, (i + 1) * 2 + 1, (i + 1) * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  ribbonColorAttr = new THREE.BufferAttribute(col, 3);
  geo.setAttribute('color', ribbonColorAttr);
  geo.setIndex(idx);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
  }));
}

function makeReticleSprite() {
  if (!earthTexCache.reticleMap) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(64, 14); ctx.lineTo(114, 64); ctx.lineTo(64, 114); ctx.lineTo(14, 64); ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(64, 64, 16, 0, Math.PI * 2); ctx.stroke();
    earthTexCache.reticleMap = Object.assign(new THREE.CanvasTexture(c), { colorSpace: THREE.SRGBColorSpace });
  }
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: earthTexCache.reticleMap, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
  }));
}

function buildOrbitSpacecraft(missionState, orbitScale, envInt = 0.55) {
  satModel = buildSpacecraftModel(missionState, { showWarnings: false, deployProgress: 1, envMapIntensity: envInt, castShadow: false, receiveShadow: false });
  satModel.group.scale.setScalar(orbitScale);
  satModel.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(satModel.group);
  const sphere = new THREE.Sphere(); box.getBoundingSphere(sphere);
  satFitR = Math.max(0.11, sphere.radius);

  const grp = new THREE.Group();
  grp.add(satModel.group);
  thrusterGlow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7dd3fc }));
  thrusterGlow.position.set(0, -(satModel.dims.halfH + 0.34), 0);
  satModel.group.add(thrusterGlow);

  if (!showcaseMode) {
    velArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), satFitR * 1.45, 0x38bdf8, satFitR * 0.28, satFitR * 0.14);
    scene.add(velArrow);
    targetReticle = makeReticleSprite();
    targetReticle.renderOrder = 10;
    scene.add(targetReticle);
  }
  return grp;
}

function getPresetPose(mode) {
  if (mode === 'full') {
    return {
      pos: new THREE.Vector3(trackCenter.x + fitDist * 0.56, trackCenter.y + fitDist * 0.42, trackCenter.z + fitDist * 0.74),
      target: trackCenter.clone()
    };
  }
  if (mode === 'chase' && satMesh) {
    const chaseDist = Math.max(0.44, satFitR * 3.0);
    const radial = tmpSat.length() > 0.1 ? tmpSat.clone().normalize() : new THREE.Vector3(1, 0.2, 1).normalize();
    const tang = tmpNext.clone().sub(tmpSat);
    const fwd = tang.lengthSq() > 1e-6 ? tang.normalize() : new THREE.Vector3(0, 0, 1);
    const side = new THREE.Vector3().crossVectors(radial, fwd).normalize();
    const camPos = tmpSat.clone()
      .addScaledVector(radial, chaseDist * 0.52)
      .addScaledVector(fwd, chaseDist * 0.58)
      .addScaledVector(side, chaseDist * 0.62);
    return { pos: camPos, target: tmpSat.clone() };
  }
  if (mode === 'asteroid' && spaceEnv) {
    const { target, comet } = spaceEnv.findNearestTarget(tmpSat);
    const focusObj = watchCometNext ? comet : target;
    watchCometNext = !watchCometNext;
    const offset = focusObj.isComet ? new THREE.Vector3(4.8, 2.8, 6.2) : new THREE.Vector3(2.4, 1.4, 3.2);
    return { pos: focusObj.mesh.position.clone().add(offset), target: focusObj.mesh.position.clone() };
  }
  return { pos: new THREE.Vector3(65, 210, 540), target: new THREE.Vector3(45, 0, -40) };
}

function startCameraTween(mode, immediate = false) {
  if (!camera || !controls) return;
  const pose = getPresetPose(mode);
  if (immediate) {
    camTween.active = false;
    camera.position.copy(pose.pos); controls.target.copy(pose.target); controls.update();
    return;
  }
  camTween.active = true; camTween.t = 0;
  camTween.fromPos.copy(camera.position); camTween.toPos.copy(pose.pos);
  camTween.fromTarget.copy(controls.target); camTween.toTarget.copy(pose.target);
}

function buildWorld(missionState, evaluation) {
  orbitEl = evaluation.orbitElements;
  const deep = Boolean(orbitEl.deepSpace);
  scene.add(new THREE.HemisphereLight(0x93c5fd, 0x1e293b, showcaseMode ? 0.72 : 0.55));
  const sunLight = new THREE.DirectionalLight(0xfff7e6, showcaseMode ? 3.1 : 2.8);
  sunLight.position.set(260, 0, 0);
  scene.add(sunLight);
  if (showcaseMode) {
    const heroFill = new THREE.DirectionalLight(0xfde68a, 1.35);
    heroFill.position.set(12, 8, 16);
    scene.add(heroFill);
  }
  earthshineLight = new THREE.DirectionalLight(0x5ec8ff, 0.95);
  earthshineLight.position.set(0, 0, 0);
  scene.add(earthshineLight, earthshineLight.target);

  // 1. Custom GLSL Day/Night Terminator Earth + 3D Clouds + Atmosphere + Umbra
  const maps = getEarthMaps();
  earthGroup = new THREE.Group();
  earthMat = makeEarthTerminatorMaterial(maps);
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 64, 40), earthMat));
  cloudMesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.018, 48, 32),
    new THREE.MeshStandardMaterial({ map: maps.cloudMap, transparent: true, opacity: 0.85, depthWrite: false, roughness: 0.9 })
  );
  earthGroup.add(cloudMesh);
  atmoMat = makeAtmosphereRimMaterial();
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.088, 48, 32), atmoMat));

  const umbra = new THREE.Mesh(
    new THREE.CylinderGeometry(EARTH_R * 0.65, EARTH_R * 0.96, 26, 32, 1, true),
    new THREE.MeshBasicMaterial({ map: maps.umbraMap, transparent: true, side: THREE.DoubleSide, depthWrite: false })
  );
  umbra.rotation.z = Math.PI / 2; umbra.position.x = -13.4;
  scene.add(umbra);

  if (!showcaseMode) {
    const refGrid = new THREE.PolarGridHelper(18, 12, 4, 64, 0x1e3a5f, 0x0f2544);
    refGrid.material.transparent = true; refGrid.material.opacity = 0.24;
    scene.add(refGrid);

    gsNodes = STATIONS.map((gs) => {
      const active = gs.id === missionState.stationId;
      const localPos = latLonToVec(gs.lat, gs.lon, EARTH_R * 1.02), localNorm = localPos.clone().normalize();
      const m = new THREE.Mesh(new THREE.SphereGeometry(active ? 0.095 : 0.06, 12, 10), new THREE.MeshBasicMaterial({ color: active ? 0x22c55e : 0xf59e0b }));
      m.position.copy(localPos); earthGroup.add(m);
      let cone = null;
      if (active) {
        cone = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.95, 22, 1, true), new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false }));
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), localNorm);
        cone.position.copy(localPos).addScaledVector(localNorm, 0.475);
        gsPulseRing = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.14, 24), new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
        gsPulseRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localNorm);
        gsPulseRing.position.copy(localPos).addScaledVector(localNorm, 0.02);
        earthGroup.add(cone, gsPulseRing);
      }
      return { ...gs, active, mesh: m, cone, localNorm };
    });
  }
  scene.add(earthGroup);

  if (showcaseMode) {
    spaceEnv = createSpaceEnvironment(scene, { moonPos: new THREE.Vector3(-12, 3.8, -14), moonScale: EARTH_R * 0.28 });
    scene.traverse((obj) => {
      if (obj.material && obj.material.isMeshStandardMaterial) obj.material.envMapIntensity = 0.16;
    });
    const heroCraftState = {
      busId: 'flagship-bus',
      instrumentIds: ['cryo-ir-mapper', 'neutron-spec'],
      solarId: 'high-eff-gimbal',
      batteryId: 'rad-hard-pack',
      thermalId: 'cryocooler-st',
      transceiverId: 'ka-optical',
      wavelengthBand: 'cryo-ir'
    };
    satMesh = buildOrbitSpacecraft(heroCraftState, 0.19, 0.85);
    satMesh.position.set(1.55, 1.32, 2.05);
    scene.add(satMesh);
    controls.enabled = false;
    camera.position.set(2.35, 1.48, 3.65);
    camera.lookAt(0.38, 0.45, 0.35);
    return;
  }

  // 2. Orbit Trajectory Ribbon + Core Line + Pe/Ap Beacons
  const track = generateOrbitTrack(orbitEl, 180);
  orbitPts = track.points.map((p) => new THREE.Vector3(p.position[0] * KM_TO_SCENE, p.position[1] * KM_TO_SCENE, p.position[2] * KM_TO_SCENE));
  const box = new THREE.Box3().setFromPoints(orbitPts); box.getCenter(trackCenter);
  const sphere = new THREE.Sphere(); box.getBoundingSphere(sphere);
  fitDist = Math.max(6.4, sphere.radius * 2.55);

  let pePt = orbitPts[0], apPt = orbitPts[0], peMin = Infinity, apMax = -Infinity, peAlt = 0, apAlt = 0;
  orbitPts.forEach((p, idx) => {
    const d2 = p.lengthSq(), alt = Math.round(track.points[idx]?.altitudeKm ?? (p.length() - EARTH_R) / KM_TO_SCENE);
    if (d2 < peMin) { peMin = d2; pePt = p; peAlt = alt; }
    if (d2 > apMax) { apMax = d2; apPt = p; apAlt = alt; }
  });
  const bScale = deep ? 0.24 : 0.11;
  const peGem = new THREE.Mesh(new THREE.OctahedronGeometry(bScale, 0), new THREE.MeshBasicMaterial({ color: 0x10b981 })); peGem.position.copy(pePt);
  const apGem = new THREE.Mesh(new THREE.OctahedronGeometry(bScale, 0), new THREE.MeshBasicMaterial({ color: 0xf59e0b })); apGem.position.copy(apPt);
  const peTag = makeTagSprite(`Pe · ${peAlt}km`, '#10b981'); peTag.position.copy(pePt).add(new THREE.Vector3(0, 0.36, 0));
  const apTag = makeTagSprite(`Ap · ${apAlt}km`, '#f59e0b'); apTag.position.copy(apPt).add(new THREE.Vector3(0, 0.48, 0));
  scene.add(peGem, apGem, peTag, apTag);

  const moonPos = orbitEl.id === 'lunar-transfer' ? apPt.clone().multiplyScalar(1.04) : new THREE.Vector3(-15, 3.4, -16);
  spaceEnv = createSpaceEnvironment(scene, { moonPos, moonScale: deep ? EARTH_R * 0.44 : EARTH_R * 0.3 });
  scene.traverse((obj) => {
    if (obj.material && obj.material.isMeshStandardMaterial) obj.material.envMapIntensity = 0.16;
  });

  const oGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
  lineColorAttr = new THREE.BufferAttribute(new Float32Array(orbitPts.length * 3), 3);
  oGeo.setAttribute('color', lineColorAttr);
  orbitLine = new THREE.Line(oGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }));
  ribbonMesh = buildOrbitRibbon(orbitPts, orbitEl.id === 'lunar-transfer' ? 0.28 : (deep ? 0.14 : 0.055));
  scene.add(ribbonMesh, orbitLine);

  const initProp = propagateOrbit(orbitEl, 0), initNext = propagateOrbit(orbitEl, 5);
  tmpSat.set(initProp.position[0] * KM_TO_SCENE, initProp.position[1] * KM_TO_SCENE, initProp.position[2] * KM_TO_SCENE);
  tmpNext.set(initNext.position[0] * KM_TO_SCENE, initNext.position[1] * KM_TO_SCENE, initNext.position[2] * KM_TO_SCENE);
  prevSat.copy(tmpSat); hasPrevSat = true;

  const orbitCraftScale = orbitEl.id === 'lunar-transfer' ? 0.28 : (deep ? 0.16 : 0.075);
  satMesh = buildOrbitSpacecraft(missionState, orbitCraftScale);
  satMesh.position.copy(tmpSat);
  scene.add(satMesh);

  beamLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95 }));
  beamHalo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending }));
  scanLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95 }));
  beamLine.visible = false; beamHalo.visible = false; scanLine.visible = false;
  scene.add(beamLine, beamHalo, scanLine);

  controls.maxDistance = 1200;
  startCameraTween(cameraMode, true);
}

function animate() {
  rafId = requestAnimationFrame(animate);
  const now = performance.now(), realDt = Math.min(clock.getDelta(), 0.05), simDt = realDt * timeWarp;
  simTime += simDt; sunElapsed += realDt;

  if (showcaseMode) {
    if (earthGroup) earthGroup.rotation.y += realDt * 0.018;
    if (cloudMesh) cloudMesh.rotation.y += realDt * 0.024;
    spaceEnv?.update(realDt, sunElapsed);
    if (satMesh) {
      satMesh.position.set(1.55, 1.32 + Math.sin(sunElapsed * 0.85) * 0.045, 2.05);
      satMesh.rotation.y += realDt * 0.24;
      satMesh.rotation.x = 0.22 + Math.sin(sunElapsed * 0.48) * 0.06;
      satMesh.rotation.z = -0.16;
      if (thrusterGlow) thrusterGlow.scale.setScalar(0.85 + 0.25 * Math.sin(sunElapsed * 10));
      if (earthshineLight) {
        earthshineLight.target.position.copy(satMesh.position);
        earthshineLight.target.updateMatrixWorld();
      }
    }
    parallaxCur.lerp(parallaxTarget, Math.min(1, realDt * 4.5));
    if (camera) {
      camera.position.set(
        2.35 + parallaxCur.x * 0.3 + Math.sin(sunElapsed * 0.26) * 0.11,
        1.48 - parallaxCur.y * 0.16 + Math.cos(sunElapsed * 0.22) * 0.05,
        3.65
      );
      camera.lookAt(0.38 + parallaxCur.x * 0.08, 0.45 - parallaxCur.y * 0.05, 0.35);
    }
    bloomComp ? bloomComp.composer.render() : renderer.render(scene, camera);
    return;
  }

  if (earthGroup) earthGroup.rotation.y += simDt * ((Math.PI * 2) / 86400);
  if (cloudMesh) cloudMesh.rotation.y += realDt * 0.015;
  spaceEnv?.update(realDt, sunElapsed);

  const prop = propagateOrbit(orbitEl, simTime), nextP = propagateOrbit(orbitEl, simTime + 5);
  tmpSat.set(prop.position[0] * KM_TO_SCENE, prop.position[1] * KM_TO_SCENE, prop.position[2] * KM_TO_SCENE);
  tmpNext.set(nextP.position[0] * KM_TO_SCENE, nextP.position[1] * KM_TO_SCENE, nextP.position[2] * KM_TO_SCENE);
  if (satMesh) {
    satMesh.position.copy(tmpSat);
    // Nadir Orientation: +Y science payload & comms deck points straight toward Earth center (0,0,0);
    // +Z aligns with prograde velocity tangent; +/-X solar wings extend perpendicular to orbital plane.
    tmpY.copy(tmpSat).negate().normalize();
    tmpZ.copy(tmpNext).sub(tmpSat).normalize();
    tmpZ.addScaledVector(tmpY, -tmpZ.dot(tmpY)).normalize();
    tmpX.crossVectors(tmpY, tmpZ).normalize();
    satBasis.makeBasis(tmpX, tmpY, tmpZ);
    satMesh.quaternion.setFromRotationMatrix(satBasis);
    if (velArrow) {
      velArrow.position.copy(tmpSat);
      velArrow.setDirection(tmpNext.clone().sub(tmpSat).normalize());
    }
    if (thrusterGlow) thrusterGlow.scale.setScalar(0.85 + 0.25 * Math.sin(sunElapsed * 11));
  }
  if (earthshineLight) {
    earthshineLight.target.position.copy(tmpSat);
    earthshineLight.target.updateMatrixWorld();
  }
  if (targetReticle && camera) {
    const camDist = camera.position.distanceTo(tmpSat), showThresh = Math.max(2.2, satFitR * 6.5);
    if (camDist > showThresh) {
      targetReticle.visible = true;
      targetReticle.position.copy(tmpSat);
      targetReticle.scale.setScalar(camDist * 0.048);
      targetReticle.material.opacity = THREE.MathUtils.clamp((camDist - showThresh) / 3.5, 0, 0.88);
    } else targetReticle.visible = false;
  }

  if (camTween.active && camera && controls) {
    camTween.t = Math.min(1, camTween.t + realDt / camTween.dur);
    const e = camTween.t < 0.5 ? 4 * camTween.t ** 3 : 1 - ((-2 * camTween.t + 2) ** 3) / 2;
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, e);
    if (camTween.t >= 1) camTween.active = false;
  } else if (cameraMode === 'chase' && controls && hasPrevSat) {
    tmpNorm.copy(tmpSat).sub(prevSat);
    camera.position.add(tmpNorm);
    controls.target.add(tmpNorm);
  }
  prevSat.copy(tmpSat); hasPrevSat = true;

  if (lineColorAttr && ribbonColorAttr && orbitPts.length) {
    const head = Math.floor(((prop.trueAnomalyDeg / 360) * (orbitPts.length - 1))), len = orbitPts.length;
    for (let i = 0; i < len; i += 1) {
      const distBack = (head - i + len) % len, wake = Math.max(0.14, 1 - distBack / (len * 0.55)), hot = distBack < 14;
      const r = hot ? 0.98 : 0.16 * wake, g = hot ? 0.85 : 0.72 * wake, b = hot ? 0.55 : 1.0 * wake;
      lineColorAttr.setXYZ(i, r, g, b);
      const rb = hot ? 0.85 : Math.max(0.04, wake * 0.45);
      ribbonColorAttr.setXYZ(i * 2, r * rb, g * rb, b * rb);
      ribbonColorAttr.setXYZ(i * 2 + 1, r * rb, g * rb, b * rb);
    }
    lineColorAttr.needsUpdate = true; ribbonColorAttr.needsUpdate = true;
  }

  if (simTime > 12 && simTime - lastAutoFlare > 24 && now > stormUntil) { stormUntil = now + 5500; lastAutoFlare = simTime; playWarning(); }
  const stormActive = now < stormUntil, safeModeActive = now < safeModeUntil;
  hazardNow = prop.inEclipse || stormActive;
  const pwrRate = safeModeActive ? 0.35 : (hazardNow ? -0.45 : Math.max(0.15, (evalRef.metrics.powerMargin + 25) * 0.012));
  if (simDt > 0) {
    batterySoc = Math.max(5, Math.min(100, batterySoc + pwrRate * (simDt / 60)));
    bufferGb = Math.min(32, bufferGb + (simDt / 86400) * 1.6);
  }

  inLineOfSight = false; activeStationName = 'None';
  const activeGs = gsNodes.find((g) => g.active) || gsNodes[0];
  if (activeGs && beamLine) {
    activeGs.mesh.getWorldPosition(tmpGs);
    tmpNorm.copy(activeGs.localNorm).applyQuaternion(earthGroup.quaternion);
    const losDot = tmpSat.clone().sub(tmpGs).normalize().dot(tmpNorm);
    const rangeOk = orbitEl.deepSpace ? true : tmpSat.distanceTo(tmpGs) < 5.6;
    if (activeGs.cone) activeGs.cone.material.opacity = 0.16 + 0.15 * Math.abs(Math.sin(now * 0.004));
    if (gsPulseRing) {
      const p = 1 + 0.8 * ((now * 0.0012) % 1);
      gsPulseRing.scale.setScalar(p); gsPulseRing.material.opacity = Math.max(0.05, 0.85 * (2 - p));
    }
    if (losDot > 0.08 && rangeOk && !stormActive) {
      inLineOfSight = true; activeStationName = activeGs.name;
      beamLine.visible = true; beamHalo.visible = true;
      beamLine.material.color.setHex(now < beamBoostUntil ? 0x34d399 : 0x22d3ee);
      beamLine.geometry.setFromPoints([tmpSat, tmpGs]); beamHalo.geometry.setFromPoints([tmpSat, tmpGs]);
      if (simDt > 0 && bufferGb > 0) { const xfer = Math.min(bufferGb, (simDt / 60) * 0.08); bufferGb -= xfer; downlinkedGb += xfer; }
    } else { beamLine.visible = false; beamHalo.visible = false; }
  }
  if (scanLine) {
    scanLine.visible = now < scanUntil && Boolean(scanTarget);
    if (scanLine.visible) scanLine.geometry.setFromPoints([tmpSat, scanTarget.mesh.position]);
  }

  if (telemetryCb && now - lastHudMs > 120) {
    lastHudMs = now;
    const nearest = spaceEnv?.findNearestTarget(tmpSat);
    telemetryCb({
      altitudeKm: Math.round(prop.altitudeKm), speedKms: Number(prop.speedKms.toFixed(2)),
      inEclipse: prop.inEclipse, stormActive, safeModeActive, inLineOfSight,
      batterySoc: Math.round(batterySoc), bufferGb: Number(bufferGb.toFixed(2)), downlinkedGb: Number(downlinkedGb.toFixed(2)),
      linkedStation: activeStationName, missionScore, downlinkCount, flareMitigated, asteroidsScanned,
      nearestNeaId: nearest?.target.id || '', nearestNeaDist: nearest ? Number(nearest.dist.toFixed(1)) : 99,
      timeWarp, cameraMode, fitDist: Number(fitDist.toFixed(1))
    });
  }
  controls.update();
  bloomComp ? bloomComp.composer.render() : renderer.render(scene, camera);
}

export const setOrbitTimeWarp = (w) => { timeWarp = Number(w); };
export const setOrbitCameraMode = (m) => { cameraMode = m; startCameraTween(m, false); };
export const triggerOrbitStorm = () => { stormUntil = performance.now() + 6000; playWarning(); };
export function transmitScience() {
  if (!inLineOfSight) return { ok: false, points: 0, station: 'None' };
  const xfer = Math.max(0.15, Math.min(bufferGb, 1.4));
  bufferGb = Math.max(0, bufferGb - xfer); downlinkedGb += xfer;
  downlinkCount += 1; missionScore += 50; beamBoostUntil = performance.now() + 900;
  playDownlinkPing(); return { ok: true, points: 50, station: activeStationName };
}
export function activateSafeMode() {
  safeModeUntil = performance.now() + 6500; batterySoc = Math.min(100, batterySoc + 8);
  const pts = hazardNow ? 75 : 25; missionScore += pts;
  if (hazardNow) flareMitigated += 1;
  playSafeMode(); return { ok: true, points: pts, hazard: hazardNow };
}
export function scanAsteroid() {
  if (!spaceEnv) return { ok: false, points: 0 };
  const { target } = spaceEnv.findNearestTarget(tmpSat);
  scanTarget = target; scanUntil = performance.now() + 1400;
  asteroidsScanned += 1; missionScore += target.points;
  playDownlinkPing(); return { ok: true, points: target.points, id: target.id, isComet: target.isComet };
}

export function mountOrbit(container, missionState, evaluation, onTelemetry, options = {}) {
  unmountOrbit();
  showcaseMode = Boolean(options.showcase);
  stateRef = missionState; evalRef = evaluation; telemetryCb = onTelemetry;
  simTime = 0; sunElapsed = 0; batterySoc = 84; bufferGb = 0.25; downlinkedGb = 0;
  stormUntil = 0; safeModeUntil = 0; beamBoostUntil = 0; scanUntil = 0; scanTarget = null;
  missionScore = 0; downlinkCount = 0; flareMitigated = 0; asteroidsScanned = 0; lastAutoFlare = 14; lastHudMs = 0;
  camTween.active = false; watchCometNext = false;
  parallaxTarget.set(0, 0); parallaxCur.set(0, 0);

  if (showcaseMode) {
    parallaxHandler = (e) => {
      parallaxTarget.set(
        (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2,
        (e.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2
      );
    };
    window.addEventListener('mousemove', parallaxHandler, { passive: true });
  }

  const w = Math.max(container.clientWidth, 320), h = Math.max(container.clientHeight, 320);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x01030a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  pmrem.dispose();

  camera = new THREE.PerspectiveCamera(46, w / h, 0.05, 4500);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 0.25 });
  controls.addEventListener('start', () => { camTween.active = false; });

  bloomComp = createBloomComposer(renderer, scene, camera, w, h, { strength: 0.65, radius: 0.45, threshold: 0.78 });
  buildWorld(stateRef, evalRef);

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

export function mountShowcase(container, missionState) {
  const showcaseEval = {
    orbitElements: { id: 'showcase-leo', aKm: 7050, e: 0.002, iDeg: 52, raanDeg: 18, argPerigeeDeg: 40, meanAnomaly0Deg: 20, deepSpace: false }
  };
  return mountOrbit(container, missionState, showcaseEval, null, { showcase: true });
}

export function unmountOrbit() {
  if (parallaxHandler) { window.removeEventListener('mousemove', parallaxHandler); parallaxHandler = null; }
  showcaseMode = false;
  if (rafId) cancelAnimationFrame(rafId); rafId = 0;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (controls) { controls.dispose(); controls = null; }
  if (bloomComp) { bloomComp.dispose(); bloomComp = null; }
  if (envRT) { envRT.dispose(); envRT = null; }
  if (satModel) { satModel.dispose(); satModel = null; }
  spaceEnv?.dispose(); spaceEnv = null;
  if (scene) {
    const cachedSet = new Set(Object.values(earthTexCache).filter((v) => v && typeof v === 'object'));
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          ['map', 'emissiveMap', 'roughnessMap', 'bumpMap'].forEach((k) => {
            if (m[k] && !cachedSet.has(m[k]) && !isCachedSpaceTexture(m[k]) && !isCachedCraftTexture(m[k])) m[k].dispose();
          });
          m.dispose();
        });
      }
    });
    scene = null;
  }
  if (renderer) { renderer.domElement?.remove(); renderer.dispose(); renderer = null; }
  earthGroup = earthMat = cloudMesh = atmoMat = earthshineLight = satMesh = targetReticle = thrusterGlow = beamLine = beamHalo = scanLine = null;
  orbitLine = ribbonMesh = velArrow = lineColorAttr = ribbonColorAttr = gsPulseRing = null;
  gsNodes = []; orbitPts = []; hasPrevSat = false;
}
