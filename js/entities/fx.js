/* ==========================================================================
   ReChoice - js/entities/fx.js
   Hệ thống Hiệu ứng: Hạt (Particles), Vòng sóng, Mảnh vỡ, Tia sét, Laser, Chấn động & Số sát thương
   ========================================================================== */
'use strict';

// Bộ nhớ hạt sáng (Particles Buffer)
const PMAX = 5200;
const pPos = new Float32Array(PMAX * 3);
const pCol = new Float32Array(PMAX * 3);
const pSize = new Float32Array(PMAX);
const pA = new Float32Array(PMAX);
const pVel = new Float32Array(PMAX * 3);
const pBase = new Float32Array(PMAX * 3);
const pLife = new Float32Array(PMAX);
const pMax = new Float32Array(PMAX);
const pS0 = new Float32Array(PMAX);
const pGrav = new Float32Array(PMAX);
const pDrag = new Float32Array(PMAX);
let pIdx = 0;

const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('aCol', new THREE.BufferAttribute(pCol, 3));
pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
pGeo.setAttribute('aA', new THREE.BufferAttribute(pA, 1));

const pMat = new THREE.ShaderMaterial({
  uniforms: { uS: { value: 300 } },
  vertexShader: `attribute vec3 aCol;attribute float aSize;attribute float aA;uniform float uS;varying vec3 vC;varying float vA;void main(){vC=aCol;vA=aA;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=max(0.,aSize*uS/-mv.z);gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.0,d);a*=a;float core=smoothstep(.16,0.,d);gl_FragColor=vec4(vC*(a*1.3+core*1.2),vA*(a+core*.5));}`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
});
const pts = new THREE.Points(pGeo, pMat);
pts.frustumCulled = false;
scene.add(pts);

const tc = new THREE.Color();
function rawEmit(x, y, z, col, n, spd, life = 0.6, up = 0.6, size = 0.38, grav = 9, drag = 0.05) {
  n = Math.max(1, Math.round(n * Q.pMul));
  tc.set(col);
  for (let i = 0; i < n; i++) {
    const k = pIdx;
    pIdx = (pIdx + 1) % PMAX;
    const a = Math.random() * TAU, s = spd * (0.25 + Math.random() * 0.75);
    pPos[k * 3] = x; pPos[k * 3 + 1] = y; pPos[k * 3 + 2] = z;
    pVel[k * 3] = Math.cos(a) * s; pVel[k * 3 + 1] = (Math.random() * up + 0.08) * s; pVel[k * 3 + 2] = Math.sin(a) * s;
    pBase[k * 3] = tc.r; pBase[k * 3 + 1] = tc.g; pBase[k * 3 + 2] = tc.b;
    pLife[k] = pMax[k] = life * (0.5 + Math.random() * 0.7);
    pS0[k] = size * (0.6 + Math.random() * 0.8);
    pGrav[k] = grav;
    pDrag[k] = drag;
  }
}

function rawGlow(x, y, z, col, size, life = 0.25) {
  const k = pIdx;
  pIdx = (pIdx + 1) % PMAX;
  tc.set(col);
  pPos[k * 3] = x; pPos[k * 3 + 1] = y; pPos[k * 3 + 2] = z;
  pVel[k * 3] = pVel[k * 3 + 1] = pVel[k * 3 + 2] = 0;
  pBase[k * 3] = tc.r; pBase[k * 3 + 1] = tc.g; pBase[k * 3 + 2] = tc.b;
  pLife[k] = pMax[k] = life;
  pS0[k] = size;
  pGrav[k] = 0;
  pDrag[k] = 1;
}

