import * as THREE from 'three';

function makeGalaxyTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#02040a'); bg.addColorStop(0.5, '#060c1f'); bg.addColorStop(1, '#02040a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 420; i += 1) {
    const x = (i * 73) % 1024, t = (x / 1024) * Math.PI * 2;
    const bandY = 256 + Math.sin(t + 0.6) * 86 + (Math.sin(i * 1.7) * 28);
    const r = 14 + (i % 40);
    const grad = ctx.createRadialGradient(x, bandY, 1, x, bandY, r);
    const col = i % 3 === 0 ? '56,189,248' : (i % 3 === 1 ? '129,140,248' : '192,132,252');
    grad.addColorStop(0, `rgba(${col},0.16)`); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, bandY, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 1600; i += 1) {
    const x = (i * 397) % 1024, nearBand = i % 2 === 0;
    const y = nearBand ? (256 + Math.sin((x / 1024) * Math.PI * 2 + 0.6) * 86 + ((i * 53) % 70) - 35) : ((i * 211) % 512);
    ctx.fillStyle = i % 7 === 0 ? '#bae6fd' : (i % 11 === 0 ? '#fde68a' : '#e2e8f0');
    ctx.fillRect(x, Math.max(0, Math.min(511, y)), i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function makeGlowSprite(colorInner, colorOuter, size) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, colorInner); g.addColorStop(0.35, colorOuter); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sp = new THREE.Sprite(mat); sp.scale.set(size, size, 1); return sp;
}

