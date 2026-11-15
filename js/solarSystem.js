import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

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

export function createBloomComposer(renderer, scene, camera, width, height, { strength = 0.65, radius = 0.45, threshold = 0.78 } = {}) {
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), strength, radius, threshold);
  composer.addPass(bloomPass);
  const outputPass = new OutputPass();
  composer.addPass(outputPass);
  return {
    composer,
    bloomPass,
    setSize(w, h) {
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    },
    dispose() {
      bloomPass.dispose();
      outputPass.dispose?.();
      composer.dispose();
    }
  };
}

const skyCache = { tex: null };
const bodyTexCache = new Map();
const ringTexCache = new Map();

export function isCachedSpaceTexture(tex) {
  if (!tex) return false;
  if (tex === skyCache.tex) return true;
  for (const v of bodyTexCache.values()) if (v.map === tex || v.bumpMap === tex) return true;
  for (const r of ringTexCache.values()) if (r === tex) return true;
  return false;
}

function getMilkyWayTexture() {
  if (skyCache.tex) return skyCache.tex;
  const w = 2048, h = 1024;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#010207');
  bg.addColorStop(0.5, '#040919');
  bg.addColorStop(1, '#010207');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const bandYAt = (x) => {
    const u = (x / w) * Math.PI * 2;
    return h * 0.5 + Math.sin(u + 0.6) * 195 + Math.cos(u * 2.0 - 0.4) * 34;
  };

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 680; i += 1) {
    const x = (i * 157 + hash2(i, 3) * 80) % w;
    const baseY = bandYAt(x) + (hash2(i, 9) - 0.5) * 155;
    const r = 36 + (i % 92);
    const coreDist = Math.abs(((x / w) - 0.36 + 1.5) % 1 - 0.5);
    const isCore = coreDist < 0.14;
    const g = ctx.createRadialGradient(x, baseY, 2, x, baseY, r);
    const col = isCore
      ? (i % 2 === 0 ? '251,191,36' : '168,85,247')
      : (i % 3 === 0 ? '56,189,248' : (i % 3 === 1 ? '99,102,241' : '192,132,252'));
    const alpha = isCore ? 0.09 : 0.055;
    g.addColorStop(0, `rgba(${col},${alpha})`);
    g.addColorStop(0.55, `rgba(${col},${alpha * 0.35})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, baseY, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (let i = 0; i < 190; i += 1) {
    const x = (i * 113) % w;
    const y = bandYAt(x) + (hash2(i, 19) - 0.5) * 44;
    const r = 18 + (i % 36);
    const dg = ctx.createRadialGradient(x, y, 2, x, y, r);
    dg.addColorStop(0, 'rgba(1,3,10,0.46)');
    dg.addColorStop(1, 'rgba(1,3,10,0)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 4200; i += 1) {
    const x = hash2(i, 1) * w;
    const nearBand = i % 3 !== 0;
    const spread = (hash2(i, 2) + hash2(i, 5) - 1) * (nearBand ? 140 : h * 0.5);
    const y = Math.max(0, Math.min(h - 1, (nearBand ? bandYAt(x) : h * 0.5) + spread));
    ctx.fillStyle = i % 9 === 0 ? 'rgba(186,230,253,0.42)' : (i % 13 === 0 ? 'rgba(253,230,138,0.42)' : 'rgba(226,232,240,0.34)');
    ctx.fillRect(x, y, 1, 1);
  }

  skyCache.tex = new THREE.CanvasTexture(c);
  skyCache.tex.colorSpace = THREE.SRGBColorSpace;
  return skyCache.tex;
}

function getPlanetMaps(kind) {
  if (bodyTexCache.has(kind)) return bodyTexCache.get(kind);
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
        const reg = 92 + n1 * 76 + (n2 - 0.5) * 30;
        r = reg * 0.98; g = reg * 0.96; b = reg * 0.94;
        elev = 88 + n2 * 135;
      } else if (kind === 'moon') {
        const maria = n1 < 0.43 ? 0.62 : 1.0;
        const base = (128 + n2 * 64) * maria;
        r = base; g = base * 1.01; b = base * 1.03;
        elev = 85 + n1 * 90 + n2 * 65;
      } else if (kind === 'venus') {
        const swirl = fbm2(u * 6 + Math.sin(v * 9) * 0.45, v * 12, 4);
        r = 212 + swirl * 42; g = 156 + swirl * 56; b = 82 + swirl * 48;
        elev = 110 + swirl * 45;
      } else if (kind === 'mars') {
        if (lat > 0.88 - n2 * 0.06) {
          r = 242; g = 246; b = 252; elev = 180;
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
        if (dx * dx + dy * dy < 0.017) { r = 218; g = 88; b = 52; }
        else { r = 166 + band * 76 + eddy * 18; g = 118 + band * 96 + eddy * 16; b = 76 + band * 98; }
        elev = 115 + band * 40;
      } else if (kind === 'saturn') {
        const band = Math.sin(v * 28 + n1 * 2.2) * 0.5 + 0.5;
        r = 198 + band * 46; g = 172 + band * 48; b = 118 + band * 46;
        elev = 118 + band * 25;
      } else if (kind === 'uranus') {
        const band = Math.sin(v * 18 + n1 * 1.4) * 0.5 + 0.5;
        r = 112 + band * 44; g = 210 + band * 34; b = 224 + band * 26;
        elev = 122 + band * 18;
      } else { // neptune
        const band = Math.sin(v * 24 + n1 * 2.6) * 0.5 + 0.5;
        const dx = (u - 0.45) * 3.0, dy = (v - 0.58) * 6.8;
        const darkSpot = dx * dx + dy * dy < 0.014;
        r = darkSpot ? 22 : 34 + band * 38;
        g = darkSpot ? 48 : 88 + band * 64;
        b = darkSpot ? 132 : 206 + band * 44;
        elev = 120 + band * 24;
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

  if (kind === 'moon' || kind === 'mercury') {
    const numCraters = kind === 'mercury' ? 220 : 180;
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

  const res = {
    map: Object.assign(new THREE.CanvasTexture(colC), { colorSpace: THREE.SRGBColorSpace }),
    bumpMap: new THREE.CanvasTexture(bmpC)
  };
  bodyTexCache.set(kind, res);
  return res;
}

function getRingTexture(kind = 'saturn') {
  if (ringTexCache.has(kind)) return ringTexCache.get(kind);
  const w = 512, h = 16;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  for (let x = 0; x < w; x += 1) {
    const t = x / w;
    if (kind === 'uranus') {
      const band = (t > 0.25 && t < 0.34) || (t > 0.68 && t < 0.82);
      ctx.fillStyle = band ? 'rgba(165,243,252,0.34)' : 'rgba(165,243,252,0.04)';
    } else {
      const cassini = t > 0.62 && t < 0.69;
      const encke = t > 0.88 && t < 0.895;
      const fadeEdge = t < 0.04 || t > 0.97;
      if (cassini || encke || fadeEdge) ctx.fillStyle = 'rgba(0,0,0,0)';
      else {
        const ripple = 0.55 + 0.35 * Math.sin(t * 145) + 0.1 * Math.cos(t * 42);
        const r = Math.round(215 + ripple * 34), g = Math.round(188 + ripple * 32), b = Math.round(140 + ripple * 28);
        const a = t < 0.2 ? 0.25 + t * 1.4 : Math.max(0.28, Math.min(0.92, ripple * 0.88));
        ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(2)})`;
      }
    }
    ctx.fillRect(x, 0, 1, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  ringTexCache.set(kind, tex);
  return tex;
}

