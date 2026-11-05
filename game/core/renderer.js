/* ==========================================================================
   ReChoice - js/core/renderer.js
   Khởi tạo Three.js Renderer, Camera, Chiếu sáng, Shader Hậu kỳ & Vật liệu
   ========================================================================== */
'use strict';

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pr));

const scene = new THREE.Scene();
const BG = 0x07030f;
scene.background = new THREE.Color(BG);
scene.fog = new THREE.FogExp2(BG, 0.0105);

const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xc4b0ff, 0x1a0830, 0.85));

const sun = new THREE.DirectionalLight(0xffe2c8, 0.75);
sun.position.set(8, 18, 6);
scene.add(sun);

const rim = new THREE.DirectionalLight(0x6fd8ff, 0.45);
rim.position.set(-10, 8, -12);
scene.add(rim);

let composer = null, bloomPass = null, postPass = null;
const POST = {
  uniforms: { tDiffuse: { value: null }, uCA: { value: 0 }, uT: { value: 0 }, uHurt: { value: 0 }, uSat: { value: 1 } },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse;uniform float uCA,uT,uHurt,uSat;varying vec2 vUv;
  void main(){
    vec2 d=vUv-.5; float r2=dot(d,d);
    vec2 off=d*(.0025+uCA*.02)*(.4+r2*3.);
    vec3 c=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
    float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,uSat);
    float vig=smoothstep(.95,.25,length(d)*1.3);
    c*=mix(.5,1.,vig);
    c+=vec3(.5,.02,.12)*uHurt*(1.-vig)*.9;
    float n=fract(sin(dot(vUv*vec2(1234.5,4321.7)+uT,vec2(12.9898,78.233)))*43758.5453);
    c+=(n-.5)*.03;
    gl_FragColor=vec4(c,1.);
  }`
};

try {
  if (THREE.EffectComposer && THREE.UnrealBloomPass && THREE.RenderPass) {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, cam));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), 0.85, 0.5, 0.32);
    composer.addPass(bloomPass);
    if (THREE.ShaderPass) {
      postPass = new THREE.ShaderPass(POST);
      composer.addPass(postPass);
    }
  }
} catch (e) {
  composer = null;
}

/* ---------- Textures sinh bằng code ---------- */
function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return new THREE.CanvasTexture(c);
}

const glowTex = canvasTex(128, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.18, 'rgba(255,255,255,.75)');
  r.addColorStop(0.45, 'rgba(255,255,255,.22)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
});

const ringTex = canvasTex(256, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, s * 0.30, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,0)');
  r.addColorStop(0.72, 'rgba(255,255,255,.15)');
  r.addColorStop(0.86, 'rgba(255,255,255,1)');
  r.addColorStop(0.93, 'rgba(255,255,255,.35)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
});

const spriteMats = new Map();
function glowMatS(col, op = 1) {
  const k = col + '|' + op;
  let m = spriteMats.get(k);
  if (!m) {
    m = new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
    spriteMats.set(k, m);
  }
  return m;
}

function glow(col, size, op = 1, own) {
  const s = new THREE.Sprite(own
    ? new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })
    : glowMatS(col, op));
  s.scale.setScalar(size);
  return s;
}

const basicGlow = (col, op = 1) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });

function fresnelMat(col, power = 2.2, op = 0.8) {
  return new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(col) }, uO: { value: op } },
    vertexShader: `varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform vec3 uC;uniform float uO;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(vN,vV)),${power.toFixed(2)});gl_FragColor=vec4(uC*(f*1.5+.04),(f+.03)*uO);}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
}

const edgeCache = new Map();
const edgeMats = new Map();
function edgeLines(geo, col, op = 0.9) {
  let eg = edgeCache.get(geo.uuid);
  if (!eg) { eg = new THREE.EdgesGeometry(geo, 24); edgeCache.set(geo.uuid, eg); }
  const k = new THREE.Color(col).getHexString() + '|' + op;
  let mt = edgeMats.get(k);
  if (!mt) { mt = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op }); edgeMats.set(k, mt); }
  return new THREE.LineSegments(eg, mt);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  if (composer) composer.setSize(w, h);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
  const px = h * renderer.getPixelRatio() / (2 * Math.tan(cam.fov * Math.PI / 360));
  if (typeof pMat !== 'undefined') pMat.uniforms.uS.value = px;
  if (typeof dustMat !== 'undefined') dustMat.uniforms.uS.value = px;
}
addEventListener('resize', resize);
