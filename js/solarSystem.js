import * as THREE from 'three';

export function hash2(x, y) {
  let n = Math.imul(Math.floor(x) | 0, 374761393) + Math.imul(Math.floor(y) | 0, 668265263);
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm2(x, y, octaves = 4) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i += 1) {
    val += amp * noise2(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

function makeMilkyWayTexture() {
  const w = 2048, h = 1024;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#010208');
  bg.addColorStop(0.5, '#040a1a');
  bg.addColorStop(1, '#010208');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle deep-space nebula glow along tilted galactic plane
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bandYAt = (x) => {
    const u = (x / w) * Math.PI * 2;
    return h * 0.5 + Math.sin(u + 0.6) * 190 + Math.cos(u * 2.0 - 0.4) * 32;
  };

  for (let i = 0; i < 640; i += 1) {
    const x = (i * 157 + hash2(i, 3) * 80) % w;
    const baseY = bandYAt(x) + (hash2(i, 9) - 0.5) * 150;
    const r = 34 + (i % 86);
    const coreDist = Math.abs(((x / w) - 0.36 + 1.5) % 1 - 0.5);
    const isCore = coreDist < 0.14;
    const g = ctx.createRadialGradient(x, baseY, 2, x, baseY, r);
    const col = isCore
      ? (i % 2 === 0 ? '251,191,36' : '168,85,247')
      : (i % 3 === 0 ? '56,189,248' : (i % 3 === 1 ? '99,102,241' : '192,132,252'));
    const alpha = isCore ? 0.085 : 0.055;
    g.addColorStop(0, `rgba(${col},${alpha})`);
    g.addColorStop(0.55, `rgba(${col},${alpha * 0.35})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, baseY, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Dark molecular dust rifts cutting across the Milky Way band
  for (let i = 0; i < 180; i += 1) {
    const x = (i * 113) % w;
    const y = bandYAt(x) + (hash2(i, 19) - 0.5) * 44;
    const r = 18 + (i % 34);
    const dg = ctx.createRadialGradient(x, y, 2, x, y, r);
    dg.addColorStop(0, 'rgba(1,3,10,0.42)');
    dg.addColorStop(1, 'rgba(1,3,10,0)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft unresolved background starlight (bright crisp stars come from GLSL Points)
  for (let i = 0; i < 4200; i += 1) {
    const x = hash2(i, 1) * w;
    const nearBand = i % 3 !== 0;
    const spread = (hash2(i, 2) + hash2(i, 5) - 1) * (nearBand ? 140 : h * 0.5);
    const y = Math.max(0, Math.min(h - 1, (nearBand ? bandYAt(x) : h * 0.5) + spread));
    ctx.fillStyle = i % 9 === 0 ? 'rgba(186,230,253,0.42)' : (i % 13 === 0 ? 'rgba(253,230,138,0.42)' : 'rgba(226,232,240,0.34)');
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStarfield(count = 5600) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const tints = [
    new THREE.Color(0x93c5fd), // O/B blue-white
    new THREE.Color(0xe0f2fe), // A white-blue
    new THREE.Color(0xfef9c3), // F/G solar
    new THREE.Color(0xfdba74), // K orange
    new THREE.Color(0xffffff)
  ];

  for (let i = 0; i < count; i += 1) {
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * Math.PI * 2;
    const r = 1150 + Math.random() * 180;
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(phi);
    pos[i * 3 + 1] = r * u;
    pos[i * 3 + 2] = r * s * Math.sin(phi);
    const c = tints[i % tints.length];
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    sizes[i] = i % 19 === 0 ? 5.6 + Math.random() * 3.4 : 2.1 + Math.random() * 2.5;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = 0.72 + 0.28 * sin(uTime * 1.3 + aPhase);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float core = exp(-d * d * 24.0);
        if (core < 0.02) discard;
        gl_FragColor = vec4(vColor, core * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  return { points: new THREE.Points(geo, mat), geo, mat };
}

function makeGlowSprite(colorInner, colorMid, size) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 3, 128, 128, 128);
  g.addColorStop(0, colorInner);
  g.addColorStop(0.28, colorMid);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(size, size, 1);
  return { sprite: sp, tex, mat };
}

function makeSunShaderMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      varying vec3 vViewDir;
      void main() {
        vPos = normalize(position);
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPos;
      varying vec3 vViewDir;

      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
      }
      float noise3(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }
      float fbm3(vec3 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise3(p);
          p = p * 2.15 + vec3(0.11 * uTime, -0.08 * uTime, 0.06 * uTime);
          a *= 0.5;
        }
        return v;
      }
      void main() {
        float n = fbm3(vPos * 6.5 + vec3(uTime * 0.14));
        float spots = smoothstep(0.28, 0.72, n);
        vec3 deepOrange = vec3(0.95, 0.34, 0.04);
        vec3 solarGold = vec3(1.0, 0.78, 0.22);
        vec3 hotCore = vec3(1.0, 0.98, 0.85);
        vec3 col = mix(deepOrange, solarGold, spots);
        col = mix(col, hotCore, smoothstep(0.68, 0.92, n));
        float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 2.2);
        col += vec3(1.0, 0.55, 0.12) * fresnel * 0.65;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
}

function makePlanetMaps(kind) {
  const w = 1024, h = 512;
  const colC = document.createElement('canvas'); colC.width = w; colC.height = h;
  const bmpC = document.createElement('canvas'); bmpC.width = w; bmpC.height = h;
  const cCtx = colC.getContext('2d'), bCtx = bmpC.getContext('2d');
  const colImg = cCtx.createImageData(w, h), bmpImg = bCtx.createImageData(w, h);
  const cd = colImg.data, bd = bmpImg.data;

  for (let y = 0; y < h; y += 1) {
    const v = y / h, lat = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < w; x += 1) {
      const u = x / w, idx = (y * w + x) * 4;
      const n1 = fbm2(u * 8 + (kind === 'mars' ? 3 : 1), v * 4, 4);
      const n2 = fbm2(u * 22 + 9, v * 11, 3);
      let r = 140, g = 140, b = 140, elev = 128;

      if (kind === 'mercury') {
        const reg = 95 + n1 * 72 + (n2 - 0.5) * 28;
        r = reg * 0.98; g = reg * 0.96; b = reg * 0.94;
        elev = 90 + n2 * 130;
      } else if (kind === 'moon') {
        const maria = n1 < 0.43 ? 0.62 : 1.0;
        const base = (128 + n2 * 64) * maria;
        r = base; g = base * 1.01; b = base * 1.03;
        elev = 85 + n1 * 90 + n2 * 65;
      } else if (kind === 'venus') {
        const swirl = fbm2(u * 6 + Math.sin(v * 9) * 0.4, v * 12, 4);
        r = 212 + swirl * 40; g = 158 + swirl * 54; b = 82 + swirl * 48;
        elev = 110 + swirl * 45;
      } else if (kind === 'mars') {
        const ice = lat > 0.88 - n2 * 0.06;
        if (ice) {
          r = 242; g = 245; b = 250; elev = 180;
        } else {
          const darkBasin = n1 < 0.42;
          r = darkBasin ? 132 + n2 * 36 : 196 + n2 * 45;
          g = darkBasin ? 66 + n2 * 24 : 92 + n2 * 34;
          b = darkBasin ? 42 + n2 * 16 : 52 + n2 * 22;
          elev = darkBasin ? 75 + n2 * 60 : 135 + n2 * 95;
        }
      } else if (kind === 'jupiter') {
        const band = Math.sin(v * 34 + n1 * 4.2) * 0.5 + 0.5;
        const eddy = fbm2(u * 14 + band * 0.4, v * 18, 3);
        const dx = (u - 0.62) * 2.4, dy = (v - 0.61) * 6.0;
        const grs = dx * dx + dy * dy < 0.016;
        if (grs) {
          r = 216; g = 92; b = 56;
        } else {
          r = 166 + band * 76 + eddy * 18;
          g = 118 + band * 96 + eddy * 16;
          b = 76 + band * 98;
        }
        elev = 115 + band * 40;
      } else { // saturn
        const band = Math.sin(v * 28 + n1 * 2.0) * 0.5 + 0.5;
        r = 198 + band * 46; g = 172 + band * 48; b = 118 + band * 46;
        elev = 118 + band * 25;
      }

      cd[idx] = Math.max(0, Math.min(255, r));
      cd[idx + 1] = Math.max(0, Math.min(255, g));
      cd[idx + 2] = Math.max(0, Math.min(255, b));
      cd[idx + 3] = 255;

      const ev = Math.max(0, Math.min(255, elev));
      bd[idx] = ev; bd[idx + 1] = ev; bd[idx + 2] = ev; bd[idx + 3] = 255;
    }
  }
  cCtx.putImageData(colImg, 0, 0);
  bCtx.putImageData(bmpImg, 0, 0);

  // Stamp sharp multi-scale craters onto Mercury & Moon
  if (kind === 'moon' || kind === 'mercury') {
    const numCraters = kind === 'mercury' ? 210 : 170;
    for (let i = 0; i < numCraters; i += 1) {
      const cx = hash2(i, 11) * w, cy = 24 + hash2(i, 23) * (h - 48);
      const rad = 3 + Math.pow(hash2(i, 37), 2) * 28;
      cCtx.strokeStyle = 'rgba(226,232,240,0.28)';
      cCtx.lineWidth = Math.max(1, rad * 0.14);
      cCtx.beginPath(); cCtx.arc(cx, cy, rad, 0, Math.PI * 2); cCtx.stroke();
      cCtx.fillStyle = 'rgba(30,41,59,0.28)';
      cCtx.beginPath(); cCtx.arc(cx + 1, cy + 1, rad * 0.78, 0, Math.PI * 2); cCtx.fill();

      bCtx.fillStyle = 'rgba(40,40,40,0.45)';
      bCtx.beginPath(); bCtx.arc(cx, cy, rad * 0.76, 0, Math.PI * 2); bCtx.fill();
      bCtx.strokeStyle = 'rgba(240,240,240,0.5)';
      bCtx.lineWidth = Math.max(1.2, rad * 0.16);
      bCtx.beginPath(); bCtx.arc(cx, cy, rad, 0, Math.PI * 2); bCtx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(colC); map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bmpC);
  return { map, bumpMap };
}

function makeSaturnRingTexture() {
  const w = 512, h = 16;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  for (let x = 0; x < w; x += 1) {
    const t = x / w;
    const cassini = t > 0.62 && t < 0.69;
    const encke = t > 0.88 && t < 0.895;
    const fadeEdge = t < 0.04 || t > 0.97;
    if (cassini || encke || fadeEdge) {
      ctx.fillStyle = 'rgba(0,0,0,0)';
    } else {
      const ripple = 0.55 + 0.35 * Math.sin(t * 145) + 0.1 * Math.cos(t * 42);
      const r = Math.round(215 + ripple * 34), g = Math.round(188 + ripple * 32), b = Math.round(140 + ripple * 28);
      const a = t < 0.2 ? 0.25 + t * 1.4 : Math.max(0.28, Math.min(0.92, ripple * 0.88));
      ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(2)})`;
    }
    ctx.fillRect(x, 0, 1, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRadialRingGeo(innerR, outerR, segs = 96) {
  const geo = new THREE.RingGeometry(innerR, outerR, segs, 1);
  const pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const t = (v.length() - innerR) / (outerR - innerR);
    uv.setXY(i, Math.max(0, Math.min(1, t)), 0.5);
  }
  return geo;
}

function makeLabelSprite(text, color = '#94a3b8') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(4,10,22,0.72)';
  ctx.fillRect(16, 12, 224, 40);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.strokeRect(16, 12, 224, 40);
  ctx.fillStyle = color;
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.88, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(9.5, 2.4, 1);
  return { sprite: sp, tex, mat };
}

function makeRockyGeo(radius = 1, seed = 1, detail = 2) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  const craterCenters = [
    new THREE.Vector3(Math.sin(seed * 1.3), Math.cos(seed * 2.1), Math.sin(seed * 0.7)).normalize(),
    new THREE.Vector3(-Math.cos(seed * 0.9), Math.sin(seed * 1.7), -Math.cos(seed * 2.3)).normalize()
  ];
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const dir = v.clone().normalize();
    const bump = 0.74 + 0.34 * fbm2(dir.x * 2.2 + seed, dir.y * 2.2 - seed * 0.5, 3)
      + 0.14 * Math.sin(dir.z * 5.2 + seed * 1.9);
    let dent = 1.0;
    craterCenters.forEach((cr) => {
      const ang = dir.distanceTo(cr);
      if (ang < 0.42) dent -= (0.42 - ang) * 0.45;
    });
    v.multiplyScalar(bump * dent);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createWakeParticles(colorHex, count = 24) {
  const pos = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: colorHex, size: 0.08, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false
  });
  return { points: new THREE.Points(geo, mat), pos, count, geo, mat };
}

export function createSpaceEnvironment(scene, { moonPos = new THREE.Vector3(-15, 3.2, -16), moonScale = 0.65 } = {}) {
  const disposables = [], track = (o) => { disposables.push(o); return o; };

  // 1. 2048x1024 Milky Way sky-dome
  const skyTex = track(makeMilkyWayTexture());
  const skyMat = track(new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false }));
  const sky = new THREE.Mesh(track(new THREE.SphereGeometry(1480, 48, 32)), skyMat);
  sky.rotation.z = 0.38;
  scene.add(sky);

  // 2. 5,600 spectral stars with custom soft-glow GLSL shader
  const stars = makeStarfield(5600);
  track(stars.geo); track(stars.mat);
  scene.add(stars.points);

  // 3. Blazing GLSL Sun + Corona Sprites
  const sunPos = new THREE.Vector3(260, 0, 0);
  const sunGroup = new THREE.Group();
  sunGroup.position.copy(sunPos);
  const sunMat = track(makeSunShaderMaterial());
  sunGroup.add(new THREE.Mesh(track(new THREE.SphereGeometry(15, 48, 32)), sunMat));
  const c1 = makeGlowSprite('rgba(255,252,228,0.96)', 'rgba(251,146,60,0.42)', 68);
  const c2 = makeGlowSprite('rgba(253,224,71,0.34)', 'rgba(234,88,12,0)', 122);
  track(c1.tex); track(c1.mat); track(c2.tex); track(c2.mat);
  sunGroup.add(c1.sprite, c2.sprite);
  scene.add(sunGroup);

  // 4. High-detail Cratered Moon
  const moonMaps = makePlanetMaps('moon');
  track(moonMaps.map); track(moonMaps.bumpMap);
  const moon = new THREE.Mesh(
    track(new THREE.SphereGeometry(moonScale, 36, 24)),
    track(new THREE.MeshStandardMaterial({ map: moonMaps.map, bumpMap: moonMaps.bumpMap, bumpScale: 0.035, roughness: 0.92 }))
  );
  moon.position.copy(moonPos);
  scene.add(moon);

  // Earth heliocentric orbit arc reference around Sun
  const earthOrbitR = sunPos.length();
  const earthGuide = new THREE.Mesh(
    track(new THREE.RingGeometry(earthOrbitR - 0.16, earthOrbitR + 0.16, 128)),
    track(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.14, side: THREE.DoubleSide }))
  );
  earthGuide.rotation.x = Math.PI / 2;
  earthGuide.position.copy(sunPos);
  scene.add(earthGuide);

  // 5. Scaled Ecliptic Planets (Mercury, Venus, Mars, Jupiter, Saturn) with bump maps, rings & labels
  const planetSpecs = [
    { kind: 'mercury', label: 'MERCURY', color: '#cbd5e1', orbR: 62, ang: 2.72, y: 0.6, rad: 1.05, spin: 0.08 },
    { kind: 'venus', label: 'VENUS', color: '#fde68a', orbR: 138, ang: 2.84, y: -0.7, rad: 1.9, spin: 0.05 },
    { kind: 'mars', label: 'MARS', color: '#fb923c', orbR: 340, ang: 3.46, y: -1.8, rad: 1.48, spin: 0.11 },
    { kind: 'jupiter', label: 'JUPITER', color: '#fdba74', orbR: 485, ang: 2.81, y: 4.5, rad: 6.8, spin: 0.16 },
    { kind: 'saturn', label: 'SATURN', color: '#fcd34d', orbR: 585, ang: 3.72, y: -4.0, rad: 5.5, spin: 0.14 }
  ];

  const planets = planetSpecs.map((spec) => {
    const grp = new THREE.Group();
    const px = sunPos.x + Math.cos(spec.ang) * spec.orbR;
    const pz = sunPos.z + Math.sin(spec.ang) * spec.orbR;
    grp.position.set(px, spec.y, pz);

    const pMaps = makePlanetMaps(spec.kind);
    track(pMaps.map); track(pMaps.bumpMap);
    const sphere = new THREE.Mesh(
      track(new THREE.SphereGeometry(spec.rad, 40, 28)),
      track(new THREE.MeshStandardMaterial({
        map: pMaps.map,
        bumpMap: pMaps.bumpMap,
        bumpScale: spec.kind === 'jupiter' || spec.kind === 'saturn' ? 0.02 : 0.06,
        roughness: spec.kind === 'venus' ? 0.65 : 0.85
      }))
    );
    grp.add(sphere);

    if (spec.kind === 'saturn') {
      const rTex = track(makeSaturnRingTexture());
      const ring = new THREE.Mesh(
        track(makeRadialRingGeo(spec.rad * 1.38, spec.rad * 2.45, 96)),
        track(new THREE.MeshBasicMaterial({ map: rTex, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }))
      );
      ring.rotation.set(Math.PI * 0.42, 0.22, 0.16);
      grp.add(ring);
    }

    const lbl = makeLabelSprite(spec.label, spec.color);
    track(lbl.tex); track(lbl.mat);
    lbl.sprite.position.set(0, spec.rad + 3.2, 0);
    grp.add(lbl.sprite);

    const guide = new THREE.Mesh(
      track(new THREE.RingGeometry(spec.orbR - 0.18, spec.orbR + 0.18, 128)),
      track(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.12, side: THREE.DoubleSide }))
    );
    guide.rotation.x = Math.PI / 2;
    guide.position.copy(sunPos);
    scene.add(guide);
    scene.add(grp);
    return { sphere, spin: spec.spin };
  });

  // 6. Main Asteroid Belt (3 distinct rock geometries x 220 = 660 instanced asteroids)
  const beltBatches = [11, 29, 47].map((seed, batchIdx) => {
    const count = 220;
    const geo = track(makeRockyGeo(1, seed, 1));
    const mat = track(new THREE.MeshStandardMaterial({
      color: batchIdx === 0 ? 0x94a3b8 : (batchIdx === 1 ? 0xa8a29e : 0x78716c),
      roughness: 0.9,
      metalness: 0.16
    }));
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const items = [];
    for (let i = 0; i < count; i += 1) {
      items.push({
        angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.18,
        rad: 382 + Math.random() * 48,
        y: (Math.random() - 0.5) * 18,
        sc: 0.65 + Math.random() * 1.65,
        rx: Math.random() * 3.1,
        ry: Math.random() * 3.1,
        spd: (0.004 + Math.random() * 0.008) * 0.35
      });
    }
    scene.add(mesh);
    return { mesh, items };
  });
  const dummy = new THREE.Object3D();

  // 7. 7 Detailed Near-Earth Asteroids (NEAs) with glowing dust/ion wakes
  const nearAsteroids = Array.from({ length: 7 }, (_, i) => {
    const aRad = 0.28 + (i % 3) * 0.095;
    const group = new THREE.Group();
    const rock = new THREE.Mesh(
      track(makeRockyGeo(aRad, 60 + i * 7, 2)),
      track(new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xa8a29e : 0x9ca3af, roughness: 0.88, metalness: 0.18, flatShading: true
      }))
    );
    const coma = makeGlowSprite('rgba(56,189,248,0.38)', 'rgba(56,189,248,0)', aRad * 4.4);
    track(coma.tex); track(coma.mat);
    const wake = createWakeParticles(0x67e8f9, 26);
    track(wake.geo); track(wake.mat);
    group.add(rock, coma.sprite);
    scene.add(group, wake.points);

    const orb = 5.4 + i * 1.12, ang = (i / 7) * Math.PI * 2, inc = (i % 2 ? 1 : -1) * 0.28;
    const trail = Array.from({ length: wake.count }, () => new THREE.Vector3());
    return { id: `NEA-${2026 + i}`, mesh: group, rock, wake, trail, orb, ang, inc, spd: 0.055 + i * 0.011 };
  });

  function update(dt, elapsed) {
    stars.mat.uniforms.uTime.value = elapsed;
    sunMat.uniforms.uTime.value = elapsed;
    moon.rotation.y += dt * 0.05;
    planets.forEach((p) => { p.sphere.rotation.y += dt * p.spin; });

    beltBatches.forEach(({ mesh, items }) => {
      items.forEach((b, i) => {
        b.angle += dt * b.spd;
        dummy.position.set(sunPos.x + Math.cos(b.angle) * b.rad, b.y, sunPos.z + Math.sin(b.angle) * b.rad);
        dummy.rotation.set(b.rx + elapsed * 0.22, b.ry + elapsed * 0.34, 0);
        dummy.scale.setScalar(b.sc);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });

    nearAsteroids.forEach((a) => {
      a.ang += dt * a.spd;
      a.rock.rotation.x += dt * 0.48;
      a.rock.rotation.y += dt * 0.65;
      const nx = Math.cos(a.ang) * a.orb;
      const ny = Math.sin(a.ang * 2) * a.orb * a.inc;
      const nz = Math.sin(a.ang) * a.orb;
      a.mesh.position.set(nx, ny, nz);

      // Update dust/ion wake behind NEA along anti-velocity tangent
      const vx = -Math.sin(a.ang), vy = 2 * Math.cos(a.ang * 2) * a.inc, vz = Math.cos(a.ang);
      const len = Math.hypot(vx, vy, vz) || 1;
      for (let k = 0; k < a.wake.count; k += 1) {
        const back = k * 0.085;
        const jx = (hash2(k, 4) - 0.5) * 0.09 * (k / a.wake.count);
        const jy = (hash2(k, 8) - 0.5) * 0.09 * (k / a.wake.count);
        a.wake.pos[k * 3] = nx - (vx / len) * back + jx;
        a.wake.pos[k * 3 + 1] = ny - (vy / len) * back + jy;
        a.wake.pos[k * 3 + 2] = nz - (vz / len) * back;
      }
      a.wake.geo.attributes.position.needsUpdate = true;
    });
  }

  function findNearestNea(satPos) {
    let best = nearAsteroids[0], bestD = Infinity;
    nearAsteroids.forEach((a) => {
      const d = a.mesh.position.distanceTo(satPos);
      if (d < bestD) { bestD = d; best = a; }
    });
    return { nea: best, dist: bestD };
  }

  return {
    sunPos, moon, nearAsteroids, update, findNearestNea,
    dispose() { disposables.forEach((d) => d.dispose?.()); }
  };
}
