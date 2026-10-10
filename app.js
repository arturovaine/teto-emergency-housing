(function(){
'use strict';
const $ = s => document.querySelector(s);
const vp = $('#viewport'), canvas = $('#c'), tagEl = $('#tag');

/* ---------- peças e etapas ---------- */
const STEPS = ['Pilotis','Vigas mestras','Painéis de piso','Paredes','Estrutura do telhado','Manta e telhas','Porta e janelas'];
const PARTS = [
  {id:'pilotis', step:1, name:'Pilotis', meta:'12 estacas · Ø ≈ 12 cm',
   desc:'Estacas de madeira cravadas no solo em malha 4 × 3. Elevam o piso cerca de 0,5 m: afastam umidade, enxurrada e animais e dispensam terraplenagem em terreno irregular.'},
  {id:'vigas', step:2, name:'Vigas mestras', meta:'3 linhas de 6,00 m',
   desc:'Correm no sentido do comprimento, apoiadas nos pilotis, e recebem os painéis de piso. Seção estimada pela foto de obra.'},
  {id:'piso', step:3, name:'Painéis de piso', meta:'5 painéis · 1,20 × 3,00 m',
   desc:'Assoalho de tábuas sobre barrotes, pré-fabricado. Os cinco painéis fecham a plataforma de 18 m².'},
  {id:'quadrado', step:4, name:'Painel Quadrado', meta:'2 un. · 3,00 × 1,90 m',
   desc:'Fecha as duas extremidades curtas, para onde o telhado deságua. Um deles recebe janela.'},
  {id:'diagonal', step:4, name:'Painel Diagonal', meta:'4 un. · 2,40 m · 1,90 → 2,34 m',
   desc:'Trapezoidal, em versão esquerda e direita. O topo inclinado já dá o caimento do telhado. Recebe a porta e as janelas.'},
  {id:'capela', step:4, name:'Painel Capela', meta:'2 un. · 1,20 m · pico a 2,45 m',
   desc:'Peça central das fachadas longas, com topo em bico. Apoia a viga de cumeeira.'},
  {id:'estrutura', step:5, name:'Estrutura do telhado', meta:'cumeeira + 6 caibros + 10 ripas',
   desc:'A cumeeira vence os 3 m entre as duas capelas, os caibros descem até os quadrados e as ripas recebem as telhas. Quantidades lidas no modelo SketchUp de 2017.'},
  {id:'manta', step:6, name:'Manta térmica', meta:'alumínio + polietileno bolha',
   desc:'Fica sob a telha. Em ensaio com modelos reduzidos na Poli-USP (2012), cortou cerca de 48% do calor que atravessa a cobertura durante o dia, frente à telha de zinco sozinha.'},
  {id:'telhas', step:6, name:'Telhas de aço zincado', meta:'8 chapas · 2 águas · ≈ 18%',
   desc:'Quatro chapas onduladas por água, com caimento para as extremidades curtas. Substituíram o fibrocimento usado nos primeiros anos. Fixadas aos caibros por pregos de telha com arruela de vedação, no cruzamento de cada ripa.'},
  {id:'aberturas', step:7, name:'Porta e janelas', meta:'1 porta · 3 janelas de madeira',
   desc:'Folhas cegas de madeira, sem vidro. A posição muda entre as versões porta na lateral e porta na fachada; aqui vale a da perspectiva TETO de 2015.'}
];
const PART = Object.fromEntries(PARTS.map(p => [p.id, p]));

/* lista lateral */
const partsEl = $('#parts');
const rowEls = {};
(function buildList(){
  const days = [{t:'Dia 1 · fundação e piso', s:[1,2,3]}, {t:'Dia 2 · paredes e cobertura', s:[4,5,6,7]}];
  days.forEach(d => {
    const h = document.createElement('p'); h.className = 'day'; h.textContent = d.t; partsEl.appendChild(h);
    const ol = document.createElement('ol'); ol.className = 'parts';
    PARTS.filter(p => d.s.includes(p.step)).forEach(p => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'part'; b.id = 'part-' + p.id; b.setAttribute('aria-pressed','false');
      b.innerHTML = '<span class="n">' + p.step + '</span><span><span class="name"></span><span class="meta"></span></span><p class="desc" hidden></p>';
      b.querySelector('.name').textContent = p.name;
      b.querySelector('.meta').textContent = p.meta;
      b.querySelector('.desc').textContent = p.desc;
      b.addEventListener('click', () => select(selected === p.id ? null : p.id));
      li.appendChild(b); ol.appendChild(li); rowEls[p.id] = b;
    });
    partsEl.appendChild(ol);
  });
})();

let selected = null;
let highlight = () => {};
function select(id){
  selected = id;
  PARTS.forEach(p => {
    const on = p.id === id, b = rowEls[p.id];
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.querySelector('.desc').hidden = !on;
  });
  highlight();
}

/* ---------- WebGL ---------- */
function fail(msg){
  canvas.hidden = true; $('#hint').hidden = true;
  const d = document.createElement('div'); d.className = 'fallback'; d.textContent = msg; vp.appendChild(d);
}
if (typeof THREE === 'undefined'){ fail('Não foi possível carregar a biblioteca 3D. A sequência de montagem e a ficha técnica ao lado continuam disponíveis.'); return; }
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true}); }
catch(e){ fail('Este navegador não liberou WebGL, então o modelo 3D não pode ser desenhado aqui.'); return; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
const V3 = THREE.Vector3;
const col = hex => new THREE.Color(hex).convertSRGBToLinear();
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const hemi = new THREE.HemisphereLight(0xffffff, 0xb8a58c, 0.52); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3df, 0.72);
sun.position.set(-7, 11, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left:-9, right:9, top:9, bottom:-9, near:1, far:40});
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun);

