import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { generateOrbitTrack, propagateOrbit } from './missionVizPropagator.js';
import { createBloomComposer, createSpaceEnvironment, fbm2, hash2, isCachedSpaceTexture } from './solarSystem.js';
import { buildSpacecraftModel, isCachedCraftTexture } from './spacecraftModel.js';
import { applyHullDelta, getHazardSnapshot, initOrbitHazards, resetOrbitHazards, resolveActiveHazard, resolveActiveHazardChoice, triggerRandomHazard, updateOrbitHazards } from './orbitHazards.js?v=15';
import { isTutorialActive } from './tutorial.js';
import { playDeployLatchLock, playDeployServoWhir, playDownlinkPing, playHoloScanPing, playSafeMode, playWarning } from './sfx.js';

const EARTH_R = 2.0, KM_TO_SCENE = EARTH_R / 6371;
const EPOCH_UTC_MS = Date.UTC(2026, 10, 15, 14, 0, 0);
const SUN_DIR = new THREE.Vector3(1, 0, 0);
const DEPLOY_DURATION_SEC = 2.8;
const STATIONS = [
  { id: 'inuvik', name: 'Arctic Polar Station', lat: 68.36, lon: -133.72 },
  { id: 'nsn', name: 'Global Near-Space Network', lat: 37.94, lon: -75.46 },
  { id: 'dsn', name: 'Deep-Space Dish Array', lat: 35.43, lon: -116.89 }
];

let renderer = null, bloomComp = null, scene = null, camera = null, controls = null, resizeObserver = null, spaceEnv = null, envRT = null;
let rafId = 0, earthGroup = null, earthMat = null, cloudMesh = null, atmoMat = null, auroraMat = null, earthshineLight = null;
let satMesh = null, satModel = null, satFitR = 0.25, targetReticle = null, thrusterGlow = null, beamLine = null, downlinkRig = null, scanLine = null;
let orbitLine = null, ribbonMesh = null, lineColorAttr = null, ribbonColorAttr = null;
let gsNodes = [], orbitPts = [], velArrow = null, orbitEl = null, stateRef = null, evalRef = null, telemetryCb = null;
let simTime = 0, timeWarp = 25, cameraMode = 'full', watchCometNext = false, hasPrevSat = false, showcaseMode = false, victoryMode = false, briefingPaused = false, sensorCamEnabled = false;
let stormUntil = 0, safeModeUntil = 0, beamBoostUntil = 0, scanUntil = 0, scanTarget = null, parallaxHandler = null;
let batterySoc = 84, bufferGb = 0.25, downlinkedGb = 0, lastHudMs = 0, lastCamMs = 0, fitDist = 7.2, sunElapsed = 0;
let missionScore = 0, downlinkCount = 0, flareMitigated = 0, asteroidsScanned = 0, lastAutoFlare = 14;
let downlinkPts = 0, anomalyPts = 0, scanPts = 0, decisionPts = 0;
let brownoutLocked = false, sensorOfflineUntil = 0, solarChargePauseUntil = 0, commsPauseUntil = 0, omniReducedDownlinks = 0, dragLossKm = 0, dragHullAccum = 0;
let inLineOfSight = false, activeStationName = 'None', hazardNow = false;
let hazardEventCb = null, hazardFx = null, dodgeT = 0, heaterGlowT = 0, repairSweepT = 0, sparkFlashUntil = 0;
let deployActive = false, deployCompleted = false, deployElapsed = 0, deployProgress = 1, deployStageMask = 0;
let holoSelectCb = null, holoTargets = {}, holoProxies = [], gsHoloProxies = [], earthSolidMesh = null, earthOuterProxy = null;
let selectedHoloId = null, followHoloId = null, hasPrevFollow = false, selectionRing = null;
let pointerDownPos = null, lastHoverMs = 0, pointerCleanup = null;
const prevFollowPos = new THREE.Vector3(), tmpFollowPos = new THREE.Vector3(), tmpDeltaFollow = new THREE.Vector3(), tmpUpAxis = new THREE.Vector3(0, 1, 0), tmpFwdAxis = new THREE.Vector3(0, 0, 1), tmpBeamVec = new THREE.Vector3();
const holoRaycaster = new THREE.Raycaster(), holoNdc = new THREE.Vector2();

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

        float oceanMask = smoothstep(0.55, 0.95, waterMask);
        vec3 halfVec = normalize(sunDir + viewDir);
        float specCore = pow(max(0.0, dot(n, halfVec)), 76.0);
        float specBroad = pow(max(0.0, dot(n, halfVec)), 16.0);
        float oceanFres = pow(1.0 - max(0.0, dot(n, viewDir)), 2.2);
        vec3 sunglint = (vec3(1.0, 0.94, 0.78) * specCore * 1.15 + vec3(1.0, 0.80, 0.42) * specBroad * (0.35 + 0.65 * oceanFres) * 0.48) * oceanMask * smoothstep(-0.01, 0.26, sunDot);

        float nightMask = smoothstep(0.14, -0.22, sunDot);
        vec3 cities = texture2D(uNight, vUv).rgb * nightMask * 1.55;

        vec3 dayColor = albedo * (0.08 + 1.06 * dayLit) + termScatter + min(sunglint, vec3(0.95));
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

function makeAuroraCurtainGeo(signY, segs = 128, rings = 8) {
  const pos = [];
  const uvs = [];
  const idx = [];
  const colatBase = (22 * Math.PI) / 180; // ~68 deg N/S geomagnetic latitude
  for (let r = 0; r <= rings; r += 1) {
    const v = r / rings;
    const rad = EARTH_R * (1.032 + v * 0.135);
    const latTilt = colatBase + (v - 0.5) * 0.036;
    for (let s = 0; s <= segs; s += 1) {
      const u = s / segs;
      const theta = u * Math.PI * 2;
      const ripple = 0.052 * Math.sin(theta * 2.0 + 0.7 * signY) + 0.024 * Math.cos(theta * 5.0 - 0.4);
      const phi = latTilt + ripple;
      const xz = Math.sin(phi) * rad;
      const y = signY * Math.cos(phi) * rad;
      pos.push(Math.cos(theta) * xz, y, Math.sin(theta) * xz);
      uvs.push(u, v);
    }
  }
  const row = segs + 1;
  for (let r = 0; r < rings; r += 1) {
    for (let s = 0; s < segs; s += 1) {
      const a = r * row + s;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function createPolarAuroraGroup() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSunDir: { value: SUN_DIR } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime; uniform vec3 uSunDir;
      varying vec2 vUv; varying vec3 vWorldPos;
      void main() {
        float altFade = smoothstep(0.0, 0.24, vUv.y) * smoothstep(1.0, 0.42, vUv.y);
        float wave = sin(vUv.x * 18.8495 + uTime * 0.65) * 1.9 + cos(vUv.x * 31.4159 - uTime * 0.42) * 1.1;
        float raysA = pow(max(0.0, sin(vUv.x * 88.0 + wave - uTime * 1.55) * 0.5 + 0.5), 2.1);
        float raysB = pow(max(0.0, cos(vUv.x * 164.0 - wave * 0.6 + uTime * 2.1) * 0.5 + 0.5), 1.6);
        float arcEnv = smoothstep(0.18, 0.88, sin(vUv.x * 12.5664 + uTime * 0.28) * 0.5 + 0.55);

        float sunDot = dot(normalize(vWorldPos), normalize(uSunDir));
        float nightWeight = mix(0.46, 1.18, smoothstep(0.28, -0.32, sunDot));

        vec3 emerald = vec3(0.08, 0.96, 0.55);
        vec3 violet = vec3(0.72, 0.36, 1.0);
        vec3 col = mix(emerald, violet, smoothstep(0.18, 0.82, vUv.y));

        float intensity = altFade * (0.34 + raysA * 0.78 + raysB * 0.42) * (0.52 + 0.56 * arcEnv) * nightWeight;
        intensity = clamp(intensity * 1.32, 0.0, 0.96);
        gl_FragColor = vec4(col * intensity, intensity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(makeAuroraCurtainGeo(1), mat), new THREE.Mesh(makeAuroraCurtainGeo(-1), mat));
  return { grp, mat };
}

function createDownlinkStreamRig() {
  const grp = new THREE.Group();
  const beamGeo = new THREE.CylinderGeometry(0.015, 0.028, 1, 12, 1, true);
  beamGeo.translate(0, 0.5, 0);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBoost: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime; uniform float uBoost;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewDir;
      void main() {
        float speed = mix(2.2, 5.4, uBoost);
        float p1 = smoothstep(0.58, 0.96, fract(vUv.y * 6.0 - uTime * speed));
        float p2 = smoothstep(0.74, 0.98, fract(vUv.y * 13.0 - uTime * (speed * 1.45) + 0.35));
        float carrier = 0.22 + 0.14 * sin(vUv.y * 36.0 - uTime * 8.0);
        float edge = pow(abs(dot(normalize(vNormal), normalize(vViewDir))), 0.55);
        float endMask = smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
        vec3 cyan = vec3(0.14, 0.85, 0.98);
        vec3 emerald = vec3(0.20, 0.95, 0.68);
        vec3 packetCol = mix(cyan, emerald, clamp(uBoost * 0.75 + p2 * 0.45, 0.0, 1.0));
        float lum = (carrier + p1 * 0.78 + p2 * 0.65) * edge * endMask * mix(0.72, 1.05, uBoost);
        lum = clamp(lum, 0.0, 0.95);
        gl_FragColor = vec4(packetCol * lum, lum);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const streamMesh = new THREE.Mesh(beamGeo, beamMat);
  grp.add(streamMesh);

  const waveRings = Array.from({ length: 5 }, () => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.032, 0.048, 24),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    grp.add(ring);
    return ring;
  });

  const packetOrbs = Array.from({ length: 6 }, () => {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    grp.add(orb);
    return orb;
  });

  grp.visible = false;
  return { grp, streamMesh, beamMat, waveRings, packetOrbs };
}

function makeTagSprite(badge, altText, color) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 96;
  const ctx = c.getContext('2d');
  const cut = 14;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cut + 6, 8); ctx.lineTo(312 - cut, 8); ctx.lineTo(312, 8 + cut);
  ctx.lineTo(312, 88 - cut); ctx.lineTo(312 - cut, 88); ctx.lineTo(6 + cut, 88);
  ctx.lineTo(6, 88 - cut); ctx.lineTo(6, 8 + cut); ctx.closePath();
  ctx.fillStyle = 'rgba(4, 12, 26, 0.92)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner diamond glyph + badge label + altitude value
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(30, 34); ctx.lineTo(42, 48); ctx.lineTo(30, 62); ctx.lineTo(18, 48); ctx.closePath();
  ctx.fill();

  ctx.font = 'bold 28px Orbitron, monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(badge, 52, 49);

  ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.fillRect(114, 24, 2, 48);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 28px "Chakra Petch", monospace';
  ctx.fillText(altText, 128, 49);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.renderOrder = 11;
  sp.scale.set(1.85, 0.55, 1);
  return sp;
}

