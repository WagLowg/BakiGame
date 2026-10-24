(()=>{
'use strict';
const $=id=>document.getElementById(id);
const V3=THREE.Vector3, TAU=Math.PI*2, rnd=(a,b)=>a+Math.random()*(b-a);
const r2=v=>Math.round(v*100)/100;
const canvas=$('c');

/* ---------- renderer & scene ---------- */
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
const scene=new THREE.Scene();
const BG=0x0d0618;
scene.background=new THREE.Color(BG);
scene.fog=new THREE.FogExp2(BG,.014);
const cam=new THREE.PerspectiveCamera(50,1,.1,300);
scene.add(new THREE.HemisphereLight(0xb9a3ff,0x1a0830,.8));
const sun=new THREE.DirectionalLight(0xffe0c0,.6); sun.position.set(6,14,4); scene.add(sun);

let composer=null;
try{
  if(THREE.EffectComposer&&THREE.UnrealBloomPass&&THREE.RenderPass){
    composer=new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene,cam));
    composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(512,512),.9,.45,.22));
  }
}catch(e){composer=null;}

/* ---------- arena ---------- */
const R=30;
const floorMat=new THREE.ShaderMaterial({
  uniforms:{uT:{value:0},uR:{value:R},uPl:{value:new THREE.Vector2()}},
  extensions:{derivatives:true},
  vertexShader:`varying vec2 vP;void main(){vec4 w=modelMatrix*vec4(position,1.);vP=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uT,uR;uniform vec2 uPl;varying vec2 vP;
  void main(){
    vec2 q=vP/2.;
    vec2 g=abs(fract(q-.5)-.5)/fwidth(q);
    float line=1.-min(min(g.x,g.y),1.);
    float d=length(vP);
    float inside=1.-smoothstep(uR,uR+.4,d);
    float near=exp(-length(vP-uPl)*.11);
    float wave=sin(d*.55-uT*1.8)*.5+.5;
    vec3 gridC=mix(vec3(.42,.3,1.),vec3(1.,.68,.28),near);
    vec3 col=vec3(.04,.018,.075)+gridC*line*(.06+.42*near+.05*wave)*inside;
    float ring=exp(-abs(d-uR)*3.2);
    col+=vec3(1.,.28,.55)*ring*(1.+.25*sin(uT*3.));
    col*=mix(.3,1.,inside);
    col*=1.-smoothstep(uR+6.,uR+40.,d);
    gl_FragColor=vec4(col,1.);
  }`
});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(160,160),floorMat);
floor.rotation.x=-Math.PI/2; scene.add(floor);

const pillarMat=new THREE.MeshStandardMaterial({color:0x1b0e30,roughness:.7,metalness:.2});
const capMats=[new THREE.MeshBasicMaterial({color:0xffb547}),new THREE.MeshBasicMaterial({color:0xff4f6d})];
const pillars=[];
for(let i=0;i<28;i++){
  const a=i/28*TAU, h=rnd(2,6.5), r=R+3+Math.random()*1.5;
  const p=new THREE.Mesh(new THREE.BoxGeometry(.7,h,.7),pillarMat);
  p.position.set(Math.cos(a)*r,h/2,Math.sin(a)*r); scene.add(p);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(.75,.18,.75),capMats[i%2]);
  cap.position.y=h/2+.12; p.add(cap); pillars.push({cap,ph:Math.random()*TAU});
}
const shards=[];
const shardMat=new THREE.MeshStandardMaterial({color:0x2a1550,emissive:0x2c1060,emissiveIntensity:.6,flatShading:true});
for(let i=0;i<34;i++){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(rnd(.6,2.2)),shardMat);
  const a=Math.random()*TAU, r=rnd(R+9,R+34);
  m.position.set(Math.cos(a)*r,rnd(1,9),Math.sin(a)*r); scene.add(m);
  shards.push({m,y:m.position.y,s:rnd(.1,.5),ph:Math.random()*TAU});
}

/* ---------- ships (mỗi người chơi một tàu) ---------- */
const SHIP_COLORS=[[0xffb547,0xff8a1f],[0x2fe0b5,0x10a07c],[0x9a7bff,0x6a3dff],[0xff6b9a,0xe0306a]];
const CSS_COLORS=['#ffb547','#2fe0b5','#9a7bff','#ff6b9a'];
const hullGeo=new THREE.ConeGeometry(.62,1.7,3), wingGeo=new THREE.BoxGeometry(1.9,.1,.45);
const coreGeo=new THREE.SphereGeometry(.2,12,8), shieldGeo=new THREE.TorusGeometry(1.15,.05,6,40);
const wingMat=new THREE.MeshStandardMaterial({color:0x3a1d52,flatShading:true});
const bladeGeo=new THREE.OctahedronGeometry(.5), bladeMat=new THREE.MeshBasicMaterial({color:0xffe08a});

function baseStats(){
  return {hp:100,maxHp:100,speed:9,dmg:10,rate:5.5,multi:1,pierce:0,bspd:30,bsize:1,crit:.05,chain:0,boom:0,regen:0,magnet:4.5,dashCd:1.5};
}

const ships=new Map();
let me=null;   // tàu của người đang ngồi trước máy này

function addShip(id,name,slot,local){
  const [c,em]=SHIP_COLORS[slot%4];
  const g=new THREE.Group(); scene.add(g);
  const hull=new THREE.Mesh(hullGeo,new THREE.MeshStandardMaterial({color:c,emissive:em,emissiveIntensity:.5,flatShading:true,metalness:.3,roughness:.35}));
  hull.rotation.x=-Math.PI/2; hull.position.y=.65; g.add(hull);
  const wing=new THREE.Mesh(wingGeo,wingMat); wing.position.set(0,.58,.4); g.add(wing);
  const coreM=new THREE.Mesh(coreGeo,new THREE.MeshBasicMaterial({color:0xfff1c1})); coreM.position.set(0,.68,.62); g.add(coreM);
  const shield=new THREE.Mesh(shieldGeo,new THREE.MeshBasicMaterial({color:0x2fe0b5,transparent:true,opacity:.7}));
  shield.rotation.x=Math.PI/2; shield.position.y=.6; g.add(shield);
  const s={id,name,slot,local,g,hull,coreM,shield,pos:g.position,S:baseStats(),upg:{},
    aim:new V3(0,0,-1),firing:false,fireCd:0,dashT:0,dashCool:0,dashDir:new V3(),dashId:0,
    inv:0,netInv:false,vx:0,vz:0,dead:false,blades:[],tx:0,tz:0,tRy:0,tRz:0,lx:0,lz:0,offer:null,tag:null};
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
  s.hull.material.dispose(); s.coreM.material.dispose(); s.shield.material.dispose();
  if(s.tag) s.tag.remove();
  ships.delete(id);
  if(me===s) me=null;
}
function clearShips(){ for(const id of [...ships.keys()]) removeShip(id); }
function syncBlades(s,n){
  while(s.blades.length<n){const m=new THREE.Mesh(bladeGeo,bladeMat); m.scale.set(.5,.22,1.25); scene.add(m); s.blades.push(m);}
  while(s.blades.length>n) scene.remove(s.blades.pop());
}
function aliveShips(){ const a=[]; for(const s of ships.values()) if(!s.dead) a.push(s); return a; }
function nearestShip(x,z){
  let best=null, bd=1e18;
  for(const s of ships.values()){ if(s.dead) continue; const d=(s.pos.x-x)**2+(s.pos.z-z)**2; if(d<bd){bd=d;best=s;} }
  return best;
}