const groundMat = new THREE.MeshStandardMaterial({roughness:1, metalness:0});
const GX = 6, GZ = 4.5;        // meio-lote: 12 × 9 m
const ground = new THREE.Mesh(new THREE.BoxGeometry(GX*2, 0.3, GZ*2), groundMat);
ground.position.y = -0.15; ground.receiveShadow = true; scene.add(ground);
const gpts = [];
for (let x = -GX; x <= GX + 1e-6; x += 1) gpts.push(new THREE.Vector3(x, 0.004, -GZ), new THREE.Vector3(x, 0.004, GZ));
for (let z = -GZ; z <= GZ + 1e-6; z += 1) gpts.push(new THREE.Vector3(-GX, 0.004, z), new THREE.Vector3(GX, 0.004, z));
const grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gpts), new THREE.LineBasicMaterial({transparent:true, opacity:0.3}));
scene.add(grid);

/* ---------- medidas (m) ---------- */
const L = 6, W = 3;            // planta
const HP = 0.50;               // pilotis acima do solo
const BEAM = 0.10, FLOOR = 0.10;
const FT = HP + BEAM + FLOOR;  // topo do piso
const HE = 1.90, HR = 2.45;    // parede no beiral e na cumeeira
const RAIL = 1.76;             // travessa: topo de porta e janelas
const SILL = 1.14;
const TC = 0.022, TF = 0.045, TW = TC + TF; // tábua, sarrafo, parede
const ANG = Math.atan((HR - HE) / (L/2)), CA = Math.cos(ANG), SA = Math.sin(ANG);
const Hx = x => HE + (HR - HE) * (1 - Math.abs(x - L/2) / (L/2));

const house = new THREE.Group(); house.position.set(-L/2, 0, -W/2); scene.add(house);
const pieces = [];
const mats = {};
function mat(id, opts){ const m = new THREE.MeshStandardMaterial(opts); (mats[id] = mats[id] || []).push(m); return m; }
function piece(id, ex){
  const g = new THREE.Group();
  g.userData = {part:id, step:PART[id].step, ex:new V3(ex[0], ex[1], ex[2])};
  house.add(g); pieces.push(g); return g;
}
function addMesh(g, geo, m){ const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; }
function box(g, m, sx, sy, sz, x, y, z, rz){
  const me = addMesh(g, new THREE.BoxGeometry(sx, sy, sz), m);
  me.position.set(x, y, z); if (rz) me.rotation.z = rz; return me;
}

