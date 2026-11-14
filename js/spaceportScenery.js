import * as THREE from 'three';
import { fbm2 } from './solarSystem.js';

const sceneryTexCache = { ready: false, vabSign: null, waterTower: null, horizonMap: null, roadStripe: null };

export function isCachedSceneryTexture(tex) {
  if (!tex) return false;
  return tex === sceneryTexCache.vabSign || tex === sceneryTexCache.waterTower
    || tex === sceneryTexCache.horizonMap || tex === sceneryTexCache.roadStripe;
}

function getSceneryTextures() {
  if (sceneryTexCache.ready) return sceneryTexCache;

  // High-bay VAB architectural facade with GOSPACE branding
  const vc = document.createElement('canvas'); vc.width = 512; vc.height = 512;
  const vCtx = vc.getContext('2d');
  vCtx.fillStyle = '#cbd5e1'; vCtx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 16) {
    vCtx.fillStyle = (x / 16) % 2 === 0 ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)';
    vCtx.fillRect(x, 0, 8, 512);
  }
  vCtx.fillStyle = '#1e293b';
  vCtx.fillRect(156, 72, 200, 440); // Tall vertical transfer bay door
  vCtx.fillStyle = '#334155';
  for (let r = 90; r < 500; r += 36) vCtx.fillRect(162, r, 188, 6);
  vCtx.fillStyle = '#0f172a';
  vCtx.fillRect(0, 0, 512, 66);
  vCtx.fillStyle = '#0ea5e9';
  vCtx.fillRect(24, 56, 464, 8);
  vCtx.fillStyle = '#f8fafc';
  vCtx.font = 'bold 42px sans-serif';
  vCtx.textAlign = 'center';
  vCtx.fillText('GOSPACE  VAB', 256, 44);
  sceneryTexCache.vabSign = Object.assign(new THREE.CanvasTexture(vc), { colorSpace: THREE.SRGBColorSpace });

  // Aviation checkered water tower tank skin
  const wc = document.createElement('canvas'); wc.width = 512; wc.height = 256;
  const wCtx = wc.getContext('2d');
  wCtx.fillStyle = '#f1f5f9'; wCtx.fillRect(0, 0, 512, 256);
  const cw = 64, ch = 64;
  for (let r = 0; r < 2; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if ((r + c) % 2 === 0) {
        wCtx.fillStyle = '#ea580c';
        wCtx.fillRect(c * cw, r * ch, cw, ch);
      }
    }
  }
  wCtx.fillStyle = '#0f172a';
  wCtx.font = 'bold 34px sans-serif';
  wCtx.textAlign = 'center';
  wCtx.fillText('GOSPACE', 256, 198);
  sceneryTexCache.waterTower = Object.assign(new THREE.CanvasTexture(wc), { colorSpace: THREE.SRGBColorSpace });

  // Asphalt road with yellow center dashed markings
  const rc = document.createElement('canvas'); rc.width = 128; rc.height = 256;
  const rCtx = rc.getContext('2d');
  rCtx.fillStyle = '#1e2430'; rCtx.fillRect(0, 0, 128, 256);
  rCtx.fillStyle = '#e2e8f0';
  rCtx.fillRect(8, 0, 4, 256); rCtx.fillRect(116, 0, 4, 256);
  rCtx.fillStyle = '#fbbf24';
  for (let y = 12; y < 256; y += 64) rCtx.fillRect(61, y, 6, 34);
  sceneryTexCache.roadStripe = Object.assign(new THREE.CanvasTexture(rc), {
    colorSpace: THREE.SRGBColorSpace, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping
  });
  sceneryTexCache.roadStripe.repeat.set(1, 14);

  // Curved Earth orbital horizon globe texture
  const hc = document.createElement('canvas'); hc.width = 1024; hc.height = 512;
  const hCtx = hc.getContext('2d'), hImg = hCtx.createImageData(1024, 512), hd = hImg.data;
  for (let y = 0; y < 512; y += 1) {
    const v = y / 512;
    for (let x = 0; x < 1024; x += 1) {
      const u = x / 1024, idx = (y * 1024 + x) * 4;
      const n = fbm2(u * 9, v * 5, 4);
      const land = n > 0.54;
      hd[idx] = land ? Math.round(52 + n * 48) : 9;
      hd[idx + 1] = land ? Math.round(104 + n * 45) : Math.round(42 + (1 - n) * 32);
      hd[idx + 2] = land ? Math.round(56 + n * 24) : Math.round(98 + (1 - n) * 58);
      hd[idx + 3] = 255;
    }
  }
  hCtx.putImageData(hImg, 0, 0);
  sceneryTexCache.horizonMap = Object.assign(new THREE.CanvasTexture(hc), { colorSpace: THREE.SRGBColorSpace });
  sceneryTexCache.ready = true;
  return sceneryTexCache;
}