const plight=new THREE.PointLight(0xffb547,1.1,11); scene.add(plight);
const reticle=new THREE.Mesh(new THREE.RingGeometry(.35,.45,24),new THREE.MeshBasicMaterial({color:0xffb547,transparent:true,opacity:.85}));
reticle.rotation.x=-Math.PI/2; scene.add(reticle);

/* ---------- pools ---------- */
function pool(make){
  const items=[];
  return {items,
    get(){for(const it of items) if(!it.on){it.on=true;it.m.visible=true;return it;}
      const it=make(); it.on=true; items.push(it); return it;},
    free(it){it.on=false;it.m.visible=false;},
    clear(){for(const it of items){it.on=false;it.m.visible=false;}}};
}
const bGeo=new THREE.SphereGeometry(.2,8,6);
const PB=pool(()=>{const m=new THREE.Mesh(bGeo,new THREE.MeshBasicMaterial({color:0xfff1c1}));scene.add(m);return {m,v:new V3(),life:0,pierce:0,r:.22,hit:new Set(),id:0,owner:null};});
const EB=pool(()=>{const m=new THREE.Mesh(bGeo,new THREE.MeshBasicMaterial({color:0xff5fa8}));m.scale.set(1.4,1.4,2.4);scene.add(m);return {m,v:new V3(),life:0,id:0};});
const gemGeo=new THREE.OctahedronGeometry(.22);
const GM=pool(()=>{const m=new THREE.Mesh(gemGeo,new THREE.MeshBasicMaterial({color:0x6dffd6}));scene.add(m);return {m,v:new V3(),val:1,t:0};});
const ringGeo=new THREE.RingGeometry(.85,1,48);
const RG=pool(()=>{const m=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;scene.add(m);return {m,t:0,dur:.4,size:3};});
let bSeq=0, ebSeq=0, eSeq=0;
const netPB=new Map(), netEB=new Map();   // đạn đang hiển thị trên máy khách, theo id