/* ---------- textura de tábuas de pinus ---------- */
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function planks(vertical, n, seed){
  const S = 512, r = rng(seed);
  const c = document.createElement('canvas'), b = document.createElement('canvas');
  c.width = c.height = b.width = b.height = S;
  const g = c.getContext('2d'), gb = b.getContext('2d');
  if (vertical){ [g, gb].forEach(x => { x.translate(S, 0); x.rotate(Math.PI/2); }); }
  const h = S / n;
  gb.fillStyle = '#808080'; gb.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++){
    const y0 = i * h;
    g.fillStyle = 'hsl(' + (36 + r()*6) + ',' + (46 + r()*10) + '%,' + (66 + r()*7) + '%)';
    g.fillRect(0, y0, S, h);
    for (let k = 0; k < 16; k++){
      const yy = y0 + 3 + r() * (h - 6), amp = r() * 2.5, ph = r() * 6.28, f = 0.008 + r() * 0.012;
      g.strokeStyle = 'rgba(128,84,30,' + (0.07 + r() * 0.13) + ')'; g.lineWidth = 0.6 + r() * 1.2;
      g.beginPath();
      for (let x = 0; x <= S; x += 16){ const y = yy + Math.sin(x * f + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    if (r() < 0.6){
      const kx = 30 + r() * (S - 60), ky = y0 + h * (0.3 + r() * 0.4), kr = 3 + r() * 5;
      g.fillStyle = 'rgba(105,64,22,.55)'; g.beginPath(); g.ellipse(kx, ky, kr * 1.7, kr, 0, 0, 6.3); g.fill();
      g.strokeStyle = 'rgba(105,64,22,.25)'; g.lineWidth = 1; g.beginPath(); g.ellipse(kx, ky, kr * 3.2, kr * 1.9, 0, 0, 6.3); g.stroke();
    }
    if (vertical){            // tábua com mata-junta
      const w = h * 0.16;
      g.fillStyle = 'hsl(38,50%,72%)'; g.fillRect(0, y0 - w/2, S, w); g.fillRect(0, y0 + h - w/2, S, w);
      g.fillStyle = 'rgba(70,45,15,.5)'; g.fillRect(0, y0 + w/2, S, 1.5); g.fillRect(0, y0 + h - w/2 - 1.5, S, 1.5);
      gb.fillStyle = '#ffffff'; gb.fillRect(0, y0 - w/2, S, w); gb.fillRect(0, y0 + h - w/2, S, w);
    } else {                   // tábua sobreposta
      g.fillStyle = 'rgba(60,38,12,.6)'; g.fillRect(0, y0 + h - 2, S, 2);
      g.fillStyle = 'rgba(255,240,205,.35)'; g.fillRect(0, y0, S, 1.5);
      const gr = gb.createLinearGradient(0, y0, 0, y0 + h);
      gr.addColorStop(0, '#5a5a5a'); gr.addColorStop(1, '#ffffff');
      gb.fillStyle = gr; gb.fillRect(0, y0, S, h);
      gb.fillStyle = '#000000'; gb.fillRect(0, y0 + h - 2, S, 2);
    }
  }
  const mk = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1/1.2, 1/1.2); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  return {map:mk(c, true), bump:mk(b, false)};
}
const TEX = {h:planks(false, 8, 7), v:planks(true, 10, 11)};
function texClone(t, rx, ry){ const k = t.clone(); k.repeat.set(rx, ry); k.needsUpdate = true; return k; }

const cladMats = [];
function cladMat(id){ const m = mat(id, {map:TEX.h.map, bumpMap:TEX.h.bump, bumpScale:0.012, roughness:0.85, metalness:0}); cladMats.push(m); return m; }
const frameMat = id => mat(id, {color:col('#dcbb7e'), roughness:0.9, metalness:0});

/* ---------- 1. pilotis ---------- */
(function(){
  const g = piece('pilotis', [0,0,0]);
  const m = mat('pilotis', {color:col('#a47f52'), roughness:0.95});
  const bury = 0.6;
  [0.43, 2.143, 3.857, 5.57].forEach(x => [0.07, 1.5, 2.93].forEach(z => {
    const me = addMesh(g, new THREE.CylinderGeometry(0.06, 0.065, HP + bury, 14), m);
    me.position.set(x, (HP - bury)/2, z);
  }));
})();

/* ---------- 2. vigas mestras ---------- */
(function(){
  const m = mat('vigas', {color:col('#cfa868'), roughness:0.9});
  [0.07, 1.5, 2.93].forEach(z => { const g = piece('vigas', [0, 0.45, 0]); box(g, m, L, BEAM, 0.075, L/2, HP + BEAM/2, z); });
})();

/* ---------- 3. painéis de piso ---------- */
(function(){
  const top = mat('piso', {map:texClone(TEX.h.map, 1, 2.5), bumpMap:texClone(TEX.h.bump, 1, 2.5), bumpScale:0.004, roughness:0.8});
  const jm = frameMat('piso');
  const bt = 0.022, jh = FLOOR - bt;
  for (let i = 0; i < 5; i++){
    const g = piece('piso', [(i - 2) * 0.24, 0.95, 0]);
    const x0 = i * 1.2;
    box(g, top, 1.2 - 0.006, bt, W - 0.006, x0 + 0.6, FT - bt/2, W/2);
    [0.0255, 0.6, 1.1745].forEach(dx => box(g, jm, 0.045, jh, W - 0.006, x0 + dx, FT - bt - jh/2, W/2));
  }
})();

/* ---------- 4. paredes ---------- */
const openings = [];
function leafMat(w, h){
  return mat('aberturas', {map:texClone(TEX.v.map, w/1.2, h/1.2), bumpMap:texClone(TEX.v.bump, w/1.2, h/1.2), bumpScale:0.01, roughness:0.85});
}
const battenMat = frameMat('aberturas');
function leaf(ex, w, h, pos, closed, open, zSign){
  const g = piece('aberturas', ex);
  const p = new THREE.Group(); p.position.set(pos[0], pos[1], pos[2]); p.rotation.y = closed; g.add(p);
  const t = 0.022;
  const m = addMesh(p, new THREE.BoxGeometry(w - 0.012, h - 0.012, t), leafMat(w, h));
  m.position.set(w/2, h/2, zSign * t/2);
  [0.16, 0.84].forEach(f => { const b = addMesh(p, new THREE.BoxGeometry(w - 0.06, 0.07, 0.02), battenMat); b.position.set(w/2, h * f, zSign * (t + 0.01)); });
  openings.push({p, closed, open});
}

function longPanel(id, x0, x1, front, ops, studs, ex){
  const g = piece(id, ex), e = 0.003, a = x0 + e, b = x1 - e;
  const door = ops.find(o => o.door), wins = ops.filter(o => !o.door);
  const s = new THREE.Shape();
  s.moveTo(a, 0);
  if (door){ s.lineTo(door.x0, 0); s.lineTo(door.x0, RAIL); s.lineTo(door.x1, RAIL); s.lineTo(door.x1, 0); }
  s.lineTo(b, 0); s.lineTo(b, Hx(b));
  if (a < L/2 && b > L/2) s.lineTo(L/2, HR);
  s.lineTo(a, Hx(a)); s.closePath();
  wins.forEach(w => { const h = new THREE.Path(); h.moveTo(w.x0, SILL); h.lineTo(w.x0, RAIL); h.lineTo(w.x1, RAIL); h.lineTo(w.x1, SILL); h.closePath(); s.holes.push(h); });
  const me = addMesh(g, new THREE.ExtrudeGeometry(s, {depth:TC, bevelEnabled:false}), cladMat(id));
  me.position.set(0, FT, front ? W - TC : 0);

  const fm = frameMat(id), zf = front ? W - TC - TF/2 : TC + TF/2;
  // sarrafo inferior, interrompido na porta
  const segs = door ? [[a, door.x0], [door.x1, b]] : [[a, b]];
  segs.forEach(q => { if (q[1] - q[0] > 0.02) box(g, fm, q[1] - q[0], TF, TF, (q[0] + q[1])/2, FT + TF/2, zf); });
  // montantes
  studs.forEach(x => {
    const top = Math.min(Hx(x - TF/2), Hx(x + TF/2)) - TF / CA - 0.004;
    box(g, fm, TF, top - TF, TF, x, FT + TF + (top - TF)/2, zf);
  });
  // travessas na altura de 1,76 m
  for (let i = 0; i < studs.length - 1; i++){
    const l = studs[i] + TF/2, r = studs[i+1] - TF/2;
    box(g, fm, r - l, TF, TF, (l + r)/2, FT + RAIL + TF/2, zf);
    wins.forEach(w => { if (w.x0 >= l - 0.01 && w.x1 <= r + 0.01){
      box(g, fm, r - l, TF, TF, (l + r)/2, FT + SILL - TF/2, zf);
      box(g, fm, r - l, TF, TF, (l + r)/2, FT + SILL/2, zf);
    }});
  }
  // sarrafo superior inclinado
  const tops = (a < L/2 && b > L/2) ? [[a, L/2], [L/2, b]] : [[a, b]];
  tops.forEach(q => {
    const mx = (q[0] + q[1])/2, up = mx < L/2 ? 1 : -1;
    const len = (q[1] - q[0]) / CA;
    box(g, fm, len, TF, TF, mx + up * SA * TF/2, FT + Hx(mx) - CA * TF/2, zf, up * ANG);
  });
  return g;
}

const DOOR = {door:true, x0:3.65, x1:4.43};
const WIN_F = {x0:4.80, x1:5.57};
const WIN_B = {x0:0.82, x1:1.58};
// fachada (z = 3): diagonal lisa, capela, diagonal com porta e janela
longPanel('diagonal', 0, 2.4, true, [], [0.0255, 0.8, 1.6, 2.3745], [-0.45, 1.5, 1.3]);
longPanel('capela', 2.4, 3.6, true, [], [2.4255, 3.0, 3.5745], [0, 1.9, 1.3]);
longPanel('diagonal', 3.6, 6, true, [DOOR, WIN_F], [3.6255, 4.4555, 4.7745, 5.5955, 5.9745], [0.45, 1.5, 1.3]);
// fundos (z = 0): diagonal com janela, capela, diagonal lisa
longPanel('diagonal', 0, 2.4, false, [WIN_B], [0.0255, 0.7945, 1.6055, 2.3745], [-0.45, 1.5, -1.3]);
longPanel('capela', 2.4, 3.6, false, [], [2.4255, 3.0, 3.5745], [0, 1.9, -1.3]);
longPanel('diagonal', 3.6, 6, false, [], [3.6255, 4.4, 5.2, 5.9745], [0.45, 1.5, -1.3]);

const WIN_Q = {z0:1.5225, z1:2.2275};
function quadPanel(left, win, ex){
  const g = piece('quadrado', ex), e = 0.003, a = TW + e, b = W - TW - e;
  const s = new THREE.Shape();
  s.moveTo(a, 0); s.lineTo(b, 0); s.lineTo(b, HE); s.lineTo(a, HE); s.closePath();
  if (win){ const h = new THREE.Path(); h.moveTo(win.z0, SILL); h.lineTo(win.z0, RAIL); h.lineTo(win.z1, RAIL); h.lineTo(win.z1, SILL); h.closePath(); s.holes.push(h); }
  const geo = new THREE.ExtrudeGeometry(s, {depth:TC, bevelEnabled:false}); geo.rotateY(-Math.PI/2);
  const me = addMesh(g, geo, cladMat('quadrado')); me.position.set(left ? TC : L, FT, 0);
  const fm = frameMat('quadrado'), xf = left ? TC + TF/2 : L - TC - TF/2;
  box(g, fm, TF, TF, b - a, xf, FT + TF/2, W/2);
  box(g, fm, TF, TF, b - a, xf, FT + HE - TF/2, W/2);
  const studs = [a + TF/2, 0.75, 1.5, 2.25, b - TF/2];
  studs.forEach(z => box(g, fm, TF, HE - 2*TF, TF, xf, FT + HE/2, z));
  if (win){
    const l = 1.5 + TF/2, r = 2.25 - TF/2;
    [RAIL + TF/2, SILL - TF/2, SILL/2].forEach(y => box(g, fm, TF, TF, r - l, xf, FT + y, (l + r)/2));
  }
}
quadPanel(true, WIN_Q, [-1.3, 1.5, 0]);
quadPanel(false, null, [1.3, 1.5, 0]);

/* ---------- 5 e 6. telhado ---------- */
const LS = (L/2) / CA, OV = 0.25 / CA, SIDE = 0.10, RW = W + 2*SIDE;
function water(side){
  const g = new THREE.Group(), m = new THREE.Matrix4();
  if (side < 0){ m.makeBasis(new V3(0,0,1), new V3(CA,SA,0), new V3(-SA,CA,0)); m.setPosition(0, FT + HE, W/2); }
  else { m.makeBasis(new V3(0,0,-1), new V3(-CA,SA,0), new V3(SA,CA,0)); m.setPosition(L, FT + HE, W/2); }
  g.applyMatrix4(m); return g;
}
(function(){
  const g = piece('estrutura', [0, 3.1, 0]);
  const m = mat('estrutura', {color:col('#c9a05c'), roughness:0.9});
  box(g, m, 0.05, 0.10, W - 2*TW - 0.004, L/2, FT + HR - 0.065, W/2);       // cumeeira
  [-1, 1].forEach(sd => {
    const w = water(sd); g.add(w);
    const y0 = (TW + 0.012) / CA, y1 = LS - 0.032 / CA;
    [-0.75, 0, 0.75].forEach(lx => box(w, m, 0.045, y1 - y0, 0.07, lx, (y0 + y1)/2, -0.036)); // caibros
    [0.08, 0.80, 1.52, 2.24, 2.94].forEach(ly => box(w, m, RW, 0.045, 0.04, 0, ly, 0.02));     // ripas
  });
})();
(function(){
  const m = mat('manta', {color:col('#d9dee0'), roughness:0.35, metalness:0.2, side:THREE.DoubleSide});
  [-1, 1].forEach(sd => { const g = piece('manta', [sd * 0.35, 3.8, 0]); const w = water(sd); g.add(w); box(w, m, RW - 0.02, LS + OV, 0.005, 0, (LS - OV)/2, 0.043).castShadow = false; });
})();
(function(){
  const pitch = 0.078, amp = 0.009, sw = pitch * 11, stepW = pitch * 10;
  const len = LS + OV + 0.011;
  const m = mat('telhas', {color:col('#c3c9cb'), roughness:0.42, metalness:0.3, side:THREE.DoubleSide});
  const geo = new THREE.PlaneGeometry(sw, len, 88, 1), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, amp * Math.cos(2 * Math.PI * (pos.getX(i) + sw/2) / pitch));
  geo.computeVertexNormals();
  [-1, 1].forEach(sd => { for (let i = 0; i < 4; i++){
    const g = piece('telhas', [sd * 0.75, 4.5, -sd * (i - 1.5) * 0.32]);
    const w = water(sd); g.add(w);
    const me = addMesh(w, geo, m); me.receiveShadow = false;
    me.position.set(-RW/2 + sw/2 + i * stepW, (LS + 0.011 - OV)/2, 0.057 + (i % 2) * 0.003);
  }});
})();
(function(){
  /* pregos de telha: fixam as telhas (e ripas) nos caibros, no cruzamento de cada caibro com cada ripa */
  const m = mat('telhas', {color:col('#6b7075'), roughness:0.5, metalness:0.72});
  const headGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.006, 10); // cabeça com arruela de vedação
  const shankGeo = new THREE.CylinderGeometry(0.004, 0.003, 0.095, 8);  // haste que desce até o caibro
  const caibroX = [-0.75, 0, 0.75], ripaY = [0.08, 0.80, 1.52, 2.24, 2.94];
  [-1, 1].forEach(sd => {
    const g = piece('telhas', [sd * 0.75, 4.6, 0]);
    const w = water(sd); g.add(w);
    caibroX.forEach(x => ripaY.forEach(y => {
      const head = addMesh(w, headGeo, m); head.rotation.x = Math.PI / 2; head.position.set(x, y, 0.072);
      const shank = addMesh(w, shankGeo, m); shank.rotation.x = Math.PI / 2; shank.position.set(x, y, 0.025);
    }));
  });
})();