function buildOrbitRibbon(points, halfWidth) {
  const n = points.length, pos = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 3), idx = [];
  const tang = new THREE.Vector3(), rad = new THREE.Vector3(), side = new THREE.Vector3();
  for (let i = 0; i < n; i += 1) {
    const p = points[i], next = points[(i + 1) % n];
    tang.subVectors(next, p).normalize();
    rad.copy(p).normalize();
    side.crossVectors(tang, rad);
    if (side.lengthSq() < 0.001) side.set(0, 1, 0);
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

function buildHazardFxRig(satContainer, worldParent, scaleRadius) {
  const s = Math.max(0.14, scaleRadius * 1.45);
  const localFx = new THREE.Group();
  localFx.scale.setScalar(s);
  satContainer.add(localFx);

  const worldFx = new THREE.Group();
  worldFx.scale.setScalar(s);
  worldParent.add(worldFx);

  // 1. Debris Swarm: streaks + warning vector ring + thruster dodge puffs
  const debrisGroup = new THREE.Group();
  debrisGroup.visible = false;
  const warnRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.032, 10, 48),
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.88 })
  );
  debrisGroup.add(warnRing);
  const debrisStreaks = [];
  for (let i = 0; i < 14; i += 1) {
    const streak = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.035, 0.58),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff4500 : 0xfbbf24, transparent: true, opacity: 0.92 })
    );
    const angle = (i / 14) * Math.PI * 2;
    const rad = 0.45 + (i % 4) * 0.28;
    streak.position.set(Math.cos(angle) * rad, Math.sin(angle) * rad, -4 + (i * 0.6));
    debrisGroup.add(streak);
    debrisStreaks.push({ mesh: streak, speed: 9.5 + (i % 5) * 2.1, rad, angle });
  }
  localFx.add(debrisGroup);

  const puffGroup = new THREE.Group();
  puffGroup.visible = false;
  for (let i = 0; i < 6; i += 1) {
    const puff = new THREE.Mesh(
      new THREE.ConeGeometry(0.11 + i * 0.025, 0.36, 10),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x67e8f9 : 0xe0f2fe, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending })
    );
    puff.rotation.z = Math.PI / 2;
    puff.position.set(-0.65 - i * 0.16, 0, (i - 2.5) * 0.05);
    puffGroup.add(puff);
  }
  localFx.add(puffGroup);

  // 2. Solar Storm / CME: amber wind streaks from Sun + electric hull sparks
  const cmeGroup = new THREE.Group();
  cmeGroup.visible = false;
  const windStreaks = [];
  for (let i = 0; i < 22; i += 1) {
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.028, 0.028),
      new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xfbbf24 : 0xf97316, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
    );
    w.position.set(3 - (i * 0.28), ((i % 7) - 3) * 0.38, (((i * 3) % 7) - 3) * 0.38);
    cmeGroup.add(w);
    windStreaks.push({ mesh: w, speed: 7.5 + (i % 4) * 1.8 });
  }
  const sparks = [];
  for (let i = 0; i < 10; i += 1) {
    const sp = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.065, 0),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x38bdf8 : 0xfde047, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
    );
    cmeGroup.add(sp);
    sparks.push(sp);
  }
  worldFx.add(cmeGroup);

  // 3. Cryo-Freeze rim + warm survival heater internal pulse
  const iceRim = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.02, 1),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, wireframe: true, transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending })
  );
  iceRim.visible = false;
  const heaterGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.74, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  heaterGlow.visible = false;
  const heaterLight = new THREE.PointLight(0xff7b22, 0, 4.5);
  localFx.add(iceRim, heaterGlow, heaterLight);

  // 4. Gimbal Drift misaligned beacon arc
  const gimbalRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.03, 8, 32, Math.PI * 1.4),
    new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.9 })
  );
  gimbalRing.position.set(0, 0.45, 0);
  gimbalRing.visible = false;
  localFx.add(gimbalRing);

  // 5. Emerald Repair Complete Scan-Ring Sweep
  const repairRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.06, 0.045, 12, 48),
    new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
  );
  repairRing.rotation.x = Math.PI / 2;
  repairRing.visible = false;
  localFx.add(repairRing);

  return {
    localFx, worldFx, debrisGroup, debrisStreaks, warnRing, puffGroup,
    cmeGroup, windStreaks, sparks, iceRim, heaterGlow, heaterLight,
    gimbalRing, repairRing
  };
}

function buildOrbitSpacecraft(missionState, orbitScale, envInt = 0.55) {
  const initDeploy = showcaseMode || victoryMode ? 1 : 0;
  satModel = buildSpacecraftModel(missionState, { showWarnings: false, deployProgress: initDeploy, envMapIntensity: envInt, castShadow: false, receiveShadow: false });
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
    hazardFx = buildHazardFxRig(grp, scene, satFitR);
  }
  return grp;
}