const SUN_DIR = new THREE.Vector3(0.28, 0.13, -0.95).normalize();

function makeGoldenSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uClimb: { value: 0 }, uSunDir: { value: SUN_DIR } },
    vertexShader: `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform float uClimb;
      uniform vec3 uSunDir;
      varying vec3 vDir;
      void main() {
        float y = clamp(vDir.y, -0.15, 1.0);
        float sunCos = max(0.0, dot(normalize(vDir), normalize(uSunDir)));
        float mie = pow(sunCos, 9.0) * 0.34 + pow(sunCos, 160.0) * 0.58;
        float horizBand = exp(-max(0.0, y) * 6.5);

        // Rayleigh golden-hour twilight transitioning smoothly to orbital space
        vec3 zenithLow = vec3(0.04, 0.14, 0.36);
        vec3 horizGold = mix(vec3(0.22, 0.36, 0.58), vec3(0.92, 0.52, 0.22), clamp(pow(sunCos, 1.8) * 0.95 + horizBand * 0.38, 0.0, 1.0));
        vec3 lowSky = mix(horizGold, zenithLow, pow(max(0.0, y), 0.46)) + vec3(1.0, 0.72, 0.38) * mie;

        vec3 midSky = mix(vec3(0.14, 0.19, 0.42), vec3(0.015, 0.03, 0.11), pow(max(0.0, y), 0.45))
                    + vec3(0.75, 0.38, 0.18) * mie * 0.35;
        vec3 spaceCol = vec3(0.008, 0.012, 0.035);

        vec3 col = uClimb < 0.5 ? mix(lowSky, midSky, uClimb * 2.0) : mix(midSky, spaceCol, (uClimb - 0.5) * 2.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false
  });
}

function makeGoldenOceanMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uPlume: { value: 0 },
      uSunDir: { value: SUN_DIR }
    },
    vertexShader: `
      varying vec3 vWPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFade;
      uniform float uPlume;
      uniform vec3 uSunDir;
      varying vec3 vWPos;

      float wave(vec2 p, vec2 dir, float freq, float speed, float t) {
        return sin(dot(p, dir) * freq + t * speed);
      }

      void main() {
        vec2 p = vWPos.xz;
        float t = uTime;
        float w1 = wave(p, vec2(0.85, 0.52), 0.42, 1.7, t);
        float w2 = wave(p, vec2(-0.45, 0.89), 0.74, 2.3, t);
        float w3 = wave(p, vec2(0.2, -0.98), 1.35, 3.1, t);
        float nx = (w1 * 0.08 + w2 * 0.06 + w3 * 0.04);
        float nz = (w2 * 0.08 - w1 * 0.05 + w3 * 0.04);
        vec3 N = normalize(vec3(nx, 1.0, nz));
        vec3 V = normalize(cameraPosition - vWPos);
        vec3 L = normalize(uSunDir);

        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.8);
        vec3 deepWater = vec3(0.01, 0.06, 0.15);
        vec3 shallowTeal = vec3(0.025, 0.16, 0.28);
        vec3 skyReflect = mix(vec3(0.10, 0.22, 0.40), vec3(0.82, 0.48, 0.20), pow(max(0.0, dot(reflect(-V, N), L)), 2.6));
        vec3 waterCol = mix(deepWater, shallowTeal, clamp(0.35 + (w1 + w2) * 0.18, 0.0, 1.0));
        waterCol = mix(waterCol, skyReflect, clamp(fresnel * 0.45, 0.0, 0.55));

        // Shimmering golden-hour sun path & surf foam near cape perimeter
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 96.0);
        waterCol += vec3(1.0, 0.74, 0.36) * spec * 1.1;

        float distPad = length(p);
        float foamZone = smoothstep(36.0, 23.0, distPad) * smoothstep(14.0, 21.0, distPad);
        float foamNoise = sin(p.x * 0.65 + t * 2.2) * cos(p.y * 0.65 - t * 1.9);
        waterCol = mix(waterCol, vec3(0.65, 0.78, 0.86), clamp(foamZone * (0.24 + foamNoise * 0.2), 0.0, 0.42));

        // Dynamic orange bounce-glow when rocket ignites
        float plumeBounce = exp(-distPad * 0.032) * uPlume;
        waterCol += vec3(1.0, 0.48, 0.14) * plumeBounce * 0.65;

        // Soft radial distance horizon blend
        float edgeAlpha = 1.0 - smoothstep(190.0, 310.0, distPad);
        gl_FragColor = vec4(waterCol, clamp(uFade * edgeAlpha, 0.0, 1.0));
      }
    `,
    transparent: true
  });
}

function makeCloudMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 1 }, uSunDir: { value: SUN_DIR } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWPos;
      void main() {
        vec4 mv = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          mv = instanceMatrix * mv;
        #endif
        vec4 wp = modelMatrix * mv;
        vWPos = wp.xyz;
        mat3 normMat = mat3(modelMatrix);
        #ifdef USE_INSTANCING
          normMat = normMat * mat3(instanceMatrix);
        #endif
        vNormal = normalize(normMat * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uFade;
      uniform vec3 uSunDir;
      varying vec3 vNormal;
      varying vec3 vWPos;
      void main() {
        vec3 V = normalize(cameraPosition - vWPos);
        vec3 N = normalize(vNormal);
        float softEdge = pow(clamp(abs(dot(N, V)), 0.0, 1.0), 1.45);
        float topSun = clamp(dot(N, normalize(uSunDir)) * 0.5 + 0.5, 0.0, 1.0);
        vec3 belly = vec3(0.28, 0.36, 0.52);
        vec3 litTop = vec3(0.98, 0.82, 0.62);
        vec3 col = mix(belly, litTop, pow(topSun, 0.85));
        gl_FragColor = vec4(col, softEdge * 0.52 * uFade);
      }
    `,
    transparent: true,
    depthWrite: false
  });
}