function updParticles(dt) {
  for (let k = 0; k < PMAX; k++) {
    if (pLife[k] <= 0) { if (pA[k] !== 0) { pA[k] = 0; pSize[k] = 0; } continue; }
    pLife[k] -= dt;
    const j = k * 3, damp = Math.pow(pDrag[k], dt);
    pVel[j] *= damp; pVel[j + 2] *= damp; pVel[j + 1] = pVel[j + 1] * damp - pGrav[k] * dt;
    pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt;
    if (pPos[j + 1] < 0.05) { pPos[j + 1] = 0.05; pVel[j + 1] *= -0.35; }
    const t = Math.max(pLife[k] / pMax[k], 0), hot = 1 + Math.max(0, t - 0.7) * 2.2;
    pCol[j] = pBase[j] * hot; pCol[j + 1] = pBase[j + 1] * hot; pCol[j + 2] = pBase[j + 2] * hot;
    pA[k] = t;
    pSize[k] = pS0[k] * (0.35 + 0.65 * t);
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.aCol.needsUpdate = true;
  pGeo.attributes.aSize.needsUpdate = true;
  pGeo.attributes.aA.needsUpdate = true;
}

/* ---------- Đối tượng hồ bơi (Object Pool) ---------- */
function pool(make) {
  const items = [];
  return {
    items,
    get() {
      for (const it of items) if (!it.on) { it.on = true; it.m.visible = true; return it; }
      const it = make(); it.on = true; items.push(it); return it;
    },
    free(it) { it.on = false; it.m.visible = false; },
    clear() { for (const it of items) { it.on = false; it.m.visible = false; } }
  };
}

// Vòng sóng (Rings)
const flatGeo = new THREE.PlaneGeometry(2, 2);
flatGeo.rotateX(-Math.PI / 2);
const RG = pool(() => {
  const m = new THREE.Mesh(flatGeo, new THREE.MeshBasicMaterial({ map: ringTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(m);
  return { m, t: 0, dur: 0.4, size: 3, lin: false };
});
function rawRing(x, z, col, size, dur = 0.4, lin = false) {
  const r = RG.get();
  r.m.position.set(x, 0.12, z);
  r.m.material.color.set(col);
  r.size = size; r.dur = dur; r.t = 0; r.lin = lin;
  r.m.scale.setScalar(0.05);
}
function updRings(dt) {
  for (const r of RG.items) {
    if (!r.on) continue;
    r.t += dt;
    const k = r.t / r.dur;
    if (k >= 1) { RG.free(r); continue; }
    r.m.scale.setScalar(0.05 + r.size * (r.lin ? k : 1 - Math.pow(1 - k, 3)));
    r.m.material.opacity = r.lin ? Math.min(1, (1 - k) * 3) : 1 - k;
  }
}

// Mảnh vỡ (Debris)
const debrisGeos = [new THREE.TetrahedronGeometry(0.22), new THREE.BoxGeometry(0.3, 0.12, 0.22), new THREE.OctahedronGeometry(0.18)];
const DB = pool(() => {
  const m = new THREE.Mesh(debrisGeos[Math.floor(Math.random() * 3)], new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffffff, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.4, flatShading: true }));
  scene.add(m);
  return { m, v: new V3(), sp: new V3(), life: 0, max: 1, s: 1 };
});
function rawDebris(x, y, z, col, n, spd, size = 1) {
  n = Math.round(n * Q.debris);
  const c = new THREE.Color(col);
  for (let i = 0; i < n; i++) {
    const d = DB.get();
    d.m.position.set(x, y, z);
    const a = Math.random() * TAU, s = spd * rnd(0.4, 1);
    d.v.set(Math.cos(a) * s, rnd(0.4, 1.2) * spd, Math.sin(a) * s);
    d.sp.set(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9));
    d.life = d.max = rnd(0.7, 1.4);
    d.s = size * rnd(0.6, 1.4);
    d.m.material.emissive.copy(c);
    d.m.material.color.copy(c).multiplyScalar(0.25);
    d.m.scale.setScalar(d.s);
  }
}
function updDebris(dt) {
  for (const d of DB.items) {
    if (!d.on) continue;
    d.life -= dt;
    if (d.life <= 0) { DB.free(d); continue; }
    d.v.y -= 20 * dt;
    d.m.position.addScaledVector(d.v, dt);
    if (d.m.position.y < 0.1) { d.m.position.y = 0.1; d.v.y *= -0.35; d.v.x *= 0.6; d.v.z *= 0.6; d.sp.multiplyScalar(0.6); }
    d.m.rotation.x += d.sp.x * dt; d.m.rotation.y += d.sp.y * dt; d.m.rotation.z += d.sp.z * dt;
    const t = d.life / d.max;
    d.m.scale.setScalar(d.s * Math.min(1, t * 2.5));
    d.m.material.emissiveIntensity = 0.3 + t * 1.4;
  }
}

// Ánh chớp (Point Light Flashes)
const flashes = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffffff, 0, 22, 2); scene.add(l); return { l, t: 0, dur: 0.3, i: 0 }; });
let flashI = 0;
function rawFlash(x, z, col, inten = 3, dur = 0.3) {
  const f = flashes[flashI];
  flashI = (flashI + 1) % flashes.length;
  f.l.position.set(x, 2.5, z);
  f.l.color.set(col);
  f.i = inten;
  f.t = f.dur = dur;
}
function updFlashes(dt) {
  for (const f of flashes) {
    if (f.t <= 0) { f.l.intensity = 0; continue; }
    f.t -= dt;
    f.l.intensity = f.i * Math.max(0, f.t / f.dur);
  }
}
let screenFlash = 0;
function rawScreenFlash(a) { screenFlash = Math.max(screenFlash, a); }