function getPresetPose(mode, chaseScale = 1.0) {
  if (mode === 'full') {
    return {
      pos: new THREE.Vector3(trackCenter.x + fitDist * 0.56, trackCenter.y + fitDist * 0.42, trackCenter.z + fitDist * 0.74),
      target: trackCenter.clone()
    };
  }
  if ((mode === 'chase' || mode === 'victory') && satMesh) {
    const chaseDist = Math.max(0.42, satFitR * (mode === 'victory' ? 2.75 : 3.0) * chaseScale);
    const radial = tmpSat.length() > 0.1 ? tmpSat.clone().normalize() : new THREE.Vector3(1, 0.2, 1).normalize();
    const tang = tmpNext.clone().sub(tmpSat);
    const fwd = tang.lengthSq() > 1e-6 ? tang.normalize() : new THREE.Vector3(0, 0, 1);
    const side = new THREE.Vector3().crossVectors(radial, fwd).normalize();
    if (mode === 'victory') {
      const sunBlend = side.clone().multiplyScalar(0.75).addScaledVector(SUN_DIR, 0.45).normalize();
      const camPos = tmpSat.clone()
        .addScaledVector(radial, chaseDist * 0.42)
        .addScaledVector(fwd, chaseDist * 0.62)
        .addScaledVector(sunBlend, chaseDist * 0.78);
      const targetPos = tmpSat.clone().addScaledVector(radial, -satFitR * 0.12);
      return { pos: camPos, target: targetPos };
    }
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

function startCameraTween(mode, immediate = false, chaseScale = 1.0) {
  if (!camera || !controls) return;
  if (mode !== 'holo') { followHoloId = null; hasPrevFollow = false; }
  const pose = getPresetPose(mode, chaseScale);
  if (immediate) {
    camTween.active = false;
    camera.position.copy(pose.pos); controls.target.copy(pose.target); controls.update();
    return;
  }
  camTween.active = true; camTween.t = 0;
  camTween.fromPos.copy(camera.position); camTween.toPos.copy(pose.pos);
  camTween.fromTarget.copy(controls.target); camTween.toTarget.copy(pose.target);
}

function startOrbitDeployment(isReplay = false) {
  if (showcaseMode || victoryMode || !satModel) return;
  if (!isReplay && (deployCompleted || deployActive)) return;
  deployActive = true;
  deployElapsed = 0;
  deployProgress = 0;
  deployStageMask = 0;
  satModel.setDeployProgress(0);
  followHoloId = null;
  hasPrevFollow = false;
  cameraMode = 'chase';
  startCameraTween('chase', false, 0.78);
}

function createGroundStationMesh(gs, active) {
  const localPos = latLonToVec(gs.lat, gs.lon, EARTH_R * 1.001);
  const localNorm = localPos.clone().normalize();
  const group = new THREE.Group();
  group.position.copy(localPos);
  group.quaternion.setFromUnitVectors(tmpUpAxis, localNorm);

  const accentHex = active ? 0x34d399 : 0x38bdf8;
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.78, roughness: 0.28 });
  const turretMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.82, roughness: 0.24 });
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.52,
    roughness: 0.24,
    emissive: 0x0f172a,
    emissiveIntensity: 0.15
  });

  // Base octagon pedestal flush with terrain + turret collar
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.068, 0.022, 8), slateMat);
  pedestal.position.y = 0.006;
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.036, 0.024, 8), turretMat);
  turret.position.y = 0.024;
  group.add(pedestal, turret);

  // Thin glowing cyan/emerald base perimeter ring
  const baseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.054, 0.065, 32),
    new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: active ? 0.92 : 0.62,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.019;
  group.add(baseRing);

  // Steerable azimuth yoke + ~30 deg skyward-tilted parabolic dish complex
  const yawGroup = new THREE.Group();
  yawGroup.position.y = 0.036;
  yawGroup.rotation.y = gs.id === 'inuvik' ? 0.35 : (gs.id === 'nsn' ? -0.55 : 0.95);
  const yokeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.026, 0.012), slateMat);
  yokeLeft.position.set(-0.018, 0.013, 0);
  const yokeRight = yokeLeft.clone();
  yokeRight.position.x = 0.018;
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.042, 8), turretMat);
  axle.rotation.z = Math.PI / 2;
  axle.position.y = 0.024;
  yawGroup.add(yokeLeft, yokeRight, axle);

  const dishPivot = new THREE.Group();
  dishPivot.position.y = 0.024;
  dishPivot.rotation.x = 0.52; // ~30 deg tilt off local zenith

  // Procedural closed-profile Lathe parabolic dish reflector
  const dishPts = [];
  for (let i = 0; i <= 7; i += 1) {
    const t = i / 7;
    const r = 0.003 + t * 0.055;
    dishPts.push(new THREE.Vector2(r, 0.028 * t * t));
  }
  dishPts.push(new THREE.Vector2(0.06, 0.027));
  for (let i = 7; i >= 1; i -= 1) {
    const t = i / 7;
    const r = 0.004 + t * 0.054;
    dishPts.push(new THREE.Vector2(r, 0.028 * t * t - 0.0045));
  }
  dishPts.push(new THREE.Vector2(0.016, -0.012), new THREE.Vector2(0.002, -0.012));
  const dishBowl = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 28), dishMat);
  const rearHub = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.014, 14), turretMat);
  rearHub.position.y = -0.01;
  dishPivot.add(dishBowl, rearHub);

  // Feed horn spire, 3 hairline tripod struts & tiny pulsing tip
  const feedSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.0036, 0.052, 8), turretMat);
  feedSpire.position.y = 0.026;
  const subReflector = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.004, 0.0045, 12), dishMat);
  subReflector.position.y = 0.051;
  dishPivot.add(feedSpire, subReflector);

  for (let i = 0; i < 3; i += 1) {
    const a = (i * Math.PI * 2) / 3;
    const p0 = new THREE.Vector3(Math.cos(a) * 0.048, 0.021, Math.sin(a) * 0.048);
    const p1 = new THREE.Vector3(0, 0.05, 0);
    const dir = p1.clone().sub(p0);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.001, dir.length(), 6), turretMat);
    strut.position.copy(p0).addScaledVector(dir, 0.5);
    strut.quaternion.setFromUnitVectors(tmpUpAxis, dir.normalize());
    dishPivot.add(strut);
  }

  const beaconTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.0062, 10, 8),
    new THREE.MeshBasicMaterial({ color: accentHex })
  );
  beaconTip.position.y = 0.056;
  dishPivot.add(beaconTip);

  yawGroup.add(dishPivot);
  group.add(yawGroup);

  // Subtle additive uplink signal cone + ascending pulse rings for active station
  let cone = null;
  let pulseRings = [];
  if (active) {
    cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.46, 0.92, 28, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    cone.rotation.x = Math.PI;
    cone.position.y = 0.062 + 0.46;
    group.add(cone);

    pulseRings = [0, 1].map(() => {
      const pr = new THREE.Mesh(
        new THREE.RingGeometry(0.072, 0.088, 32),
        new THREE.MeshBasicMaterial({
          color: 0x34d399,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      pr.rotation.x = -Math.PI / 2;
      pr.position.y = 0.065;
      group.add(pr);
      return pr;
    });
  }

  return { group, localPos, localNorm, beaconTip, baseRing, cone, pulseRings };
}

function createHoloReticle() {
  const reticle = new THREE.Group();
  const innerGroup = new THREE.Group();
  const outerGroup = new THREE.Group();

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.84, 0.864, 64),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  innerGroup.add(innerRing);

  const tickMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  for (let i = 0; i < 4; i += 1) {
    const ang = (i * Math.PI) / 2;
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.018), tickMat);
    tick.position.set(Math.cos(ang) * 0.785, Math.sin(ang) * 0.785, 0);
    tick.rotation.z = ang;
    innerGroup.add(tick);
  }

  const bracketMat = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const arcSpan = Math.PI * 0.25;
  for (let i = 0; i < 4; i += 1) {
    const startAngle = i * (Math.PI / 2) - arcSpan / 2;
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(0.985, 1.024, 20, 1, startAngle, arcSpan),
      bracketMat
    );
    const pip = new THREE.Mesh(
      new THREE.RingGeometry(1.055, 1.08, 6, 1, i * (Math.PI / 2) + Math.PI / 4 - 0.045, 0.09),
      tickMat
    );
    outerGroup.add(arc, pip);
  }

  reticle.add(innerGroup, outerGroup);
  reticle.userData = { innerGroup, outerGroup };
  reticle.renderOrder = 12;
  return reticle;
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
  earthSolidMesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 64, 40), earthMat);
  earthSolidMesh.userData.holoId = 'earth';
  earthGroup.add(earthSolidMesh);
  earthOuterProxy = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 2.8, 16, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
  );
  earthOuterProxy.userData.holoId = 'earth';
  earthGroup.add(earthOuterProxy);
  cloudMesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.018, 48, 32),
    new THREE.MeshStandardMaterial({ map: maps.cloudMap, transparent: true, opacity: 0.85, depthWrite: false, roughness: 0.9 })
  );
  earthGroup.add(cloudMesh);
  atmoMat = makeAtmosphereRimMaterial();
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.088, 48, 32), atmoMat));
  const auroraRig = createPolarAuroraGroup();
  auroraMat = auroraRig.mat;
  earthGroup.add(auroraRig.grp);

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

    gsHoloProxies = [];
    gsNodes = STATIONS.map((gs) => {
      const active = gs.id === missionState.stationId;
      const stationRig = createGroundStationMesh(gs, active);
      earthGroup.add(stationRig.group);

      const gsProxy = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 12, 10),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
      );
      const holoKey = `gs-${gs.id}`;
      gsProxy.userData.holoId = holoKey;
      gsProxy.position.copy(stationRig.localPos);
      earthGroup.add(gsProxy);
      gsHoloProxies.push(gsProxy);
      holoTargets[holoKey] = {
        id: holoKey,
        isGroundStation: true,
        visualRadius: 0.125,
        getPos: () => stationRig.group.getWorldPosition(new THREE.Vector3()),
        getNormal: () => stationRig.localNorm.clone().applyQuaternion(earthGroup.quaternion).normalize()
      };
      return {
        ...gs,
        active,
        mesh: stationRig.beaconTip,
        group: stationRig.group,
        cone: stationRig.cone,
        pulseRings: stationRig.pulseRings,
        baseRing: stationRig.baseRing,
        localNorm: stationRig.localNorm
      };
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
  const peGem = new THREE.Mesh(new THREE.OctahedronGeometry(bScale, 0), new THREE.MeshBasicMaterial({ color: 0x34d399 })); peGem.position.copy(pePt);
  const apGem = new THREE.Mesh(new THREE.OctahedronGeometry(bScale, 0), new THREE.MeshBasicMaterial({ color: 0xfbbf24 })); apGem.position.copy(apPt);
  const peRing = new THREE.Mesh(new THREE.RingGeometry(bScale * 1.4, bScale * 1.9, 24), new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.72, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  peRing.rotation.x = Math.PI / 2; peRing.position.copy(pePt);
  const apRing = new THREE.Mesh(new THREE.RingGeometry(bScale * 1.4, bScale * 1.9, 24), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.72, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  apRing.rotation.x = Math.PI / 2; apRing.position.copy(apPt);
  const peTag = makeTagSprite('Pe', `${peAlt} km`, '#34d399'); peTag.position.copy(pePt).add(new THREE.Vector3(0, 0.38, 0));
  const apTag = makeTagSprite('Ap', `${apAlt} km`, '#fbbf24'); apTag.position.copy(apPt).add(new THREE.Vector3(0, 0.48, 0));
  scene.add(peGem, apGem, peRing, apRing, peTag, apTag);

  const moonPos = orbitEl.id === 'lunar-transfer' ? apPt.clone().multiplyScalar(1.04) : new THREE.Vector3(-7.8, 2.8, -5.2);
  spaceEnv = createSpaceEnvironment(scene, { moonPos, moonScale: deep ? EARTH_R * 0.48 : EARTH_R * 0.40 });
  Object.assign(holoTargets, spaceEnv.holoTargets || {});
  holoTargets.earth = {
    id: 'earth',
    visualRadius: EARTH_R,
    getPos: () => new THREE.Vector3(0, 0, 0),
    camOffset: new THREE.Vector3(3.8, 2.0, 4.4)
  };
  holoProxies = [...(spaceEnv.holoProxies || [])];

  selectionRing = createHoloReticle();
  selectionRing.visible = false;
  scene.add(selectionRing);

  scene.traverse((obj) => {
    if (obj.material && obj.material.isMeshStandardMaterial) obj.material.envMapIntensity = 0.16;
  });

  const oGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
  lineColorAttr = new THREE.BufferAttribute(new Float32Array(orbitPts.length * 3), 3);
  oGeo.setAttribute('color', lineColorAttr);
  orbitLine = new THREE.Line(oGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false }));
  ribbonMesh = buildOrbitRibbon(orbitPts, orbitEl.id === 'lunar-transfer' ? 0.28 : (deep ? 0.14 : 0.065));
  scene.add(ribbonMesh, orbitLine);

  const initProp = propagateOrbit(orbitEl, 0), initNext = propagateOrbit(orbitEl, 5);
  tmpSat.set(initProp.position[0] * KM_TO_SCENE, initProp.position[1] * KM_TO_SCENE, initProp.position[2] * KM_TO_SCENE);
  tmpNext.set(initNext.position[0] * KM_TO_SCENE, initNext.position[1] * KM_TO_SCENE, initNext.position[2] * KM_TO_SCENE);
  prevSat.copy(tmpSat); hasPrevSat = true;

  const orbitCraftScale = orbitEl.id === 'lunar-transfer' ? 0.28 : (deep ? 0.16 : 0.075);
  satMesh = buildOrbitSpacecraft(missionState, orbitCraftScale);
  satMesh.position.copy(tmpSat);
  scene.add(satMesh);

  beamLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending }));
  downlinkRig = createDownlinkStreamRig();
  scanLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95 }));
  beamLine.visible = false; scanLine.visible = false;
  scene.add(beamLine, downlinkRig.grp, scanLine);

  controls.maxDistance = 1200;
  startCameraTween(cameraMode, true);
}