// Cape elevation profile defining flat -0.98m spaceport campus, crawlerway, dunes, lagoon & barrier island
function capeElevation(x, z) {
  const rPad = Math.hypot(x, z);
  const vabDist = Math.hypot(x + 34, z + 18);
  const lccDist = Math.hypot(x + 22, z - 15);
  const trackDist = Math.hypot(x - 22, z + 26);

  const mainBody = Math.exp(-((x + 12) * (x + 12)) / 1450 - (z * z) / 1100);
  const barrierIsl = Math.exp(-((x - 54) * (x - 54)) / 360 - ((z + 18) * (z + 18)) / 950) * 0.92;
  const coastNoise = (fbm2((x + 140) * 0.028, (z + 140) * 0.028, 4) - 0.45) * 0.48;
  const landFactor = Math.max(mainBody, barrierIsl) + coastNoise * 0.25;

  // Smoothly rise from -2.4m seabed across -1.04m wet shore to -0.98m coastal ground plateau
  let h = landFactor < 0.34
    ? -2.4 + THREE.MathUtils.clamp(landFactor / 0.34, 0, 1) * 1.38
    : -1.02 + Math.min(0.18, (landFactor - 0.34) * 0.45);

  // Keep spaceport pads, roads & buildings flush at -0.98m while rolling dunes outside campus
  const padFlat = Math.exp(-(rPad * rPad) / 260);
  const vabFlat = Math.exp(-(vabDist * vabDist) / 300);
  const lccFlat = Math.exp(-(lccDist * lccDist) / 190);
  const trkFlat = Math.exp(-(trackDist * trackDist) / 170);
  const cwDist = Math.abs(z - Math.min(0, x) * 0.52);
  const cwFlat = x <= 2 && x >= -38 ? Math.exp(-(cwDist * cwDist) / 24) : 0;
  const flatMask = Math.min(1, padFlat + vabFlat + lccFlat + trkFlat + cwFlat);
  const dunes = (fbm2(x * 0.09 + 4.1, z * 0.09 - 2.3, 3) - 0.35) * 1.55;
  if (h > -1.04) h += Math.max(0, dunes) * (1 - flatMask);
  return h * (1 - flatMask) + (-0.98) * flatMask;
}