function makeBodyTex(kind) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  if (kind === 'moon') {
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 42; i += 1) { ctx.fillStyle = i % 2 ? '#64748b' : '#cbd5e1'; ctx.beginPath(); ctx.arc((i * 59) % 256, (i * 37) % 128, 2 + (i % 6), 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'mars') {
    ctx.fillStyle = '#b45309'; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#7c2d12'; for (let i = 0; i < 18; i += 1) ctx.fillRect((i * 41) % 240, 22 + (i * 19) % 80, 28, 12);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, 256, 10); ctx.fillRect(0, 118, 256, 10);
  } else if (kind === 'venus') {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#fde68a'); g.addColorStop(0.5, '#d97706'); g.addColorStop(1, '#fef3c7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128);
  } else {
    const colors = kind === 'jupiter' ? ['#d97706', '#fef3c7', '#92400e', '#fcd34d', '#b45309'] : ['#fde68a', '#d4a373', '#fef3c7', '#c29b61'];
    for (let y = 0; y < 128; y += 8) { ctx.fillStyle = colors[(y / 8) % colors.length]; ctx.fillRect(0, y, 256, 8); }
    if (kind === 'jupiter') { ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.ellipse(140, 78, 16, 9, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function makeSaturnRingTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 16;
  const ctx = c.getContext('2d');
  for (let x = 0; x < 256; x += 2) {
    const gap = (x > 140 && x < 162) || x < 18 || x > 246;
    ctx.fillStyle = gap ? 'rgba(0,0,0,0)' : `rgba(245,222,179,${0.3 + ((x * 7) % 5) * 0.1})`;
    ctx.fillRect(x, 0, 2, 16);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function makeRockyGeo(radius = 1, seed = 1) {
  const geo = new THREE.IcosahedronGeometry(radius, 1), pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const n = 0.78 + 0.34 * Math.abs(Math.sin(v.x * 3.1 + seed) * Math.cos(v.y * 2.7 - seed) + Math.sin(v.z * 3.9 + seed) * 0.45);
    v.multiplyScalar(n); pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals(); return geo;
}

export function createSpaceEnvironment(scene, { moonPos = new THREE.Vector3(-14, 3, -15), moonScale = 0.6 } = {}) {
  const disposables = [], track = (o) => { disposables.push(o); return o; };
  const skyMat = track(new THREE.MeshBasicMaterial({ map: track(makeGalaxyTexture()), side: THREE.BackSide, depthWrite: false }));
  const sky = new THREE.Mesh(track(new THREE.SphereGeometry(1100, 32, 20)), skyMat);
  sky.rotation.z = 0.42; scene.add(sky);

  const count = 3600, sPos = new Float32Array(count * 3), sCol = new Float32Array(count * 3);
  const tints = [new THREE.Color(0xbae6fd), new THREE.Color(0xfef9c3), new THREE.Color(0xfdba74), new THREE.Color(0xffffff)];
  for (let i = 0; i < count; i += 1) {
    const u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, r = 920, s = Math.sqrt(1 - u * u);
    sPos[i * 3] = r * s * Math.cos(phi); sPos[i * 3 + 1] = r * u; sPos[i * 3 + 2] = r * s * Math.sin(phi);
    const c = tints[i % tints.length]; sCol[i * 3] = c.r; sCol[i * 3 + 1] = c.g; sCol[i * 3 + 2] = c.b;
  }
  const starGeo = track(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  scene.add(new THREE.Points(starGeo, track(new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true }))));

  const sunPos = new THREE.Vector3(260, 0, 0);
  const sunGroup = new THREE.Group(); sunGroup.position.copy(sunPos);
  sunGroup.add(new THREE.Mesh(track(new THREE.SphereGeometry(14, 28, 20)), track(new THREE.MeshBasicMaterial({ color: 0xfffbeb }))));
  sunGroup.add(makeGlowSprite('rgba(255,250,220,0.95)', 'rgba(251,146,60,0.45)', 54));
  sunGroup.add(makeGlowSprite('rgba(253,224,71,0.35)', 'rgba(249,115,22,0)', 95));
  scene.add(sunGroup);

  const moon = new THREE.Mesh(track(new THREE.SphereGeometry(moonScale, 24, 16)), track(new THREE.MeshStandardMaterial({ map: track(makeBodyTex('moon')), roughness: 0.9 })));
  moon.position.copy(moonPos); scene.add(moon);

  const planets = [
    ['venus', 1.8, [135, 0, 38]], ['mars', 1.3, [-95, -2, -135]], ['jupiter', 6.4, [-190, 4, 165]], ['saturn', 5.2, [105, -4, -245]]
  ].map(([kind, rad, pos]) => {
    const grp = new THREE.Group(); grp.position.set(...pos);
    grp.add(new THREE.Mesh(track(new THREE.SphereGeometry(rad, 28, 18)), track(new THREE.MeshStandardMaterial({ map: track(makeBodyTex(kind)), roughness: 0.82 }))));
    if (kind === 'saturn') {
      const ring = new THREE.Mesh(track(new THREE.RingGeometry(7.2, 12.6, 52)), track(new THREE.MeshBasicMaterial({ map: track(makeSaturnRingTex()), side: THREE.DoubleSide, transparent: true, opacity: 0.88 })));
      ring.rotation.set(Math.PI * 0.42, 0.2, 0.15); grp.add(ring);
    }
    const orbR = Math.hypot(pos[0] - sunPos.x, pos[2] - sunPos.z);
    const guide = new THREE.Mesh(track(new THREE.RingGeometry(orbR - 0.15, orbR + 0.15, 96)), track(new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.12, side: THREE.DoubleSide })));
    guide.rotation.x = Math.PI / 2; guide.position.copy(sunPos); scene.add(guide);
    scene.add(grp); return grp;
  });

  const beltCount = 440, beltGeo = track(makeRockyGeo(1, 3)), beltMat = track(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9, metalness: 0.15 }));
  const beltMesh = new THREE.InstancedMesh(beltGeo, beltMat, beltCount);
  const beltData = [], dummy = new THREE.Object3D();
  for (let i = 0; i < beltCount; i += 1) {
    const angle = (i / beltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.12, rad = 148 + (Math.random() - 0.5) * 34;
    const y = (Math.random() - 0.5) * 12, sc = 0.5 + Math.random() * 1.4;
    beltData.push({ angle, rad, y, sc, rx: Math.random() * 3, ry: Math.random() * 3, spd: (0.004 + Math.random() * 0.008) * 0.35 });
  }
  scene.add(beltMesh);

  const nearAsteroids = Array.from({ length: 7 }, (_, i) => {
    const aRad = 0.26 + (i % 3) * 0.09;
    const mesh = new THREE.Mesh(track(makeRockyGeo(aRad, 10 + i * 3)), track(new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.88, metalness: 0.12 })));
    const orb = 5.4 + i * 1.15, ang = (i / 7) * Math.PI * 2, inc = (i % 2 ? 1 : -1) * 0.28;
    mesh.position.set(Math.cos(ang) * orb, Math.sin(ang * 2) * orb * inc, Math.sin(ang) * orb);
    scene.add(mesh);
    return { id: `NEA-${2026 + i}`, mesh, orb, ang, inc, spd: 0.06 + i * 0.012, lastScan: -99 };
  });

  function update(dt, elapsed) {
    moon.rotation.y += dt * 0.05; planets.forEach((p, idx) => { p.rotation.y += dt * (0.08 + idx * 0.02); });
    beltData.forEach((b, i) => {
      b.angle += dt * b.spd;
      dummy.position.set(sunPos.x + Math.cos(b.angle) * b.rad, b.y, sunPos.z + Math.sin(b.angle) * b.rad);
      dummy.rotation.set(b.rx + elapsed * 0.2, b.ry + elapsed * 0.3, 0); dummy.scale.setScalar(b.sc);
      dummy.updateMatrix(); beltMesh.setMatrixAt(i, dummy.matrix);
    });
    beltMesh.instanceMatrix.needsUpdate = true;
    nearAsteroids.forEach((a) => {
      a.ang += dt * a.spd; a.mesh.rotation.x += dt * 0.45; a.mesh.rotation.y += dt * 0.6;
      a.mesh.position.set(Math.cos(a.ang) * a.orb, Math.sin(a.ang * 2) * a.orb * a.inc, Math.sin(a.ang) * a.orb);
    });
  }

  function findNearestNea(satPos) {
    let best = nearAsteroids[0], bestD = Infinity;
    nearAsteroids.forEach((a) => { const d = a.mesh.position.distanceTo(satPos); if (d < bestD) { bestD = d; best = a; } });
    return { nea: best, dist: bestD };
  }

  return {
    sunPos, moon, nearAsteroids, update, findNearestNea,
    dispose() { disposables.forEach((d) => d.dispose?.()); }
  };
}