/* ---------- 7. porta e janelas ---------- */
const OPEN = 1.25;
leaf([0.45, 1.5, 1.95], DOOR.x1 - DOOR.x0, RAIL, [DOOR.x0, FT, W], 0, -OPEN, 1);
leaf([0.45, 1.5, 1.95], WIN_F.x1 - WIN_F.x0, RAIL - SILL, [WIN_F.x0, FT + SILL, W], 0, -1.9, 1);
leaf([-0.45, 1.5, -1.95], WIN_B.x1 - WIN_B.x0, RAIL - SILL, [WIN_B.x0, FT + SILL, 0], 0, 1.9, -1);
leaf([-1.95, 1.5, 0], WIN_Q.z1 - WIN_Q.z0, RAIL - SILL, [0, FT + SILL, WIN_Q.z0], -Math.PI/2, -Math.PI/2 - 1.9, 1);

/* ---------- cotas ---------- */
const dims = new THREE.Group(); house.add(dims);
const dimMat = new THREE.LineBasicMaterial();
const labels = [];
function label(text, x, y, z){
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 80;
  const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:false, transparent:true, sizeAttenuation:false}));
  sp.scale.set(0.112, 0.035, 1); sp.position.set(x, y, z); sp.renderOrder = 10; dims.add(sp);
  labels.push({cv, tex, text});
}
function drawLabels(){
  const bg = css('--panel'), fg = css('--ink'), ln = css('--line');
  labels.forEach(l => { const g = l.cv.getContext('2d'); g.clearRect(0, 0, 256, 80);
    g.fillStyle = bg; g.strokeStyle = ln; g.lineWidth = 3; g.beginPath(); g.rect(6, 8, 244, 64); g.fill(); g.stroke();
    g.fillStyle = fg; g.font = '500 38px "IBM Plex Mono", ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(l.text, 128, 42); l.tex.needsUpdate = true; });
}
function dim(a, b, tick, text, off){
  const pts = [a, b, a.clone().add(tick), a.clone().sub(tick), b.clone().add(tick), b.clone().sub(tick)];
  dims.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), dimMat));
  const mid = a.clone().add(b).multiplyScalar(0.5).add(off || new V3());
  label(text, mid.x, mid.y, mid.z);
}
dim(new V3(0, 0.02, W + 0.75), new V3(L, 0.02, W + 0.75), new V3(0, 0, 0.12), '6,00 m', new V3(0, 0.2, 0));
dim(new V3(-0.75, 0.02, 0), new V3(-0.75, 0.02, W), new V3(0.12, 0, 0), '3,00 m', new V3(0, 0.2, 0));
dim(new V3(-0.3, FT, W + 0.3), new V3(-0.3, FT + HE, W + 0.3), new V3(0.1, 0, 0), '1,90 m', new V3(-0.45, 0, 0.1));
dim(new V3(L/2, FT, W + 0.45), new V3(L/2, FT + HR, W + 0.45), new V3(0.1, 0, 0), '2,45 m', new V3(0, 1.42, 0));
dim(new V3(L + 0.35, 0, W + 0.1), new V3(L + 0.35, HP, W + 0.1), new V3(0.1, 0, 0), '0,50 m', new V3(0.55, 0, 0));