function buildCoastalCapeTerrain(parent) {
  const geo = new THREE.PlaneGeometry(210, 210, 128, 128);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);

  const cApron = new THREE.Color(0x3a4659);
  const cGravel = new THREE.Color(0x64748b);
  const cScrub = new THREE.Color(0x274233);
  const cDune = new THREE.Color(0x4b5839);
  const cSand = new THREE.Color(0x82735f);
  const cSeabed = new THREE.Color(0x071a2c);
  const tmpC = new THREE.Color();

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = capeElevation(x, z);
    pos.setY(i, y);

    const rPad = Math.hypot(x, z);
    const onCrawlerway = Math.abs(z - Math.min(0, x) * 0.52) < 2.6 && x <= 0 && x >= -36;
    if (y < -1.18) {
      tmpC.copy(cSeabed).lerp(cSand, THREE.MathUtils.clamp((y + 1.8) / 0.62, 0, 0.55));
    } else if (y < -1.03) {
      tmpC.copy(cSand);
    } else if (rPad < 14.5 || Math.hypot(x + 34, z + 18) < 12) {
      tmpC.copy(cApron);
    } else if (onCrawlerway) {
      tmpC.copy(cGravel);
    } else {
      const grassMix = fbm2(x * 0.12, z * 0.12, 3);
      tmpC.copy(cScrub).lerp(cDune, THREE.MathUtils.clamp(grassMix, 0, 1));
    }
    cols[i * 3] = tmpC.r; cols[i * 3 + 1] = tmpC.g; cols[i * 3 + 2] = tmpC.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.04 }));
  parent.add(terrain);

  // Distant coastal mountain ridge silhouetted along the landward horizon
  const ridgeGeo = new THREE.CylinderGeometry(168, 178, 22, 96, 4, true, Math.PI * 0.68, Math.PI * 0.92);
  const rPos = ridgeGeo.attributes.position;
  for (let i = 0; i < rPos.count; i += 1) {
    if (rPos.getY(i) > 0) {
      const a = Math.atan2(rPos.getZ(i), rPos.getX(i));
      const peak = fbm2(Math.cos(a) * 4.5 + 8, Math.sin(a) * 4.5 - 3, 4);
      rPos.setY(i, 4 + peak * 24);
    } else {
      rPos.setY(i, -4);
    }
  }
  ridgeGeo.computeVertexNormals();
  const ridge = new THREE.Mesh(
    ridgeGeo,
    new THREE.MeshStandardMaterial({ color: 0x16243d, roughness: 0.95, metalness: 0.02, side: THREE.DoubleSide })
  );
  parent.add(ridge);
}

function addBox(parent, w, h, d, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(...pos); m.rotation.set(...rot); parent.add(m);
  return m;
}