/* ---------- particles ---------- */
const PN=2600, pPos=new Float32Array(PN*3), pCol=new Float32Array(PN*3), pVel=new Float32Array(PN*3), pBase=new Float32Array(PN*3), pLife=new Float32Array(PN), pMax=new Float32Array(PN);
let pIdx=0;
const pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
const pts=new THREE.Points(pGeo,new THREE.PointsMaterial({size:.34,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
pts.frustumCulled=false; scene.add(pts);
const tc=new THREE.Color();
function rawEmit(x,y,z,col,n,spd,life=.6,up=.6){
  tc.set(col);
  for(let i=0;i<n;i++){
    const k=pIdx; pIdx=(pIdx+1)%PN;
    const a=Math.random()*TAU, s=spd*(.3+Math.random()*.7);
    pPos[k*3]=x;pPos[k*3+1]=y;pPos[k*3+2]=z;
    pVel[k*3]=Math.cos(a)*s;pVel[k*3+1]=(Math.random()*up+.1)*s;pVel[k*3+2]=Math.sin(a)*s;
    pBase[k*3]=tc.r;pBase[k*3+1]=tc.g;pBase[k*3+2]=tc.b;
    pLife[k]=pMax[k]=life*(.5+Math.random()*.7);
  }
}
function updParticles(dt){
  const damp=Math.pow(.05,dt);
  for(let k=0;k<PN;k++){
    if(pLife[k]<=0){pCol[k*3]=pCol[k*3+1]=pCol[k*3+2]=0;continue;}
    pLife[k]-=dt;
    const j=k*3;
    pVel[j]*=damp;pVel[j+2]*=damp;pVel[j+1]=pVel[j+1]*damp-9*dt;
    pPos[j]+=pVel[j]*dt;pPos[j+1]+=pVel[j+1]*dt;pPos[j+2]+=pVel[j+2]*dt;
    if(pPos[j+1]<.05){pPos[j+1]=.05;pVel[j+1]*=-.4;}
    const t=Math.max(pLife[k]/pMax[k],0);
    pCol[j]=pBase[j]*t;pCol[j+1]=pBase[j+1]*t;pCol[j+2]=pBase[j+2]*t;
  }
  pGeo.attributes.position.needsUpdate=true; pGeo.attributes.color.needsUpdate=true;
}
function rawRing(x,z,col,size,dur=.4){const r=RG.get();r.m.position.set(x,.15,z);r.m.material.color.set(col);r.size=size;r.dur=dur;r.t=0;r.m.scale.setScalar(.1);}

/* ---------- lightning ---------- */
const bolts=[];
const boltMat=()=>new THREE.LineBasicMaterial({color:0xc9f2ff,transparent:true});
function rawBolt(a,b){
  const ptsA=[], n=7;
  for(let i=0;i<=n;i++){const p=a.clone().lerp(b,i/n); if(i&&i<n){p.x+=rnd(-.5,.5);p.z+=rnd(-.5,.5);p.y+=rnd(-.3,.3);} ptsA.push(p);}
  const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsA),boltMat());
  scene.add(l); bolts.push({l,t:.14});
}

/* ---------- enemy types ---------- */
const T={
  chaser:{geo:new THREE.TetrahedronGeometry(.8),hp:22,spd:5.4,r:.75,y:.85,col:0xff4f6d,xp:1,sc:10,dmg:12},
  shooter:{geo:new THREE.OctahedronGeometry(.8),hp:30,spd:3.6,r:.8,y:.95,col:0x9a7bff,xp:2,sc:20,dmg:10,range:13,fire:2.1},
  splitter:{geo:new THREE.IcosahedronGeometry(1),hp:50,spd:3.3,r:1,y:1.05,col:0x2fe0b5,xp:3,sc:30,dmg:14},
  tank:{geo:new THREE.BoxGeometry(1.7,1.7,1.7),hp:150,spd:2.3,r:1.2,y:.9,col:0xff9a3d,xp:6,sc:60,dmg:24},
  mini:{geo:new THREE.TetrahedronGeometry(.5),hp:12,spd:6.8,r:.5,y:.6,col:0x2fe0b5,xp:1,sc:5,dmg:8},
  boss:{geo:new THREE.DodecahedronGeometry(2.6),hp:1100,spd:2.6,r:2.7,y:2.9,col:0xff3fa4,xp:40,sc:1500,dmg:30}
};
const TYPES=Object.keys(T);
for(const k in T){const t=T[k];t.edges=new THREE.EdgesGeometry(t.geo);t.edgeMat=new THREE.LineBasicMaterial({color:new THREE.Color(t.col).lerp(new THREE.Color(0xffffff),.55)});}
const bossRingGeo=new THREE.TorusGeometry(4,.08,6,64);

function makeEnemyMesh(type){
  const t=T[type];
  const mat=new THREE.MeshStandardMaterial({color:t.col,emissive:t.col,emissiveIntensity:.5,flatShading:true,roughness:.35,metalness:.25});
  const m=new THREE.Mesh(t.geo,mat);
  m.add(new THREE.LineSegments(t.edges,t.edgeMat));
  m.scale.setScalar(.01); scene.add(m);
  let ringM=null;
  if(type==='boss'){
    ringM=new THREE.Mesh(bossRingGeo,new THREE.MeshBasicMaterial({color:0xff9cc8}));
    ringM.rotation.x=Math.PI/2; ringM.position.y=.3; scene.add(ringM);
  }
  return {m,mat,ringM};
}
function disposeEnemy(e){ scene.remove(e.m); e.mat.dispose(); if(e.ringM){scene.remove(e.ringM); e.ringM.material.dispose();} }

/* ---------- upgrades ---------- */
// f(S, ship): S là chỉ số của tàu nhận nâng cấp
const U=[
  {id:'dmg',g:'DMG',n:'Đạn Nặng',d:'+25% sát thương mỗi viên đạn.',max:6,f:S=>S.dmg*=1.25},
  {id:'rate',g:'ROF',n:'Cò Siêu Tốc',d:'+20% tốc độ bắn.',max:6,f:S=>S.rate*=1.2},
  {id:'multi',g:'×N',n:'Chùm Đạn',d:'Bắn thêm 1 tia đạn mỗi lần nhả cò.',max:5,f:S=>S.multi++},
  {id:'pierce',g:'PRC',n:'Xuyên Giáp',d:'Mỗi viên đạn xuyên thêm 1 kẻ địch.',max:4,f:S=>S.pierce++},
  {id:'speed',g:'SPD',n:'Động Cơ Ion',d:'+12% tốc độ di chuyển.',max:4,f:S=>S.speed*=1.12},
  {id:'hp',g:'HP+',n:'Vỏ Gia Cố',d:'+25 giáp tối đa và hồi ngay 40 giáp.',max:5,f:S=>{S.maxHp+=25;S.hp=Math.min(S.maxHp,S.hp+40);}},
  {id:'regen',g:'REG',n:'Nano Tự Sửa',d:'Tự hồi 1,5 giáp mỗi giây.',max:4,f:S=>S.regen+=1.5},
  {id:'orbit',g:'ORB',n:'Lưỡi Quỹ Đạo',d:'Thêm 1 lưỡi năng lượng xoay quanh tàu, cắt mọi thứ chạm vào.',max:6,f:(S,s)=>syncBlades(s,s.upg.orbit)},
  {id:'chain',g:'ARC',n:'Sét Dây Chuyền',d:'+20% cơ hội đạn phóng sét sang 2 kẻ địch gần.',max:4,f:S=>S.chain+=.2},
  {id:'boom',g:'EXP',n:'Phản Ứng Dây Chuyền',d:'Kẻ địch nổ tung khi chết, gây sát thương vùng. Nổ có thể kích nổ tiếp.',max:3,f:S=>S.boom++},
  {id:'crit',g:'CRT',n:'Điểm Yếu',d:'+12% tỉ lệ chí mạng, mỗi đòn chí mạng gây x2,5 sát thương.',max:4,f:S=>S.crit+=.12},
  {id:'magnet',g:'MAG',n:'Từ Trường',d:'+60% tầm hút tinh thể kinh nghiệm.',max:3,f:S=>S.magnet*=1.6},
  {id:'dash',g:'DSH',n:'Lướt Húc',d:'Lướt hồi nhanh hơn 25% và húc nát kẻ địch trên đường đi.',max:3,f:S=>S.dashCd*=.75},
  {id:'size',g:'PLS',n:'Lõi Plasma',d:'Đạn to hơn 35% và mạnh hơn 10%.',max:3,f:S=>{S.bsize*=1.35;S.dmg*=1.1;}}
];
const HEAL={id:'heal',g:'+HP',n:'Sửa Chữa Khẩn',d:'Hồi đầy giáp.',max:99,f:S=>S.hp=S.maxHp};
const UMAP={heal:HEAL}; for(const u of U) UMAP[u.id]=u;

/* ---------- audio ---------- */
let AC=null, master=null, noiseBuf=null, muted=false;
function audio(){
  if(AC) return AC;
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain(); master.gain.value=.32; master.connect(AC.destination);
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
let lastShot=0, lastPick=0, lastHit=0;
const sfx={
  shoot(){const n=performance.now(); if(n-lastShot<55) return; lastShot=n; tone(rnd(780,880),.06,'square',.035,.4);},
  hit(){const n=performance.now(); if(n-lastHit<40) return; lastHit=n; tone(320,.05,'triangle',.05,.6);},
  kill(){noise(.18,.14,1400); tone(180,.16,'sawtooth',.06,.3);},
  big(){noise(.6,.3,600); tone(90,.5,'sawtooth',.12,.25);},
  pick(){const n=performance.now(); if(n-lastPick<35) return; lastPick=n; tone(rnd(1100,1400),.05,'sine',.05,1.3);},
  hurt(){noise(.25,.25,500); tone(120,.25,'square',.1,.4);},
  dash(){noise(.2,.18,2400,'bandpass');},
  lvl(){if(!AC)return; const t=AC.currentTime; [523,659,784,1046].forEach((f,i)=>tone(f,.18,'triangle',.09,1,t+i*.07));},
  zap(){tone(1800,.08,'sawtooth',.03,.3);},
  enemyShot(){tone(500,.08,'sine',.03,.5);}
};
/* ---------- nhạc nền (file mp3 trong thư mục music) ---------- */
const BGM_VOL=.45;               // âm lượng nhạc nền: 0 → 1
const bgm=new Audio('music/nhac-nen.mp3');
bgm.loop=true; bgm.volume=BGM_VOL; bgm.preload='auto';
let bgmOk=true;
bgm.addEventListener('error',()=>{bgmOk=false;});   // không có file → dùng nhạc tự tạo
function bgmPlay(){ if(bgmOk&&!muted){ const p=bgm.play(); if(p&&p.catch) p.catch(()=>{}); } }
function bgmPause(){ bgm.pause(); }
// tiny bass + kick sequencer
let musT=0, musStep=0;
const SPB=60/116/4, ROOTS=[33,36,31,28];
const midi=m=>440*Math.pow(2,(m-69)/12);
function music(){
  if(bgmOk||!AC||muted||state!=='play') return;
  if(musT<AC.currentTime) musT=AC.currentTime+.02;
  while(musT<AC.currentTime+.18){
    const s=musStep%16, bar=Math.floor(musStep/16)%4, boss=G&&G.bossR>0;
    if(s%2===0) tone(midi(ROOTS[bar]+(s%8===6?12:0)),SPB*1.7,'sawtooth',.05,1,musT,boss?1100:650);
    if(s%4===0) tone(150,.2,'sine',.16,.27,musT);
    if((G&&G.wave>=3||boss)&&s%4===2) noise(.04,.05,7000,'highpass',musT);
    if(boss&&s%8===4) noise(.12,.08,1800,'bandpass',musT);
    musT+=SPB; musStep++;
  }
}

/* ---------- state ---------- */
// state: menu | lobby | play | levelup | pause | dying | over
let state='menu', G=null;
const enemies=[], pendingBoom=[];
const netEn=new Map();   // kẻ địch trên máy khách (chỉ để vẽ), theo id
let isTouch=false, autoFire=false, ovl=false;
const keys={}, mouse={x:0,y:0,down:false}, aimPt=new V3(0,.6,-5);
const ray=new THREE.Raycaster(), aimPlane=new THREE.Plane(new V3(0,1,0),-.6), ndc=new THREE.Vector2();
const tmp=new V3();
const bestKey='voidcore-best', nameKey='voidcore-name';
function getBest(){try{return +localStorage.getItem(bestKey)||0;}catch(e){return 0;}}
function setBest(v){try{localStorage.setItem(bestKey,String(v));}catch(e){}}
function showBest(){const b=getBest(); $('bestM').innerHTML=b?`KỶ LỤC <b>${b.toLocaleString('vi-VN')}</b>`:'';}

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
function flashHurt(){ $('vig').style.opacity=1; setTimeout(()=>$('vig').style.opacity=0,180); if(G) G.shake=Math.max(G.shake,.6); sfx.hurt(); }

/* ---------- run setup ---------- */
function clearWorld(){
  for(const e of enemies) disposeEnemy(e); enemies.length=0;
  for(const e of netEn.values()) disposeEnemy(e); netEn.clear();
  PB.clear(); EB.clear(); GM.clear(); RG.clear(); pendingBoom.length=0; netPB.clear(); netEB.clear();
  for(const b of bolts){scene.remove(b.l); b.l.geometry.dispose(); b.l.material.dispose();} bolts.length=0;
  fxq=[];
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
  G={wave:0,toSpawn:0,spawnT:0,spawnEvery:1,breakT:0,bossPending:0,score:0,kills:0,shake:0,slow:0,
     boss:null,bossR:0,combo:0,comboT:0,vacuum:false,deadT:0,time:0,level:1,xp:0,xpNext:8,pendingLv:0,lvlT:0};
  chips();
  if(isHost()) startWave(1);
}
function menuShip(){ clearWorld(); clearShips(); NET.myId='me'; const s=addShip('me','',0,true); s.pos.set(0,0,0); }

function startWave(n){
  G.wave=n; G.vacuum=false;
  const isBoss=n%5===0, crew=Math.max(1,ships.size);
  G.toSpawn=Math.round((isBoss?4+n:6+Math.floor(n*4.5))*(1+.5*(crew-1)));
  G.spawnEvery=Math.max(.22,1.1-n*.06)/(1+.25*(crew-1));
  G.spawnT=1;
  // đồng đội đã gục được hồi sinh khi sang đợt mới
  for(const s of ships.values()){
    if(!s.dead) continue;
    s.dead=false; s.g.visible=true; s.S.hp=Math.round(s.S.maxHp*.5); s.inv=2.5;
    const [x,z]=spawnPoint(s.slot,ships.size); s.pos.set(x,0,z); s.tx=x; s.tz=z; s.vx=s.vz=0;
    emit(x,.7,z,0x2fe0b5,40,9,.7); ring(x,z,0x2fe0b5,6,.5);
    if(s.local) rawBanner('HỒI SINH','Quay lại chiến đấu!');
    else q(['rs',s.id,r2(x),r2(z)]);
  }
  if(isBoss){G.bossPending=1.6; banner('CẢNH BÁO','Lõi Hư Không đang thức dậy'); snd('big');}
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

function spawnEnemy(type,x,z,spawnT=.45){
  const t=T[type];
  const crew=Math.max(1,ships.size);
  const sc=(type==='boss'?(1+.7*(G.wave/5-1)):1+.14*(G.wave-1))*(1+.35*(crew-1));
  const vis=makeEnemyMesh(type);
  vis.m.position.set(x,t.y,z);
  if(vis.ringM) vis.ringM.position.set(x,.3,z);
  const e={id:++eSeq,ti:TYPES.indexOf(type),type,t,m:vis.m,mat:vis.mat,ringM:vis.ringM,hp:t.hp*sc,max:t.hp*sc,r:t.r,spd:t.spd*(1+.02*G.wave),spawn:spawnT,flash:0,
    cd:rnd(.5,1)*(t.fire||1),orbitCd:0,dashHit:{},vx:0,vz:0,kx:0,kz:0,ph:Math.random()*TAU,dir:Math.random()<.5?1:-1,dead:false,lastBoom:0,lastDmg:0};
  if(type==='boss'){ e.atkT=2.5; e.mode=null; e.ang=0; G.boss=e; }
  enemies.push(e);
  emit(x,.5,z,t.col,type==='boss'?80:10,type==='boss'?14:5,.6,.4);
  return e;
}

function edgePos(){
  let a=Math.random()*TAU;
  const r=R-1.5;
  let x=Math.cos(a)*r, z=Math.sin(a)*r;
  const s=nearestShip(x,z);
  if(s&&Math.hypot(x-s.pos.x,z-s.pos.z)<12){a+=Math.PI;x=Math.cos(a)*r;z=Math.sin(a)*r;}
  return [x,z,a];
}

/* ---------- combat (chạy trên máy chủ phòng hoặc khi chơi một mình) ---------- */
const mult=()=>Math.min(4,1+Math.floor(G.combo/10)*.5);
const shipHex=slot=>SHIP_COLORS[slot%4][0];

function damage(e,amt,crit){
  if(e.dead||e.spawn>0) return;
  e.hp-=amt; e.flash=.07;
  emit(e.m.position.x,e.m.position.y,e.m.position.z,crit?0xffe08a:e.t.col,crit?9:4,crit?7:4,.35);
  snd('hit');
  if(e.hp<=0) kill(e);
}
// ghi lại ai gây đòn, để nâng cấp "nổ khi chết" của người đó được dùng
function hitBy(e,s,amt,crit){ e.lastBoom=s.S.boom; e.lastDmg=s.S.dmg; damage(e,amt,crit); }

function kill(e){
  e.dead=true;
  const p=e.m.position, boss=e.type==='boss';
  emit(p.x,p.y,p.z,e.t.col,boss?260:26,boss?20:9,boss?1.4:.7);
  emit(p.x,p.y,p.z,0xffffff,boss?60:6,boss?16:6,.4);
  ring(p.x,p.z,e.t.col,boss?16:e.r*3.2,boss?.9:.35);
  G.combo++; G.comboT=2.2; G.kills++;
  G.score+=e.t.sc*(1+G.wave*.1)*mult();
  const n=Math.min(boss?24:Math.ceil(e.t.xp),boss?24:5), val=e.t.xp*(1+G.wave*.05)/n;
  for(let i=0;i<n;i++){const g=GM.get(); g.m.position.set(p.x,.5,p.z); g.v.set(rnd(-1,1),0,rnd(-1,1)).normalize().multiplyScalar(rnd(2,boss?14:5)); g.val=val; g.t=Math.random()*5;}
  if(e.type==='splitter'){for(let i=0;i<2;i++){const s=spawnEnemy('mini',p.x+rnd(-.6,.6),p.z+rnd(-.6,.6),.12); s.kx=rnd(-6,6); s.kz=rnd(-6,6);}}
  if(e.lastBoom>0) pendingBoom.push({x:p.x,z:p.z,r:2.2+e.lastBoom*.8,dmg:e.lastDmg*(.9+.5*e.lastBoom),boom:e.lastBoom,src:e.lastDmg});
  if(boss){
    G.boss=null; G.shake=1.4; G.slow=.9; snd('big');
    for(const s of ships.values()) if(!s.dead) s.S.hp=Math.min(s.S.maxHp,s.S.hp+40);
    banner('LÕI ĐÃ VỠ','+40 giáp cho cả đội');
  } else { G.shake=Math.max(G.shake,e.type==='tank'?.4:.15); snd('kill'); }
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
  emit(p.x,.7,p.z,shipHex(s.slot),220,18,1.4); emit(p.x,.7,p.z,0xffffff,60,12,.6);
  ring(p.x,p.z,shipHex(s.slot),14,.9); snd('big'); G.shake=1.2;
  if(s.local){ if(ships.size>1) rawBanner('TÀU VỠ','Hồi sinh ở đợt sau'); }
  else q(['dd',s.id]);
  if(!aliveShips().length){ state='dying'; G.deadT=1.6; G.slow=1.4; G.shake=1.5; }
}

function fireE(x,z,a,spd){
  const b=EB.get(); b.id=++ebSeq; b.m.position.set(x,.8,z); b.v.set(Math.sin(a)*spd,0,Math.cos(a)*spd); b.life=5; b.m.rotation.y=a;
  q(['eb',b.id,r2(x),r2(z),r2(b.v.x),r2(b.v.z)]);
}

// vis=true: đạn chỉ để nhìn (tàu của khách); sát thương do chủ phòng tính
function shoot(s,vis){
  const S=s.S, n=S.multi, base=Math.atan2(s.aim.x,s.aim.z), step=n>1?Math.min(.15,.85/(n-1)):0;
  const px=s.pos.x, pz=s.pos.z;
  for(let i=0;i<n;i++){
    const a=base+(i-(n-1)/2)*step+rnd(-.025,.025);
    const b=PB.get();
    b.m.position.set(px+Math.sin(a)*.9,.65,pz+Math.cos(a)*.9);
    b.v.set(Math.sin(a)*S.bspd,0,Math.cos(a)*S.bspd);
    b.life=1.1; b.pierce=S.pierce; b.hit.clear(); b.r=.22*S.bsize; b.owner=s.id; b.id=vis?0:++bSeq;
    b.m.scale.set(S.bsize,S.bsize,S.bsize*2.6); b.m.rotation.y=a;
    if(!vis) q(['pb',b.id,s.id,r2(b.m.position.x),r2(b.m.position.z),r2(b.v.x),r2(b.v.z),r2(S.bsize)]);
  }
  if(s.local){ rawEmit(px+s.aim.x*1.1,.65,pz+s.aim.z*1.1,0xffd28a,3,3,.15,.2); sfx.shoot(); }
  s.hull.position.z=.12;
}

function dash(){
  if(state!=='play'||ovl||!me||me.dead||me.dashCool>0||me.dashT>0) return;
  let dx=0,dz=0; const mv=moveInput();
  if(mv.x||mv.z){dx=mv.x;dz=mv.z;} else {dx=me.aim.x;dz=me.aim.z;}
  const l=Math.hypot(dx,dz)||1;
  me.dashDir.set(dx/l,0,dz/l); me.dashT=.18; me.dashCool=me.S.dashCd; me.dashId++;
  sfx.dash(); rawRing(me.pos.x,me.pos.z,0x2fe0b5,3,.3);
}

function gainXp(v){
  G.xp+=v;
  while(G.xp>=G.xpNext){G.xp-=G.xpNext; G.level++; G.xpNext=Math.round(G.xpNext*1.22+5); G.pendingLv++;}
  if(G.pendingLv>0&&state==='play') openLevel();
}

/* ---------- level-up ----------
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
  const id=s.offer[Math.max(0,Math.min(s.offer.length-1,i|0))], u=UMAP[id];
  s.upg[id]=(s.upg[id]||0)+1; u.f(s.S,s);
  lvlWait.delete(s.id);
  emit(s.pos.x,.7,s.pos.z,0x2fe0b5,40,9,.7); ring(s.pos.x,s.pos.z,0x2fe0b5,7,.5);
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

/* ---------- input ---------- */
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
    if(e.code==='Enter'){ if(e.target.id==='codeIn') $('joinBtn').click(); else if(e.target.id==='nameIn') $('createBtn').click(); }
    return;
  }
  keys[e.code]=true;
  if(e.code==='Space'){e.preventDefault(); dash();}
  if(e.code==='KeyF'&&state==='play'&&!ovl){autoFire=!autoFire; rawBanner(autoFire?'TỰ BẮN: BẬT':'TỰ BẮN: TẮT','');}
  if(e.code==='KeyM') toggleMute();
  if(e.code==='Escape'||e.code==='KeyP'){
    if(online()){ if(['play','levelup','dying'].includes(state)) ovl?resume():pause(); }
    else if(state==='play') pause(); else if(state==='pause') resume();
  }
  if(state==='levelup'&&!ovl&&/^Digit[1-3]$/.test(e.code)) choose(+e.code.slice(5)-1);
  if(e.code==='Enter'){
    if(state==='menu'&&!$('menu').hidden) start();
    else if(state==='over'&&isHost()) $('againBtn').click();
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

/* ---------- menus ---------- */
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
function hideScreens(){ for(const id of ['menu','online','lobby','lvl','pause','over']) $(id).hidden=true; }
function setHud(on){for(const id of ['tl','bl','tr']) $(id).hidden=!on; if(!on) $('boss').hidden=true;}
function toMenu(msg){
  if(online()) leaveOnline();
  hideScreens(); setHud(false); ovl=false;
  state='menu'; menuShip(); showBest();
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
  newRun([['me','',0]]);
  beginPlay();
}
$('startBtn').addEventListener('click',start);
$('againBtn').addEventListener('click',()=>{ audio(); if(NET.mode==='host') hostStart(); else if(!online()) start(); });
$('overMenuBtn').addEventListener('click',()=>toMenu());

function gameOver(){
  const d={score:Math.floor(G.score),wave:G.wave,level:G.level,kills:G.kills};
  if(NET.mode==='host'){ NET.running=false; Net.send({t:'over',d}); sendRoster(); }
  showOver(d);
}
function showOver(d){
  state='over'; bgmPause(); ovl=false;
  const best=getBest();
  if(d.score>best) setBest(d.score);
  $('oScore').textContent=d.score.toLocaleString('vi-VN'); $('oWave').textContent=d.wave; $('oLv').textContent=d.level; $('oKills').textContent=d.kills;
  $('bestO').innerHTML=d.score>best?'<b>KỶ LỤC MỚI!</b>':`KỶ LỤC <b>${best.toLocaleString('vi-VN')}</b>`;
  $('againBtn').hidden=!isHost();
  $('overWait').textContent=isHost()?'':'Chờ chủ phòng bấm Chơi lại…';
  $('overMenuBtn').hidden=!online();
  $('boss').hidden=true; $('lvl').hidden=true; $('pause').hidden=true; $('over').hidden=false;
  for(const s of ships.values()) if(s.tag) s.tag.hidden=true;
}

/* ---------- online: phòng chờ ---------- */
const cleanName=n=>String(n||'').trim().slice(0,14)||'Phi công';
function myName(){ return cleanName($('nameIn').value); }
try{ $('nameIn').value=localStorage.getItem(nameKey)||''; }catch(e){}

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
  try{ localStorage.setItem(nameKey,$('nameIn').value.trim()); }catch(e){}
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
      const cl=v=>Math.max(-R,Math.min(R,+v||0));
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
      Object.assign(me.S,m.S); me.upg=m.upg||{}; chips(); break;
    case 'over':
      if(NET.mode==='guest') showOver(m.d); break;
    case 's':
      if(NET.mode==='guest'&&G&&state!=='over'&&state!=='lobby') applySnap(m); break;
  }
});