/* ---------- câmera e órbita ---------- */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cur = {th:0, ph:1, r:14, t:new V3(0, 1.35, 0)}, goal = {th:0, ph:1, r:14, t:new V3(0, 1.35, 0)};
let dirty = true, viewR = 11.6, explodeT = 0;
const VIEWS = {
  persp:{th:-0.76, ph:1.12, r:11.6},
  front:{th:0, ph:1.46, r:10.2},
  side:{th:-Math.PI/2, ph:1.46, r:8.2},
  back:{th:Math.PI - 0.6, ph:1.15, r:11.6},
  top:{th:0, ph:0.06, r:11.5}
};
function fit(r){ const a = camera.aspect; return a < 1.3 ? r * Math.min(2.4, 1.3 / a) : r; }
function setView(name, instant){
  const v = VIEWS[name];
  // caminho angular mais curto
  let d = v.th - goal.th; d = Math.atan2(Math.sin(d), Math.cos(d));
  goal.th += d; goal.ph = v.ph; viewR = v.r; applyZoom();
  document.querySelectorAll('.views button').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === name ? 'true' : 'false'));
  if (instant || reduce){ cur.th = goal.th; cur.ph = goal.ph; cur.r = goal.r; cur.t.copy(goal.t); }
  dirty = true;
}
function applyZoom(){ goal.r = fit(viewR) * (1 + 0.75 * explodeT); goal.t.set(0, 1.35 + 1.9 * explodeT, 0); }
function clearView(){ document.querySelectorAll('.views button').forEach(b => b.setAttribute('aria-pressed', 'false')); }
function clamp(){
  goal.ph = Math.min(1.53, Math.max(0.05, goal.ph));
  goal.r = Math.min(40, Math.max(2.5, goal.r));
  goal.t.x = Math.min(6, Math.max(-6, goal.t.x)); goal.t.z = Math.min(6, Math.max(-6, goal.t.z)); goal.t.y = Math.min(8, Math.max(0, goal.t.y));
}
function placeCamera(){
  const s = Math.sin(cur.ph);
  camera.position.set(cur.t.x + cur.r * s * Math.sin(cur.th), cur.t.y + cur.r * Math.cos(cur.ph), cur.t.z + cur.r * s * Math.cos(cur.th));
  camera.lookAt(cur.t);
}
function pan(dx, dy){
  const k = goal.r * 0.0016, right = new V3().setFromMatrixColumn(camera.matrixWorld, 0), up = new V3().setFromMatrixColumn(camera.matrixWorld, 1);
  goal.t.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
}