function makeRadialRingGeo(innerR, outerR, segs = 96) {
  const geo = new THREE.RingGeometry(innerR, outerR, segs, 1);
  const pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, Math.max(0, Math.min(1, (v.length() - innerR) / (outerR - innerR))), 0.5);
  }
  return geo;
}

function makeStarfield(count = 5800) {
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const sizes = new Float32Array(count), phases = new Float32Array(count);
  const tints = [new THREE.Color(0x93c5fd), new THREE.Color(0xe0f2fe), new THREE.Color(0xfef9c3), new THREE.Color(0xfdba74), new THREE.Color(0xffffff)];
  for (let i = 0; i < count; i += 1) {
    const u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, r = 1350 + Math.random() * 260, s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(phi); pos[i * 3 + 1] = r * u; pos[i * 3 + 2] = r * s * Math.sin(phi);
    const c = tints[i % tints.length];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    sizes[i] = i % 19 === 0 ? 5.8 + Math.random() * 3.5 : 2.1 + Math.random() * 2.6;
    phases[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uPixelRatio;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vColor = aColor; vAlpha = 0.72 + 0.28 * sin(uTime * 1.3 + aPhase);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio;
      }
    `,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5; float core = exp(-dot(uv, uv) * 24.0);
        if (core < 0.02) discard;
        gl_FragColor = vec4(vColor, core * vAlpha);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  return { points: new THREE.Points(geo, mat), geo, mat };
}

function makeGlowSprite(colorInner, colorMid, size) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(128, 128, 3, 128, 128, 128);
  g.addColorStop(0, colorInner); g.addColorStop(0.28, colorMid); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sp = new THREE.Sprite(mat); sp.scale.set(size, size, 1);
  return { sprite: sp, tex, mat };
}

function makePlasmaSunMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vPos; varying vec3 vViewDir;
      void main() {
        vPos = normalize(position);
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime; varying vec3 vNormal; varying vec3 vPos; varying vec3 vViewDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float noise3(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
        );
      }
      float fbm3(vec3 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise3(p);
          p = p * 2.12 + vec3(0.11 * uTime, -0.08 * uTime, 0.07 * uTime);
          a *= 0.5;
        }
        return v;
      }
      void main() {
        float macro = fbm3(vPos * 4.4 + vec3(uTime * 0.08, -uTime * 0.05, 0.0));
        float gran = fbm3(vPos * 12.5 - vec3(uTime * 0.14));
        float cell = mix(macro, gran, 0.52);
        float flares = pow(clamp(fbm3(vPos * 8.8 + vec3(-uTime * 0.16, uTime * 0.12, 0.0)), 0.0, 1.0), 2.4);

        // Dark magnetic sunspot clusters along solar active latitudes
        float latBand = exp(-pow(abs(vPos.y) * 3.2, 2.0));
        float spotField = fbm3(vPos * 3.1 + vec3(0.0, uTime * 0.02, 0.0)) * (0.45 + 0.55 * latBand);
        float spotUmbra = smoothstep(0.68, 0.84, spotField);

        vec3 ember = vec3(0.36, 0.09, 0.01);
        vec3 deepAmber = vec3(0.82, 0.25, 0.02);
        vec3 richGold = vec3(0.98, 0.58, 0.07);
        vec3 whiteGold = vec3(1.16, 0.92, 0.46);

        vec3 col = mix(deepAmber, richGold, smoothstep(0.28, 0.72, cell));
        col = mix(col, whiteGold, smoothstep(0.62, 0.90, cell * 0.65 + flares * 0.58));
        col = mix(col, ember, spotUmbra * 0.78);

        // Solar limb darkening preserves crisp fiery sphere edge under bloom
        float mu = max(0.0, dot(normalize(vNormal), normalize(vViewDir)));
        float limbDark = 0.34 + 0.66 * pow(mu, 0.48);
        vec3 limbTint = mix(vec3(0.92, 0.30, 0.05), vec3(1.0), pow(mu, 0.6));
        col *= limbDark * limbTint;
        col = min(col, vec3(1.15, 0.96, 0.62));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
}

function makeSolarCoronaMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vViewDir; varying vec3 vLocalDir;
      void main() {
        vLocalDir = normalize(position);
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime; varying vec3 vNormal; varying vec3 vViewDir; varying vec3 vLocalDir;
      void main() {
        float fres = clamp(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 0.0, 1.0);
        float halo = pow(fres, 2.7);
        float ang = atan(vLocalDir.y, vLocalDir.z);
        float streamer = 0.72 + 0.28 * sin(ang * 9.0 + uTime * 0.55) * cos(vLocalDir.x * 7.0 - uTime * 0.4);
        vec3 cInner = vec3(1.0, 0.62, 0.16);
        vec3 cOuter = vec3(0.88, 0.28, 0.03);
        vec3 col = mix(cOuter, cInner, halo) * halo * streamer * 0.72;
        gl_FragColor = vec4(col, halo * 0.62);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

function makeCoronaStreamerSprite(size, rayCount, seed) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d'), cx = 256, cy = 256;
  const ring = ctx.createRadialGradient(cx, cy, 34, cx, cy, 248);
  ring.addColorStop(0.0, 'rgba(255,210,120,0.0)');
  ring.addColorStop(0.18, 'rgba(251,146,60,0.12)');
  ring.addColorStop(0.32, 'rgba(245,158,11,0.34)');
  ring.addColorStop(0.54, 'rgba(234,88,12,0.14)');
  ring.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = ring;
  ctx.fillRect(0, 0, 512, 512);

  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < rayCount; i += 1) {
    const a = (i / rayCount) * Math.PI * 2 + hash2(i, seed) * 0.25;
    const len = 145 + hash2(seed, i) * 95;
    const w = 10 + hash2(i + 7, seed) * 14;
    ctx.save();
    ctx.rotate(a);
    const rg = ctx.createLinearGradient(56, 0, len, 0);
    rg.addColorStop(0, 'rgba(255,220,140,0.0)');
    rg.addColorStop(0.25, 'rgba(251,146,60,0.22)');
    rg.addColorStop(0.65, 'rgba(234,88,12,0.09)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(52, -w * 0.35);
    ctx.lineTo(len, 0);
    ctx.lineTo(52, w * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return { sprite, tex, mat };
}

function makeLabelSprite(text, color = '#94a3b8') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(4,10,22,0.78)'; ctx.fillRect(16, 12, 224, 40);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(16, 12, 224, 40);
  ctx.fillStyle = color; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 33);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false });
  const sp = new THREE.Sprite(mat); sp.scale.set(10.5, 2.6, 1);
  return { sprite: sp, tex, mat };
}

function makeRockyGeo(radius = 1, seed = 1, detail = 2) {
  const geo = new THREE.IcosahedronGeometry(radius, detail), pos = geo.attributes.position, v = new THREE.Vector3();
  const craters = [
    new THREE.Vector3(Math.sin(seed * 1.3), Math.cos(seed * 2.1), Math.sin(seed * 0.7)).normalize(),
    new THREE.Vector3(-Math.cos(seed * 0.9), Math.sin(seed * 1.7), -Math.cos(seed * 2.3)).normalize()
  ];
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const dir = v.clone().normalize();
    const bump = 0.74 + 0.34 * fbm2(dir.x * 2.2 + seed, dir.y * 2.2 - seed * 0.5, 3) + 0.14 * Math.sin(dir.z * 5.2 + seed * 1.9);
    let dent = 1.0;
    craters.forEach((cr) => { const ang = dir.distanceTo(cr); if (ang < 0.42) dent -= (0.42 - ang) * 0.45; });
    v.multiplyScalar(bump * dent); pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createParticleStream(colorHex, count, size = 0.09) {
  const pos = new Float32Array(count * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: colorHex, size, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false });
  return { points: new THREE.Points(geo, mat), pos, count, geo, mat };
}

export function createSpaceEnvironment(scene, { moonPos = new THREE.Vector3(-15, 3.2, -16), moonScale = 0.65 } = {}) {
  const disposables = [], track = (o) => { disposables.push(o); return o; };
  const holoProxies = [];
  const holoTargets = {};
  const proxyMat = track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
  const addHoloProxy = (parent, radius, holoId, visualRadius, getFocusPos, camOffset) => {
    const proxy = new THREE.Mesh(track(new THREE.SphereGeometry(radius, 12, 10)), proxyMat);
    proxy.userData.holoId = holoId;
    proxy.userData.holoRadius = visualRadius;
    parent.add(proxy);
    holoProxies.push(proxy);
    if (!holoTargets[holoId]) {
      holoTargets[holoId] = { id: holoId, visualRadius, getPos: getFocusPos, camOffset: camOffset.clone() };
    }
    return proxy;
  };

  // 1. Cached 2048x1024 Milky Way sky-dome + 5,800 spectral stars
  const sky = new THREE.Mesh(
    track(new THREE.SphereGeometry(1850, 48, 32)),
    track(new THREE.MeshBasicMaterial({ map: getMilkyWayTexture(), side: THREE.BackSide, depthWrite: false }))
  );
  sky.rotation.z = 0.38;
  scene.add(sky);

  const stars = makeStarfield(5800);
  track(stars.geo); track(stars.mat);
  scene.add(stars.points);

  // 2. Animated Boiling Plasma Sun + Volumetric Fresnel Corona + Counter-Rotating Streamers
  const sunPos = new THREE.Vector3(260, 0, 0);
  const sunGroup = new THREE.Group();
  sunGroup.position.copy(sunPos);
  const sunMat = track(makePlasmaSunMaterial());
  const sunSphere = new THREE.Mesh(track(new THREE.SphereGeometry(16, 48, 32)), sunMat);
  const sunCoronaMat = track(makeSolarCoronaMat());
  const sunCoronaHalo = new THREE.Mesh(track(new THREE.SphereGeometry(16 * 1.24, 48, 32)), sunCoronaMat);
  const c1 = makeCoronaStreamerSprite(64, 18, 13);
  const c2 = makeCoronaStreamerSprite(94, 14, 29);
  track(c1.tex); track(c1.mat); track(c2.tex); track(c2.mat);
  sunGroup.add(sunSphere, sunCoronaHalo, c1.sprite, c2.sprite);
  addHoloProxy(sunGroup, 16 * 2.8, 'sun', 17.5, () => sunPos.clone(), new THREE.Vector3(34, 15, 44));
  scene.add(sunGroup);

  // 3. Cratered Moon & Earth heliocentric orbit arc
  const moonMaps = getPlanetMaps('moon');
  const moon = new THREE.Mesh(
    track(new THREE.SphereGeometry(moonScale, 36, 24)),
    track(new THREE.MeshStandardMaterial({ map: moonMaps.map, bumpMap: moonMaps.bumpMap, bumpScale: 0.038, roughness: 0.92 }))
  );
  moon.position.copy(moonPos);
  addHoloProxy(moon, Math.max(moonScale * 2.8, 3.0), 'moon', moonScale, () => moon.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(Math.max(1.8, moonScale * 3.1), Math.max(0.9, moonScale * 1.5), Math.max(2.3, moonScale * 3.8)));
  scene.add(moon);

  const earthGuide = new THREE.Mesh(
    track(new THREE.RingGeometry(259.84, 260.16, 128)),
    track(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.15, side: THREE.DoubleSide }))
  );
  earthGuide.rotation.x = Math.PI / 2; earthGuide.position.copy(sunPos);
  scene.add(earthGuide);

  // 4. All 7 non-Earth Solar System Planets along the ecliptic (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune)
  const planetSpecs = [
    { kind: 'mercury', label: 'MERCURY', color: '#cbd5e1', orbR: 54, ang: 2.72, y: 0.5, rad: 1.05, spin: 0.08 },
    { kind: 'venus', label: 'VENUS', color: '#fde68a', orbR: 128, ang: 2.84, y: -0.6, rad: 1.9, spin: 0.05 },
    { kind: 'mars', label: 'MARS', color: '#fb923c', orbR: 335, ang: 3.45, y: -1.8, rad: 1.5, spin: 0.11 },
    { kind: 'jupiter', label: 'JUPITER', color: '#fdba74', orbR: 495, ang: 2.81, y: 4.5, rad: 6.9, spin: 0.16 },
    { kind: 'saturn', label: 'SATURN', color: '#fcd34d', orbR: 595, ang: 3.68, y: -4.0, rad: 5.6, spin: 0.14 },
    { kind: 'uranus', label: 'URANUS', color: '#67e8f9', orbR: 685, ang: 2.52, y: 3.2, rad: 3.9, spin: 0.13 },
    { kind: 'neptune', label: 'NEPTUNE', color: '#60a5fa', orbR: 765, ang: 3.32, y: -3.5, rad: 3.8, spin: 0.12 }
  ];

  const planets = planetSpecs.map((spec) => {
    const grp = new THREE.Group();
    grp.position.set(sunPos.x + Math.cos(spec.ang) * spec.orbR, spec.y, sunPos.z + Math.sin(spec.ang) * spec.orbR);
    const pMaps = getPlanetMaps(spec.kind);
    const sphere = new THREE.Mesh(
      track(new THREE.SphereGeometry(spec.rad, 40, 28)),
      track(new THREE.MeshStandardMaterial({
        map: pMaps.map, bumpMap: pMaps.bumpMap,
        bumpScale: ['jupiter', 'saturn', 'uranus', 'neptune'].includes(spec.kind) ? 0.02 : 0.06,
        roughness: spec.kind === 'venus' ? 0.65 : 0.85
      }))
    );
    grp.add(sphere);

    if (spec.kind === 'saturn' || spec.kind === 'uranus') {
      const inner = spec.kind === 'saturn' ? spec.rad * 1.38 : spec.rad * 1.48;
      const outer = spec.kind === 'saturn' ? spec.rad * 2.45 : spec.rad * 1.88;
      const ring = new THREE.Mesh(
        track(makeRadialRingGeo(inner, outer, 96)),
        track(new THREE.MeshStandardMaterial({
          map: getRingTexture(spec.kind), side: THREE.DoubleSide, transparent: true, opacity: 0.92, depthWrite: false, roughness: 0.8
        }))
      );
      ring.rotation.set(spec.kind === 'uranus' ? 0.25 : Math.PI * 0.42, 0.22, 0.16);
      grp.add(ring);
    }

    const lbl = makeLabelSprite(spec.label, spec.color);
    track(lbl.tex); track(lbl.mat);
    lbl.sprite.position.set(0, spec.rad + 3.4, 0);
    grp.add(lbl.sprite);

    const visualR = spec.kind === 'saturn' ? spec.rad * 2.45 : (spec.kind === 'uranus' ? spec.rad * 1.88 : spec.rad);
    const hitR = Math.max(spec.rad * 2.8, 10.5);
    const viewScale = Math.max(2.6, spec.rad * 2.4);
    const camOffset = spec.kind === 'saturn'
      ? new THREE.Vector3(viewScale * 1.12, viewScale * 1.18, viewScale * 1.25)
      : (spec.kind === 'uranus'
        ? new THREE.Vector3(viewScale * 1.2, viewScale * 0.9, viewScale * 1.35)
        : new THREE.Vector3(viewScale * 1.15, viewScale * 0.56, viewScale * 1.35));
    addHoloProxy(
      grp,
      hitR,
      spec.kind,
      visualR,
      () => grp.getWorldPosition(new THREE.Vector3()),
      camOffset
    );

    const guide = new THREE.Mesh(
      track(new THREE.RingGeometry(spec.orbR - 0.18, spec.orbR + 0.18, 128)),
      track(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.11, side: THREE.DoubleSide }))
    );
    guide.rotation.x = Math.PI / 2; guide.position.copy(sunPos);
    scene.add(guide, grp);
    return { sphere, spin: spec.spin };
  });

  // Main Asteroid Belt generous torus hit proxy centered on sunPos
  const beltProxy = new THREE.Mesh(track(new THREE.TorusGeometry(405, 24, 8, 48)), proxyMat);
  beltProxy.rotation.x = Math.PI / 2;
  beltProxy.position.copy(sunPos);
  beltProxy.userData.holoId = 'asteroid-belt';
  beltProxy.userData.holoRadius = 22;
  scene.add(beltProxy);
  holoProxies.push(beltProxy);
  const beltFocusPt = new THREE.Vector3(sunPos.x + Math.cos(3.15) * 405, 2, sunPos.z + Math.sin(3.15) * 405);
  holoTargets['asteroid-belt'] = {
    id: 'asteroid-belt',
    visualRadius: 14,
    getPos: () => beltFocusPt.clone(),
    camOffset: new THREE.Vector3(24, 16, 34)
  };

  // 5. 840+ Main Asteroid Belt (3 cratered rock variants x 280 instances)
  const beltBatches = [11, 29, 47].map((seed, bIdx) => {
    const count = 280;
    const mesh = new THREE.InstancedMesh(
      track(makeRockyGeo(1, seed, 1)),
      track(new THREE.MeshStandardMaterial({ color: bIdx === 0 ? 0x94a3b8 : (bIdx === 1 ? 0xa8a29e : 0x78716c), roughness: 0.9, metalness: 0.16 })),
      count
    );
    const items = Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.18,
      rad: 378 + Math.random() * 54,
      y: (Math.random() - 0.5) * 20,
      sc: 0.65 + Math.random() * 1.75,
      rx: Math.random() * 3.1, ry: Math.random() * 3.1,
      spd: (0.004 + Math.random() * 0.008) * 0.35
    }));
    scene.add(mesh);
    return { mesh, items };
  });
  const dummy = new THREE.Object3D();

  // 6. 7 Tumbling Near-Earth Asteroids (NEAs)
  const nearAsteroids = Array.from({ length: 7 }, (_, i) => {
    const aRad = 0.28 + (i % 3) * 0.095;
    const group = new THREE.Group();
    const rock = new THREE.Mesh(
      track(makeRockyGeo(aRad, 60 + i * 7, 2)),
      track(new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xa8a29e : 0x9ca3af, roughness: 0.88, metalness: 0.18, flatShading: true }))
    );
    const coma = makeGlowSprite('rgba(56,189,248,0.38)', 'rgba(56,189,248,0)', aRad * 4.4);
    track(coma.tex); track(coma.mat);
    const wake = createParticleStream(0x67e8f9, 26, 0.08);
    track(wake.geo); track(wake.mat);
    group.add(rock, coma.sprite);
    const neaProxy = new THREE.Mesh(track(new THREE.SphereGeometry(Math.max(aRad * 2.8, 1.3), 8, 8)), proxyMat);
    neaProxy.userData.holoId = 'asteroid-belt';
    group.add(neaProxy);
    holoProxies.push(neaProxy);
    scene.add(group, wake.points);

    const orb = 5.4 + i * 1.12, ang = (i / 7) * Math.PI * 2, inc = (i % 2 ? 1 : -1) * 0.28;
    return { id: `NEA-${2026 + i}`, isComet: false, points: 60, mesh: group, rock, wake, orb, ang, inc, spd: 0.055 + i * 0.011 };
  });

  // 7. Elliptical Deep-Space Comet with Glowing Coma + Dual Cyan Ion & Amber Dust Tails
  const cometGroup = new THREE.Group();
  const cometCore = new THREE.Mesh(
    track(makeRockyGeo(0.46, 99, 2)),
    track(new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x0ea5e9, emissiveIntensity: 0.65, roughness: 0.55 }))
  );
  const cometComa = makeGlowSprite('rgba(224,242,254,0.95)', 'rgba(56,189,248,0.45)', 4.2);
  track(cometComa.tex); track(cometComa.mat);
  const ionTailCone = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.65, 11.5, 18, 1, true)),
    track(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }))
  );
  ionTailCone.rotation.x = -Math.PI / 2; ionTailCone.position.z = 5.75;
  const ionPivot = new THREE.Group(); ionPivot.add(ionTailCone);
  const ionParticles = createParticleStream(0x7dd3fc, 46, 0.14);
  const dustParticles = createParticleStream(0xfbbf24, 42, 0.15);
  track(ionParticles.geo); track(ionParticles.mat);
  track(dustParticles.geo); track(dustParticles.mat);
  cometGroup.add(cometCore, cometComa.sprite, ionPivot);
  addHoloProxy(cometGroup, 2.4, 'comet', 1.4, () => cometGroup.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(4.5, 2.5, 5.8));
  scene.add(cometGroup, ionParticles.points, dustParticles.points);

  const cometTarget = { id: 'C/2026 GOSPACE', isComet: true, points: 100, mesh: cometGroup, phase: 0.45 };
  const antiSun = new THREE.Vector3(), velDir = new THREE.Vector3(), dustDir = new THREE.Vector3();

  function update(dt, elapsed) {
    stars.mat.uniforms.uTime.value = elapsed;
    sunMat.uniforms.uTime.value = elapsed;
    sunCoronaMat.uniforms.uTime.value = elapsed;
    sunSphere.rotation.y += dt * 0.035;
    c1.mat.rotation = elapsed * 0.05;
    c2.mat.rotation = -elapsed * 0.035;
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
      a.ang += dt * a.spd; a.rock.rotation.x += dt * 0.48; a.rock.rotation.y += dt * 0.65;
      const nx = Math.cos(a.ang) * a.orb, ny = Math.sin(a.ang * 2) * a.orb * a.inc, nz = Math.sin(a.ang) * a.orb;
      a.mesh.position.set(nx, ny, nz);
      const vx = -Math.sin(a.ang), vy = 2 * Math.cos(a.ang * 2) * a.inc, vz = Math.cos(a.ang);
      const len = Math.hypot(vx, vy, vz) || 1;
      for (let k = 0; k < a.wake.count; k += 1) {
        const back = k * 0.085;
        a.wake.pos[k * 3] = nx - (vx / len) * back + (hash2(k, 4) - 0.5) * 0.08;
        a.wake.pos[k * 3 + 1] = ny - (vy / len) * back + (hash2(k, 8) - 0.5) * 0.08;
        a.wake.pos[k * 3 + 2] = nz - (vz / len) * back;
      }
      a.wake.geo.attributes.position.needsUpdate = true;
    });

    // Update Elliptical Deep-Space Comet & anti-solar dual tails
    cometTarget.phase += dt * 0.042;
    const ca = cometTarget.phase;
    const cx = 6.5 + Math.cos(ca) * 16.5, cy = Math.sin(ca) * 5.2 + 1.8, cz = Math.sin(ca) * 13.5 - 2.0;
    cometGroup.position.set(cx, cy, cz);
    cometCore.rotation.y += dt * 0.7;
    antiSun.subVectors(cometGroup.position, sunPos).normalize();
    ionPivot.lookAt(cometGroup.position.clone().add(antiSun));

    velDir.set(-Math.sin(ca) * 16.5, Math.cos(ca) * 5.2, Math.cos(ca) * 13.5).normalize();
    dustDir.copy(antiSun).multiplyScalar(0.68).addScaledVector(velDir, -0.52).normalize();
    for (let k = 0; k < ionParticles.count; k += 1) {
      const dist = (k / ionParticles.count) * 11.5;
      const spread = (k / ionParticles.count) * 0.65;
      ionParticles.pos[k * 3] = cx + antiSun.x * dist + (hash2(k, 17) - 0.5) * spread;
      ionParticles.pos[k * 3 + 1] = cy + antiSun.y * dist + (hash2(k, 31) - 0.5) * spread;
      ionParticles.pos[k * 3 + 2] = cz + antiSun.z * dist + (hash2(k, 43) - 0.5) * spread;
    }
    for (let k = 0; k < dustParticles.count; k += 1) {
      const t = k / dustParticles.count, dist = t * 9.8, spread = t * 1.15;
      dustParticles.pos[k * 3] = cx + dustDir.x * dist + (hash2(k, 61) - 0.5) * spread;
      dustParticles.pos[k * 3 + 1] = cy + dustDir.y * dist + (hash2(k, 79) - 0.5) * spread;
      dustParticles.pos[k * 3 + 2] = cz + dustDir.z * dist + (hash2(k, 97) - 0.5) * spread;
    }
    ionParticles.geo.attributes.position.needsUpdate = true;
    dustParticles.geo.attributes.position.needsUpdate = true;
  }

  function findNearestTarget(satPos) {
    let best = nearAsteroids[0], bestD = Infinity;
    [...nearAsteroids, cometTarget].forEach((obj) => {
      const d = obj.mesh.position.distanceTo(satPos);
      if (d < bestD) { bestD = d; best = obj; }
    });
    return { target: best, dist: bestD, comet: cometTarget };
  }

  return {
    sunPos, moon, nearAsteroids, comet: cometTarget, holoProxies, holoTargets, update, findNearestTarget, findNearestNea: (p) => { const r = findNearestTarget(p); return { nea: r.target, dist: r.dist }; },
    dispose() { disposables.forEach((d) => d.dispose?.()); }
  };
}