function animate() {
  rafId = requestAnimationFrame(animate);
  const now = performance.now(), realDt = Math.min(clock.getDelta(), 0.05), simDt = briefingPaused ? 0 : realDt * timeWarp;
  simTime += simDt; sunElapsed += realDt;

  if (showcaseMode) {
    if (earthGroup) earthGroup.rotation.y += realDt * 0.018;
    if (cloudMesh) cloudMesh.rotation.y += realDt * 0.024;
    if (auroraMat) auroraMat.uniforms.uTime.value = sunElapsed;
    spaceEnv?.update(realDt, sunElapsed, camera?.position, camera?.quaternion);
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
  if (auroraMat) auroraMat.uniforms.uTime.value = sunElapsed;
  spaceEnv?.update(realDt, sunElapsed, camera?.position, camera?.quaternion);

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

  if ((cameraMode === 'chase' || cameraMode === 'victory') && controls && hasPrevSat) {
    tmpNorm.copy(tmpSat).sub(prevSat);
    if (camTween.active) {
      camTween.fromPos.add(tmpNorm); camTween.toPos.add(tmpNorm);
      camTween.fromTarget.add(tmpNorm); camTween.toTarget.add(tmpNorm);
    } else {
      camera.position.add(tmpNorm);
      controls.target.add(tmpNorm);
    }
  }
  if (camTween.active && camera && controls) {
    camTween.t = Math.min(1, camTween.t + realDt / camTween.dur);
    const e = camTween.t < 0.5 ? 4 * camTween.t ** 3 : 1 - ((-2 * camTween.t + 2) ** 3) / 2;
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, e);
    if (camTween.t >= 1) camTween.active = false;
  }
  if (followHoloId && holoTargets[followHoloId] && camera && controls) {
    tmpFollowPos.copy(holoTargets[followHoloId].getPos());
    if (hasPrevFollow) {
      tmpDeltaFollow.copy(tmpFollowPos).sub(prevFollowPos);
      if (camTween.active) {
        camTween.fromPos.add(tmpDeltaFollow); camTween.toPos.add(tmpDeltaFollow);
        camTween.fromTarget.add(tmpDeltaFollow); camTween.toTarget.add(tmpDeltaFollow);
      } else {
        camera.position.add(tmpDeltaFollow);
        controls.target.add(tmpDeltaFollow);
      }
    }
    prevFollowPos.copy(tmpFollowPos);
    hasPrevFollow = true;
  }
  prevSat.copy(tmpSat); hasPrevSat = true;

  if (selectionRing) {
    const selTarget = selectedHoloId ? holoTargets[selectedHoloId] : null;
    if (selTarget) {
      selectionRing.visible = true;
      selectionRing.position.copy(selTarget.getPos());
      if (selTarget.isGroundStation && selTarget.getNormal) {
        selectionRing.position.addScaledVector(selTarget.getNormal(), 0.048);
        tmpNorm.copy(camera.position).sub(selectionRing.position).normalize();
        selectionRing.position.addScaledVector(tmpNorm, 0.085);
      }
      selectionRing.quaternion.copy(camera.quaternion);
      const pulse = 1 + 0.035 * Math.sin(sunElapsed * 3.8);
      const baseScale = selTarget.isGroundStation
        ? selTarget.visualRadius
        : Math.max(0.28, selTarget.visualRadius * 1.24);
      selectionRing.scale.setScalar(baseScale * pulse);
      const { innerGroup, outerGroup } = selectionRing.userData;
      if (innerGroup) innerGroup.rotation.z = sunElapsed * 0.4;
      if (outerGroup) outerGroup.rotation.z = -sunElapsed * 0.4;
    } else {
      selectionRing.visible = false;
    }
  }

  if (lineColorAttr && ribbonColorAttr && orbitPts.length) {
    const len = orbitPts.length;
    let head = Math.floor(((prop.trueAnomalyDeg / 360) * (len - 1)));
    let bestD2 = Infinity;
    for (let k = 0; k < len; k += 1) {
      const d2 = orbitPts[k].distanceToSquared(tmpSat);
      if (d2 < bestD2) { bestD2 = d2; head = k; }
    }
    const trailLen = Math.max(28, Math.floor(len * 0.19)); // ~68 deg comet-tail arc
    for (let i = 0; i < len; i += 1) {
      const distBack = (head - i + len) % len;
      if (distBack <= trailLen) {
        const w = Math.pow(1 - distBack / trailLen, 1.55);
        const core = distBack < 6 ? (1 - distBack / 6) * 0.55 : 0;
        const r = Math.min(1.0, 0.08 * w + core);
        const g = Math.min(1.0, 0.90 * w + core * 0.45);
        const b = Math.min(1.0, 1.0 * w + core * 0.25);
        lineColorAttr.setXYZ(i, r, g, b);
        const rb = 0.95 * w;
        ribbonColorAttr.setXYZ(i * 2, 0.10 * rb, 0.92 * rb, 1.0 * rb);
        ribbonColorAttr.setXYZ(i * 2 + 1, 0.10 * rb, 0.92 * rb, 1.0 * rb);
      } else {
        const dashOn = (i % 6) < 3;
        lineColorAttr.setXYZ(i, dashOn ? 0.10 : 0.004, dashOn ? 0.34 : 0.014, dashOn ? 0.62 : 0.032);
        ribbonColorAttr.setXYZ(i * 2, 0, 0, 0);
        ribbonColorAttr.setXYZ(i * 2 + 1, 0, 0, 0);
      }
    }
    lineColorAttr.needsUpdate = true; ribbonColorAttr.needsUpdate = true;
  }

  updateOrbitHazards(realDt, {
    inEclipse: prop.inEclipse,
    timeWarp,
    tutorialActive: isTutorialActive() || victoryMode || briefingPaused
  });
  const hazardSnap = getHazardSnapshot();
  const activeHaz = hazardSnap.activeHazard;
  const activeKind = activeHaz?.kind || null;

  if (satModel) {
    if (deployActive && !briefingPaused && !victoryMode) {
      deployElapsed += realDt;
      deployProgress = Math.min(1, deployElapsed / DEPLOY_DURATION_SEC);
      satModel.setDeployProgress(deployProgress);
      if (!(deployStageMask & 1)) { deployStageMask |= 1; playDeployServoWhir(0); }
      if (deployElapsed >= 0.6 && !(deployStageMask & 2)) { deployStageMask |= 2; playDeployServoWhir(1); }
      if (deployElapsed >= 0.88 && !(deployStageMask & 4)) { deployStageMask |= 4; playDeployLatchLock(0); }
      if (deployElapsed >= 1.7 && !(deployStageMask & 8)) { deployStageMask |= 8; playDeployServoWhir(2); }
      if (deployElapsed >= 2.08 && !(deployStageMask & 16)) { deployStageMask |= 16; playDeployLatchLock(1); }
      if (deployProgress >= 1 && !(deployStageMask & 32)) {
        deployStageMask |= 32;
        playDeployLatchLock(2);
        deployActive = false;
        deployCompleted = true;
        satModel.setDeployProgress(1);
        lastHudMs = 0;
      }
    }
    satModel.update?.(realDt, sunElapsed);
    if (victoryMode) satModel.group.rotation.y += realDt * 0.28;
    else satModel.group.rotation.y = 0;
    if (dodgeT > 0) {
      dodgeT = Math.max(0, dodgeT - realDt * 0.9);
      satModel.group.position.x = Math.sin(dodgeT * Math.PI) * satFitR * 2.2;
    } else {
      satModel.group.position.x = 0;
    }
  }

  if (hazardFx) {
    hazardFx.worldFx.position.copy(tmpSat);
    hazardFx.debrisGroup.visible = activeKind === 'debris';
    if (hazardFx.debrisGroup.visible) {
      hazardFx.warnRing.rotation.z += realDt * 2.4;
      hazardFx.warnRing.scale.setScalar(1 + 0.08 * Math.sin(now * 0.014));
      hazardFx.debrisStreaks.forEach((d) => {
        d.mesh.position.z += d.speed * realDt;
        if (d.mesh.position.z > 4.2) d.mesh.position.z = -4.5;
      });
    }
    hazardFx.puffGroup.visible = dodgeT > 0.05;
    if (hazardFx.puffGroup.visible) {
      hazardFx.puffGroup.scale.setScalar(0.8 + 0.4 * Math.sin(dodgeT * Math.PI));
    }

    const showCme = activeKind === 'cme' || now < sparkFlashUntil;
    hazardFx.cmeGroup.visible = showCme;
    if (showCme) {
      hazardFx.windStreaks.forEach((w) => {
        w.mesh.position.x -= w.speed * realDt;
        if (w.mesh.position.x < -3.5) w.mesh.position.x = 3.5;
      });
      hazardFx.sparks.forEach((sp, i) => {
        const a = sunElapsed * 9 + i * 1.9;
        sp.position.set(Math.cos(a) * 0.72, Math.sin(a * 1.4) * 0.58, Math.sin(a) * 0.72);
        sp.visible = ((Math.floor(now * 0.028) + i) % 3) === 0;
      });
    }

    hazardFx.iceRim.visible = activeKind === 'cryo';
    if (hazardFx.iceRim.visible) {
      hazardFx.iceRim.rotation.y += realDt * 0.55;
      hazardFx.iceRim.material.opacity = 0.28 + 0.24 * Math.abs(Math.sin(now * 0.008));
    }
    if (heaterGlowT > 0) {
      heaterGlowT = Math.max(0, heaterGlowT - realDt * 0.7);
      hazardFx.heaterGlow.visible = true;
      hazardFx.heaterGlow.material.opacity = 0.55 * Math.sin(heaterGlowT * Math.PI);
      hazardFx.heaterLight.intensity = 4.2 * Math.sin(heaterGlowT * Math.PI);
    } else {
      hazardFx.heaterGlow.visible = false;
      hazardFx.heaterLight.intensity = 0;
    }

    hazardFx.gimbalRing.visible = activeKind === 'gimbal';
    if (hazardFx.gimbalRing.visible) {
      hazardFx.gimbalRing.rotation.z += realDt * 4.5;
      hazardFx.gimbalRing.rotation.x = Math.sin(now * 0.012) * 0.4;
    }

    if (repairSweepT > 0) {
      repairSweepT = Math.max(0, repairSweepT - realDt * 1.05);
      hazardFx.repairRing.visible = true;
      hazardFx.repairRing.position.y = (repairSweepT * 2 - 1) * 0.95;
      hazardFx.repairRing.material.opacity = Math.min(1, repairSweepT * 1.6);
    } else {
      hazardFx.repairRing.visible = false;
    }
  }

  const stormActive = now < stormUntil || activeKind === 'cme';
  const safeModeActive = now < safeModeUntil;
  const gimbalJammed = activeKind === 'gimbal';
  const solarPaused = now < solarChargePauseUntil;
  const commsPaused = now < commsPauseUntil || now < sensorOfflineUntil;
  const risks = evalRef?.designRisks || {};
  const canDegrade = !showcaseMode && !victoryMode && !briefingPaused && !isTutorialActive();
  if (canDegrade && risks.massOverrun) {
    dragHullAccum += realDt * 0.5;
    dragLossKm += realDt * 0.85;
    if (dragHullAccum >= 0.5) {
      applyHullDelta(-dragHullAccum, 10);
      dragHullAccum = 0;
    }
  }
  hazardNow = prop.inEclipse || stormActive || Boolean(activeHaz);
  const cryoDrain = activeKind === 'cryo' ? -0.65 * (activeHaz?.drainMult ?? 1) : 0;
  let pwrRate = safeModeActive ? 0.35 : (cryoDrain || (hazardNow ? -0.45 : Math.max(0.15, (evalRef.metrics.powerMargin + 25) * 0.012)));
  if (solarPaused && pwrRate > 0) pwrRate = 0;
  if (prop.inEclipse && risks.lowPowerMargin) pwrRate = Math.min(pwrRate * 2.5, -1.65);
  if (simDt > 0 && !briefingPaused) {
    const minSoc = risks.lowPowerMargin ? 0 : 5;
    const stepSoc = (prop.inEclipse && risks.lowPowerMargin) ? pwrRate * realDt * 3.5 : pwrRate * (simDt / 60);
    batterySoc = Math.max(minSoc, Math.min(100, batterySoc + stepSoc));
    bufferGb = Math.min(32, bufferGb + (simDt / 86400) * 1.6);
  }
  if (batterySoc <= 0.1 && (risks.lowPowerMargin || brownoutLocked)) brownoutLocked = true;
  if (brownoutLocked && !prop.inEclipse && !solarPaused && batterySoc >= 15) brownoutLocked = false;
  if (earthshineLight) earthshineLight.intensity = prop.inEclipse ? 0.24 : 0.95;

  inLineOfSight = false; activeStationName = 'None';
  gsNodes.forEach((gs, idx) => {
    const pTip = 0.88 + 0.28 * Math.abs(Math.sin(sunElapsed * 2.6 + idx * 1.7));
    if (gs.mesh) gs.mesh.scale.setScalar(pTip);
  });
  const activeGs = gsNodes.find((g) => g.active) || gsNodes[0];
  if (activeGs && beamLine) {
    activeGs.mesh.getWorldPosition(tmpGs);
    tmpNorm.copy(activeGs.localNorm).applyQuaternion(earthGroup.quaternion);
    const losDot = tmpSat.clone().sub(tmpGs).normalize().dot(tmpNorm);
    const rangeOk = orbitEl.deepSpace ? true : tmpSat.distanceTo(tmpGs) < 5.6;
    const losOk = losDot > 0.08 && rangeOk && !stormActive && !gimbalJammed && !commsPaused;

    if (activeGs.cone) {
      activeGs.cone.material.opacity = losOk
        ? 0.34 + 0.08 * Math.abs(Math.sin(now * 0.008))
        : 0.12 + 0.04 * Math.abs(Math.sin(now * 0.0035));
      activeGs.cone.material.color.setHex(losOk ? 0x22d3ee : 0x10b981);
    }
    if (activeGs.pulseRings?.length) {
      const speed = losOk ? 0.0014 : 0.00055;
      activeGs.pulseRings.forEach((pr, idx) => {
        const phase = ((now * speed) + idx * 0.5) % 1;
        pr.position.y = 0.065 + phase * 0.72;
        pr.scale.setScalar(0.85 + phase * 3.8);
        pr.material.color.setHex(losOk ? 0x22d3ee : 0x34d399);
        pr.material.opacity = (losOk ? 0.62 : 0.24) * (1 - phase);
      });
    }
    if (losOk) {
      inLineOfSight = true; activeStationName = activeGs.name;
      const boosted = now < beamBoostUntil;
      beamLine.visible = true;
      beamLine.material.color.setHex(boosted ? 0x34d399 : 0x38bdf8);
      beamLine.geometry.setFromPoints([tmpSat, tmpGs]);
      if (downlinkRig) {
        downlinkRig.grp.visible = true;
        tmpBeamVec.subVectors(tmpGs, tmpSat);
        const beamLen = Math.max(0.05, tmpBeamVec.length());
        const beamDir = tmpBeamVec.divideScalar(beamLen);
        downlinkRig.streamMesh.position.copy(tmpSat);
        downlinkRig.streamMesh.quaternion.setFromUnitVectors(tmpUpAxis, beamDir);
        downlinkRig.streamMesh.scale.set(boosted ? 1.45 : 1.0, beamLen, boosted ? 1.45 : 1.0);
        downlinkRig.beamMat.uniforms.uTime.value = sunElapsed;
        downlinkRig.beamMat.uniforms.uBoost.value = boosted ? 1.0 : 0.0;
        const speed = boosted ? 1.35 : 0.65;
        const ringFit = Math.min(1.1, Math.max(0.45, beamLen * 1.4));
        downlinkRig.waveRings.forEach((ring, idx) => {
          const t = (sunElapsed * speed + idx / downlinkRig.waveRings.length) % 1;
          ring.position.lerpVectors(tmpSat, tmpGs, t);
          ring.quaternion.setFromUnitVectors(tmpFwdAxis, beamDir);
          ring.scale.setScalar(((boosted ? 1.15 : 0.75) + t * 0.85) * ringFit);
          ring.material.color.setHex(boosted ? 0x34d399 : 0x22d3ee);
          ring.material.opacity = Math.sin(t * Math.PI) * (boosted ? 0.92 : 0.58);
        });
        downlinkRig.packetOrbs?.forEach((orb, idx) => {
          const t = (sunElapsed * (boosted ? 1.8 : 0.95) + idx / downlinkRig.packetOrbs.length) % 1;
          orb.position.lerpVectors(tmpSat, tmpGs, t);
          orb.scale.setScalar((boosted ? 1.25 : 0.8) * ringFit);
          orb.material.color.setHex(boosted ? 0x34d399 : 0x67e8f9);
          orb.material.opacity = Math.sin(t * Math.PI) * 0.98;
        });
      }
      if (simDt > 0 && bufferGb > 0) { const xfer = Math.min(bufferGb, (simDt / 60) * 0.08); bufferGb -= xfer; downlinkedGb += xfer; }
    } else {
      beamLine.visible = false;
      if (downlinkRig) downlinkRig.grp.visible = false;
    }
  }
  if (scanLine) {
    scanLine.visible = now < scanUntil && Boolean(scanTarget);
    if (scanLine.visible) scanLine.geometry.setFromPoints([tmpSat, scanTarget.mesh.position]);
  }

  const ry = earthGroup ? earthGroup.rotation.y : 0;
  const cosR = Math.cos(-ry), sinR = Math.sin(-ry);
  const lx = tmpSat.x * cosR + tmpSat.z * sinR;
  const lz = -tmpSat.x * sinR + tmpSat.z * cosR;
  const rLen = Math.hypot(tmpSat.x, tmpSat.y, tmpSat.z) || 1;
  const latDeg = (Math.asin(Math.max(-1, Math.min(1, tmpSat.y / rLen))) * 180) / Math.PI;
  const lonDeg = (Math.atan2(lx, lz) * 180) / Math.PI;

  const pipEl = document.getElementById('sensor-cam-pip');
  const overlayEl = document.getElementById('sensor-pip-overlay-msg');
  const offlineRem = Math.max(0, (sensorOfflineUntil - now) / 1000);
  if (pipEl) {
    pipEl.classList.toggle('is-brownout', brownoutLocked);
    pipEl.classList.toggle('is-offline', offlineRem > 0 && !brownoutLocked);
  }
  if (overlayEl) {
    if (brownoutLocked) {
      overlayEl.textContent = `🔋 POWER BROWNOUT (${Math.round(batterySoc)}%) — RECHARGING TO 15% IN SUNLIGHT`;
      overlayEl.hidden = false;
    } else if (offlineRem > 0) {
      overlayEl.textContent = `🛡️ SENSORS SHIELDED — OFFLINE (${offlineRem.toFixed(1)}s)`;
      overlayEl.hidden = false;
    } else {
      overlayEl.hidden = true;
    }
  }

  if (sensorCamEnabled && now - lastCamMs > 30) {
    lastCamMs = now;
    drawSensorCamFeed(latDeg, lonDeg, prop.inEclipse, stormActive, sunElapsed, simTime);
  }

  if (telemetryCb && now - lastHudMs > 120) {
    lastHudMs = now;
    const nearest = spaceEnv?.findNearestTarget(tmpSat);
    telemetryCb({
      altitudeKm: Math.max(120, Math.round(prop.altitudeKm - dragLossKm)), speedKms: Number(prop.speedKms.toFixed(2)),
      dragLossKm: Number(dragLossKm.toFixed(1)),
      latDeg: Number(latDeg.toFixed(1)), lonDeg: Number(lonDeg.toFixed(1)),
      inEclipse: prop.inEclipse, stormActive, safeModeActive, inLineOfSight,
      brownoutLocked, sensorOfflineSec: Number(offlineRem.toFixed(1)),
      solarPausedSec: Number(Math.max(0, (solarChargePauseUntil - now) / 1000).toFixed(1)),
      commsPausedSec: Number(Math.max(0, (commsPauseUntil - now) / 1000).toFixed(1)),
      omniReducedDownlinks,
      batterySoc: Math.round(batterySoc), bufferGb: Number(bufferGb.toFixed(2)), downlinkedGb: Number(downlinkedGb.toFixed(2)),
      linkedStation: activeStationName, missionScore, downlinkCount, flareMitigated, asteroidsScanned,
      downlinkPts, anomalyPts, scanPts, decisionPts,
      hullIntegrity: hazardSnap.hullIntegrity,
      anomaliesResolved: hazardSnap.anomaliesResolved,
      anomaliesMissed: hazardSnap.anomaliesMissed,
      hazardState: hazardSnap,
      designRisks: risks,
      metText: formatMetClock(simTime),
      utcText: formatUtcClock(simTime),
      nearestNeaId: nearest?.target.id || '', nearestNeaDist: nearest ? Number(nearest.dist.toFixed(1)) : 99,
      timeWarp, briefingPaused, sensorCamEnabled, sensorCamMode: getSensorCamMode(stateRef).mode,
      deployActive, deployProgress: Number(deployProgress.toFixed(3)),
      selectedHoloId, followHoloId, holoTargetCount: Object.keys(holoTargets).length,
      simTime: Number(simTime.toFixed(1)), cameraMode, fitDist: Number(fitDist.toFixed(1))
    });
  }
  controls.update();
  bloomComp ? bloomComp.composer.render() : renderer.render(scene, camera);
}