/* ---------- đồng bộ: chủ phòng gửi, khách nhận ---------- */
function snapshot(){
  const p=[];
  for(const s of ships.values()) p.push([s.id,r2(s.pos.x),r2(s.pos.z),r2(s.g.rotation.y),r2(s.g.rotation.z),Math.ceil(s.S.hp),s.S.maxHp,(s.inv>0?1:0)|(s.dashT>0?2:0)|(s.dead?4:0),s.blades.length]);
  const e=[];
  for(const x of enemies) if(!x.dead) e.push([x.id,x.ti,r2(x.m.position.x),r2(x.m.position.y),r2(x.m.position.z),r2(x.m.rotation.y),r2(x.m.rotation.x),r2(x.m.scale.x),x.flash>0?1:0]);
  const m=[];
  for(const g of GM.items) if(g.on) m.push(r2(g.m.position.x),r2(g.m.position.z));
  Net.send({t:'s',g:[G.wave,Math.floor(G.score),G.level,r2(G.xp),G.xpNext,G.combo,r2(G.bossR),STATES.indexOf(state),r2(G.time),r2(G.shake)],p,e,m,fx:fxq});
  fxq=[];
}

function applySnap(m){
  const g=m.g;
  G.wave=g[0]; G.score=g[1]; G.level=g[2]; G.xp=g[3]; G.xpNext=g[4]; G.combo=g[5]; G.bossR=g[6];
  const st=STATES[g[7]];
  if(Math.abs(G.time-g[8])>.5) G.time=g[8];
  G.shake=Math.max(G.shake,g[9]*.5);
  if(st==='play'&&state==='levelup'){ $('lvl').hidden=true; curOffer=null; state='play'; }
  else if(st==='dying'&&state==='play') state='dying';

  for(const [id,x,z,ry,rz,hp,maxHp,fl,nb] of m.p){
    const s=ships.get(id); if(!s) continue;
    s.S.hp=hp; s.S.maxHp=maxHp;
    const dead=!!(fl&4);
    if(s.local){
      if(dead&&!s.dead) s.firing=false;
      s.netInv=!!(fl&1);
    } else {
      s.tx=x; s.tz=z; s.tRy=ry; s.tRz=rz; s.netInv=!!(fl&3);
      if(s.dead&&!dead) s.pos.set(x,0,z);
    }
    s.dead=dead; s.g.visible=!dead;
    syncBlades(s,nb);
  }

  const seen=new Set();
  for(const [id,ti,x,y,z,ry,rx,sc,fl] of m.e){
    seen.add(id);
    let e=netEn.get(id);
    if(!e){
      const type=TYPES[ti]; if(!type) continue;
      const vis=makeEnemyMesh(type);
      e={id,type,t:T[type],m:vis.m,mat:vis.mat,ringM:vis.ringM};
      vis.m.position.set(x,y,z); vis.m.rotation.set(rx,ry,0);
      netEn.set(id,e);
    }
    e.tx=x; e.ty=y; e.tz=z; e.tRy=ry; e.tRx=rx;
    e.m.scale.setScalar(Math.max(.01,sc));
    e.mat.emissiveIntensity=fl?3.2:.5;
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
    case 's': if(sfx[ev[1]]) sfx[ev[1]](); break;
    case 'pb': {
      if(ev[2]===NET.myId) break;   // đạn của mình đã được vẽ sẵn trên máy này
      const b=PB.get(); b.id=ev[1]; b.owner=ev[2]; b.m.position.set(ev[3],.65,ev[4]); b.v.set(ev[5],0,ev[6]);
      b.life=1.1; b.pierce=0; b.hit.clear(); b.m.scale.set(ev[7],ev[7],ev[7]*2.6); b.m.rotation.y=Math.atan2(ev[5],ev[6]);
      netPB.set(b.id,b); break;
    }
    case 'pf': { const b=netPB.get(ev[1]); if(b){PB.free(b); netPB.delete(ev[1]);} break; }
    case 'eb': {
      const b=EB.get(); b.id=ev[1]; b.m.position.set(ev[2],.8,ev[3]); b.v.set(ev[4],0,ev[5]); b.life=5; b.m.rotation.y=Math.atan2(ev[4],ev[5]);
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

/* ---------- điều khiển tàu của mình (mọi chế độ) ---------- */
function controlLocal(dt){
  const s=me, pp=s.pos, S=s.S;
  const mv=ovl?{x:0,z:0}:moveInput();
  if(s.dashT>0){ s.dashT-=dt; s.vx=s.dashDir.x*38; s.vz=s.dashDir.z*38; }
  else { const k=Math.min(1,dt*12); s.vx+=(mv.x*S.speed-s.vx)*k; s.vz+=(mv.z*S.speed-s.vz)*k; }
  pp.x+=s.vx*dt; pp.z+=s.vz*dt;
  const pl=Math.hypot(pp.x,pp.z); if(pl>R-.8){pp.x*=(R-.8)/pl;pp.z*=(R-.8)/pl;}

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
  s.g.rotation.z=-s.vx*.012*Math.cos(s.g.rotation.y)+s.vz*.012*Math.sin(s.g.rotation.y);
  s.firing=firing;
  s.dashCool-=dt;
  if(NET.mode==='guest'){
    s.fireCd-=dt;
    if(firing&&s.fireCd<=0){ s.fireCd=1/S.rate; shoot(s,true); }
  }
}

function lerpAngle(a,b,k){ let d=b-a; d=Math.atan2(Math.sin(d),Math.cos(d)); return a+d*k; }

/* ---------- update: mô phỏng trận (chủ phòng / chơi một mình) ---------- */
function easeBack(t){const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);}

function update(dt){
  G.time+=dt;

  /* waves */
  if(state==='play'){
    if(G.breakT>0){G.breakT-=dt; if(G.breakT<=0) startWave(G.wave+1);}
    else{
      if(G.bossPending>0){G.bossPending-=dt; if(G.bossPending<=0){const [x,z]=edgePos(); spawnEnemy('boss',x*.7,z*.7,1.2); G.shake=1;}}
      if(G.toSpawn>0){
        G.spawnT-=dt;
        if(G.spawnT<=0){
          G.spawnT=G.spawnEvery*rnd(.6,1.4);
          const grp=Math.min(G.toSpawn,1+Math.floor(Math.random()*Math.min(5,1+G.wave/3)));
          const [,,a]=edgePos();
          const type=pickType();
          for(let i=0;i<grp;i++){const aa=a+(i-(grp-1)/2)*.12; spawnEnemy(type,Math.cos(aa)*(R-1.5),Math.sin(aa)*(R-1.5));}
          G.toSpawn-=grp;
        }
      } else if(enemies.length===0&&G.bossPending<=0){
        G.breakT=2.8; G.vacuum=true;
        for(const s of ships.values()) if(!s.dead) s.S.hp=Math.min(s.S.maxHp,s.S.hp+10);
        banner('ĐỢT '+G.wave+' SẠCH','+10 giáp · chuẩn bị đợt '+(G.wave+1)); snd('lvl');
      }
    }
  }

  /* ships */
  if(state==='play'&&me&&!me.dead) controlLocal(dt);
  for(const s of ships.values()){
    if(!s.local){
      s.dashT-=dt;
      if(!s.dead){
        const k=Math.min(1,dt*14);
        s.pos.x+=(s.tx-s.pos.x)*k; s.pos.z+=(s.tz-s.pos.z)*k;
        s.g.rotation.y=lerpAngle(s.g.rotation.y,s.tRy,k); s.g.rotation.z+=(s.tRz-s.g.rotation.z)*k;
      }
    }
    if(s.dead) continue;
    s.inv-=dt;
    if(s.S.regen) s.S.hp=Math.min(s.S.maxHp,s.S.hp+s.S.regen*dt);
    s.fireCd-=dt;
    if(state==='play'&&s.firing&&s.fireCd<=0){ s.fireCd=1/s.S.rate; shoot(s,false); }
  }
  if(G.comboT>0){G.comboT-=dt; if(G.comboT<=0) G.combo=0;}

  /* bullets */
  for(const b of PB.items){
    if(!b.on) continue;
    b.life-=dt; b.m.position.addScaledVector(b.v,dt);
    if(b.life<=0||Math.hypot(b.m.position.x,b.m.position.z)>R+5){PB.free(b);continue;}
    const owner=ships.get(b.owner); if(!owner){PB.free(b);continue;}
    const S=owner.S;
    for(const e of enemies){
      if(e.dead||e.spawn>0||b.hit.has(e)) continue;
      const dx=e.m.position.x-b.m.position.x, dz=e.m.position.z-b.m.position.z, rr=e.r+b.r;
      if(dx*dx+dz*dz<rr*rr){
        b.hit.add(e);
        const crit=Math.random()<S.crit;
        if(e.type!=='boss'){const kb=e.type==='tank'?1:3.5; e.kx+=b.v.x/S.bspd*kb; e.kz+=b.v.z/S.bspd*kb;}
        hitBy(e,owner,S.dmg*(crit?2.5:1),crit);
        if(S.chain>0&&Math.random()<S.chain) chain(e,owner);
        if(b.pierce--<=0){PB.free(b); q(['pf',b.id]); break;}
      }
    }
  }
  for(const b of EB.items){
    if(!b.on) continue;
    b.life-=dt; b.m.position.addScaledVector(b.v,dt);
    const p=b.m.position;
    if(b.life<=0||Math.hypot(p.x,p.z)>R+4){EB.free(b);continue;}
    if(state!=='play') continue;
    for(const s of ships.values()){
      if(s.dead) continue;
      const dx=p.x-s.pos.x, dz=p.z-s.pos.z;
      if(dx*dx+dz*dz<.75*.75){EB.free(b); q(['ef',b.id]); hurt(s,12+G.wave*.8); break;}
    }
  }

  /* enemies */
  for(let i=0;i<enemies.length;i++){
    const e=enemies[i]; if(e.dead) continue;
    const m=e.m;
    if(e.spawn>0){
      e.spawn-=dt; const s=1-Math.max(e.spawn,0)/(e.type==='boss'?1.2:.45);
      m.scale.setScalar(Math.max(.01,easeBack(Math.min(1,s))));
      m.rotation.y+=dt*6; continue;
    }
    m.scale.setScalar(1);
    const tgt=nearestShip(m.position.x,m.position.z);
    const tx=tgt?tgt.pos.x:0, tz=tgt?tgt.pos.z:0;
    const dx=tx-m.position.x, dz=tz-m.position.z, d=Math.hypot(dx,dz)||1;
    let ax=dx/d, az=dz/d, spd=e.spd;
    if(e.type==='shooter'){
      const rg=e.t.range;
      if(d<rg*.55){ax=-ax;az=-az;}
      else if(d<rg){const sx=-az*e.dir, sz=ax*e.dir; ax=sx;az=sz; spd*=.7;}
      e.cd-=dt;
      if(tgt&&e.cd<=0&&d<rg+4&&state==='play'){e.cd=e.t.fire*rnd(.8,1.2); fireE(m.position.x,m.position.z,Math.atan2(dx,dz),11); e.flash=.12; snd('enemyShot');}
    } else if(e.type==='boss'){
      const r=bossAI(e,dt,dx,dz,d); ax=r[0]; az=r[1]; spd=r[2];
      e.ringM.position.x=m.position.x; e.ringM.position.z=m.position.z;
      e.ringM.rotation.z+=dt*(e.hp<e.max*.5?3:1.2);
    }
    // separation
    for(let j=i+1;j<enemies.length;j++){
      const o=enemies[j]; if(o.dead) continue;
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
    const el=Math.hypot(m.position.x,m.position.z); if(el>R-.5){m.position.x*=(R-.5)/el;m.position.z*=(R-.5)/el;}
    e.ph+=dt;
    m.position.y=e.t.y+Math.sin(e.ph*3)*.15;
    m.rotation.y+=dt*(e.type==='tank'?.8:2.2); m.rotation.x+=dt*(e.type==='boss'?.4:1.1);
    e.flash-=dt; e.mat.emissiveIntensity=e.flash>0?3.2:.5;

    for(const s of ships.values()){
      if(s.dead||e.dead) continue;
      const sx=s.pos.x-m.position.x, sz=s.pos.z-m.position.z, sd=Math.hypot(sx,sz)||1;
      if(state==='play'&&sd<e.r+.55&&s.dashT<=0){
        hurt(s,e.t.dmg*(1+.04*G.wave));
        if(e.type!=='boss'){e.kx-=sx/sd*10;e.kz-=sz/sd*10;}
      }
      if(s.dashT>0&&s.upg.dash&&sd<e.r+1&&e.dashHit[s.id]!==s.dashId){ e.dashHit[s.id]=s.dashId; hitBy(e,s,s.S.dmg*3,true); }
      // blades
      if(s.blades.length&&e.orbitCd<=0&&!e.dead){
        for(const b of s.blades){
          const bx=b.position.x-m.position.x, bz=b.position.z-m.position.z;
          if(bx*bx+bz*bz<(e.r+.6)*(e.r+.6)){hitBy(e,s,s.S.dmg*.9,false); e.orbitCd=.3; if(e.type!=='boss'){e.kx-=ax*5;e.kz-=az*5;} break;}
        }
      }
    }
    e.orbitCd-=dt;
  }

  /* explosions (chain reactions resolve one step per frame) */
  const booms=pendingBoom.splice(0,30);
  for(const bm of booms){
    ring(bm.x,bm.z,0xff9a3d,bm.r,.35); emit(bm.x,.5,bm.z,0xff9a3d,14,bm.r*3,.45);
    for(const e of enemies){
      if(e.dead||e.spawn>0) continue;
      const dx=e.m.position.x-bm.x, dz=e.m.position.z-bm.z;
      if(dx*dx+dz*dz<(bm.r+e.r)*(bm.r+e.r)){ e.lastBoom=bm.boom; e.lastDmg=bm.src; damage(e,bm.dmg,false); }
    }
  }

  /* cleanup dead */
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if(e.dead){disposeEnemy(e); enemies.splice(i,1);}
  }
  G.bossR=G.boss&&G.boss.spawn<=0?Math.max(0,G.boss.hp/G.boss.max):0;

  /* gems: bay về tàu gần nhất, kinh nghiệm dùng chung cả đội */
  for(const g of GM.items){
    if(!g.on) continue;
    g.t+=dt;
    const p=g.m.position, s=nearestShip(p.x,p.z);
    if(!s){ const f=Math.pow(.05,dt); g.v.x*=f; g.v.z*=f; p.x+=g.v.x*dt; p.z+=g.v.z*dt; continue; }
    const dx=s.pos.x-p.x, dz=s.pos.z-p.z, d=Math.hypot(dx,dz)||1;
    if(state==='play'&&(d<s.S.magnet||G.vacuum)){
      const sp=Math.max(10,28-d)*(G.vacuum?1.6:1);
      g.v.x+=(dx/d*sp-g.v.x)*Math.min(1,dt*8); g.v.z+=(dz/d*sp-g.v.z)*Math.min(1,dt*8);
    } else { const f=Math.pow(.05,dt); g.v.x*=f; g.v.z*=f; }
    p.x+=g.v.x*dt; p.z+=g.v.z*dt;
    p.y=.45+Math.sin(g.t*4)*.12; g.m.rotation.y+=dt*3;
    if(state==='play'&&d<.9){GM.free(g); gainXp(g.val); snd('pick'); emit(p.x,p.y,p.z,0x6dffd6,2,2,.25);}
  }
}

/* ---------- update: máy khách chỉ vẽ lại ---------- */
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
    b.life-=dt; b.m.position.addScaledVector(b.v,dt);
    if(b.life<=0){ PB.free(b); if(b.id) netPB.delete(b.id); continue; }
    if(b.id) continue;
    // đạn của mình: biến mất khi chạm kẻ địch (sát thương do chủ phòng tính)
    for(const e of netEn.values()){
      if(b.hit.has(e)||e.m.scale.x<.5) continue;
      const dx=e.m.position.x-b.m.position.x, dz=e.m.position.z-b.m.position.z, rr=e.t.r+b.r;
      if(dx*dx+dz*dz<rr*rr){ b.hit.add(e); if(b.pierce--<=0){PB.free(b);break;} }
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
    if(e.ringM){ e.ringM.position.x=e.m.position.x; e.ringM.position.z=e.m.position.z; e.ringM.rotation.z+=dt*1.5; }
  }
  for(const g of GM.items){ if(!g.on) continue; g.t+=dt; g.m.position.y=.45+Math.sin(g.t*4)*.12; g.m.rotation.y+=dt*3; }
}

function chain(src,s){
  const sp=src.m.position, list=[];
  for(const e of enemies){ if(e===src||e.dead||e.spawn>0) continue; const d=e.m.position.distanceToSquared(sp); if(d<49) list.push([d,e]); }
  list.sort((a,b)=>a[0]-b[0]);
  for(const [,e] of list.slice(0,2)){ bolt(sp.clone(),e.m.position.clone()); hitBy(e,s,s.S.dmg*.65,false); }
  if(list.length) snd('zap');
}

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
  return [ax,az,spd];
}