// Tia sét (Lightning Bolts)
const bolts = [];
function rawBolt(a, b) {
  const ptsA = [], n = 8;
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(b, i / n);
    if (i && i < n) { p.x += rnd(-0.55, 0.55); p.z += rnd(-0.55, 0.55); p.y += rnd(-0.3, 0.3); }
    ptsA.push(p);
  }
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsA), new THREE.LineBasicMaterial({ color: 0xd8f6ff, transparent: true, blending: THREE.AdditiveBlending }));
  scene.add(l);
  bolts.push({ l, t: 0.16 });
  rawGlow(b.x, b.y, b.z, 0x9fe8ff, 2.2, 0.18);
}
function updBolts(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.t -= dt;
    b.l.material.opacity = Math.max(0, b.t / 0.16);
    if (b.t <= 0) {
      scene.remove(b.l);
      b.l.geometry.dispose();
      b.l.material.dispose();
      bolts.splice(i, 1);
    }
  }
}

// Laser Beams
const beamGeo = new THREE.PlaneGeometry(1, 1);
beamGeo.rotateX(-Math.PI / 2);
const handGeo = new THREE.PlaneGeometry(1, 1);
handGeo.rotateX(-Math.PI / 2);
handGeo.translate(0, 0, 0.5);

function beamMat(col) {
  return new THREE.ShaderMaterial({
    uniforms: { uWarn: { value: 0 }, uFire: { value: 0 }, uT: { value: 0 }, uC: { value: new THREE.Color(col) } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float uWarn,uFire,uT;uniform vec3 uC;void main(){float x=abs(vUv.x-.5)*2.;float core=1.-x;
      float warn=uWarn*smoothstep(.35,0.,x)*(.35+.35*sin(uT*28.));
      float fire=uFire*(pow(max(core,0.),1.6)*.9+smoothstep(.3,0.,x)*1.4);
      float flow=.85+.15*sin(vUv.y*80.-uT*40.);
      vec3 c=vec3(1.,.12,.22)*warn+(uC*fire+vec3(1.)*uFire*smoothstep(.18,0.,x))*flow;
      gl_FragColor=vec4(c,clamp(warn+fire,0.,1.));}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
}
const beams = [];
function rawBeam(x1, z1, x2, z2, w, warn, fire, col, dmg) {
  const m = new THREE.Mesh(beamGeo, beamMat(col));
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz) || 1;
  m.position.set((x1 + x2) / 2, 0.7, (z1 + z2) / 2);
  m.rotation.y = Math.atan2(dx, dz);
  m.scale.set(w, 1, len);
  scene.add(m);
  const b = { m, x1, z1, x2, z2, w, warn, fire, t: 0, dmg: dmg || 0, hit: new Set(), col };
  beams.push(b);
  return b;
}
function updBeams(dt) {
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i];
    b.t += dt;
    const u = b.m.material.uniforms;
    u.uT.value = tAll;
    if (b.t < b.warn) {
      u.uWarn.value = 1; u.uFire.value = 0; b.m.scale.x = b.w * 0.35;
    } else if (b.t < b.warn + b.fire) {
      if (!b.fired) { b.fired = true; rawGlow(b.x1, 0.8, b.z1, b.col, 4, 0.25); sfx.laser(); }
      u.uWarn.value = 0;
      const k = (b.t - b.warn) / b.fire;
      u.uFire.value = 1 - k * k;
      b.m.scale.x = b.w * (1 + 0.3 * Math.sin(tAll * 60));
    } else {
      scene.remove(b.m);
      b.m.material.dispose();
      beams.splice(i, 1);
    }
  }
}