export function getSensorCamMode(missionState = stateRef) {
  const ids = missionState?.instrumentIds || [];
  const band = missionState?.wavelengthBand || '';
  const has = (id) => ids.includes(id);
  if (has('sar-wing') || band === 'rf-sar') return { mode: 'sar', label: 'SAR RADAR' };
  if (has('ir-bolometer') || has('cryo-ir-mapper') || band === 'ir' || band === 'cryo-ir') {
    return { mode: 'thermal', label: (has('cryo-ir-mapper') || band === 'cryo-ir') ? 'CRYO IR FLIR' : 'THERMAL FLIR' };
  }
  if (has('oci-hyperspec') || has('optical-spyglass') || has('arctic-multispec') || band === 'uv-vis' || band === 'deep-spec') {
    return { mode: 'hyperspec', label: band === 'deep-spec' ? 'OPTICAL SPEC' : 'HYPERSPEC UV' };
  }
  if (has('lidar-cloud')) return { mode: 'sar', label: 'LIDAR SWEEP' };
  if (has('neutron-spec') || has('boom-mag') || has('plasma-analyzer') || band === 'mag-plasma') {
    return { mode: 'flux', label: has('neutron-spec') ? 'NEUTRON FLUX' : 'MAG-AURORA' };
  }
  return { mode: 'hyperspec', label: 'OPTICAL CAM' };
}