/* ---------- camera, HUD, loop ---------- */
const camPos=new V3(0,30,24);
let hudT=0;
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
  if(G.combo>=5){c.hidden=false; c.textContent=`COMBO ${G.combo} · x${Math.min(4,1+Math.floor(G.combo/10)*.5).toFixed(1)}`;} else c.hidden=true;
  if(G.bossR>0){$('boss').hidden=false; $('bossFill').style.width=G.bossR*100+'%';} else $('boss').hidden=true;
}

// hiệu ứng tàu: khiên, vệt lửa, lưỡi quỹ đạo, bảng tên đồng đội
const tagV=new V3();
function shipsVisual(rdt,live){
  const t=G?G.time:tAll;
  for(const s of ships.values()){
    const sp=rdt>0?Math.hypot(s.pos.x-s.lx,s.pos.z-s.lz)/rdt:0; s.lx=s.pos.x; s.lz=s.pos.z;
    if(live&&!s.dead&&rdt>0){
      const ry=s.g.rotation.y, bx=s.pos.x+Math.sin(ry)*.8, bz=s.pos.z+Math.cos(ry)*.8;
      if(sp>20) rawEmit(s.pos.x,.6,s.pos.z,0x2fe0b5,3,1.5,.3,.2);
      else if(sp>1&&Math.random()<.6) rawEmit(bx,.6,bz,0xff9a3d,1,1,.3,.1);
    }
    const prot=NET.mode==='guest'?(s.netInv||(s.local&&s.dashT>0)):(s.inv>0||s.dashT>0);
    s.shield.visible=!s.dead&&live&&prot;
    s.shield.rotation.z+=rdt*4;
    s.hull.position.z+=(0-s.hull.position.z)*Math.min(1,rdt*18);
    s.coreM.scale.setScalar(1+Math.sin(tAll*10)*.15);
    const n=s.blades.length;
    for(let i=0;i<n;i++){
      const a=t*3.2+i/n*TAU, b=s.blades[i];
      b.position.set(s.pos.x+Math.cos(a)*2.7,.7,s.pos.z+Math.sin(a)*2.7); b.rotation.y=-a; b.visible=!s.dead;
    }
    if(s.tag){
      let show=live&&!s.dead&&state!=='over';
      if(show){
        tagV.set(s.pos.x,1.9,s.pos.z).project(cam);
        if(tagV.z>1) show=false;
        else{
          const x=(tagV.x*.5+.5)*innerWidth, y=(-tagV.y*.5+.5)*innerHeight;
          s.tag.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;
          s.tag.lastChild.firstChild.style.width=Math.max(0,s.S.hp/s.S.maxHp*100)+'%';
        }
      }
      s.tag.hidden=!show;
    }
  }
}