// Sóng chấn động & Vết đánh dấu
const shocks = [];
function rawShock(x, z, spd, maxR, col) {
  rawRing(x, z, col, maxR, maxR / spd, true);
  addRipple(x, z, 1.2);
}
const marks = [];
const markMat = () => new THREE.MeshBasicMaterial({ map: ringTex, color: 0xff2a4a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
function rawMark(shipId, dur) {
  const m = new THREE.Mesh(flatGeo, markMat());
  scene.add(m);
  marks.push({ m, id: shipId, t: dur, dur });
}
function updMarks(dt) {
  for (let i = marks.length - 1; i >= 0; i--) {
    const k = marks[i];
    k.t -= dt;
    const s = ships.get(k.id);
    if (k.t <= 0 || !s) {
      scene.remove(k.m);
      k.m.material.dispose();
      marks.splice(i, 1);
      continue;
    }
    k.m.position.set(s.pos.x, 0.1, s.pos.z);
    const p = 1 - k.t / k.dur;
    k.m.scale.setScalar(2.4 - p * 1.1 + Math.sin(tAll * 20) * 0.12);
    k.m.material.opacity = 0.6 + 0.4 * Math.sin(tAll * 16);
  }
}

// Số sát thương bay lên (Damage Numbers Overlay)
const dmgPool = [];
const dmgBox = $('dmg');
function rawDmg(x, y, z, amount, crit, blocked) {
  if (!SET.nums) return;
  let d = dmgPool.find(o => !o.on);
  if (!d) {
    if (dmgPool.length >= 36) return;
    const el = document.createElement('span');
    dmgBox.appendChild(el);
    d = { el, on: false, p: new V3(), t: 0 };
    dmgPool.push(d);
  }
  d.on = true; d.t = 0;
  d.p.set(x + rnd(-0.4, 0.4), y + 0.6, z + rnd(-0.2, 0.2));
  d.el.className = crit ? 'c' : blocked ? 'b' : '';
  d.el.textContent = blocked ? 'MIỄN' : Math.max(1, Math.round(amount));
  d.el.style.opacity = 1;
}
const dV = new V3();
function updDmg(dt) {
  for (const d of dmgPool) {
    if (!d.on) continue;
    d.t += dt;
    if (d.t > 0.8) { d.on = false; d.el.style.opacity = 0; continue; }
    d.p.y += dt * 2.2;
    dV.copy(d.p).project(cam);
    const x = (dV.x * 0.5 + 0.5) * innerWidth, y = (-dV.y * 0.5 + 0.5) * innerHeight;
    const s = d.t < 0.12 ? 1 + (0.12 - d.t) * 5 : 1;
    d.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${s})`;
    d.el.style.opacity = Math.min(1, (0.8 - d.t) * 4);
  }
}

/* ---------- Bộ phát hiệu ứng kết nối Mạng (High-level FX Wrappers) ---------- */
let hurtFx = 0, caFx = 0;

function emit(x, y, z, col, n, spd, life = 0.6, up = 0.6) {
  rawEmit(x, y, z, col, n, spd, life, up);
  if (typeof q === 'function') q(['p', r2(x), r2(y), r2(z), col, n, r2(spd), r2(life), r2(up)]);
}
function ring(x, z, col, size, dur = 0.4) {
  rawRing(x, z, col, size, dur);
  if (typeof q === 'function') q(['r', r2(x), r2(z), col, r2(size), r2(dur)]);
}
function bolt(a, b) {
  rawBolt(a, b);
  if (typeof q === 'function') q(['b', r2(a.x), r2(a.y), r2(a.z), r2(b.x), r2(b.y), r2(b.z)]);
}
function rawBanner(t, s) {
  const b = $('banner');
  $('banT').textContent = t;
  $('banS').textContent = s || '';
  b.classList.remove('go');
  void b.offsetWidth;
  b.classList.add('go');
}
function banner(t, s) {
  rawBanner(t, s);
  if (typeof q === 'function') q(['n', t, s || '']);
}
function rawToast(txt) {
  const t = $('toast');
  t.textContent = txt;
  t.classList.remove('go');
  void t.offsetWidth;
  t.classList.add('go');
}
function rawIntro(idx) {
  const b = BOSSES[idx];
  if (!b) return;
  $('introK').textContent = idx === 9 ? 'TRẬN CUỐI' : 'BOSS ĐẶC BIỆT · ĐỢT ' + ((idx + 1) * 10);
  $('introT').textContent = b.name;
  $('introS').textContent = b.sub;
  const el = $('intro');
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
  sfx.boss();
  rawScreenFlash(0.35);
}
function shake(v) {
  if (G) G.shake = Math.max(G.shake, v);
}
function flashHurt() {
  $('vig').style.opacity = 1;
  setTimeout(() => $('vig').style.opacity = 0, 180);
  shake(0.6);
  hurtFx = 1;
  sfx.hurt();
}
function rawSpawnFx(x, z, col, big) {
  rawRing(x, z, col, big ? 7 : 2.4, big ? 0.9 : 0.45);
  rawEmit(x, 0.4, z, col, big ? 60 : 10, big ? 12 : 4, 0.7, 1.6, big ? 0.7 : 0.4, -2, 0.1);
  rawGlow(x, 1, z, col, big ? 9 : 3, big ? 0.6 : 0.3);
  if (big) { rawFlash(x, z, col, 5, 0.6); addRipple(x, z, 1.5); }
}
function spawnFx(x, z, col, big) {
  rawSpawnFx(x, z, col, big);
  if (typeof q === 'function') q(['sp', r2(x), r2(z), col, big ? 1 : 0]);
}
function rawDeathFx(x, y, z, col, size) {
  const big = size >= 2;
  rawEmit(x, y, z, col, 22 * size, 8 * Math.min(size, 2.5), 0.75, 0.8, 0.45 + size * 0.08);
  rawEmit(x, y, z, 0xffffff, 6 * size, 6 * Math.min(size, 2), 0.35, 0.6, 0.35);
  rawEmit(x, y, z, lighten(col, 0.4).getHex(), 10 * size, 2.5, 1.2, 1.2, 0.3, -1.5, 0.3);
  rawGlow(x, y, z, col, 3.5 * size, 0.32);
  rawGlow(x, y, z, 0xffffff, 1.6 * size, 0.12);
  rawDebris(x, y, z, col, 4 + size * 3, 5 + size * 1.5, Math.min(2, 0.6 + size * 0.25));
  rawRing(x, z, col, size * 3.2, big ? 0.8 : 0.35);
  if (size >= 1.2) rawFlash(x, z, col, 2 + size, 0.25 + size * 0.08);
  addRipple(x, z, Math.min(1.6, 0.35 + size * 0.25));
  if (big) { rawScreenFlash(0.25); caFx = Math.max(caFx, 0.8); }
}
function deathFx(x, y, z, col, size) {
  rawDeathFx(x, y, z, col, size);
  if (typeof q === 'function') q(['k', r2(x), r2(y), r2(z), col, r2(size)]);
}
function rawHitFx(x, y, z, col, crit, amount) {
  rawEmit(x, y, z, crit ? 0xffe08a : col, crit ? 9 : 4, crit ? 8 : 5, 0.32, 0.5, crit ? 0.42 : 0.32, 6, 0.04);
  rawGlow(x, y, z, crit ? 0xffe08a : 0xffffff, crit ? 1.6 : 0.9, 0.08);
  rawDmg(x, y, z, amount, crit);
}
function rawBlockFx(x, y, z) {
  rawEmit(x, y, z, 0xb5b0cc, 5, 5, 0.25, 0.4, 0.3);
  rawGlow(x, y, z, 0xffffff, 1.2, 0.08);
  rawDmg(x, y, z, 0, false, true);
  sfx.block();
}
function victoryFx() {
  rawScreenFlash(0.6);
  sfx.win();
  banner('CHIẾN THẮNG!', 'Đã vượt qua đợt 100');
}