function formatMetClock(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `T+ ${hh}:${mm}:${ss}`;
}

function formatUtcClock(sec) {
  const d = new Date(EPOCH_UTC_MS + Math.max(0, sec || 0) * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

function formatLatLon(latDeg, lonDeg) {
  const ns = latDeg >= 0 ? 'N' : 'S';
  const ew = lonDeg >= 0 ? 'E' : 'W';
  return `${Math.abs(latDeg).toFixed(1)}°${ns} ${Math.abs(lonDeg).toFixed(1)}°${ew}`;
}

function drawSensorCamFeed(latDeg, lonDeg, inEclipse, stormActive, tReal, tSim) {
  const canvas = document.getElementById('sensor-cam-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const spec = getSensorCamMode(stateRef);
  const mode = spec.mode;
  const phase = tSim * 0.004 + lonDeg * 0.08 + latDeg * 0.05;
  let telemText = formatLatLon(latDeg, lonDeg);

  const titleEl = document.getElementById('sensor-pip-title');
  if (titleEl) titleEl.textContent = `📷 ${spec.label}`;
  const lightEl = document.getElementById('sensor-pip-light');
  if (lightEl) {
    lightEl.textContent = stormActive ? 'SOLAR STORM' : (inEclipse ? 'ECLIPSE' : 'SUNLIT');
    lightEl.classList.toggle('is-eclipse', Boolean(inEclipse));
  }

  ctx.clearRect(0, 0, w, h);

  if (mode === 'thermal') {
    const isCryo = stateRef?.wavelengthBand === 'cryo-ir' || (stateRef?.instrumentIds || []).includes('cryo-ir-mapper');
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (isCryo) {
      grad.addColorStop(0, '#070b24'); grad.addColorStop(0.55, '#1e1b4b'); grad.addColorStop(1, '#311042');
    } else {
      grad.addColorStop(0, inEclipse ? '#090418' : '#18082b');
      grad.addColorStop(0.55, inEclipse ? '#2d0b3a' : '#4a1246');
      grad.addColorStop(1, '#120722');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y += 6) {
      const n = Math.sin(y * 0.08 + phase * 1.1) * 18 + Math.cos(y * 0.04 - phase * 0.7) * 12;
      ctx.fillStyle = isCryo ? 'rgba(99, 102, 241, 0.14)' : 'rgba(217, 70, 239, 0.12)';
      ctx.fillRect(0, y, w * (0.45 + n * 0.01), 3);
    }

    const cx = w * 0.5 + Math.sin(phase * 0.8) * 52;
    const cy = h * 0.5 + Math.cos(phase * 0.65) * 32;
    const spots = [
      { x: cx, y: cy, r: 44 + Math.sin(tReal * 4) * 4 },
      { x: (cx + 95) % w, y: (cy + 46) % h, r: 28 },
      { x: (cx + 210) % w, y: (cy + 115) % h, r: 22 }
    ];
    spots.forEach((sp, idx) => {
      const rg = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, sp.r);
      if (isCryo && idx > 0) {
        rg.addColorStop(0, '#a5f3fc'); rg.addColorStop(0.35, 'rgba(56, 189, 248, 0.65)'); rg.addColorStop(1, 'rgba(15, 23, 42, 0)');
      } else {
        rg.addColorStop(0, '#fef08a');
        rg.addColorStop(0.28, '#f97316');
        rg.addColorStop(0.65, 'rgba(220, 38, 38, 0.65)');
        rg.addColorStop(1, 'rgba(88, 28, 135, 0)');
      }
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2); ctx.fill();
    });

    ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.3;
    ctx.strokeRect(cx - 16, cy - 16, 32, 32);
    const peakK = isCryo
      ? Math.round(92 + Math.sin(phase) * 14)
      : Math.round((inEclipse ? 465 : 590) + Math.sin(phase * 2) * 38);
    ctx.fillStyle = 'rgba(10, 8, 24, 0.82)';
    ctx.fillRect(8, 8, 128, 22);
    ctx.fillStyle = '#fef08a';
    ctx.font = '700 12px Orbitron, sans-serif';
    ctx.fillText(`PEAK ${peakK} K`, 14, 23);
    telemText = `${formatLatLon(latDeg, lonDeg)} · ${peakK} K FLIR`;
  } else if (mode === 'sar') {
    ctx.fillStyle = '#03120e';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.42)';
    ctx.lineWidth = 1.2;
    for (let row = 0; row < 12; row += 1) {
      const baseY = row * 14 + ((tReal * 24) % 14);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const ridge = Math.sin(x * 0.035 + row * 0.7 + phase) * 9 + Math.cos(x * 0.08 - row * 0.4) * 4;
        if (x === 0) ctx.moveTo(x, baseY + ridge);
        else ctx.lineTo(x, baseY + ridge);
      }
      ctx.stroke();
    }

    ctx.fillStyle = inEclipse ? 'rgba(148, 163, 184, 0.14)' : 'rgba(226, 232, 240, 0.18)';
    for (let i = 0; i < 4; i += 1) {
      const clX = ((i * 88 + tReal * 18) % (w + 60)) - 30;
      const clY = 30 + ((i * 39) % (h - 50));
      ctx.beginPath(); ctx.ellipse(clX, clY, 46, 16, 0.2, 0, Math.PI * 2); ctx.fill();
    }

    const sweepY = ((tReal * 110) % (h + 24)) - 12;
    const sweepGrad = ctx.createLinearGradient(0, sweepY - 26, 0, sweepY + 4);
    sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
    sweepGrad.addColorStop(0.85, 'rgba(52, 211, 153, 0.42)');
    sweepGrad.addColorStop(1, '#6ee7b7');
    ctx.fillStyle = sweepGrad;
    ctx.fillRect(0, sweepY - 26, w, 30);

    ctx.strokeStyle = 'rgba(52, 211, 153, 0.26)';
    [34, 68].forEach((r) => { ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2); ctx.stroke(); });

    const dbVal = (-6.2 - Math.abs(Math.sin(phase) * 5.4)).toFixed(1);
    ctx.fillStyle = 'rgba(3, 18, 14, 0.85)';
    ctx.fillRect(8, 8, 156, 22);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '700 12px Orbitron, sans-serif';
    ctx.fillText(`SIGMA ${dbVal} dB`, 14, 23);
    telemText = `${formatLatLon(latDeg, lonDeg)} · ${dbVal} dB`;
  } else if (mode === 'hyperspec') {
    const dim = inEclipse ? 0.34 : 1.0;
    const oceanGrad = ctx.createLinearGradient(0, 0, w, h);
    oceanGrad.addColorStop(0, inEclipse ? '#030b1f' : '#0c4a6e');
    oceanGrad.addColorStop(0.55, inEclipse ? '#061630' : '#0284c7');
    oceanGrad.addColorStop(1, inEclipse ? '#081b2a' : '#0f766e');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 6; i += 1) {
      const ex = ((i * 58 + tReal * 22 + lonDeg * 1.4) % (w + 60)) - 30;
      const ey = 32 + Math.sin(phase + i * 1.3) * 32 + 34;
      const rg = ctx.createRadialGradient(ex, ey, 4, ex, ey, 42);
      rg.addColorStop(0, `rgba(52, 211, 153, ${(0.52 * dim).toFixed(2)})`);
      rg.addColorStop(0.55, `rgba(34, 211, 238, ${(0.28 * dim).toFixed(2)})`);
      rg.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(ex, ey, 42, 0, Math.PI * 2); ctx.fill();
    }

    if (inEclipse) {
      ctx.fillStyle = 'rgba(253, 224, 71, 0.72)';
      for (let i = 0; i < 14; i += 1) {
        const lx = ((i * 47 + Math.round(phase * 25)) % (w - 20)) + 10;
        const ly = ((i * 31 + 19) % (h - 48)) + 10;
        ctx.fillRect(lx, ly, 2.2, 2.2);
      }
    }

    ctx.fillStyle = 'rgba(4, 12, 28, 0.85)';
    ctx.fillRect(0, h - 34, w, 34);
    const hues = [265, 245, 225, 200, 180, 160, 140, 115, 85, 58, 40, 22, 5];
    hues.forEach((hue, idx) => {
      const barW = (w - 24) / hues.length;
      const mag = 6 + (0.5 + 0.5 * Math.sin(phase * 1.7 + idx * 0.65)) * 16;
      ctx.fillStyle = `hsl(${hue}, 88%, 58%)`;
      ctx.fillRect(12 + idx * barW, h - 14 - mag, barW - 2, mag);
    });
    ctx.fillStyle = '#bae6fd';
    ctx.font = '700 11px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('400 nm', 12, h - 4);
    ctx.textAlign = 'center';
    ctx.fillText('SPECTRAL BANDS', w / 2, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText('890 nm', w - 12, h - 4);
    ctx.textAlign = 'left';
    const peakNm = Math.round(525 + Math.sin(phase) * 75);
    telemText = `${formatLatLon(latDeg, lonDeg)} · ${peakNm} nm PEAK`;
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#09061f');
    grad.addColorStop(0.55, '#190e3d');
    grad.addColorStop(1, '#061028');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const fx = w * 0.5 + Math.sin(phase * 0.7) * 28;
    const fy = h * 0.5 + Math.cos(phase * 0.55) * 18;
    [24, 48, 72].forEach((r, idx) => {
      ctx.strokeStyle = idx % 2 === 0 ? 'rgba(56, 189, 248, 0.42)' : 'rgba(192, 132, 252, 0.36)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(fx, fy, r * 1.4, r * 0.8, Math.sin(tReal * 0.4) * 0.18, 0, Math.PI * 2); ctx.stroke();
    });

    for (let layer = 0; layer < 2; layer += 1) {
      ctx.strokeStyle = layer === 0 ? '#34d399' : '#c084fc';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = h * 0.46 + Math.sin(x * 0.045 + tReal * 2.4 + layer * 1.4) * 18 + Math.cos(x * 0.02 - phase) * 10;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const nT = Math.round(41800 + Math.sin(phase * 1.6) * 4200);
    ctx.fillStyle = 'rgba(12, 8, 34, 0.85)';
    ctx.fillRect(8, 8, 148, 22);
    ctx.fillStyle = '#e879f9';
    ctx.font = '700 12px Orbitron, sans-serif';
    ctx.fillText(`FLUX ${nT} nT`, 14, 23);
    telemText = `${formatLatLon(latDeg, lonDeg)} · ${nT} nT`;
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 14, h / 2); ctx.lineTo(w / 2 - 4, h / 2);
  ctx.moveTo(w / 2 + 4, h / 2); ctx.lineTo(w / 2 + 14, h / 2);
  ctx.moveTo(w / 2, h / 2 - 14); ctx.lineTo(w / 2, h / 2 - 4);
  ctx.moveTo(w / 2, h / 2 + 4); ctx.lineTo(w / 2, h / 2 + 14);
  ctx.stroke();

  const risks = evalRef?.designRisks || {};
  if (stormActive || risks.weakCommsMargin || risks.wavelengthMismatch) {
    ctx.fillStyle = risks.wavelengthMismatch ? 'rgba(239, 68, 68, 0.22)' : 'rgba(245, 158, 11, 0.16)';
    const bars = risks.wavelengthMismatch ? 28 : 16;
    for (let i = 0; i < bars; i += 1) {
      ctx.fillRect((Math.sin(tReal * 41 + i * 7) * 0.5 + 0.5) * w, (i * 9) % h, risks.wavelengthMismatch ? 44 : 18, 2);
    }
  }
  if (risks.wavelengthMismatch) {
    ctx.fillStyle = 'rgba(127, 29, 29, 0.85)';
    ctx.fillRect(8, h - 26, w - 16, 20);
    ctx.fillStyle = '#fecaca';
    ctx.font = '700 11px Orbitron, sans-serif';
    ctx.fillText('⚠ WAVELENGTH MISMATCH · -40% SCI', 14, h - 12);
  }

  const telemEl = document.getElementById('sensor-pip-telem');
  if (telemEl) telemEl.textContent = risks.weakCommsMargin ? `${telemText} · RF STATIC` : telemText;
}