function buildSpaceportSkyline(parent, mastBeacons, rotatingDishes) {
  const tex = getSceneryTextures();
  const vabMat = new THREE.MeshStandardMaterial({ map: tex.vabSign, roughness: 0.55, metalness: 0.25 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72, metalness: 0.35 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.68 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0ea5e9, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.8 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.32, metalness: 0.75 });
  const whiteDome = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.42, metalness: 0.18, flatShading: true });
  const towerTankMat = new THREE.MeshStandardMaterial({ map: tex.waterTower, roughness: 0.48, metalness: 0.22 });
  const roadMat = new THREE.MeshStandardMaterial({ map: tex.roadStripe, roughness: 0.86, metalness: 0.05 });
  const redStrobeMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
  const amberMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

  // 1. Vehicle Assembly Building (VAB) + High-Bay Doors + Rooftop Strobes (-34, -18)
  const vabGroup = new THREE.Group();
  vabGroup.position.set(-34, -1.0, -18);
  vabGroup.rotation.y = Math.PI * 0.16;
  addBox(vabGroup, 12.5, 13.5, 10.5, vabMat, [0, 6.75, 0]);
  addBox(vabGroup, 13.0, 0.5, 11.0, roofMat, [0, 13.65, 0]);
  addBox(vabGroup, 14.0, 5.2, 6.4, roofMat, [9.2, 2.6, 0]); // Transfer aisle annex
  [[-5.4, -4.6], [5.4, -4.6], [-5.4, 4.6], [5.4, 4.6]].forEach(([sx, sz]) => {
    const st = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), redStrobeMat);
    st.position.set(sx, 14.25, sz);
    vabGroup.add(st);
    mastBeacons.push(st);
  });
  parent.add(vabGroup);

  // 2. Twin-Lane Gravel Crawlerway connecting VAB to Launchpad Mount
  const cwMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92 });
  const cw1 = addBox(parent, 32, 0.28, 3.6, cwMat, [-18, -0.88, -8.8], [0, -0.48, 0]);
  cw1.name = 'crawlerway';
  addBox(parent, 12, 0.28, 3.6, cwMat, [-5.5, -0.85, 0]);

  // 3. Launch Control Center & 3 Geodesic Radar Radomes + Rotating Dishes
  const lcc = new THREE.Group();
  lcc.position.set(-22, -0.75, 15);
  lcc.rotation.y = Math.PI * 0.3;
  addBox(lcc, 8.2, 2.8, 5.0, roofMat, [0, 1.4, 0]);
  addBox(lcc, 7.6, 1.25, 0.25, glassMat, [0, 2.1, 2.52], [-0.22, 0, 0]);
  parent.add(lcc);

  [[-16.5, 19.5, 1.6], [20.5, -24.5, 1.9], [25.0, -21.0, 1.45]].forEach(([dx, dz, rad], idx) => {
    const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 2), whiteDome);
    dome.position.set(dx, -0.85 + rad * 0.65, dz);
    parent.add(dome);
    if (idx < 2) {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 1.8, 10), darkMetal);
      ped.position.set(dx + 3.2, 0.1, dz + 2.4);
      const dishPivot = new THREE.Group();
      dishPivot.position.set(dx + 3.2, 1.15, dz + 2.4);
      const dish = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.42, 16, 1, true), silver);
      dish.rotation.x = Math.PI * 0.35;
      dishPivot.add(dish);
      parent.add(ped, dishPivot);
      rotatingDishes.push(dishPivot);
    }
  });

  // 4. Water Tower (Pad Deluge System) + White Cryogenic LOX/LH2 Spheres & Pipeline Trestles
  const wt = new THREE.Group();
  wt.position.set(-14.8, -0.95, -12.6);
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 7.2, 8), darkMetal);
    leg.position.set(Math.cos(a) * 1.1, 3.6, Math.sin(a) * 1.1);
    leg.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08);
    wt.add(leg);
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 2.2, 24), towerTankMat);
  tank.position.y = 8.1;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.62, 0.85, 24), roofMat);
  cap.position.y = 9.6;
  wt.add(tank, cap);
  parent.add(wt);

  const vaporMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.24, depthWrite: false });
  [[-11.5, -9.8, 1.55], [-7.6, -11.4, 1.55], [-13.6, -6.5, 1.2]].forEach(([tx, tz, tr]) => {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(tr, 24, 18), whiteDome);
    sp.position.set(tx, 0.35 + tr, tz);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.8, 8), darkMetal);
    col.position.set(tx, -0.1, tz);
    const vent = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.2, 10), vaporMat);
    vent.position.set(tx, 1.55 + tr, tz);
    vent.rotation.x = Math.PI;
    parent.add(sp, col, vent);
  });
  // Twin silver pipeline trestle runs + InstancedMesh support stanchions
  addBox(parent, 12.8, 0.18, 0.26, silver, [-6.8, -0.02, -6.0], [0, -0.72, 0]);
  addBox(parent, 12.8, 0.18, 0.26, silver, [-6.4, -0.02, -6.4], [0, -0.72, 0]);
  const stanchionInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.05, 0.65), darkMetal, 6);
  const stMat = new THREE.Matrix4();
  for (let s = 0; s < 6; s += 1) {
    const t = s / 5;
    stMat.makeRotationY(-0.72);
    stMat.setPosition(THREE.MathUtils.lerp(-11.2, -2.0, t), -0.52, THREE.MathUtils.lerp(-9.6, -2.8, t));
    stanchionInst.setMatrixAt(s, stMat);
  }
  stanchionInst.instanceMatrix.needsUpdate = true;
  parent.add(stanchionInst);

  // 5. Paved Access Roads + Causeway Bridge Crossing Lagoon Channel
  const accessRoad = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 48), roadMat);
  accessRoad.position.set(-18, -0.94, 4);
  accessRoad.rotation.y = Math.PI * 0.18;
  parent.add(accessRoad);

  const causeway = new THREE.Mesh(new THREE.BoxGeometry(42, 0.45, 2.8), roadMat);
  causeway.position.set(36, -0.35, -18);
  causeway.rotation.y = -0.12;
  parent.add(causeway);
  for (let p = 18; p <= 52; p += 6) {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.9, 8), roofMat);
    pier.position.set(p, -1.35, -18 + (p - 36) * Math.tan(0.12));
    parent.add(pier);
  }

  // 6. InstancedMesh Streetlights + Warm Halos + Perimeter Security Fence + Coastal Scrub
  const polePts = [];
  for (let i = 0; i < 16; i += 1) polePts.push([-14 + i * 2.2, -0.95, -5.8 - i * 0.9]);
  for (let i = 0; i < 12; i += 1) polePts.push([18 + i * 3.2, -0.18, -19.8 + i * 0.38]);
  for (let i = 0; i < 10; i += 1) polePts.push([-24 + i * 1.4, -0.95, 18 - i * 2.6]);

  const poleInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.065, 2.2, 6), darkMetal, polePts.length);
  const bulbInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), amberMat, polePts.length);
  const haloMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal; varying vec3 vView;
      void main() {
        vec4 mv = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          mv = instanceMatrix * mv;
        #endif
        vec4 wp = modelMatrix * mv;
        vView = normalize(cameraPosition - wp.xyz);
        mat3 nm = mat3(modelMatrix);
        #ifdef USE_INSTANCING
          nm = nm * mat3(instanceMatrix);
        #endif
        vNormal = normalize(nm * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal; varying vec3 vView;
      void main() {
        float g = pow(max(0.0, dot(normalize(vNormal), normalize(vView))), 3.4);
        gl_FragColor = vec4(1.0, 0.68, 0.22, g * 0.55);
      }
    `,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const haloInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 10, 8), haloMat, polePts.length);
  const m4 = new THREE.Matrix4();
  polePts.forEach(([px, py, pz], idx) => {
    m4.makeTranslation(px, py + 1.1, pz);
    poleInst.setMatrixAt(idx, m4);
    m4.makeTranslation(px, py + 2.25, pz);
    bulbInst.setMatrixAt(idx, m4);
    haloInst.setMatrixAt(idx, m4);
  });
  poleInst.instanceMatrix.needsUpdate = true;
  bulbInst.instanceMatrix.needsUpdate = true;
  haloInst.instanceMatrix.needsUpdate = true;
  parent.add(poleInst, bulbInst, haloInst);

  // Perimeter security fence posts ringing the pad safety apron (InstancedMesh)
  const fenceCount = 36;
  const fenceInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 6), silver, fenceCount);
  for (let f = 0; f < fenceCount; f += 1) {
    const a = (f / fenceCount) * Math.PI * 2;
    m4.makeTranslation(Math.cos(a) * 14.2, -0.46, Math.sin(a) * 14.2);
    fenceInst.setMatrixAt(f, m4);
  }
  fenceInst.instanceMatrix.needsUpdate = true;
  parent.add(fenceInst);

  // Coastal scrub bushes on dunes (InstancedMesh)
  const bushPositions = [];
  for (let i = 0; i < 180; i += 1) {
    const bx = ((i * 73) % 140) - 75;
    const bz = ((i * 109) % 130) - 65;
    const by = capeElevation(bx, bz);
    if (by > -0.92 && Math.hypot(bx, bz) > 16 && Math.hypot(bx + 34, bz + 18) > 13.5 && Math.hypot(bx + 22, bz - 15) > 8) {
      bushPositions.push([bx, by, bz, 0.45 + (i % 5) * 0.18]);
    }
  }
  if (bushPositions.length) {
    const bushGeo = new THREE.IcosahedronGeometry(0.55, 1);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x1f3d2b, roughness: 0.94, flatShading: true });
    const bushInst = new THREE.InstancedMesh(bushGeo, bushMat, bushPositions.length);
    const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    bushPositions.forEach(([bx, by, bz, sc], idx) => {
      p.set(bx, by + sc * 0.25, bz);
      s.set(sc * 1.25, sc * 0.78, sc);
      m4.compose(p, q, s);
      bushInst.setMatrixAt(idx, m4);
    });
    bushInst.instanceMatrix.needsUpdate = true;
    parent.add(bushInst);
  }

  // 7. Four Perimeter Lightning Masts (rotated clear of Trench/Track sightline) + Suspended Catenary Cables
  const masts = [[-10.4, 0], [0, -10.4], [10.4, 0], [0, 10.4]];
  masts.forEach(([mx, mz]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.17, 11.4, 8), silver);
    m.position.set(mx, 5.2, mz);
    parent.add(m);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), redStrobeMat);
    beacon.position.set(mx, 11.0, mz);
    parent.add(beacon);
    mastBeacons.push(beacon);
  });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.65 });
  [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([a, b]) => {
    const [ax, az] = masts[a], [bx, bz] = masts[b];
    const pts = [];
    for (let k = 0; k <= 16; k += 1) {
      const t = k / 16, sag = 4 * t * (1 - t) * 1.45;
      pts.push(new THREE.Vector3(THREE.MathUtils.lerp(ax, bx, t), 10.9 - sag, THREE.MathUtils.lerp(az, bz, t)));
    }
    parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  });

  // 8. Stadium Floodlight Towers Around Pad Apron (framed clear of camera sightline)
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xfff7ed });
  [[-10.8, 4.4], [4.2, -10.6], [11.4, -3.8], [-5.2, 10.6]].forEach(([fx, fz]) => {
    const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 5.8, 8), darkMetal);
    ft.position.set(fx, 2.3, fz);
    const bank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.2), lampHeadMat);
    bank.position.set(fx, 5.25, fz);
    bank.lookAt(0, 2.6, 0);
    parent.add(ft, bank);
  });
}

function buildVolumetricClouds(parent) {
  const cloudMat = makeCloudMaterial();
  const lobeTransforms = [];
  const countClusters = 36;
  for (let c = 0; c < countClusters; c += 1) {
    const angle = (c / countClusters) * Math.PI * 2 + (c % 3) * 0.14;
    const radius = 8.5 + (c % 6) * 10.5;
    const cy = 19 + (c % 7) * 3.1;
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius;
    const lobes = 5 + (c % 4);
    for (let l = 0; l < lobes; l += 1) {
      const ox = (fbm2(c * 2.1 + l, l * 3.7, 2) - 0.5) * 9.5;
      const oy = (fbm2(l * 1.9, c * 3.1, 2) - 0.5) * 2.4;
      const oz = (fbm2(c + l * 2.3, l, 2) - 0.5) * 9.5;
      const sx = 3.6 + (l % 3) * 1.7;
      const sy = 1.45 + (l % 2) * 0.65;
      lobeTransforms.push({ x: cx + ox, y: cy + oy, z: cz + oz, sx, sy, sz: sx * 0.88 });
    }
  }
  const cloudGeo = new THREE.IcosahedronGeometry(1, 2);
  const cloudMesh = new THREE.InstancedMesh(cloudGeo, cloudMat, lobeTransforms.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  lobeTransforms.forEach((lt, idx) => {
    p.set(lt.x, lt.y, lt.z);
    sc.set(lt.sx, lt.sy, lt.sz);
    m4.compose(p, q, sc);
    cloudMesh.setMatrixAt(idx, m4);
  });
  cloudMesh.instanceMatrix.needsUpdate = true;
  parent.add(cloudMesh);
  return { cloudMesh, cloudMat };
}

export function createSpaceportScenery(scene) {
  const tex = getSceneryTextures();
  const sceneryGroup = new THREE.Group();
  const mastBeacons = [];
  const rotatingDishes = [];

  // Atmospheric exponential fog + Golden-Hour Sky Dome + Orbital Stars
  scene.fog = new THREE.FogExp2(0x283552, 0.0036);
  const skyMat = makeGoldenSkyMaterial();
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(540, 48, 32), skyMat);
  scene.add(skyDome);

  const starPos = new Float32Array(1400 * 3);
  for (let i = 0; i < 1400; i += 1) {
    const u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, r = 460, s = Math.sqrt(1 - u * u);
    starPos[i * 3] = r * s * Math.cos(phi);
    starPos[i * 3 + 1] = Math.abs(r * u) + 8;
    starPos[i * 3 + 2] = r * s * Math.sin(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xe2e8f0, size: 1.85, sizeAttenuation: false, transparent: true, opacity: 0 });
  scene.add(new THREE.Points(starGeo, starMat));

  // GLSL Ocean Water + Sculpted Coastal Cape Terrain + Spaceport Skyline
  const oceanMat = makeGoldenOceanMaterial();
  const ocean = new THREE.Mesh(new THREE.CircleGeometry(340, 96), oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -1.18;
  sceneryGroup.add(ocean);

  buildCoastalCapeTerrain(sceneryGroup);
  buildSpaceportSkyline(sceneryGroup, mastBeacons, rotatingDishes);
  scene.add(sceneryGroup);

  // 3D Volumetric-Style Cloud Layer + Curved Earth Horizon Globe Below
  const cloudGroup = new THREE.Group();
  const { cloudMat } = buildVolumetricClouds(cloudGroup);
  scene.add(cloudGroup);

  const earthHoriz = new THREE.Mesh(
    new THREE.SphereGeometry(180, 64, 36),
    new THREE.MeshStandardMaterial({ map: tex.horizonMap, roughness: 0.58, metalness: 0.08 })
  );
  earthHoriz.position.set(0, -184.2, 0);
  const limb = new THREE.Mesh(
    new THREE.SphereGeometry(182.6, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  limb.position.copy(earthHoriz.position);
  scene.add(earthHoriz, limb);

  // Golden-Hour Pad Stadium Floodlight Rig
  const padSpotA = new THREE.SpotLight(0xfffbeb, 28, 38, Math.PI / 4, 0.48);
  padSpotA.position.set(8.8, 7.6, 8.2); padSpotA.target.position.set(0, 2.8, 0);
  const padSpotB = new THREE.SpotLight(0xfde68a, 18, 36, Math.PI / 4, 0.52);
  padSpotB.position.set(-8.2, 6.8, 7.5); padSpotB.target.position.set(0, 2.6, 0);
  scene.add(padSpotA, padSpotA.target, padSpotB, padSpotB.target);

  return {
    update(dt, elapsed, padClock, rocketY, plumeIntensity) {
      const skyT = THREE.MathUtils.clamp((elapsed - 3.4) / 6.4, 0, 1);
      skyMat.uniforms.uClimb.value = skyT;
      starMat.opacity = THREE.MathUtils.clamp((elapsed - 4.8) / 3.8, 0, 1);
      if (scene.fog) scene.fog.density = 0.0036 * (1 - THREE.MathUtils.clamp((rocketY - 12) / 34, 0, 1));

      const bOn = (Math.sin(padClock * 5.0) * 0.5 + 0.5) > 0.35;
      mastBeacons.forEach((b) => { b.visible = bOn; });
      rotatingDishes.forEach((d, idx) => { d.rotation.y += dt * (0.28 + idx * 0.14); });

      const surfFade = THREE.MathUtils.clamp(1 - (rocketY - 22) / 48, 0, 1);
      oceanMat.uniforms.uTime.value = padClock;
      oceanMat.uniforms.uFade.value = surfFade;
      oceanMat.uniforms.uPlume.value = plumeIntensity;
      sceneryGroup.visible = surfFade > 0.01;

      cloudGroup.rotation.y += dt * 0.008;
      const cloudFade = THREE.MathUtils.clamp(1 - (rocketY - 46) / 38, 0, 1);
      cloudMat.uniforms.uFade.value = cloudFade;
      cloudGroup.visible = cloudFade > 0.01;
    },
    dispose() {
      scene.fog = null;
      [skyMat, starMat, oceanMat, cloudMat].forEach((m) => m?.dispose());
    }
  };
}
