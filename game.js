/* ReChoice — game bắn tàu vũ trụ 3D, chơi một mình hoặc cùng bạn bè.
   Các phần chính (tìm theo tiêu đề /* ---------- ... ---------- *\/):
   cài đặt · đồ họa · hiệu ứng · tàu · kẻ địch · nâng cấp · âm thanh · mạng · đợt & boss
   · chiến đấu · điều khiển · menu · bảng xếp hạng · đồng bộ online · vòng lặp chính */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const V3=THREE.Vector3, TAU=Math.PI*2, rnd=(a,b)=>a+Math.random()*(b-a);
const r2=v=>Math.round(v*100)/100;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const canvas=$('c');
const R=30;               // bán kính đấu trường mặc định
let RA=R;                 // bán kính hiện tại (boss cuối thu nhỏ đấu trường)
let tAll=0;

/* ---------- cài đặt (lưu trên máy người chơi) ---------- */
const KEY={best:'rechoice-best',name:'rechoice-name',set:'rechoice-settings',board:'rechoice-board'};
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
// mang điểm cũ của Voidcore sang
if(lsGet('voidcore-best')&&!lsGet(KEY.best)) lsSet(KEY.best,lsGet('voidcore-best'));
if(lsGet('voidcore-name')&&!lsGet(KEY.name)) lsSet(KEY.name,lsGet('voidcore-name'));
const coarse=matchMedia('(pointer:coarse)').matches;
const SET=Object.assign({music:60,sfx:80,quality:coarse?'mid':'high',shake:1,nums:1},(()=>{try{return JSON.parse(lsGet(KEY.set)||'{}');}catch(e){return {};}})());
const saveSet=()=>lsSet(KEY.set,JSON.stringify(SET));
const QUAL={
  low:{pr:1,bloom:false,post:false,pMul:.45,trail:false,debris:.35},
  mid:{pr:1.5,bloom:true,post:true,pMul:.75,trail:true,debris:.7},
  high:{pr:2,bloom:true,post:true,pMul:1,trail:true,debris:1}
};
let Q=QUAL[SET.quality]||QUAL.high;
// ?dot=50 trong link: chế độ luyện tập, bắt đầu thẳng ở đợt đó (không ghi điểm)
const PRACTICE=Math.max(1,Math.min(500,parseInt(new URLSearchParams(location.search).get('dot'))||1));

/* ---------- đồ họa: renderer, hậu kỳ ---------- */
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,Q.pr));
const scene=new THREE.Scene();
const BG=0x07030f;
scene.background=new THREE.Color(BG);
scene.fog=new THREE.FogExp2(BG,.0105);
const cam=new THREE.PerspectiveCamera(50,1,.1,400);
scene.add(new THREE.HemisphereLight(0xc4b0ff,0x1a0830,.85));
const sun=new THREE.DirectionalLight(0xffe2c8,.75); sun.position.set(8,18,6); scene.add(sun);
const rim=new THREE.DirectionalLight(0x6fd8ff,.45); rim.position.set(-10,8,-12); scene.add(rim);

let composer=null, bloomPass=null, postPass=null;
const POST={
  uniforms:{tDiffuse:{value:null},uCA:{value:0},uT:{value:0},uHurt:{value:0},uSat:{value:1}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uCA,uT,uHurt,uSat;varying vec2 vUv;
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
try{
  if(THREE.EffectComposer&&THREE.UnrealBloomPass&&THREE.RenderPass){
    composer=new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene,cam));
    bloomPass=new THREE.UnrealBloomPass(new THREE.Vector2(512,512),.85,.5,.32);
    composer.addPass(bloomPass);
    if(THREE.ShaderPass){ postPass=new THREE.ShaderPass(POST); composer.addPass(postPass); }
  }
}catch(e){composer=null;}