function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setSize(w,h,false); if(composer) composer.setSize(w,h);
  cam.aspect=w/h; cam.updateProjectionMatrix();
}
addEventListener('resize',resize); resize();

const clock=new THREE.Clock();
let tAll=0;
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
  updParticles(pdt);
  for(let i=RG.items.length-1;i>=0;i--){const r=RG.items[i]; if(!r.on) continue; r.t+=pdt; const k=r.t/r.dur; if(k>=1){RG.free(r);continue;} r.m.scale.setScalar(.1+r.size*(1-Math.pow(1-k,3))); r.m.material.opacity=1-k;}
  for(let i=bolts.length-1;i>=0;i--){const b=bolts[i]; b.t-=pdt; b.l.material.opacity=Math.max(0,b.t/.14); if(b.t<=0){scene.remove(b.l); b.l.geometry.dispose(); b.l.material.dispose(); bolts.splice(i,1);}}
  shipsVisual(frozen?0:rdt,live);

  // ambient
  floorMat.uniforms.uT.value=tAll;
  if(me) floorMat.uniforms.uPl.value.set(me.pos.x,me.pos.z);
  for(const s of shards){s.m.rotation.y+=rdt*s.s; s.m.rotation.x+=rdt*s.s*.6; s.m.position.y=s.y+Math.sin(tAll*.6+s.ph)*.6;}
  for(const p of pillars){p.cap.scale.y=1+.5*Math.max(0,Math.sin(tAll*2+p.ph));}
  reticle.visible=!!me&&!me.dead&&(state==='play'||state==='levelup'||state==='pause');
  if(me) plight.position.set(me.pos.x,2,me.pos.z);

  // camera: theo tàu mình; khi tàu mình vỡ thì theo đồng đội còn sống
  const portrait=cam.aspect<.85;
  if(!live){
    const a=tAll*.08;
    cam.position.set(Math.sin(a)*34,26,Math.cos(a)*34); cam.lookAt(0,0,0);
    if((state==='menu'||state==='lobby')&&me) me.g.rotation.y+=rdt*.6;
  } else {
    let f=me;
    if(!f||f.dead) f=aliveShips()[0]||me;
    const pp=f?f.pos:tmp.set(0,0,0), k=portrait?1.45:1;
    camPos.set(pp.x,24*k,pp.z+13*k);
    cam.position.lerp(camPos,Math.min(1,rdt*5));
    if(G&&G.shake>0){G.shake=Math.max(0,G.shake-rdt*2.2); const s=G.shake*.6; cam.position.x+=rnd(-s,s); cam.position.y+=rnd(-s,s)*.5; cam.position.z+=rnd(-s,s);}
    cam.lookAt(pp.x,0,pp.z-1);
    hudT-=rdt; if(hudT<=0&&G){hudT=.05; hud();}
  }
  if(composer) composer.render(); else renderer.render(scene,cam);
}
menuShip(); showBest();
frame();
})();