export const setOrbitTimeWarp = (w) => { timeWarp = Number(w); };
export function setOrbitBriefingPaused(paused) {
  const next = Boolean(paused);
  const wasPaused = briefingPaused;
  briefingPaused = next;
  if (wasPaused && !next && !deployCompleted && !deployActive) {
    startOrbitDeployment(false);
    lastHudMs = 0;
  }
}
export const isOrbitBriefingPaused = () => briefingPaused;
export function replayOrbitDeployment() {
  if (showcaseMode || victoryMode || briefingPaused) return false;
  startOrbitDeployment(true);
  lastHudMs = 0;
  return true;
}

function pickHoloAtClient(clientX, clientY) {
  if (!renderer || !camera || showcaseMode) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  holoNdc.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  holoRaycaster.setFromCamera(holoNdc, camera);
  if (gsHoloProxies.length && earthSolidMesh) {
    const gsAndEarth = holoRaycaster.intersectObjects([...gsHoloProxies, earthSolidMesh], false);
    if (gsAndEarth.length) {
      const earthHit = gsAndEarth.find((h) => h.object === earthSolidMesh);
      const earthDist = earthHit ? earthHit.distance : Infinity;
      const gsHit = gsAndEarth.find((h) => h.object !== earthSolidMesh && h.distance <= earthDist + 0.25);
      if (gsHit?.object.userData?.holoId) return gsHit.object.userData.holoId;
    }
  }
  const pool = [...holoProxies];
  if (earthSolidMesh) pool.push(earthSolidMesh);
  if (earthOuterProxy) pool.push(earthOuterProxy);
  const hits = holoRaycaster.intersectObjects(pool, false);
  const hit = hits.find((h) => h.object.userData?.holoId);
  return hit ? hit.object.userData.holoId : null;
}

export function selectHoloBody(holoId) {
  if (!holoId || !holoTargets[holoId]) return false;
  selectedHoloId = holoId;
  playHoloScanPing();
  holoSelectCb?.(holoId);
  lastHudMs = 0;
  return true;
}

export function clearHoloSelection() {
  selectedHoloId = null;
  if (selectionRing) selectionRing.visible = false;
  lastHudMs = 0;
}

export function focusCelestialBody(holoId = selectedHoloId) {
  const target = holoId ? holoTargets[holoId] : null;
  if (!target || !camera || !controls) return false;
  selectedHoloId = holoId;
  followHoloId = holoId;
  cameraMode = 'holo';
  hasPrevFollow = false;
  const center = target.getPos();
  let camPos;
  if (target.getNormal) {
    const n = target.getNormal();
    const side = new THREE.Vector3(0, 1, 0).cross(n);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    camPos = center.clone().addScaledVector(n, 0.92).addScaledVector(side, 0.42).add(new THREE.Vector3(0, 0.22, 0));
  } else {
    camPos = center.clone().add(target.camOffset || new THREE.Vector3(4, 2, 5));
  }
  camTween.active = true; camTween.t = 0; camTween.dur = 0.85;
  camTween.fromPos.copy(camera.position); camTween.toPos.copy(camPos);
  camTween.fromTarget.copy(controls.target); camTween.toTarget.copy(center);
  lastHudMs = 0;
  return true;
}

export function returnToSatellite() {
  followHoloId = null;
  hasPrevFollow = false;
  cameraMode = 'chase';
  startCameraTween('chase', false, 1.0);
  lastHudMs = 0;
  return true;
}

