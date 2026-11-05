/* ==========================================================================
   ReChoice - js/core/arena.js
   Đấu trường vũ trụ: Sàn tinh vân, Lưới lục giác, Tường năng lượng, Cột pha lê & Bụi sao
   ========================================================================== */
'use strict';

const RIPN = 8;
const floorMat = new THREE.ShaderMaterial({
  uniforms: {
    uT: { value: 0 },
    uR: { value: R },
    uPl: { value: [0, 1, 2, 3].map(() => new THREE.Vector2(999, 999)) },
    uRip: { value: [...Array(RIPN)].map(() => new THREE.Vector4(0, 0, -99, 0)) },
    uBoss: { value: 0 }
  },
  extensions: { derivatives: true },
  vertexShader: `varying vec2 vP;void main(){vec4 w=modelMatrix*vec4(position,1.);vP=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader: `uniform float uT,uR,uBoss;uniform vec2 uPl[4];uniform vec4 uRip[${RIPN}];varying vec2 vP;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+7.1;a*=.5;}return v;}
  vec4 hexC(vec2 uv){const vec2 s=vec2(1.,1.7320508);vec4 hc=floor(vec4(uv,uv-vec2(.5,1.))/s.xyxy)+.5;vec4 h=vec4(uv-hc.xy*s,uv-(hc.zw+.5)*s);return dot(h.xy,h.xy)<dot(h.zw,h.zw)?vec4(h.xy,hc.xy):vec4(h.zw,hc.zw+.5);}
  void main(){
    float d=length(vP);
    vec2 q=vP*.03;
    float n=fbm(q+vec2(uT*.008,uT*.005));
    float n2=fbm(q*2.2-vec2(uT*.012,0.)+n*1.7);
    vec3 neb=mix(vec3(.018,.008,.045),vec3(.24,.06,.4),smoothstep(.3,.85,n));
    neb=mix(neb,vec3(.03,.2,.3),smoothstep(.45,.95,n2)*.6);
    neb+=vec3(.55,.1,.4)*pow(smoothstep(.5,1.,n*n2*1.7),2.)*.7;
    neb=mix(neb,neb*vec3(1.5,.6,.8),uBoss*.6);
    vec2 sg=floor(vP*1.15);float h=hash(sg);
    float star=step(.982,h)*smoothstep(.22,0.,length(fract(vP*1.15)-.5))*(.55+.45*sin(uT*2.5+h*60.));
    vec4 hx=hexC(vP/2.3);
    vec2 a=abs(hx.xy);float e=.5-max(dot(a,vec2(.5,.8660254)),a.x);
    float fw=fwidth(e)*1.4;
    float line=1.-smoothstep(0.,fw*1.2+.006,e);
    float cellR=hash(hx.zw);
    float near=0.;
    for(int i=0;i<4;i++){near=max(near,exp(-length(vP-uPl[i])*.13));}
    float rip=0.;
    for(int i=0;i<${RIPN};i++){vec4 r=uRip[i];float age=uT-r.z;if(age>0.&&age<2.6){float rr=age*24.;float dd=length(vP-r.xy);rip+=exp(-abs(dd-rr)*.9)*exp(-age*1.6)*r.w;}}
    float inside=1.-smoothstep(uR-.2,uR+.5,d);
    float wave=sin(d*.45-uT*1.6)*.5+.5;
    vec3 gridC=mix(vec3(.45,.32,1.),vec3(1.,.72,.3),near);
    gridC=mix(gridC,vec3(1.,.3,.55),uBoss*.5);
    float pulse=step(.93,cellR)*(.5+.5*sin(uT*2.+cellR*90.))*.35;
    vec3 col=neb+vec3(star)*.9;
    col+=gridC*line*(.018+.42*near+.025*wave+pulse*.6)*inside;
    col+=vec3(.5,.9,1.)*line*min(rip,1.5)*.4*inside+vec3(.3,.6,1.)*min(rip,1.5)*.04;
    col+=gridC*(1.-line)*near*.035*inside;
    float ring=exp(-abs(d-uR)*2.6);
    col+=vec3(1.,.25,.55)*ring*(1.1+.3*sin(uT*3.));
    col*=mix(.42,1.,inside);
    col*=1.-smoothstep(uR+20.,uR+120.,d)*.85;
    gl_FragColor=vec4(col,1.);
  }`
});

const floor = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

let ripI = 0;
function addRipple(x, z, amp) {
  const r = floorMat.uniforms.uRip.value[ripI];
  r.set(x, z, tAll, amp);
  ripI = (ripI + 1) % RIPN;
}

const wallMat = new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(0xff3f8f) } },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec2 vUv;uniform float uT;uniform vec3 uC;void main(){float a=pow(1.-vUv.y,2.4);float s=.5+.5*sin(vUv.x*300.-uT*5.);float s2=.5+.5*sin(vUv.x*60.+uT*1.3);gl_FragColor=vec4(uC*a*(.35+.35*s+.3*s2)*1.4,a*.85);}`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});
const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 3.2, 128, 1, true), wallMat);
wall.position.y = 1.6;
scene.add(wall);