/* ---------- textures vẽ bằng code ---------- */
function canvasTex(size,draw){ const c=document.createElement('canvas'); c.width=c.height=size; draw(c.getContext('2d'),size); const t=new THREE.CanvasTexture(c); return t; }
const glowTex=canvasTex(128,(g,s)=>{const r=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.18,'rgba(255,255,255,.75)'); r.addColorStop(.45,'rgba(255,255,255,.22)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,s,s);});
const ringTex=canvasTex(256,(g,s)=>{const r=g.createRadialGradient(s/2,s/2,s*.30,s/2,s/2,s/2); r.addColorStop(0,'rgba(255,255,255,0)'); r.addColorStop(.72,'rgba(255,255,255,.15)'); r.addColorStop(.86,'rgba(255,255,255,1)'); r.addColorStop(.93,'rgba(255,255,255,.35)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,s,s);});
const spriteMats=new Map();
function glowMatS(col,op=1){ const k=col+'|'+op; let m=spriteMats.get(k); if(!m){ m=new THREE.SpriteMaterial({map:glowTex,color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false}); spriteMats.set(k,m);} return m; }
function glow(col,size,op=1,own){ const s=new THREE.Sprite(own?new THREE.SpriteMaterial({map:glowTex,color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false}):glowMatS(col,op)); s.scale.setScalar(size); return s; }
const basicGlow=(col,op=1)=>new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false});
function fresnelMat(col,power=2.2,op=.8){
  return new THREE.ShaderMaterial({uniforms:{uC:{value:new THREE.Color(col)},uO:{value:op}},
    vertexShader:`varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uC;uniform float uO;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(vN,vV)),${power.toFixed(2)});gl_FragColor=vec4(uC*(f*1.5+.04),(f+.03)*uO);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
}
const edgeCache=new Map();
const edgeMats=new Map();
function edgeLines(geo,col,op=.9){
  let eg=edgeCache.get(geo.uuid); if(!eg){ eg=new THREE.EdgesGeometry(geo,24); edgeCache.set(geo.uuid,eg); }
  const k=new THREE.Color(col).getHexString()+'|'+op;
  let mt=edgeMats.get(k); if(!mt){ mt=new THREE.LineBasicMaterial({color:col,transparent:true,opacity:op}); edgeMats.set(k,mt); }
  return new THREE.LineSegments(eg,mt);
}
const lighten=(c,k)=>new THREE.Color(c).lerp(new THREE.Color(0xffffff),k);
const darken=(c,k)=>new THREE.Color(c).multiplyScalar(k);

/* ---------- đấu trường: sàn tinh vân, lưới lục giác, tường năng lượng ---------- */
const RIPN=8;
const floorMat=new THREE.ShaderMaterial({
  uniforms:{uT:{value:0},uR:{value:R},uPl:{value:[0,1,2,3].map(()=>new THREE.Vector2(999,999))},uRip:{value:[...Array(RIPN)].map(()=>new THREE.Vector4(0,0,-99,0))},uBoss:{value:0}},
  extensions:{derivatives:true},
  vertexShader:`varying vec2 vP;void main(){vec4 w=modelMatrix*vec4(position,1.);vP=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uT,uR,uBoss;uniform vec2 uPl[4];uniform vec4 uRip[${RIPN}];varying vec2 vP;
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
const floor=new THREE.Mesh(new THREE.PlaneGeometry(420,420),floorMat);
floor.rotation.x=-Math.PI/2; scene.add(floor);
let ripI=0;
function addRipple(x,z,amp){ const r=floorMat.uniforms.uRip.value[ripI]; r.set(x,z,tAll,amp); ripI=(ripI+1)%RIPN; }

const wallMat=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uC:{value:new THREE.Color(0xff3f8f)}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 vUv;uniform float uT;uniform vec3 uC;void main(){float a=pow(1.-vUv.y,2.4);float s=.5+.5*sin(vUv.x*300.-uT*5.);float s2=.5+.5*sin(vUv.x*60.+uT*1.3);gl_FragColor=vec4(uC*a*(.35+.35*s+.3*s2)*1.4,a*.85);}`,
  transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
const wall=new THREE.Mesh(new THREE.CylinderGeometry(R,R,3.2,128,1,true),wallMat);
wall.position.y=1.6; scene.add(wall);

// cột pha lê quanh đấu trường
const crystalGeo=new THREE.OctahedronGeometry(1,0);
const crystalMat=new THREE.MeshStandardMaterial({color:0x1d1036,metalness:.6,roughness:.25,emissive:0x2b0f55,emissiveIntensity:.6,flatShading:true});
const pillars=[];
for(let i=0;i<28;i++){
  const a=i/28*TAU, h=rnd(2.5,7), r=R+3.5+Math.random()*2;
  const p=new THREE.Mesh(crystalGeo,crystalMat); p.scale.set(.45,h*.5,.45);
  p.position.set(Math.cos(a)*r,h*.5,Math.sin(a)*r); p.rotation.y=Math.random()*TAU; scene.add(p);
  const col=i%2?0xffc04d:0xff4f8f;
  const cap=glow(col,1.6,.9); cap.position.set(p.position.x,h+.2,p.position.z); scene.add(cap);
  pillars.push({cap,ph:Math.random()*TAU,h});
}
// thiên thạch trôi xa xa
const shards=[];
const shardMat=new THREE.MeshStandardMaterial({color:0x241338,emissive:0x2c0f60,emissiveIntensity:.55,flatShading:true,metalness:.3,roughness:.6});
for(let i=0;i<40;i++){
  const m=new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(.6,2.6),0),shardMat);
  const a=Math.random()*TAU, r=rnd(R+10,R+40);
  m.position.set(Math.cos(a)*r,rnd(1,12),Math.sin(a)*r); scene.add(m);
  shards.push({m,y:m.position.y,s:rnd(.1,.5),ph:Math.random()*TAU});
}
// bụi sao lơ lửng
const DUST=420, dustPos=new Float32Array(DUST*3), dustPh=new Float32Array(DUST);
for(let i=0;i<DUST;i++){ const a=Math.random()*TAU, r=Math.sqrt(Math.random())*48; dustPos[i*3]=Math.cos(a)*r; dustPos[i*3+1]=rnd(.5,16); dustPos[i*3+2]=Math.sin(a)*r; dustPh[i]=Math.random()*100; }
const dustGeo=new THREE.BufferGeometry(); dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3)); dustGeo.setAttribute('aPh',new THREE.BufferAttribute(dustPh,1));
const dustMat=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uS:{value:300}},
  vertexShader:`attribute float aPh;uniform float uT,uS;varying float vA;void main(){vec3 p=position;p.y=mod(p.y+uT*.35+aPh,16.)+.3;p.x+=sin(uT*.3+aPh)*.6;vec4 mv=modelViewMatrix*vec4(p,1.);vA=.35+.35*sin(uT*2.+aPh*7.);gl_PointSize=uS*.09/-mv.z;gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vec3(.75,.7,1.)*a,a*vA);}`,
  transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
const dust=new THREE.Points(dustGeo,dustMat); dust.frustumCulled=false; scene.add(dust);

/* ---------- hiệu ứng: hạt sáng ---------- */
const PMAX=5200;
const pPos=new Float32Array(PMAX*3), pCol=new Float32Array(PMAX*3), pSize=new Float32Array(PMAX), pA=new Float32Array(PMAX);
const pVel=new Float32Array(PMAX*3), pBase=new Float32Array(PMAX*3), pLife=new Float32Array(PMAX), pMax=new Float32Array(PMAX), pS0=new Float32Array(PMAX), pGrav=new Float32Array(PMAX), pDrag=new Float32Array(PMAX);
let pIdx=0;
const pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
pGeo.setAttribute('aCol',new THREE.BufferAttribute(pCol,3));
pGeo.setAttribute('aSize',new THREE.BufferAttribute(pSize,1));
pGeo.setAttribute('aA',new THREE.BufferAttribute(pA,1));
const pMat=new THREE.ShaderMaterial({uniforms:{uS:{value:300}},
  vertexShader:`attribute vec3 aCol;attribute float aSize;attribute float aA;uniform float uS;varying vec3 vC;varying float vA;void main(){vC=aCol;vA=aA;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=max(0.,aSize*uS/-mv.z);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.0,d);a*=a;float core=smoothstep(.16,0.,d);gl_FragColor=vec4(vC*(a*1.3+core*1.2),vA*(a+core*.5));}`,
  transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
const pts=new THREE.Points(pGeo,pMat); pts.frustumCulled=false; scene.add(pts);
const tc=new THREE.Color();
function rawEmit(x,y,z,col,n,spd,life=.6,up=.6,size=.38,grav=9,drag=.05){
  n=Math.max(1,Math.round(n*Q.pMul)); tc.set(col);
  for(let i=0;i<n;i++){
    const k=pIdx; pIdx=(pIdx+1)%PMAX;
    const a=Math.random()*TAU, s=spd*(.25+Math.random()*.75);
    pPos[k*3]=x;pPos[k*3+1]=y;pPos[k*3+2]=z;
    pVel[k*3]=Math.cos(a)*s;pVel[k*3+1]=(Math.random()*up+.08)*s;pVel[k*3+2]=Math.sin(a)*s;
    pBase[k*3]=tc.r;pBase[k*3+1]=tc.g;pBase[k*3+2]=tc.b;
    pLife[k]=pMax[k]=life*(.5+Math.random()*.7); pS0[k]=size*(.6+Math.random()*.8); pGrav[k]=grav; pDrag[k]=drag;
  }
}
function rawGlow(x,y,z,col,size,life=.25){
  const k=pIdx; pIdx=(pIdx+1)%PMAX; tc.set(col);
  pPos[k*3]=x;pPos[k*3+1]=y;pPos[k*3+2]=z; pVel[k*3]=pVel[k*3+1]=pVel[k*3+2]=0;
  pBase[k*3]=tc.r;pBase[k*3+1]=tc.g;pBase[k*3+2]=tc.b; pLife[k]=pMax[k]=life; pS0[k]=size; pGrav[k]=0; pDrag[k]=1;
}
function updParticles(dt){
  for(let k=0;k<PMAX;k++){
    if(pLife[k]<=0){ if(pA[k]!==0){pA[k]=0;pSize[k]=0;} continue; }
    pLife[k]-=dt;
    const j=k*3, damp=Math.pow(pDrag[k],dt);
    pVel[j]*=damp;pVel[j+2]*=damp;pVel[j+1]=pVel[j+1]*damp-pGrav[k]*dt;
    pPos[j]+=pVel[j]*dt;pPos[j+1]+=pVel[j+1]*dt;pPos[j+2]+=pVel[j+2]*dt;
    if(pPos[j+1]<.05){pPos[j+1]=.05;pVel[j+1]*=-.35;}
    const t=Math.max(pLife[k]/pMax[k],0), hot=1+Math.max(0,t-.7)*2.2;
    pCol[j]=pBase[j]*hot;pCol[j+1]=pBase[j+1]*hot;pCol[j+2]=pBase[j+2]*hot;
    pA[k]=t; pSize[k]=pS0[k]*(.35+.65*t);
  }
  pGeo.attributes.position.needsUpdate=true; pGeo.attributes.aCol.needsUpdate=true; pGeo.attributes.aSize.needsUpdate=true; pGeo.attributes.aA.needsUpdate=true;
}

/* ---------- hiệu ứng: vòng sóng, mảnh vỡ, ánh chớp, tia sét, laser, sóng chấn động ---------- */
function pool(make){
  const items=[];
  return {items,
    get(){for(const it of items) if(!it.on){it.on=true;it.m.visible=true;return it;}
      const it=make(); it.on=true; items.push(it); return it;},
    free(it){it.on=false;it.m.visible=false;},
    clear(){for(const it of items){it.on=false;it.m.visible=false;}}};
}
const flatGeo=new THREE.PlaneGeometry(2,2); flatGeo.rotateX(-Math.PI/2);
const RG=pool(()=>{const m=new THREE.Mesh(flatGeo,new THREE.MeshBasicMaterial({map:ringTex,color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(m);return {m,t:0,dur:.4,size:3,lin:false};});
function rawRing(x,z,col,size,dur=.4,lin=false){const r=RG.get();r.m.position.set(x,.12,z);r.m.material.color.set(col);r.size=size;r.dur=dur;r.t=0;r.lin=lin;r.m.scale.setScalar(.05);}
function updRings(dt){for(const r of RG.items){ if(!r.on) continue; r.t+=dt; const k=r.t/r.dur; if(k>=1){RG.free(r);continue;} r.m.scale.setScalar(.05+r.size*(r.lin?k:1-Math.pow(1-k,3))); r.m.material.opacity=r.lin?Math.min(1,(1-k)*3):1-k; }}

const debrisGeos=[new THREE.TetrahedronGeometry(.22),new THREE.BoxGeometry(.3,.12,.22),new THREE.OctahedronGeometry(.18)];
const DB=pool(()=>{const m=new THREE.Mesh(debrisGeos[Math.floor(Math.random()*3)],new THREE.MeshStandardMaterial({color:0x222222,emissive:0xffffff,emissiveIntensity:.8,metalness:.5,roughness:.4,flatShading:true}));scene.add(m);return {m,v:new V3(),sp:new V3(),life:0,max:1,s:1};});
function rawDebris(x,y,z,col,n,spd,size=1){
  n=Math.round(n*Q.debris); const c=new THREE.Color(col);
  for(let i=0;i<n;i++){ const d=DB.get(); d.m.position.set(x,y,z); const a=Math.random()*TAU, s=spd*rnd(.4,1);
    d.v.set(Math.cos(a)*s,rnd(.4,1.2)*spd,Math.sin(a)*s); d.sp.set(rnd(-9,9),rnd(-9,9),rnd(-9,9));
    d.life=d.max=rnd(.7,1.4); d.s=size*rnd(.6,1.4); d.m.material.emissive.copy(c); d.m.material.color.copy(c).multiplyScalar(.25); d.m.scale.setScalar(d.s); }
}
function updDebris(dt){for(const d of DB.items){ if(!d.on) continue; d.life-=dt; if(d.life<=0){DB.free(d);continue;}
  d.v.y-=20*dt; d.m.position.addScaledVector(d.v,dt);
  if(d.m.position.y<.1){d.m.position.y=.1; d.v.y*=-.35; d.v.x*=.6; d.v.z*=.6; d.sp.multiplyScalar(.6);}
  d.m.rotation.x+=d.sp.x*dt; d.m.rotation.y+=d.sp.y*dt; d.m.rotation.z+=d.sp.z*dt;
  const t=d.life/d.max; d.m.scale.setScalar(d.s*Math.min(1,t*2.5)); d.m.material.emissiveIntensity=.3+t*1.4; }}

const flashes=[0,1,2,3].map(()=>{const l=new THREE.PointLight(0xffffff,0,22,2); scene.add(l); return {l,t:0,dur:.3,i:0};});
let flashI=0;
function rawFlash(x,z,col,inten=3,dur=.3){ const f=flashes[flashI]; flashI=(flashI+1)%flashes.length; f.l.position.set(x,2.5,z); f.l.color.set(col); f.i=inten; f.t=f.dur=dur; }
function updFlashes(dt){ for(const f of flashes){ if(f.t<=0){f.l.intensity=0;continue;} f.t-=dt; f.l.intensity=f.i*Math.max(0,f.t/f.dur); } }
let screenFlash=0;
function rawScreenFlash(a){ screenFlash=Math.max(screenFlash,a); }

const bolts=[];
function rawBolt(a,b){
  const ptsA=[], n=8;
  for(let i=0;i<=n;i++){const p=a.clone().lerp(b,i/n); if(i&&i<n){p.x+=rnd(-.55,.55);p.z+=rnd(-.55,.55);p.y+=rnd(-.3,.3);} ptsA.push(p);}
  const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsA),new THREE.LineBasicMaterial({color:0xd8f6ff,transparent:true,blending:THREE.AdditiveBlending}));
  scene.add(l); bolts.push({l,t:.16});
  rawGlow(b.x,b.y,b.z,0x9fe8ff,2.2,.18);
}
function updBolts(dt){for(let i=bolts.length-1;i>=0;i--){const b=bolts[i]; b.t-=dt; b.l.material.opacity=Math.max(0,b.t/.16); if(b.t<=0){scene.remove(b.l); b.l.geometry.dispose(); b.l.material.dispose(); bolts.splice(i,1);}}}

// laser: báo trước bằng vạch đỏ, rồi bắn
const beamGeo=new THREE.PlaneGeometry(1,1); beamGeo.rotateX(-Math.PI/2);
const handGeo=new THREE.PlaneGeometry(1,1); handGeo.rotateX(-Math.PI/2); handGeo.translate(0,0,.5);
function beamMat(col){ return new THREE.ShaderMaterial({uniforms:{uWarn:{value:0},uFire:{value:0},uT:{value:0},uC:{value:new THREE.Color(col)}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 vUv;uniform float uWarn,uFire,uT;uniform vec3 uC;void main(){float x=abs(vUv.x-.5)*2.;float core=1.-x;
    float warn=uWarn*smoothstep(.35,0.,x)*(.35+.35*sin(uT*28.));
    float fire=uFire*(pow(max(core,0.),1.6)*.9+smoothstep(.3,0.,x)*1.4);
    float flow=.85+.15*sin(vUv.y*80.-uT*40.);
    vec3 c=vec3(1.,.12,.22)*warn+(uC*fire+vec3(1.)*uFire*smoothstep(.18,0.,x))*flow;
    gl_FragColor=vec4(c,clamp(warn+fire,0.,1.));}`,
  transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}); }
const beams=[];
function rawBeam(x1,z1,x2,z2,w,warn,fire,col,dmg){
  const m=new THREE.Mesh(beamGeo,beamMat(col)); const dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz)||1;
  m.position.set((x1+x2)/2,.7,(z1+z2)/2); m.rotation.y=Math.atan2(dx,dz); m.scale.set(w,1,len); scene.add(m);
  const b={m,x1,z1,x2,z2,w,warn,fire,t:0,dmg:dmg||0,hit:new Set(),col}; beams.push(b); return b;
}
function updBeams(dt){
  for(let i=beams.length-1;i>=0;i--){ const b=beams[i]; b.t+=dt; const u=b.m.material.uniforms; u.uT.value=tAll;
    if(b.t<b.warn){ u.uWarn.value=1; u.uFire.value=0; b.m.scale.x=b.w*.35; }
    else if(b.t<b.warn+b.fire){ if(!b.fired){ b.fired=true; rawGlow(b.x1,.8,b.z1,b.col,4,.25); sfx.laser(); } u.uWarn.value=0; const k=(b.t-b.warn)/b.fire; u.uFire.value=1-k*k; b.m.scale.x=b.w*(1+.3*Math.sin(tAll*60)); }
    else { scene.remove(b.m); b.m.material.dispose(); beams.splice(i,1); }
  }
}
// sóng chấn động lan ra (Cự Thạch dậm đất, mìn nổ)
const shocks=[];
function rawShock(x,z,spd,maxR,col){ rawRing(x,z,col,maxR,maxR/spd,true); addRipple(x,z,1.2); }
// vòng đánh dấu dưới chân (Bóng Ma)
const marks=[];
const markMat=()=>new THREE.MeshBasicMaterial({map:ringTex,color:0xff2a4a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
function rawMark(shipId,dur){ const m=new THREE.Mesh(flatGeo,markMat()); scene.add(m); marks.push({m,id:shipId,t:dur,dur}); }
function updMarks(dt){ for(let i=marks.length-1;i>=0;i--){ const k=marks[i]; k.t-=dt; const s=ships.get(k.id);
  if(k.t<=0||!s){ scene.remove(k.m); k.m.material.dispose(); marks.splice(i,1); continue; }
  k.m.position.set(s.pos.x,.1,s.pos.z); const p=1-k.t/k.dur; k.m.scale.setScalar(2.4-p*1.1+Math.sin(tAll*20)*.12); k.m.material.opacity=.6+.4*Math.sin(tAll*16); } }

// số sát thương bay lên
const dmgPool=[];
const dmgBox=$('dmg');
function rawDmg(x,y,z,amount,crit,blocked){
  if(!SET.nums) return;
  let d=dmgPool.find(o=>!o.on);
  if(!d){ if(dmgPool.length>=36) return; const el=document.createElement('span'); dmgBox.appendChild(el); d={el,on:false,p:new V3(),t:0}; dmgPool.push(d); }
  d.on=true; d.t=0; d.p.set(x+rnd(-.4,.4),y+.6,z+rnd(-.2,.2)); d.el.className=crit?'c':blocked?'b':''; d.el.textContent=blocked?'MIỄN':Math.max(1,Math.round(amount)); d.el.style.opacity=1;
}
const dV=new V3();
function updDmg(dt){ for(const d of dmgPool){ if(!d.on) continue; d.t+=dt; if(d.t>.8){ d.on=false; d.el.style.opacity=0; continue; }
  d.p.y+=dt*2.2; dV.copy(d.p).project(cam); const x=(dV.x*.5+.5)*innerWidth, y=(-dV.y*.5+.5)*innerHeight;
  const s=d.t<.12?1+(.12-d.t)*5:1; d.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%) scale(${s})`; d.el.style.opacity=Math.min(1,(.8-d.t)*4); } }

/* ---------- tàu (mỗi người chơi một tàu) ---------- */
const SHIP_COLORS=[[0xffb547,0xff7a1f],[0x2fe0d0,0x0fa8a0],[0xa07bff,0x6a3dff],[0xff6b9a,0xe0306a]];
const CSS_COLORS=['#ffb547','#2fe0d0','#a07bff','#ff6b9a'];
const SG={};
(()=>{
  const body=new THREE.Shape(); body.moveTo(0,1.25); body.bezierCurveTo(.15,1.,.27,.52,.31,-.08); body.lineTo(.25,-.72); body.lineTo(-.25,-.72); body.lineTo(-.31,-.08); body.bezierCurveTo(-.27,.52,-.15,1.,0,1.25);
  SG.body=new THREE.ExtrudeGeometry(body,{depth:.24,bevelEnabled:true,bevelThickness:.08,bevelSize:.07,bevelSegments:2,curveSegments:12}); SG.body.translate(0,0,-.12); SG.body.rotateX(-Math.PI/2);
  const wing=new THREE.Shape(); wing.moveTo(.2,.42); wing.lineTo(1.28,-.32); wing.lineTo(1.36,-.6); wing.lineTo(1.05,-.66); wing.lineTo(.24,-.46); wing.lineTo(.2,.42);
  SG.wingR=new THREE.ExtrudeGeometry(wing,{depth:.06,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:1}); SG.wingR.translate(0,0,-.03); SG.wingR.rotateX(-Math.PI/2);
  SG.wingL=SG.wingR.clone(); SG.wingL.scale(-1,1,1);
  const fin=new THREE.Shape(); fin.moveTo(0,0); fin.lineTo(.5,0); fin.lineTo(.62,.36); fin.lineTo(.32,.36); fin.lineTo(0,0);
  SG.fin=new THREE.ExtrudeGeometry(fin,{depth:.04,bevelEnabled:false}); SG.fin.translate(0,0,-.02); SG.fin.rotateY(-Math.PI/2);
  SG.cockpit=new THREE.SphereGeometry(.17,20,14); SG.cockpit.scale(1,.72,2.2);
  SG.engine=new THREE.CylinderGeometry(.11,.14,.46,16); SG.engine.rotateX(Math.PI/2);
  SG.nozzle=new THREE.TorusGeometry(.11,.035,8,20);
  SG.flame=new THREE.ConeGeometry(.1,1,14,1,true); SG.flame.rotateX(Math.PI/2); SG.flame.translate(0,0,.5);
  SG.tip=new THREE.SphereGeometry(.06,10,8);
  SG.spine=new THREE.BoxGeometry(.05,.05,1.25);
  SG.shield=new THREE.SphereGeometry(1.45,28,18);
})();
const ships=new Map();
let me=null;   // tàu của người đang ngồi trước máy này

function baseStats(){
  return {hp:100,maxHp:100,speed:9,dmg:10,rate:5.5,multi:1,pierce:0,bspd:30,bsize:1,crit:.05,chain:0,boom:0,regen:0,magnet:4.5,dashCd:1.5};
}
function buildShip(slot){
  const [c,em]=SHIP_COLORS[slot%4];
  const g=new THREE.Group(), model=new THREE.Group(); model.position.y=.62; model.scale.setScalar(1.18); g.add(model);
  const mats=[];
  const hullMat=new THREE.MeshStandardMaterial({color:0x2c2644,metalness:.8,roughness:.26,emissive:em,emissiveIntensity:.07}); mats.push(hullMat);
  const accMat=new THREE.MeshStandardMaterial({color:c,metalness:.55,roughness:.28,emissive:em,emissiveIntensity:.5,side:THREE.DoubleSide}); mats.push(accMat);
  const lineCol=lighten(c,.35);
  const body=new THREE.Mesh(SG.body,hullMat); model.add(body); body.add(edgeLines(SG.body,lineCol,.85));
  for(const wg of [SG.wingL,SG.wingR]){ const w=new THREE.Mesh(wg,accMat); model.add(w); w.add(edgeLines(wg,lighten(c,.6),.9)); }
  for(const sx of [-.24,.24]){ const f=new THREE.Mesh(SG.fin,accMat); f.position.set(sx,.12,.25); f.rotation.z=sx>0?-.25:.25; model.add(f); }
  const spine=new THREE.Mesh(SG.spine,basicGlow(c,.95)); spine.position.set(0,.2,.05); model.add(spine);
  const cockMat=new THREE.MeshStandardMaterial({color:0x9ef2ff,emissive:0x29c6ff,emissiveIntensity:1.1,metalness:.1,roughness:.04}); mats.push(cockMat);
  const coreM=new THREE.Mesh(SG.cockpit,cockMat); coreM.position.set(0,.2,-.3); model.add(coreM);
  const flames=[];
  for(const sx of [-.2,.2]){
    const en=new THREE.Mesh(SG.engine,hullMat); en.position.set(sx,0,.66); model.add(en);
    const nz=new THREE.Mesh(SG.nozzle,basicGlow(lighten(c,.3),1)); nz.position.set(sx,0,.9); model.add(nz);
    const fl=new THREE.Mesh(SG.flame,basicGlow(lighten(c,.45),.85)); fl.position.set(sx,0,.9); model.add(fl);
    const fl2=new THREE.Mesh(SG.flame,basicGlow(0xffffff,.9)); fl2.scale.set(.45,.45,.55); fl2.position.set(sx,0,.9); model.add(fl2);
    const gl=glow(c,1.1,.9); gl.position.set(sx,0,1.); model.add(gl);
    flames.push(fl,fl2);
  }
  const tips=[];
  for(const sx of [-1.3,1.3]){ const tp=new THREE.Mesh(SG.tip,basicGlow(sx<0?0xff4f6d:0x6dffb0,1)); tp.position.set(sx,.02,.6); model.add(tp); const tg=glow(sx<0?0xff4f6d:0x6dffb0,.7,.9); tp.add(tg); tips.push(tp); }
  const shield=new THREE.Mesh(SG.shield,fresnelMat(0x4ff0ff,2.4,.9)); shield.position.y=.62; g.add(shield); mats.push(shield.material);
  return {g,hull:model,coreM,shield,flames,tips,mats,accMat,hullMat};
}

// vệt sáng động cơ phía sau tàu
const TRAILN=26;
function makeTrail(col){
  const pos=new Float32Array(TRAILN*2*3), al=new Float32Array(TRAILN*2), idx=[];
  for(let i=0;i<TRAILN-1;i++){ const a=i*2,b=a+1,c=a+2,d=a+3; idx.push(a,b,c,b,d,c); }
  for(let i=0;i<TRAILN;i++){ al[i*2]=al[i*2+1]=1-i/(TRAILN-1); }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('aA',new THREE.BufferAttribute(al,1)); geo.setIndex(idx);
  const mat=new THREE.ShaderMaterial({uniforms:{uC:{value:new THREE.Color(col)},uO:{value:1}},
    vertexShader:`attribute float aA;varying float vA;void main(){vA=aA;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 uC;uniform float uO;varying float vA;void main(){gl_FragColor=vec4(uC*(.6+vA*.8),vA*vA*.55*uO);}`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const m=new THREE.Mesh(geo,mat); m.frustumCulled=false; scene.add(m);
  return {m,pts:[],geo};
}
function updTrail(tr,x,z,show){
  tr.m.visible=show&&Q.trail;
  if(!tr.m.visible){ tr.pts.length=0; return; }
  const last=tr.pts[0];
  if(!last||Math.hypot(last[0]-x,last[1]-z)>.18){ tr.pts.unshift([x,z]); if(tr.pts.length>TRAILN) tr.pts.pop(); }
  else { last[0]=x; last[1]=z; }
  const p=tr.geo.attributes.position.array, n=tr.pts.length;
  for(let i=0;i<TRAILN;i++){
    const a=tr.pts[Math.min(i,n-1)]||[x,z], b=tr.pts[Math.min(i+1,n-1)]||a;
    let dx=a[0]-b[0], dz=a[1]-b[1]; const l=Math.hypot(dx,dz)||1; dx/=l; dz/=l;
    const w=.26*(1-i/TRAILN);
    p[i*6]=a[0]-dz*w; p[i*6+1]=.6; p[i*6+2]=a[1]+dx*w;
    p[i*6+3]=a[0]+dz*w; p[i*6+4]=.6; p[i*6+5]=a[1]-dx*w;
  }
  tr.geo.attributes.position.needsUpdate=true;
}

function addShip(id,name,slot,local){
  const v=buildShip(slot); scene.add(v.g);
  const s=Object.assign(v,{id,name,slot,local,pos:v.g.position,S:baseStats(),upg:{},
    aim:new V3(0,0,-1),firing:false,fireCd:0,dashT:0,dashCool:0,dashDir:new V3(),dashId:0,
    inv:0,netInv:false,vx:0,vz:0,dead:false,blades:[],tx:0,tz:0,tRy:0,tRz:0,lx:0,lz:0,offer:null,tag:null,trail:makeTrail(SHIP_COLORS[slot%4][0])});
  if(!local){
    const t=document.createElement('div'); t.className='ntag';
    const n=document.createElement('span'); n.textContent=name; t.appendChild(n);
    const bar=document.createElement('i'); bar.appendChild(document.createElement('b')); t.appendChild(bar);
    t.style.setProperty('--c',CSS_COLORS[slot%4]); t.hidden=true;
    $('tags').appendChild(t); s.tag=t;
  }
  ships.set(id,s);
  if(local) me=s;
  return s;
}
function removeShip(id){
  const s=ships.get(id); if(!s) return;
  scene.remove(s.g); for(const b of s.blades) scene.remove(b);
  for(const m of s.mats) m.dispose();
  scene.remove(s.trail.m); s.trail.geo.dispose(); s.trail.m.material.dispose();
  if(s.tag) s.tag.remove();
  ships.delete(id);
  if(me===s) me=null;
}
function clearShips(){ for(const id of [...ships.keys()]) removeShip(id); }
const bladeGeo=new THREE.OctahedronGeometry(.5);
const bladeMat=new THREE.MeshStandardMaterial({color:0xffe08a,emissive:0xffb020,emissiveIntensity:1.2,metalness:.6,roughness:.2,flatShading:true});
function syncBlades(s,n){
  while(s.blades.length<n){const m=new THREE.Mesh(bladeGeo,bladeMat); m.scale.set(.5,.22,1.3); scene.add(m); s.blades.push(m);}
  while(s.blades.length>n) scene.remove(s.blades.pop());
}
function aliveShips(){ const a=[]; for(const s of ships.values()) if(!s.dead) a.push(s); return a; }
function nearestShip(x,z){
  let best=null, bd=1e18;
  for(const s of ships.values()){ if(s.dead) continue; const d=(s.pos.x-x)**2+(s.pos.z-z)**2; if(d<bd){bd=d;best=s;} }
  return best;
}

const plight=new THREE.PointLight(0xffb547,1.3,13); scene.add(plight);
const reticle=new THREE.Group();
{ const r1=new THREE.Mesh(new THREE.RingGeometry(.38,.46,32),basicGlow(0xffc04d,.95)); r1.rotation.x=-Math.PI/2; reticle.add(r1);
  for(let i=0;i<4;i++){ const t=new THREE.Mesh(new THREE.PlaneGeometry(.06,.28),basicGlow(0xffc04d,.95)); t.rotation.x=-Math.PI/2; t.rotation.z=i*Math.PI/2; t.position.set(Math.sin(i*Math.PI/2)*.66,0,Math.cos(i*Math.PI/2)*.66); reticle.add(t); }
  scene.add(reticle); }

/* ---------- đạn và tinh thể ---------- */
const bulletGeo=new THREE.SphereGeometry(.2,12,8);
const PB=pool(()=>{const m=new THREE.Group();const core=new THREE.Mesh(bulletGeo,new THREE.MeshBasicMaterial({color:0xfff6dc}));const gl=glow(0xffb547,1,.55,true);m.add(core,gl);scene.add(m);return {m,core,gl,v:new V3(),life:0,pierce:0,r:.22,hit:new Set(),id:0,owner:null,spd:30};});
const EB=pool(()=>{const m=new THREE.Group();const core=new THREE.Mesh(bulletGeo,new THREE.MeshBasicMaterial({color:0xffd6ec}));const gl=glow(0xff3fa4,2.1,1);m.add(core,gl);scene.add(m);return {m,core,gl,v:new V3(),life:0,id:0,r:.32};});
const gemGeo=new THREE.OctahedronGeometry(.24);
const gemMat=new THREE.MeshStandardMaterial({color:0x6dffd6,emissive:0x2fe0b5,emissiveIntensity:1.3,metalness:.3,roughness:.1,flatShading:true});
const GM=pool(()=>{const m=new THREE.Mesh(gemGeo,gemMat);m.add(glow(0x6dffd6,1.4,.75));scene.add(m);return {m,v:new V3(),val:1,t:0};});
let bSeq=0, ebSeq=0, eSeq=0;
const netPB=new Map(), netEB=new Map();   // đạn đang hiển thị trên máy khách, theo id

/* ---------- kẻ địch ---------- */
// boss:1 = boss chính (tính vào thanh máu); part:1 = phần phụ của boss; ghost:1 = không va chạm đạn
const T={
  chaser:{hp:22,spd:5.4,r:.75,y:.85,col:0xff4f6d,xp:1,sc:10,dmg:12,face:1},
  shooter:{hp:30,spd:3.6,r:.8,y:.95,col:0x9a7bff,xp:2,sc:20,dmg:10,range:13,fire:2.1},
  splitter:{hp:50,spd:3.3,r:1,y:1.05,col:0x2fe0b5,xp:3,sc:30,dmg:14},
  tank:{hp:150,spd:2.3,r:1.2,y:.9,col:0xff9a3d,xp:6,sc:60,dmg:24,face:1},
  mini:{hp:12,spd:6.8,r:.5,y:.6,col:0x2fe0b5,xp:1,sc:5,dmg:8,face:1},
  boss:{hp:1100,spd:2.6,r:2.7,y:2.9,col:0xff3fa4,xp:40,sc:1500,dmg:30,boss:1,heavy:1},
  queen:{hp:1500,spd:0,r:2.4,y:2.1,col:0xffb020,xp:45,sc:3000,dmg:28,boss:1,heavy:1},
  bee:{hp:45,spd:0,r:.65,y:1.4,col:0xffd23a,xp:0,sc:15,dmg:12,part:1,heavy:1},
  egg:{hp:30,spd:0,r:.7,y:.65,col:0xfff0b0,xp:0,sc:5,dmg:0,part:1,heavy:1},
  golem:{hp:1700,spd:2.3,r:1.75,y:1.7,col:0xff7a2a,xp:16,sc:1200,dmg:30,boss:1,heavy:1},
  hole:{hp:1600,spd:1.1,r:2.2,y:1.6,col:0x9a4dff,xp:55,sc:4000,dmg:35,boss:1,heavy:1},
  twinA:{hp:900,spd:0,r:1.6,y:2,col:0xe8f4ff,xp:30,sc:2500,dmg:25,boss:1,heavy:1},
  twinB:{hp:900,spd:0,r:1.6,y:2,col:0x7a4dff,xp:30,sc:2500,dmg:25,boss:1,heavy:1},
  maestro:{hp:1800,spd:0,r:2.4,y:2.2,col:0xffd166,xp:60,sc:5000,dmg:30,boss:1,heavy:1},
  note:{hp:110,spd:0,r:1.05,y:1.5,col:0x6ef0ff,xp:2,sc:40,dmg:15,part:1,heavy:1},
  ghost:{hp:1400,spd:4.2,r:1.6,y:1.8,col:0xb07bff,xp:60,sc:5500,dmg:30,boss:1,heavy:1},
  decoy:{hp:1,spd:3.4,r:1.2,y:1.6,col:0xb07bff,xp:0,sc:5,dmg:15,part:1},
  thief:{hp:1700,spd:4.4,r:1.8,y:1.6,col:0x3dff8a,xp:70,sc:6000,dmg:25,boss:1,heavy:1},
  clock:{hp:2200,spd:0,r:3.4,y:.6,col:0x7ad7ff,xp:75,sc:7000,dmg:20,boss:1,heavy:1},
  bubble:{hp:1,spd:0,r:4,y:.4,col:0x8fd8ff,xp:0,sc:0,dmg:0,part:1,ghost:1,heavy:1},
  dhead:{hp:900,spd:9,r:1.6,y:1.4,col:0xff3fd0,xp:80,sc:8000,dmg:35,boss:1,heavy:1},
  dseg:{hp:80,spd:0,r:1.1,y:1.1,col:0x8a5cff,xp:1,sc:40,dmg:22,part:1,bar:1,heavy:1},
  mine:{hp:8,spd:0,r:.65,y:.5,col:0xff3355,xp:0,sc:5,dmg:0,part:1,heavy:1},
  ultimate:{hp:6000,spd:2.4,r:3.6,y:3.4,col:0xff2a7a,xp:150,sc:30000,dmg:40,boss:1,heavy:1}
};
const TYPES=Object.keys(T);
const BOSSES=[
  {key:'queen',name:'NỮ HOÀNG TỔ ONG',sub:'Chỉ mất máu khi mở vỏ đẻ trứng'},
  {key:'golem',name:'CỰ THẠCH PHÂN RÃ',sub:'Lướt qua sóng chấn động'},
  {key:'hole',name:'HỐ ĐEN',sub:'Chờ lúc nó thở ra'},
  {key:'twins',name:'GƯƠNG SONG SINH',sub:'Bắn vào mặt tối · hạ cả hai trong 3 giây'},
  {key:'maestro',name:'NHẠC TRƯỞNG HƯ KHÔNG',sub:'Phá nốt nhạc trước'},
  {key:'ghost',name:'BÓNG MA SĂN MỒI',sub:'Lướt né khi bị đánh dấu'},
  {key:'thief',name:'KẺ ĐÁNH CẮP',sub:'Hạ nó để lấy lại nâng cấp'},
  {key:'clock',name:'ĐỒNG HỒ THỜI GIAN',sub:'Đừng ngừng bắn'},
  {key:'dragon',name:'RỒNG PLASMA',sub:'Phá từng đốt thân'},
  {key:'ultimate',name:'LÕI HƯ KHÔNG TỐI THƯỢNG',sub:'Trận chiến cuối cùng'}
];
const NOTE_COLS=[0x6ef0ff,0xff6bd6,0xffe066,0x7dff9a];

const EG={
  dart:new THREE.OctahedronGeometry(.55,0), fin:new THREE.BoxGeometry(.9,.05,.3), eye:new THREE.SphereGeometry(.13,10,8),
  ico:new THREE.IcosahedronGeometry(.5,0), ring:new THREE.TorusGeometry(.85,.06,8,40), spike:new THREE.ConeGeometry(.12,.5,8),
  blob:new THREE.IcosahedronGeometry(.48,1), core:new THREE.SphereGeometry(.3,14,10),
  tankBody:new THREE.BoxGeometry(1.3,.8,1.6), plate:new THREE.BoxGeometry(.18,.7,1.3), visor:new THREE.BoxGeometry(.9,.18,.12), tread:new THREE.BoxGeometry(.3,.35,1.8),
  dodeca:new THREE.DodecahedronGeometry(1.5,0), shell:new THREE.IcosahedronGeometry(2.3,1), sat:new THREE.OctahedronGeometry(.35,0), bossRing:new THREE.TorusGeometry(4,.09,8,96),
  hex:new THREE.CylinderGeometry(1.05,1.05,1.7,6), hplate:new THREE.BoxGeometry(1.05,1.5,.22), crown:new THREE.ConeGeometry(.16,.6,6),
  beeBody:new THREE.SphereGeometry(.36,14,10), beeBand:new THREE.TorusGeometry(.33,.07,6,18), wingP:new THREE.PlaneGeometry(.55,.3),
  egg:new THREE.SphereGeometry(.55,18,14),
  rock:new THREE.DodecahedronGeometry(1.25,0), chunk:new THREE.DodecahedronGeometry(.28,0),
  holeCore:new THREE.SphereGeometry(1.5,28,20), disk:new THREE.RingGeometry(1.7,4.4,72,1), photon:new THREE.TorusGeometry(1.62,.05,8,64),
  crystal:new THREE.OctahedronGeometry(1.05,0), mirror:new THREE.CylinderGeometry(1.75,1.75,2.7,28,1,true,-Math.PI/2,Math.PI),
  staff:new THREE.TorusGeometry(3.4,.04,6,80),
  noteHead:new THREE.SphereGeometry(.45,16,12), stem:new THREE.BoxGeometry(.1,.08,1.4), flag:new THREE.BoxGeometry(.5,.06,.14),
  hood:new THREE.SphereGeometry(.95,20,14,0,TAU,0,Math.PI/2), cloak:new THREE.ConeGeometry(1,2.2,20,1,true),
  palm:new THREE.BoxGeometry(1.4,.4,1.15), knuckle:new THREE.SphereGeometry(.16,10,8), seg:new THREE.BoxGeometry(.22,.22,.55), wrist:new THREE.CylinderGeometry(.45,.55,.7,12),
  disc:new THREE.CylinderGeometry(3.2,3.2,.35,64), rim:new THREE.TorusGeometry(3.25,.13,10,96), tick:new THREE.BoxGeometry(.16,.12,.6), gem:new THREE.OctahedronGeometry(.55,0),
  bubble:new THREE.SphereGeometry(4,32,20),
  dhead:new THREE.OctahedronGeometry(1,0), horn:new THREE.ConeGeometry(.16,.9,8), dseg:new THREE.SphereGeometry(.8,16,12), dspike:new THREE.ConeGeometry(.16,.55,6),
  mine:new THREE.IcosahedronGeometry(.4,0), mspike:new THREE.ConeGeometry(.08,.35,6)
};
const clefCurve=new THREE.CatmullRomCurve3([[.15,-2.3],[-.25,-2.35],[-.45,-2.05],[-.25,-1.8],[.05,-1.95],[0,-1.2],[-.05,0],[.1,1.2],[.45,1.9],[.3,2.4],[-.1,2.1],[-.2,1.4],[.1,.6],[.6,0],[.7,-.6],[.3,-1],[-.3,-.9],[-.55,-.4],[-.35,.15],[.1,.3],[.35,.05],[.25,-.35],[-.05,-.4]].map(([x,y])=>new V3(x*1.05,0,-y*1.05)));
EG.clef=new THREE.TubeGeometry(clefCurve,200,.14,10,false);

function stdMat(col,ei=.55,metal=.55,rough=.3,base=.35,extra){
  return new THREE.MeshStandardMaterial(Object.assign({color:darken(col,base),emissive:col,emissiveIntensity:ei,metalness:metal,roughness:rough,flatShading:true},extra||{}));
}
// dựng hình kẻ địch: m (gốc, di chuyển/xoay), inner (để rung khi trúng đạn, xoay chi tiết)
function buildEnemy(type){
  const t=T[type], col=t.col;
  const m=new THREE.Group(), inner=new THREE.Group(); m.add(inner);
  const mats=[], P={}, fade=[];
  let mat=stdMat(col); mats.push(mat);
  const add=(geo,material,x=0,y=0,z=0,parent=inner)=>{const o=new THREE.Mesh(geo,material); o.position.set(x,y,z); parent.add(o); return o;};
  switch(type){
    case 'chaser': case 'mini': {
      const s=type==='mini'?.62:1, c=type==='mini'?0x2fe0b5:col;
      if(type==='mini'){ mat.dispose(); mats.length=0; mat=stdMat(c); mats.push(mat); }
      const b=add(EG.dart,mat); b.scale.set(.75*s,.5*s,1.4*s); b.add(edgeLines(EG.dart,lighten(c,.5),.9));
      const fl=add(EG.fin,mat,0,0,-.25*s); fl.scale.setScalar(s); fl.rotation.z=.2;
      const eye=add(EG.eye,basicGlow(0xffffff),0,.12*s,.55*s); eye.scale.setScalar(s); eye.add(glow(c,1.2*s,.9));
      inner.add(glow(c,2.6*s,.35)); break;
    }
    case 'shooter': {
      const b=add(EG.ico,mat); b.add(edgeLines(EG.ico,lighten(col,.5)));
      P.ring=add(EG.ring,basicGlow(lighten(col,.3),.95)); P.ring.rotation.x=Math.PI/2.4;
      P.sp=new THREE.Group(); inner.add(P.sp);
      for(let i=0;i<3;i++){ const sp=add(EG.spike,mat,Math.sin(i*TAU/3)*.6,0,Math.cos(i*TAU/3)*.6,P.sp); sp.rotation.x=Math.PI/2; sp.rotation.y=i*TAU/3; }
      add(EG.core,basicGlow(0xffffff),0,0,0).scale.setScalar(.6);
      inner.add(glow(col,3,.45)); break;
    }
    case 'splitter': {
      P.blobs=[];
      for(let i=0;i<3;i++){ const b=add(EG.blob,mat,Math.sin(i*TAU/3)*.42,0,Math.cos(i*TAU/3)*.42); b.add(edgeLines(EG.blob,lighten(col,.4),.5)); P.blobs.push(b); }
      add(EG.core,basicGlow(0xd8fff6)); inner.add(glow(col,3.2,.5)); break;
    }
    case 'tank': {
      const b=add(EG.tankBody,mat); b.add(edgeLines(EG.tankBody,lighten(col,.5)));
      const arm=stdMat(0x5a3418,.15,.8,.35,.9); mats.push(arm);
      for(const sx of [-.75,.75]){ add(EG.plate,arm,sx,.05,0).add(edgeLines(EG.plate,lighten(col,.3),.7)); add(EG.tread,arm,sx*1.05,-.3,0); }
      add(EG.visor,basicGlow(0xffd27a),0,.1,.82); inner.add(glow(col,3.4,.4)); break;
    }
    case 'boss': case 'ultimate': {
      const k=type==='ultimate'?1.35:1;
      const core=add(EG.dodeca,mat); core.scale.setScalar(k); core.add(edgeLines(EG.dodeca,lighten(col,.6)));
      P.shell=add(EG.shell,new THREE.MeshBasicMaterial({color:lighten(col,.2),wireframe:true,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false})); P.shell.scale.setScalar(k); mats.push(P.shell.material);
      P.sats=new THREE.Group(); inner.add(P.sats);
      for(let i=0;i<(type==='ultimate'?5:3);i++){ const s=add(EG.sat,basicGlow(0xffe0f0),Math.sin(i*TAU/3)*3.2*k,0,Math.cos(i*TAU/3)*3.2*k,P.sats); s.add(glow(col,1.5,.9)); }
      P.ringM=new THREE.Mesh(EG.bossRing,basicGlow(lighten(col,.4),.9)); P.ringM.rotation.x=Math.PI/2; P.ringM.scale.setScalar(k); scene.add(P.ringM);
      if(type==='ultimate'){ P.ring2=add(EG.bossRing,basicGlow(0xffc04d,.8)); P.ring2.scale.setScalar(.85); }
      inner.add(glow(col,9*k,.55)); break;
    }
    case 'queen': {
      const core=add(EG.hex,mat); core.add(edgeLines(EG.hex,lighten(col,.6)));
      const pm=stdMat(0xff8a00,.35,.85,.25,.55); mats.push(pm);
      P.plates=[];
      for(let i=0;i<6;i++){ const g=new THREE.Group(); g.rotation.y=i*TAU/6; inner.add(g); const p=add(EG.hplate,pm,0,0,1.35,g); p.add(edgeLines(EG.hplate,0xffd27a,.8)); P.plates.push(p); }
      for(let i=0;i<6;i++){ const c=add(EG.crown,basicGlow(0xffe08a),Math.sin(i*TAU/6)*.7,1.15,Math.cos(i*TAU/6)*.7); c.rotation.z=Math.sin(i*TAU/6)*.3; }
      P.core=add(EG.core,basicGlow(0xffffff),0,0,0); P.core.scale.setScalar(1.6); P.core.add(glow(0xffb020,5,.9));
      inner.add(glow(col,8,.4)); break;
    }
    case 'bee': {
      const b=add(EG.beeBody,mat); b.scale.set(1,1,1.4);
      const dk=new THREE.MeshStandardMaterial({color:0x1a1206,roughness:.6}); mats.push(dk);
      for(const z of [-.12,.16]){ const r=add(EG.beeBand,dk,0,0,z); }
      P.wings=[];
      for(const sx of [-1,1]){ const w=add(EG.wingP,new THREE.MeshBasicMaterial({color:0xd8f4ff,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}),sx*.4,.25,0); w.rotation.x=-Math.PI/2; mats.push(w.material); P.wings.push(w); }
      add(EG.spike,basicGlow(0xffe08a),0,0,-.6).rotation.x=-Math.PI/2;
      inner.add(glow(col,1.8,.6)); break;
    }
    case 'egg': {
      mat.dispose(); mats.length=0; mat=new THREE.MeshStandardMaterial({color:0xfff2c8,emissive:0xffc860,emissiveIntensity:.5,roughness:.35,metalness:.1,transparent:true,opacity:.92}); mats.push(mat);
      const e=add(EG.egg,mat); e.scale.set(1,1.2,1);
      P.glow=glow(0xffb020,1.6,.9,true); inner.add(P.glow); mats.push(P.glow.material); break;
    }
    case 'golem': {
      mat.dispose(); mats.length=0; mat=new THREE.MeshStandardMaterial({color:0x3b2a24,emissive:0xff5a1a,emissiveIntensity:.25,roughness:.85,metalness:.15,flatShading:true}); mats.push(mat);
      const r=add(EG.rock,mat); r.scale.set(1.15,1,1.1); r.add(edgeLines(EG.rock,0xff7a2a,.95));
      P.core=add(EG.core,basicGlow(0xffb060),0,.1,0); P.core.scale.setScalar(1.3); P.core.add(glow(0xff6a1a,4.5,.8));
      P.chunks=new THREE.Group(); inner.add(P.chunks);
      for(let i=0;i<5;i++){ const c=add(EG.chunk,mat,Math.sin(i*TAU/5)*2,rnd(-.4,.6),Math.cos(i*TAU/5)*2,P.chunks); c.add(edgeLines(EG.chunk,0xff7a2a,.8)); }
      break;
    }
    case 'hole': {
      add(EG.holeCore,new THREE.MeshBasicMaterial({color:0x000000}));
      P.diskMat=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uS:{value:0}},
        vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader:`varying vec2 vUv;uniform float uT,uS;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float a=atan(p.y,p.x);float sw=.5+.5*sin(a*3.+r*12.-uT*(3.+uS*7.));float fall=smoothstep(1.,.45,r)*smoothstep(.37,.43,r);vec3 c=mix(vec3(.62,.28,1.),vec3(1.,.38,.18),uS);gl_FragColor=vec4(c*(.35+sw*.9)*fall*1.5,fall);}`,
        transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
      mats.push(P.diskMat);
      P.disk=add(EG.disk,P.diskMat); P.disk.rotation.x=-Math.PI/2+.25;
      P.photon=add(EG.photon,basicGlow(0xe6d0ff)); P.photon.rotation.x=Math.PI/2;
      P.glow=glow(0x9a4dff,9,.6,true); inner.add(P.glow); mats.push(P.glow.material); break;
    }
    case 'twinA': case 'twinB': {
      const a=type==='twinA';
      mat.dispose(); mats.length=0; mat=new THREE.MeshStandardMaterial({color:a?0xc8d4ea:0x2a1650,emissive:a?0x9fb8ff:0x6a3dff,emissiveIntensity:.45,metalness:.9,roughness:.15,flatShading:true,transparent:true,opacity:1}); mats.push(mat); fade.push([mat,1]);
      const c=add(EG.crystal,mat); c.scale.set(1,1.65,1); c.add(edgeLines(EG.crystal,a?0xffffff:0xb69bff));
      P.mirror=add(EG.mirror,new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xbfe8ff,emissiveIntensity:.55,metalness:1,roughness:.05,transparent:true,opacity:.75,side:THREE.DoubleSide})); mats.push(P.mirror.material);
      P.mirror.add(edgeLines(EG.mirror,0xffffff,.9));
      P.mglow=glow(0xffffff,2.6,.8); P.mglow.position.set(0,0,1.8); inner.add(P.mglow);
      inner.add(glow(a?0xbfd8ff:0x8a5cff,6,.45)); break;
    }
    case 'maestro': {
      mat.dispose(); mats.length=0; mat=new THREE.MeshStandardMaterial({color:0x8a5a10,emissive:0xffb020,emissiveIntensity:.55,metalness:.7,roughness:.2}); mats.push(mat);
      P.clef=add(EG.clef,mat); P.clef.scale.setScalar(1.25);
      P.staffs=[];
      for(let i=0;i<3;i++){ const s=add(EG.staff,basicGlow(0xffe6a8,.4)); s.rotation.x=Math.PI/2; s.scale.setScalar(1+i*.12); P.staffs.push(s); }
      P.glow=glow(0xffc040,7,.22,true); inner.add(P.glow); mats.push(P.glow.material); break;
    }
    case 'note': {
      mat.dispose(); mats.length=0; mat=new THREE.MeshStandardMaterial({color:0x103040,emissive:0x6ef0ff,emissiveIntensity:1.3,metalness:.5,roughness:.2}); mats.push(mat);
      const h=add(EG.noteHead,mat,0,0,.5); h.scale.set(1.3,.55,1); h.rotation.y=.4;
      add(EG.stem,mat,.5,0,-.15); const f=add(EG.flag,mat,.72,0,-.78); f.rotation.y=-.5;
      P.glow=glow(0x6ef0ff,3.4,.7,true); inner.add(P.glow); mats.push(P.glow.material); inner.scale.setScalar(1.35); break;
    }
    case 'ghost': case 'decoy': {
      mat.dispose(); mats.length=0; mat=new THREE.MeshStandardMaterial({color:0x2a1650,emissive:0xb07bff,emissiveIntensity:.8,metalness:.2,roughness:.4,transparent:true,opacity:1,side:THREE.DoubleSide,depthWrite:false}); mats.push(mat); fade.push([mat,.85]);
      const hd=add(EG.hood,mat,0,.35,0); hd.scale.set(1,1.1,1);
      const cl=add(EG.cloak,mat,0,-.75,0); cl.rotation.x=Math.PI;
      const em=basicGlow(0xff6bd6,1); mats.push(em); fade.push([em,1]);
      for(const sx of [-.32,.32]) add(EG.eye,em,sx,.45,.78).scale.set(1.4,.7,.7);
      P.aura=glow(0xb07bff,6,.5,true); inner.add(P.aura); mats.push(P.aura.material); fade.push([P.aura.material,.5]); break;
    }
    case 'thief': {
      mat.dispose(); mats.length=0; mat=new THREE.MeshStandardMaterial({color:0x1d3a2a,emissive:0x3dff8a,emissiveIntensity:.35,metalness:.85,roughness:.25,flatShading:true}); mats.push(mat);
      const palm=add(EG.palm,mat); palm.add(edgeLines(EG.palm,0x7dffb0));
      add(EG.wrist,mat,0,0,-.85).rotation.x=Math.PI/2;
      const jm=basicGlow(0x7dffb0); mats.push(jm);
      P.fingers=[];
      for(let i=0;i<4;i++){ const g=new THREE.Group(); g.position.set(-.5+i*.33,0,.58); inner.add(g); add(EG.knuckle,jm,0,0,0,g); const s1=add(EG.seg,mat,0,0,.32,g); const g2=new THREE.Group(); g2.position.z=.6; g.add(g2); add(EG.knuckle,jm,0,0,0,g2).scale.setScalar(.8); add(EG.seg,mat,0,0,.28,g2).scale.set(.9,.9,.85); P.fingers.push([g,g2]); }
      const th=new THREE.Group(); th.position.set(.75,0,.1); th.rotation.y=-1.1; inner.add(th); add(EG.knuckle,jm,0,0,0,th); add(EG.seg,mat,0,0,.32,th); P.thumb=th;
      inner.add(glow(0x3dff8a,6,.45)); break;
    }
    case 'clock': {
      mat.dispose(); mats.length=0; mat=new THREE.MeshStandardMaterial({color:0x101a2e,emissive:0x2a8cff,emissiveIntensity:.25,metalness:.85,roughness:.25}); mats.push(mat);
      add(EG.disc,mat);
      add(EG.rim,basicGlow(0x7ad7ff,.95),0,.18,0).rotation.x=Math.PI/2;
      for(let i=0;i<12;i++){ const tk=add(EG.tick,basicGlow(i%3?0x7ad7ff:0xffffff),Math.sin(i*TAU/12)*2.7,.22,Math.cos(i*TAU/12)*2.7); tk.rotation.y=i*TAU/12; }
      P.gem=add(EG.gem,basicGlow(0xffffff),0,.6,0); P.gem.add(glow(0x7ad7ff,3.5,.9));
      P.hour=new THREE.Mesh(handGeo,beamMat(0xffc04d)); P.hour.position.y=.5; P.hour.scale.set(2,1,R); m.add(P.hour); mats.push(P.hour.material);
      P.min=new THREE.Mesh(handGeo,beamMat(0x6ef0ff)); P.min.position.y=.55; P.min.scale.set(.75,1,R); m.add(P.min); mats.push(P.min.material);
      P.hour.material.uniforms.uFire.value=.85; P.min.material.uniforms.uFire.value=.9;
      inner.add(glow(0x7ad7ff,10,.35)); break;
    }
    case 'bubble': {
      mat.dispose(); mats.length=0; mat=fresnelMat(0x8fd8ff,2.,.75); mats.push(mat);
      P.b=add(EG.bubble,mat);
      const fill=new THREE.MeshBasicMaterial({color:0x6fb8ff,transparent:true,opacity:.07,depthWrite:false}); mats.push(fill); add(EG.bubble,fill).scale.setScalar(.98); break;
    }
    case 'dhead': {
      const h=add(EG.dhead,mat); h.scale.set(.9,.6,1.75); h.add(edgeLines(EG.dhead,0xffb0f0));
      for(const sx of [-.45,.45]){ const hn=add(EG.horn,stdMat(0xffffff,.6,.8,.2,.8),sx,.35,-.7); hn.rotation.x=-Math.PI/2.6; hn.rotation.z=-sx*.6; mats.push(hn.material); }
      const em=basicGlow(0xffffff); for(const sx of [-.32,.32]){ const e=add(EG.eye,em,sx,.22,.95); e.add(glow(0xff3fd0,1.4,.9)); }
      P.glow=glow(0xff3fd0,5.5,.55,true); inner.add(P.glow); mats.push(P.glow.material); break;
    }
    case 'dseg': {
      mat.dispose(); mats.length=0; mat=stdMat(0x8a5cff,.85,.4,.25,.4,{flatShading:false}); mats.push(mat);
      add(EG.dseg,mat).scale.set(1,.8,1);
      for(const sx of [-.3,.3]){ const sp=add(EG.dspike,basicGlow(0xff6bd6),sx,.65,0); sp.rotation.z=-sx; }
      inner.add(glow(0xb07bff,3,.5)); break;
    }
    case 'mine': {
      const b=add(EG.mine,mat); b.add(edgeLines(EG.mine,0xff8899));
      for(let i=0;i<8;i++){ const sp=add(EG.mspike,mat); const a=i*TAU/8; sp.position.set(Math.sin(a)*.42,i%2?.15:-.1,Math.cos(a)*.42); sp.lookAt(sp.position.x*3,sp.position.y*3,sp.position.z*3); sp.rotateX(Math.PI/2); }
      P.glow=glow(0xff3355,2.2,.9,true); inner.add(P.glow); mats.push(P.glow.material); break;
    }
  }
  m.scale.setScalar(.01); scene.add(m);
  return {m,inner,mat,mats,P,fade,baseEI:mat.emissiveIntensity||0};
}
function disposeEnemy(e){
  scene.remove(e.m);
  if(e.P&&e.P.ringM) scene.remove(e.P.ringM);
  for(const m of e.mats) m.dispose();
}
// hiệu ứng động theo loại (chạy ở cả chủ phòng lẫn khách)
function animEnemy(e,dt){
  const P=e.P, t=tAll+(e.id%17);
  if(e.punch>0){ e.punch=Math.max(0,e.punch-dt*7); }
  const pk=(1+(e.punch||0)*.14)*(e.type==='note'?1.35:1); e.inner.scale.setScalar(pk);
  if(e.mat&&e.mat.emissiveIntensity!==undefined&&e.type!=='bubble'){ const f=(e.flashV||0); e.mat.emissiveIntensity=e.baseEI+f*2.6; }
  switch(e.type){
    case 'shooter': P.ring.rotation.z+=dt*3; P.sp.rotation.y+=dt*2; break;
    case 'splitter': P.blobs.forEach((b,i)=>b.scale.setScalar(1+.12*Math.sin(t*5+i*2))); e.inner.rotation.y+=dt*1.2; break;
    case 'boss': case 'ultimate': P.shell.rotation.y+=dt*.6; P.shell.rotation.x+=dt*.25; P.sats.rotation.y+=dt*1.4;
      if(P.ringM){ P.ringM.position.set(e.m.position.x,.3,e.m.position.z); P.ringM.rotation.z+=dt*1.5; P.ringM.visible=e.m.visible; }
      if(P.ring2) P.ring2.rotation.y-=dt*2;
      if(e.type==='ultimate'){ const ph=e.st||1; e.mat.emissive.setHex(ph===3?0xff2020:ph===2?0xffc04d:0xff2a7a); P.shell.material.opacity=e.inv?.75:.35; }
      break;
    case 'queen': { const op=e.stV=(e.stV||0)+((e.st?1:0)-(e.stV||0))*Math.min(1,dt*6);
      P.plates.forEach(p=>{ p.position.z=1.35+op*.95; p.rotation.x=-op*.55; }); P.core.scale.setScalar(1.3+op*.8+Math.sin(t*8)*.1*op); e.inner.rotation.y+=dt*.3; break; }
    case 'bee': P.wings.forEach((w,i)=>w.rotation.z=Math.sin(t*40+i*Math.PI)*.6); break;
    case 'egg': { const a=e.a||0; P.glow.scale.setScalar(1.4+a*1.8+Math.sin(t*(6+a*20))*.3*a); P.glow.material.opacity=.5+a*.5; e.inner.rotation.z=Math.sin(t*(4+a*30))*.08*a; break; }
    case 'golem': P.chunks.rotation.y+=dt*.8; P.core.scale.setScalar(1.2+Math.sin(t*3)*.15); e.inner.rotation.y+=dt*.25; break;
    case 'hole': { P.diskMat.uniforms.uT.value=tAll; const s=e.stV=(e.stV||0)+((e.st?1:0)-(e.stV||0))*Math.min(1,dt*4); P.diskMat.uniforms.uS.value=s; P.disk.rotation.z+=dt*(1+s*3); P.glow.material.color.setHex(e.st?0xff5a3a:0x9a4dff); P.glow.scale.setScalar(8+Math.sin(t*3)*.8+s*3); break; }
    case 'twinA': case 'twinB': { const down=e.st===1; const op=down?.25+.15*Math.sin(t*20):1; for(const [m,b] of e.fade){ m.opacity=b*op; } P.mirror.visible=!down; P.mglow.visible=!down; e.inner.rotation.y=0; break; }
    case 'maestro': { P.staffs.forEach((s,i)=>{ s.rotation.z+=dt*(.4+i*.3)*(i%2?-1:1); s.scale.setScalar((1+i*.12)*(1+Math.sin(t*6.1)*.03)); });
      const v=e.st===1; e.mat.emissive.setHex(v?(Math.sin(t*14)>0?0xff5a5a:0xffffff):0xffc040); P.glow.material.color.setHex(v?0xff5a5a:0xffc040); P.clef.position.y=Math.sin(t*2)*.15; break; }
    case 'note': { const c=NOTE_COLS[(e.a|0)%4]; e.mat.emissive.setHex(c); P.glow.material.color.setHex(c); e.inner.rotation.y=Math.sin(t*2)*.4; e.inner.position.y=Math.sin(t*3)*.25; break; }
    case 'ghost': case 'decoy': { const vis=e.type==='decoy'?.42:(e.a===undefined?1:e.a); for(const [m,b] of e.fade) m.opacity=b*vis; e.inner.position.y=Math.sin(t*2.5)*.25; e.inner.rotation.z=Math.sin(t*1.7)*.08; break; }
    case 'thief': P.fingers.forEach(([g,g2],i)=>{ const c=.25+.25*Math.sin(t*4+i*.6); g.rotation.x=c; g2.rotation.x=c*1.2; }); P.thumb.rotation.x=.3+.2*Math.sin(t*4); break;
    case 'clock': P.hour.rotation.y=e.a||0; P.min.rotation.y=e.b||0; P.hour.material.uniforms.uT.value=tAll; P.min.material.uniforms.uT.value=tAll; P.gem.rotation.y+=dt*2;
      P.hour.scale.z=P.min.scale.z=RA; e.mat.emissiveIntensity=e.st===1?1.6:.25; break;
    case 'bubble': P.b.scale.setScalar(1+Math.sin(t*2)*.03); break;
    case 'dseg': e.inner.rotation.y+=dt*2; break;
    case 'mine': P.glow.material.opacity=e.st?(Math.sin(t*16)>0?1:.25):.4; P.glow.scale.setScalar(e.st?2.6:1.8); e.inner.rotation.y+=dt*2; break;
  }
}

/* ---------- nâng cấp ---------- */
// f(S, ship): S là chỉ số của tàu nhận nâng cấp
const U=[
  {id:'dmg',g:'DMG',n:'Đạn Nặng',d:'+25% sát thương mỗi viên đạn.',max:6,f:S=>S.dmg*=1.25},
  {id:'rate',g:'ROF',n:'Cò Siêu Tốc',d:'+20% tốc độ bắn.',max:6,f:S=>S.rate*=1.2},
  {id:'multi',g:'×N',n:'Chùm Đạn',d:'Bắn thêm 1 tia đạn mỗi lần nhả cò.',max:5,f:S=>S.multi++},
  {id:'pierce',g:'PRC',n:'Xuyên Giáp',d:'Mỗi viên đạn xuyên thêm 1 kẻ địch.',max:4,f:S=>S.pierce++},
  {id:'speed',g:'SPD',n:'Động Cơ Ion',d:'+12% tốc độ di chuyển.',max:4,f:S=>S.speed*=1.12},
  {id:'hp',g:'HP+',n:'Vỏ Gia Cố',d:'+25 giáp tối đa và hồi ngay 40 giáp.',max:5,f:S=>{S.maxHp+=25;S.hp=Math.min(S.maxHp,S.hp+40);}},
  {id:'regen',g:'REG',n:'Nano Tự Sửa',d:'Tự hồi 1,5 giáp mỗi giây.',max:4,f:S=>S.regen+=1.5},
  {id:'orbit',g:'ORB',n:'Lưỡi Quỹ Đạo',d:'Thêm 1 lưỡi năng lượng xoay quanh tàu, cắt mọi thứ chạm vào.',max:6,f:(S,s)=>syncBlades(s,s.upg.orbit||0)},
  {id:'chain',g:'ARC',n:'Sét Dây Chuyền',d:'+20% cơ hội đạn phóng sét sang 2 kẻ địch gần.',max:4,f:S=>S.chain+=.2},
  {id:'boom',g:'EXP',n:'Phản Ứng Dây Chuyền',d:'Kẻ địch nổ tung khi chết, gây sát thương vùng. Nổ có thể kích nổ tiếp.',max:3,f:S=>S.boom++},
  {id:'crit',g:'CRT',n:'Điểm Yếu',d:'+12% tỉ lệ chí mạng, mỗi đòn chí mạng gây x2,5 sát thương.',max:4,f:S=>S.crit+=.12},
  {id:'magnet',g:'MAG',n:'Từ Trường',d:'+60% tầm hút tinh thể kinh nghiệm.',max:3,f:S=>S.magnet*=1.6},
  {id:'dash',g:'DSH',n:'Lướt Húc',d:'Lướt hồi nhanh hơn 25% và húc nát kẻ địch trên đường đi.',max:3,f:S=>S.dashCd*=.75},
  {id:'size',g:'PLS',n:'Lõi Plasma',d:'Đạn to hơn 35% và mạnh hơn 10%.',max:3,f:S=>{S.bsize*=1.35;S.dmg*=1.1;}}
];
const HEAL={id:'heal',g:'+HP',n:'Sửa Chữa Khẩn',d:'Hồi đầy giáp.',max:99,f:S=>S.hp=S.maxHp};
const UMAP={heal:HEAL}; for(const u of U) UMAP[u.id]=u;
// tính lại chỉ số từ danh sách nâng cấp (dùng khi bị Kẻ Đánh Cắp lấy mất / trả lại)
function recalcStats(s){
  const hp=s.S.hp, S=baseStats(); s.S=S;
  for(const id in s.upg){ const u=UMAP[id]; if(!u||id==='heal') continue; for(let i=0;i<(s.upg[id]||0);i++) u.f(S,s); }
  S.hp=Math.max(1,Math.min(hp,S.maxHp));
  syncBlades(s,s.upg.orbit||0);
}
function syncStats(s){ if(s.local) chips(); else Net.send({t:'me',to:s.id,S:s.S,upg:s.upg}); }

/* ---------- âm thanh ---------- */
let AC=null, master=null, noiseBuf=null, muted=false;
function audio(){
  if(AC) return AC;
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain(); master.gain.value=.32*SET.sfx/100; master.connect(AC.destination);
    noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
    const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  }catch(e){AC=null;}
  return AC;
}
function tone(f,d,type='square',v=.12,slide=.5,at=0,filt=0){
  if(!AC||muted) return;
  const t=at||AC.currentTime, o=AC.createOscillator(), g=AC.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide),t+d);
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
  let n=o; if(filt){const bq=AC.createBiquadFilter(); bq.type='lowpass'; bq.frequency.value=filt; o.connect(bq); n=bq;}
  n.connect(g); g.connect(master); o.start(t); o.stop(t+d+.03);
}
function noise(d,v=.2,freq=800,type='lowpass',at=0){
  if(!AC||muted) return;
  const t=at||AC.currentTime, s=AC.createBufferSource(), f=AC.createBiquadFilter(), g=AC.createGain();
  s.buffer=noiseBuf; f.type=type; f.frequency.value=freq;
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+d+.03);
}
let lastShot=0, lastPick=0, lastHit=0, lastLaser=0;
const sfx={
  shoot(){const n=performance.now(); if(n-lastShot<55) return; lastShot=n; tone(rnd(780,880),.06,'square',.03,.4); tone(rnd(1500,1700),.04,'sine',.02,.6);},
  hit(){const n=performance.now(); if(n-lastHit<40) return; lastHit=n; tone(320,.05,'triangle',.05,.6);},
  block(){const n=performance.now(); if(n-lastHit<60) return; lastHit=n; tone(1900,.05,'square',.025,.9); noise(.04,.05,5000,'highpass');},
  kill(){noise(.2,.16,1400); tone(180,.18,'sawtooth',.06,.3);},
  big(){noise(.7,.32,600); tone(90,.6,'sawtooth',.13,.25); tone(45,.8,'sine',.2,.5);},
  pick(){const n=performance.now(); if(n-lastPick<35) return; lastPick=n; tone(rnd(1100,1400),.05,'sine',.05,1.3);},
  hurt(){noise(.25,.25,500); tone(120,.25,'square',.1,.4);},
  dash(){noise(.2,.18,2400,'bandpass'); tone(300,.18,'sine',.05,2.2);},
  lvl(){if(!AC)return; const t=AC.currentTime; [523,659,784,1046].forEach((f,i)=>tone(f,.18,'triangle',.09,1,t+i*.07));},
  zap(){tone(1800,.08,'sawtooth',.03,.3);},
  enemyShot(){tone(500,.08,'sine',.03,.5);},
  laser(){const n=performance.now(); if(n-lastLaser<80) return; lastLaser=n; tone(220,.4,'sawtooth',.06,2.5,0,2400); noise(.3,.08,3000,'bandpass');},
  warn(){if(!AC)return; const t=AC.currentTime; tone(880,.12,'square',.05,1,t); tone(880,.12,'square',.05,1,t+.18);},
  boss(){if(!AC)return; const t=AC.currentTime; [110,98,82,65].forEach((f,i)=>tone(f,.5,'sawtooth',.11,.98,t+i*.22,900)); noise(1.2,.12,300,'lowpass',t);},
  win(){if(!AC)return; const t=AC.currentTime; [523,659,784,1046,1318,1568].forEach((f,i)=>tone(f,.3,'triangle',.1,1,t+i*.11));},
  steal(){tone(900,.25,'square',.06,.25); noise(.2,.1,2000,'highpass');},
  rewind(){if(!AC)return; const t=AC.currentTime; for(let i=0;i<6;i++) tone(1200-i*140,.08,'sine',.05,1.4,t+i*.05);}
};
/* ---------- nhạc nền (file mp3 trong thư mục music) ---------- */
const BGM_MAX=.8;                // âm lượng tối đa của nhạc nền; chỉnh mức nghe trong CÀI ĐẶT
const bgm=new Audio('music/nhac-nen.mp3');
bgm.loop=true; bgm.preload='auto';
let bgmOk=true;
bgm.addEventListener('error',()=>{bgmOk=false;});   // không có file → dùng nhạc tự tạo
function applyVolume(){ bgm.volume=clamp(BGM_MAX*SET.music/100,0,1); if(master) master.gain.value=.32*SET.sfx/100; }
applyVolume();
function bgmPlay(){ if(bgmOk&&!muted&&SET.music>0){ const p=bgm.play(); if(p&&p.catch) p.catch(()=>{}); } }
function bgmPause(){ bgm.pause(); }
// nhạc điện tử tự tạo khi không có file mp3
let musT=0, musStep=0;
const SPB=60/116/4, ROOTS=[33,36,31,28];
const midi=m=>440*Math.pow(2,(m-69)/12);
function music(){
  if(bgmOk||!AC||muted||state!=='play'||SET.music<=0) return;
  if(musT<AC.currentTime) musT=AC.currentTime+.02;
  const vm=SET.music/100;
  while(musT<AC.currentTime+.18){
    const s=musStep%16, bar=Math.floor(musStep/16)%4, boss=G&&G.bossR>0;
    if(s%2===0) tone(midi(ROOTS[bar]+(s%8===6?12:0)),SPB*1.7,'sawtooth',.05*vm,1,musT,boss?1100:650);
    if(s%4===0) tone(150,.2,'sine',.16*vm,.27,musT);
    if((G&&G.wave>=3||boss)&&s%4===2) noise(.04,.05*vm,7000,'highpass',musT);
    if(boss&&s%8===4) noise(.12,.08*vm,1800,'bandpass',musT);
    musT+=SPB; musStep++;
  }
}

/* ---------- trạng thái ---------- */
// state: menu | lobby | play | levelup | pause | dying | over
let state='menu', G=null;
const enemies=[], pendingBoom=[];
const netEn=new Map();   // kẻ địch trên máy khách (chỉ để vẽ), theo id
let isTouch=false, autoFire=false, ovl=false;
const keys={}, mouse={x:0,y:0,down:false}, aimPt=new V3(0,.6,-5);
const ray=new THREE.Raycaster(), aimPlane=new THREE.Plane(new V3(0,1,0),-.6), ndc=new THREE.Vector2();
const tmp=new V3();
function getBest(){return +lsGet(KEY.best)||0;}
function setBest(v){lsSet(KEY.best,String(v));}
function showBest(){const b=getBest(); $('bestM').innerHTML=b?`KỶ LỤC CỦA BẠN <b>${b.toLocaleString('vi-VN')}</b>`:'';}

/* ---------- mạng ----------
   solo : chơi một mình
   host : chủ phòng, máy này chạy toàn bộ trận và gửi ảnh chụp trận đấu cho khách
   guest: khách, chỉ điều khiển tàu mình và vẽ lại những gì chủ phòng gửi        */
const NET={mode:'solo',myId:'me',hostId:null,code:null,roster:[],running:false,sendT:0};
const online=()=>NET.mode!=='solo';
const isHost=()=>NET.mode!=='guest';
const STATES=['play','levelup','dying','over'];
let fxq=[];
function q(ev){ if(NET.mode==='host'&&NET.running) fxq.push(ev); }

// hiệu ứng: vẽ trên máy này, và nếu là chủ phòng thì gửi cho khách
function emit(x,y,z,col,n,spd,life=.6,up=.6){ rawEmit(x,y,z,col,n,spd,life,up); q(['p',r2(x),r2(y),r2(z),col,n,r2(spd),r2(life),r2(up)]); }
function ring(x,z,col,size,dur=.4){ rawRing(x,z,col,size,dur); q(['r',r2(x),r2(z),col,r2(size),r2(dur)]); }
function bolt(a,b){ rawBolt(a,b); q(['b',r2(a.x),r2(a.y),r2(a.z),r2(b.x),r2(b.y),r2(b.z)]); }
function snd(name){ sfx[name](); q(['s',name]); }
function rawBanner(t,s){const b=$('banner'); $('banT').textContent=t; $('banS').textContent=s||''; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');}
function banner(t,s){ rawBanner(t,s); q(['n',t,s||'']); }
function rawToast(txt){ const t=$('toast'); t.textContent=txt; t.classList.remove('go'); void t.offsetWidth; t.classList.add('go'); }
function rawIntro(idx){ const b=BOSSES[idx]; if(!b) return; $('introK').textContent=idx===9?'TRẬN CUỐI':'BOSS ĐẶC BIỆT · ĐỢT '+((idx+1)*10); $('introT').textContent=b.name; $('introS').textContent=b.sub; const el=$('intro'); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); sfx.boss(); rawScreenFlash(.35); }
function shake(v){ if(G) G.shake=Math.max(G.shake,v); }
function flashHurt(){ $('vig').style.opacity=1; setTimeout(()=>$('vig').style.opacity=0,180); shake(.6); hurtFx=1; sfx.hurt(); }
let hurtFx=0, caFx=0;
// tia sáng khi kẻ địch xuất hiện
function rawSpawnFx(x,z,col,big){ rawRing(x,z,col,big?7:2.4,big?.9:.45); rawEmit(x,.4,z,col,big?60:10,big?12:4,.7,1.6,big?.7:.4,-2,.1); rawGlow(x,1,z,col,big?9:3,big?.6:.3); if(big){ rawFlash(x,z,col,5,.6); addRipple(x,z,1.5);} }
function spawnFx(x,z,col,big){ rawSpawnFx(x,z,col,big); q(['sp',r2(x),r2(z),col,big?1:0]); }
// vụ nổ khi kẻ địch chết
function rawDeathFx(x,y,z,col,size){
  const big=size>=2;
  rawEmit(x,y,z,col,22*size,8*Math.min(size,2.5),.75,.8,.45+size*.08);
  rawEmit(x,y,z,0xffffff,6*size,6*Math.min(size,2),.35,.6,.35);
  rawEmit(x,y,z,lighten(col,.4).getHex(),10*size,2.5,1.2,1.2,.3,-1.5,.3);
  rawGlow(x,y,z,col,3.5*size,.32); rawGlow(x,y,z,0xffffff,1.6*size,.12);
  rawDebris(x,y,z,col,4+size*3,5+size*1.5,Math.min(2,.6+size*.25));
  rawRing(x,z,col,size*3.2,big?.8:.35);
  if(size>=1.2) rawFlash(x,z,col,2+size,.25+size*.08);
  addRipple(x,z,Math.min(1.6,.35+size*.25));
  if(big){ rawScreenFlash(.25); caFx=Math.max(caFx,.8); }
}
function deathFx(x,y,z,col,size){ rawDeathFx(x,y,z,col,size); q(['k',r2(x),r2(y),r2(z),col,r2(size)]); }
function rawHitFx(x,y,z,col,crit,amount){ rawEmit(x,y,z,crit?0xffe08a:col,crit?9:4,crit?8:5,.32,.5,crit?.42:.32,6,.04); rawGlow(x,y,z,crit?0xffe08a:0xffffff,crit?1.6:.9,.08); rawDmg(x,y,z,amount,crit); }
function rawBlockFx(x,y,z){ rawEmit(x,y,z,0xb5b0cc,5,5,.25,.4,.3); rawGlow(x,y,z,0xffffff,1.2,.08); rawDmg(x,y,z,0,false,true); sfx.block(); }

/* ---------- chuẩn bị trận ---------- */
function clearWorld(){
  for(const e of enemies) disposeEnemy(e); enemies.length=0;
  for(const e of netEn.values()) disposeEnemy(e); netEn.clear();
  PB.clear(); EB.clear(); GM.clear(); RG.clear(); DB.clear(); pendingBoom.length=0; netPB.clear(); netEB.clear();
  for(const b of bolts){scene.remove(b.l); b.l.geometry.dispose(); b.l.material.dispose();} bolts.length=0;
  for(const b of beams){scene.remove(b.m); b.m.material.dispose();} beams.length=0;
  shocks.length=0;
  for(const k of marks){scene.remove(k.m); k.m.material.dispose();} marks.length=0;
  for(let k=0;k<PMAX;k++) pLife[k]=0;
  fxq=[]; RA=R;
}
function spawnPoint(slot,n){
  if(n<=1) return [0,0];
  const a=slot/4*TAU+Math.PI/4; return [Math.cos(a)*3,Math.sin(a)*3];
}
function newRun(list){
  clearWorld(); clearShips();
  for(const [id,name,slot] of list){
    const s=addShip(id,name,slot,id===NET.myId);
    const [x,z]=spawnPoint(slot,list.length);
    s.pos.set(x,0,z); s.tx=x; s.tz=z; s.lx=x; s.lz=z; s.inv=1.2;
  }
  G={wave:0,toSpawn:0,spawnT:0,spawnEvery:1,breakT:0,bossPending:0,bossQueue:-1,score:0,kills:0,shake:0,slow:0,
     boss:null,bossR:0,bossMax:1,bossKind:-1,bossInfo:'',bossInv:0,fight:null,combo:0,comboT:0,vacuum:false,deadT:0,time:0,
     level:1,xp:0,xpNext:8,pendingLv:0,lvlT:0,practice:false,wins:0,twinAng:0,shrink:false};
  if(isHost()){
    let w=1;
    if(PRACTICE>1){
      G.practice=true; w=PRACTICE;
      // luyện tập: tặng sẵn nâng cấp tương ứng với đợt
      const picks=Math.floor(PRACTICE*.6);
      for(const s of ships.values()) for(let i=0;i<picks;i++){ const o=makeOffer(s); const id=o[Math.floor(Math.random()*o.length)]; s.upg[id]=(s.upg[id]||0)+1; UMAP[id].f(s.S,s); }
      for(const s of ships.values()){ s.S.hp=s.S.maxHp; syncStats(s); }
      G.level=1+picks;
    }
    startWave(w);
    if(G.practice) setTimeout(()=>rawToast('CHẾ ĐỘ LUYỆN TẬP · KHÔNG GHI ĐIỂM'),2400);
  }
  chips();
}
function menuShip(){ clearWorld(); clearShips(); NET.myId='me'; const s=addShip('me','',0,true); s.pos.set(0,0,0); }

/* ---------- đợt & boss ---------- */
const crew=()=>Math.max(1,ships.size);
const loopMul=()=>1+Math.floor((G.wave-1)/100)*1.5;
const bossScale=()=>(1+.16*(G.wave-1))*(1+.45*(crew()-1))*loopMul();
function startWave(n){
  G.wave=n; G.vacuum=false;
  const special=n%10===0, classic=!special&&n%5===0;
  const c=crew();
  G.toSpawn=Math.round((special?3+n/5:classic?4+n:6+Math.floor(n*4.5))*(1+.5*(c-1)));
  if(special) G.toSpawn=Math.min(G.toSpawn,24);
  G.spawnEvery=Math.max(.22,1.1-n*.06)/(1+.25*(c-1))*(special?2.2:1);
  G.spawnT=special?6:1;
  // đồng đội đã gục được hồi sinh khi sang đợt mới
  for(const s of ships.values()){
    if(!s.dead) continue;
    s.dead=false; s.g.visible=true; s.S.hp=Math.round(s.S.maxHp*.5); s.inv=2.5;
    const [x,z]=spawnPoint(s.slot,ships.size); s.pos.set(x,0,z); s.tx=x; s.tz=z; s.vx=s.vz=0;
    emit(x,.7,z,0x2fe0d0,40,9,.7); ring(x,z,0x2fe0d0,6,.5);
    if(s.local) rawBanner('HỒI SINH','Quay lại chiến đấu!');
    else q(['rs',s.id,r2(x),r2(z)]);
  }
  if(special){ const idx=((n/10)-1)%10; G.bossQueue=idx; G.bossPending=3.2; rawIntro(idx); q(['I',idx]); }
  else if(classic){G.bossQueue=-1; G.bossPending=1.6; banner('CẢNH BÁO','Lõi Hư Không đang thức dậy'); snd('big');}
  else banner('ĐỢT '+n, n===1?'Sống sót. Lên cấp. Lặp lại.':`${G.toSpawn} mục tiêu đang tới`);
}

function pickType(){
  const n=G.wave, w=[['chaser',10]];
  if(n>=2) w.push(['shooter',3+n*.4]);
  if(n>=3) w.push(['splitter',2+n*.3]);
  if(n>=4) w.push(['tank',1+n*.25]);
  let s=w.reduce((a,b)=>a+b[1],0)*Math.random();
  for(const [k,v] of w){if((s-=v)<=0) return k;}
  return 'chaser';
}

function spawnEnemy(type,x,z,spawnT=.45,o={}){
  const t=T[type];
  const c=crew();
  const sc=t.boss||t.part?(type==='boss'?(1+.7*(G.wave/5-1))*(1+.35*(c-1)):bossScale()):(1+.14*(G.wave-1))*(1+.35*(c-1));
  const vis=buildEnemy(type);
  vis.m.position.set(x,t.y,z);
  const hp=o.hp||t.hp*sc;
  const e=Object.assign(vis,{id:++eSeq,ti:TYPES.indexOf(type),type,t,hp,max:o.max||hp,r:t.r,spd:t.spd*(1+.02*G.wave),spawn:spawnT,spawn0:spawnT,flash:0,flashV:0,
    cd:rnd(.5,1)*(t.fire||1),orbitCd:0,dashHit:{},vx:0,vz:0,kx:0,kz:0,ph:Math.random()*TAU,dir:Math.random()<.5?1:-1,dead:false,lastBoom:0,lastDmg:0,
    st:0,a:0,b:0,size:1,inv:false,dmgMul:1,punch:0},o);
  e.ai=AI[type]||null;
  if(t.boss&&type!=='boss') {}
  if(type==='boss'){ e.atkT=2.5; e.mode=null; e.ang=0; }
  enemies.push(e);
  const big=!!t.boss;
  spawnFx(x,z,t.col,big);
  return e;
}

function edgePos(){
  let a=Math.random()*TAU;
  const r=RA-1.5;
  let x=Math.cos(a)*r, z=Math.sin(a)*r;
  const s=nearestShip(x,z);
  if(s&&Math.hypot(x-s.pos.x,z-s.pos.z)<12){a+=Math.PI;x=Math.cos(a)*r;z=Math.sin(a)*r;}
  return [x,z,a];
}

// gọi boss đặc biệt
function startFight(idx){
  const [ex,ez]=edgePos(), bx=ex*.55, bz=ez*.55;
  const f={kind:idx,parts:[]};
  G.fight=f; G.bossKind=idx;
  switch(BOSSES[idx].key){
    case 'queen': { const q=spawnEnemy('queen',bx,bz,1.4,{open:0,tq:4,beeT:1,bees:[],eggT:0}); f.main=q; for(let i=0;i<6;i++) spawnBee(q,i); break; }
    case 'golem': f.main=spawnEnemy('golem',bx,bz,1.4,{lvl:0,stompT:3,jump:0,size:1}); break;
    case 'hole': f.main=spawnEnemy('hole',0,0,1.6,{cyc:6,spitT:2}); break;
    case 'twins': { G.twinAng=Math.random()*TAU; const A=spawnEnemy('twinA',Math.cos(G.twinAng)*10,Math.sin(G.twinAng)*10,1.4,{face:0,fireT:2,down:0,preventDeath:twinPrevent});
      const B=spawnEnemy('twinB',-Math.cos(G.twinAng)*10,-Math.sin(G.twinAng)*10,1.4,{face:0,fireT:3.1,down:0,preventDeath:twinPrevent}); A.partner=B; B.partner=A; A.lead=true; f.main=A; break; }
    case 'maestro': { const m=spawnEnemy('maestro',0,0,1.6,{vuln:0,beatT:1,notes:[],summoned:false,ang:0}); f.main=m; summonNotes(m); break; }
    case 'ghost': f.main=spawnEnemy('ghost',bx,bz,1.4,{a:1,expose:0,markT:0,mkCd:4,decoyT:3,wan:Math.random()*TAU}); break;
    case 'thief': f.main=spawnEnemy('thief',bx,bz,1.4,{grow:0,stolen:[],xpStore:0,fireT:2,stealCd:{}}); break;
    case 'clock': f.main=spawnEnemy('clock',0,0,1.6,{a:0,b:Math.PI,bubT:3,rwT:5,rwHp:0,stT:0}); f.main.rwHp=f.main.hp; break;
    case 'dragon': { const h=spawnEnemy('dhead',ex*.8,ez*.8,1.2,{segs:[],path:[],dirA:Math.atan2(-ex,-ez),phi:Math.random()*TAU,chT:8,wind:0,charge:0,mineT:3});
      for(let i=0;i<20;i++){ const sg=spawnEnemy('dseg',ex*.8,ez*.8,.9+i*.03,{owner:h,idx:i}); h.segs.push(sg); }
      f.main=h; break; }
    case 'ultimate': f.main=spawnEnemy('ultimate',0,0,2,{phase:1,atkT:3,notes:[],summoned:false,pullT:0,spT:0,mineT:3,chargeT:6,charge:0,a:0}); break;
  }
  G.boss=f.main;
  G.bossMax=enemies.filter(e=>!e.dead&&(e.t.boss||e.t.bar)).reduce((s,e)=>s+e.max,0)||1;
  shake(1); addRipple(0,0,2);
}
function spawnBee(q,slot){ const a=G.time*1.5+slot*TAU/6; const b=spawnEnemy('bee',q.m.position.x+Math.cos(a)*3.8,q.m.position.z+Math.sin(a)*3.8,.5,{owner:q,slot}); q.bees[slot]=b; return b; }
function summonNotes(o){
  const n=o.hp<o.max*.5?4:3; o.notes=[];
  for(let i=0;i<n;i++){ const a=i*TAU/n; o.notes.push(spawnEnemy('note',Math.cos(a)*11,Math.sin(a)*11,.7,{owner:o,idx:i,n,lzT:2+i*.9,a:i})); }
  o.summoned=true; o.vuln=0; o.st=0;
  banner('NỐT NHẠC XUẤT HIỆN','Phá hết nốt nhạc để gây sát thương');
}
function silentKill(e,fx=true){ if(e.dead) return; e.dead=true; e.silent=true; if(fx) deathFx(e.m.position.x,e.m.position.y,e.m.position.z,e.t.col,.8); }
function endFight(){
  const f=G.fight; G.fight=null;
  for(const e of enemies) if(!e.dead&&e.t.part) silentKill(e);
  for(const s of ships.values()) if(!s.dead) s.S.hp=Math.min(s.S.maxHp,s.S.hp+40);
  G.bossKind=-1; G.boss=null; G.shrink=false;
  if(f&&f.kind===9){
    G.wins++; G.score+=50000*loopMul();
    banner('CHIẾN THẮNG','Lõi Hư Không Tối Thượng đã vỡ · +50.000 điểm'); snd('win'); q(['V']); victoryFx();
  } else if(f&&f.kind>=0) banner(BOSSES[f.kind].name,'ĐÃ BỊ HẠ · +40 giáp cho cả đội');
  else banner('LÕI ĐÃ VỠ','+40 giáp cho cả đội');
}
function victoryFx(){ rawScreenFlash(.8); for(let i=0;i<6;i++) setTimeout(()=>{ const a=Math.random()*TAU, r=rnd(4,16); rawDeathFx(Math.cos(a)*r,2,Math.sin(a)*r,[0xffc04d,0xff3fa4,0x2fe0d0][i%3],2.5); sfx.big(); },i*260); }

// tiện ích tấn công
const angTo=(x,z,s)=>Math.atan2(s.pos.x-x,s.pos.z-z);
function spray(x,z,n,spd,off=0,size=1){ for(let k=0;k<n;k++) fireE(x,z,off+k*TAU/n,spd,size); }
function fan(x,z,a,n,spread,spd,size=1){ for(let k=0;k<n;k++) fireE(x,z,a+(n>1?(k/(n-1)-.5)*spread:0),spd,size); }
function beam(x1,z1,x2,z2,w,warn,fire,col,dmg){ rawBeam(x1,z1,x2,z2,w,warn,fire,col,dmg); q(['L',r2(x1),r2(z1),r2(x2),r2(z2),r2(w),r2(warn),r2(fire),col]); if(isHost()) sfx.warn(); }
function laserAt(x,z,s,w,warn,fire,col,dmg){ const a=angTo(x,z,s); beam(x,z,x+Math.sin(a)*70,z+Math.cos(a)*70,w,warn,fire,col,dmg); }
function shock(x,z,spd,maxR,dmg,col){ shocks.push({x,z,r:0,spd,maxR,dmg,hit:new Set()}); rawShock(x,z,spd,maxR,col); q(['W',r2(x),r2(z),r2(spd),r2(maxR),col]); }
function markShip(s,dur){ rawMark(s.id,dur); q(['mk',s.id,r2(dur)]); }
function toast(s,txt){ if(s.local) rawToast(txt); else q(['to',s.id,txt]); }
function segDist(px,pz,x1,z1,x2,z2){ const dx=x2-x1,dz=z2-z1,l2=dx*dx+dz*dz||1; let t=((px-x1)*dx+(pz-z1)*dz)/l2; t=clamp(t,0,1); const ex=x1+dx*t-px, ez=z1+dz*t-pz; return Math.sqrt(ex*ex+ez*ez); }
function moveTo(e,x,z,k){ e.m.position.x+=(x-e.m.position.x)*k; e.m.position.z+=(z-e.m.position.z)*k; }
function enemyDmg(base){ return base*(1+.04*G.wave); }

/* AI từng loại boss. Trả về [hướngX, hướngZ, tốc độ] để di chuyển như thường,
   hoặc false nếu tự đặt vị trí. */
const AI={
  queen(e,dt){
    const m=e.m.position; e.tq-=dt;
    if(e.open){ if(e.tq<=0){ e.open=0; e.st=0; e.tq=e.hp<e.max*.5?4:5.5; } }
    else if(e.tq<=0){ e.open=1; e.st=1; e.tq=3.2;
      for(let i=0;i<(e.hp<e.max*.5?6:4);i++){ const a=Math.random()*TAU, r=rnd(5,RA-3); spawnEnemy('egg',Math.cos(a)*r,Math.sin(a)*r,.4,{hatch:0,owner:e}); }
      spray(m.x,m.z,12,8,Math.random(),1.1); snd('big'); shake(.4); }
    e.inv=!e.open;
    e.beeT-=dt;
    if(e.beeT<=0){ e.beeT=6; for(let i=0;i<6;i++){ const b=e.bees[i]; if(!b||b.dead){ spawnBee(e,i); break; } } }
    e.ph+=dt; moveTo(e,Math.cos(e.ph*.22)*7,Math.sin(e.ph*.22)*7,Math.min(1,dt*.5));
    e.st=e.open?1:0;
    G.bossInfo=e.open?'VỎ MỞ · BẮN NGAY!':'VỎ ĐANG ĐÓNG';
    return false;
  },
  bee(e,dt){ const q=e.owner; if(!q||q.dead){ silentKill(e); return false; } const a=G.time*1.5+e.slot*TAU/6;
    e.m.position.x=q.m.position.x+Math.cos(a)*3.8; e.m.position.z=q.m.position.z+Math.sin(a)*3.8; e.m.position.y=1.4+Math.sin(G.time*4+e.slot)*.3; e.m.rotation.y=-a; return false; },
  egg(e,dt){ e.hatch+=dt/4; e.a=e.hatch; if(e.hatch>=1){ const p=e.m.position; silentKill(e,false); deathFx(p.x,.6,p.z,0xffe08a,.8); for(let i=0;i<3;i++){ const s=spawnEnemy('mini',p.x+rnd(-.7,.7),p.z+rnd(-.7,.7),.15); s.kx=rnd(-6,6); s.kz=rnd(-6,6);} } return false; },
  golem(e,dt,tgt,dx,dz,d){
    e.stompT-=dt;
    const base=e.t.y*e.size;
    if(e.jump>0){ e.jump-=dt; const k=1-e.jump/.75; e.m.position.y=base+Math.sin(k*Math.PI)*3.4*e.size; e.st=1;
      if(e.jump<=0){ e.st=0; e.m.position.y=base; const p=e.m.position; shock(p.x,p.z,12+e.lvl*2,15-e.lvl*3.5,enemyDmg(18),0xff7a2a); shake(.8); snd('big'); deathFx(p.x,.3,p.z,0xff9a3d,1.2*e.size); }
      return [dx/d,dz/d,e.spd*.5]; }
    if(e.stompT<=0){ e.stompT=4.2-e.lvl*.9+rnd(0,1); e.jump=.75; }
    e.m.position.y=base;
    e.m.rotation.y=Math.atan2(dx,dz);
    G.bossInfo='KHỐI ĐÁ: '+enemies.filter(x=>!x.dead&&x.type==='golem').length;
    return [dx/d,dz/d,e.spd];
  },
  hole(e,dt,tgt,dx,dz,d){
    e.cyc-=dt;
    if(e.st===0&&e.cyc<=0){ e.st=1; e.cyc=3.6; banner('HỐ ĐEN THỞ RA','Lõi đã lộ · bắn ngay!'); sfx.warn(); }
    else if(e.st===1&&e.cyc<=0){ e.st=0; e.cyc=e.hp<e.max*.5?5.5:7; }
    e.inv=e.st===0;
    if(e.st===0){ e.spitT-=dt; if(e.spitT<=0){ e.spitT=e.hp<e.max*.5?2:2.7; spray(e.m.position.x,e.m.position.z,10,6,Math.random(),1.9); snd('enemyShot'); } }
    e.m.rotation.y+=dt*(e.st?3:1);
    G.bossInfo=e.st?'LÕI LỘ RA':'ĐANG HÚT';
    return [dx/d,dz/d,e.st?.4:1.1];
  },
  twinA(e,dt,tgt){ return AI.twin(e,dt,tgt); },
  twinB(e,dt,tgt){ return AI.twin(e,dt,tgt); },
  twin(e,dt,tgt){
    const p=e.partner;
    if(e.lead) G.twinAng+=dt*.22*((p&&p.dead)||e.hp<e.max*.5?1.6:1);
    const a=G.twinAng+(e.type==='twinB'?Math.PI:0);
    moveTo(e,Math.cos(a)*10,Math.sin(a)*10,Math.min(1,dt*2));
    if(e.down>0){ e.down-=dt; e.st=1; e.inv=true;
      if(e.down<=0){ if(p&&!p.dead&&!(p.down>0)){ e.hp=e.max; e.st=0; e.inv=false; banner('HỒI SINH','Nửa kia hồi lại đầy máu'); spawnFx(e.m.position.x,e.m.position.z,e.t.col,true); } else { e.down=0; } }
      G.bossInfo='MỘT NỬA ĐÃ VỠ · '+Math.max(0,e.down).toFixed(1)+'s';
      return false; }
    e.st=0; e.inv=false;
    if(tgt){ const want=Math.atan2(tgt.pos.x-e.m.position.x,tgt.pos.z-e.m.position.z); let df=want-e.face; df=Math.atan2(Math.sin(df),Math.cos(df)); e.face+=clamp(df,-dt*.8,dt*.8); }
    e.m.rotation.y=e.face;
    e.fireT-=dt; if(e.fireT<=0&&tgt){ e.fireT=e.hp<e.max*.5?1.7:2.4; fan(e.m.position.x,e.m.position.z,angTo(e.m.position.x,e.m.position.z,tgt),3,.5,11,1.1); snd('enemyShot'); }
    if(!(p&&p.down>0)&&!(e.down>0)) G.bossInfo='BẮN VÀO MẶT TỐI';
    return false;
  },
  maestro(e,dt){
    moveTo(e,0,0,Math.min(1,dt*.5)); e.m.position.y=e.t.y+Math.sin(G.time*1.5)*.3;
    const alive=e.notes.filter(n=>!n.dead).length;
    if(e.vuln>0){ e.vuln-=dt; e.st=1; e.inv=false; if(e.vuln<=0) summonNotes(e); }
    else if(!alive&&e.summoned){ e.vuln=6; e.st=1; banner('NHẠC TẮT!','Bắn Nhạc Trưởng ngay'); snd('big'); }
    else { e.st=0; e.inv=true; e.hp=Math.min(e.max,e.hp+e.max*.012*dt); }
    e.beatT-=dt; if(e.beatT<=0){ e.beatT=60/116*2; e.ang+=.45; spray(e.m.position.x,e.m.position.z,6,6,e.ang,.9); e.punch=1; }
    e.m.rotation.y+=dt*.2;
    G.bossInfo=e.vuln>0?'BẮN NGAY · '+e.vuln.toFixed(1)+'s':'NỐT NHẠC: '+alive;
    return false;
  },
  note(e,dt){
    const o=e.owner; if(!o||o.dead){ silentKill(e); return false; }
    const a=G.time*.35+e.idx*TAU/e.n, r=11+Math.sin(G.time+e.idx)*1.5;
    e.m.position.x=o.m.position.x+Math.cos(a)*r; e.m.position.z=o.m.position.z+Math.sin(a)*r; e.m.rotation.y=-a;
    e.lzT-=dt;
    if(e.lzT<=0){ e.lzT=(o.hp<o.max*.5?2.6:3.6)+rnd(0,.6); const s=nearestShip(e.m.position.x,e.m.position.z); if(s) laserAt(e.m.position.x,e.m.position.z,s,1.15,1,.4,NOTE_COLS[e.idx%4],enemyDmg(20)); }
    return false;
  },
  ghost(e,dt,tgt,dx,dz,d){
    const near=tgt?Math.hypot(dx,dz)<7:false;
    const want=e.expose>0||e.flash>0||e.punch>.2?1:near?.75:.1;
    e.a+=(want-e.a)*Math.min(1,dt*(want>e.a?12:2.5)); e.vis=e.a;
    if(e.expose>0){ e.expose-=dt; e.dmgMul=1.6; G.bossInfo='LỘ HÌNH · x1.6 SÁT THƯƠNG'; return [0,0,0]; }
    e.dmgMul=1;
    if(e.markT>0){ e.markT-=dt; G.bossInfo='ĐANG SĂN MỒI…'; if(e.markT<=0) ghostStrike(e); return [dx/d,dz/d,e.spd*.3]; }
    G.bossInfo='TÀNG HÌNH';
    e.decoyT-=dt; if(e.decoyT<=0){ e.decoyT=7.5; for(let i=0;i<3;i++){ const a=Math.random()*TAU; spawnEnemy('decoy',e.m.position.x+Math.cos(a)*3,e.m.position.z+Math.sin(a)*3,.3,{owner:e}); } }
    e.mkCd-=dt; if(e.mkCd<=0){ const al=aliveShips(); if(al.length){ e.mkCd=e.hp<e.max*.5?6:8; e.markTgt=al[Math.floor(Math.random()*al.length)]; e.markT=2; markShip(e.markTgt,2); snd('warn'); } }
    e.wan+=dt*.6; const tx=(tgt?tgt.pos.x:0)+Math.cos(e.wan)*9, tz=(tgt?tgt.pos.z:0)+Math.sin(e.wan)*9;
    const wx=tx-e.m.position.x, wz=tz-e.m.position.z, wd=Math.hypot(wx,wz)||1;
    e.m.rotation.y=Math.atan2(dx,dz);
    return [wx/wd,wz/wd,e.spd];
  },
  decoy(e,dt,tgt,dx,dz,d){ e.m.rotation.y=Math.atan2(dx,dz); return [dx/d,dz/d,e.spd]; },
  thief(e,dt,tgt,dx,dz,d){
    e.size=1+Math.min(.8,e.grow); e.r=e.t.r*e.size; e.a=e.grow;
    e.fireT-=dt; if(e.fireT<=0&&tgt){ e.fireT=2; const n=Math.min(7,1+e.stolen.length); fan(e.m.position.x,e.m.position.z,angTo(e.m.position.x,e.m.position.z,tgt),n,.18*n,11,1); snd('enemyShot'); }
    let best=null, bd=14*14;
    for(const g of GM.items){ if(!g.on) continue; const qd=(g.m.position.x-e.m.position.x)**2+(g.m.position.z-e.m.position.z)**2; if(qd<bd){bd=qd;best=g;} }
    G.bossInfo='ĐÃ CƯỚP: '+e.stolen.length+' NÂNG CẤP';
    if(best){ const gx=best.m.position.x-e.m.position.x, gz=best.m.position.z-e.m.position.z, gd=Math.hypot(gx,gz)||1; e.m.rotation.y=Math.atan2(gx,gz); return [gx/gd,gz/gd,e.spd*1.15]; }
    e.m.rotation.y=Math.atan2(dx,dz);
    return [dx/d,dz/d,e.spd];
  },
  clock(e,dt){
    e.m.position.x=0; e.m.position.z=0;
    const sp=e.hp<e.max*.5?1.35:1;
    e.a+=dt*.33*sp; e.b-=dt*1.05*sp;
    // hai kim đồng hồ là tia laser quét
    for(const s of ships.values()){ if(s.dead) continue;
      const hd=segDist(s.pos.x,s.pos.z,0,0,Math.sin(e.a)*RA,Math.cos(e.a)*RA), md=segDist(s.pos.x,s.pos.z,0,0,Math.sin(e.b)*RA,Math.cos(e.b)*RA);
      if(hd<1.0+.45||md<.38+.45) hurt(s,enemyDmg(18)); }
    e.bubT-=dt; if(e.bubT<=0){ e.bubT=6; if(enemies.filter(x=>!x.dead&&x.type==='bubble').length<3){ const a=Math.random()*TAU, r=rnd(8,RA-6); spawnEnemy('bubble',Math.cos(a)*r,Math.sin(a)*r,.5,{life:10,owner:e}); } }
    e.rwT-=dt; if(e.stT>0){ e.stT-=dt; if(e.stT<=0) e.st=0; }
    if(e.rwT<=0){ e.rwT=5; if(e.rwHp-e.hp<e.max*.06&&e.hp<e.rwHp){ e.hp=e.rwHp; banner('TUA NGƯỢC!','Sát thương chưa đủ · dồn bắn nhanh hơn'); snd('rewind'); e.st=1; e.stT=.6; ring(0,0,0x7ad7ff,14,.8); } e.rwHp=e.hp; }
    { const need=Math.ceil(e.hp-(e.rwHp-e.max*.06)); G.bossInfo='TUA NGƯỢC SAU '+Math.max(0,e.rwT).toFixed(1)+'s · '+(need>0?'CẦN THÊM '+need+' SÁT THƯƠNG':'ĐỦ SÁT THƯƠNG'); }
    return false;
  },
  bubble(e,dt){ e.life-=dt; if(e.life<=0) silentKill(e,false); return false; },
  dhead(e,dt,tgt){
    const n=e.segs.filter(s=>!s.dead).length; e.inv=n>=5;
    let spd=e.spd;
    e.chT-=dt;
    if(e.chT<=0&&tgt&&e.wind<=0&&e.charge<=0){ e.wind=.8; e.chT=9; e.st=1; snd('warn'); }
    let want;
    if(e.wind>0){ e.wind-=dt; spd=2; want=tgt?angTo(e.m.position.x,e.m.position.z,tgt):e.dirA; if(e.wind<=0){ e.charge=1.1; snd('dash'); } }
    else if(e.charge>0){ e.charge-=dt; spd=24; want=e.dirA; if(e.charge<=0) e.st=0; }
    else { e.phi+=dt*.45; const tx=Math.cos(e.phi)*18, tz=Math.sin(e.phi*2)*12; want=Math.atan2(tx-e.m.position.x,tz-e.m.position.z); }
    let df=want-e.dirA; df=Math.atan2(Math.sin(df),Math.cos(df)); e.dirA+=clamp(df,-dt*(e.wind>0?6:2.4),dt*(e.wind>0?6:2.4));
    const p=e.m.position; p.x+=Math.sin(e.dirA)*spd*dt; p.z+=Math.cos(e.dirA)*spd*dt;
    const pl=Math.hypot(p.x,p.z); if(pl>RA-2){ p.x*=(RA-2)/pl; p.z*=(RA-2)/pl; e.dirA=Math.atan2(-p.x,-p.z)+rnd(-.5,.5); }
    e.m.rotation.y=e.dirA; p.y=e.t.y+Math.sin(G.time*3)*.2;
    const last=e.path[0]; if(!last||Math.hypot(last[0]-p.x,last[1]-p.z)>.25){ e.path.unshift([p.x,p.z]); if(e.path.length>420) e.path.pop(); }
    // thân rồng bám theo đường đi của đầu
    let k=0, acc=0, i=0; const alive=e.segs.filter(s=>!s.dead);
    for(const sg of alive){ i++; const want=i*1.25; while(k<e.path.length-1){ const a=e.path[k], b=e.path[k+1]; const l=Math.hypot(a[0]-b[0],a[1]-b[1]); if(acc+l>=want){ const f=(want-acc)/l; sg.m.position.x=a[0]+(b[0]-a[0])*f; sg.m.position.z=a[1]+(b[1]-a[1])*f; sg.m.rotation.y=Math.atan2(a[0]-b[0],a[1]-b[1]); break; } acc+=l; k++; }
      sg.m.position.y=sg.t.y+Math.sin(G.time*3-i*.5)*.25; sg.a=1-i/26; sg.size=.6+.4*(1-i/22); }
    e.mineT-=dt; if(e.mineT<=0&&alive.length){ e.mineT=2.2; if(enemies.filter(x=>!x.dead&&x.type==='mine').length<12){ const tl=alive[alive.length-1].m.position; spawnEnemy('mine',tl.x,tl.z,.2,{age:0}); } }
    G.bossInfo=e.inv?'ĐỐT THÂN: '+n+' · ĐẦU CÒN GIÁP':'ĐẦU RỒNG LỘ RA!';
    return false;
  },
  dseg(e,dt){ if(!e.owner||e.owner.dead){ silentKill(e); } return false; },
  mine(e,dt){ e.age+=dt; e.st=e.age>.8?1:0; const s=nearestShip(e.m.position.x,e.m.position.z);
    if(e.age>8||(e.st&&s&&Math.hypot(s.pos.x-e.m.position.x,s.pos.z-e.m.position.z)<2.2)) mineBoom(e); return false; },
  ultimate(e,dt,tgt,dx,dz,d){
    const r=e.hp/e.max, ph=r>.667?1:r>.333?2:3;
    if(ph!==e.phase){ e.phase=ph; e.st=ph; e.atkT=2.5;
      if(ph===2){ banner('GIAI ĐOẠN 2','Nhạc · Bóng ma · Thời gian'); summonNotes(e); }
      if(ph===3){ banner('GIAI ĐOẠN 3','Đấu trường đang thu nhỏ!'); G.shrink=true; for(const n of e.notes) if(!n.dead) silentKill(n); }
      snd('boss'); shake(1.2); deathFx(e.m.position.x,e.m.position.y,e.m.position.z,0xffc04d,2.5); }
    e.st=ph;
    if(e.pullT>0){ e.pullT-=dt; e.a=1; } else e.a=0;
    const alive=e.notes.filter(n=>!n.dead).length;
    if(ph===2){ if(alive){ e.inv=true; e.hp=Math.min(e.max*.667,e.hp+e.max*.004*dt); } else { e.inv=false; if(e.summoned&&!e.vuln){ e.vuln=7; } if(e.vuln>0){ e.vuln-=dt; if(e.vuln<=0&&e.phase===2) summonNotes(e); } } }
    else e.inv=false;
    const p=e.m.position;
    e.atkT-=dt;
    if(e.atkT<=0&&tgt){
      const pick=ph===1?['eggs','pull','burst','twin'][Math.floor(Math.random()*4)]:ph===2?['decoy','bubble','burst'][Math.floor(Math.random()*3)]:['burst','charge','mines'][Math.floor(Math.random()*3)];
      if(pick==='eggs'){ for(let i=0;i<4;i++){ const a=Math.random()*TAU, rr=rnd(6,RA-3); spawnEnemy('egg',Math.cos(a)*rr,Math.sin(a)*rr,.4,{hatch:0,owner:e}); } e.atkT=3; }
      else if(pick==='pull'){ e.pullT=3; banner('LỰC HÚT','Chạy ra xa!'); e.atkT=4; }
      else if(pick==='burst'){ spray(p.x,p.z,ph===3?32:24,10,Math.random(),1.2); snd('big'); shake(.5); e.atkT=2.2; }
      else if(pick==='twin'){ for(let k=0;k<2;k++) fan(p.x,p.z,angTo(p.x,p.z,tgt)+(k?.6:-.6),5,.8,12,1); e.atkT=2.5; }
      else if(pick==='decoy'){ for(let i=0;i<3;i++){ const a=Math.random()*TAU; spawnEnemy('decoy',p.x+Math.cos(a)*4,p.z+Math.sin(a)*4,.3,{owner:e}); } e.atkT=3.5; }
      else if(pick==='bubble'){ for(let i=0;i<2;i++){ const a=Math.random()*TAU, rr=rnd(6,RA-6); spawnEnemy('bubble',Math.cos(a)*rr,Math.sin(a)*rr,.5,{life:9,owner:e}); } e.atkT=3; }
      else if(pick==='charge'){ e.charge=1.2; e.chDir=angTo(p.x,p.z,tgt); snd('dash'); e.atkT=3; }
      else if(pick==='mines'){ for(let i=0;i<4;i++){ const a=Math.random()*TAU, rr=rnd(3,RA-2); spawnEnemy('mine',Math.cos(a)*rr,Math.sin(a)*rr,.3,{age:0}); } e.atkT=2.5; }
    }
    if(ph===3){ e.spT-=dt; if(e.spT<=0){ e.spT=.11; e.ang=(e.ang||0)+.37; fireE(p.x,p.z,e.ang,7.5,1); fireE(p.x,p.z,e.ang+Math.PI,7.5,1); } }
    G.bossInfo='GIAI ĐOẠN '+ph+(ph===2&&alive?' · PHÁ NỐT NHẠC':'');
    e.m.rotation.y+=dt*.3;
    if(e.charge>0){ e.charge-=dt; return [Math.sin(e.chDir),Math.cos(e.chDir),20]; }
    return [dx/d,dz/d,e.spd*(ph===3?1.3:1)];
  }
};
function ghostStrike(e){
  const s=e.markTgt; const from=e.m.position.clone();
  if(s&&!s.dead){
    const bx=s.pos.x-s.aim.x*2.6, bz=s.pos.z-s.aim.z*2.6;
    e.m.position.x=bx; e.m.position.z=bz;
    deathFx(from.x,1.5,from.z,0xb07bff,1); deathFx(bx,1.5,bz,0xff6bd6,1.4);
    for(const o of ships.values()){ if(o.dead) continue; if(Math.hypot(o.pos.x-bx,o.pos.z-bz)<3.4) hurt(o,enemyDmg(28)); }
    ring(bx,bz,0xff2a4a,7,.4); snd('big'); shake(.8);
  }
  e.expose=2.6; e.a=1;
}
function mineBoom(e){ if(e.dead) return; const p=e.m.position; e.dead=true; e.silent=true; deathFx(p.x,.5,p.z,0xff3355,1.3); spray(p.x,p.z,8,7,Math.random(),.9); shock(p.x,p.z,9,3.5,enemyDmg(14),0xff3355); snd('kill'); }

/* ---------- chiến đấu (chạy trên máy chủ phòng hoặc khi chơi một mình) ---------- */
const mult=()=>Math.min(4,1+Math.floor(G.combo/10)*.5);
const shipHex=slot=>SHIP_COLORS[slot%4][0];

function damage(e,amt,crit){
  if(e.dead||e.spawn>0) return;
  const p=e.m.position;
  if(e.inv){ rawBlockFx(p.x,p.y,p.z); q(['bl',r2(p.x),r2(p.y),r2(p.z)]); return; }
  amt*=e.dmgMul||1;
  e.hp-=amt; e.flash=.08; e.punch=1;
  rawHitFx(p.x,p.y,p.z,e.t.col,crit,amt); q(['hx',r2(p.x),r2(p.y),r2(p.z),e.t.col,crit?1:0,Math.round(amt)]);
  snd('hit');
  if(e.type==='golem'&&e.lvl<2&&e.hp<=e.max/2){ splitGolem(e); return; }
  if(e.hp<=0){ if(e.preventDeath&&e.preventDeath(e)) return; kill(e); }
}
// ghi lại ai gây đòn, để nâng cấp "nổ khi chết" của người đó được dùng
function hitBy(e,s,amt,crit){ e.lastBoom=s.S.boom; e.lastDmg=s.S.dmg; damage(e,amt,crit); }

function splitGolem(e){
  const p=e.m.position.clone(); e.dead=true; e.silent=true;
  deathFx(p.x,p.y,p.z,0xff7a2a,2.2); snd('big'); shake(.8);
  banner('PHÂN RÃ!','Khối đá vỡ đôi');
  const ang=Math.random()*TAU;
  for(const k of [-1,1]){
    const lvl=e.lvl+1, size=[1,.72,.52][lvl];
    const c=spawnEnemy('golem',p.x+Math.cos(ang)*k*2,p.z+Math.sin(ang)*k*2,.2,{lvl,size,hp:Math.max(e.max*.12,e.hp/2),max:e.max/4,stompT:2+Math.random()*2,jump:0});
    c.r=e.t.r*size; c.spd=e.spd*1.35; c.kx=Math.cos(ang)*k*8; c.kz=Math.sin(ang)*k*8;
  }
}
// gắn quy tắc "hạ cả hai trong 3 giây" cho Gương Song Sinh
function twinPrevent(e){
  const p=e.partner;
  if(p&&!p.dead&&!(p.down>0)){ e.down=3; e.hp=1; e.inv=true; e.st=1; banner('MỘT NỬA ĐÃ VỠ','3 giây để hạ nửa còn lại!'); deathFx(e.m.position.x,2,e.m.position.z,e.t.col,1.6); return true; }
  if(p&&!p.dead){ p.down=0; p.inv=false; kill(p); }
  return false;
}

function kill(e){
  if(e.dead) return;
  e.dead=true;
  const p=e.m.position, boss=!!e.t.boss;
  deathFx(p.x,p.y,p.z,e.t.col,boss?3:e.type==='tank'?1.6:e.type==='mini'?.6:1);
  G.combo++; G.comboT=2.2; G.kills++;
  G.score+=e.t.sc*(1+G.wave*.1)*mult();
  if(e.t.xp>0){
    const n=Math.min(boss?24:Math.ceil(e.t.xp),boss?24:5), val=e.t.xp*(1+G.wave*.05)/n;
    for(let i=0;i<n;i++){const g=GM.get(); g.m.position.set(p.x,.5,p.z); g.v.set(rnd(-1,1),0,rnd(-1,1)).normalize().multiplyScalar(rnd(2,boss?14:5)); g.val=val; g.t=Math.random()*5;}
  }
  if(e.type==='splitter'){for(let i=0;i<2;i++){const s=spawnEnemy('mini',p.x+rnd(-.6,.6),p.z+rnd(-.6,.6),.12); s.kx=rnd(-6,6); s.kz=rnd(-6,6);}}
  if(e.type==='decoy') spray(p.x,p.z,8,7,Math.random(),.9);
  if(e.type==='mine'){ e.dead=false; mineBoom(e); }
  if(e.type==='thief') thiefRestore(e);
  if(e.lastBoom>0) pendingBoom.push({x:p.x,z:p.z,r:2.2+e.lastBoom*.8,dmg:e.lastDmg*(.9+.5*e.lastBoom),boom:e.lastBoom,src:e.lastDmg});
  if(boss){ G.shake=1.4; G.slow=.9; snd('big'); }
  else { G.shake=Math.max(G.shake,e.type==='tank'?.4:.15); snd('kill'); }
}
function thiefRestore(e){
  for(const [sid,id] of e.stolen){ const s=ships.get(sid); if(!s) continue; s.upg[id]=(s.upg[id]||0)+1; recalcStats(s); syncStats(s); }
  if(e.stolen.length) banner('LẤY LẠI NÂNG CẤP','+'+e.stolen.length+' nâng cấp và toàn bộ kinh nghiệm bị cướp');
  if(e.xpStore>0) gainXp(e.xpStore);
  e.stolen=[];
}
function thiefTouch(e,s){
  if((e.stealCd[s.id]||0)>G.time) return; e.stealCd[s.id]=G.time+2.5;
  const ids=Object.keys(s.upg).filter(k=>s.upg[k]>0&&k!=='heal'); if(!ids.length) return;
  const id=ids[Math.floor(Math.random()*ids.length)];
  s.upg[id]--; recalcStats(s); syncStats(s); e.stolen.push([s.id,id]);
  toast(s,'BỊ CƯỚP: '+UMAP[id].n.toUpperCase()); snd('steal'); emit(s.pos.x,1,s.pos.z,0x3dff8a,20,7,.5);
}

function hurt(s,d){
  if(s.dead||s.inv>0||s.dashT>0||state!=='play') return;
  s.S.hp-=d; s.inv=.75; G.combo=0;
  emit(s.pos.x,.7,s.pos.z,0xff4f6d,16,7,.5);
  if(s.local) flashHurt(); else q(['h',s.id]);
  if(s.S.hp<=0) shipDie(s);
}

function shipDie(s){
  s.S.hp=0; s.dead=true; s.g.visible=false; s.firing=false;
  const p=s.pos;
  deathFx(p.x,.7,p.z,shipHex(s.slot),3); snd('big'); G.shake=1.2;
  if(s.local){ if(ships.size>1) rawBanner('TÀU VỠ','Hồi sinh ở đợt sau'); }
  else q(['dd',s.id]);
  if(!aliveShips().length){ state='dying'; G.deadT=1.8; G.slow=1.4; G.shake=1.5; }
}

function fireE(x,z,a,spd,size=1){
  const b=EB.get(); b.id=++ebSeq; b.m.position.set(x,.8,z); b.v.set(Math.sin(a)*spd,0,Math.cos(a)*spd); b.life=6; b.m.rotation.y=a; b.r=.32*size; b.core.scale.set(1.3*size,1.3*size,2.2*size); b.gl.scale.setScalar(2.1*size);
  q(['eb',b.id,r2(x),r2(z),r2(b.v.x),r2(b.v.z),r2(size)]);
}

// vis=true: đạn chỉ để nhìn (tàu của khách); sát thương do chủ phòng tính
function shoot(s,vis){
  const S=s.S, n=S.multi, base=Math.atan2(s.aim.x,s.aim.z), step=n>1?Math.min(.15,.85/(n-1)):0;
  const px=s.pos.x, pz=s.pos.z, col=shipHex(s.slot);
  for(let i=0;i<n;i++){
    const a=base+(i-(n-1)/2)*step+rnd(-.025,.025);
    const b=PB.get();
    b.m.position.set(px+Math.sin(a)*.9,.65,pz+Math.cos(a)*.9);
    b.v.set(Math.sin(a)*S.bspd,0,Math.cos(a)*S.bspd); b.spd=S.bspd;
    b.life=1.1; b.pierce=S.pierce; b.hit.clear(); b.r=.22*S.bsize; b.owner=s.id; b.id=vis?0:++bSeq;
    const vs=Math.pow(S.bsize,.6); b.core.scale.set(vs*.8,vs*.8,vs*2.6); b.m.rotation.y=a; b.gl.material.color.setHex(col); b.gl.scale.setScalar(1.05*vs); b.core.material.color.copy(lighten(col,.3));
    if(!vis) q(['pb',b.id,s.id,r2(b.m.position.x),r2(b.m.position.z),r2(b.v.x),r2(b.v.z),r2(S.bsize)]);
  }
  if(s.local){ rawEmit(px+s.aim.x*1.1,.65,pz+s.aim.z*1.1,0xffd28a,3,3,.15,.2,.35); rawGlow(px+s.aim.x*1.1,.65,pz+s.aim.z*1.1,col,1.4,.06); sfx.shoot(); }
  s.recoil=1;
}

function dash(){
  if(state!=='play'||ovl||!me||me.dead||me.dashCool>0||me.dashT>0) return;
  let dx=0,dz=0; const mv=moveInput();
  if(mv.x||mv.z){dx=mv.x;dz=mv.z;} else {dx=me.aim.x;dz=me.aim.z;}
  const l=Math.hypot(dx,dz)||1;
  me.dashDir.set(dx/l,0,dz/l); me.dashT=.18; me.dashCool=me.S.dashCd; me.dashId++;
  sfx.dash(); rawRing(me.pos.x,me.pos.z,0x2fe0d0,3,.3); caFx=Math.max(caFx,.5);
  rawEmit(me.pos.x,.6,me.pos.z,0x9cf7ff,14,6,.4,.3,.4);
}

function gainXp(v){
  G.xp+=v;
  while(G.xp>=G.xpNext){G.xp-=G.xpNext; G.level++; G.xpNext=Math.round(G.xpNext*1.22+5); G.pendingLv++;}
  if(G.pendingLv>0&&state==='play') openLevel();
}

/* ---------- lên cấp ----------
   Cả đội chung một thanh kinh nghiệm. Khi lên cấp, trận dừng lại,
   mỗi người tự chọn nâng cấp cho tàu mình; ai chưa chọn sau 25 giây sẽ được chọn ngẫu nhiên. */
const lvlWait=new Set();
let curOffer=null, picked=false;
function makeOffer(s){
  const pool=U.filter(u=>(s.upg[u.id]||0)<u.max), o=[];
  while(o.length<3&&pool.length) o.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0].id);
  if(!o.length) o.push('heal');
  return o;
}
function openLevel(){
  state='levelup'; snd('lvl'); mouse.down=false;
  G.lvlT=25; lvlWait.clear();
  const lv=G.level-G.pendingLv+1;
  for(const s of ships.values()){
    s.offer=makeOffer(s); lvlWait.add(s.id);
    if(s.local) showCards(s.offer,lv,s.upg);
    else Net.send({t:'lvl',to:s.id,ids:s.offer,lv,up:s.upg});
  }
  if(me) { rawEmit(me.pos.x,.8,me.pos.z,0x2fe0d0,40,10,.8,1,.5); rawGlow(me.pos.x,1,me.pos.z,0x2fe0d0,6,.4); }
}
function showCards(ids,lv,upg){
  state='levelup'; curOffer=ids; picked=false; mouse.down=false;
  $('lvlN').textContent=lv; $('lvlWait').textContent='';
  const cards=$('cards'); cards.innerHTML='';
  ids.forEach((id,i)=>{
    const u=UMAP[id]; if(!u) return;
    const lvU=upg[id]||0;
    const b=document.createElement('button'); b.className='up'; b.type='button';
    let pips=''; if(u.max<20) for(let j=0;j<u.max;j++) pips+=`<i class="${j<lvU?'on':j===lvU?'nx':''}"></i>`;
    b.innerHTML=`<span class="k">${i+1}</span><span class="g">${u.g}</span><span class="n">${u.n}</span><span class="d">${u.d}</span><span class="pips">${pips}</span>`;
    b.addEventListener('click',()=>choose(i));
    cards.appendChild(b);
  });
  $('lvl').hidden=false;
  setTimeout(()=>{const f=cards.querySelector('button'); f&&!isTouch&&f.focus({preventScroll:true});},50);
}
function choose(i){
  if(state!=='levelup'||!curOffer||picked||i<0||i>=curOffer.length) return;
  picked=true;
  for(const b of $('cards').children) b.disabled=true;
  if(isHost()) applyPick(me,i);
  else{ Net.send({t:'pick',i}); $('lvlWait').textContent='Đang chờ đồng đội chọn…'; }
}
function applyPick(s,i){
  if(!s||!lvlWait.has(s.id)||!s.offer) return;
  const id=s.offer[clamp(i|0,0,s.offer.length-1)], u=UMAP[id];
  s.upg[id]=(s.upg[id]||0)+1; u.f(s.S,s);
  lvlWait.delete(s.id);
  emit(s.pos.x,.7,s.pos.z,0x2fe0d0,40,9,.7); ring(s.pos.x,s.pos.z,0x2fe0d0,7,.5);
  if(s.local){ chips(); if(lvlWait.size) $('lvlWait').textContent='Đang chờ đồng đội chọn…'; }
  else Net.send({t:'me',to:s.id,S:s.S,upg:s.upg});
  if(!lvlWait.size) finishLevel();
}
function autoPicks(){
  for(const id of [...lvlWait]){ const s=ships.get(id); if(s) applyPick(s,Math.floor(Math.random()*3)); else lvlWait.delete(id); }
  if(!lvlWait.size&&state==='levelup') finishLevel();
}
function finishLevel(){
  if(state!=='levelup') return;
  G.pendingLv--; curOffer=null;
  $('lvl').hidden=true;
  if(G.pendingLv>0) openLevel(); else { state='play'; clock.getDelta(); }
}
function chips(){
  $('chips').innerHTML=me?U.filter(u=>me.upg[u.id]).map(u=>`<span class="chip"><b>${u.g}</b>${me.upg[u.id]}</span>`).join(''):'';
}

/* ---------- điều khiển ---------- */
function moveInput(){
  let x=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  let z=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
  if(sticks.L.id!==null){x+=sticks.L.x;z+=sticks.L.y;}
  const l=Math.hypot(x,z); if(l>1){x/=l;z/=l;}
  return {x,z};
}
const typing=e=>e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA');
addEventListener('keydown',e=>{
  if(typing(e)){
    if(e.code==='Enter'){ if(e.target.id==='codeIn') $('joinBtn').click(); else if(e.target.id==='nameIn') $('createBtn').click(); else if(e.target.id==='saveName') $('saveBtn').click(); }
    return;
  }
  keys[e.code]=true;
  if(e.code==='Space'){e.preventDefault(); dash();}
  if(e.code==='KeyF'&&state==='play'&&!ovl){autoFire=!autoFire; rawBanner(autoFire?'TỰ BẮN: BẬT':'TỰ BẮN: TẮT','');}
  if(e.code==='KeyM') toggleMute();
  if(e.code==='Escape'||e.code==='KeyP'){
    if(!$('settings').hidden){ closeSettings(); return; }
    if(online()){ if(['play','levelup','dying'].includes(state)) ovl?resume():pause(); }
    else if(state==='play') pause(); else if(state==='pause') resume();
  }
  if(state==='levelup'&&!ovl&&/^Digit[1-3]$/.test(e.code)) choose(+e.code.slice(5)-1);
  if(e.code==='Enter'){
    if(state==='menu'&&!$('menu').hidden) start();
    else if(state==='over'&&isHost()&&!$('againBtn').hidden) $('againBtn').click();
  }
});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>{for(const k in keys) keys[k]=false; mouse.down=false; if(state==='play'&&!online()) pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play'&&!online()) pause();});
canvas.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;});
canvas.addEventListener('mousedown',e=>{audio(); if(e.button===2){dash();return;} mouse.down=true;});
addEventListener('mouseup',()=>mouse.down=false);
canvas.addEventListener('contextmenu',e=>e.preventDefault());

const sticks={L:{id:null,ox:0,oy:0,x:0,y:0,el:$('ls')},R:{id:null,ox:0,oy:0,x:0,y:0,el:$('rs')}};
canvas.addEventListener('touchstart',e=>{
  e.preventDefault(); audio();
  if(!isTouch){isTouch=true; $('dashBtn').classList.add('on'); canvas.classList.remove('aiming');}
  for(const t of e.changedTouches){
    const s=t.clientX<innerWidth/2?sticks.L:sticks.R;
    if(s.id!==null) continue;
    s.id=t.identifier; s.ox=t.clientX; s.oy=t.clientY; s.x=s.y=0;
    s.el.style.left=s.ox+'px'; s.el.style.top=s.oy+'px'; s.el.hidden=false; s.el.firstElementChild.style.transform='';
  }
},{passive:false});
addEventListener('touchmove',e=>{
  for(const t of e.changedTouches) for(const k of ['L','R']){
    const s=sticks[k]; if(s.id!==t.identifier) continue;
    let dx=t.clientX-s.ox, dy=t.clientY-s.oy; const d=Math.hypot(dx,dy), m=Math.min(d,48);
    if(d>0){dx=dx/d*m;dy=dy/d*m;}
    s.x=dx/48; s.y=dy/48; s.el.firstElementChild.style.transform=`translate(${dx}px,${dy}px)`;
  }
},{passive:true});
function endTouch(e){for(const t of e.changedTouches) for(const k of ['L','R']){const s=sticks[k]; if(s.id===t.identifier){s.id=null;s.x=s.y=0;s.el.hidden=true;}}}
addEventListener('touchend',endTouch); addEventListener('touchcancel',endTouch);
$('dashBtn').addEventListener('touchstart',e=>{e.preventDefault();dash();},{passive:false});
$('dashBtn').addEventListener('click',dash);

/* ---------- menu ---------- */
function toggleMute(){muted=!muted; $('muteBtn').textContent=muted?'ÂM: TẮT':'ÂM: BẬT'; if(muted) bgmPause(); else if(['play','levelup','dying'].includes(state)) bgmPlay();}
$('muteBtn').addEventListener('click',toggleMute);
$('pauseBtn').addEventListener('click',()=>{ if(online()) ovl?resume():pause(); else if(state==='play') pause(); else if(state==='pause') resume(); });
// Chơi online thì không dừng được trận của cả đội: nút này chỉ mở menu, trận vẫn chạy.
function pause(){
  mouse.down=false;
  if(online()){ ovl=true; $('pauseT').textContent='MENU'; $('quitBtn').textContent='RỜI PHÒNG'; $('pause').hidden=false; return; }
  state='pause'; $('pauseT').textContent='TẠM DỪNG'; $('quitBtn').textContent='VỀ MENU'; $('pause').hidden=false; bgmPause();
}
function resume(){
  $('pause').hidden=true;
  if(online()){ ovl=false; return; }
  state='play'; clock.getDelta(); bgmPlay();
}
$('resumeBtn').addEventListener('click',resume);
$('quitBtn').addEventListener('click',()=>toMenu());
const SCREENS=['menu','online','lobby','lvl','pause','over','board','settings'];
function hideScreens(){ for(const id of SCREENS) $(id).hidden=true; }
function setHud(on){for(const id of ['tl','bl','tr']) $(id).hidden=!on; if(!on) $('boss').hidden=true;}
function toMenu(msg){
  if(online()) leaveOnline();
  hideScreens(); setHud(false); ovl=false;
  state='menu'; menuShip(); showBest(); loadKing();
  $('menuMsg').textContent=msg||'';
  $('menu').hidden=false; bgmPause();
}
function beginPlay(){
  hideScreens(); setHud(true); ovl=false;
  state='play';
  if(!isTouch) canvas.classList.add('aiming');
  clock.getDelta();
  bgm.currentTime=0; bgmPlay();
}
function start(){
  audio(); if(AC&&AC.state==='suspended') AC.resume();
  NET.mode='solo'; NET.myId='me';
  newRun([['me',cleanName(lsGet(KEY.name)),0]]);
  beginPlay();
}
$('startBtn').addEventListener('click',start);
$('againBtn').addEventListener('click',()=>{ audio(); if(NET.mode==='host') hostStart(); else if(!online()) start(); });
$('overMenuBtn').addEventListener('click',()=>toMenu());

let lastRun=null;
function gameOver(){
  const d={score:Math.floor(G.score),wave:G.wave,level:G.level,kills:G.kills,wins:G.wins,practice:G.practice};
  if(NET.mode==='host'){ NET.running=false; Net.send({t:'over',d}); sendRoster(); }
  showOver(d);
}
function showOver(d){
  state='over'; bgmPause(); ovl=false;
  const best=getBest();
  if(!d.practice&&d.score>best) setBest(d.score);
  $('overT').textContent=d.wins?'CHIẾN THẮNG':'TÀU VỠ';
  $('oScore').textContent=d.score.toLocaleString('vi-VN'); $('oWave').textContent=d.wave; $('oLv').textContent=d.level; $('oKills').textContent=d.kills;
  $('bestO').innerHTML=d.practice?'LUYỆN TẬP · KHÔNG TÍNH ĐIỂM':d.score>best?'<b>KỶ LỤC MỚI!</b>':`KỶ LỤC CỦA BẠN <b>${best.toLocaleString('vi-VN')}</b>`;
  $('againBtn').hidden=!isHost();
  $('overWait').textContent=isHost()?'':'Chờ chủ phòng bấm Chơi lại…';
  $('overMenuBtn').hidden=false;
  $('rankMsg').textContent=''; $('saveRow').hidden=true;
  $('boss').hidden=true; $('lvl').hidden=true; $('pause').hidden=true; $('over').hidden=false;
  for(const s of ships.values()) if(s.tag) s.tag.hidden=true;
  lastRun=d;
  if(isHost()&&!d.practice&&d.score>0) autoSubmit(d);
}

/* ---------- bảng xếp hạng "Vua trò chơi" ---------- */
const cleanName=n=>String(n||'').trim().slice(0,14)||'Phi công';
const fmt=n=>Math.floor(n).toLocaleString('vi-VN');
function localBoard(){ try{ return JSON.parse(lsGet(KEY.board)||'[]'); }catch(e){ return []; } }
function saveLocal(entry){ const l=localBoard(); l.push(entry); l.sort((a,b)=>b.score-a.score); const k=l.slice(0,30); lsSet(KEY.board,JSON.stringify(k)); return l.indexOf(entry)+1; }
async function fetchBoard(){
  if(Net.available()){ try{ const r=await fetch('/api/scores',{cache:'no-store'}); if(r.ok){ const j=await r.json(); return {top:j.top||[],server:true}; } }catch(e){} }
  return {top:localBoard(),server:false};
}
async function submitScore(entry){
  const localRank=saveLocal(Object.assign({},entry,{date:new Date().toISOString().slice(0,10)}));
  if(Net.available()){
    try{
      const r=await fetch('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)});
      const j=await r.json();
      if(r.ok) return {rank:j.rank,server:true,top:j.top};
      return {error:j.error||'Không gửi được điểm.'};
    }catch(e){ return {error:'Không gửi được điểm lên máy chủ.'}; }
  }
  return {rank:localRank,server:false};
}
function teamName(){ return NET.mode==='host'?NET.roster.map(r=>r[1]).join(' & ').slice(0,40):cleanName(lsGet(KEY.name)); }
function rankText(res){
  if(res.error) return res.error;
  if(!res.rank) return 'Chưa lọt vào top 100 · cố lên lần sau!';
  if(res.rank===1) return '<b>BẠN LÀ VUA TRÒ CHƠI!</b> Hạng #1'+(res.server?'':' trên máy này');
  return 'Hạng <b>#'+res.rank+'</b> trên bảng Vua trò chơi'+(res.server?'':' (trên máy này)');
}
async function autoSubmit(d){
  const solo=NET.mode==='solo';
  if(solo&&!lsGet(KEY.name)){ $('saveRow').hidden=false; $('saveName').value=''; $('rankMsg').textContent='Nhập tên để ghi danh lên bảng Vua trò chơi'; return; }
  $('rankMsg').textContent='Đang ghi danh…';
  const res=await submitScore({name:teamName(),score:d.score,wave:d.wave,level:d.level,kills:d.kills,team:solo?1:NET.roster.length,wins:d.wins});
  const txt=rankText(res);
  $('rankMsg').innerHTML=txt;
  if(NET.mode==='host') Net.send({t:'rank',txt});
}
$('saveBtn').addEventListener('click',async()=>{
  const n=$('saveName').value.trim(); if(!n){ $('saveName').focus(); return; }
  lsSet(KEY.name,n.slice(0,14)); $('nameIn').value=n.slice(0,14);
  $('saveRow').hidden=true;
  if(lastRun) autoSubmit(lastRun);
});
async function loadKing(){
  const b=await fetchBoard(); const k=b.top&&b.top[0];
  $('king').hidden=!k; if(k){ $('kingName').textContent=k.name; $('kingScore').textContent=fmt(k.score); }
}
async function openBoard(back){
  boardBack=back; hideScreens(); $('board').hidden=false;
  const list=$('rankList'); list.innerHTML='<li class="empty">Đang tải…</li>'; $('boardMsg').textContent='';
  const b=await fetchBoard();
  $('boardNote').textContent=b.server?'Những phi công ghi điểm cao nhất trên máy chủ.':'Bảng này chỉ lưu trên máy bạn. Mở game qua đường link máy chủ để thi đấu với mọi người.';
  list.innerHTML='';
  if(!b.top.length){ list.innerHTML='<li class="empty">Chưa có ai ghi danh. Hãy là người đầu tiên!</li>'; return; }
  const myName=teamName();
  b.top.slice(0,50).forEach((r,i)=>{
    const li=document.createElement('li'); li.className=(i<3?'top'+(i+1):'')+(r.name===myName?' me':'');
    const no=document.createElement('span'); no.className='no'; no.textContent=i===0?'♛':i+1;
    const nm=document.createElement('span'); nm.className='nm'; nm.textContent=r.name;
    const sc=document.createElement('span'); sc.className='sc'; sc.textContent=fmt(r.score);
    const mt=document.createElement('span'); mt.className='mt'; mt.textContent=`Đợt ${r.wave} · ${r.team>1?'Đội '+r.team+' người':'Một mình'}${r.wins?' · '+r.wins+' lần thắng':''}${r.date?' · '+r.date:''}`;
    li.append(no,nm,sc,mt); list.appendChild(li);
  });
}
let boardBack='menu';
$('boardBtn').addEventListener('click',()=>openBoard('menu'));
$('overBoard').addEventListener('click',()=>openBoard('over'));
$('boardBack').addEventListener('click',()=>{ hideScreens(); $(boardBack).hidden=false; });

/* ---------- cài đặt ---------- */
let setBack='menu';
function openSettings(back){ setBack=back; hideScreens(); $('settings').hidden=false; renderSettings(); }
function closeSettings(){ hideScreens(); $(setBack).hidden=false; }
function renderSettings(){
  $('volMusic').value=SET.music; $('volMusicV').textContent=SET.music+'%';
  $('volSfx').value=SET.sfx; $('volSfxV').textContent=SET.sfx+'%';
  for(const b of $('qual').children) b.setAttribute('aria-checked',b.dataset.q===SET.quality);
  for(const b of $('shakeSeg').children) b.setAttribute('aria-checked',+b.dataset.s===SET.shake);
  for(const b of $('numSeg').children) b.setAttribute('aria-checked',+b.dataset.n===SET.nums);
}
$('volMusic').addEventListener('input',e=>{ SET.music=+e.target.value; applyVolume(); saveSet(); renderSettings(); if(SET.music===0) bgmPause(); else if(['play','levelup','dying'].includes(state)) bgmPlay(); });
$('volSfx').addEventListener('input',e=>{ SET.sfx=+e.target.value; applyVolume(); saveSet(); renderSettings(); });
$('volSfx').addEventListener('change',()=>{ audio(); sfx.pick(); });
$('qual').addEventListener('click',e=>{ const q=e.target.dataset&&e.target.dataset.q; if(!q) return; SET.quality=q; saveSet(); applyQuality(); renderSettings(); });
$('shakeSeg').addEventListener('click',e=>{ const v=e.target.dataset&&e.target.dataset.s; if(v===undefined) return; SET.shake=+v; saveSet(); renderSettings(); });
$('numSeg').addEventListener('click',e=>{ const v=e.target.dataset&&e.target.dataset.n; if(v===undefined) return; SET.nums=+v; saveSet(); renderSettings(); });
$('setBtn').addEventListener('click',()=>openSettings('menu'));
$('pauseSet').addEventListener('click',()=>openSettings('pause'));
$('setBack').addEventListener('click',closeSettings);
function applyQuality(){
  Q=QUAL[SET.quality]||QUAL.high;
  renderer.setPixelRatio(Math.min(devicePixelRatio,Q.pr));
  if(bloomPass) bloomPass.enabled=Q.bloom;
  if(postPass) postPass.enabled=Q.post;
  resize();
}

/* ---------- online: phòng chờ ---------- */
function myName(){ return cleanName($('nameIn').value); }
$('nameIn').value=lsGet(KEY.name)||'';

$('onlineBtn').addEventListener('click',()=>{
  audio();
  hideScreens(); $('online').hidden=false;
  const ok=Net.available();
  $('createBtn').disabled=!ok; $('joinBtn').disabled=!ok;
  $('onMsg').textContent=ok?'':'Muốn chơi online, hãy chạy máy chủ (npm start) rồi mở game bằng đường link http://localhost:3000 thay vì mở file trực tiếp.';
  if(ok) setTimeout(()=>$('nameIn').focus(),50);
});
$('onBack').addEventListener('click',()=>{ Net.close(); hideScreens(); $('menu').hidden=false; });
$('codeIn').addEventListener('input',e=>{ e.target.value=e.target.value.toUpperCase().replace(/[^A-Z]/g,''); });

async function connectThen(msg){
  $('onMsg').textContent='Đang kết nối…';
  $('createBtn').disabled=$('joinBtn').disabled=true;
  lsSet(KEY.name,$('nameIn').value.trim());
  try{ await Net.connect(); Net.send(msg); }
  catch(err){ $('onMsg').textContent=err.message||'Không kết nối được máy chủ.'; $('createBtn').disabled=$('joinBtn').disabled=false; }
}
$('createBtn').addEventListener('click',()=>connectThen({t:'create',name:myName()}));
$('joinBtn').addEventListener('click',()=>{
  const code=$('codeIn').value.trim().toUpperCase();
  if(code.length!==4){ $('onMsg').textContent='Mã phòng gồm 4 chữ cái.'; $('codeIn').focus(); return; }
  connectThen({t:'join',code,name:myName()});
});

function showLobby(){
  hideScreens(); setHud(false); state='lobby';
  $('roomCode').textContent=NET.code;
  $('lobby').hidden=false;
  updateLobby();
}
function updateLobby(){
  const ul=$('plist'); ul.innerHTML='';
  for(const [id,name,slot] of NET.roster){
    const li=document.createElement('li'); li.style.setProperty('--c',CSS_COLORS[slot%4]);
    li.appendChild(document.createElement('i'));
    const n=document.createElement('span'); n.textContent=name; li.appendChild(n);
    const tags=[]; if(id===NET.hostId) tags.push('CHỦ PHÒNG'); if(id===NET.myId) tags.push('BẠN');
    const tag=document.createElement('em'); tag.textContent=tags.join(' · '); li.appendChild(tag);
    ul.appendChild(li);
  }
  const host=NET.mode==='host';
  $('goBtn').hidden=!host;
  $('lobWait').textContent=host?(NET.roster.length<2?'Có thể bắt đầu một mình, hoặc chờ bạn bè vào.':''):'Chờ chủ phòng bấm Bắt đầu…';
}
$('goBtn').addEventListener('click',()=>{ audio(); hostStart(); });
$('lobLeave').addEventListener('click',()=>toMenu());

function leaveOnline(){
  Net.close();
  NET.mode='solo'; NET.running=false; NET.roster=[]; NET.code=null; NET.hostId=null; NET.myId='me';
  lvlWait.clear(); fxq=[];
}
function sendRoster(){ Net.send({t:'roster',list:NET.roster,running:NET.running}); }
function hostStart(){
  NET.running=true;
  Net.send({t:'start',list:NET.roster});
  newRun(NET.roster);
  beginPlay();
}
// khách: cập nhật danh sách tàu cho khớp với phòng
function syncRoster(list){
  const ids=new Set(list.map(r=>r[0]));
  for(const id of [...ships.keys()]) if(!ids.has(id)) removeShip(id);
  for(const [id,name,slot] of list) if(!ships.has(id)) addShip(id,name,slot,id===NET.myId);
}

Net.on('close',()=>{ if(online()) toMenu('Mất kết nối với máy chủ.'); });
Net.on('msg',m=>{
  switch(m.t){
    case 'created':
      NET.mode='host'; NET.myId=m.id; NET.hostId=m.id; NET.code=m.code; NET.running=false;
      NET.roster=[[m.id,myName(),0]];
      clearWorld(); clearShips(); addShip(m.id,myName(),0,true);
      showLobby(); break;
    case 'joined':
      NET.mode='guest'; NET.myId=m.id; NET.hostId=m.hostId; NET.code=m.code; NET.roster=[];
      clearWorld(); clearShips(); addShip(m.id,myName(),1,true);
      showLobby(); break;
    case 'error':
      $('onMsg').textContent=m.msg; $('createBtn').disabled=$('joinBtn').disabled=false;
      if(!online()) Net.close();
      break;
    case 'hostleft':
      toMenu('Chủ phòng đã rời đi.'); break;

    /* ----- chủ phòng nhận ----- */
    case 'peer+': {
      if(NET.mode!=='host') break;
      const used=new Set(NET.roster.map(r=>r[2])); let slot=0; while(used.has(slot)) slot++;
      const name=cleanName(m.name);
      NET.roster.push([m.id,name,slot]);
      if(NET.running&&G){
        const s=addShip(m.id,name,slot,false); const [x,z]=spawnPoint(slot,4);
        s.pos.set(x,0,z); s.tx=x; s.tz=z; s.inv=2.5;
        rawBanner(name.toUpperCase(),'đã vào trận');
      }
      sendRoster(); updateLobby(); break;
    }
    case 'peer-': {
      if(NET.mode!=='host') break;
      const r=NET.roster.find(x=>x[0]===m.id);
      NET.roster=NET.roster.filter(x=>x[0]!==m.id);
      removeShip(m.id);
      if(lvlWait.delete(m.id)&&!lvlWait.size) finishLevel();
      if(r&&NET.running) rawBanner(r[1].toUpperCase(),'đã rời trận');
      if(NET.running&&G&&state==='play'&&!aliveShips().length){ state='dying'; G.deadT=1.6; }
      sendRoster(); updateLobby(); break;
    }
    case 'in': {
      const s=ships.get(m.from); if(!s||s.local||s.dead) break;
      const cl=v=>clamp(+v||0,-R,R);
      s.tx=cl(m.x); s.tz=cl(m.z); s.tRy=+m.ry||0; s.tRz=+m.rz||0;
      s.aim.set(+m.ax||0,0,+m.az||0); if(s.aim.lengthSq()<1e-4) s.aim.set(0,0,-1); s.aim.normalize();
      s.firing=!!m.f;
      if(m.d){ if(s.dashT<=0) s.dashId++; s.dashT=.12; }
      break;
    }
    case 'pick': { if(NET.mode==='host') applyPick(ships.get(m.from),m.i); break; }

    /* ----- khách nhận ----- */
    case 'roster':
      if(NET.mode!=='guest') break;
      NET.roster=m.list; updateLobby();
      if(m.running&&state==='lobby'){ newRun(m.list); beginPlay(); }
      else if(m.running&&state!=='over') syncRoster(m.list);
      break;
    case 'start':
      if(NET.mode!=='guest') break;
      NET.roster=m.list; newRun(m.list); beginPlay(); break;
    case 'lvl':
      if(NET.mode!=='guest'||!me) break;
      me.upg=m.up||{}; showCards(m.ids,m.lv,me.upg); break;
    case 'me':
      if(NET.mode!=='guest'||!me) break;
      { const hp=me.S.hp; Object.assign(me.S,m.S); me.S.hp=hp; } me.upg=m.upg||{}; chips(); break;
    case 'over':
      if(NET.mode==='guest') showOver(m.d); break;
    case 'rank':
      if(NET.mode==='guest') $('rankMsg').innerHTML=String(m.txt||'').replace(/<(?!\/?b>)[^>]*>/g,''); break;
    case 's':
      if(NET.mode==='guest'&&G&&state!=='over'&&state!=='lobby') applySnap(m); break;
  }
});

/* ---------- đồng bộ: chủ phòng gửi, khách nhận ---------- */
function snapshot(){
  const p=[];
  for(const s of ships.values()) p.push([s.id,r2(s.pos.x),r2(s.pos.z),r2(s.g.rotation.y),r2(s.g.rotation.z),Math.ceil(s.S.hp),s.S.maxHp,(s.inv>0?1:0)|(s.dashT>0?2:0)|(s.dead?4:0),s.blades.length]);
  const e=[];
  for(const x of enemies) if(!x.dead) e.push([x.id,x.ti,r2(x.m.position.x),r2(x.m.position.y),r2(x.m.position.z),r2(x.m.rotation.y),r2(x.m.rotation.x),r2(x.m.scale.x),x.flash>0?1:0,x.st|0,r2(x.a||0),r2(x.b||0),x.inv?1:0]);
  const m=[];
  for(const g of GM.items) if(g.on) m.push(r2(g.m.position.x),r2(g.m.position.z));
  Net.send({t:'s',g:[G.wave,Math.floor(G.score),G.level,r2(G.xp),G.xpNext,G.combo,r2(G.bossR),STATES.indexOf(state),r2(G.time),r2(G.shake),r2(RA),G.bossKind,G.bossInfo,G.bossInv?1:0],p,e,m,fx:fxq});
  fxq=[];
}

function applySnap(m){
  const g=m.g;
  G.wave=g[0]; G.score=g[1]; G.level=g[2]; G.xp=g[3]; G.xpNext=g[4]; G.combo=g[5]; G.bossR=g[6];
  const st=STATES[g[7]];
  if(Math.abs(G.time-g[8])>.5) G.time=g[8];
  G.shake=Math.max(G.shake,g[9]*.5); RA=g[10]; G.bossKind=g[11]; G.bossInfo=g[12]||''; G.bossInv=g[13];
  if(st==='play'&&state==='levelup'){ $('lvl').hidden=true; curOffer=null; state='play'; }
  else if(st==='dying'&&state==='play') state='dying';

  for(const [id,x,z,ry,rz,hp,maxHp,fl,nb] of m.p){
    const s=ships.get(id); if(!s) continue;
    s.S.hp=hp; s.S.maxHp=maxHp;
    const dead=!!(fl&4);
    if(s.local){
      if(dead&&!s.dead){ s.firing=false; if(ships.size>1) rawBanner('TÀU VỠ','Hồi sinh ở đợt sau'); }
      s.netInv=!!(fl&1);
    } else {
      s.tx=x; s.tz=z; s.tRy=ry; s.tRz=rz; s.netInv=!!(fl&3);
      if(s.dead&&!dead) s.pos.set(x,0,z);
    }
    s.dead=dead; s.g.visible=!dead;
    syncBlades(s,nb);
  }

  const seen=new Set();
  for(const [id,ti,x,y,z,ry,rx,sc,fl,st2,a,b,inv] of m.e){
    seen.add(id);
    let e=netEn.get(id);
    if(!e){
      const type=TYPES[ti]; if(!type) continue;
      const vis=buildEnemy(type);
      e=Object.assign(vis,{id,type,t:T[type],punch:0,flashV:0});
      vis.m.position.set(x,y,z); vis.m.rotation.set(rx,ry,0);
      netEn.set(id,e);
    }
    e.tx=x; e.ty=y; e.tz=z; e.tRy=ry; e.tRx=rx;
    e.m.scale.setScalar(Math.max(.01,sc));
    if(fl&&!e.fl0) e.punch=1; e.fl0=fl; e.flashV=fl?1:0;
    e.st=st2; e.a=a; e.b=b; e.inv=!!inv;
  }
  for(const [id,e] of netEn) if(!seen.has(id)){ disposeEnemy(e); netEn.delete(id); }

  const gm=m.m, n=gm.length/2; let k=0;
  for(const it of GM.items){ if(k<n){ if(!it.on){it.on=true;it.m.visible=true;} it.m.position.x=gm[k*2]; it.m.position.z=gm[k*2+1]; k++; } else if(it.on) GM.free(it); }
  while(k<n){ const it=GM.get(); it.t=Math.random()*5; it.m.position.set(gm[k*2],.5,gm[k*2+1]); k++; }

  for(const ev of m.fx) applyFx(ev);
}

function applyFx(ev){
  switch(ev[0]){
    case 'p': rawEmit(ev[1],ev[2],ev[3],ev[4],ev[5],ev[6],ev[7],ev[8]); break;
    case 'r': rawRing(ev[1],ev[2],ev[3],ev[4],ev[5]); break;
    case 'b': rawBolt(new V3(ev[1],ev[2],ev[3]),new V3(ev[4],ev[5],ev[6])); break;
    case 'n': rawBanner(ev[1],ev[2]); break;
    case 'I': rawIntro(ev[1]); break;
    case 's': if(sfx[ev[1]]) sfx[ev[1]](); break;
    case 'k': rawDeathFx(ev[1],ev[2],ev[3],ev[4],ev[5]); break;
    case 'hx': rawHitFx(ev[1],ev[2],ev[3],ev[4],!!ev[5],ev[6]); break;
    case 'sp': rawSpawnFx(ev[1],ev[2],ev[3],!!ev[4]); break;
    case 'bl': rawBlockFx(ev[1],ev[2],ev[3]); break;
    case 'L': rawBeam(ev[1],ev[2],ev[3],ev[4],ev[5],ev[6],ev[7],ev[8],0); sfx.warn(); break;
    case 'W': rawShock(ev[1],ev[2],ev[3],ev[4],ev[5]); break;
    case 'mk': rawMark(ev[1],ev[2]); break;
    case 'to': if(ev[1]===NET.myId) rawToast(ev[2]); break;
    case 'V': victoryFx(); break;
    case 'pb': {
      if(ev[2]===NET.myId) break;   // đạn của mình đã được vẽ sẵn trên máy này
      const b=PB.get(); b.id=ev[1]; b.owner=ev[2]; b.m.position.set(ev[3],.65,ev[4]); b.v.set(ev[5],0,ev[6]); b.spd=Math.hypot(ev[5],ev[6]);
      b.life=1.1; b.pierce=0; b.hit.clear(); const vs=Math.pow(ev[7],.6); b.core.scale.set(vs*.8,vs*.8,vs*2.6); b.m.rotation.y=Math.atan2(ev[5],ev[6]);
      const os=ships.get(ev[2]); const oc=os?shipHex(os.slot):0xffb547; b.gl.material.color.setHex(oc); b.core.material.color.copy(lighten(oc,.3)); b.gl.scale.setScalar(1.05*vs);
      netPB.set(b.id,b); break;
    }
    case 'pf': { const b=netPB.get(ev[1]); if(b){PB.free(b); netPB.delete(ev[1]);} break; }
    case 'eb': {
      const b=EB.get(); b.id=ev[1]; b.m.position.set(ev[2],.8,ev[3]); b.v.set(ev[4],0,ev[5]); b.life=6; b.m.rotation.y=Math.atan2(ev[4],ev[5]);
      const sz=ev[6]||1; b.core.scale.set(1.3*sz,1.3*sz,2.2*sz); b.gl.scale.setScalar(2.1*sz);
      netEB.set(b.id,b); break;
    }
    case 'ef': { const b=netEB.get(ev[1]); if(b){EB.free(b); netEB.delete(ev[1]);} break; }
    case 'h': if(ev[1]===NET.myId) flashHurt(); break;
    case 'dd': if(ev[1]===NET.myId) rawBanner('TÀU VỠ','Hồi sinh ở đợt sau'); break;
    case 'rs': if(ev[1]===NET.myId&&me){ me.pos.set(ev[2],0,ev[3]); me.vx=me.vz=0; me.dead=false; me.g.visible=true; rawBanner('HỒI SINH','Quay lại chiến đấu!'); } break;
  }
}

function sendInput(){
  if(!me) return;
  Net.send({t:'in',x:r2(me.pos.x),z:r2(me.pos.z),ry:r2(me.g.rotation.y),rz:r2(me.g.rotation.z),
    ax:r2(me.aim.x),az:r2(me.aim.z),f:(me.firing&&!me.dead)?1:0,d:me.dashT>0?1:0});
}

/* ---------- lực hút hố đen, bong bóng chậm (dùng chung chủ phòng và khách) ---------- */
function enemyList(){ return NET.mode==='guest'?netEn.values():enemies; }
const pullV={x:0,z:0};
function pullAt(x,z){
  pullV.x=pullV.z=0;
  for(const e of enemyList()){
    if(e.dead) continue;
    let k=0;
    if(e.type==='hole') k=e.st?-18:30; else if(e.type==='ultimate'&&e.a>.5) k=26;
    if(!k) continue;
    const dx=e.m.position.x-x, dz=e.m.position.z-z, d=Math.hypot(dx,dz)||1;
    pullV.x+=dx/d*k/(2+d*.6); pullV.z+=dz/d*k/(2+d*.6);
  }
  return pullV;
}
function slowAt(x,z){
  for(const e of enemyList()){ if(e.dead||e.type!=='bubble') continue; const dx=e.m.position.x-x, dz=e.m.position.z-z; if(dx*dx+dz*dz<16*e.m.scale.x*e.m.scale.x) return .5; }
  return 1;
}

/* ---------- điều khiển tàu của mình (mọi chế độ) ---------- */
function controlLocal(dt){
  const s=me, pp=s.pos, S=s.S;
  const mv=ovl?{x:0,z:0}:moveInput();
  const slow=slowAt(pp.x,pp.z);
  if(s.dashT>0){ s.dashT-=dt; s.vx=s.dashDir.x*38; s.vz=s.dashDir.z*38; }
  else { const k=Math.min(1,dt*12); s.vx+=(mv.x*S.speed*slow-s.vx)*k; s.vz+=(mv.z*S.speed*slow-s.vz)*k; }
  const pl0=pullAt(pp.x,pp.z);
  pp.x+=(s.vx+pl0.x)*dt; pp.z+=(s.vz+pl0.z)*dt;
  const pl=Math.hypot(pp.x,pp.z); if(pl>RA-.8){pp.x*=(RA-.8)/pl;pp.z*=(RA-.8)/pl;}

  let firing=(autoFire||mouse.down)&&!ovl;
  if(isTouch){
    const t=sticks.R;
    if(t.id!==null&&Math.hypot(t.x,t.y)>.2){s.aim.set(t.x,0,t.y).normalize(); firing=!ovl;}
    else if(mv.x||mv.z){s.aim.set(mv.x,0,mv.z).normalize(); firing=false;}
    reticle.position.set(pp.x+s.aim.x*6,.05,pp.z+s.aim.z*6);
  } else {
    ndc.set(mouse.x/innerWidth*2-1,-(mouse.y/innerHeight)*2+1);
    ray.setFromCamera(ndc,cam);
    if(ray.ray.intersectPlane(aimPlane,aimPt)){
      tmp.set(aimPt.x-pp.x,0,aimPt.z-pp.z); if(tmp.lengthSq()>.04) s.aim.copy(tmp.normalize());
      reticle.position.set(aimPt.x,.05,aimPt.z);
    }
  }
  const target=Math.atan2(-s.aim.x,-s.aim.z);
  let dr=target-s.g.rotation.y; dr=Math.atan2(Math.sin(dr),Math.cos(dr));
  s.g.rotation.y+=dr*Math.min(1,dt*20);
  s.g.rotation.z=-s.vx*.014*Math.cos(s.g.rotation.y)+s.vz*.014*Math.sin(s.g.rotation.y);
  s.firing=firing;
  s.dashCool-=dt;
  if(NET.mode==='guest'){
    s.fireCd-=dt*slow;
    if(firing&&s.fireCd<=0){ s.fireCd=1/S.rate; shoot(s,true); }
  }
}

function lerpAngle(a,b,k){ let d=b-a; d=Math.atan2(Math.sin(d),Math.cos(d)); return a+d*k; }

/* ---------- vòng cập nhật trận (chủ phòng / chơi một mình) ---------- */
function easeBack(t){const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);}

function update(dt){
  G.time+=dt;

  /* đợt */
  if(state==='play'){
    if(G.breakT>0){G.breakT-=dt; if(G.breakT<=0) startWave(G.wave+1);}
    else{
      if(G.bossPending>0){G.bossPending-=dt; if(G.bossPending<=0){ if(G.bossQueue>=0) startFight(G.bossQueue); else { const [x,z]=edgePos(); const b=spawnEnemy('boss',x*.7,z*.7,1.2); G.fight={kind:-1,main:b}; G.boss=b; G.bossKind=-1; G.bossMax=b.max; } G.shake=1; }}
      if(G.toSpawn>0){
        G.spawnT-=dt;
        if(G.spawnT<=0){
          G.spawnT=G.spawnEvery*rnd(.6,1.4);
          const grp=Math.min(G.toSpawn,1+Math.floor(Math.random()*Math.min(5,1+G.wave/3)));
          const [,,a]=edgePos();
          const type=pickType();
          for(let i=0;i<grp;i++){const aa=a+(i-(grp-1)/2)*.12; spawnEnemy(type,Math.cos(aa)*(RA-1.5),Math.sin(aa)*(RA-1.5));}
          G.toSpawn-=grp;
        }
      } else if(enemies.length===0&&G.bossPending<=0){
        G.breakT=2.8; G.vacuum=true;
        for(const s of ships.values()) if(!s.dead) s.S.hp=Math.min(s.S.maxHp,s.S.hp+10);
        banner('ĐỢT '+G.wave+' SẠCH','+10 giáp · chuẩn bị đợt '+(G.wave+1)); snd('lvl');
      }
    }
  }
  if(G.fight&&!enemies.some(e=>!e.dead&&e.t.boss)) endFight();
  // đấu trường thu nhỏ ở giai đoạn 3 của boss cuối
  RA+=((G.shrink?17:R)-RA)*Math.min(1,dt*.25);

  /* tàu */
  if(state==='play'&&me&&!me.dead) controlLocal(dt);
  for(const s of ships.values()){
    if(!s.local){
      s.dashT-=dt;
      if(!s.dead){
        const k=Math.min(1,dt*14);
        s.pos.x+=(s.tx-s.pos.x)*k; s.pos.z+=(s.tz-s.pos.z)*k;
        const pl=Math.hypot(s.pos.x,s.pos.z); if(pl>RA-.8){ s.pos.x*=(RA-.8)/pl; s.pos.z*=(RA-.8)/pl; }
        s.g.rotation.y=lerpAngle(s.g.rotation.y,s.tRy,k); s.g.rotation.z+=(s.tRz-s.g.rotation.z)*k;
      }
    }
    if(s.dead) continue;
    s.inv-=dt;
    if(s.S.regen) s.S.hp=Math.min(s.S.maxHp,s.S.hp+s.S.regen*dt);
    s.fireCd-=dt*slowAt(s.pos.x,s.pos.z);
    if(state==='play'&&s.firing&&s.fireCd<=0){ s.fireCd=1/s.S.rate; shoot(s,false); }
  }
  if(G.comboT>0){G.comboT-=dt; if(G.comboT<=0) G.combo=0;}

  /* đạn của người chơi */
  for(const b of PB.items){
    if(!b.on) continue;
    const pv=pullAt(b.m.position.x,b.m.position.z);
    if(pv.x||pv.z){ b.v.x+=pv.x*dt*3; b.v.z+=pv.z*dt*3; const l=Math.hypot(b.v.x,b.v.z)||1; b.v.x*=b.spd/l; b.v.z*=b.spd/l; b.m.rotation.y=Math.atan2(b.v.x,b.v.z); }
    b.life-=dt; b.m.position.addScaledVector(b.v,dt);
    if(b.life<=0||Math.hypot(b.m.position.x,b.m.position.z)>RA+5){PB.free(b);continue;}
    const owner=ships.get(b.owner); if(!owner){PB.free(b);continue;}
    const S=owner.S;
    for(const e of enemies){
      if(e.dead||e.spawn>0||b.hit.has(e)||e.t.ghost) continue;
      const dx=e.m.position.x-b.m.position.x, dz=e.m.position.z-b.m.position.z, rr=e.r+b.r;
      if(dx*dx+dz*dz<rr*rr){
        b.hit.add(e);
        // Gương Song Sinh: mặt sáng dội đạn ngược lại
        if((e.type==='twinA'||e.type==='twinB')&&!e.inv){
          const fx=Math.sin(e.face), fz=Math.cos(e.face);
          if(-dx*fx-dz*fz>0){ PB.free(b); q(['pf',b.id]); const bp=b.m.position; fireE(bp.x,bp.z,Math.atan2(owner.pos.x-bp.x,owner.pos.z-bp.z),15,.9); rawBlockFx(bp.x,1.2,bp.z); q(['bl',r2(bp.x),1.2,r2(bp.z)]); break; }
        }
        if(e.inv){ hitBy(e,owner,0,false); PB.free(b); q(['pf',b.id]); break; }
        const crit=Math.random()<S.crit;
        if(!e.t.heavy){const kb=e.type==='tank'?1:3.5; e.kx+=b.v.x/S.bspd*kb; e.kz+=b.v.z/S.bspd*kb;}
        hitBy(e,owner,S.dmg*(crit?2.5:1),crit);
        if(S.chain>0&&Math.random()<S.chain) chain(e,owner);
        if(b.pierce--<=0){PB.free(b); q(['pf',b.id]); break;}
      }
    }
  }
  /* đạn kẻ địch */
  for(const b of EB.items){
    if(!b.on) continue;
    b.life-=dt; b.m.position.addScaledVector(b.v,dt);
    const p=b.m.position;
    if(b.life<=0||Math.hypot(p.x,p.z)>RA+4){EB.free(b);continue;}
    if(state!=='play') continue;
    for(const s of ships.values()){
      if(s.dead) continue;
      const dx=p.x-s.pos.x, dz=p.z-s.pos.z, rr=.45+b.r;
      if(dx*dx+dz*dz<rr*rr){ if(s.inv>0||s.dashT>0) continue; EB.free(b); q(['ef',b.id]); hurt(s,12+G.wave*.8); break;}
    }
  }
  /* laser */
  for(const bm of beams){
    if(!bm.dmg||bm.t<bm.warn||bm.t>bm.warn+bm.fire) continue;
    for(const s of ships.values()){ if(s.dead||bm.hit.has(s.id)) continue;
      if(segDist(s.pos.x,s.pos.z,bm.x1,bm.z1,bm.x2,bm.z2)<bm.w*.5+.45&&s.dashT<=0&&s.inv<=0){ bm.hit.add(s.id); hurt(s,bm.dmg); } }
  }
  /* sóng chấn động */
  for(let i=shocks.length-1;i>=0;i--){ const w=shocks[i]; w.r+=w.spd*dt; if(w.r>w.maxR){ shocks.splice(i,1); continue; }
    for(const s of ships.values()){ if(s.dead||w.hit.has(s.id)) continue; const d=Math.hypot(s.pos.x-w.x,s.pos.z-w.z); if(Math.abs(d-w.r)<.9&&s.dashT<=0){ w.hit.add(s.id); hurt(s,w.dmg); } } }

  /* kẻ địch */
  for(let i=0;i<enemies.length;i++){
    const e=enemies[i]; if(e.dead) continue;
    const m=e.m;
    if(e.spawn>0){
      e.spawn-=dt; const s=1-Math.max(e.spawn,0)/(e.spawn0||.45);
      m.scale.setScalar(Math.max(.01,easeBack(Math.min(1,s)))*e.size);
      m.rotation.y+=dt*6; continue;
    }
    m.scale.setScalar(e.size);
    const tgt=nearestShip(m.position.x,m.position.z);
    const tx=tgt?tgt.pos.x:0, tz=tgt?tgt.pos.z:0;
    const dx=tx-m.position.x, dz=tz-m.position.z, d=Math.hypot(dx,dz)||1;
    let ax=dx/d, az=dz/d, spd=e.spd, custom=false;
    if(e.ai){
      const r=e.ai(e,dt,tgt,dx,dz,d);
      if(r===false) custom=true; else { ax=r[0]; az=r[1]; spd=r[2]; }
    } else if(e.type==='shooter'){
      const rg=e.t.range;
      if(d<rg*.55){ax=-ax;az=-az;}
      else if(d<rg){const sx=-az*e.dir, sz=ax*e.dir; ax=sx;az=sz; spd*=.7;}
      e.cd-=dt;
      if(tgt&&e.cd<=0&&d<rg+4&&state==='play'){e.cd=e.t.fire*rnd(.8,1.2); fireE(m.position.x,m.position.z,Math.atan2(dx,dz),11); e.flash=.12; snd('enemyShot');}
    } else if(e.type==='boss'){
      const r=bossAI(e,dt,dx,dz,d); ax=r[0]; az=r[1]; spd=r[2];
    }
    if(e.dead) continue;
    if(!custom){
      // tách nhau ra, không chồng lên nhau
      if(!e.t.heavy||e.type==='golem'||e.type==='boss') for(let j=i+1;j<enemies.length;j++){
        const o=enemies[j]; if(o.dead||o.t.ghost||(o.t.heavy&&o.type!=='golem'&&o.type!=='boss')) continue;
        const sx=o.m.position.x-m.position.x, sz=o.m.position.z-m.position.z, rr=(e.r+o.r)*.95, d2=sx*sx+sz*sz;
        if(d2<rr*rr&&d2>1e-4){
          const dd=Math.sqrt(d2), push=(rr-dd)*.5/dd;
          const we=e.type==='boss'?.1:1, wo=o.type==='boss'?.1:1;
          m.position.x-=sx*push*we; m.position.z-=sz*push*we;
          o.m.position.x+=sx*push*wo; o.m.position.z+=sz*push*wo;
        }
      }
      const k=Math.min(1,dt*5);
      e.vx+=(ax*spd-e.vx)*k; e.vz+=(az*spd-e.vz)*k;
      m.position.x+=(e.vx+e.kx)*dt; m.position.z+=(e.vz+e.kz)*dt;
      const kd=Math.pow(.02,dt); e.kx*=kd; e.kz*=kd;
      const el=Math.hypot(m.position.x,m.position.z); if(el>RA-.5){m.position.x*=(RA-.5)/el;m.position.z*=(RA-.5)/el;}
      e.ph+=dt;
      if(!e.ai){
        m.position.y=e.t.y+Math.sin(e.ph*3)*.15;
        if(e.t.face){ const want=Math.atan2(e.vx,e.vz); m.rotation.y=lerpAngle(m.rotation.y,want,Math.min(1,dt*8)); m.rotation.z=Math.sin(e.ph*6)*.12; }
        else { m.rotation.y+=dt*(e.type==='tank'?.8:2.2); m.rotation.x+=dt*(e.type==='boss'?.4:1.1); }
      }
    }
    e.flash-=dt; e.flashV=e.flash>0?1:0;

    if(e.t.ghost) continue;
    for(const s of ships.values()){
      if(s.dead||e.dead) continue;
      const sx=s.pos.x-m.position.x, sz=s.pos.z-m.position.z, sd=Math.hypot(sx,sz)||1;
      const airborne=e.type==='golem'&&e.st===1;
      if(state==='play'&&sd<e.r+.55&&s.dashT<=0&&!airborne&&e.t.dmg>0){
        if(e.type==='thief') thiefTouch(e,s);
        hurt(s,enemyDmg(e.t.dmg));
        if(!e.t.heavy){e.kx-=sx/sd*10;e.kz-=sz/sd*10;}
      }
      if(s.dashT>0&&s.upg.dash&&sd<e.r+1&&e.dashHit[s.id]!==s.dashId){ e.dashHit[s.id]=s.dashId; hitBy(e,s,s.S.dmg*3,true); }
      if(s.blades.length&&e.orbitCd<=0&&!e.dead){
        for(const b of s.blades){
          const bx=b.position.x-m.position.x, bz=b.position.z-m.position.z;
          if(bx*bx+bz*bz<(e.r+.6)*(e.r+.6)){hitBy(e,s,s.S.dmg*.9,false); e.orbitCd=.3; if(!e.t.heavy){e.kx-=ax*5;e.kz-=az*5;} break;}
        }
      }
    }
    e.orbitCd-=dt;
  }

  /* vụ nổ dây chuyền (mỗi khung hình xử lý một lượt) */
  const booms=pendingBoom.splice(0,30);
  for(const bm of booms){
    ring(bm.x,bm.z,0xff9a3d,bm.r,.35); emit(bm.x,.5,bm.z,0xff9a3d,14,bm.r*3,.45);
    for(const e of enemies){
      if(e.dead||e.spawn>0||e.t.ghost) continue;
      const dx=e.m.position.x-bm.x, dz=e.m.position.z-bm.z;
      if(dx*dx+dz*dz<(bm.r+e.r)*(bm.r+e.r)){ e.lastBoom=bm.boom; e.lastDmg=bm.src; damage(e,bm.dmg,false); }
    }
  }

  /* dọn kẻ địch đã chết */
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if(e.dead){disposeEnemy(e); enemies.splice(i,1);}
  }
  // thanh máu boss
  if(G.fight){
    let hp=0; let inv=false;
    for(const e of enemies){ if(e.dead) continue; if(e.t.boss||e.t.bar){ hp+=Math.max(0,e.hp); if(e.t.boss&&e.inv) inv=true; } }
    G.bossR=clamp(hp/G.bossMax,0,1); G.bossInv=inv;
    if(G.fight.kind===-1) G.bossInfo='';
  } else { G.bossR=0; G.bossInv=false; }

  /* tinh thể: bay về tàu gần nhất (Kẻ Đánh Cắp và Hố Đen cũng hút) */
  const thief=enemies.find(e=>!e.dead&&e.type==='thief'&&e.spawn<=0);
  const hole=enemies.find(e=>!e.dead&&e.type==='hole'&&e.st===0&&e.spawn<=0);
  for(const g of GM.items){
    if(!g.on) continue;
    g.t+=dt;
    const p=g.m.position, s=nearestShip(p.x,p.z);
    let thf=null;
    for(const sink of [thief,hole]){ if(!sink) continue; const qd=Math.hypot(sink.m.position.x-p.x,sink.m.position.z-p.z); if(qd<(sink===hole?9:12)&&(!s||qd<Math.hypot(s.pos.x-p.x,s.pos.z-p.z))) { thf=sink; break; } }
    if(thf){
      const dx=thf.m.position.x-p.x, dz=thf.m.position.z-p.z, d=Math.hypot(dx,dz)||1;
      g.v.x+=(dx/d*16-g.v.x)*Math.min(1,dt*6); g.v.z+=(dz/d*16-g.v.z)*Math.min(1,dt*6);
      p.x+=g.v.x*dt; p.z+=g.v.z*dt; g.m.rotation.y+=dt*3;
      if(d<thf.r){ GM.free(g); emit(p.x,.6,p.z,thf.t.col,4,3,.3);
        if(thf===thief){ thief.xpStore+=g.val; thief.grow+=.015; thief.hp=Math.min(thief.max,thief.hp+thief.max*.004); }
        else { hole.hp=Math.min(hole.max,hole.hp+hole.max*.012); } }
      continue;
    }
    if(!s){ const f=Math.pow(.05,dt); g.v.x*=f; g.v.z*=f; p.x+=g.v.x*dt; p.z+=g.v.z*dt; continue; }
    const dx=s.pos.x-p.x, dz=s.pos.z-p.z, d=Math.hypot(dx,dz)||1;
    if(state==='play'&&(d<s.S.magnet||G.vacuum)){
      const sp=Math.max(10,28-d)*(G.vacuum?1.6:1);
      g.v.x+=(dx/d*sp-g.v.x)*Math.min(1,dt*8); g.v.z+=(dz/d*sp-g.v.z)*Math.min(1,dt*8);
    } else { const f=Math.pow(.05,dt); g.v.x*=f; g.v.z*=f; }
    p.x+=g.v.x*dt; p.z+=g.v.z*dt;
    p.y=.45+Math.sin(g.t*4)*.12; g.m.rotation.y+=dt*3;
    if(state==='play'&&d<.9){GM.free(g); gainXp(g.val); snd('pick'); emit(p.x,p.y,p.z,0x6dffd6,3,2.5,.25);}
  }
}

/* ---------- máy khách: chỉ vẽ lại ---------- */
function guestUpdate(dt){
  G.time+=dt;
  if(state==='play'&&me&&!me.dead) controlLocal(dt);
  const k=Math.min(1,dt*14);
  for(const s of ships.values()){
    if(s.local||s.dead) continue;
    s.pos.x+=(s.tx-s.pos.x)*k; s.pos.z+=(s.tz-s.pos.z)*k;
    s.g.rotation.y=lerpAngle(s.g.rotation.y,s.tRy,k); s.g.rotation.z+=(s.tRz-s.g.rotation.z)*k;
  }
  for(const b of PB.items){
    if(!b.on) continue;
    const pv=pullAt(b.m.position.x,b.m.position.z);
    if(pv.x||pv.z){ b.v.x+=pv.x*dt*3; b.v.z+=pv.z*dt*3; const l=Math.hypot(b.v.x,b.v.z)||1; b.v.x*=b.spd/l; b.v.z*=b.spd/l; }
    b.life-=dt; b.m.position.addScaledVector(b.v,dt);
    if(b.life<=0){ PB.free(b); if(b.id) netPB.delete(b.id); continue; }
    if(b.id) continue;
    // đạn của mình: biến mất khi chạm kẻ địch (sát thương do chủ phòng tính)
    for(const e of netEn.values()){
      if(b.hit.has(e)||e.m.scale.x<.3||e.t.ghost) continue;
      const dx=e.m.position.x-b.m.position.x, dz=e.m.position.z-b.m.position.z, rr=e.t.r*Math.max(.5,e.m.scale.x)+b.r;
      if(dx*dx+dz*dz<rr*rr){ b.hit.add(e); if(e.inv||b.pierce--<=0){PB.free(b);break;} }
    }
  }
  for(const b of EB.items){
    if(!b.on) continue;
    b.life-=dt; b.m.position.addScaledVector(b.v,dt);
    if(b.life<=0){ EB.free(b); netEB.delete(b.id); }
  }
  for(const e of netEn.values()){
    if(e.tx===undefined) continue;
    e.m.position.x+=(e.tx-e.m.position.x)*k; e.m.position.y+=(e.ty-e.m.position.y)*k; e.m.position.z+=(e.tz-e.m.position.z)*k;
    e.m.rotation.y=lerpAngle(e.m.rotation.y,e.tRy,k); e.m.rotation.x=lerpAngle(e.m.rotation.x,e.tRx,k);
  }
  for(const g of GM.items){ if(!g.on) continue; g.t+=dt; g.m.position.y=.45+Math.sin(g.t*4)*.12; g.m.rotation.y+=dt*3; }
}

function chain(src,s){
  const sp=src.m.position, list=[];
  for(const e of enemies){ if(e===src||e.dead||e.spawn>0||e.t.ghost) continue; const d=e.m.position.distanceToSquared(sp); if(d<49) list.push([d,e]); }
  list.sort((a,b)=>a[0]-b[0]);
  for(const [,e] of list.slice(0,2)){ bolt(sp.clone(),e.m.position.clone()); hitBy(e,s,s.S.dmg*.65,false); }
  if(list.length) snd('zap');
}

// Lõi Hư Không thường (đợt 5, 15, 25…)
function bossAI(e,dt,dx,dz,d){
  const m=e.m, enr=e.hp<e.max*.5;
  let ax=dx/d, az=dz/d, spd=e.spd*(enr?1.25:1);
  if(e.mode==='wind'){
    e.modeT-=dt; e.flash=.05; spd=0;
    if(Math.random()<.5) emit(m.position.x,1,m.position.z,0xff3fa4,2,6,.4);
    if(e.modeT<=0){e.mode='charge'; e.modeT=.75; e.cx=ax; e.cz=az; G.shake=.5; snd('dash');}
    return [ax,az,0];
  }
  if(e.mode==='charge'){
    e.modeT-=dt; e.vx=e.cx*24; e.vz=e.cz*24; if(e.modeT<=0) e.mode=null;
    emit(m.position.x,.6,m.position.z,0xff3fa4,3,3,.4);
    return [e.cx,e.cz,24];
  }
  if(e.mode==='spiral'){
    e.modeT-=dt; e.scd-=dt;
    if(e.scd<=0){e.scd=enr?.055:.075; e.ang+=.33; const arms=enr?4:3; for(let k=0;k<arms;k++) fireE(m.position.x,m.position.z,e.ang+k*TAU/arms,8.5);}
    if(e.modeT<=0) e.mode=null;
    return [ax,az,spd*.35];
  }
  e.atkT-=dt;
  if(e.atkT<=0&&state==='play'){
    const pick=['burst','spiral','summon','charge'][Math.floor(Math.random()*4)];
    if(pick==='burst'){
      const n=enr?28:20, off=Math.random()*TAU;
      for(let k=0;k<n;k++) fireE(m.position.x,m.position.z,off+k*TAU/n,10);
      if(enr) setTimeout(()=>{if(!e.dead&&state==='play') for(let k=0;k<n;k++) fireE(m.position.x,m.position.z,off+(k+.5)*TAU/n,8);},350);
      G.shake=.4; snd('big'); e.atkT=2.2;
    } else if(pick==='spiral'){ e.mode='spiral'; e.modeT=2.4; e.scd=0; e.atkT=3.4; }
    else if(pick==='summon'){
      for(let k=0;k<(enr?5:3);k++){const a=Math.random()*TAU; spawnEnemy(Math.random()<.5?'chaser':'shooter',m.position.x+Math.cos(a)*4,m.position.z+Math.sin(a)*4,.5);}
      e.atkT=2.6;
    } else { e.mode='wind'; e.modeT=.65; e.atkT=3.2; }
    if(enr) e.atkT*=.7;
  }
  m.rotation.y+=dt*.6; m.position.y=e.t.y+Math.sin(G.time*2)*.2;
  return [ax,az,spd];
}

/* ---------- HUD ---------- */
const camPos=new V3(0,30,24);
let hudT=0, lastBossR=-1;
function hud(){
  if(!me||!G) return;
  const sc=Math.floor(G.score).toLocaleString('vi-VN');
  if($('score').textContent!==sc) $('score').textContent=sc;
  $('wave').textContent=G.wave; $('lv').textContent=G.level;
  $('hpFill').style.width=Math.max(0,me.S.hp/me.S.maxHp*100)+'%';
  $('hpTxt').textContent=Math.max(0,Math.ceil(me.S.hp))+' / '+me.S.maxHp;
  $('xpFill').style.width=Math.min(100,G.xp/G.xpNext*100)+'%';
  $('dashFill').style.width=(1-Math.max(0,me.dashCool)/me.S.dashCd)*100+'%';
  const c=$('combo');
  if(G.combo>=5){c.hidden=false; c.textContent=`COMBO ${G.combo} · x${Math.min(4,1+Math.floor(G.combo/10)*.5).toFixed(1)}`; c.classList.toggle('hot',G.combo>=20);} else c.hidden=true;
  if(G.bossR>0){
    $('boss').hidden=false; $('boss').classList.toggle('inv',!!G.bossInv);
    $('bossName').textContent=G.bossKind>=0?BOSSES[G.bossKind].name:'LÕI HƯ KHÔNG';
    $('bossInfo').textContent=G.bossInfo||'';
    const w=G.bossR*100+'%'; $('bossFill').style.width=w;
    $('bossGhost').style.width=w;
    lastBossR=G.bossR;
  } else { $('boss').hidden=true; lastBossR=-1; }
}

// hiệu ứng tàu: khiên, lửa động cơ, vệt sáng, lưỡi quỹ đạo, bảng tên đồng đội
const tagV=new V3();
function shipsVisual(rdt,live){
  const t=G?G.time:tAll;
  for(const s of ships.values()){
    const sp=rdt>0?Math.hypot(s.pos.x-s.lx,s.pos.z-s.lz)/rdt:0; s.lx=s.pos.x; s.lz=s.pos.z;
    const show=!s.dead&&(live||state==='menu'||state==='lobby');
    if(live&&!s.dead&&rdt>0){
      if(sp>20) rawEmit(s.pos.x,.6,s.pos.z,0x9cf7ff,3,1.5,.3,.2,.4,0);
    }
    const prot=NET.mode==='guest'?(s.netInv||(s.local&&s.dashT>0)):(s.inv>0||s.dashT>0);
    s.shield.visible=!s.dead&&live&&prot;
    if(s.shield.visible){ s.shield.material.uniforms.uO.value=.7+.3*Math.sin(tAll*20); s.shield.rotation.y+=rdt*2; }
    s.recoil=Math.max(0,(s.recoil||0)-rdt*12);
    s.hull.position.z=s.recoil*.12;
    s.hull.position.y=.62+Math.sin(tAll*3+s.slot)*.06;
    s.coreM.material.emissiveIntensity=.9+Math.sin(tAll*4)*.25;
    const thrust=.55+Math.min(1,sp/12)*.75+Math.sin(tAll*40+s.slot)*.08;
    for(let i=0;i<s.flames.length;i++){ const f=s.flames[i]; f.scale.z=(i%2?.55:1)*thrust*(sp>20?1.8:1); }
    for(let i=0;i<s.tips.length;i++) s.tips[i].visible=Math.sin(tAll*6+i*Math.PI)>-.2;
    updTrail(s.trail,s.pos.x+Math.sin(s.g.rotation.y)*.9,s.pos.z+Math.cos(s.g.rotation.y)*.9,show&&live);
    s.trail.m.material.uniforms.uO.value=Math.min(1,.35+sp/10);
    const n=s.blades.length;
    for(let i=0;i<n;i++){
      const a=t*3.2+i/n*TAU, b=s.blades[i];
      b.position.set(s.pos.x+Math.cos(a)*2.7,.7,s.pos.z+Math.sin(a)*2.7); b.rotation.y=-a; b.visible=!s.dead;
    }
    if(s.tag){
      let showT=live&&!s.dead&&state!=='over';
      if(showT){
        tagV.set(s.pos.x,1.9,s.pos.z).project(cam);
        if(tagV.z>1) showT=false;
        else{
          const x=(tagV.x*.5+.5)*innerWidth, y=(-tagV.y*.5+.5)*innerHeight;
          s.tag.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;
          s.tag.lastChild.firstChild.style.width=Math.max(0,s.S.hp/s.S.maxHp*100)+'%';
        }
      }
      s.tag.hidden=!showT;
    }
  }
}

function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setSize(w,h,false); if(composer) composer.setSize(w,h);
  cam.aspect=w/h; cam.updateProjectionMatrix();
  const px=h*renderer.getPixelRatio()/(2*Math.tan(cam.fov*Math.PI/360));
  pMat.uniforms.uS.value=px; dustMat.uniforms.uS.value=px;
}
addEventListener('resize',resize); resize();
if(bloomPass) bloomPass.enabled=Q.bloom;
if(postPass) postPass.enabled=Q.post;

/* ---------- vòng lặp chính ---------- */
const clock=new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const rdt=Math.min(clock.getDelta(),.05);
  tAll+=rdt;
  let dt=0;
  const live=['play','levelup','dying','pause'].includes(state);
  if(NET.mode==='guest'){
    if(live&&G){
      dt=rdt; guestUpdate(dt); music();
      NET.sendT-=rdt; if(NET.sendT<=0){NET.sendT=.05; sendInput();}
    }
  } else if(state==='play'||state==='dying'){
    dt=rdt*(G.slow>0?.28:1);
    if(G.slow>0) G.slow-=rdt;
    update(dt);
    if(state==='dying'){G.deadT-=rdt; if(G.deadT<=0) gameOver();}
    music();
  }
  if(NET.mode==='host'&&NET.running&&G){
    if(state==='levelup'){ G.lvlT-=rdt; if(G.lvlT<=0) autoPicks(); }
    NET.sendT-=rdt; if(NET.sendT<=0&&NET.running){NET.sendT=.05; snapshot();}
  }
  const frozen=state==='pause'||(state==='levelup'&&!online());
  const pdt=frozen?0:(dt||rdt);
  updParticles(pdt); updRings(pdt); updDebris(pdt); updFlashes(pdt); updBolts(pdt); updBeams(pdt); updMarks(pdt); updDmg(rdt);
  for(const e of enemyList()) if(!e.dead) animEnemy(e,pdt);
  shipsVisual(frozen?0:rdt,live);
  for(const b of PB.items) if(b.on) b.gl.material.opacity=.45+.15*Math.sin(tAll*30+b.id);

  // nền
  floorMat.uniforms.uT.value=tAll; floorMat.uniforms.uR.value=RA; wallMat.uniforms.uT.value=tAll; dustMat.uniforms.uT.value=tAll;
  wall.scale.set(RA/R,1,RA/R);
  const bossOn=G&&G.bossR>0?1:0;
  floorMat.uniforms.uBoss.value+=(bossOn-floorMat.uniforms.uBoss.value)*Math.min(1,rdt*2);
  wallMat.uniforms.uC.value.setHex(bossOn?0xff2a5a:0xff3f8f);
  let pi=0; for(const s of ships.values()){ if(pi<4&&!s.dead){ floorMat.uniforms.uPl.value[pi].set(s.pos.x,s.pos.z); pi++; } }
  for(;pi<4;pi++) floorMat.uniforms.uPl.value[pi].set(999,999);
  for(const s of shards){s.m.rotation.y+=rdt*s.s; s.m.rotation.x+=rdt*s.s*.6; s.m.position.y=s.y+Math.sin(tAll*.6+s.ph)*.6;}
  for(const p of pillars){p.cap.scale.setScalar(1.2+.8*Math.max(0,Math.sin(tAll*2+p.ph)));}
  reticle.visible=!!me&&!me.dead&&!isTouch&&(state==='play'||state==='levelup'||state==='pause');
  reticle.rotation.y+=rdt*1.5;
  if(me) plight.position.set(me.pos.x,2.2,me.pos.z);

  // camera: theo tàu mình; khi tàu mình vỡ thì theo đồng đội còn sống
  const portrait=cam.aspect<.85;
  if(!live){
    const a=tAll*.08;
    cam.position.set(Math.sin(a)*34,24,Math.cos(a)*34); cam.lookAt(0,0,0);
    if((state==='menu'||state==='lobby')&&me){ me.g.rotation.y+=rdt*.6; me.pos.set(0,0,0); }
  } else {
    let f=me;
    if(!f||f.dead) f=aliveShips()[0]||me;
    const pp=f?f.pos:tmp.set(0,0,0), k=(portrait?1.45:1)*(bossOn?1.15:1);
    camPos.set(pp.x,24*k,pp.z+13*k);
    cam.position.lerp(camPos,Math.min(1,rdt*5));
    if(G&&G.shake>0){G.shake=Math.max(0,G.shake-rdt*2.2); const s=G.shake*.6*SET.shake; cam.position.x+=rnd(-s,s); cam.position.y+=rnd(-s,s)*.5; cam.position.z+=rnd(-s,s);}
    cam.lookAt(pp.x,0,pp.z-1);
    hudT-=rdt; if(hudT<=0&&G){hudT=.05; hud();}
  }
  // hậu kỳ
  hurtFx=Math.max(0,hurtFx-rdt*2.5); caFx=Math.max(0,caFx-rdt*2.5);
  screenFlash=Math.max(0,screenFlash-rdt*2.2); $('flash').style.opacity=screenFlash*.6;
  if(postPass){ const u=postPass.uniforms; u.uT.value=tAll%10; u.uHurt.value=hurtFx; u.uCA.value=caFx+hurtFx*.6+(G&&G.shake>.5?.2:0); u.uSat.value=state==='over'?.35:1; }
  if(composer) composer.render(); else renderer.render(scene,cam);
}
menuShip(); showBest(); loadKing();
frame();
})();