export const getHoloBodyScreenPos = (holoId) => {
  const t = holoTargets[holoId];
  if (!t || !camera || !renderer) return null;
  const p = t.getPos().project(camera);
  if (p.z < -1 || p.z > 1) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  return {
    x: Math.round(rect.left + (p.x * 0.5 + 0.5) * rect.width),
    y: Math.round(rect.top + (-p.y * 0.5 + 0.5) * rect.height),
    inView: Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1
  };
};
export const setSensorCamEnabled = (enabled) => {
  sensorCamEnabled = Boolean(enabled);
  if (sensorCamEnabled) lastCamMs = 0;
};
export const setOrbitCameraMode = (m) => { cameraMode = m; startCameraTween(m, false); };
export function setOrbitVictoryMode(enabled, restoreCam = 'chase') {
  victoryMode = Boolean(enabled);
  const nextMode = victoryMode ? 'victory' : (restoreCam || 'chase');
  cameraMode = nextMode;
  startCameraTween(nextMode, false);
}
export function seekOrbitToPass(leadSeconds = 110) {
  if (!orbitEl || !earthGroup || !gsNodes.length) return false;
  const activeGs = gsNodes.find((g) => g.active) || gsNodes[0];
  if (!activeGs) return false;
  const baseEarthY = earthGroup.rotation.y;
  const rotPerSec = (Math.PI * 2) / 86400;
  const satTest = new THREE.Vector3(), gsPos = new THREE.Vector3(), gsNorm = new THREE.Vector3();
  const quat = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0);
  for (let dt = 0; dt <= 28800; dt += 45) {
    const tTest = simTime + dt;
    const p = propagateOrbit(orbitEl, tTest);
    satTest.set(p.position[0] * KM_TO_SCENE, p.position[1] * KM_TO_SCENE, p.position[2] * KM_TO_SCENE);
    euler.y = baseEarthY + dt * rotPerSec;
    quat.setFromEuler(euler);
    gsPos.copy(activeGs.localNorm).multiplyScalar(EARTH_R * 1.005).applyQuaternion(quat);
    gsNorm.copy(activeGs.localNorm).applyQuaternion(quat);
    const losDot = satTest.clone().sub(gsPos).normalize().dot(gsNorm);
    const rangeOk = orbitEl.deepSpace ? true : satTest.distanceTo(gsPos) < 5.2;
    if (losDot > 0.14 && rangeOk) {
      const targetDt = Math.max(0, dt - leadSeconds);
      simTime += targetDt;
      earthGroup.rotation.y += targetDt * rotPerSec;
      stormUntil = 0;
      lastAutoFlare = simTime + 9999;
      return true;
    }
  }
  return false;
}
export const triggerOrbitStorm = () => { stormUntil = performance.now() + 6000; playWarning(); };
export function triggerTestHazard(forcedKind = null) {
  return triggerRandomHazard(forcedKind);
}
export function repairActiveHazard(key = null) {
  return resolveActiveHazard(key);
}
export function resolveOrbitHazardChoice(choiceIdx = 0) {
  return resolveActiveHazardChoice(choiceIdx);
}
export function transmitScience() {
  const now = performance.now();
  if (brownoutLocked) return { ok: false, reason: 'brownout', points: 0, station: activeStationName };
  if (now < commsPauseUntil || now < sensorOfflineUntil) {
    const rem = Math.max(commsPauseUntil - now, sensorOfflineUntil - now) / 1000;
    return { ok: false, reason: 'paused', pausedSec: Number(rem.toFixed(1)), points: 0, station: activeStationName };
  }
  if (!inLineOfSight) return { ok: false, points: 0, station: 'None' };
  const risks = evalRef?.designRisks || {};
  let pts = 50;
  let omniReduced = false;
  if (omniReducedDownlinks > 0) {
    pts = Math.round(pts * 0.7);
    omniReducedDownlinks -= 1;
    omniReduced = true;
  }
  if (risks.weakCommsMargin) pts = Math.round(pts * 0.5);
  if (risks.wavelengthMismatch) pts = Math.round(pts * 0.6);
  const xfer = Math.max(0.15, Math.min(bufferGb, 1.4));
  bufferGb = Math.max(0, bufferGb - xfer); downlinkedGb += xfer;
  downlinkCount += 1; downlinkPts += pts; missionScore += pts; beamBoostUntil = performance.now() + 900;
  lastHudMs = 0;
  playDownlinkPing();
  return { ok: true, points: pts, station: activeStationName, omniReduced, weakComms: Boolean(risks.weakCommsMargin), wavelengthMismatch: Boolean(risks.wavelengthMismatch) };
}
export function activateSafeMode() {
  safeModeUntil = performance.now() + 6500; batterySoc = Math.min(100, batterySoc + 8);
  const pts = hazardNow ? 75 : 25; anomalyPts += pts; missionScore += pts;
  if (hazardNow) flareMitigated += 1;
  playSafeMode(); return { ok: true, points: pts, hazard: hazardNow };
}
export function scanAsteroid() {
  if (!spaceEnv) return { ok: false, points: 0 };
  const { target } = spaceEnv.findNearestTarget(tmpSat);
  const risks = evalRef?.designRisks || {};
  const pts = risks.wavelengthMismatch ? Math.round(target.points * 0.6) : target.points;
  scanTarget = target; scanUntil = performance.now() + 1400;
  asteroidsScanned += 1; scanPts += pts; missionScore += pts;
  lastHudMs = 0;
  playDownlinkPing(); return { ok: true, points: pts, id: target.id, isComet: target.isComet };
}
export function applyOrbitDecisionEffect({ scoreDelta = 0, hullDelta = 0, batteryDelta = 0, sensorOfflineSec = 0 } = {}) {
  if (scoreDelta) {
    decisionPts += scoreDelta;
    missionScore += scoreDelta;
  }
  if (hullDelta) applyHullDelta(hullDelta, 5);
  if (batteryDelta) {
    batterySoc = Math.max(0, Math.min(100, batterySoc + batteryDelta));
    if (batterySoc <= 0.1 && evalRef?.designRisks?.lowPowerMargin) brownoutLocked = true;
  }
  if (sensorOfflineSec > 0) sensorOfflineUntil = performance.now() + sensorOfflineSec * 1000;
  lastHudMs = 0;
  return { missionScore, batterySoc: Math.round(batterySoc), hullIntegrity: getHazardSnapshot().hullIntegrity };
}

export function mountOrbit(container, missionState, evaluation, onTelemetry, options = {}) {
  unmountOrbit();
  showcaseMode = Boolean(options.showcase);
  victoryMode = Boolean(options.victory);
  briefingPaused = Boolean(options.paused);
  stateRef = missionState; evalRef = evaluation; telemetryCb = onTelemetry; hazardEventCb = options.onHazardEvent || null;
  holoSelectCb = options.onSelectHolo || null;
  simTime = 0; sunElapsed = 0; batterySoc = 84; bufferGb = 0.25; downlinkedGb = 0;
  stormUntil = 0; safeModeUntil = 0; beamBoostUntil = 0; scanUntil = 0; scanTarget = null;
  missionScore = 0; downlinkCount = 0; flareMitigated = 0; asteroidsScanned = 0;
  downlinkPts = 0; anomalyPts = 0; scanPts = 0; decisionPts = 0; lastAutoFlare = 14; lastHudMs = 0; lastCamMs = 0;
  brownoutLocked = false; sensorOfflineUntil = 0; solarChargePauseUntil = 0; commsPauseUntil = 0; omniReducedDownlinks = 0; dragLossKm = 0; dragHullAccum = 0;
  sensorCamEnabled = Boolean(options.sensorCam);
  dodgeT = 0; heaterGlowT = 0; repairSweepT = 0; sparkFlashUntil = 0;
  holoTargets = {}; holoProxies = []; gsHoloProxies = []; earthSolidMesh = null; earthOuterProxy = null;
  selectedHoloId = null; followHoloId = null; hasPrevFollow = false; selectionRing = null; pointerDownPos = null;
  if (victoryMode) {
    cameraMode = 'victory';
    deployActive = false; deployCompleted = true; deployProgress = 1; deployElapsed = 0; deployStageMask = 0;
  } else if (showcaseMode) {
    deployActive = false; deployCompleted = true; deployProgress = 1; deployElapsed = 0; deployStageMask = 0;
  } else {
    deployActive = false; deployCompleted = false; deployProgress = 0; deployElapsed = 0; deployStageMask = 0;
  }
  camTween.active = false; watchCometNext = false;
  parallaxTarget.set(0, 0); parallaxCur.set(0, 0);

  if (!showcaseMode) {
    initOrbitHazards(missionState, evaluation, {
      getBatterySoc: () => batterySoc,
      onTrigger: (hazard) => {
        if (hazard.kind === 'cme') stormUntil = performance.now() + hazard.durationSec * 1000;
        lastHudMs = 0;
        hazardEventCb?.({ type: 'trigger', timeWarp, ...hazard });
      },
      onResolve: (res) => {
        const nowMs = performance.now();
        const deltaScore = res.scoreDelta ?? res.bonus ?? 0;
        anomalyPts += deltaScore;
        missionScore += deltaScore;
        flareMitigated += 1;
        if (res.batteryDelta) {
          batterySoc = Math.max(0, Math.min(100, batterySoc + res.batteryDelta));
          if (batterySoc <= 0.1) { brownoutLocked = true; batterySoc = 0; }
        }
        if (res.solarPauseSec > 0) solarChargePauseUntil = nowMs + res.solarPauseSec * 1000;
        if (res.sensorOfflineSec > 0) sensorOfflineUntil = nowMs + res.sensorOfflineSec * 1000;
        if (res.commsPauseSec > 0) commsPauseUntil = nowMs + res.commsPauseSec * 1000;
        if (res.omniReducedCount > 0) omniReducedDownlinks += res.omniReducedCount;
        if (res.kind === 'cme') stormUntil = 0;
        repairSweepT = 1.0;
        if (res.kind === 'debris' && (res.hullDelta || 0) >= 0) dodgeT = 1.0;
        if (res.kind === 'cryo' && (res.batteryDelta || 0) <= -20) heaterGlowT = 1.0;
        if ((res.hullDelta || 0) <= -10) sparkFlashUntil = nowMs + 950;
        lastHudMs = 0;
        hazardEventCb?.({ type: 'resolve', ...res });
      },
      onExpire: (exp) => {
        batterySoc = Math.max(0, batterySoc - (exp.batteryLoss || 18));
        if (batterySoc <= 0.1) { brownoutLocked = true; batterySoc = 0; }
        if (exp.dataLossRatio > 0) bufferGb = Math.max(0, bufferGb * (1 - exp.dataLossRatio));
        if (exp.kind === 'cme') stormUntil = 0;
        sparkFlashUntil = performance.now() + 1200;
        lastHudMs = 0;
        hazardEventCb?.({ type: 'expire', ...exp });
      }
    });
  } else {
    resetOrbitHazards();
  }

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

  if (!showcaseMode) {
    const dom = renderer.domElement;
    const onDown = (e) => {
      if (e.button !== 0) return;
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e) => {
      const nowMs = performance.now();
      if (nowMs - lastHoverMs < 48) return;
      lastHoverMs = nowMs;
      if (briefingPaused || victoryMode) { dom.style.cursor = ''; return; }
      const hitId = pickHoloAtClient(e.clientX, e.clientY);
      dom.style.cursor = hitId ? 'pointer' : '';
    };
    const onUp = (e) => {
      const down = pointerDownPos;
      pointerDownPos = null;
      if (!down || briefingPaused || victoryMode) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
        const hitId = pickHoloAtClient(e.clientX, e.clientY);
        if (hitId) selectHoloBody(hitId);
      }
    };
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    pointerCleanup = () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.style.cursor = '';
    };
    if (!briefingPaused && !victoryMode) startOrbitDeployment(false);
  }

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
  if (pointerCleanup) { pointerCleanup(); pointerCleanup = null; }
  showcaseMode = false;
  victoryMode = false;
  briefingPaused = false;
  sensorCamEnabled = false;
  deployActive = false; deployCompleted = false; deployProgress = 1; deployElapsed = 0; deployStageMask = 0;
  selectedHoloId = null; followHoloId = null; hasPrevFollow = false; holoSelectCb = null; pointerDownPos = null;
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
  earthGroup = earthMat = cloudMesh = atmoMat = auroraMat = earthshineLight = satMesh = targetReticle = thrusterGlow = beamLine = downlinkRig = scanLine = null;
  orbitLine = ribbonMesh = velArrow = lineColorAttr = ribbonColorAttr = hazardFx = null;
  hazardEventCb = null;
  resetOrbitHazards();
  gsNodes = []; gsHoloProxies = []; holoProxies = []; holoTargets = {};
  earthSolidMesh = null; earthOuterProxy = null; selectionRing = null;
  orbitPts = []; hasPrevSat = false;
}