const ptrs = new Map(); let moved = 0, pinch = 0, lastMid = null;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); moved = 0; pinch = 0; lastMid = null; tagEl.hidden = true; });
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId);
  if (!p){ if (e.pointerType === 'mouse') hover(e); return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  moved += Math.abs(dx) + Math.abs(dy);
  if (ptrs.size === 1){
    if (e.shiftKey || e.buttons === 2) pan(dx, dy);
    else { goal.th -= dx * 0.006; goal.ph -= dy * 0.006; }
  } else if (ptrs.size === 2){
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mid = {x:(a.x + b.x)/2, y:(a.y + b.y)/2};
    if (pinch) goal.r *= pinch / d;
    if (lastMid) pan(mid.x - lastMid.x, mid.y - lastMid.y);
    pinch = d; lastMid = mid;
  }
  if (moved > 4) clearView();
  clamp(); dirty = true;
});
function up(e){
  if (ptrs.has(e.pointerId) && ptrs.size === 1 && moved < 5){ const id = pick(e); select(id && id === selected ? null : id); }
  ptrs.delete(e.pointerId); pinch = 0; lastMid = null;
}
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); pinch = 0; lastMid = null; });
canvas.addEventListener('pointerleave', () => { tagEl.hidden = true; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => { e.preventDefault(); goal.r *= Math.exp(e.deltaY * 0.0012); clearView(); clamp(); dirty = true; }, {passive:false});
canvas.addEventListener('keydown', e => {
  const k = e.key; let hit = true;
  if (k === 'ArrowLeft') goal.th -= 0.12; else if (k === 'ArrowRight') goal.th += 0.12;
  else if (k === 'ArrowUp') goal.ph -= 0.08; else if (k === 'ArrowDown') goal.ph += 0.08;
  else if (k === '+' || k === '=') goal.r *= 0.9; else if (k === '-') goal.r *= 1.1; else hit = false;
  if (hit){ e.preventDefault(); clearView(); clamp(); dirty = true; }
});

/* ---------- seleção ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e){
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(pieces.filter(p => p.visible), true);
  if (!hits.length) return null;
  let o = hits[0].object; while (o && !(o.userData && o.userData.part)) o = o.parent;
  return o ? o.userData.part : null;
}
let hoverT = 0;
function hover(e){
  const now = performance.now(); if (now - hoverT < 40) return; hoverT = now;
  const id = pick(e);
  if (!id){ tagEl.hidden = true; return; }
  const r = vp.getBoundingClientRect();
  tagEl.textContent = PART[id].name; tagEl.hidden = false;
  tagEl.style.left = Math.min(e.clientX - r.left, r.width - 190) + 'px'; tagEl.style.top = (e.clientY - r.top) + 'px';
}
let accent = col('#0f62b8');
highlight = function(){
  Object.keys(mats).forEach(id => mats[id].forEach(m => { m.emissive.copy(accent); m.emissiveIntensity = id === selected ? 0.42 : 0; }));
  dirty = true;
};

/* ---------- controles ---------- */
const stepIn = $('#step'), stepOut = $('#stepOut'), exIn = $('#explode'), exOut = $('#explodeOut');
function applyStep(){
  const s = +stepIn.value;
  pieces.forEach(p => { p.visible = p.userData.step <= s; });
  stepOut.textContent = s + ' de 7 · ' + STEPS[s - 1];
  PARTS.forEach(p => rowEls[p.id].classList.toggle('pending', p.step > s));
  dirty = true;
}
function applyExplode(){
  explodeT = +exIn.value / 100;
  pieces.forEach(p => p.position.copy(p.userData.ex).multiplyScalar(explodeT));
  exOut.textContent = explodeT === 0 ? 'montada' : Math.round(explodeT * 100) + '%';
  dims.visible = $('#cotas').checked && explodeT === 0;
  applyZoom(); dirty = true;
}
function applyOpen(){ const o = $('#abertas').checked; openings.forEach(x => { x.p.rotation.y = o ? x.open : x.closed; }); dirty = true; }
function applyBoards(){
  const t = $('#tabV').checked ? TEX.v : TEX.h;
  cladMats.forEach(m => { m.map = t.map; m.bumpMap = t.bump; m.needsUpdate = true; }); dirty = true;
}
stepIn.addEventListener('input', applyStep);
exIn.addEventListener('input', applyExplode);
$('#cotas').addEventListener('change', applyExplode);
$('#abertas').addEventListener('change', applyOpen);
$('#tabH').addEventListener('change', applyBoards);
$('#tabV').addEventListener('change', applyBoards);
document.querySelectorAll('.views button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

/* ---------- tema ---------- */
function applyTheme(){
  scene.background = new THREE.Color(css('--scene') || '#dbe6e8');
  groundMat.color.copy(col(css('--ground') || '#b79f85'));
  grid.material.color.set(css('--grid') || '#9a8670');
  dimMat.color.set(css('--ink') || '#18272b');
  accent = col(css('--lona') || '#0f62b8');
  drawLabels(); highlight();
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawLabels(); dirty = true; });

/* ---------- laço ---------- */
function resize(){
  const w = vp.clientWidth, h = vp.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  applyZoom(); cur.r = goal.r; dirty = true;
}
new ResizeObserver(resize).observe(vp);
function frame(){
  requestAnimationFrame(frame);
  const k = reduce ? 1 : 0.2;
  const d = Math.abs(goal.th - cur.th) + Math.abs(goal.ph - cur.ph) + Math.abs(goal.r - cur.r) / 10 + cur.t.distanceTo(goal.t);
  if (d > 0.0004){ cur.th += (goal.th - cur.th) * k; cur.ph += (goal.ph - cur.ph) * k; cur.r += (goal.r - cur.r) * k; cur.t.lerp(goal.t, k); dirty = true; }
  if (!dirty) return;
  dirty = false; placeCamera(); renderer.render(scene, camera);
}
resize(); applyTheme(); applyStep(); applyExplode(); applyOpen();
setView('persp', true);
if (window.matchMedia('(pointer: coarse)').matches) $('#hint').textContent = 'Arraste para girar · pinça para aproximar · toque numa peça';
frame();
})();