// Cột pha lê quanh đấu trường
const crystalGeo = new THREE.OctahedronGeometry(1, 0);
const crystalMat = new THREE.MeshStandardMaterial({ color: 0x1d1036, metalness: 0.6, roughness: 0.25, emissive: 0x2b0f55, emissiveIntensity: 0.6, flatShading: true });
const pillars = [];
for (let i = 0; i < 28; i++) {
  const a = i / 28 * TAU, h = rnd(2.5, 7), r = R + 3.5 + Math.random() * 2;
  const p = new THREE.Mesh(crystalGeo, crystalMat);
  p.scale.set(0.45, h * 0.5, 0.45);
  p.position.set(Math.cos(a) * r, h * 0.5, Math.sin(a) * r);
  p.rotation.y = Math.random() * TAU;
  scene.add(p);
  const col = i % 2 ? 0xffc04d : 0xff4f8f;
  const cap = glow(col, 1.6, 0.9);
  cap.position.set(p.position.x, h + 0.2, p.position.z);
  scene.add(cap);
  pillars.push({ cap, ph: Math.random() * TAU, h });
}

// Thiên thạch trôi xa
const shards = [];
const shardMat = new THREE.MeshStandardMaterial({ color: 0x241338, emissive: 0x2c0f60, emissiveIntensity: 0.55, flatShading: true, metalness: 0.3, roughness: 0.6 });
for (let i = 0; i < 40; i++) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(0.6, 2.6), 0), shardMat);
  const a = Math.random() * TAU, r = rnd(R + 10, R + 40);
  m.position.set(Math.cos(a) * r, rnd(1, 12), Math.sin(a) * r);
  scene.add(m);
  shards.push({ m, y: m.position.y, s: rnd(0.1, 0.5), ph: Math.random() * TAU });
}

// Bụi sao lơ lửng
const DUST = 420, dustPos = new Float32Array(DUST * 3), dustPh = new Float32Array(DUST);
for (let i = 0; i < DUST; i++) {
  const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 48;
  dustPos[i * 3] = Math.cos(a) * r;
  dustPos[i * 3 + 1] = rnd(0.5, 16);
  dustPos[i * 3 + 2] = Math.sin(a) * r;
  dustPh[i] = Math.random() * 100;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
dustGeo.setAttribute('aPh', new THREE.BufferAttribute(dustPh, 1));

const dustMat = new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uS: { value: 300 } },
  vertexShader: `attribute float aPh;uniform float uT,uS;varying float vA;void main(){vec3 p=position;p.y=mod(p.y+uT*.35+aPh,16.)+.3;p.x+=sin(uT*.3+aPh)*.6;vec4 mv=modelViewMatrix*vec4(p,1.);vA=.35+.35*sin(uT*2.+aPh*7.);gl_PointSize=uS*.09/-mv.z;gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vec3(.75,.7,1.)*a,a*vA);}`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
});
const dust = new THREE.Points(dustGeo, dustMat);
dust.frustumCulled = false;
scene.add(dust);
