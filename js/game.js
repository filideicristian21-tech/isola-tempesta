import * as THREE from 'three';
import * as GX from './gfx.js';
(async () => {
'use strict';
const isTouch = (navigator.maxTouchPoints || 0) > 0 || matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', isTouch);
if (isTouch) document.getElementById('deskKeys').style.display = 'none';
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const R = Math.random;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (arr, rng = R) => arr[(rng() * arr.length) | 0];
function pickW(arr, w, rng = R) { let s = 0; for (const x of w) s += x; let r = rng() * s; for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1]; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function angLerp(a, b, t) { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; }
const store = {
  get(k, d) { try { const v = localStorage.getItem('isolaT_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('isolaT_' + k, JSON.stringify(v)); } catch (e) { } }
};
function makeNoise(seed) {
  const hash = (ix, iz) => { const h = Math.sin(ix * 127.1 + iz * 311.7 + seed * 74.7) * 43758.5453; return h - Math.floor(h); };
  const n = (x, z) => {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  };
  const fbm = (x, z, o = 4) => { let s = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < o; i++) { s += a * n(x * f, z * f); t += a; a *= 0.5; f *= 2.03; } return s / t; };
  return { n, fbm };
}

// ================= DATA =================
const MAPS = [
  { id: 'scoglio', name: 'Scoglio Corallo', tag: 'Piccola', size: 380, bots: 14, seed: 11, villages: 2, houses: 10, trees: 170, rocks: 45, hill: 6, mountain: 0, islands: 'single', treeKinds: ['palm', 'round'],
    grass: [0x5f6a2e, 0x4a5426], dry: 0x8f6430, sand: 0xc9b48a, seabed: 0x7c7058, timeK: 0.62, snow: 0, sky: [0x231848, 0x9a5c6c] },
  { id: 'baia', name: 'Baia Smeraldo', tag: 'Media', size: 680, bots: 29, seed: 27, villages: 4, houses: 26, trees: 460, rocks: 100, hill: 15, mountain: 0, islands: 'single', treeKinds: ['round', 'pine', 'round'],
    grass: [0x56662c, 0x434e24], dry: 0x8a5e2c, sand: 0xc4b088, seabed: 0x786c55, timeK: 0.9, snow: 0, sky: [0x1e1644, 0x925468] },
  { id: 'arcipelago', name: 'Arcipelago Tuono', tag: 'Grande', size: 1050, bots: 49, seed: 53, villages: 6, houses: 44, trees: 760, rocks: 170, hill: 11, mountain: 0, islands: 'multi', treeKinds: ['palm', 'round', 'pine'],
    grass: [0x5a6a30, 0x465428], dry: 0x93662e, sand: 0xc8b48a, seabed: 0x7e7259, timeK: 1.15, snow: 0, sky: [0x1a1a4a, 0x8a5470] },
  { id: 'continente', name: 'Terre Selvagge', tag: 'Enorme', size: 1500, bots: 69, seed: 91, villages: 9, houses: 72, trees: 1250, rocks: 300, hill: 18, mountain: 56, islands: 'single', treeKinds: ['pine', 'pine', 'round'],
    grass: [0x4e5e30, 0x3c4a26], dry: 0x7e5a30, sand: 0xbcab84, seabed: 0x746a54, timeK: 1.45, snow: 44, sky: [0x15183a, 0x7a5a78] },
];
const WEAPONS = {
  piccone: { name: 'Piccone', rate: 0.42, mag: 0 },
  pistola: { name: 'Pistola', dmg: 24, rate: 0.22, mag: 12, reload: 1.2, spread: 0.012, range: 110, head: 1.75, ideal: 18, acc: 1.0 },
  mitra: { name: 'Mitraglietta', dmg: 15, rate: 0.075, mag: 30, reload: 1.8, spread: 0.034, range: 70, head: 1.5, ideal: 13, acc: 0.85 },
  assalto: { name: "Fucile d'assalto", dmg: 30, rate: 0.15, mag: 30, reload: 2.1, spread: 0.02, range: 170, head: 1.6, ideal: 30, acc: 1.0 },
  pompa: { name: 'Fucile a pompa', dmg: 11, rate: 0.95, mag: 5, reload: 2.6, spread: 0.08, range: 38, head: 1.5, ideal: 7, acc: 1.1, pellets: 9 },
  cecchino: { name: 'Cecchino', dmg: 100, rate: 1.6, mag: 1, reload: 2.3, spread: 0.05, range: 420, head: 2.5, ideal: 70, acc: 0.5, scope: true },
};
const KINDS = ['pistola', 'mitra', 'assalto', 'pompa', 'cecchino'];
const KIND_W = [26, 22, 25, 18, 9];
const RAR = [ // Halloween rarity tiers (own palette)
  { name: 'Cenere', css: '#d8c9b0', hex: 0xb0a088, m: 1.0 },
  { name: 'Brina', css: '#7fe0f0', hex: 0x4fb8c8, m: 1.08 },
  { name: 'Ambra', css: '#ffc94a', hex: 0xd9a52a, m: 1.16 },
  { name: 'Zucca', css: '#ff6a2a', hex: 0xd9481a, m: 1.24 },
  { name: 'Spettrale', css: '#ff4fb8', hex: 0xd0308f, m: 1.33 }
];
function rollRarity(rng = R, bonus = 0) { const r = rng() * 100; let t = r < 40 ? 0 : r < 70 ? 1 : r < 88 ? 2 : r < 97 ? 3 : 4; if (bonus && rng() < 0.45) t = Math.min(4, t + 1); return t; }
const SKIN_TONES = [0xf2d0b6, 0xe6b894, 0xd29e76, 0xb27a52, 0x8a5a3c, 0x5d3b27];
const HAIR_COLS = [0x16110e, 0x2f2016, 0x4e331f, 0x8a6235, 0x6e2f16, 0x8f8a84];
const IRIS_COLS = [0x3b2a1c, 0x2d5674, 0x3d6438, 0x5a4626, 0x252020];
// Outfits: realistic clothing sets (original designs)
const LOOKS = [
  { name: 'Ranger', top: 0x55603a, top2: 0x3a4128, camo: [0x4b5a32, 0x6e6c48, 0x2f3524, 0x5a4a32], pants: 0x6e6448, boots: 0x4a3423, sole: 0x1c1712, gloves: 0x26282a, hat: 'cap', hatCol: 0x4b5236, hair: 'short', pack: 0x3f4433, belt: 0x3a2e22, pockets: true, skin: 0xd29e76, hairCol: 0x2f2016 },
  { name: 'Corsara', top: 0x5e1a18, top2: 0x18181b, open: true, pants: 0x22314a, boots: 0x1c1a1a, sole: 0x101010, hair: 'long', belt: 0x111111, female: true, skin: 0xb27a52, hairCol: 0x16110e },
  { name: 'Pilota', top: 0xb8581e, top2: 0xd8d4cc, pants: 0xb8581e, boots: 0x2a2a2a, sole: 0x111111, gloves: 0x3a3a3a, hat: 'helmet', hatCol: 0xdedbd4, hair: 'short', vest: 0x40464c, belt: 0x2a2a2a, pockets: true, skin: 0xe6b894, hairCol: 0x4e331f },
  { name: 'Ombra', top: 0x1d1f24, top2: 0x2c2f36, pants: 0x1a1c20, boots: 0x121212, sole: 0x0a0a0a, gloves: 0x121212, hat: 'beanie', hatCol: 0x16171a, hair: 'buzz', vest: 0x2e3328, pads: true, belt: 0x111111, mask: true, skin: 0x8a5a3c, hairCol: 0x16110e },
  { name: 'Escursionista', top: 0xc99a1f, top2: 0x8f6d12, pants: 0x4a4f57, boots: 0x5a3b22, sole: 0x1c1712, hat: 'beanie', hatCol: 0x9a2f27, hair: 'ponytail', pack: 0x2f4a6a, belt: 0x2a2a2a, female: true, skin: 0xf2d0b6, hairCol: 0x8a6235 },
  { name: 'Polare', top: 0xd3d7dc, top2: 0x97a0aa, pants: 0x26324a, boots: 0x3a2f28, sole: 0x111111, gloves: 0x2b2b30, hat: 'hood', hatCol: 0xd3d7dc, fur: 0xbfae94, hair: 'short', belt: 0x26324a, skin: 0xe6b894, hairCol: 0x6e2f16 },
  { name: 'Pompiere', top: 0x7e6236, top2: 0xd8c845, stripes: true, pants: 0x6f5630, boots: 0x161616, sole: 0x0a0a0a, gloves: 0x3d3020, hat: 'fire', hatCol: 0xb08c1a, hair: 'short', beard: true, belt: 0x222222, skin: 0xd29e76, hairCol: 0x2f2016 },
  { name: 'Urbano', top: 0x6c7179, top2: 0x565a61, hoodie: true, pants: 0x34507a, boots: 0xe6e4e0, sole: 0xf4f4f4, hair: 'buzz', beard: true, skin: 0x5d3b27, hairCol: 0x16110e },
  { name: 'Sportiva', top: 0x2a6fb5, top2: 0xf2f2f2, short: true, pants: 0x1d1d22, boots: 0xf0f0f0, sole: 0xffffff, hair: 'ponytail', female: true, skin: 0xd29e76, hairCol: 0x16110e },
  { name: 'Soldato', top: 0x6b6a4a, camo: [0x7a7552, 0x5c5a3e, 0x8c8462, 0x4a4733], pants: 0x6b6a4a, pantsCamo: true, boots: 0x3a2c1e, sole: 0x161210, gloves: 0x3a3a2a, hat: 'helmet', hatCol: 0x5a5a40, vest: 0x5c5a3e, pack: 0x4a4733, pads: true, hair: 'buzz', belt: 0x3a3226, skin: 0xe6b894, hairCol: 0x4e331f },
  // ---- Halloween (monsters)
  { name: 'Testa di Zucca', monster: 'pumpkin', top: 0x8a1c18, top2: 0xe06a1a, glow: 0xffb030 },
  { name: 'Zombie', monster: 'zombie', top: 0x56677a, top2: 0x3e7a3a, skin: 0x8c9a76, hairCol: 0x2a2018, glow: 0xe8f070 },
  { name: 'Scheletro', monster: 'skeleton', top: 0x2a2228, top2: 0xd8ccb0, glow: 0xff3a20 },
  { name: 'Vampiro', monster: 'vampire', top: 0x141218, top2: 0x7a0a18, skin: 0xe2dde4, hairCol: 0x0c0a0c, glow: 0xff2030 },
  { name: 'Mummia', monster: 'mummy', top: 0xd8ccae, top2: 0x2f8a78, glow: 0x40ffd0 },
  { name: 'Lupo Mannaro', monster: 'wolf', top: 0x4e3e30, top2: 0x5a4a36, glow: 0xffc020 },
  { name: 'Strega', monster: 'witch', female: true, top: 0x24182e, top2: 0x5a2a7a, skin: 0x9fbe8a, hairCol: 0x0e0a0e, glow: 0x70ff60 },
  { name: 'Demone', monster: 'demon', top: 0x8e1f1a, top2: 0x2a0a0a, skin: 0x8e1f1a, glow: 0xffb020 },
];
const FIRST_MONSTER = LOOKS.findIndex(l => l.monster);
const NAMES = ['Falco', 'Brontolo', 'Pixel', 'Saetta', 'Tano', 'Gelato99', 'Capitano', 'Moka', 'Turbo', 'Zucca', 'Lampo', 'Biscotto', 'Rafano', 'Vortice', 'Tornado', 'Cactus', 'Gufo', 'Nebbia', 'Razzo', 'Spugna', 'Ferro', 'Bolla', 'Ciclone', 'Orso', 'Mirtillo', 'Pepe', 'Scintilla', 'Polpo', 'Zeta', 'Mamba', 'Riccio', 'Ombretta', 'Grizzly', 'Sasso', 'Fulmine', 'Volpe', 'Nuvola', 'Tigre', 'Kiwi', 'Draghetto', 'Panzer', 'Bruco', 'Cometa', 'Lupetto', 'Gnomo', 'Tartufo', 'Yeti', 'Ninja', 'Bomber', 'Frizzi'];
const VILLAGE_NAMES = ['Borgo Ventoso', 'Pineta Pigra', 'Porto Ruggine', 'Colle Lampo', 'Fattoria Fumante', 'Torri Tonde', 'Piazza Pirata', 'Valle Vespa', 'Rocca Ronzio', 'Spiaggia Sbadiglio', 'Mulino Matto', 'Cava Coraggio'];
const DIFF = {
  facile: { acc: 0.11, react: 1.2, detect: 45 },
  normale: { acc: 0.2, react: 0.8, detect: 60 },
  difficile: { acc: 0.32, react: 0.5, detect: 78 },
};
const GFX = {
  bassa: { pr: 1, shadow: 0, grass: 0, grassR: 0, segDiv: 7, bush: 0.4, fog: 300, shadowR: 0, hiDist: 22, bats: 14, embers: 40, wisps: 0 },
  media: { pr: 1.2, shadow: 1024, grass: 7000, blades: 5, grassR: 27, segDiv: 5.5, bush: 0.8, fog: 340, shadowR: 38, hiDist: 32, bats: 26, embers: 70, wisps: 22 },
  alta: { pr: 1.35, shadow: 2048, grass: 16000, blades: 6, grassR: 36, segDiv: 4.5, bush: 1.2, fog: 390, shadowR: 55, hiDist: 45, bats: 40, embers: 110, wisps: 38 },
};
const STORM = [
  { w: 50, s: 40, f: 0.55, d: 1 }, { w: 40, s: 35, f: 0.32, d: 2 }, { w: 34, s: 30, f: 0.17, d: 4 },
  { w: 28, s: 25, f: 0.08, d: 6 }, { w: 22, s: 20, f: 0.03, d: 8 }, { w: 14, s: 18, f: 0, d: 10 },
];
const GRAV = 24, STEP = 0.62, CELL = 16, GRACE = 14, BOT_RATE = 2.4;
const SUN = new THREE.Vector3(0.55, 0.36, 0.45).normalize();
const MOON = new THREE.Vector3(-0.55, 0.45, -0.5).normalize();

// ================= AUDIO =================
let AC = null, master = null, noiseBuf = null;
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.45; master.connect(AC.destination);
    const len = AC.sampleRate * 0.6; noiseBuf = AC.createBuffer(1, len, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
const SND = { pistola: [0.12, 2600, 0.5], mitra: [0.08, 3000, 0.35], assalto: [0.14, 2000, 0.5], pompa: [0.3, 1300, 0.8], cecchino: [0.5, 1600, 0.85], build: [0.14, 500, 0.7], swing: [0.1, 4500, 0.2], chop: [0.09, 900, 0.55], wallhit: [0.08, 700, 0.4] };
function sfx(name, vol = 1) {
  if (!AC || vol < 0.03) return;
  try {
    const t = AC.currentTime;
    if (SND[name]) {
      const [dur, freq, v] = SND[name];
      const src = AC.createBufferSource(); src.buffer = noiseBuf;
      const f = AC.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(freq * (0.5 + 0.5 * vol), t); f.frequency.exponentialRampToValueAtTime(180, t + dur);
      const g = AC.createGain(); g.gain.setValueAtTime(v * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 0.3); src.stop(t + dur + 0.02);
      return;
    }
    const tone = (fr, type, dur, v, delay = 0, slide) => {
      const o = AC.createOscillator(), g = AC.createGain(); o.type = type;
      o.frequency.setValueAtTime(fr, t + delay); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + delay + dur);
      g.gain.setValueAtTime(0.0001, t + delay); g.gain.linearRampToValueAtTime(v * vol, t + delay + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      o.connect(g); g.connect(master); o.start(t + delay); o.stop(t + delay + dur + 0.03);
    };
    switch (name) {
      case 'hit': tone(1100, 'square', 0.05, 0.1); break;
      case 'head': tone(1500, 'square', 0.05, 0.13); tone(2100, 'square', 0.06, 0.11, 0.05); break;
      case 'pick': tone(620, 'sine', 0.08, 0.25); tone(930, 'sine', 0.1, 0.25, 0.07); break;
      case 'chest': [523, 659, 784, 1046].forEach((f, i) => tone(f, 'triangle', 0.16, 0.2, i * 0.07)); break;
      case 'hurt': tone(170, 'sawtooth', 0.18, 0.22, 0, 70); break;
      case 'kill': tone(880, 'triangle', 0.12, 0.25); tone(1320, 'triangle', 0.22, 0.25, 0.1); break;
      case 'empty': tone(300, 'square', 0.04, 0.08); break;
      case 'reload': tone(420, 'square', 0.04, 0.09); tone(640, 'square', 0.04, 0.09, 0.14); break;
      case 'glide': tone(220, 'sine', 0.45, 0.15, 0, 520); break;
      case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 'triangle', 0.3, 0.25, i * 0.12)); break;
      case 'storm': tone(110, 'sawtooth', 0.9, 0.12, 0, 70); break;
      case 'heal': tone(500, 'sine', 0.2, 0.2, 0, 900); break;
      case 'click': tone(700, 'triangle', 0.05, 0.12); break;
      case 'airship': [196, 233, 277, 330].forEach((f, i) => tone(f, 'sawtooth', 1.4, 0.06, i * 0.05)); tone(98, 'triangle', 1.8, 0.15); break;
    }
  } catch (e) { }
}

// ================= RENDERER =================
let settings = { map: store.get('map', 1), outfit: store.get('outfit', 0), diff: store.get('diff', 'normale'), gfx: store.get('gfx', isTouch ? 'media' : 'alta') };
if (!MAPS[settings.map]) settings.map = 1;
if (!DIFF[settings.diff]) settings.diff = 'normale';
if (!GFX[settings.gfx]) settings.gfx = 'media';
settings.outfit = clamp(settings.outfit | 0, 0, LOOKS.length - 1);
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.type = THREE.PCFShadowMap;
const camera = new THREE.PerspectiveCamera(70, 1, 0.08, 1600);
let homeSun = null;
const fx = $('#fx'), fxc = fx.getContext('2d');
let fxW = 1, fxH = 1, fxD = 1;
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), M4 = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function mtx(x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) { _e.set(rx, ry, rz); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)); }
function chain(...ms) { const r = new THREE.Matrix4(); for (const m of ms) r.multiply(m); return r; }
function lin(hex) { _c.setHex(hex).convertSRGBToLinear(); return [_c.r, _c.g, _c.b]; }
function linC(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const ALL_MATS = [];
function reg(m) { ALL_MATS.push(m); return m; }
const smatCache = {};
function smat(hex, r = 0.8, m = 0) { const k = hex + '_' + r + '_' + m; return smatCache[k] || (smatCache[k] = reg(new THREE.MeshStandardMaterial({ color: linC(hex), roughness: r, metalness: m }))); }
function applyGfx() {
  const g = GFX[settings.gfx];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, g.pr));
  const sh = g.shadow > 0;
  if (renderer.shadowMap.enabled !== sh) { renderer.shadowMap.enabled = sh; for (const m of ALL_MATS) m.needsUpdate = true; }
  if (homeSun) { homeSun.castShadow = sh; if (sh) { homeSun.shadow.mapSize.set(1024, 1024); if (homeSun.shadow.map) { homeSun.shadow.map.dispose(); homeSun.shadow.map = null; } } }
  resize();
}

// ================= ASSETS (local, CC0 — see CREDITS.md) =================
$('#loading').hidden = false; $('#loadTxt').textContent = 'Carico materiali e cielo…';
try {
  await GX.loadAssets(renderer, { terrainSize: isTouch ? 512 : 1024, veg: true }, f => { $('#loadTxt').textContent = 'Carico materiali e cielo… ' + Math.round(f * 100) + '%'; });
} catch (e) { $('#loadTxt').textContent = 'Errore nel caricare i materiali: ricarica la pagina.'; throw e; }
// ================= PROCEDURAL TEXTURES =================
function pnoise(size, per, seed, oct = 4) {
  const out = new Float32Array(size * size);
  const hash = (x, y, p) => { x = ((x % p) + p) % p; y = ((y % p) + p) % p; const h = Math.sin(x * 127.1 + y * 311.7 + seed * 13.7) * 43758.5453; return h - Math.floor(h); };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let s = 0, a = 0.5, t = 0;
    for (let o = 0; o < oct; o++) {
      const p = per << o, x = i / size * p, y = j / size * p, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      s += a * ((hash(ix, iy, p) * (1 - ux) + hash(ix + 1, iy, p) * ux) * (1 - uy) + (hash(ix, iy + 1, p) * (1 - ux) + hash(ix + 1, iy + 1, p) * ux) * uy);
      t += a; a *= 0.5;
    }
    out[j * size + i] = s / t;
  }
  return out;
}
function canvasTex(size, paint, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); paint(ctx, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  try { t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); } catch (e) { }
  return t;
}
function grayPaint(fn) { return (ctx, n) => { const img = ctx.createImageData(n, n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = clamp(fn(i, j) * 255, 0, 255), k = (j * n + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255; } ctx.putImageData(img, 0, 0); }; }
function normalTex(h, n, str) {
  return canvasTex(n, (ctx) => {
    const img = ctx.createImageData(n, n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const dx = (h[j * n + (i + 1) % n] - h[j * n + (i - 1 + n) % n]) * str, dy = (h[((j + 1) % n) * n + i] - h[((j - 1 + n) % n) * n + i]) * str;
      const l = Math.hypot(dx, dy, 1), k = (j * n + i) * 4;
      img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, false);
}
const TEX = {};
(function makeTextures() {
  const n = 256, rnd = mulberry32(42);
  const d = pnoise(n, 8, 1, 5);
  TEX.detail = canvasTex(n, grayPaint((i, j) => 0.74 + 0.26 * d[j * n + i] + (rnd() - 0.5) * 0.06));
  TEX.detailN = normalTex(d, n, 5);
  const pl = pnoise(n, 6, 2, 5);
  TEX.plaster = canvasTex(n, (ctx) => {
    grayPaint((i, j) => 0.86 + 0.14 * pl[j * n + i] + (rnd() < 0.01 ? -0.12 : 0))(ctx, n);
    ctx.globalAlpha = 0.08; for (let k = 0; k < 6; k++) { const y = rnd() * n; const g = ctx.createLinearGradient(0, y, 0, y + 60); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(rnd() * n, y, 40 + rnd() * 60, 60); }
    ctx.globalAlpha = 1;
  });
  TEX.plasterN = normalTex(pl, n, 2.5);
  TEX.roof = canvasTex(n, (ctx) => {
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(0, 0, n, n);
    const rows = 8, cols = 6, rh = n / rows, cw = n / cols;
    for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
      const x = c * cw + (r % 2 ? cw / 2 : 0), y = r * rh;
      const g = ctx.createLinearGradient(0, y, 0, y + rh); const b = 200 + rnd() * 40;
      g.addColorStop(0, `rgb(${b},${b},${b})`); g.addColorStop(0.75, `rgb(${b * 0.82},${b * 0.82},${b * 0.82})`); g.addColorStop(1, `rgb(${b * 0.5},${b * 0.5},${b * 0.5})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + cw - 2, y); ctx.lineTo(x + cw - 2, y + rh - 6); ctx.quadraticCurveTo(x + cw / 2, y + rh + 3, x + 2, y + rh - 6); ctx.closePath(); ctx.fill();
    }
  });
  TEX.wood = canvasTex(n, (ctx) => {
    const planks = 5, ph = n / planks;
    for (let p = 0; p < planks; p++) {
      const b = 175 + rnd() * 45; ctx.fillStyle = `rgb(${b},${b},${b})`; ctx.fillRect(0, p * ph, n, ph);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
      for (let k = 0; k < 9; k++) { const y0 = p * ph + rnd() * ph; ctx.beginPath(); ctx.moveTo(0, y0); for (let x = 0; x <= n; x += 16) ctx.lineTo(x, y0 + Math.sin(x * 0.05 + k) * 2.5); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, p * ph, n, 2);
      ctx.fillStyle = 'rgba(40,40,40,0.8)'; ctx.fillRect(12, p * ph + ph / 2 - 2, 4, 4); ctx.fillRect(n - 16, p * ph + ph / 2 - 2, 4, 4);
    }
  });
  TEX.stone = canvasTex(n, (ctx) => {
    ctx.fillStyle = '#6c6c6c'; ctx.fillRect(0, 0, n, n);
    for (let k = 0; k < 46; k++) {
      const x = rnd() * n, y = rnd() * n, w = 18 + rnd() * 26, h = 14 + rnd() * 18, b = 150 + rnd() * 80;
      for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
        ctx.fillStyle = `rgb(${b},${b * 0.98},${b * 0.95})`; ctx.beginPath(); ctx.ellipse(x + ox, y + oy, w / 2, h / 2, rnd() * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
  });
  const wv = pnoise(n, 4, 9, 5);
  TEX.waterN = normalTex(wv, n, 9);
  TEX.grass = canvasTex(128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    for (let k = 0; k < 26; k++) {
      const x0 = 8 + rnd() * 112, h = 60 + rnd() * 66, w = 2.5 + rnd() * 3.5, bend = (rnd() - 0.5) * 34;
      const g = ctx.createLinearGradient(0, 128, 0, 128 - h); g.addColorStop(0, '#34501f'); g.addColorStop(0.6, '#7d9a46'); g.addColorStop(1, '#b8c47a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - w, 128); ctx.quadraticCurveTo(x0 + bend * 0.3, 128 - h * 0.5, x0 + bend, 128 - h); ctx.quadraticCurveTo(x0 + bend * 0.3 + w * 0.3, 128 - h * 0.5, x0 + w, 128); ctx.closePath(); ctx.fill();
    }
  });
  TEX.cloud = canvasTex(128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    for (let k = 0; k < 16; k++) {
      const x = 30 + rnd() * 68, y = 50 + rnd() * 30, r = 14 + rnd() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    }
  });
})();

// PBR house materials (ambientCG, CC0) replace the procedural ones
for (const k of ['plaster', 'roof', 'wood', 'stone']) { const h = GX.houseMaps(k); TEX[k] = h.c; TEX[k + 'N'] = h.n; }
// ================= GEOMETRY BUILDER =================
class GeoBuilder {
  constructor(skin) { this.skin = skin; this.p = []; this.n = []; this.c = []; this.si = []; this.sw = []; this.uv = []; this.ix = []; this.cnt = 0; }
  add(geo, m, col, w, disp, opt) {
    const pa = geo.attributes.position, na = geo.attributes.normal, ua = geo.attributes.uv;
    const nm = new THREE.Matrix3().getNormalMatrix(m), v = new THREE.Vector3(), nn = new THREE.Vector3(), base = this.cnt;
    const flip = opt && opt.flip, IX = opt && opt.glow ? (this.gix || (this.gix = [])) : this.ix;
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(m); nn.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
      if (flip) nn.set(-nn.x, -nn.y, -nn.z);
      if (disp) disp(v, nn);
      this.p.push(v.x, v.y, v.z); this.n.push(nn.x, nn.y, nn.z);
      const cc = typeof col === 'function' ? col(v.x, v.y, v.z, nn) : col; this.c.push(cc[0], cc[1], cc[2]);
      if (ua) this.uv.push(ua.getX(i), ua.getY(i)); else this.uv.push(0, 0);
      if (this.skin) { const ww = typeof w === 'function' ? w(v.x, v.y, v.z) : w; for (let k = 0; k < 4; k++) { const e = ww[k]; this.si.push(e ? e[0] : 0); this.sw.push(e ? e[1] : 0); } }
    }
    const n = geo.index ? geo.index.array.length : pa.count, a = geo.index ? geo.index.array : null;
    for (let i = 0; i < n; i += 3) {
      const i0 = a ? a[i] : i, i1 = a ? a[i + 1] : i + 1, i2 = a ? a[i + 2] : i + 2;
      if (flip) IX.push(base + i0, base + i2, base + i1); else IX.push(base + i0, base + i1, base + i2);
    }
    this.cnt += pa.count;
  }
  build(recompute) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.skin) { g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4)); }
    const G2 = this.gix && this.gix.length;
    g.setIndex(G2 ? this.ix.concat(this.gix) : this.ix);
    if (G2) { g.addGroup(0, this.ix.length, 0); g.addGroup(this.ix.length, this.gix.length, 1); }
    if (recompute) g.computeVertexNormals();
    return g;
  }
}
const U = {
  sphHi: new THREE.SphereGeometry(1, 20, 14), sphMid: new THREE.SphereGeometry(1, 14, 10), sphLo: new THREE.SphereGeometry(1, 8, 6),
  halfHi: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), halfLo: new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.52),
  capHi: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), capLo: new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.6),
  hood: new THREE.SphereGeometry(1, 16, 12, 0, Math.PI, 0, Math.PI * 0.82),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16, 1), cylLo: new THREE.CylinderGeometry(1, 1, 1, 8, 1),
  box: new THREE.BoxGeometry(1, 1, 1), cone: new THREE.ConeGeometry(1, 1, 12, 3),
};
const tubeCache = {};
function tubeGeo(r0, r1, len, seg) {
  const k = [r0, r1, len, seg].join('_'); if (tubeCache[k]) return tubeCache[k];
  const pts = [], N = seg > 8 ? 4 : 2;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(0.0005, r1 * Math.sin(a)), -len - r1 * 0.55 * Math.cos(a))); }
  const mids = seg > 8 ? 4 : 1;
  for (let i = 1; i < mids; i++) { const t = i / mids; const r = lerp(r1, r0, t) * (1 + Math.sin(t * Math.PI) * 0.06); pts.push(new THREE.Vector2(r, -len + len * t)); }
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(0.0005, r0 * Math.cos(a)), r0 * 0.55 * Math.sin(a))); }
  return (tubeCache[k] = new THREE.LatheGeometry(pts, seg));
}
function latheFrom(profile, seg, ps = 0, pl = Math.PI * 2) { if (profile[0][1] > profile[profile.length - 1][1]) profile = profile.slice().reverse(); return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), seg, ps, pl); }

// ================= HUMAN CHARACTERS (skinned) =================
// Bones in bind pose (world coordinates, facing -Z, 1.83 m tall)
const BONES = [
  ['root', -1, 0, 0, 0], ['hips', 0, 0, 0.95, 0], ['spine', 1, 0, 1.06, 0], ['chest', 2, 0, 1.24, 0], ['neck', 3, 0, 1.47, 0], ['head', 4, 0, 1.6, 0],
  ['uArmL', 3, -0.2, 1.42, 0], ['fArmL', 6, -0.2, 1.135, 0], ['handL', 7, -0.2, 0.885, 0],
  ['uArmR', 3, 0.2, 1.42, 0], ['fArmR', 9, 0.2, 1.135, 0], ['handR', 10, 0.2, 0.885, 0],
  ['thighL', 1, -0.095, 0.92, 0], ['shinL', 12, -0.095, 0.5, 0], ['footL', 13, -0.095, 0.085, 0],
  ['thighR', 1, 0.095, 0.92, 0], ['shinR', 15, 0.095, 0.5, 0], ['footR', 16, 0.095, 0.085, 0],
];
function makeBones() {
  const bones = [];
  BONES.forEach(([n, p, x, y, z]) => {
    const b = new THREE.Bone(); b.name = n;
    if (p < 0) b.position.set(x, y, z); else { const P = BONES[p]; b.position.set(x - P[2], y - P[3], z - P[4]); bones[p].add(b); }
    bones.push(b);
  });
  return bones;
}
const camoN = makeNoise(77);
function clothFn(base, o, camo, extra) {
  const L = camo ? camo.map(lin) : null;
  return (x, y, z) => {
    let c = base;
    if (L) { const v = camoN.fbm(x * 9 + z * 6 + 3, y * 9 - z * 4, 2); c = L[v < 0.38 ? 0 : v < 0.5 ? 1 : v < 0.62 ? 2 : 3]; }
    if (extra) { const e = extra(x, y, z); if (e) c = e; }
    const k = 0.9 + camoN.n(x * 40 + 7, y * 40 + z * 30) * 0.16;
    return mul3(c, k);
  };
}
function buildHumanGeo(look, hi) {
  const o = look.o, fem = !!o.female, G = new GeoBuilder(true);
  const SPH = hi ? U.sphHi : U.sphLo, SPM = hi ? U.sphMid : U.sphLo, SEG = hi ? 14 : 7;
  const skin = lin(look.skin), hairC = lin(look.hair), topC = lin(o.top), top2 = lin(o.top2 || o.top), pantsC = lin(o.pants), bootC = lin(o.boots), soleC = lin(o.sole || 0x111111);
  const glove = o.gloves ? lin(o.gloves) : skin, lip = mix3(skin, lin(0xa04a48), 0.38), skinD = mul3(skin, 0.86);
  const sh = fem ? 0.188 : 0.2;
  const torsoW = (x, y) => {
    if (y < 1.0) return [[1, 1]];
    if (y < 1.1) { const t = (y - 1.0) / 0.1; return [[1, 1 - t], [2, t]]; }
    if (y < 1.17) return [[2, 1]];
    if (y < 1.3) { const t = (y - 1.17) / 0.13; return [[2, 1 - t], [3, t]]; }
    if (y < 1.46) return [[3, 1]];
    const t = clamp((y - 1.46) / 0.08, 0, 1); return [[3, 1 - t * 0.6], [4, t * 0.6]];
  };
  const limbW = (bone, parent, jy, bl = 0.1) => (x, y) => { const t = jy - y, wp = 0.5 * clamp(1 - t / bl, 0, 1); return wp > 0.002 ? [[bone, 1 - wp], [parent, wp]] : [[bone, 1]]; };
  const one = b => [[b, 1]];
  // torso clothing details via color
  const torsoExtra = (x, y, z) => {
    if (o.open && z < 0 && Math.abs(x) < 0.055 && y > 1.0 && y < 1.44) return top2;
    if (!o.open && !o.hoodie && !o.short && z < 0 && Math.abs(x) < 0.006 && y > 1.0 && y < 1.46) return [0.25, 0.25, 0.27];
    if (o.stripes && ((y > 1.04 && y < 1.08) || (y > 1.32 && y < 1.36))) return top2;
    if (o.hoodie && z < -0.06 && Math.abs(x) < 0.1 && y > 0.99 && y < 1.12) return mul3(topC, 0.82);
    if (o.short && y > 1.4) return top2;
    return null;
  };
  const topFn = clothFn(topC, o, o.camo, torsoExtra);
  const pantsFn = clothFn(pantsC, o, o.pantsCamo ? o.camo : null);
  // ---- torso
  const prof = fem
    ? [[0, 0.955], [0.14, 0.96], [0.158, 0.995], [0.132, 1.075], [0.136, 1.15], [0.158, 1.24], [0.165, 1.31], [0.17, 1.38], [0.158, 1.43], [0.11, 1.475], [0.052, 1.5], [0, 1.505]]
    : [[0, 0.955], [0.135, 0.96], [0.15, 0.99], [0.142, 1.06], [0.148, 1.14], [0.166, 1.24], [0.182, 1.33], [0.186, 1.39], [0.17, 1.44], [0.12, 1.478], [0.055, 1.5], [0, 1.505]];
  G.add(latheFrom(prof, hi ? 22 : 10), mtx(0, 0, 0.004, fem ? 1.02 : 1.08, 1, 0.64), topFn, (x, y) => torsoW(x, y));
  if (fem) for (const s of [-1, 1]) G.add(SPM, mtx(s * 0.058, 1.3, -0.072, 0.066, 0.06, 0.052), topFn, one(3));
  if (!fem) G.add(SPM, mtx(0, 1.33, -0.03, 0.17, 0.09, 0.09), topFn, one(3)); // pecs/upper chest volume
  // pelvis
  G.add(SPH, mtx(0, 0.935, 0.008, fem ? 0.178 : 0.168, 0.12, 0.118), pantsFn, (x, y) => y > 0.99 ? [[1, 0.75], [2, 0.25]] : y < 0.88 ? [[1, 0.6], [x < 0 ? 12 : 15, 0.4]] : [[1, 1]]);
  if (o.belt) { G.add(U.cyl, mtx(0, 0.99, 0.004, 0.166 * (fem ? 1.0 : 1.04), 0.042, 0.104), lin(o.belt), torsoW); G.add(U.box, mtx(0, 0.99, -0.106, 0.05, 0.036, 0.012), [0.5, 0.48, 0.42], one(1)); }
  // collar / hood
  if (o.hoodie) G.add(SPM, mtx(0, 1.47, 0.07, 0.13, 0.065, 0.075), mul3(topC, 0.9), one(3));
  else if (o.hat !== 'hood') G.add(U.cyl, mtx(0, 1.49, 0.005, 0.07, 0.05, 0.066), mul3(o.short ? top2 : topC, 0.92), [[3, 0.6], [4, 0.4]]);
  // vest & backpack
  if (o.vest) {
    const vc = lin(o.vest);
    G.add(SPM, mtx(0, 1.27, 0.002, 0.198, 0.175, 0.134), clothFn(vc, o, null), torsoW);
    G.add(U.box, mtx(0, 1.27, -0.122, 0.25, 0.24, 0.035), mul3(vc, 0.92), one(3));
    G.add(U.box, mtx(0, 1.27, 0.124, 0.25, 0.24, 0.035), mul3(vc, 0.92), one(3));
    if (hi) for (const px of [-0.075, 0, 0.075]) G.add(U.box, mtx(px, 1.12, -0.135, 0.058, 0.07, 0.04), mul3(vc, 0.8), [[2, 0.5], [3, 0.5]]);
  }
  if (o.pack) {
    const pc = lin(o.pack);
    G.add(U.box, mtx(0, 1.24, 0.19, 0.27, 0.36, 0.13), clothFn(pc, o, null), one(3));
    G.add(SPM, mtx(0, 1.42, 0.19, 0.135, 0.04, 0.065), mul3(pc, 0.85), one(3));
    G.add(U.cyl, mtx(0, 1.45, 0.19, 0.05, 0.3, 0.05, 0, 0, Math.PI / 2), [0.16, 0.15, 0.12], one(3));
    if (hi) for (const s of [-1, 1]) G.add(U.box, mtx(s * 0.09, 1.32, -0.105, 0.04, 0.26, 0.012), mul3(pc, 0.7), one(3));
  }
  // ---- arms
  for (const s of [-1, 1]) {
    const ua = s < 0 ? 6 : 9, fa = ua + 1, hb = ua + 2, x = s * sh;
    const sleeveU = o.short ? (xx, y, z) => y < 1.26 ? skin : topFn(xx, y, z) : topFn;
    const sleeveF = o.short ? skin : topFn;
    G.add(SPM, mtx(x, 1.415, 0, fem ? 0.056 : 0.064, fem ? 0.052 : 0.06, fem ? 0.058 : 0.066), topFn, [[ua, 0.55], [3, 0.45]]);
    G.add(tubeGeo(fem ? 0.047 : 0.053, fem ? 0.039 : 0.044, 0.27, SEG), mtx(x, 1.42, 0), sleeveU, limbW(ua, 3, 1.42, 0.08));
    G.add(SPM, mtx(x, 1.138, 0, 0.044, 0.044, 0.044), o.short ? skin : topFn, [[fa, 0.5], [ua, 0.5]]);
    G.add(tubeGeo(fem ? 0.039 : 0.044, fem ? 0.03 : 0.034, 0.235, SEG), mtx(x, 1.135, 0), sleeveF, limbW(fa, ua, 1.135, 0.07));
    if (!o.short) G.add(U.cyl, mtx(x, 0.91, 0, 0.04, 0.03, 0.04), mul3(top2, 0.9), one(fa));
    if (s < 0 && hi && !o.gloves) G.add(U.cyl, mtx(x, 0.93, 0, 0.038, 0.018, 0.036), [0.04, 0.04, 0.045], one(fa));
    // hand
    G.add(SPM, mtx(x, 0.835, -0.004, 0.026, 0.05, 0.041), glove, [[hb, 0.85], [fa, 0.15]]);
    G.add(SPM, mtx(x, 0.773, -0.012, 0.023, 0.046, 0.036), glove, one(hb));
    G.add(SPM, mtx(x - s * 0.02, 0.83, -0.04, 0.012, 0.03, 0.013, -0.4, 0, 0), glove, one(hb));
  }
  // ---- legs
  for (const s of [-1, 1]) {
    const th = s < 0 ? 12 : 15, sn = th + 1, ft = th + 2, x = s * 0.095;
    G.add(tubeGeo(fem ? 0.09 : 0.088, 0.061, 0.41, SEG + 2), mtx(x, 0.92, 0.004), pantsFn, limbW(th, 1, 0.92, 0.1));
    if (o.pockets && hi) G.add(SPM, mtx(s * 0.165, 0.71, 0.0, 0.026, 0.06, 0.048), mul3(pantsC, 0.85), one(th));
    G.add(SPM, mtx(x, 0.502, 0, 0.062, 0.062, 0.062), pantsFn, [[sn, 0.5], [th, 0.5]]);
    if (o.pads) G.add(SPM, mtx(x, 0.5, -0.052, 0.056, 0.062, 0.03), [0.035, 0.035, 0.035], [[sn, 0.6], [th, 0.4]]);
    G.add(tubeGeo(0.059, 0.044, 0.38, SEG), mtx(x, 0.5, 0.003), pantsFn, limbW(sn, th, 0.5, 0.08));
    G.add(tubeGeo(0.056, 0.052, 0.14, SEG), mtx(x, 0.2, 0.003), bootC, one(sn));
    G.add(SPM, mtx(x, 0.062, -0.045, 0.053, 0.05, 0.118), bootC, [[ft, 0.8], [sn, 0.2]]);
    G.add(U.box, mtx(x, 0.013, -0.045, 0.108, 0.026, 0.255), soleC, one(ft));
  }
  // ---- neck & head
  G.add(U.cyl, mtx(0, 1.545, 0.006, 0.05, 0.16, 0.052), skin, (x, y) => y > 1.58 ? [[4, 0.5], [5, 0.5]] : [[4, 1]]);
  const H = 5, masked = !!o.mask;
  const stub = o.beard ? mix3(skin, hairC, 0.55) : null;
  const jawCol = (x, y, z) => masked ? mul3(topC, 0.95) : (stub && y < 1.66 && z < 0.02 ? stub : skin);
  G.add(SPH, mtx(0, 1.712, 0.006, 0.0885, 0.115, 0.108), (x, y, z) => masked && y < 1.69 ? mul3(topC, 0.95) : skin, one(H));
  G.add(SPH, mtx(0, 1.648, -0.016, 0.07, 0.058, 0.08), jawCol, one(H));
  if (!masked) {
    G.add(SPM, mtx(0, 1.69, -0.103, 0.0145, 0.027, 0.02, -0.25), skinD, one(H));
    G.add(SPM, mtx(0, 1.676, -0.112, 0.0135, 0.012, 0.012), skin, one(H));
    G.add(SPM, mtx(0, 1.648, -0.097, 0.023, 0.0065, 0.011), lip, one(H));
    G.add(SPM, mtx(0, 1.637, -0.095, 0.021, 0.0078, 0.011), lip, one(H));
    if (o.beard && hi) G.add(SPM, mtx(0, 1.656, -0.099, 0.026, 0.0055, 0.01), hairC, one(H));
  }
  for (const s of [-1, 1]) {
    G.add(SPM, mtx(s * 0.089, 1.698, 0.004, 0.012, 0.028, 0.019), skinD, one(H));
    if (hi) {
      const ex = s * 0.034;
      G.add(U.sphLo, mtx(ex, 1.716, -0.093, 0.0145, 0.0145, 0.0145), [0.86, 0.84, 0.8], one(H));
      G.add(U.sphLo, mtx(ex, 1.716, -0.1032, 0.0082, 0.0082, 0.006), lin(look.iris), one(H));
      G.add(U.sphLo, mtx(ex, 1.716, -0.1082, 0.0038, 0.0038, 0.003), [0.01, 0.01, 0.01], one(H));
      G.add(SPM, mtx(ex, 1.729, -0.096, 0.0175, 0.0065, 0.013), skinD, one(H));
      G.add(U.box, mtx(ex, 1.7385, -0.098, 0.034, 0.0065, 0.012, 0, 0, -s * 0.09), hairC, one(H));
    } else {
      G.add(U.sphLo, mtx(s * 0.034, 1.716, -0.097, 0.013, 0.01, 0.01), [0.1, 0.08, 0.07], one(H));
    }
  }
  // hair
  const HC = hi ? U.capHi : U.capLo, HF = hi ? U.halfHi : U.halfLo;
  const buzz = o.hair === 'buzz';
  const hairCol = buzz ? mix3(hairC, skin, 0.35) : hairC;
  if (o.hat !== 'helmet' && o.hat !== 'fire') {
    if (buzz) G.add(HC, mtx(0, 1.716, 0.01, 0.0915, 0.119, 0.111, 0.55), hairCol, one(H));
    else G.add(HC, mtx(0, 1.72, 0.012, 0.0955, 0.124, 0.116, 0.55), hairCol, one(H));
    if (!buzz) for (const s of [-1, 1]) G.add(SPM, mtx(s * 0.085, 1.695, 0.014, 0.011, 0.03, 0.02), hairCol, one(H));
  }
  if (o.hair === 'long') {
    G.add(SPH, mtx(0, 1.6, 0.068, 0.1, 0.165, 0.058), hairC, one(H));
    for (const s of [-1, 1]) G.add(SPM, mtx(s * 0.088, 1.63, 0.012, 0.03, 0.115, 0.042), hairC, one(H));
  }
  if (o.hair === 'ponytail') {
    G.add(SPM, mtx(0, 1.72, 0.112, 0.036, 0.036, 0.036), hairC, one(H));
    G.add(tubeGeo(0.026, 0.012, 0.2, SEG > 8 ? 10 : 6), mtx(0, 1.715, 0.13, 1, 1, 1, 0.35), hairC, one(H));
  }
  // headwear
  const hatC = o.hatCol ? lin(o.hatCol) : topC;
  if (o.hat === 'cap') {
    G.add(HF, mtx(0, 1.742, 0.006, 0.108, 0.085, 0.118), clothFn(hatC, o, null), one(H));
    G.add(SPM, mtx(0, 1.752, -0.122, 0.074, 0.007, 0.072), mul3(hatC, 0.85), one(H));
  } else if (o.hat === 'beanie') {
    G.add(HF, mtx(0, 1.722, 0.008, 0.108, 0.124, 0.118, 0.12), clothFn(hatC, o, null), one(H));
    G.add(U.cyl, mtx(0, 1.735, 0.006, 0.11, 0.035, 0.12, 0.12), mul3(hatC, 0.85), one(H));
  } else if (o.hat === 'helmet' || o.hat === 'fire') {
    G.add(HF, mtx(0, 1.724, 0.008, 0.124, 0.122, 0.132), clothFn(hatC, o, null), one(H));
    G.add(U.cyl, mtx(0, 1.724, 0.008, 0.126, 0.02, 0.134), mul3(hatC, 0.75), one(H));
    if (o.hat === 'fire') G.add(SPM, mtx(0, 1.722, 0.03, 0.14, 0.012, 0.165), mul3(hatC, 0.9), one(H));
    else for (const s of [-1, 1]) G.add(U.box, mtx(s * 0.11, 1.66, 0.0, 0.008, 0.08, 0.012), [0.03, 0.03, 0.03], one(H));
  } else if (o.hat === 'hood') {
    G.add(U.hood, mtx(0, 1.69, 0.012, 0.137, 0.155, 0.135), clothFn(hatC, o, null), one(H));
    if (hi) { const fc = lin(o.fur); for (let k = 0; k <= 12; k++) { const a = -0.25 * Math.PI + k / 12 * 1.5 * Math.PI; G.add(SPM, mtx(Math.cos(a) * 0.118, 1.68 + Math.sin(a) * 0.135, -0.07, 0.034, 0.034, 0.03), mul3(fc, 0.85 + (k % 3) * 0.07), one(H)); } }
  }
  const geo = G.build();
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 1.6);
  return geo;
}
const HUMAN_MAT = reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.74, metalness: 0.02 }));
const HUMAN_GLOW = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const HUMAN_MATS = [HUMAN_MAT, HUMAN_GLOW];
const HG_CACHE = {};
function randomLook(rng = R) {
  const oi = (rng() * LOOKS.length) | 0, o = LOOKS[oi];
  if (o.monster) return outfitLook(oi);
  const si = (rng() * SKIN_TONES.length) | 0, hc = (rng() * HAIR_COLS.length) | 0, ii = (rng() * IRIS_COLS.length) | 0;
  return { key: oi + '_' + si + '_' + hc, o, skin: SKIN_TONES[si], hair: HAIR_COLS[hc], iris: IRIS_COLS[ii] };
}
function outfitLook(i) { const o = LOOKS[i]; return { key: 'p' + i, o, skin: o.skin || 0xd29e76, hair: o.hairCol || 0x16110e, iris: IRIS_COLS[i % IRIS_COLS.length] }; }
const gliderGeo = (() => {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array([0, 0.25, -1.1, -2.1, 0, 0.9, 0, 0.1, 0.55, 0, 0.25, -1.1, 0, 0.1, 0.55, 2.1, 0, 0.9]);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
})();
function makeGlider(colHex) {
  const gr = new THREE.Group();
  const wing = new THREE.Mesh(gliderGeo, reg(new THREE.MeshStandardMaterial({ color: linC(colHex), roughness: 0.6, side: THREE.DoubleSide })));
  wing.castShadow = true; gr.add(wing);
  const bar = smat(0xb8bcc2, 0.35, 0.8);
  const a = new THREE.Mesh(U.cylLo, bar); a.scale.set(0.02, 1.4, 0.02); a.position.set(-0.32, -0.62, 0.15); a.rotation.z = -0.35; gr.add(a);
  const b = new THREE.Mesh(U.cylLo, bar); b.scale.set(0.02, 1.4, 0.02); b.position.set(0.32, -0.62, 0.15); b.rotation.z = 0.35; gr.add(b);
  const c = new THREE.Mesh(U.cylLo, bar); c.scale.set(0.022, 0.75, 0.022); c.position.set(0, -1.25, 0.15); c.rotation.z = Math.PI / 2; gr.add(c);
  gr.position.y = 2.95; gr.visible = false; return gr;
}
function makeHuman(look) {
  let geos = HG_CACHE[look.key];
  const build = look.o.monster ? buildMonsterGeo : buildHumanGeo;
  if (!geos) geos = HG_CACHE[look.key] = { hi: build(look, true), lo: build(look, false) };
  const bones = makeBones();
  const mesh = new THREE.SkinnedMesh(geos.hi, geos.hi.groups && geos.hi.groups.length ? HUMAN_MATS : HUMAN_MAT);
  mesh.add(bones[0]); mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true;
  const g = new THREE.Group(); g.add(mesh);
  const gun = new THREE.Group(); gun.position.set(0, -0.072, -0.014); gun.rotation.x = -Math.PI / 2; bones[11].add(gun);
  const glider = makeGlider(look.o.top2 && look.o.top2 !== look.o.top ? look.o.top2 : 0x2d5fa0);
  g.add(glider);
  return { g, mesh, b: bones, gun, glider, geos, hiOn: true, look };
}
function setLOD(h, hi) { if (h.hiOn !== hi) { h.hiOn = hi; h.mesh.geometry = hi ? h.geos.hi : h.geos.lo; } }
// Procedural animation. s = { spd, ph, pitch, hold, swing, air, mode, t, headYaw }
function animHuman(h, s) {
  const b = h.b;
  for (let i = 0; i < b.length; i++) b[i].rotation.set(0, 0, 0);
  b[0].position.set(0, 0, 0); b[1].position.set(0, 0.95, 0);
  const t = s.t || 0, p = clamp(s.pitch || 0, -1, 1);
  b[3].rotation.x = Math.sin(t * 1.9) * 0.018;
  if (s.mode === 'fall') {
    b[0].rotation.x = -1.2; b[0].position.y = 1.0;
    b[6].rotation.set(0.25, 0, -1.25); b[9].rotation.set(0.25, 0, 1.25); b[7].rotation.x = 0.5; b[10].rotation.x = 0.5;
    b[12].rotation.set(-0.15, 0, -0.18); b[15].rotation.set(-0.15, 0, 0.18); b[13].rotation.x = -0.75; b[16].rotation.x = -0.75;
    b[5].rotation.x = 0.85; b[4].rotation.x = 0.3; return;
  }
  if (s.mode === 'glide') {
    b[6].rotation.set(2.85, 0, -0.32); b[9].rotation.set(2.85, 0, 0.32); b[7].rotation.x = 0.35; b[10].rotation.x = 0.35;
    const sw = Math.sin(t * 2) * 0.12;
    b[12].rotation.x = 0.15 + sw; b[15].rotation.x = 0.1 - sw; b[13].rotation.x = -0.3; b[16].rotation.x = -0.35; b[5].rotation.x = -0.15; return;
  }
  if (s.mode === 'dead') {
    b[6].rotation.set(0.4, 0, -1.1); b[9].rotation.set(0.6, 0, 1.0); b[7].rotation.x = 0.6; b[10].rotation.x = 0.3;
    b[12].rotation.x = 0.25; b[15].rotation.x = -0.1; b[13].rotation.x = -0.4; b[5].rotation.y = 0.5; return;
  }
  const a = clamp((s.spd || 0) / 6.6, 0, 1.3), ph = s.ph || 0, sw = Math.sin(ph);
  // legs
  if (s.air) {
    b[12].rotation.x = 0.7; b[15].rotation.x = 0.35; b[13].rotation.x = -1.1; b[16].rotation.x = -0.6; b[14].rotation.x = 0.3; b[17].rotation.x = 0.2;
  } else {
    b[12].rotation.x = sw * 0.62 * a; b[15].rotation.x = -sw * 0.62 * a;
    const fl = a * (0.12 + 1.05 * Math.max(0, Math.cos(ph - 0.6))), fr = a * (0.12 + 1.05 * Math.max(0, Math.cos(ph + Math.PI - 0.6)));
    b[13].rotation.x = -fl; b[16].rotation.x = -fr;
    b[14].rotation.x = -b[12].rotation.x * 0.25 + fl * 0.35; b[17].rotation.x = -b[15].rotation.x * 0.25 + fr * 0.35;
    b[1].position.y = 0.95 - 0.025 * a + Math.abs(Math.cos(ph)) * 0.04 * a;
    if (a < 0.05) { const ws = Math.sin(t * 0.7) * 0.03; b[1].rotation.z = ws; b[12].rotation.z = -ws; b[15].rotation.z = -ws; b[12].rotation.x = 0.04; b[15].rotation.x = -0.05; b[13].rotation.x = -0.06; }
  }
  b[1].rotation.y = sw * 0.11 * a;
  const lean = -0.1 * a;
  b[2].rotation.x = lean;
  // arms
  const pc = p * 0.32;
  if (s.hold === 'rifle' || s.hold === 'pistol') {
    b[3].rotation.x += pc; b[2].rotation.y = -b[1].rotation.y;
    const comp = -lean, pa = p * 0.55;
    if (s.hold === 'rifle') {
      b[9].rotation.set(1.0 + pa + comp, 0, -0.3); b[10].rotation.set(0.58, 0, 0);
      b[6].rotation.set(1.22 + pa + comp, 0, 0.62); b[7].rotation.set(0.52, 0, 0);
    } else {
      b[9].rotation.set(1.4 + pa + comp, 0, -0.26); b[10].rotation.set(0.14, 0, 0);
      b[6].rotation.set(1.38 + pa + comp, 0, 0.5); b[7].rotation.set(0.3, 0, 0);
    }
  } else if (s.hold === 'pickaxe') {
    const k = s.swing > 0 ? 1 - s.swing / 0.3 : -1;
    if (k >= 0) { const e = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65; b[9].rotation.set(lerp(0.4, 2.7, e) - (k > 0.35 ? (k - 0.35) * 1.5 : 0), 0, -0.15); b[10].rotation.x = 0.35; b[3].rotation.y = 0.35 * e - 0.15; }
    else { b[9].rotation.set(0.35 + sw * 0.25 * a, 0, 0.12); b[10].rotation.x = 0.55; }
    b[6].rotation.set(-sw * 0.45 * a + 0.05, 0, -0.1); b[7].rotation.x = 0.25 + 0.35 * a;
  } else {
    b[6].rotation.set(-sw * 0.5 * a + 0.04, 0, -0.1); b[9].rotation.set(sw * 0.5 * a + 0.04, 0, 0.1);
    b[7].rotation.x = 0.2 + 0.4 * a; b[10].rotation.x = 0.2 + 0.4 * a;
  }
  b[5].rotation.x = p * 0.5 - pc * 0.3; b[5].rotation.y = s.headYaw || 0;
  const mon = h.look && h.look.o.monster;
  if (mon === 'zombie') { b[5].rotation.z += 0.24; b[5].rotation.x += 0.1; b[2].rotation.x += 0.08; b[1].rotation.z += Math.sin(ph) * 0.05 * a; }
  else if (mon === 'wolf') { b[2].rotation.x += 0.2; b[3].rotation.x += 0.12; b[4].rotation.x -= 0.12; b[5].rotation.x -= 0.22; b[1].position.y -= 0.03; }
  else if (mon === 'skeleton') { b[5].rotation.z += Math.sin(t * 1.3) * 0.06; }
  else if (mon === 'witch') { b[5].rotation.z += Math.sin(t * 0.9) * 0.04; }
  else if (mon === 'vampire') { b[5].rotation.x -= 0.06; b[3].rotation.x -= 0.03; }
}

// ================= GUNS (realistic, merged) =================
const GUN_MAT = reg(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.42 }));
const gunCache = {};
function gunGeo(kind, rar) {
  const k = kind + rar; if (gunCache[k]) return gunCache[k];
  const G = new GeoBuilder(false);
  const BLK = lin(0x1c1e22), GM = lin(0x3a3e45), POLY = lin(0x26282b), WOOD = lin(0x6a4528), ACC = lin(RAR[rar].hex), STEEL = lin(0x8a9099), LEATH = lin(0x3a2618), GLASS = lin(0x2a4660);
  const box = (x, y, z, sx, sy, sz, c, rx = 0) => G.add(U.box, mtx(x, y, z, sx, sy, sz, rx), c);
  const cz = (x, y, z, r, len, c) => G.add(U.cyl, mtx(x, y, z, r, len, r, Math.PI / 2), c);
  switch (kind) {
    case 'piccone':
      cz(0, 0, -0.35, 0.02, 0.85, WOOD); cz(0, 0, 0.0, 0.026, 0.2, LEATH);
      box(0, 0, -0.78, 0.05, 0.08, 0.08, STEEL);
      box(0, 0.15, -0.77, 0.032, 0.25, 0.04, STEEL, 0.28); box(0, -0.15, -0.77, 0.032, 0.25, 0.04, STEEL, -0.28);
      box(0, 0.28, -0.73, 0.022, 0.06, 0.03, STEEL, 0.6); box(0, -0.28, -0.73, 0.022, 0.06, 0.03, STEEL, -0.6);
      cz(0, 0, -0.68, 0.025, 0.04, ACC); break;
    case 'pistola':
      box(0, 0.045, -0.085, 0.032, 0.036, 0.2, GM); box(0, 0.019, -0.075, 0.03, 0.026, 0.17, POLY);
      box(0, -0.045, 0.0, 0.03, 0.1, 0.048, POLY, 0.22); box(0, -0.045, 0.004, 0.032, 0.06, 0.04, ACC, 0.22);
      box(0, -0.005, -0.05, 0.008, 0.022, 0.05, POLY); cz(0, 0.045, -0.19, 0.009, 0.02, BLK);
      box(0, 0.067, -0.17, 0.006, 0.01, 0.01, BLK); box(0, 0.067, 0.0, 0.016, 0.01, 0.01, BLK); break;
    case 'mitra':
      box(0, 0.03, -0.12, 0.055, 0.08, 0.3, GM); box(0, 0.077, -0.12, 0.024, 0.014, 0.26, BLK);
      cz(0, 0.03, -0.32, 0.012, 0.12, BLK); cz(0, 0.03, -0.39, 0.02, 0.06, BLK);
      box(0, -0.09, -0.14, 0.035, 0.18, 0.05, BLK, -0.08); box(0, -0.05, 0.0, 0.033, 0.1, 0.044, POLY, 0.25);
      box(0, 0.02, -0.215, 0.06, 0.055, 0.08, ACC);
      box(0, 0.04, 0.12, 0.012, 0.012, 0.22, STEEL); box(0, -0.0, 0.12, 0.012, 0.012, 0.22, STEEL); box(0, 0.02, 0.235, 0.03, 0.08, 0.02, POLY);
      cz(0, 0.1, -0.1, 0.017, 0.06, BLK); break;
    case 'assalto':
      box(0, 0.03, -0.12, 0.058, 0.09, 0.4, GM); box(0, 0.083, -0.15, 0.03, 0.016, 0.36, BLK);
      box(0, 0.035, -0.46, 0.064, 0.07, 0.3, POLY); box(0, 0.035, -0.4, 0.068, 0.074, 0.06, ACC);
      cz(0, 0.04, -0.69, 0.011, 0.2, BLK); cz(0, 0.04, -0.81, 0.018, 0.06, BLK); box(0, 0.088, -0.58, 0.01, 0.04, 0.014, BLK);
      box(0, -0.085, -0.17, 0.04, 0.17, 0.07, BLK, -0.28);
      box(0, -0.05, 0.0, 0.035, 0.11, 0.046, POLY, 0.3); box(0, -0.016, -0.06, 0.008, 0.012, 0.06, POLY);
      box(0, 0.012, 0.2, 0.052, 0.08, 0.22, POLY); box(0, 0.002, 0.315, 0.056, 0.11, 0.028, BLK);
      cz(0, 0.118, -0.13, 0.022, 0.07, BLK); G.add(U.sphLo, mtx(0, 0.118, -0.168, 0.018, 0.018, 0.004), GLASS); break;
    case 'pompa':
      cz(0, 0.05, -0.43, 0.016, 0.56, GM); cz(0, 0.018, -0.36, 0.014, 0.42, BLK);
      box(0, 0.035, -0.06, 0.055, 0.082, 0.24, GM); box(0, 0.014, -0.4, 0.056, 0.05, 0.19, ACC);
      box(0, -0.045, 0.06, 0.034, 0.1, 0.045, WOOD, 0.35); box(0, 0.01, 0.24, 0.046, 0.085, 0.28, WOOD, -0.06); box(0, 0.0, 0.385, 0.05, 0.1, 0.02, BLK);
      box(0, 0.086, -0.7, 0.008, 0.012, 0.012, STEEL); break;
    case 'cecchino':
      cz(0, 0.045, -0.62, 0.012, 0.58, BLK); cz(0, 0.045, -0.93, 0.019, 0.06, BLK);
      box(0, 0.035, -0.12, 0.056, 0.072, 0.38, GM); box(0, 0.02, -0.3, 0.06, 0.06, 0.18, POLY);
      cz(0, 0.125, -0.14, 0.024, 0.34, BLK); cz(0, 0.125, -0.33, 0.032, 0.05, BLK); cz(0, 0.125, 0.04, 0.028, 0.05, BLK);
      box(0, 0.088, -0.22, 0.02, 0.04, 0.02, BLK); box(0, 0.088, -0.05, 0.02, 0.04, 0.02, BLK);
      G.add(U.sphLo, mtx(0, 0.125, -0.357, 0.028, 0.028, 0.004), GLASS); cz(0, 0.125, -0.14, 0.026, 0.06, ACC);
      box(0.045, 0.05, -0.02, 0.04, 0.012, 0.012, STEEL); G.add(U.sphLo, mtx(0.068, 0.05, -0.02, 0.012, 0.012, 0.012), STEEL);
      box(0, -0.045, 0.02, 0.034, 0.1, 0.045, POLY, 0.3); box(0, -0.06, -0.12, 0.03, 0.06, 0.06, BLK);
      box(0, 0.012, 0.26, 0.05, 0.1, 0.3, POLY); box(0, 0.075, 0.24, 0.044, 0.03, 0.16, POLY); box(0, 0.0, 0.415, 0.054, 0.12, 0.022, BLK); break;
  }
  return (gunCache[k] = G.build());
}
function makeGunModel(kind, rar) { const m = new THREE.Mesh(gunGeo(kind, rar || 0), GUN_MAT); m.castShadow = true; return m; }
function setGun(h, kind, rar) { while (h.gun.children.length) h.gun.remove(h.gun.children[0]); h.gun.add(makeGunModel(kind, rar)); h.hold = kind === 'piccone' ? 'pickaxe' : kind === 'pistola' ? 'pistol' : 'rifle'; }

// ================= VEGETATION & ROCKS =================
const VEG_MAT = reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 }));
const ROCK_MAT = reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
const vegN = makeNoise(5);
function barkFn(base, cx, cz) { const b = lin(base); return (x, y, z) => { const a = Math.atan2(x - cx, z - cz); return mul3(b, 0.72 + vegN.n(a * 4 + 9, y * 1.6) * 0.5); }; }
function leafFn(cols, y0, h, rng) {
  const L = cols.map(lin);
  return (x, y, z, n) => {
    const v = vegN.fbm(x * 1.3 + 3, z * 1.3 + y * 0.8, 2);
    let c = mix3(L[0], L[1], v); if (v > 0.62) c = mix3(c, L[2], (v - 0.62) * 2.5);
    const sh = 0.55 + 0.45 * clamp((y - y0) / h, 0, 1) * (0.7 + 0.3 * Math.max(0, n.y));
    return mul3(c, sh);
  };
}
function blobDisp(cx, cy, cz, amp, f) { return (v) => { const dx = v.x - cx, dy = v.y - cy, dz = v.z - cz, d = Math.hypot(dx, dy, dz) || 1; const k = 1 + (vegN.fbm(v.x * f + 11, v.z * f + v.y * f * 0.7, 3) - 0.5) * amp; v.set(cx + dx * k, cy + dy * k, cz + dz * k); }; }
const AUTUMN = [[0x7a2a0c, 0xb4561a, 0xe09a30], [0x5e1a10, 0x9a2a16, 0xd05a22], [0x7a5a10, 0xb08a1e, 0xe0c050], [0x4a5a20, 0x7a7a26, 0xc0902c]];
function treeGeo(kind, seed, snow) {
  if (kind === 'dead') return deadTreeGeo(seed);
  const rng = mulberry32(seed), G = new GeoBuilder(false);
  if (kind === 'round') {
    const H = 2.6 + rng() * 0.8;
    G.add(latheFrom([[0.42, -0.2], [0.32, 0.2], [0.26, 0.9], [0.22, H * 0.8], [0.18, H + 0.4], [0, H + 0.6]], 9), mtx(0, 0, 0), barkFn(0x5a4532, 0, 0));
    for (let k = 0; k < 3; k++) { const a = rng() * 6.28, l = 1.0 + rng() * 0.6; G.add(U.cylLo, chain(mtx(0, H - 0.3 + rng() * 0.6, 0, 1, 1, 1, 0, a, 0), mtx(0, 0, 0, 1, 1, 1, 0.9 + rng() * 0.3), mtx(0, l / 2, 0, 0.08, l, 0.08)), barkFn(0x5a4532, 0, 0)); }
    const cy = H + 1.9, cols = AUTUMN[(((seed | 0) % 4) + 4) % 4];
    const blobs = 7 + ((rng() * 3) | 0);
    for (let k = 0; k < blobs; k++) {
      const a = rng() * 6.28, r = k === 0 ? 0 : 0.9 + rng() * 0.9, y = cy + (k === 0 ? 0.3 : (rng() - 0.35) * 1.6), s = k === 0 ? 1.9 : 1.1 + rng() * 0.6;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      G.add(U.sphMid, mtx(x, y, z, s, s * 0.85, s), leafFn(cols, cy - 2, 4.2, rng), null, blobDisp(x, y, z, 0.45, 1.6));
    }
  } else if (kind === 'pine') {
    const H = 7 + rng() * 2.5;
    G.add(latheFrom([[0.36, -0.2], [0.26, 0.3], [0.2, H * 0.4], [0.08, H], [0, H + 0.2]], 8), mtx(0, 0, 0), barkFn(0x4d3a2b, 0, 0));
    const layers = 6, cols = [0x1a3220, 0x27462a, 0x365a34];
    for (let k = 0; k < layers; k++) {
      const t = k / (layers - 1), r = lerp(2.5, 0.55, t) * (0.9 + rng() * 0.2), y = lerp(1.6, H - 0.4, t), hh = lerp(2.1, 1.3, t);
      const lf = leafFn(cols, 1.2, H, rng), sc = snow ? lin(0xf2f5f8) : null;
      G.add(U.cone, mtx(0, y + hh / 2, 0, r, hh, r, 0, rng() * 6, 0), sc ? (x, yy, z, n) => n.y > 0.45 && vegN.n(x * 3, z * 3 + yy) > 0.35 ? sc : lf(x, yy, z, n) : lf, null,
        (v) => { const dx = v.x, dz = v.z, d = Math.hypot(dx, dz); if (d > 0.2) { const k2 = 1 + (vegN.n(Math.atan2(dx, dz) * 3 + k * 7, v.y) - 0.5) * 0.35; v.x *= k2; v.z *= k2; v.y -= (d / r) * (d / r) * 0.35; } });
    }
  } else if (kind === 'palm') {
    const segs = 9, lean = (rng() - 0.5) * 0.5, H = 5.6 + rng() * 1.5; let x = 0, y = 0, ang = 0;
    for (let k = 0; k < segs; k++) {
      const len = H / segs, r = lerp(0.24, 0.15, k / segs);
      ang = lean * (k / segs) * 1.6;
      const cxx = x + Math.sin(ang) * len / 2, cyy = y + Math.cos(ang) * len / 2;
      G.add(U.cylLo, mtx(cxx, cyy, 0, r, len * 1.04, r, 0, 0, -ang), (xx, yy) => mul3(lin(0x7a6248), 0.75 + ((Math.floor(yy * 3.2) % 2) ? 0.18 : 0)));
      x += Math.sin(ang) * len; y += Math.cos(ang) * len;
    }
    const lc = [0x4a5a22, 0x6a7a2e, 0x9a8a40];
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2 + rng() * 0.3, droop = 0.1 + rng() * 0.25, L = 1.7 + rng() * 0.5;
      G.add(U.sphMid, chain(mtx(x, y, 0, 1, 1, 1, 0, a, 0), mtx(0, 0, 0, 1, 1, 1, droop), mtx(0, 0, -L, 0.3, 0.03, L)), leafFn(lc, y - 1.5, 2, rng), null,
        (v) => { const dd = Math.hypot(v.x - x, v.z) ; v.y -= dd * dd * 0.09; });
    }
    for (let k = 0; k < 4; k++) G.add(U.sphLo, mtx(x + (rng() - 0.5) * 0.3, y - 0.3, (rng() - 0.5) * 0.3, 0.13, 0.15, 0.13), lin(0x4a3a1e));
  } else if (kind === 'bush') {
    const cols = AUTUMN[((((seed | 0) >> 1) % 4) + 4) % 4];
    for (let k = 0; k < 4; k++) { const a = rng() * 6.28, r = k ? 0.45 : 0, s = 0.55 + rng() * 0.35, x = Math.cos(a) * r, z = Math.sin(a) * r, y = s * 0.6; G.add(U.sphLo, mtx(x, y, z, s, s * 0.8, s), leafFn(cols, 0, 1.2, rng), null, blobDisp(x, y, z, 0.5, 2.5)); }
  }
  return G.build(true);
}
function rockGeo(seed) {
  const rng = mulberry32(seed), G = new GeoBuilder(false);
  const ico = new THREE.IcosahedronGeometry(1, 1);
  const base = lin(0x8a857d), moss = lin(0x58693a);
  G.add(ico, mtx(0, 0.3, 0, 1.25, 0.8, 1.0, 0, rng() * 6, 0), (x, y, z, n) => { const v = vegN.n(x * 2 + seed, z * 2 + y); const c = mul3(base, 0.7 + v * 0.45); return n.y > 0.55 && v > 0.45 ? mix3(c, moss, 0.6) : c; }, null,
    (v) => { const k = 1 + (vegN.fbm(v.x * 1.4 + seed, v.z * 1.4 + v.y, 3) - 0.5) * 0.7; v.x *= k; v.z *= k; v.y = (v.y - 0.3) * k + 0.3; });
  const g = G.build(false); g.computeVertexNormals(); return g;
}
// Instanced meshes split in spatial tiles so the GPU can cull them
function proxyGeo(src, cx, cy, cz, r) {
  const g = new THREE.BufferGeometry();
  for (const k in src.attributes) g.setAttribute(k, src.attributes[k]);
  g.setIndex(src.index); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r); return g;
}
function instanceTiles(scene, geo, mat, items, tile, opts = {}) {
  const tiles = new Map();
  for (const it of items) { const k = Math.floor(it.x / tile) + ',' + Math.floor(it.z / tile); let l = tiles.get(k); if (!l) { l = []; tiles.set(k, l); } l.push(it); }
  const meshes = [];
  tiles.forEach((list, k) => {
    const [tx, tz] = k.split(',').map(Number);
    const g = proxyGeo(geo, (tx + 0.5) * tile, 10, (tz + 0.5) * tile, tile * 0.72 + 14);
    const m = new THREE.InstancedMesh(g, mat, list.length);
    m.castShadow = !!opts.cast; m.receiveShadow = !!opts.receive;
    list.forEach((it, i) => { m.setMatrixAt(i, it.m); it.mesh = m; it.idx = i; (it.parts = it.parts || []).push([m, i]); });
    m.instanceMatrix.needsUpdate = true; scene.add(m); meshes.push(m);
  });
  return meshes;
}

// ================= SKY =================
function makeSky(topHex, horHex) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color(topHex) }, hor: { value: new THREE.Color(horHex) }, sun: { value: SUN.clone() }, moon: { value: MOON.clone() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 top; uniform vec3 hor; uniform vec3 sun; uniform vec3 moon; varying vec3 vP;',
      'void main(){',
      ' vec3 d = normalize(vP); float h = max(d.y, 0.0);',
      ' vec3 c = mix(hor, top, pow(h, 0.45)); if (d.y < 0.0) c = hor * 0.9;',
      ' float s = max(dot(d, normalize(sun)), 0.0);',
      ' c = mix(c, vec3(1.0, 0.45, 0.16), pow(s, 3.0) * 0.75 * (1.0 - smoothstep(0.0, 0.55, h)));',
      ' c += vec3(1.0, 0.7, 0.35) * pow(s, 700.0) * 2.5 + vec3(1.0, 0.55, 0.25) * pow(s, 14.0) * 0.35;',
      ' float m = max(dot(d, normalize(moon)), 0.0);',
      ' float disc = smoothstep(0.99935, 0.99955, m);',
      ' float cr = 0.82 + 0.18 * sin(d.x * 1500.0) * sin(d.y * 1300.0 + d.z * 900.0);',
      ' c = mix(c, vec3(1.0, 0.96, 0.84) * cr * 1.25, disc);',
      ' c += vec3(0.75, 0.8, 1.0) * (pow(m, 260.0) * 0.35 + pow(m, 18.0) * 0.06);',
      ' vec3 q = floor(d * 320.0); float r = fract(sin(dot(q, vec3(12.9898, 78.233, 45.164))) * 43758.5453);',
      ' float st = step(0.9965, r) * smoothstep(0.12, 0.5, h) * (1.0 - pow(s, 2.0));',
      ' c += vec3(st) * (0.6 + 0.4 * fract(r * 91.7));',
      ' gl_FragColor = vec4(c, 1.0);',
      '}'].join('\n'),
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), mat); m.renderOrder = -10; m.frustumCulled = false;
  return m;
}
function makeSunLight(scene, shadowSize, range) {
  const sun = new THREE.DirectionalLight(0xffa868, 1.85);
  const moonL = new THREE.DirectionalLight(0x8a96ff, 0.38); moonL.position.copy(MOON).multiplyScalar(100); scene.add(moonL);
  sun.castShadow = shadowSize > 0;
  if (shadowSize > 0) {
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const c = sun.shadow.camera; c.left = -range; c.right = range; c.top = range; c.bottom = -range; c.near = 1; c.far = 400;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035;
  }
  scene.add(sun); scene.add(sun.target);
  return sun;
}
function followSun(sun, x, y, z) {
  sun.target.position.set(x, y, z);
  sun.position.set(x + SUN.x * 160, y + SUN.y * 160, z + SUN.z * 160);
}

// ================= HALLOWEEN MONSTER SKINS (skinned, same skeleton as humans) =================
const PROF_M = [[0, 0.955], [0.135, 0.96], [0.15, 0.99], [0.142, 1.06], [0.148, 1.14], [0.166, 1.24], [0.182, 1.33], [0.186, 1.39], [0.17, 1.44], [0.12, 1.478], [0.055, 1.5], [0, 1.505]];
const PROF_F = [[0, 0.955], [0.14, 0.96], [0.158, 0.995], [0.132, 1.075], [0.136, 1.15], [0.158, 1.24], [0.165, 1.31], [0.17, 1.38], [0.158, 1.43], [0.11, 1.475], [0.052, 1.5], [0, 1.505]];
U.ringO = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true);
U.tri = new THREE.ConeGeometry(1, 1, 3, 1);
const fract = x => x - Math.floor(x);
function buildMonsterGeo(look, hi) {
  const o = look.o, M = o.monster, fem = !!o.female, G = new GeoBuilder(true);
  const SPH = hi ? U.sphHi : U.sphLo, SPM = hi ? U.sphMid : U.sphLo, LO = U.sphLo, SEG = hi ? 14 : 7;
  const N = camoN, C = lin, GL = { glow: true }, FL = { flip: true };
  const one = b => [[b, 1]];
  const torsoW = (x, y) => {
    if (y < 1.0) return [[1, 1]];
    if (y < 1.1) { const t = (y - 1.0) / 0.1; return [[1, 1 - t], [2, t]]; }
    if (y < 1.17) return [[2, 1]];
    if (y < 1.3) { const t = (y - 1.17) / 0.13; return [[2, 1 - t], [3, t]]; }
    if (y < 1.46) return [[3, 1]];
    const t = clamp((y - 1.46) / 0.08, 0, 1); return [[3, 1 - t * 0.6], [4, t * 0.6]];
  };
  const limbW = (bone, parent, jy, bl = 0.1) => (x, y) => { const t = jy - y, wp = 0.5 * clamp(1 - t / bl, 0, 1); return wp > 0.002 ? [[bone, 1 - wp], [parent, wp]] : [[bone, 1]]; };
  const skirtW = (x, y) => { if (y > 0.9) return [[1, 1]]; const t = clamp((0.9 - y) / 0.45, 0, 1) * 0.7; return [[1, 1 - t], [x < 0 ? 12 : 15, t]]; };
  const tint = (c, x, y, z, f = 40, a = 0.16) => mul3(c, 1 - a / 2 + N.n(x * f + 7.3, y * f + z * f * 0.7) * a);
  const gC = C(o.glow || 0xffa030);
  // ---------- generic parts
  const torso = (fn, sx = 1.08, sz = 0.64, prof = PROF_M) => G.add(latheFrom(prof, hi ? 22 : 10), mtx(0, 0, 0.004, sx, 1, sz), fn, torsoW);
  const pelvis = (fn, k = 1) => G.add(SPH, mtx(0, 0.935, 0.008, 0.168 * k, 0.12, 0.118 * k), fn, (x, y) => y > 0.99 ? [[1, 0.75], [2, 0.25]] : y < 0.88 ? [[1, 0.6], [x < 0 ? 12 : 15, 0.4]] : [[1, 1]]);
  const hand = (x, s, hb, fa, fh, claws, hk = 1) => {
    G.add(SPM, mtx(x, 0.835, -0.004, 0.026 * hk, 0.05 * hk, 0.041 * hk), fh, [[hb, 0.85], [fa, 0.15]]);
    G.add(SPM, mtx(x, 0.773 - (hk - 1) * 0.04, -0.012, 0.023 * hk, 0.046 * hk, 0.036 * hk), fh, one(hb));
    G.add(SPM, mtx(x - s * 0.02 * hk, 0.83, -0.04, 0.012 * hk, 0.03 * hk, 0.013 * hk, -0.4, 0, 0), fh, one(hb));
    if (claws) for (const dz of [-0.028, -0.009, 0.01, 0.028]) G.add(U.cone, mtx(x, 0.715 - (hk - 1) * 0.08, dz * hk - 0.012, 0.0065, 0.04, 0.0065, Math.PI, 0, 0), C(claws), one(hb));
  };
  const arms = (fu, ff, fh, k = 1, opt = {}) => {
    for (const s of [-1, 1]) {
      const ua = s < 0 ? 6 : 9, fa = ua + 1, hb = ua + 2, x = s * 0.2 * (opt.wide || 1);
      G.add(SPM, mtx(x, 1.415, 0, 0.064 * k, 0.06 * k, 0.066 * k), fu, [[ua, 0.55], [3, 0.45]]);
      G.add(tubeGeo(0.053 * k, 0.044 * k, 0.27, SEG), mtx(x, 1.42, 0), fu, limbW(ua, 3, 1.42, 0.08));
      G.add(SPM, mtx(x, 1.138, 0, 0.044 * k, 0.044 * k, 0.044 * k), ff, [[fa, 0.5], [ua, 0.5]]);
      G.add(tubeGeo(0.044 * k, 0.034 * k, 0.235, SEG), mtx(x, 1.135, 0), ff, limbW(fa, ua, 1.135, 0.07));
      hand(x, s, hb, fa, fh, opt.claws, opt.hk || 1);
    }
  };
  const legs = (ft, fs, fb, k = 1, opt = {}) => {
    for (const s of [-1, 1]) {
      const th = s < 0 ? 12 : 15, sn = th + 1, fo = th + 2, x = s * 0.095;
      G.add(tubeGeo(0.088 * k, 0.061 * k, 0.41, SEG + 2), mtx(x, 0.92, 0.004), ft, limbW(th, 1, 0.92, 0.1));
      G.add(SPM, mtx(x, 0.502, 0, 0.062 * k, 0.062 * k, 0.062 * k), opt.knee || ft, [[sn, 0.5], [th, 0.5]]);
      G.add(tubeGeo(0.059 * k, 0.044 * k, 0.38, SEG), mtx(x, 0.5, 0.003), fs, limbW(sn, th, 0.5, 0.08));
      if (!opt.bare) G.add(tubeGeo(0.056, 0.052, 0.14, SEG), mtx(x, 0.2, 0.003), fb, one(sn));
      G.add(SPM, mtx(x, 0.062, -0.045, 0.053 * (opt.footW || 1), 0.05, 0.118 * (opt.footL || 1)), fb, [[fo, 0.8], [sn, 0.2]]);
      if (!opt.bare) G.add(U.box, mtx(x, 0.013, -0.045, 0.108, 0.026, 0.255), opt.sole || C(0x111111), one(fo));
      if (opt.toeClaws) for (const dx of [-0.03, 0, 0.03]) G.add(U.cone, mtx(x + dx, 0.03, -0.045 - 0.118 * (opt.footL || 1), 0.008, 0.045, 0.008, -Math.PI / 2, 0, 0), C(opt.toeClaws), one(fo));
      if (opt.pointy) G.add(U.cone, mtx(x, 0.05, -0.19, 0.034, 0.13, 0.03, -Math.PI / 2 - 0.3, 0, 0), fb, one(fo));
    }
  };
  const neck = (fn, r = 0.05) => G.add(U.cyl, mtx(0, 1.545, 0.006, r, 0.16, r * 1.04), fn, (x, y) => y > 1.58 ? [[4, 0.5], [5, 0.5]] : [[4, 1]]);
  const head = (fn, jawFn) => { G.add(SPH, mtx(0, 1.712, 0.006, 0.0885, 0.115, 0.108), fn, one(5)); G.add(SPH, mtx(0, 1.648, -0.016, 0.07, 0.058, 0.08), jawFn || fn, one(5)); };
  const ears = (fn, only) => { for (const s of [-1, 1]) if (!only || only === s) G.add(SPM, mtx(s * 0.089, 1.698, 0.004, 0.012, 0.028, 0.019), fn, one(5)); };
  const nose = (fn, k = 1) => { G.add(SPM, mtx(0, 1.69, -0.103, 0.0145 * k, 0.027 * k, 0.02 * k, -0.25), fn, one(5)); G.add(SPM, mtx(0, 1.676, -0.112 - (k - 1) * 0.01, 0.0135 * k, 0.012 * k, 0.012 * k), fn, one(5)); };
  const lips = (c) => { G.add(SPM, mtx(0, 1.648, -0.097, 0.023, 0.0065, 0.011), c, one(5)); G.add(SPM, mtx(0, 1.637, -0.095, 0.021, 0.0078, 0.011), c, one(5)); };
  const eyes = (sclera, irisGlow, opt = {}) => {
    for (const s of [-1, 1]) {
      const ex = s * 0.034;
      if (opt.only && opt.only !== s) { G.add(SPM, mtx(ex, 1.716, -0.093, 0.016, 0.01, 0.01), opt.closed || C(0x111111), one(5)); continue; }
      if (opt.socket) G.add(SPM, mtx(ex, 1.716, -0.09, 0.021, 0.019, 0.013), opt.socket, one(5));
      if (hi) {
        if (sclera) G.add(LO, mtx(ex, 1.716, -0.093, 0.0145, 0.0145, 0.0145), sclera, one(5));
        G.add(LO, mtx(ex, 1.716, sclera ? -0.1032 : -0.098, 0.0085 * (opt.big || 1), 0.0085 * (opt.big || 1), 0.006), gC, one(5), null, GL);
      } else G.add(LO, mtx(ex, 1.716, -0.097, 0.012, 0.01, 0.01), gC, one(5), null, GL);
      if (opt.brow) G.add(U.box, mtx(ex, 1.7385, -0.098, 0.036, 0.008, 0.013, 0, 0, s * (opt.browTilt || 0)), opt.brow, one(5));
    }
  };
  const spheresAlong = (fnP, n, r0, r1, col, w) => { for (let i = 0; i <= n; i++) { const t = i / n, p = fnP(t), r = lerp(r0, r1, t); G.add(SPM, mtx(p[0], p[1], p[2], r, r, r), typeof col === 'function' && col.length === 1 ? col(t) : col, w); } };

  if (M === 'zombie') {
    const zs = C(0x8c9a76), rot = C(0x5c6a4a), wound = C(0x4a1612);
    const zSkin = (x, y, z) => { const v = N.fbm(x * 11 + 2, y * 11 + z * 7, 3); let c = mix3(zs, rot, smooth(0.45, 0.7, v)); if (v > 0.72) c = mix3(c, wound, smooth(0.72, 0.8, v)); return tint(c, x, y, z, 60, 0.12); };
    const shirt = C(0x56677a), stain = C(0x3a2e22), trou = C(0x5a4a36);
    const zTop = (x, y, z) => { const v = N.fbm(x * 14 + 9, y * 14 - z * 9, 3); if (v > 0.7) return zSkin(x, y, z); let c = mix3(shirt, stain, smooth(0.5, 0.68, v) * 0.8); if (z < 0 && Math.abs(x) < 0.006 && y > 1.0) c = C(0x2a2a2a); return tint(c, x, y, z, 40, 0.2); };
    const zPants = (x, y, z) => { const v = N.fbm(x * 13 - 4, y * 13 + z * 9, 3); if (v > 0.74) return zSkin(x, y, z); return tint(mix3(trou, stain, smooth(0.5, 0.7, v) * 0.7), x, y, z, 40, 0.2); };
    torso(zTop); pelvis(zPants);
    G.add(U.cyl, mtx(0, 0.99, 0.004, 0.173, 0.04, 0.108), C(0x2a2018), torsoW);
    arms((x, y, z) => x > 0 && y < 1.3 ? zSkin(x, y, z) : zTop(x, y, z), (x, y, z) => x > 0 ? zSkin(x, y, z) : zTop(x, y, z), zSkin, 1, { claws: 0x3a3424 });
    legs(zPants, (x, y, z) => x < 0 && y < 0.42 ? zSkin(x, y, z) : zPants(x, y, z), C(0x3a3028), 1, { sole: C(0x1a1612) });
    neck(zSkin); head(zSkin);
    const hairC = C(0x2a2018);
    G.add(hi ? U.capHi : U.capLo, mtx(0, 1.72, 0.012, 0.0955, 0.124, 0.116, 0.55), (x, y, z) => N.n(x * 34 + 3, y * 34 + z * 24) > 0.52 ? hairC : mul3(zSkin(x, y, z), 0.9), one(5));
    eyes(C(0xd8cc90), true, { socket: C(0x2a2018), brow: hairC });
    nose(zSkin); ears(zSkin, -1);
    G.add(SPM, mtx(0, 1.642, -0.094, 0.025, 0.011, 0.012), C(0x2a0a08), one(5));
    if (hi) for (let i = -2; i <= 2; i++) G.add(U.box, mtx(i * 0.008, 1.649, -0.103, 0.006, 0.009, 0.004), C(0xc8bc90), one(5));
    G.add(SPM, mtx(0.052, 1.672, -0.078, 0.016, 0.02, 0.012), wound, one(5));
  } else if (M === 'skeleton') {
    const B = C(0xe6dcc2), Bd = C(0x9a8a6a), dark = C(0x0b0908);
    const bone = (x, y, z) => tint(mix3(B, Bd, smooth(0.45, 0.8, N.fbm(x * 22, y * 22 + z * 15, 2))), x, y, z, 70, 0.1);
    // skull
    G.add(SPH, mtx(0, 1.73, 0.01, 0.09, 0.1, 0.105), bone, one(5));
    G.add(SPH, mtx(0, 1.668, -0.02, 0.068, 0.05, 0.075), bone, one(5));
    G.add(SPM, mtx(0, 1.626, -0.03, 0.058, 0.026, 0.062), bone, one(5));
    G.add(SPM, mtx(0, 1.738, -0.074, 0.074, 0.02, 0.04), bone, one(5));
    for (const s of [-1, 1]) {
      G.add(SPM, mtx(s * 0.034, 1.714, -0.083, 0.025, 0.023, 0.02), dark, one(5));
      G.add(LO, mtx(s * 0.034, 1.714, -0.098, 0.0075, 0.0075, 0.004), gC, one(5), null, GL);
      G.add(SPM, mtx(s * 0.062, 1.682, -0.06, 0.02, 0.014, 0.03), bone, one(5));
    }
    G.add(SPM, mtx(0, 1.678, -0.094, 0.011, 0.016, 0.01), dark, one(5));
    for (let i = -3; i <= 3; i++) { G.add(U.box, mtx(i * 0.0095, 1.649, -0.088 + Math.abs(i) * 0.004, 0.0075, 0.016, 0.007), B, one(5)); if (hi) G.add(U.box, mtx(i * 0.0095, 1.632, -0.084 + Math.abs(i) * 0.004, 0.007, 0.012, 0.007), B, one(5)); }
    // neck & spine
    for (let k = 0; k < 4; k++) G.add(SPM, mtx(0, 1.5 + k * 0.034, 0.025, 0.021, 0.014, 0.021), bone, k > 2 ? [[4, 0.5], [5, 0.5]] : one(4));
    for (let y = 0.98; y < 1.47; y += 0.036) G.add(SPM, mtx(0, y, 0.07, 0.026, 0.015, 0.024), bone, torsoW(0, y));
    // ribcage
    for (let i = 0; i < 7; i++) { const y = 1.41 - i * 0.037, r = (i === 0 ? 0.11 : 0.145 - Math.max(0, i - 3) * 0.01); G.add(U.ringO, mtx(0, y, 0.005, r * 1.06, 0.015, r * 0.72, -0.32), bone, torsoW(0, y)); }
    G.add(U.box, mtx(0, 1.32, -0.098, 0.028, 0.17, 0.016, 0.1), bone, one(3));
    for (const s of [-1, 1]) {
      G.add(U.cyl, mtx(s * 0.11, 1.45, -0.03, 0.011, 0.17, 0.011, 0, 0, Math.PI / 2), bone, one(3));
      G.add(SPM, mtx(s * 0.1, 1.36, 0.075, 0.06, 0.075, 0.014), bone, one(3));
    }
    // pelvis + rags
    G.add(SPH, mtx(0, 0.95, 0.012, 0.13, 0.062, 0.08), bone, (x, y) => [[1, 1]]);
    const rag = (x, y, z) => { const c = C(0x2a2228); return y < 0.86 && N.n(x * 40, z * 40) > 0.6 ? C(0x15121a) : tint(c, x, y, z, 30, 0.3); };
    G.add(latheFrom([[0.16, 0.995], [0.17, 0.93], [0.19, 0.84], [0.188, 0.83]], hi ? 18 : 9), mtx(0, 0, 0.01, 1, 1, 0.72), rag, skirtW);
    G.add(latheFrom([[0.16, 0.995], [0.17, 0.93], [0.19, 0.84], [0.188, 0.83]], hi ? 18 : 9), mtx(0, 0, 0.01, 0.99, 1, 0.71), rag, skirtW, null, FL);
    // arms
    for (const s of [-1, 1]) {
      const ua = s < 0 ? 6 : 9, fa = ua + 1, hb = ua + 2, x = s * 0.2;
      G.add(SPM, mtx(x, 1.415, 0, 0.034, 0.034, 0.034), bone, [[ua, 0.6], [3, 0.4]]);
      G.add(tubeGeo(0.021, 0.018, 0.27, SEG), mtx(x, 1.42, 0), bone, one(ua));
      G.add(SPM, mtx(x, 1.138, 0, 0.03, 0.028, 0.03), bone, [[fa, 0.5], [ua, 0.5]]);
      for (const dz of [-0.011, 0.011]) G.add(tubeGeo(0.012, 0.01, 0.235, hi ? 8 : 5), mtx(x, 1.135, dz), bone, one(fa));
      G.add(SPM, mtx(x, 0.9, 0, 0.02, 0.016, 0.026), bone, one(fa));
      G.add(SPM, mtx(x, 0.85, -0.005, 0.016, 0.034, 0.028), bone, one(hb));
      for (const dz of [-0.022, -0.007, 0.008, 0.022]) G.add(U.cylLo, mtx(x, 0.785, dz - 0.005, 0.0055, 0.07, 0.0055), bone, one(hb));
      G.add(U.cylLo, mtx(x - s * 0.016, 0.83, -0.04, 0.006, 0.05, 0.006, -0.5), bone, one(hb));
    }
    for (const s of [-1, 1]) {
      const th = s < 0 ? 12 : 15, sn = th + 1, fo = th + 2, x = s * 0.095;
      G.add(SPM, mtx(x, 0.91, 0, 0.036, 0.036, 0.036), bone, [[th, 0.6], [1, 0.4]]);
      G.add(tubeGeo(0.029, 0.024, 0.41, SEG), mtx(x, 0.92, 0), bone, one(th));
      G.add(SPM, mtx(x, 0.5, 0, 0.038, 0.036, 0.038), bone, [[sn, 0.5], [th, 0.5]]);
      G.add(SPM, mtx(x, 0.505, -0.036, 0.022, 0.026, 0.012), bone, one(sn));
      G.add(tubeGeo(0.024, 0.019, 0.38, SEG), mtx(x, 0.5, 0), bone, one(sn));
      G.add(tubeGeo(0.01, 0.009, 0.36, hi ? 6 : 4), mtx(x + s * 0.024, 0.49, 0.01), bone, one(sn));
      G.add(SPM, mtx(x, 0.085, 0.005, 0.026, 0.024, 0.026), bone, one(fo));
      G.add(SPM, mtx(x, 0.035, -0.06, 0.034, 0.022, 0.1), bone, one(fo));
      if (hi) for (const dx of [-0.022, -0.007, 0.008, 0.022]) G.add(U.cylLo, mtx(x + dx, 0.022, -0.155, 0.007, 0.05, 0.007, -Math.PI / 2), bone, one(fo));
    }
  } else if (M === 'vampire') {
    const sk = C(0xe2dde4), skB = C(0xb8b0c8);
    const vSkin = (x, y, z) => tint(mix3(sk, skB, N.fbm(x * 12, y * 12 + z * 9, 2) * 0.5), x, y, z, 60, 0.08);
    const jacket = C(0x141218), vest = C(0x5a0a14), white = C(0xe8e4dc), red = C(0x7a0a18);
    const vTop = (x, y, z) => {
      let c = jacket;
      if (z < 0 && Math.abs(x) < 0.062 && y > 1.03 && y < 1.44) c = vest;
      if (z < 0 && Math.abs(x) < 0.022 && y > 1.36) c = white;
      if (z < 0 && Math.abs(x) < 0.004 && y > 1.03 && y < 1.36) c = C(0x2a0408);
      return tint(c, x, y, z, 40, 0.14);
    };
    torso(vTop); pelvis(C(0x101014));
    G.add(U.cyl, mtx(0, 0.99, 0.004, 0.174, 0.036, 0.108), C(0x0a0a0a), torsoW);
    arms(vTop, jacket, vSkin, 1, { claws: 0x2a1a22 });
    for (const s of [-1, 1]) G.add(U.cyl, mtx(s * 0.2, 0.905, 0, 0.039, 0.024, 0.039), white, one(s < 0 ? 7 : 10));
    legs((x, y, z) => tint(C(0x101014), x, y, z), C(0x101014), C(0x08080a), 1, { sole: C(0x050505) });
    neck(vSkin);
    G.add(SPM, mtx(0, 1.47, -0.068, 0.04, 0.034, 0.022), white, [[3, 0.5], [4, 0.5]]);
    G.add(U.cyl, mtx(0, 1.3, -0.118, 0.026, 0.008, 0.026, Math.PI / 2), C(0xc8a040), one(3));
    G.add(LO, mtx(0, 1.3, -0.124, 0.012, 0.012, 0.005), gC, one(3), null, GL);
    head(vSkin);
    const hc = C(0x0c0a0c);
    G.add(hi ? U.capHi : U.capLo, mtx(0, 1.722, 0.014, 0.0955, 0.124, 0.116, 0.62), hc, one(5));
    G.add(SPM, mtx(0, 1.768, -0.084, 0.02, 0.024, 0.014, 0.4), hc, one(5));
    for (const s of [-1, 1]) G.add(SPM, mtx(s * 0.085, 1.7, 0.012, 0.011, 0.034, 0.02), hc, one(5));
    eyes(C(0xf2e8e8), true, { brow: hc, browTilt: 0.28 });
    nose(vSkin, 1.08); ears((x, y, z) => vSkin(x, y, z)); lips(C(0x6a2a3a));
    for (const s of [-1, 1]) G.add(U.cone, mtx(s * 0.011, 1.632, -0.099, 0.0042, 0.015, 0.0042, Math.PI), white, one(5));
    // cape + collar (outside black, inside red)
    const capeW = (x, y) => y > 1.3 ? [[3, 1]] : y > 1.05 ? [[3, (y - 1.05) / 0.25], [2, 1 - (y - 1.05) / 0.25]] : [[2, 0.45], [1, 0.55]];
    const cp = [[0.205, 1.47], [0.23, 1.34], [0.29, 1.05], [0.34, 0.75], [0.37, 0.5], [0.36, 0.47]];
    const capeOut = (x, y, z) => tint(C(0x0e0c12), x, y, z, 20, 0.2);
    G.add(latheFrom(cp, hi ? 20 : 10, -Math.PI * 0.62, Math.PI * 1.24), mtx(0, 0, 0.03, 1.12, 1, 0.74), capeOut, capeW);
    G.add(latheFrom(cp, hi ? 20 : 10, -Math.PI * 0.62, Math.PI * 1.24), mtx(0, 0, 0.03, 1.1, 1, 0.72), red, capeW, null, FL);
    const col = [[0.1, 1.45], [0.13, 1.56], [0.165, 1.68]];
    G.add(latheFrom(col, hi ? 16 : 8, -Math.PI * 0.72, Math.PI * 1.44), mtx(0, 0, 0.01, 1, 1, 0.95), C(0x0e0c12), [[3, 0.6], [4, 0.4]]);
    G.add(latheFrom(col, hi ? 16 : 8, -Math.PI * 0.72, Math.PI * 1.44), mtx(0, 0, 0.01, 0.97, 1, 0.92), red, [[3, 0.6], [4, 0.4]], null, FL);
  } else if (M === 'pumpkin') {
    const red = C(0x8a1c18), blk = C(0x1a1414), mid = C(0x521814);
    const plaid = (x, y, z) => { const a = Math.floor(x * 26 + 40 + z * 10), b = Math.floor(y * 26); const c = (a % 2 === 0 && b % 2 === 0) ? blk : (a % 2 === 0 || b % 2 === 0) ? mid : red; return tint(c, x, y, z, 50, 0.18); };
    const denim = C(0x3c5070), patch = C(0x8a6a3a);
    const jeans = (x, y, z) => { if (x > 0.05 && x < 0.13 && y > 0.62 && y < 0.72 && z < 0) return patch; return tint(denim, x, y, z, 50, 0.2); };
    torso(plaid); pelvis(jeans);
    G.add(U.box, mtx(0, 1.17, -0.098, 0.2, 0.22, 0.03), jeans, torsoW);
    for (const s of [-1, 1]) {
      G.add(U.box, mtx(s * 0.075, 1.37, -0.098, 0.034, 0.2, 0.018, -0.12), jeans, one(3));
      G.add(U.box, mtx(s * 0.075, 1.3, 0.098, 0.034, 0.32, 0.018), jeans, torsoW);
      G.add(LO, mtx(s * 0.075, 1.27, -0.116, 0.012, 0.012, 0.006), C(0xc8a040), one(3));
    }
    const burlap = (x, y, z) => tint(C(0x9a8456), x, y, z, 90, 0.3);
    arms(plaid, plaid, burlap, 1);
    legs(jeans, jeans, C(0x4a3020), 1, { sole: C(0x1a120c) });
    const straw = C(0xd8b84a);
    const strawAt = (x, y, z, ang, w, n) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; G.add(U.cone, mtx(x + Math.cos(a) * 0.03, y, z + Math.sin(a) * 0.03, 0.006, 0.06, 0.006, ang + Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35), mul3(straw, 0.8 + (i % 3) * 0.1), w); } };
    for (const s of [-1, 1]) { strawAt(s * 0.2, 0.89, 0, Math.PI, one(s < 0 ? 7 : 10), hi ? 6 : 3); strawAt(s * 0.095, 0.27, 0, Math.PI, one(s < 0 ? 13 : 16), hi ? 5 : 3); }
    strawAt(0, 1.5, 0, 0, [[3, 0.5], [4, 0.5]], hi ? 9 : 4);
    G.add(U.cyl, mtx(0, 1.55, 0.006, 0.058, 0.13, 0.06), burlap, (x, y) => y > 1.58 ? [[4, 0.5], [5, 0.5]] : [[4, 1]]);
    const o1 = C(0xe2701c), o2 = C(0x9a3a0c);
    const pk = (x, y, z) => { const a = Math.atan2(x, z - 0.0), g = Math.abs(Math.cos(a * 5)); return tint(mul3(mix3(o2, o1, Math.pow(g, 0.5)), 0.8 + 0.2 * clamp((y - 1.62) / 0.26, 0, 1)), x, y, z, 50, 0.1); };
    G.add(SPH, mtx(0, 1.75, 0, 0.165, 0.14, 0.165), pk, one(5), (v) => { const dx = v.x, dz = v.z, a = Math.atan2(dx, dz), k = 0.9 + 0.1 * Math.pow(Math.abs(Math.cos(a * 5)), 0.5); v.x = dx * k; v.z = dz * k; });
    // carved glowing face
    for (const s of [-1, 1]) G.add(U.tri, mtx(s * 0.058, 1.777, -0.146, 0.032, 0.042, 0.012), gC, one(5), null, GL);
    G.add(U.tri, mtx(0, 1.745, -0.158, 0.016, 0.022, 0.01), gC, one(5), null, GL);
    G.add(U.box, mtx(0, 1.703, -0.152, 0.06, 0.028, 0.012), gC, one(5), null, GL);
    for (const s of [-1, 1]) G.add(U.box, mtx(s * 0.05, 1.712, -0.146, 0.05, 0.025, 0.012, 0, s * 0.35, -s * 0.38), gC, one(5), null, GL);
    for (const s of [-1, 1]) G.add(U.box, mtx(s * 0.018, 1.712, -0.157, 0.012, 0.014, 0.012), o1, one(5));
    // straw hat
    const hat = (x, y, z) => tint(C(0xc8a862), x, y, z, 120, 0.25);
    G.add(U.cyl, mtx(0, 1.865, 0.005, 0.25, 0.012, 0.25, -0.08, 0, 0.05), hat, one(5));
    G.add(U.cyl, mtx(0, 1.915, 0.008, 0.12, 0.1, 0.12, -0.08, 0, 0.05), hat, one(5));
    G.add(U.cyl, mtx(0, 1.885, 0.007, 0.123, 0.025, 0.123, -0.08, 0, 0.05), C(0x6a2a1a), one(5));
  } else if (M === 'mummy') {
    const b1 = C(0xd8ccae), b2 = C(0xb0a080), grime = C(0x6a5a40);
    const band = (x, y, z) => {
      const a = Math.atan2(x, z), yy = y * 34 + Math.sin(a + x * 8) * 0.6 + (x > 0 ? 0.3 : 0), bi = Math.floor(yy), f = yy - bi;
      const h = fract(Math.sin(bi * 12.9898) * 43758.5);
      let c = mix3(b1, b2, h); if (f < 0.12) c = mul3(c, 0.55);
      c = mix3(c, grime, smooth(0.55, 0.8, N.fbm(x * 9, y * 9 + z * 7, 2)) * 0.6);
      return tint(c, x, y, z, 50, 0.1);
    };
    torso(band, 1.02, 0.62); pelvis(band); arms(band, band, band, 0.97); legs(band, band, band, 0.97, { bare: true });
    neck(band); head(band);
    eyes(null, true, { only: -1, socket: C(0x0a0806), closed: C(0x2a2418), big: 1.2 });
    nose(band);
    G.add(U.box, mtx(0.205, 0.95, -0.03, 0.03, 0.2, 0.004, 0.1), band, one(10));
    G.add(U.box, mtx(-0.12, 0.84, -0.09, 0.032, 0.22, 0.004, 0, 0.3), band, one(1));
    G.add(U.box, mtx(0.07, 1.62, 0.1, 0.03, 0.22, 0.004, -0.3), band, one(5));
  } else if (M === 'wolf') {
    const fur = C(0x4e3e30), furL = C(0x8a7458), furD = C(0x2a2018);
    const furFn = (x, y, z) => { const v = N.fbm(x * 30 + 1, y * 30 + z * 24, 3); let c = mix3(furD, fur, clamp(v * 1.4, 0, 1)); if (z < -0.05 && Math.abs(x) < 0.09 && y > 1.0 && y < 1.45) c = mix3(c, furL, 0.55); return c; };
    const jeans = C(0x34465e);
    const shorts = (x, y, z) => { const edge = 0.64 + (N.n(x * 60, z * 60) - 0.5) * 0.08; return y > edge ? tint(jeans, x, y, z, 50, 0.2) : furFn(x, y, z); };
    torso(furFn, 1.24, 0.74); pelvis(shorts, 1.08);
    arms(furFn, furFn, furFn, 1.18, { claws: 0x161210, hk: 1.25, wide: 1.06 });
    legs(shorts, furFn, furFn, 1.1, { bare: true, footL: 1.3, footW: 1.2, toeClaws: 0x161210 });
    for (const s of [-1, 1]) { G.add(SPM, mtx(s * 0.19, 1.47, 0.02, 0.09, 0.07, 0.09), furFn, [[3, 0.6], [s < 0 ? 6 : 9, 0.4]]); G.add(SPM, mtx(s * 0.21, 1.13, 0.04, 0.04, 0.05, 0.05), furFn, one(s < 0 ? 7 : 10)); }
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; G.add(SPM, mtx(Math.sin(a) * 0.09, 1.53 + (Math.cos(a) > 0 ? 0.02 : 0), Math.cos(a) * 0.08, 0.06, 0.06, 0.06), furFn, [[3, 0.5], [4, 0.5]]); }
    neck(furFn, 0.07);
    G.add(SPH, mtx(0, 1.73, 0.0, 0.1, 0.1, 0.11), furFn, one(5));
    G.add(SPH, mtx(0, 1.676, -0.125, 0.052, 0.045, 0.1), (x, y, z) => mix3(furFn(x, y, z), furL, smooth(-0.12, -0.2, z) * 0.6), one(5));
    G.add(SPM, mtx(0, 1.692, -0.222, 0.022, 0.016, 0.016), C(0x0c0a0a), one(5));
    G.add(SPM, mtx(0, 1.64, -0.115, 0.042, 0.022, 0.08), furL, one(5));
    G.add(SPM, mtx(0, 1.652, -0.13, 0.045, 0.006, 0.086), C(0x2a0808), one(5));
    for (const s of [-1, 1]) {
      G.add(U.cone, mtx(s * 0.022, 1.643, -0.19, 0.005, 0.02, 0.005, Math.PI), C(0xece4d0), one(5));
      G.add(U.cone, mtx(s * 0.02, 1.652, -0.165, 0.004, 0.016, 0.004), C(0xece4d0), one(5));
      G.add(U.cone, mtx(s * 0.06, 1.83, 0.01, 0.032, 0.085, 0.02, 0, 0, -s * 0.3), furFn, one(5));
      G.add(SPM, mtx(s * 0.04, 1.752, -0.093, 0.03, 0.012, 0.02, 0, 0, -s * 0.25), furD, one(5));
      G.add(SPM, mtx(s * 0.075, 1.67, -0.03, 0.04, 0.05, 0.05), furFn, one(5));
      G.add(LO, mtx(s * 0.04, 1.735, -0.098, 0.013, 0.009, 0.007), gC, one(5), null, GL);
    }
  } else if (M === 'witch') {
    const sk = C(0x9fbe8a);
    const wSkin = (x, y, z) => tint(sk, x, y, z, 60, 0.1);
    const dress = C(0x24182e), dress2 = C(0x4a2a5e);
    const wTop = (x, y, z) => { let c = dress; if (z < 0 && Math.abs(x) < 0.035 && y > 1.03 && y < 1.3) { const k = Math.abs(fract((y + Math.abs(x)) * 28) - 0.5) < 0.12 ? C(0x9a6ab8) : dress2; c = k; } return tint(c, x, y, z, 40, 0.16); };
    torso(wTop, 1.02, 0.64, PROF_F);
    arms(wTop, wTop, wSkin, 0.92, { claws: 0x1a2a14 });
    for (const s of [-1, 1]) { const g = latheFrom([[0.038, 0.99], [0.05, 0.94], [0.075, 0.87], [0.072, 0.865]], hi ? 14 : 7); G.add(g, mtx(s * 0.2, 0, 0), dress2, one(s < 0 ? 7 : 10)); G.add(g, mtx(s * 0.2, 0, 0, 0.97, 1, 0.97), dress, one(s < 0 ? 7 : 10), null, FL); }
    const stripe = (x, y, z) => Math.floor(y * 30) % 2 ? C(0x5a2a7a) : C(0x111014);
    legs(stripe, stripe, C(0x0e0a10), 0.95, { pointy: true, sole: C(0x050505) });
    const hem = (x, y, z) => { const c = y < 0.5 + N.n(x * 50, z * 50) * 0.05 ? C(0x140c1a) : dress; return tint(c, x, y, z, 30, 0.22); };
    const sp = [[0.165, 0.99], [0.2, 0.86], [0.26, 0.67], [0.31, 0.47], [0.3, 0.45]];
    G.add(latheFrom(sp, hi ? 22 : 10), mtx(0, 0, 0.01, 1, 1, 0.8), hem, skirtW);
    G.add(latheFrom(sp, hi ? 22 : 10), mtx(0, 0, 0.01, 0.98, 1, 0.78), dress, skirtW, null, FL);
    G.add(U.cyl, mtx(0, 0.995, 0.004, 0.166, 0.04, 0.105), C(0x5a2a7a), torsoW);
    neck(wSkin, 0.046); head(wSkin);
    const hc = C(0x0e0a0e);
    G.add(hi ? U.capHi : U.capLo, mtx(0, 1.72, 0.012, 0.0955, 0.124, 0.116, 0.55), hc, one(5));
    G.add(SPH, mtx(0, 1.58, 0.07, 0.1, 0.17, 0.058), hc, one(5));
    for (const s of [-1, 1]) G.add(SPM, mtx(s * 0.088, 1.62, 0.012, 0.03, 0.12, 0.042), hc, one(5));
    eyes(C(0xe8eedc), true, { brow: hc, browTilt: 0.2 });
    G.add(SPM, mtx(0, 1.688, -0.108, 0.016, 0.03, 0.026, -0.4), wSkin, one(5));
    G.add(SPM, mtx(0, 1.668, -0.128, 0.012, 0.014, 0.012), wSkin, one(5));
    G.add(LO, mtx(0.012, 1.684, -0.124, 0.0055, 0.0055, 0.0055), C(0x5a6a3a), one(5));
    lips(C(0x3a1a3a)); ears(wSkin);
    const hatC = (x, y, z) => tint(C(0x16101c), x, y, z, 30, 0.2);
    G.add(U.cyl, mtx(0, 1.808, 0.006, 0.22, 0.01, 0.22, -0.1), hatC, one(5));
    G.add(U.cone, mtx(0, 1.975, 0.03, 0.105, 0.34, 0.105, -0.16), hatC, one(5));
    G.add(U.cone, mtx(0, 2.155, 0.1, 0.034, 0.12, 0.034, -0.95), hatC, one(5));
    G.add(U.cyl, mtx(0, 1.838, 0.01, 0.1, 0.036, 0.1, -0.16), C(0x5a2a7a), one(5));
    G.add(U.box, mtx(0, 1.84, -0.088, 0.032, 0.03, 0.01, -0.16), C(0xd0a83a), one(5));
  } else if (M === 'demon') {
    const ds = C(0x8e1f1a), dk = C(0x420a08);
    const dSkin = (x, y, z) => tint(mix3(ds, dk, smooth(0.5, 0.8, N.fbm(x * 14, y * 14 + z * 9, 2)) * 0.6), x, y, z, 60, 0.12);
    const dTorso = (x, y, z) => {
      let c = dSkin(x, y, z);
      if (z < 0 && y > 1.0 && y < 1.24 && Math.abs(x) < 0.075 && (Math.abs(x) < 0.005 || Math.abs(fract(y * 22) - 0.5) < 0.07)) c = mix3(c, dk, 0.75);
      if (z < 0 && y > 1.27 && y < 1.3 && Math.abs(x) < 0.15) c = mix3(c, dk, 0.6);
      return c;
    };
    torso(dTorso, 1.14, 0.67);
    const armor = (x, y, z) => tint(C(0x18141a), x, y, z, 40, 0.25);
    pelvis(armor);
    G.add(U.cyl, mtx(0, 0.99, 0.004, 0.176, 0.045, 0.11), C(0x0e0a0a), torsoW);
    G.add(SPM, mtx(0, 0.99, -0.112, 0.03, 0.03, 0.012), C(0xd8ccb0), one(1));
    arms(dSkin, (x, y, z) => y < 1.06 && y > 0.92 ? armor(x, y, z) : dSkin(x, y, z), dSkin, 1.06, { claws: 0x0a0606 });
    for (const s of [-1, 1]) {
      G.add(SPM, mtx(s * 0.21, 1.45, 0.0, 0.085, 0.05, 0.085), armor, [[3, 0.5], [s < 0 ? 6 : 9, 0.5]]);
      G.add(U.cone, mtx(s * 0.24, 1.5, 0.0, 0.016, 0.07, 0.016, 0, 0, -s * 0.5), C(0xc8bca0), one(s < 0 ? 6 : 9));
      G.add(U.cone, mtx(s * 0.24, 1.0, 0.0, 0.01, 0.05, 0.01, 0, 0, -s * Math.PI / 2), C(0xc8bca0), one(s < 0 ? 7 : 10));
    }
    legs(armor, armor, C(0x120c0c), 1.02, { knee: C(0x2a2228), sole: C(0x050303) });
    for (const s of [-1, 1]) G.add(U.cone, mtx(s * 0.095, 0.51, -0.075, 0.014, 0.06, 0.014, -Math.PI / 2), C(0xc8bca0), one(s < 0 ? 13 : 16));
    neck(dSkin, 0.056); head(dSkin);
    eyes(null, true, { brow: dk, browTilt: 0.32, big: 1.25 });
    nose(dSkin); lips(C(0x2a0606));
    for (const s of [-1, 1]) {
      G.add(U.cone, mtx(s * 0.012, 1.632, -0.099, 0.0045, 0.014, 0.0045, Math.PI), C(0xece4d0), one(5));
      G.add(U.cone, mtx(s * 0.098, 1.712, 0.012, 0.014, 0.055, 0.012, 0, 0, -s * 1.15), dSkin, one(5));
      spheresAlong(t => [s * (0.048 + 0.07 * t), 1.79 + 0.13 * Math.sin(t * 1.7), -0.03 + 0.12 * t * t], hi ? 9 : 4, 0.024, 0.004, t => mix3(C(0x2a2220), C(0xd8ccb0), t * t), one(5));
    }
    spheresAlong(t => [0.04 * Math.sin(t * 3.2), 0.95 - 0.5 * t + 0.16 * t * t * t, 0.11 + 0.32 * t], hi ? 14 : 6, 0.022, 0.011, dSkin, one(1));
    G.add(SPM, mtx(0.04 * Math.sin(3.2), 0.61 - 0.03, 0.45, 0.04, 0.05, 0.009, 0.4), dk, one(1));
  }
  const geo = G.build();
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 1.7);
  return geo;
}

// ================= WORLD MATERIALS =================
const WM = {
  plaster: reg(new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.plaster, normalMap: TEX.plasterN, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.92 })),
  roof: reg(new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.roof, normalMap: TEX.roofN, roughness: 0.7 })),
  wood: reg(new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.wood, normalMap: TEX.woodN, roughness: 0.78 })),
  stone: reg(new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.stone, normalMap: TEX.stoneN, roughness: 0.9 })),
  glass: reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.06, metalness: 0.85 })),
  metal: reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.6 })),
  dark: reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 })),
};
const UVS = { plaster: 0.3, roof: 0.42, wood: 0.4, stone: 0.33, glass: 1, metal: 1, dark: 1 };
const TERRAIN_MAT = reg(new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.detail, normalMap: TEX.detailN, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.96 }));
const WATER_MAT = reg(new THREE.MeshStandardMaterial({ color: linC(0x183c52), roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.88, normalMap: TEX.waterN, normalScale: new THREE.Vector2(0.55, 0.55) }));
const GRASS_TIME = { value: 0 };
const GRASS_MAT = reg(new THREE.MeshStandardMaterial({ map: TEX.grass, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.95 }));
GRASS_MAT.onBeforeCompile = (sh) => {
  sh.uniforms.uTime = GRASS_TIME;
  sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat gph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;\ntransformed.x += sin(uTime * 1.8 + gph) * 0.09 * uv.y;\ntransformed.z += cos(uTime * 1.4 + gph) * 0.05 * uv.y;\n#endif');
};
const CLOUD_MAT = new THREE.SpriteMaterial({ map: TEX.cloud, color: 0xa88aa8, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
const grassGeo = (() => {
  const p = [], u = [], n = [], ix = [];
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI / 3, cx = Math.cos(a) * 0.5, sz = Math.sin(a) * 0.5, b = p.length / 3;
    p.push(-cx, 0, -sz, cx, 0, sz, cx, 0.62, sz, -cx, 0.62, -sz); u.push(0, 0, 1, 0, 1, 1, 0, 1);
    for (let i = 0; i < 4; i++) n.push(0, 1, 0);
    ix.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setIndex(ix);
  return g;
})();

class MatBatch {
  constructor() { this.b = {}; }
  g(k) { return this.b[k] || (this.b[k] = { p: [], n: [], c: [], u: [] }); }
  _push(k, verts, nrm, col, uvs) {
    const B = this.g(k), s = UVS[k] || 1;
    verts.forEach((v, i) => {
      B.p.push(v[0], v[1], v[2]); B.n.push(nrm[0], nrm[1], nrm[2]); B.c.push(col[0], col[1], col[2]);
      if (uvs) B.u.push(uvs[i][0] * s, uvs[i][1] * s);
      else { const ax = Math.abs(nrm[0]), ay = Math.abs(nrm[1]), az = Math.abs(nrm[2]); if (ax >= ay && ax >= az) B.u.push(v[2] * s, v[1] * s); else if (ay >= az) B.u.push(v[0] * s, v[2] * s); else B.u.push(v[0] * s, v[1] * s); }
    });
  }
  poly(k, pts, want, col, uvs) { // convex polygon (3 or 4 points), oriented toward `want`
    const a = pts[0], b = pts[1], c = pts[2];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    let P = pts, UV = uvs;
    if (nx * want[0] + ny * want[1] + nz * want[2] < 0) { P = pts.slice().reverse(); UV = uvs ? uvs.slice().reverse() : null; nx = -nx; ny = -ny; nz = -nz; }
    const cc = typeof col === 'number' ? lin(col) : col;
    if (P.length === 3) this._push(k, P, [nx, ny, nz], cc, UV);
    else { this._push(k, [P[0], P[1], P[2]], [nx, ny, nz], cc, UV ? [UV[0], UV[1], UV[2]] : null); this._push(k, [P[0], P[2], P[3]], [nx, ny, nz], cc, UV ? [UV[0], UV[2], UV[3]] : null); }
  }
  box(k, x0, y0, z0, x1, y1, z1, hex, skipBottom) {
    const c = lin(hex);
    this.poly(k, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], c);
    this.poly(k, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], [-1, 0, 0], c);
    this.poly(k, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], c);
    if (!skipBottom) this.poly(k, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], c);
    this.poly(k, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], c);
    this.poly(k, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, -1], c);
  }
  geo(k, geometry, m, hex) {
    const B = this.g(k), c = lin(hex), g = geometry.index ? geometry.toNonIndexed() : geometry;
    const pa = g.attributes.position, na = g.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(m), v = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(m); n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); B.p.push(v.x, v.y, v.z); B.n.push(n.x, n.y, n.z); B.c.push(c[0], c[1], c[2]); B.u.push(v.x * 0.5, v.y * 0.5); }
  }
  build(scene, disp) {
    for (const k in this.b) {
      const B = this.b[k]; if (!B.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2));
      const m = new THREE.Mesh(g, WM[k]); m.castShadow = k !== 'glass' && k !== 'lit'; m.receiveShadow = true; scene.add(m); disp.push(g);
    }
  }
}

// ================= TERRAIN LAYERS =================
// weights for the 6 PBR layers: [grass, leaves, sand, rock, snow, dirt]
function terrainSplat(map, h, slope, v, v2, vf) {
  const dry = smooth(0.56, 0.74, v2) * 0.85;
  const sandF = h < 2.1 ? 1 : 1 - smooth(2.1, 2.9, h);
  const w = [(1 - dry) * (1 - sandF), dry * (1 - sandF), sandF, 0, 0, 0];
  const put = (idx, f) => { if (f <= 0) return; for (let i = 0; i < 6; i++) w[i] *= (1 - f); w[idx] += f; };
  put(5, vf || 0);
  if (h > 0.5) put(3, smooth(0.62, 1.0, slope));
  if (map.mountain) put(3, smooth(26, 46, h) * 0.55 * (0.4 + v));
  if (map.snow) { const s0 = map.snow + (v - 0.5) * 10; if (h > s0 && slope < 1.3) put(4, smooth(s0, s0 + 4, h)); }
  return w;
}
const LAYER_KEYS = ['grass', 'leaves', 'sand', 'rock', 'snow', 'dirt'];
function terrainColor(map, h, slope, v, v2) {
  const T = GX.LOOK[map.id].t;
  let c;
  if (h < 0.15) { const s = lin(T.seabed); c = mix3(s, mul3(s, 0.5), clamp(-h / 6, 0, 1)); }
  else { const w = terrainSplat(map, h, slope, v, v2, 0); c = [0, 0, 0]; LAYER_KEYS.forEach((k, i) => { if (w[i] > 0) { const t = lin(T[k]); c[0] += t[0] * w[i]; c[1] += t[1] * w[i]; c[2] += t[2] * w[i]; } }); }
  return mul3(c, 0.92 + v2 * 0.14);
}
const toSRGB = c => c.map(x => clamp(Math.pow(clamp(x, 0, 1), 1 / 2.2) * 255, 0, 255));
function makeHeightFn(map) {
  const noise = makeNoise(map.seed), S = map.size, rng = mulberry32(map.seed * 31 + 5);
  const isl = [];
  if (map.islands === 'multi') {
    isl.push({ x: 0, z: 0, r: S * 0.17, k: 1.3 });
    const n = 5, off = rng() * 6;
    for (let i = 0; i < n; i++) { const a = off + i / n * Math.PI * 2 + (rng() - 0.5) * 0.4; const d = S * (0.31 + rng() * 0.03); isl.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: S * (0.11 + rng() * 0.025), k: i * 3.7 + 2 }); }
  } else isl.push({ x: 0, z: 0, r: S * 0.38, k: 0.5 });
  const hf = (x, z) => {
    let m = -9;
    for (const I of isl) { const dx = x - I.x, dz = z - I.z; let d = Math.sqrt(dx * dx + dz * dz) / I.r; d += (noise.fbm(x * 0.007 + I.k * 10, z * 0.007 - I.k * 10, 3) - 0.5) * 0.5; if (1 - d > m) m = 1 - d; }
    if (m <= 0) return Math.max(-7, 0.6 + m * 18);
    const f = noise.fbm(x * 0.011 + 50, z * 0.011 + 50, 4);
    let h = 0.6 + smooth(0, 0.2, m) * (1.4 + f * map.hill * smooth(0, 0.5, m) + f * f * map.hill * 0.6);
    h += (noise.n(x * 0.15, z * 0.15) - 0.5) * 0.35 * smooth(0, 0.15, m);
    if (map.mountain) { const rr = 1 - Math.abs(noise.n(x * 0.009 + 40, z * 0.009 + 40) * 2 - 1); h += Math.pow(smooth(0.3, 1, m), 1.4) * map.mountain * (0.45 + 0.55 * rr); }
    return h;
  };
  return { hf, isl, noise };
}

// ================= WORLD =================
let W = null, P = null;
let yaw = 0, pitch = -0.15, matchT = 0, state = 'home';
function gkey(ix, iz) { return (ix + 2048) * 4096 + (iz + 2048); }
function gInsert(col) {
  const x0 = Math.floor((col.bx0 - 0.6) / CELL), x1 = Math.floor((col.bx1 + 0.6) / CELL), z0 = Math.floor((col.bz0 - 0.6) / CELL), z1 = Math.floor((col.bz1 + 0.6) / CELL);
  for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) { const k = gkey(ix, iz); let l = W.grid.get(k); if (!l) { l = []; W.grid.set(k, l); } l.push(col); }
}
function gAt(x, z) { return W.grid.get(gkey(Math.floor(x / CELL), Math.floor(z / CELL))); }
function addBoxCol(x0, y0, z0, x1, y1, z1, extra) { const c = Object.assign({ t: 0, x0, y0, z0, x1, y1, z1, bx0: x0, bx1: x1, bz0: z0, bz1: z1 }, extra || {}); gInsert(c); return c; }
function addCircleCol(x, z, r, y0, y1, extra) { const c = Object.assign({ t: 1, x, z, r, y0, y1, bx0: x - r, bx1: x + r, bz0: z - r, bz1: z + r }, extra || {}); gInsert(c); return c; }

function buildWorld(mapIndex, diff) {
  const map = MAPS[mapIndex], GQ = GFX[settings.gfx];
  const S = map.size, half = S / 2, rng = mulberry32(map.seed * 999 + 7);
  const { hf, noise } = makeHeightFn(map);
  const segs = Math.round(clamp(S / GQ.segDiv, 72, 300)), N = segs + 1, cell = S / segs;
  const H = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = hf(-half + i * cell, -half + j * cell);
  const getH = (x, z) => {
    let fx = (x + half) / cell, fz = (z + half) / cell;
    fx = clamp(fx, 0, segs - 0.0001); fz = clamp(fz, 0, segs - 0.0001);
    const i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j;
    const a = H[j * N + i], b = H[j * N + i + 1], c = H[(j + 1) * N + i], d = H[(j + 1) * N + i + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  };
  const scene = new THREE.Scene();
  const look = GX.LOOK[map.id];
  const L = GX.setupScene(scene, renderer, look, 60, GQ.fog * 1.25, GQ.shadow, GQ.shadowR);
  const sky = L.dome, sun = L.key;

  W = { look, L, fogFar0: GQ.fog * 1.25, flashT: 6, flash: 0, map, mapIndex, diff, S, half, segs, N, cell, H, getH, scene, sky, sun, grid: new Map(), trees: [], loot: [], chests: [], bots: [], built: [], builtKeys: new Set(),
    villages: [], houses: [], disposables: [], particles: [], tracers: [], nums: [], ind: [], stormTick: 0, aliveBots: 0, airship: null, minimapImg: null, grass: null, haloQ: [], pumpkins: [], cemeteries: [], fx: null, glow: null };
  const MB = new MatBatch();
  const foot = [];
  const overl = (x0, z0, x1, z1) => foot.some(f => !(x1 < f.x0 || x0 > f.x1 || z1 < f.z0 || z0 > f.z1));
  const slopeAt = (x, z) => Math.abs(getH(x + 2, z) - getH(x - 2, z)) + Math.abs(getH(x, z + 2) - getH(x, z - 2));
  const flatOK = (x, z, w, d) => {
    const hs = [getH(x - w / 2, z - d / 2), getH(x + w / 2, z - d / 2), getH(x - w / 2, z + d / 2), getH(x + w / 2, z + d / 2), getH(x, z)];
    const mn = Math.min(...hs), mx = Math.max(...hs);
    return mn > 1.8 && mx - mn < 1.9 && (!map.snow || mx < map.snow - 6) && Math.abs(x) < half - 20 && Math.abs(z) < half - 20;
  };
  // ---- houses
  const WALLC = [0xe9e0cc, 0xd8cdb4, 0xc9b79a, 0xe4d6bf, 0xd6c3a5, 0xbfae96, 0xe8e4dc, 0xcf9f7a, 0xdcc8a0];
  const ROOFC = [0x9a4230, 0x8a3a2a, 0x5a5e66, 0x4a4f57, 0x6b4a34, 0x7d3b2b];
  const TRIMC = [0xf2efe8, 0x5a4330, 0x3e4a3e, 0x2d3e55, 0xeae3d2];
  function solid(k, x0, y0, z0, x1, y1, z1, hex) { MB.box(k, x0, y0, z0, x1, y1, z1, hex); addBoxCol(x0, y0, z0, x1, y1, z1); }
  function windowOn(axis, along, face, inner, fy, trim, shutter, lit) { // axis 'x' wall spans x, at z=face; inner side at z=inner
    const ww = 1.15, y0 = fy + 1.0, y1 = fy + 2.2, out = Math.sign(face - inner), a0 = along - ww / 2, a1 = along + ww / 2;
    const P2 = (a, y, d) => axis === 'x' ? [a, y, d] : [d, y, a];
    const bx = (a0_, y0_, d0, a1_, y1_, d1, k, c) => { const p0 = P2(a0_, y0_, d0), p1 = P2(a1_, y1_, d1); MB.box(k, Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.min(p0[2], p1[2]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1]), Math.max(p0[2], p1[2]), c, true); };
    const fo = face + out * 0.02, io = inner - out * 0.02;
    bx(a0, y0, Math.min(fo, io), a1, y1, Math.max(fo, io), lit ? 'lit' : 'glass', lit ? pick([0xffb45a, 0xff9a3c, 0xffc878], rng) : 0x2a3a48);
    if (lit) { const pp = P2(along, (y0 + y1) / 2, face + out * 0.4); W.haloQ.push([pp[0], pp[1], pp[2], 0xffa040, 1.7, 0.5, 1]); }
    const f0 = face, f1 = face + out * 0.07;
    bx(a0 - 0.08, y0 - 0.08, Math.min(f0, f1), a1 + 0.08, y0, Math.max(f0, f1), 'wood', trim);
    bx(a0 - 0.08, y1, Math.min(f0, f1), a1 + 0.08, y1 + 0.08, Math.max(f0, f1), 'wood', trim);
    bx(a0 - 0.08, y0, Math.min(f0, f1), a0, y1, Math.max(f0, f1), 'wood', trim);
    bx(a1, y0, Math.min(f0, f1), a1 + 0.08, y1, Math.max(f0, f1), 'wood', trim);
    bx(along - 0.03, y0, Math.min(f0, f1 - out * 0.03), along + 0.03, y1, Math.max(f0, f1 - out * 0.03), 'wood', trim);
    bx(a0, (y0 + y1) / 2 - 0.03, Math.min(f0, f1 - out * 0.03), a1, (y0 + y1) / 2 + 0.03, Math.max(f0, f1 - out * 0.03), 'wood', trim);
    const s0 = face, s1 = face + out * 0.16; bx(a0 - 0.15, y0 - 0.14, Math.min(s0, s1), a1 + 0.15, y0 - 0.08, Math.max(s0, s1), 'stone', 0xc8c0b2);
    if (shutter) { const sf = face + out * 0.05; bx(a0 - 0.62, y0 - 0.05, Math.min(face, sf), a0 - 0.1, y1 + 0.05, Math.max(face, sf), 'wood', shutter); bx(a1 + 0.1, y0 - 0.05, Math.min(face, sf), a1 + 0.62, y1 + 0.05, Math.max(face, sf), 'wood', shutter); }
  }
  function addHouse(cx, cz, w, d) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const hs = [getH(x0, z0), getH(x1, z0), getH(x0, z1), getH(x1, z1), getH(cx, cz)];
    const base = Math.max(...hs) + 0.1, low = Math.min(...hs) - 1.2;
    const wc = pick(WALLC, rng), rc = pick(ROOFC, rng), trim = pick(TRIMC, rng), T = 0.32, WH = 3.4, shutter = rng() < 0.5 ? pick([0x3e5a3a, 0x5a2e24, 0x2f4660, 0x6b5a3a], rng) : 0, lit = rng() < 0.72;
    solid('stone', x0 - 0.25, low, z0 - 0.25, x1 + 0.25, base + 0.28, z1 + 0.25, 0xa8a094);
    const fy = base + 0.28, top = fy + WH, door = (rng() * 4) | 0, dw = 0.78, dh = 2.3;
    MB.box('wood', x0 + T, fy, z0 + T, x1 - T, fy + 0.02, z1 - T, 0xa07c55, true);
    const wallX = (za, zb, hasDoor) => {
      if (hasDoor) { solid('plaster', x0, fy, za, cx - dw, top, zb, wc); solid('plaster', cx + dw, fy, za, x1, top, zb, wc); solid('plaster', cx - dw, fy + dh, za, cx + dw, top, zb, wc); }
      else solid('plaster', x0, fy, za, x1, top, zb, wc);
    };
    const wallZ = (xa, xb, hasDoor) => {
      if (hasDoor) { solid('plaster', xa, fy, z0 + T, xb, top, cz - dw, wc); solid('plaster', xa, fy, cz + dw, xb, top, z1 - T, wc); solid('plaster', xa, fy + dh, cz - dw, xb, top, cz + dw, wc); }
      else solid('plaster', xa, fy, z0 + T, xb, top, z1 - T, wc);
    };
    wallX(z0, z0 + T, door === 0); wallX(z1 - T, z1, door === 1); wallZ(x0, x0 + T, door === 2); wallZ(x1 - T, x1, door === 3);
    // corner posts & base trim
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) MB.box('wood', px - 0.12, fy, pz - 0.12, px + 0.12, top, pz + 0.12, trim);
    // windows
    const nW = (len) => len >= 10 ? [-len / 4, len / 4] : [0];
    if (door !== 0) for (const o of nW(w)) windowOn('x', cx + o, z0, z0 + T, fy, trim, shutter, lit); else if (w >= 10) for (const o of [-w / 3.2, w / 3.2]) windowOn('x', cx + o, z0, z0 + T, fy, trim, shutter, lit);
    if (door !== 1) for (const o of nW(w)) windowOn('x', cx + o, z1, z1 - T, fy, trim, shutter, lit);
    if (door !== 2) for (const o of nW(d)) windowOn('z', cz + o, x0, x0 + T, fy, trim, shutter, lit);
    if (door !== 3) for (const o of nW(d)) windowOn('z', cz + o, x1, x1 - T, fy, trim, shutter, lit);
    // door frame + open door leaf
    const dc = pick([0x5a3b24, 0x2f4660, 0x6b2a22, 0x3e5a3a], rng);
    if (door === 0 || door === 1) {
      const zf = door === 0 ? z0 : z1, o = door === 0 ? -1 : 1, zi = door === 0 ? z0 + T : z1 - T;
      MB.box('wood', cx - dw - 0.12, fy, Math.min(zf, zf + o * 0.06), cx - dw, fy + dh + 0.12, Math.max(zf, zf + o * 0.06), trim);
      MB.box('wood', cx + dw, fy, Math.min(zf, zf + o * 0.06), cx + dw + 0.12, fy + dh + 0.12, Math.max(zf, zf + o * 0.06), trim);
      MB.box('wood', cx - dw - 0.12, fy + dh, Math.min(zf, zf + o * 0.06), cx + dw + 0.12, fy + dh + 0.14, Math.max(zf, zf + o * 0.06), trim);
      MB.box('wood', cx - dw + 0.02, fy + 0.02, Math.min(zi, zi - o * 1.45), cx - dw + 0.08, fy + dh - 0.04, Math.max(zi, zi - o * 1.45), dc);
      MB.box('stone', cx - dw - 0.2, fy - 0.3, Math.min(zf, zf + o * 0.7), cx + dw + 0.2, fy - 0.05, Math.max(zf, zf + o * 0.7), 0xb0a89a);
    } else {
      const xf = door === 2 ? x0 : x1, o = door === 2 ? -1 : 1, xi = door === 2 ? x0 + T : x1 - T;
      MB.box('wood', Math.min(xf, xf + o * 0.06), fy, cz - dw - 0.12, Math.max(xf, xf + o * 0.06), fy + dh + 0.12, cz - dw, trim);
      MB.box('wood', Math.min(xf, xf + o * 0.06), fy, cz + dw, Math.max(xf, xf + o * 0.06), fy + dh + 0.12, cz + dw + 0.12, trim);
      MB.box('wood', Math.min(xf, xf + o * 0.06), fy + dh, cz - dw - 0.12, Math.max(xf, xf + o * 0.06), fy + dh + 0.14, cz + dw + 0.12, trim);
      MB.box('wood', Math.min(xi, xi - o * 1.45), fy + 0.02, cz - dw + 0.02, Math.max(xi, xi - o * 1.45), fy + dh - 0.04, cz - dw + 0.08, dc);
      MB.box('stone', Math.min(xf, xf + o * 0.7), fy - 0.3, cz - dw - 0.2, Math.max(xf, xf + o * 0.7), fy - 0.05, cz + dw + 0.2, 0xb0a89a);
    }
    // gable roof
    const ov = 0.5, alongX = w >= d, rcol = lin(rc), under = 0x7a5a3c;
    if (alongX) {
      const hh = d / 2, rh = hh * 0.68, rY = top + rh, eY = top - ov * 0.68;
      const slopeLen = Math.hypot(hh + ov, rh + ov * 0.68);
      for (const sgn of [-1, 1]) {
        const ze = sgn < 0 ? z0 - ov : z1 + ov;
        const pts = [[x0 - ov, eY, ze], [x1 + ov, eY, ze], [x1 + ov, rY, cz], [x0 - ov, rY, cz]];
        MB.poly('roof', pts, [0, 1, sgn * 0.6], rcol, [[0, 0], [w + 2 * ov, 0], [w + 2 * ov, slopeLen], [0, slopeLen]]);
        MB.poly('wood', pts.map(p => [p[0], p[1] - 0.12, p[2]]), [0, -1, -sgn * 0.6], lin(under));
        MB.box('wood', x0 - ov, eY - 0.22, Math.min(ze, ze - sgn * 0.06), x1 + ov, eY + 0.02, Math.max(ze, ze - sgn * 0.06), trim, true);
      }
      for (const [xf, xin] of [[x0, x0 + T], [x1, x1 - T]]) {
        const o = Math.sign(xf - xin);
        MB.poly('plaster', [[xf, top, z0], [xf, top, z1], [xf, rY, cz]], [o, 0, 0], lin(wc));
        MB.poly('plaster', [[xin, top, z0 + T], [xin, top, z1 - T], [xin, rY - 0.2, cz]], [-o, 0, 0], lin(wc));
      }
      MB.box('roof', x0 - ov, rY - 0.1, cz - 0.16, x1 + ov, rY + 0.08, cz + 0.16, rc);
      if (rng() < 0.7) { const chx = cx + w * 0.25, chz = cz + hh * 0.4; MB.box('stone', chx - 0.4, top, chz - 0.4, chx + 0.4, rY + 0.7, chz + 0.4, 0x9a8e80); MB.box('dark', chx - 0.46, rY + 0.7, chz - 0.46, chx + 0.46, rY + 0.82, chz + 0.46, 0x3a3836); }
    } else {
      const hh = w / 2, rh = hh * 0.68, rY = top + rh, eY = top - ov * 0.68;
      const slopeLen = Math.hypot(hh + ov, rh + ov * 0.68);
      for (const sgn of [-1, 1]) {
        const xe = sgn < 0 ? x0 - ov : x1 + ov;
        const pts = [[xe, eY, z0 - ov], [xe, eY, z1 + ov], [cx, rY, z1 + ov], [cx, rY, z0 - ov]];
        MB.poly('roof', pts, [sgn * 0.6, 1, 0], rcol, [[0, 0], [d + 2 * ov, 0], [d + 2 * ov, slopeLen], [0, slopeLen]]);
        MB.poly('wood', pts.map(p => [p[0], p[1] - 0.12, p[2]]), [-sgn * 0.6, -1, 0], lin(under));
        MB.box('wood', Math.min(xe, xe - sgn * 0.06), eY - 0.22, z0 - ov, Math.max(xe, xe - sgn * 0.06), eY + 0.02, z1 + ov, trim, true);
      }
      for (const [zf, zin] of [[z0, z0 + T], [z1, z1 - T]]) {
        const o = Math.sign(zf - zin);
        MB.poly('plaster', [[x0, top, zf], [x1, top, zf], [cx, rY, zf]], [0, 0, o], lin(wc));
        MB.poly('plaster', [[x0 + T, top, zin], [x1 - T, top, zin], [cx, rY - 0.2, zin]], [0, 0, -o], lin(wc));
      }
      MB.box('roof', cx - 0.16, rY - 0.1, z0 - ov, cx + 0.16, rY + 0.08, z1 + ov, rc);
      if (rng() < 0.7) { const chx = cx + hh * 0.4, chz = cz - d * 0.25; MB.box('stone', chx - 0.4, top, chz - 0.4, chx + 0.4, rY + 0.7, chz + 0.4, 0x9a8e80); MB.box('dark', chx - 0.46, rY + 0.7, chz - 0.46, chx + 0.46, rY + 0.82, chz + 0.46, 0x3a3836); }
    }
    addBoxCol(x0 - 0.4, top, z0 - 0.4, x1 + 0.4, top + 0.3, z1 + 0.4);
    // furniture
    if (rng() < 0.7) { const tx = cx + (rng() - 0.5) * (w - 4), tz = cz + (rng() - 0.5) * (d - 4); MB.box('wood', tx - 0.6, fy + 0.72, tz - 0.4, tx + 0.6, fy + 0.78, tz + 0.4, 0x7a5434); for (const [lx, lz] of [[-0.52, -0.32], [0.52, -0.32], [-0.52, 0.32], [0.52, 0.32]]) MB.box('wood', tx + lx - 0.04, fy, tz + lz - 0.04, tx + lx + 0.04, fy + 0.72, tz + lz + 0.04, 0x6a4a2e, true); }
    foot.push({ x0: x0 - 1, z0: z0 - 1, x1: x1 + 1, z1: z1 + 1 });
    W.houses.push({ cx, cz, w, d, fy, door, lit });
    if (rng() < 0.82) { const corner = (rng() * 4) | 0; addChest(corner & 1 ? x1 - 1.1 : x0 + 1.1, fy, corner & 2 ? z1 - 1.1 : z0 + 1.1); }
    const n = 1 + (rng() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) spawnLoot(cx + (rng() - 0.5) * (w - 3), fy, cz + (rng() - 0.5) * (d - 3), randomLoot(rng, 0));
  }
  function addCar(x, z, alongX) {
    const y = getH(x, z), col = pick([0xd9d9d6, 0x1f1f22, 0x7d1013, 0x2b4a73, 0x8f9499, 0x3a4a3a, 0xb8a27a], rng);
    const L = 4.3, Wd = 1.8, hx = alongX ? L / 2 : Wd / 2, hz = alongX ? Wd / 2 : L / 2;
    const A = (a, b) => alongX ? [a, b] : [b, a]; // (along, across) -> (x,z) offsets
    const bx = (a0, y0, c0, a1, y1, c1, k, c) => { const p0 = A(a0, c0), p1 = A(a1, c1); MB.box(k, x + Math.min(p0[0], p1[0]), y + y0, z + Math.min(p0[1], p1[1]), x + Math.max(p0[0], p1[0]), y + y1, z + Math.max(p0[1], p1[1]), c); };
    bx(-2.15, 0.34, -0.9, 2.15, 0.95, 0.9, 'metal', col);
    bx(-1.1, 0.95, -0.8, 1.05, 1.52, 0.8, 'metal', col);
    bx(-1.0, 0.98, -0.82, 0.95, 1.46, 0.82, 'glass', 0x1d262e);
    bx(-1.17, 0.98, -0.72, 1.12, 1.44, 0.72, 'glass', 0x1d262e);
    bx(-2.22, 0.3, -0.9, -2.1, 0.6, 0.9, 'dark', 0x1a1a1a); bx(2.1, 0.3, -0.9, 2.22, 0.6, 0.9, 'dark', 0x1a1a1a);
    bx(2.12, 0.66, -0.78, 2.17, 0.82, -0.5, 'glass', 0xf2f0e6); bx(2.12, 0.66, 0.5, 2.17, 0.82, 0.78, 'glass', 0xf2f0e6);
    bx(-2.17, 0.66, -0.8, -2.12, 0.8, -0.55, 'metal', 0x9a1010); bx(-2.17, 0.66, 0.55, -2.12, 0.8, 0.8, 'metal', 0x9a1010);
    const wg = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16);
    for (const a of [-1.35, 1.35]) for (const c of [-0.82, 0.82]) {
      const [ox, oz] = A(a, c), m = alongX ? mtx(x + ox, y + 0.36, z + oz, 1, 1, 1, Math.PI / 2) : mtx(x + ox, y + 0.36, z + oz, 1, 1, 1, 0, 0, Math.PI / 2);
      MB.geo('dark', wg, m, 0x161616);
      const [hx2, hz2] = A(a, c * 1.17); MB.geo('metal', new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), alongX ? mtx(x + hx2, y + 0.36, z + hz2, 1, 1, 1, Math.PI / 2) : mtx(x + hx2, y + 0.36, z + hz2, 1, 1, 1, 0, 0, Math.PI / 2), 0xb0b4b8);
    }
    addBoxCol(x - hx, y, z - hz, x + hx, y + 1.52, z + hz);
    foot.push({ x0: x - hx - 0.5, z0: z - hz - 0.5, x1: x + hx + 0.5, z1: z + hz + 0.5 });
  }
  const vnames = shuffle(VILLAGE_NAMES.slice());
  for (let v = 0; v < map.villages; v++) {
    for (let t = 0; t < 300; t++) {
      const x = (rng() * 2 - 1) * S * 0.42, z = (rng() * 2 - 1) * S * 0.42;
      if (getH(x, z) > 2.2 && flatOK(x, z, 12, 12) && W.villages.every(o => Math.hypot(o.x - x, o.z - z) > S * (t < 200 ? 0.2 : 0.12))) { W.villages.push({ x, z, name: vnames[v % vnames.length] }); break; }
    }
  }
  const perV = Math.max(2, Math.round(map.houses * 0.8 / Math.max(1, W.villages.length)));
  for (const vil of W.villages) {
    let placed = 0;
    for (let t = 0; t < 120 && placed < perV; t++) {
      const a = rng() * Math.PI * 2, rr = 5 + rng() * 34, x = vil.x + Math.cos(a) * rr, z = vil.z + Math.sin(a) * rr;
      const w = 8 + 2 * ((rng() * 3) | 0), d = 8 + 2 * ((rng() * 3) | 0);
      if (!flatOK(x, z, w + 1, d + 1) || overl(x - w / 2 - 3, z - d / 2 - 3, x + w / 2 + 3, z + d / 2 + 3)) continue;
      addHouse(x, z, w, d); placed++;
    }
    let cars = 0;
    for (let t = 0; t < 30 && cars < 2; t++) { const a = rng() * 6.28, rr = 4 + rng() * 22, x = vil.x + Math.cos(a) * rr, z = vil.z + Math.sin(a) * rr; if (flatOK(x, z, 5, 5) && slopeAt(x, z) < 0.8 && !overl(x - 3, z - 3, x + 3, z + 3)) { addCar(x, z, rng() < 0.5); cars++; } }
    for (let k = 0; k < 5; k++) {
      const a = rng() * 6.28, rr = 6 + rng() * 26, x = vil.x + Math.cos(a) * rr, z = vil.z + Math.sin(a) * rr;
      if (overl(x - 1, z - 1, x + 1, z + 1) || getH(x, z) < 1.5) continue;
      const y = getH(x, z) - 0.2, s = 1.2;
      solid('wood', x - s / 2, y, z - s / 2, x + s / 2, y + s + 0.2, z + s / 2, 0x9a7448);
      if (rng() < 0.5) MB.box('wood', x - 0.45, y + s + 0.2, z - 0.45, x + 0.45, y + s + 1.0, z + 0.45, 0x8a6a40);
      foot.push({ x0: x - 1, z0: z - 1, x1: x + 1, z1: z + 1 });
    }
  }
  let extra = map.houses - W.houses.length;
  for (let t = 0; t < 600 && extra > 0; t++) {
    const x = (rng() * 2 - 1) * S * 0.45, z = (rng() * 2 - 1) * S * 0.45, w = 8 + 2 * ((rng() * 2) | 0), d = 8 + 2 * ((rng() * 2) | 0);
    if (!flatOK(x, z, w + 1, d + 1) || overl(x - w / 2 - 4, z - d / 2 - 4, x + w / 2 + 4, z + d / 2 + 4)) continue;
    addHouse(x, z, w, d); extra--;
  }
  MB.build(scene, W.disposables);
  decorateHalloween({ scene, rng, getH, foot, overl, flatOK, slopeAt, map, GQ });

  // ---- terrain mesh (6-layer PBR splat)
  const pos = new Float32Array(N * N * 3), uv = new Float32Array(N * N * 2), spA = new Uint8Array(N * N * 4), spB = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, h = H[k], x = -half + i * cell, z = -half + j * cell;
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z; uv[k * 2] = x / 4; uv[k * 2 + 1] = z / 4;
    const hl = H[j * N + Math.max(0, i - 1)], hr = H[j * N + Math.min(segs, i + 1)], hu = H[Math.max(0, j - 1) * N + i], hd = H[Math.min(segs, j + 1) * N + i];
    const slope = (Math.abs(hr - hl) + Math.abs(hd - hu)) / (2 * cell);
    const v = noise.fbm(x * 0.025, z * 0.025, 3), v2 = noise.fbm(x * 0.06 + 30, z * 0.06, 2);
    let vf = 0;
    if (h > 1.5) for (const vil of W.villages) { const dd = Math.hypot(x - vil.x, z - vil.z); if (dd < 48) vf = Math.max(vf, (1 - smooth(14, 44, dd + (v - 0.5) * 18)) * 0.85); }
    const w = terrainSplat(map, h, slope, v, v2, vf);
    for (let q = 0; q < 4; q++) spA[k * 4 + q] = Math.round(w[q] * 255);
    spB[k * 4] = Math.round(w[4] * 255); spB[k * 4 + 1] = Math.round(w[5] * 255); spB[k * 4 + 2] = Math.round(v2 * 255);
    spB[k * 4 + 3] = Math.round(smooth(0.6, 0.72, v) * (1 - smooth(0.4, 0.8, slope)) * 255);
  }
  const idx = new (N * N > 65535 ? Uint32Array : Uint16Array)(segs * segs * 6); let q = 0;
  for (let j = 0; j < segs; j++) for (let i = 0; i < segs; i++) { const a = j * N + i, b = a + 1, c = a + N, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  tg.setAttribute('splatA', new THREE.BufferAttribute(spA, 4, true)); tg.setAttribute('splatB', new THREE.BufferAttribute(spB, 4, true));
  tg.setIndex(new THREE.BufferAttribute(idx, 1)); tg.computeVertexNormals();
  const tmat = GX.makeTerrainMaterial(look);
  const terrain = new THREE.Mesh(tg, tmat); terrain.receiveShadow = true; scene.add(terrain); W.disposables.push(tg, tmat);
  W.hTex = GX.heightTexture(H, N); W.hB = [-half - cell / 2, -half - cell / 2, N * cell]; W.disposables.push(W.hTex);
  // water: shader disc that follows the camera (no visible world edge)
  W.water = GX.makeWater({ skyU: L.U, look, heightTex: W.hTex, hB: W.hB, normalTex: TEX.waterN, keyDir: L.keyDir, radius: 1550 });
  scene.add(W.water.mesh); W.disposables.push(W.water);

  // ---- trees, bushes, rocks
  const treeItems = {}, kinds = map.treeKinds;
  const q4 = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0, tries = 0; i < map.trees && tries < map.trees * 8; tries++) {
    const x = (rng() * 2 - 1) * half * 0.97, z = (rng() * 2 - 1) * half * 0.97, h = getH(x, z);
    if (h < 2.5 || (map.snow && h > map.snow + 6) || slopeAt(x, z) > 3.2) continue;
    if (noise.fbm(x * 0.018 + 9, z * 0.018 - 9, 3) < 0.45 && rng() > 0.25) continue;
    if (overl(x - 2.5, z - 2.5, x + 2.5, z + 2.5)) continue;
    let kind = pick(kinds, rng); if (h < 4 && kinds.includes('palm')) kind = 'palm'; else if (kind === 'palm' && h > 9) kind = 'round';
    let snowy = false; if (map.snow && h > map.snow - 14) { kind = 'pine'; snowy = h > map.snow - 6; }
    if (!snowy && kind !== 'palm' && rng() < 0.17) kind = 'dead';
    const s = 0.75 + rng() * 0.55, variant = (rng() * 3) | 0, key = kind + (snowy ? 'S' : '') + variant;
    q4.setFromAxisAngle(up, rng() * 6.28);
    const tr = { x, z, y: h - 0.15, s, kind, key, hp: 4, alive: true, m: new THREE.Matrix4().compose(V.set(x, h - 0.15, z), q4, V2.set(s, s, s)) };
    tr.col = addCircleCol(x, z, (kind === 'round' ? 0.3 : kind === 'pine' || kind === 'dead' ? 0.27 : 0.22) * s, tr.y, tr.y + 7 * s, { tree: tr });
    (treeItems[key] = treeItems[key] || []).push(tr); W.trees.push(tr); i++;
  }
  const VEGK = { dead: ['dead1', 'dead2', 'dead3'], round: ['twist1', 'twist2', 'twist1'] };
  for (const key in treeItems) {
    const kind0 = key.replace(/S?\d$/, ''), vk = settings.gfx !== 'bassa' && VEGK[kind0] && !key.includes('S') ? VEGK[kind0][+key.slice(-1)] : null;
    if (vk && GX.ASSETS.veg[vk]) {
      for (const pt of GX.ASSETS.veg[vk]) instanceTiles(scene, pt.geo, pt.mat, treeItems[key], 160, { cast: GQ.shadow > 0, receive: true });
      continue;
    }
    const kind = kind0, g = treeGeo(kind, map.seed * 10 + key.length * 7 + (+key.slice(-1)) * 31, key.includes('S'));
    W.disposables.push(g);
    instanceTiles(scene, g, VEG_MAT, treeItems[key], 160, { cast: GQ.shadow > 0, receive: true });
  }
  const bushes = [];
  for (let i = 0, tries = 0; i < map.trees * GQ.bush && tries < map.trees * 6; tries++) {
    const x = (rng() * 2 - 1) * half * 0.95, z = (rng() * 2 - 1) * half * 0.95, h = getH(x, z);
    if (h < 2.6 || (map.snow && h > map.snow - 4) || slopeAt(x, z) > 3 || overl(x - 1.5, z - 1.5, x + 1.5, z + 1.5)) continue;
    const s = 0.7 + rng() * 0.8; q4.setFromAxisAngle(up, rng() * 6.28);
    bushes.push({ x, z, m: new THREE.Matrix4().compose(V.set(x, h - 0.1, z), q4, V2.set(s, s * (0.8 + rng() * 0.4), s)) }); i++;
  }
  if (bushes.length) { const bg = treeGeo('bush', 9), bg2 = treeGeo('bush', 21); W.disposables.push(bg, bg2); instanceTiles(scene, bg, VEG_MAT, bushes.filter((_, i) => i % 2 === 0), 160, { cast: false, receive: true }); instanceTiles(scene, bg2, VEG_MAT, bushes.filter((_, i) => i % 2 === 1), 160, { cast: false, receive: true }); }
  const rockItems = [[], [], []];
  for (let i = 0, tries = 0; i < map.rocks && tries < map.rocks * 8; tries++) {
    const x = (rng() * 2 - 1) * half * 0.95, z = (rng() * 2 - 1) * half * 0.95, h = getH(x, z);
    if (h < 0.8 || overl(x - 3, z - 3, x + 3, z + 3)) continue;
    const s = 0.8 + rng() * (h > 20 ? 3 : 1.8); q4.setFromAxisAngle(up, rng() * 6.28);
    rockItems[i % 3].push({ x, z, m: new THREE.Matrix4().compose(V.set(x, h - 0.25 * s, z), q4, V2.set(s, s, s)) });
    addCircleCol(x, z, s * 1.05, h - 1, h + s * 0.85); i++;
  }
  rockItems.forEach((list, i) => { if (!list.length) return; const g = rockGeo(i * 13 + 3); W.disposables.push(g); instanceTiles(scene, g, ROCK_MAT, list, 160, { cast: GQ.shadow > 0, receive: true }); });
  // ---- grass: GPU-wrapped instanced tufts, density from a mask (height, slope, snow, villages, buildings)
  if (GQ.grass > 0) {
    const M = Math.min(1024, Math.max(256, Math.round(S / 1.4))), md = new Uint8Array(M * M * 4), snow = map.snow;
    for (let py = 0; py < M; py++) for (let px = 0; px < M; px++) {
      const x = -half + (px + 0.5) / M * S, z = -half + (py + 0.5) / M * S, h = getH(x, z), k = (py * M + px) * 4;
      md[k + 3] = 255;
      let d = smooth(2.6, 3.4, h);
      if (d <= 0) continue;
      if (snow) d *= 1 - smooth(snow - 12, snow - 6, h);
      const sl = Math.abs(getH(x + 1.5, z) - h) + Math.abs(getH(x, z + 1.5) - h); d *= 1 - smooth(0.6, 1.1, sl);
      if (d <= 0) continue;
      const nv = noise.fbm(x * 0.06 + 30, z * 0.06, 2), nv2 = noise.fbm(x * 0.025, z * 0.025, 3);
      for (const vil of W.villages) { const dd = Math.hypot(x - vil.x, z - vil.z); if (dd < 48) d *= 1 - (1 - smooth(14, 44, dd + (nv2 - 0.5) * 18)) * 0.97; }
      d *= 0.6 + 0.4 * smooth(0.32, 0.6, noise.n(x * 0.11 + 7, z * 0.11 - 3));
      md[k] = Math.round(d * 255); md[k + 1] = Math.round(smooth(0.56, 0.74, nv) * 255); md[k + 2] = Math.round(nv2 * 255);
    }
    for (const f of foot) {
      const x0 = Math.max(0, Math.floor((f.x0 + half) / S * M)), x1 = Math.min(M - 1, Math.ceil((f.x1 + half) / S * M)), z0 = Math.max(0, Math.floor((f.z0 + half) / S * M)), z1 = Math.min(M - 1, Math.ceil((f.z1 + half) / S * M));
      for (let py = z0; py <= z1; py++) for (let px = x0; px <= x1; px++) md[(py * M + px) * 4] = 0;
    }
    W.gMask = GX.maskTexture(md, M); W.disposables.push(W.gMask);
    const GR = GQ.grassR, GA = GR * 2.3;
    W.grass = GX.makeGrass({ count: GQ.grass, A: GA, R: GR, heightTex: W.hTex, hB: W.hB, maskTex: W.gMask, mB: [-half, -half, S], look, blades: GQ.blades, seed: map.seed, keyDir: L.keyDir });
    W.grass.A = GA; scene.add(W.grass.mesh); W.disposables.push(W.grass);
  }
  // ---- clouds
  CLOUD_MAT.color.setRGB(...lin(look.cloud)).multiplyScalar(1.4); CLOUD_MAT.opacity = look.cloudO;
  for (let i = 0; i < Math.min(60, Math.round(S / 22)); i++) {
    const sp = new THREE.Sprite(CLOUD_MAT); const sc = 90 + rng() * 140;
    sp.scale.set(sc, sc * 0.55, 1); sp.position.set((rng() * 2 - 1) * S * 0.8, 170 + rng() * 70, (rng() * 2 - 1) * S * 0.8); scene.add(sp);
  }
  // ---- outdoor loot
  for (let i = 0, tries = 0; i < Math.round(map.houses * 0.5); tries++) {
    if (tries > 500) break;
    const x = (rng() * 2 - 1) * half * 0.9, z = (rng() * 2 - 1) * half * 0.9, h = getH(x, z);
    if (h < 1.5 || overl(x - 1, z - 1, x + 1, z + 1)) continue;
    spawnLoot(x, h, z, randomLoot(rng, 0)); i++;
  }
  // ---- minimap image
  const MS = 232, mm = document.createElement('canvas'); mm.width = mm.height = MS; const mc = mm.getContext('2d');
  const img = mc.createImageData(MS, MS);
  for (let py = 0; py < MS; py++) for (let px = 0; px < MS; px++) {
    const x = -half + (px + 0.5) / MS * S, z = -half + (py + 0.5) / MS * S, h = getH(x, z);
    let c;
    if (h < 0) { const dd = clamp(-h / 7, 0, 1); c = [lerp(44, 20, dd), lerp(88, 50, dd), lerp(120, 90, dd)]; }
    else { c = toSRGB(terrainColor(map, h, slopeAt(x, z) / 4, 0.5, 0.4)); const shd = 0.9 + clamp((getH(x - 3, z - 3) - h) * -0.08, -0.2, 0.2); c = c.map(v => v * shd); }
    const k = (py * MS + px) * 4; img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
  }
  mc.putImageData(img, 0, 0);
  mc.fillStyle = 'rgba(120,60,40,.9)';
  for (const hs of W.houses) { const px = (hs.cx + half) / S * MS, py = (hs.cz + half) / S * MS; mc.fillRect(px - 2, py - 2, 4, 4); }
  W.minimapImg = mm;
  // storm visual
  const sg = new THREE.CylinderGeometry(1, 1, 1, 96, 1, true);
  W.stormMesh = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: linC(0x7CFF6B), toneMapped: false, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  scene.add(W.stormMesh); W.disposables.push(sg);
  // particles
  const pg = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  W.pMesh = new THREE.InstancedMesh(pg, new THREE.MeshBasicMaterial({ color: 0xffffff }), 260); W.pMesh.frustumCulled = false;
  const white = new THREE.Color(1, 1, 1);
  for (let i = 0; i < 260; i++) { M4.makeScale(0, 0, 0); W.pMesh.setMatrixAt(i, M4); W.pMesh.setColorAt(i, white); }
  scene.add(W.pMesh); W.disposables.push(pg);
  W.pool = []; for (let i = 0; i < 260; i++) W.pool.push({ life: 0 }); W.pIdx = 0;
  W.tracerMat = new THREE.LineBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.95 });
  W.tracerMatE = new THREE.LineBasicMaterial({ color: 0xff8a7a, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 40; i++) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, W.tracerMat); l.visible = false; l.frustumCulled = false; scene.add(l); W.tracers.push({ l, life: 0 }); W.disposables.push(g);
  }
  W.tIdx = 0;
  W.fx = makeWorldFx(scene, GQ);
  return W;
}
function disposeWorld() {
  if (!W) return;
  if (W.scene.environment) W.scene.environment.dispose();
  for (const d of W.disposables) d.dispose && d.dispose();
  W.scene.traverse(o => { if (o.isInstancedMesh && o.dispose) o.dispose(); });
  if (W.sun && W.sun.shadow && W.sun.shadow.map) W.sun.shadow.map.dispose();
  W = null;
}

// ================= LOOT =================
const CONS = {
  bende: { name: 'Bende', color: 0xffffff },
  scudo: { name: 'Pozione scudo', color: 0x41b9ff },
  munizioni: { name: 'Munizioni', color: 0x8a8a3a },
  legno: { name: 'Legno', color: 0xa86b32 },
  caramelle: { name: 'Caramelle', color: 0xff7a1a },
};
function randomLoot(rng = R, bonus = 0) {
  const r = rng();
  if (r < 0.58) { const kind = pickW(KINDS, KIND_W, rng); return { type: 'gun', kind, rar: rollRarity(rng, bonus), mag: WEAPONS[kind].mag }; }
  if (r < 0.72) return { type: 'munizioni', n: 30 };
  if (r < 0.84) return { type: 'bende', n: 2 };
  if (r < 0.94) return { type: 'scudo', n: 1 };
  if (r < 0.97) return { type: 'caramelle', n: 1 };
  return { type: 'legno', n: 30 };
}
const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 6, 6, 1, true);
const beamMats = {};
function beamMat(hex, op) { const k = hex + '_' + op; return beamMats[k] || (beamMats[k] = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); }
function makeLootModel(item) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const add = (geo, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; inner.add(o); return o; };
  if (item.type === 'gun') { const m = makeGunModel(item.kind, item.rar); m.scale.setScalar(1.4); m.rotation.y = Math.PI / 2; inner.add(m); }
  else if (item.type === 'bende') { add(U.cyl, smat(0xf2efe6, 0.9), 0, 0, 0, 0.12, 0.2, 0.12).rotation.z = Math.PI / 2; add(U.cyl, smat(0xf2efe6, 0.9), 0, 0, 0.22, 0.12, 0.2, 0.12).rotation.z = Math.PI / 2; add(U.box, smat(0xc0302a, 0.6), 0, 0.12, 0.11, 0.05, 0.005, 0.2); }
  else if (item.type === 'scudo') { add(U.cyl, POTION_MAT, 0, 0, 0, 0.13, 0.36, 0.13); add(U.cyl, smat(0xd0d4da, 0.3, 0.8), 0, 0.22, 0, 0.06, 0.08, 0.06); }
  else if (item.type === 'munizioni') { add(U.box, smat(0x4f5a2e, 0.7), 0, 0, 0, 0.55, 0.32, 0.3); add(U.box, smat(0x2a2a20, 0.6), 0, 0.17, 0, 0.12, 0.03, 0.08); add(U.box, smat(0xd8b23a, 0.5), 0.2, 0.0, -0.152, 0.1, 0.08, 0.005); }
  else if (item.type === 'caramelle') { const cc = pick([0xff7a1a, 0x8a3aff, 0x5ad04a, 0xe8304a]); add(U.sphMid, smat(cc, 0.25), 0, 0, 0, 0.16, 0.14, 0.14); for (const s of [-1, 1]) { const c2 = add(U.cone, smat(cc, 0.3), s * 0.2, 0, 0, 0.1, 0.14, 0.1); c2.rotation.z = s * Math.PI / 2; } add(U.sphLo, smat(0xffffff, 0.3), 0, 0.07, -0.08, 0.04, 0.03, 0.02); }
  else { for (let i = 0; i < 3; i++) add(U.box, smat(0x9a6a3c, 0.85), 0, i * 0.11, (i - 1) * 0.05, 0.9, 0.1, 0.2).rotation.y = i * 0.25; }
  const col = item.type === 'gun' ? RAR[item.rar].hex : CONS[item.type].color;
  const beam = new THREE.Mesh(beamGeo, beamMat(col, item.type === 'gun' ? 0.35 : 0.16)); beam.position.y = 3; g.add(beam);
  return g;
}
function spawnLoot(x, y, z, item, vx = 0, vz = 0) {
  const m = makeLootModel(item); m.position.set(x, y + 0.5, z); W.scene.add(m);
  const L = { x, y, z, item, m, taken: false, vx, vz, vy: vx || vz ? 5 : 0, t: R() * 6 };
  W.loot.push(L); return L;
}
const CHEST_WOOD = reg(new THREE.MeshStandardMaterial({ color: linC(0x8a5a2c), map: TEX.wood, roughness: 0.75 }));
const POTION_MAT = reg(new THREE.MeshStandardMaterial({ color: linC(0x41b9ff), roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }));
function addChest(x, y, z) {
  const g = new THREE.Group(), wood = CHEST_WOOD, gold = smat(0xd4a52c, 0.3, 0.9);
  const b = new THREE.Mesh(U.box, wood); b.scale.set(1.0, 0.55, 0.62); b.position.y = 0.28; b.castShadow = true; g.add(b);
  for (const ox of [-0.42, 0, 0.42]) { const band = new THREE.Mesh(U.box, gold); band.scale.set(0.06, 0.57, 0.64); band.position.set(ox, 0.28, 0); g.add(band); }
  const lid = new THREE.Group(); lid.position.set(0, 0.56, 0.31);
  const lm = new THREE.Mesh(U.cyl, wood); lm.scale.set(0.31, 1.02, 0.2); lm.rotation.z = Math.PI / 2; lm.position.set(0, 0.0, -0.31); lm.castShadow = true; lid.add(lm);
  for (const ox of [-0.42, 0.42]) { const band = new THREE.Mesh(U.cyl, gold); band.scale.set(0.325, 0.06, 0.215); band.rotation.z = Math.PI / 2; band.position.set(ox, 0, -0.31); lid.add(band); }
  const lk = new THREE.Mesh(U.box, gold); lk.scale.set(0.14, 0.18, 0.05); lk.position.set(0, -0.05, -0.64); lid.add(lk);
  g.add(lid); g.position.set(x, y, z); g.rotation.y = R() * 6.28; W.scene.add(g);
  const glow = new THREE.Mesh(beamGeo, beamMat(0xffc24a, 0.18)); glow.scale.set(5, 0.12, 5); glow.position.y = 0.75; g.add(glow);
  W.chests.push({ x, y, z, g, lid, glow, opened: false });
}

// ================= HALLOWEEN: GLOW, PUMPKINS, GRAVES, BATS, FX =================
const HALO_UNI = { uScale: { value: 400 }, uTime: { value: 0 } };
const GLOW_VS = [
  'uniform float uScale; uniform float uTime;',
  'attribute float hsize; attribute vec3 hcol; attribute float hphase;',
  'varying vec3 vC; varying float vF;',
  'void main(){',
  ' vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;',
  ' float fl = hphase < 0.0 ? 1.0 : 0.8 + 0.2 * sin(uTime * (6.0 + hphase * 3.0) + hphase * 17.0) * sin(uTime * 2.3 + hphase * 5.0);',
  ' vC = hcol * fl; float d = max(-mv.z, 0.1);',
  ' gl_PointSize = hsize > 0.0 ? clamp(hsize * uScale / d, 0.0, 700.0) : 0.0;',
  ' vF = (hsize > 0.0 ? 1.0 : 0.0) * (1.0 - smoothstep(260.0, 420.0, d));',
  '}'].join('\n');
const GLOW_FS_ADD = 'uniform float uSoft; uniform float uOp; varying vec3 vC; varying float vF; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = pow(1.0 - d, uSoft) * vF * uOp; gl_FragColor = vec4(vC * a, a); }';
const GLOW_FS_ALPHA = 'uniform float uSoft; uniform float uOp; varying vec3 vC; varying float vF; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = pow(1.0 - d, uSoft) * vF * uOp; gl_FragColor = vec4(vC, a); }';
function makeGlowMat(additive, soft, op) {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: HALO_UNI.uScale, uTime: HALO_UNI.uTime, uSoft: { value: soft }, uOp: { value: op } },
    vertexShader: GLOW_VS, fragmentShader: additive ? GLOW_FS_ADD : GLOW_FS_ALPHA,
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
  });
}
const GLOW_ADD = makeGlowMat(true, 1.8, 1.0), GLOW_SPARK = makeGlowMat(true, 1.2, 1.0), GLOW_FOG = makeGlowMat(false, 1.6, 0.16);
const rawC = hex => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
class GlowPoints {
  constructor(n, mat) {
    this.n = n; this.count = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.ph = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('hcol', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('hsize', new THREE.BufferAttribute(this.size, 1)); g.setAttribute('hphase', new THREE.BufferAttribute(this.ph, 1));
    this.geo = g; this.points = new THREE.Points(g, mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
  }
  add(x, y, z, hex, size, flick = 0, k = 1) {
    if (this.count >= this.n) return -1;
    const i = this.count++, c = rawC(hex);
    this.set(i, x, y, z); this.col[i * 3] = c[0] * k; this.col[i * 3 + 1] = c[1] * k; this.col[i * 3 + 2] = c[2] * k;
    this.size[i] = size; this.ph[i] = flick ? Math.random() * 3 + 0.5 : -1; return i;
  }
  set(i, x, y, z) { this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; }
  setSize(i, s) { if (i >= 0) this.size[i] = s; }
  setCol(i, r, g, b) { this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b; }
  commit() { const a = this.geo.attributes; a.position.needsUpdate = true; a.hcol.needsUpdate = true; a.hsize.needsUpdate = true; a.hphase.needsUpdate = true; this.geo.setDrawRange(0, this.count); }
}
const FACE_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const STONE_MAT = reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
WM.lit = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
UVS.lit = 1;

let _pkGeos = null;
function pumpkinGeos() {
  if (_pkGeos) return _pkGeos;
  const G = new GeoBuilder(false), F = new GeoBuilder(false);
  const o1 = lin(0xd9661a), o2 = lin(0x8a320a), face = lin(0xffb43a);
  G.add(U.sphHi, mtx(0, 0.3, 0, 0.42, 0.32, 0.42), (x, y, z) => { const a = Math.atan2(x, z), g = Math.abs(Math.cos(a * 5)); return mul3(mix3(o2, o1, Math.pow(g, 0.55)), 0.7 + 0.3 * clamp(y / 0.6, 0, 1)); }, null,
    (v) => { const a = Math.atan2(v.x, v.z), k = 0.9 + 0.1 * Math.pow(Math.abs(Math.cos(a * 5)), 0.5); v.x *= k; v.z *= k; const r = Math.hypot(v.x, v.z); v.y -= smooth(0.45, 0.62, v.y) * Math.max(0, 0.42 - r) * 0.2; });
  G.add(U.cylLo, mtx(0.01, 0.64, 0, 0.032, 0.14, 0.032, 0.18, 0, 0.12), lin(0x4a4a22));
  for (const s of [-1, 1]) G.add(U.box, mtx(s * 0.045, 0.24, -0.41, 0.035, 0.034, 0.03), o1);
  G.add(U.box, mtx(0, 0.196, -0.414, 0.035, 0.03, 0.03), o1);
  for (const s of [-1, 1]) F.add(U.tri, mtx(s * 0.13, 0.42, -0.372, 0.075, 0.09, 0.02), face);
  F.add(U.tri, mtx(0, 0.33, -0.418, 0.036, 0.046, 0.02), face);
  F.add(U.box, mtx(0, 0.215, -0.405, 0.12, 0.058, 0.02), face);
  for (const s of [-1, 1]) F.add(U.box, mtx(s * 0.105, 0.236, -0.39, 0.1, 0.05, 0.02, 0, s * 0.3, -s * 0.36), face);
  _pkGeos = { body: G.build(true), face: F.build() };
  return _pkGeos;
}
const _graves = {};
function graveGeo(type) {
  if (_graves[type]) return _graves[type];
  const G = new GeoBuilder(false), st = lin(0x8e8a84), moss = lin(0x4e5a32), dirt = lin(0x3e3024), n = makeNoise(13 + type);
  const sc = (x, y, z, nn) => { const v = n.fbm(x * 6 + 3, y * 6 + z * 5, 3); let c = mul3(st, 0.7 + v * 0.45); if (y < 0.25 + v * 0.3 && v > 0.45) c = mix3(c, moss, 0.6); return c; };
  if (type === 0) { G.add(U.box, mtx(0, 0.38, 0, 0.6, 0.76, 0.15), sc); G.add(U.cyl, mtx(0, 0.76, 0, 0.3, 0.15, 0.3, Math.PI / 2), sc); G.add(U.box, mtx(0, 0.05, 0, 0.74, 0.1, 0.28), sc); }
  else if (type === 1) { G.add(U.box, mtx(0, 0.58, 0, 0.13, 1.08, 0.13), sc); G.add(U.box, mtx(0, 0.82, 0, 0.56, 0.13, 0.13), sc); G.add(U.box, mtx(0, 0.06, 0, 0.4, 0.12, 0.3), sc); }
  else { G.add(U.box, mtx(0, 0.32, 0, 0.62, 0.64, 0.16, -0.12, 0, 0.08), sc); G.add(U.box, mtx(0, 0.67, 0.04, 0.5, 0.1, 0.16, -0.12, 0, 0.08), sc); }
  G.add(U.sphLo, mtx(0, 0.0, 0.62, 0.36, 0.1, 0.62), dirt);
  return (_graves[type] = G.build(true));
}
function deadTreeGeo(seed) {
  const rng = mulberry32(seed + 77), G = new GeoBuilder(false), bark = barkFn(0x3a302a, 0, 0);
  const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), d = new THREE.Vector3();
  const seg = (a, b, r0, r1) => {
    d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = d.length(); d.multiplyScalar(1 / L);
    q.setFromUnitVectors(up, d);
    const m = new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1));
    G.add(new THREE.CylinderGeometry(r1, r0, L * 1.04, 7, 1), m, bark);
  };
  const branch = (p, dir, len, r, depth) => {
    const e = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
    seg(p, e, r, r * 0.68);
    if (depth <= 0) return;
    const n = depth >= 2 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      let nx = dir[0] + (rng() - 0.5) * 1.6, ny = dir[1] + 0.15 + (rng() - 0.3) * 0.6, nz = dir[2] + (rng() - 0.5) * 1.6;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      branch(e, [nx, ny, nz], len * (0.62 + rng() * 0.15), r * 0.62, depth - 1);
    }
  };
  const H = 2.6 + rng() * 1.2;
  seg([0, -0.3, 0], [0.15, H * 0.55, 0.05], 0.36, 0.26);
  const tx = (rng() - 0.5) * 0.3, tz = (rng() - 0.5) * 0.3;
  seg([0.15, H * 0.55, 0.05], [0.15 + tx, H, 0.05 + tz], 0.26, 0.2);
  branch([0.15 + tx, H, 0.05 + tz], [tx, 1, tz].map((v, i, a) => v / Math.hypot(a[0], a[1], a[2])), 1.6, 0.18, 3);
  for (let k = 0; k < 2; k++) { const a = rng() * 6.28; branch([0.12, H * (0.45 + k * 0.15), 0.04], [Math.cos(a) * 0.8, 0.6, Math.sin(a) * 0.8], 1.3, 0.12, 2); }
  return G.build(false);
}
function wingGeo(mirror) {
  const pts = [[-0.03, 0, -0.06], [-0.24, 0.03, -0.12], [-0.44, 0.0, -0.03], [-0.36, 0, 0.05], [-0.27, 0, 0.02], [-0.19, 0, 0.09], [-0.1, 0, 0.04], [-0.03, 0, 0.06]];
  const p = [-0.03, 0, 0]; for (const q of pts) p.push(mirror ? -q[0] : q[0], q[1], q[2]);
  const ix = []; for (let i = 1; i < pts.length; i++) ix.push(0, i, i + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(ix); g.computeVertexNormals(); return g;
}
const BAT_MAT = new THREE.MeshBasicMaterial({ color: 0x120c14, side: THREE.DoubleSide });
function makeBats(scene, n, centers, hMin = 9, hSpan = 16, rMin = 5, rSpan = 14) {
  const body = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), BAT_MAT, n), wl = new THREE.InstancedMesh(wingGeo(false), BAT_MAT, n), wr = new THREE.InstancedMesh(wingGeo(true), BAT_MAT, n);
  for (const m of [body, wl, wr]) { m.frustumCulled = false; scene.add(m); }
  const bats = [];
  for (let i = 0; i < n; i++) bats.push({ c: i % centers.length, r: rMin + Math.random() * rSpan, h: hMin + Math.random() * hSpan, w: (0.5 + Math.random() * 0.7) * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * 6.28, f: Math.random() * 6.28, s: 1.3 + Math.random() * 0.6 });
  const S = new THREE.Vector3(), Pp = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), Mx = new THREE.Matrix4();
  return {
    update(t, groundFn) {
      for (let i = 0; i < n; i++) {
        const b = bats[i], c = centers[b.c], th = b.ph + t * b.w;
        const x = c.x + Math.cos(th) * b.r, z = c.z + Math.sin(th) * b.r, y = c.y + b.h + Math.sin(th * 2.3 + b.f) * 1.6;
        const yaw = Math.atan2(Math.sin(th) * Math.sign(b.w), Math.cos(th) * -Math.sign(b.w)) ;
        const fl = Math.sin(t * 15 + b.f) * 0.85;
        E.set(0, yaw, 0); Q.setFromEuler(E); Mx.compose(Pp.set(x, y, z), Q, S.set(0.07 * b.s, 0.06 * b.s, 0.12 * b.s)); body.setMatrixAt(i, Mx);
        E.set(0, yaw, fl); Q.setFromEuler(E); Mx.compose(Pp, Q, S.set(b.s, b.s, b.s)); wl.setMatrixAt(i, Mx);
        E.set(0, yaw, -fl); Q.setFromEuler(E); Mx.compose(Pp, Q, S); wr.setMatrixAt(i, Mx);
      }
      body.instanceMatrix.needsUpdate = wl.instanceMatrix.needsUpdate = wr.instanceMatrix.needsUpdate = true;
    }
  };
}
// Floating embers & ground fog around the camera
function makeAmbient(scene, nE, nF, groundFn) {
  const em = new GlowPoints(Math.max(1, nE), GLOW_SPARK), fog = nF ? new GlowPoints(nF, GLOW_FOG) : null;
  const A = 34, F = 80, eo = [], fo = [];
  for (let i = 0; i < nE; i++) { eo.push({ x: Math.random() * A, y: Math.random() * 8, z: Math.random() * A, s: 0.04 + Math.random() * 0.07, ph: Math.random() * 6.28 }); em.add(0, -100, 0, Math.random() < 0.7 ? 0xff9a3a : 0xc8ff6a, 0.1, 1, 0.9); }
  for (let i = 0; i < nF; i++) { fo.push({ x: Math.random() * F, z: Math.random() * F, s: 9 + Math.random() * 10 }); fog.add(0, -100, 0, 0x9a8ab8, 10, 0); }
  em.commit(); scene.add(em.points);
  if (fog) { fog.commit(); scene.add(fog.points); }
  return {
    update(t, dt, cx, cy, cz) {
      for (let i = 0; i < nE; i++) {
        const e = eo[i]; e.y += dt * (0.25 + e.s * 4); if (e.y > 9) e.y -= 9;
        const x = e.x + A * Math.floor((cx - e.x) / A + 0.5) + Math.sin(t * 0.7 + e.ph) * 0.6, z = e.z + A * Math.floor((cz - e.z) / A + 0.5) + Math.cos(t * 0.6 + e.ph) * 0.6;
        const g = groundFn(x, z); em.set(i, x, g + 0.3 + e.y, z); em.setSize(i, e.s);
      }
      em.commit();
      if (fog) {
        for (let i = 0; i < nF; i++) {
          const f = fo[i], x = f.x + F * Math.floor((cx - f.x) / F + 0.5) + Math.sin(t * 0.05 + i) * 3, z = f.z + F * Math.floor((cz - f.z) / F + 0.5);
          const g = groundFn(x, z), edge = 1 - smooth(F * 0.32, F * 0.5, Math.max(Math.abs(x - cx), Math.abs(z - cz)));
          fog.set(i, x, Math.max(g, 0.2) + 1.2, z); fog.setSize(i, f.s * edge);
        }
        fog.commit();
      }
    }
  };
}
const BLOB_TEX = canvasTex(64, (ctx) => { const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.55, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); }, false);
const blobGeo = (() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; })();
function makeBlobs(scene, n, op) {
  const m = new THREE.InstancedMesh(blobGeo, new THREE.MeshBasicMaterial({ map: BLOB_TEX, transparent: true, depthWrite: false, opacity: op, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), n);
  m.frustumCulled = false; m.renderOrder = 1; scene.add(m);
  for (let i = 0; i < n; i++) { M4.makeScale(0, 0, 0); m.setMatrixAt(i, M4); }
  return { m, set(i, x, y, z, s) { if (s <= 0) M4.makeScale(0, 0, 0); else { M4.makeScale(s, 1, s); M4.setPosition(x, y, z); } m.setMatrixAt(i, M4); }, commit() { m.instanceMatrix.needsUpdate = true; } };
}

// ---- decorate a freshly built world (called from buildWorld)
function decorateHalloween(D) {
  const { scene, rng, getH, foot, overl, flatOK, slopeAt, map, GQ } = D;
  const glow = new GlowPoints(4000, GLOW_ADD); W.glow = glow;
  for (const h of W.haloQ) glow.add(h[0], h[1], h[2], h[3], h[4], h[6] || 0, h[5]);
  const DB = new MatBatch();
  const pumpkins = [], faces = [];
  const addPumpkin = (x, z, s, rotY, lit, yOver) => {
    const y = (yOver !== undefined ? yOver : getH(x, z)) - 0.05 * s;
    if (y < 1.0) return null;
    const p = { x, z, y, s, lit, dead: false };
    _e.set(0, rotY, 0); _q.setFromEuler(_e);
    p.m = new THREE.Matrix4().compose(V.set(x, y, z), _q, V2.set(s, s, s));
    pumpkins.push(p);
    if (lit) { p.face = { x, z, m: p.m }; faces.push(p.face); p.halo = glow.add(x - Math.sin(rotY) * 0.75 * s, y + 0.3 * s, z - Math.cos(rotY) * 0.75 * s, 0xff7a1a, 1.7 * s, 1, 0.9); }
    p.col = addCircleCol(x, z, 0.4 * s, y, y + 0.6 * s, { pumpkin: p });
    return p;
  };
  // houses: lanterns + pumpkins at the door
  for (const h of W.houses) {
    if (!h.lit) continue;
    const nx = h.door === 0 ? 0 : h.door === 1 ? 0 : h.door === 2 ? -1 : 1, nz = h.door === 0 ? -1 : h.door === 1 ? 1 : 0;
    const tx = -nz, tz = nx, dx0 = h.door < 2 ? h.cx : (h.door === 2 ? h.cx - h.w / 2 : h.cx + h.w / 2), dz0 = h.door < 2 ? (h.door === 0 ? h.cz - h.d / 2 : h.cz + h.d / 2) : h.cz;
    const rotY = Math.atan2(-nx, -nz);
    const n = 1 + ((rng() * 3) | 0);
    for (let k = 0; k < n; k++) { const side = k % 2 ? 1 : -1, off = 1.25 + (k >> 1) * 0.65; addPumpkin(dx0 + nx * (0.95 + (k >> 1) * 0.3) + tx * side * off, dz0 + nz * (0.95 + (k >> 1) * 0.3) + tz * side * off, 0.7 + rng() * 0.45, rotY + (rng() - 0.5) * 0.5, rng() < 0.8); }
    const lx = dx0 + tx * 1.05 + nx * 0.16, lz = dz0 + tz * 1.05 + nz * 0.16, ly = h.fy + 2.2;
    DB.box('metal', lx - 0.09, ly - 0.16, lz - 0.09, lx + 0.09, ly + 0.14, lz + 0.09, 0x1c1a1a);
    DB.box('lit', lx - 0.065, ly - 0.12, lz - 0.065, lx + 0.065, ly + 0.1, lz + 0.065, 0xffb050);
    DB.box('metal', lx - 0.11, ly + 0.14, lz - 0.11, lx + 0.11, ly + 0.18, lz + 0.11, 0x1c1a1a);
    glow.add(lx + nx * 0.1, ly, lz + nz * 0.1, 0xffa04a, 2.4, 1, 0.75);
  }
  // pumpkin patches near villages
  for (const v of W.villages) {
    for (let t = 0; t < 40; t++) {
      const a = rng() * 6.28, r = 26 + rng() * 22, x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r;
      if (getH(x, z) < 2.6 || slopeAt(x, z) > 1.4 || overl(x - 5, z - 5, x + 5, z + 5)) continue;
      const n = 8 + ((rng() * 7) | 0);
      for (let k = 0; k < n; k++) { const aa = rng() * 6.28, rr = Math.sqrt(rng()) * 4.5; addPumpkin(x + Math.cos(aa) * rr, z + Math.sin(aa) * rr, 0.7 + rng() * 0.7, rng() * 6.28, rng() < 0.35); }
      foot.push({ x0: x - 5, z0: z - 5, x1: x + 5, z1: z + 5 });
      break;
    }
  }
  // scattered pumpkins
  for (let i = 0, tries = 0; i < Math.round(map.houses * 1.3) && tries < 2000; tries++) {
    const x = (rng() * 2 - 1) * W.half * 0.9, z = (rng() * 2 - 1) * W.half * 0.9, h = getH(x, z);
    if (h < 2.6 || (map.snow && h > map.snow - 6) || slopeAt(x, z) > 2 || overl(x - 1, z - 1, x + 1, z + 1)) continue;
    addPumpkin(x, z, 0.65 + rng() * 0.7, rng() * 6.28, rng() < 0.3); i++;
  }
  // cemeteries
  const graveItems = [[], [], []], nCem = map.villages >= 4 ? 2 : 1;
  for (let c = 0; c < nCem && W.villages.length; c++) {
    const v = W.villages[(c * 3) % W.villages.length];
    for (let t = 0; t < 80; t++) {
      const a = rng() * 6.28, r = 50 + rng() * 30, x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r;
      const rot90 = rng() < 0.5, w = rot90 ? 12 : 16, d = rot90 ? 16 : 12;
      if (!flatOK(x, z, w, d) || overl(x - w / 2 - 2, z - d / 2 - 2, x + w / 2 + 2, z + d / 2 + 2)) continue;
      const base = rot90 ? Math.PI / 2 : 0, rows = 3, cols = 5;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if (rng() < 0.15) continue;
        const u = (i - (cols - 1) / 2) * 2.7 + (rng() - 0.5) * 0.4, vv = (j - (rows - 1) / 2) * 3.2 + (rng() - 0.5) * 0.3;
        const gx = x + (rot90 ? vv : u), gz = z + (rot90 ? u : vv), gy = getH(gx, gz) - 0.06, type = (rng() * 3) | 0;
        _e.set((rng() - 0.5) * 0.12, base + (rng() - 0.5) * 0.25, (rng() - 0.5) * 0.12); _q.setFromEuler(_e);
        graveItems[type].push({ x: gx, z: gz, m: new THREE.Matrix4().compose(V.set(gx, gy, gz), _q, V2.set(1, 1, 1)) });
        const ex = rot90 ? 0.17 : 0.38, ez = rot90 ? 0.38 : 0.17;
        addBoxCol(gx - ex, gy, gz - ez, gx + ex, gy + 0.95, gz + ez);
        if (rng() < 0.45) { const fx = gx + (rot90 ? 0.32 : 0.15), fz = gz + (rot90 ? 0.15 : -0.32), fy = getH(fx, fz); DB.box('plaster', fx - 0.03, fy, fz - 0.03, fx + 0.03, fy + 0.16, fz + 0.03, 0xe8e0c8); DB.box('lit', fx - 0.012, fy + 0.16, fz - 0.012, fx + 0.012, fy + 0.2, fz + 0.012, 0xffc060); glow.add(fx, fy + 0.2, fz, 0xffaa50, 0.55, 1, 0.9); }
      }
      // iron fence with a gate gap
      const fx0 = x - w / 2, fx1 = x + w / 2, fz0 = z - d / 2, fz1 = z + d / 2, fc = 0x18171a;
      const post = (px, pz) => { const py = getH(px, pz); DB.box('metal', px - 0.04, py - 0.2, pz - 0.04, px + 0.04, py + 1.15, pz + 0.04, fc); DB.box('metal', px - 0.02, py + 1.15, pz - 0.02, px + 0.02, py + 1.27, pz + 0.02, fc); };
      for (let px = fx0; px <= fx1 + 0.01; px += 0.5) { post(px, fz0); if (Math.abs(px - x) > 1.3) post(px, fz1); }
      for (let pz = fz0 + 0.5; pz < fz1; pz += 0.5) { post(fx0, pz); post(fx1, pz); }
      for (const [ax, az, bx, bz] of [[fx0, fz0, fx1, fz0], [fx0, fz1, x - 1.3, fz1], [x + 1.3, fz1, fx1, fz1], [fx0, fz0, fx0, fz1], [fx1, fz0, fx1, fz1]]) {
        const yA = getH((ax + bx) / 2, (az + bz) / 2);
        for (const ry of [0.3, 1.0]) DB.box('metal', Math.min(ax, bx) - 0.025, yA + ry, Math.min(az, bz) - 0.025, Math.max(ax, bx) + 0.025, yA + ry + 0.05, Math.max(az, bz) + 0.025, fc);
      }
      addBoxCol(fx0 - 0.05, getH(x, fz0) - 1, fz0 - 0.05, fx1 + 0.05, getH(x, fz0) + 1.2, fz0 + 0.05);
      addBoxCol(fx0 - 0.05, getH(fx0, z) - 1, fz0, fx0 + 0.05, getH(fx0, z) + 1.2, fz1);
      addBoxCol(fx1 - 0.05, getH(fx1, z) - 1, fz0, fx1 + 0.05, getH(fx1, z) + 1.2, fz1);
      addBoxCol(fx0, getH(x, fz1) - 1, fz1 - 0.05, x - 1.3, getH(x, fz1) + 1.2, fz1 + 0.05);
      addBoxCol(x + 1.3, getH(x, fz1) - 1, fz1 - 0.05, fx1, getH(x, fz1) + 1.2, fz1 + 0.05);
      // dead tree in a corner
      const tx = fx0 + 1.4, tz = fz0 + 1.4, ty = getH(tx, tz), dt = new THREE.Mesh(deadTreeGeo(c * 31 + 5), VEG_MAT);
      dt.position.set(tx, ty - 0.1, tz); dt.scale.setScalar(1.15); dt.castShadow = GQ.shadow > 0; scene.add(dt); W.disposables.push(dt.geometry);
      addCircleCol(tx, tz, 0.35, ty, ty + 6);
      foot.push({ x0: fx0 - 2, z0: fz0 - 2, x1: fx1 + 2, z1: fz1 + 2 });
      W.cemeteries = (W.cemeteries || []).concat([{ x, z }]);
      break;
    }
  }
  graveItems.forEach((list, i) => { if (list.length) instanceTiles(scene, graveGeo(i), STONE_MAT, list, 160, { cast: GQ.shadow > 0, receive: true }); });
  if (pumpkins.length) { const pg = pumpkinGeos(); instanceTiles(scene, pg.body, VEG_MAT, pumpkins, 120, { cast: GQ.shadow > 0, receive: true }); if (faces.length) instanceTiles(scene, pg.face, FACE_MAT, faces, 120, {}); }
  W.pumpkins = pumpkins;
  DB.build(scene, W.disposables);
  glow.commit(); scene.add(glow.points);
}
function smashPumpkin(p) {
  if (!p || p.dead) return;
  p.dead = true; p.col.dead = true;
  M4.makeScale(0, 0, 0);
  if (p.mesh) { p.mesh.setMatrixAt(p.idx, M4); p.mesh.instanceMatrix.needsUpdate = true; }
  if (p.face && p.face.mesh) { p.face.mesh.setMatrixAt(p.face.idx, M4); p.face.mesh.instanceMatrix.needsUpdate = true; }
  if (p.halo !== undefined && W.glow) { W.glow.setSize(p.halo, 0); W.glow.commit(); }
  burst(p.x, p.y + 0.3 * p.s, p.z, 0xe0661a, 16, 4); burst(p.x, p.y + 0.3 * p.s, p.z, 0xffd060, 6, 3);
  sfx('chop', 1); sfx('pick', 0.5);
  spawnLoot(p.x, p.y + 0.2, p.z, { type: 'caramelle', n: 1 }, (R() - 0.5) * 2.5, (R() - 0.5) * 2.5);
  if (R() < 0.22) spawnLoot(p.x, p.y + 0.2, p.z, randomLoot(R, 0), (R() - 0.5) * 2.5, (R() - 0.5) * 2.5);
}
function makeWorldFx(scene, GQ) {
  const centers = W.villages.slice(0, 5).map(v => ({ x: v.x, y: W.getH(v.x, v.z), z: v.z }));
  (W.cemeteries || []).forEach(c => centers.push({ x: c.x, y: W.getH(c.x, c.z), z: c.z }));
  const follow = { x: 0, y: 0, z: 0 }; centers.push(follow, follow);
  const bats = makeBats(scene, GQ.bats, centers);
  const amb = makeAmbient(scene, GQ.embers, GQ.wisps, (x, z) => W.getH(x, z));
  const blobs = makeBlobs(scene, W.map.bots + 1, GQ.shadow > 0 ? 0.32 : 0.6);
  const flash = new GlowPoints(16, GLOW_ADD); for (let i = 0; i < 16; i++) flash.add(0, -100, 0, 0xffd27a, 0, 0, 1.2); flash.commit(); scene.add(flash.points);
  const fl = new Float32Array(16); let fi = 0;
  return {
    follow, bats, amb, blobs,
    flash(x, y, z) { const i = fi++ % 16; flash.set(i, x, y, z); flash.setSize(i, 0.9 + Math.random() * 0.4); fl[i] = 0.06; },
    update(t, dt) {
      let any = false;
      for (let i = 0; i < 16; i++) if (fl[i] > 0) { fl[i] -= dt; if (fl[i] <= 0) flash.setSize(i, 0); any = true; }
      if (any) flash.commit();
    }
  };
}
function muzzle(x, y, z) { if (W && W.fx) W.fx.flash(x, y, z); }
function updateHalloweenFx(dt) {
  const fx = W.fx; if (!fx) return;
  const cp = camera.position, t = matchT;
  HALO_UNI.uTime.value += dt;
  HALO_UNI.uScale.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  if (P) { fx.follow.x = lerp(fx.follow.x, P.x, 1 - Math.exp(-0.5 * dt)); fx.follow.z = lerp(fx.follow.z, P.z, 1 - Math.exp(-0.5 * dt)); fx.follow.y = W.getH(fx.follow.x, fx.follow.z); }
  fx.bats.update(t);
  fx.amb.update(t, dt, cp.x, cp.y, cp.z);
  fx.update(t, dt);
  // soft contact shadows
  const bl = fx.blobs;
  const put = (i, ch, alive) => {
    const dx = ch.x - cp.x, dz = ch.z - cp.z;
    if (!alive || dx * dx + dz * dz > 70 * 70) { bl.set(i, 0, 0, 0, 0); return; }
    const g = groundAt(ch.x, ch.z, ch.y + 0.3), hgt = ch.y - g;
    bl.set(i, ch.x, g + 0.04, ch.z, clamp(1 - hgt / 12, 0, 1) * 1.15);
  };
  W.bots.forEach((b, i) => put(i, b, !b.onAirship && (b.alive || b.deadT > 0)));
  if (P) put(W.bots.length, P, (P.alive || P.deadT > 0) && P.phase !== 'airship');
  bl.commit();
}

// ---- the haunted airship: a wicker gondola hanging from a carved-pumpkin balloon, with a rear propeller
function makePumpkinAirship() {
  const g = new THREE.Group(), MB = new MatBatch(), disp = W ? W.disposables : [];
  const wicker = 0x8a5a32, wickerD = 0x5e3a1e, iron = 0x3a3436, brass = 0xb08a4a;
  const box = (k, x0, y0, z0, x1, y1, z1, c) => MB.box(k, x0, y0, z0, x1, y1, z1, c);
  // gondola: round woven basket with a padded rim and a darker base
  MB.geo('wood', new THREE.CylinderGeometry(2.5, 2.0, 1.9, 14, 1, true), mtx(0, 0.05, 0), wicker);
  MB.geo('wood', new THREE.CylinderGeometry(2.0, 2.0, 0.12, 14), mtx(0, -0.86, 0), wickerD);
  MB.geo('dark', new THREE.TorusGeometry(2.5, 0.16, 6, 20), mtx(0, 1.0, 0, 1, 1, 1, Math.PI / 2), wickerD);
  MB.geo('dark', new THREE.TorusGeometry(2.25, 0.09, 5, 20), mtx(0, -0.35, 0, 1, 1, 1, Math.PI / 2), wickerD);
  for (const [y, r] of [[0.45, 2.38], [-0.75, 2.05]]) MB.geo('dark', new THREE.TorusGeometry(r, 0.07, 5, 20), mtx(0, y, 0, 1, 1, 1, Math.PI / 2), wickerD);
  // rear propeller on an iron boom (it is an airship, not a balloon)
  box('metal', -0.12, 0.55, 2.2, 0.12, 0.8, 4.4, iron);
  MB.geo('metal', new THREE.CylinderGeometry(0.28, 0.36, 0.7, 10), mtx(0, 0.68, 4.6, 1, 1, 1, Math.PI / 2), brass);
  const prop = new THREE.Group(); prop.position.set(0, 0.68, 5.0);
  // ropes up to the balloon
  const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), dv = new THREE.Vector3(), cg = new THREE.CylinderGeometry(0.05, 0.05, 1, 5);
  const rope = (a, b) => { dv.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = dv.length(); dv.multiplyScalar(1 / L); q.setFromUnitVectors(up, dv); MB.geo('dark', cg, new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, L, 1)), 0x2a2018); };
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.26; rope([Math.cos(a) * 2.4, 1.05, Math.sin(a) * 2.4], [Math.cos(a) * 1.6, 7.6, Math.sin(a) * 1.6]); }
  box('dark', -1.0, 7.0, -1.0, 1.0, 7.35, 1.0, 0x1a1418);
  // lanterns hanging from the rim
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, x = Math.cos(a) * 2.75, z = Math.sin(a) * 2.75; box('metal', x - 0.04, 0.55, z - 0.04, x + 0.04, 1.0, z + 0.04, iron); box('lit', x - 0.16, 0.2, z - 0.16, x + 0.16, 0.55, z + 0.16, 0xffa040); }
  MB.build(g, disp);
  const bladeG = new THREE.BoxGeometry(0.22, 2.6, 0.06), bladeM = new THREE.MeshStandardMaterial({ color: linC(0x2a1e16), roughness: 0.8 });
  disp.push(bladeG, bladeM);
  for (const r of [0, Math.PI / 2]) { const bl = new THREE.Mesh(bladeG, bladeM); bl.rotation.z = r; prop.add(bl); }
  g.add(prop);
  // carved pumpkin balloon, with a face on both sides
  const pg = pumpkinGeos(), BS = 15;
  const balloon = new THREE.Group(); balloon.position.y = 7.4; g.add(balloon);
  const bb = new THREE.Mesh(pg.body, VEG_MAT); bb.scale.setScalar(BS); bb.castShadow = true; balloon.add(bb);
  for (const ry of [0, Math.PI]) { const f = new THREE.Mesh(pg.face, FACE_MAT); f.scale.setScalar(BS); f.rotation.y = ry; balloon.add(f); }
  // small pumpkins riding in the gondola
  for (const [x, z, s, ry] of [[-0.9, -0.6, 0.9, 0.3], [0.9, 0.5, 0.75, -2.6], [-0.2, 1.2, 0.6, 2.9]]) {
    const pb = new THREE.Mesh(pg.body, VEG_MAT); pb.position.set(x, 0.95, z); pb.scale.setScalar(s); pb.rotation.y = ry; g.add(pb);
    const pf = new THREE.Mesh(pg.face, FACE_MAT); pf.position.copy(pb.position); pf.scale.setScalar(s); pf.rotation.y = ry; g.add(pf);
  }
  // glows (local to the airship, so they travel with it)
  const gl = new GlowPoints(48, GLOW_ADD);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; gl.add(Math.cos(a) * 2.75, 0.38, Math.sin(a) * 2.75, 0xff9a3a, 2.6, 1, 0.5); }
  for (const zz of [-1, 1]) { gl.add(-0.13 * BS, 7.4 + 0.42 * BS, zz * 0.45 * BS, 0xff8a24, 6, 1, 0.8); gl.add(0.13 * BS, 7.4 + 0.42 * BS, zz * 0.45 * BS, 0xff8a24, 6, 1, 0.8); gl.add(0, 7.4 + 0.22 * BS, zz * 0.46 * BS, 0xff7a1a, 7, 1, 0.75); }
  const burner = gl.add(0, 7.7, 0, 0x7dff9a, 3.5, 1, 1);
  gl.commit(); g.add(gl.points);
  const center = { x: 0, y: 0, z: 0 };
  const bats = makeBats(W ? W.scene : g, 12, [center], -4, 10, 9, 8);
  let t = 0;
  return {
    group: g, center,
    update(dt) {
      t += dt;
      center.x = g.position.x; center.y = g.position.y - 2; center.z = g.position.z;
      prop.rotation.z += dt * 9; balloon.rotation.z = Math.sin(t * 0.7) * 0.03; balloon.position.y = 7.4 + Math.sin(t * 1.1) * 0.15;
      g.rotation.z = Math.sin(t * 0.9) * 0.025;
      gl.setSize(burner, 3 + Math.sin(t * 13) * 0.6 + Math.sin(t * 7.3) * 0.5); gl.commit();
      bats.update(t);
    }
  };
}

// ================= COLLISION =================
function groundAt(x, z, y) {
  let g = W.getH(x, z); if (g < -1.1) g = -1.1;
  const l = gAt(x, z);
  if (l) for (const c of l) {
    if (c.dead) continue;
    if (c.t === 0) { if (x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1 && c.y1 <= y + STEP && c.y1 > g) g = c.y1; }
    else if (c.t === 1) { if (c.tree) continue; const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < c.r * c.r && c.y1 <= y + STEP && c.y1 > g) g = c.y1; }
    else { const lx = x - c.cx, lz = z - c.cz; if (Math.abs(lx) <= 2 && Math.abs(lz) <= 2) { const t = clamp((lx * c.dx + lz * c.dz) / 4 + 0.5, 0, 1); const h = c.base + t * 4; if (h <= y + 0.95 && h > g) g = h; } }
  }
  return g;
}
function resolve(ch) {
  const l = gAt(ch.x, ch.z); if (!l) return;
  const r = 0.4, feet = ch.y, top = ch.y + 1.8;
  for (const c of l) {
    if (c.dead) continue;
    if (c.t === 0) {
      if (top <= c.y0 || feet + STEP >= c.y1) continue;
      const px = clamp(ch.x, c.x0, c.x1), pz = clamp(ch.z, c.z0, c.z1);
      const dx = ch.x - px, dz = ch.z - pz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), p = r - d; ch.x += dx / d * p; ch.z += dz / d * p; }
      else {
        const pl = ch.x - c.x0, pr = c.x1 - ch.x, pb = ch.z - c.z0, pf = c.z1 - ch.z, m = Math.min(pl, pr, pb, pf);
        if (m === pl) ch.x = c.x0 - r; else if (m === pr) ch.x = c.x1 + r; else if (m === pb) ch.z = c.z0 - r; else ch.z = c.z1 + r;
      }
      ch.blocked = true;
    } else if (c.t === 1) {
      if (top <= c.y0 || feet + STEP >= c.y1) continue;
      const dx = ch.x - c.x, dz = ch.z - c.z, rr = c.r + r, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.001; ch.x = c.x + dx / d * rr; ch.z = c.z + dz / d * rr; ch.blocked = true; }
    }
  }
}
function stepChar(ch, vx, vz, dt) {
  const dist = Math.hypot(vx, vz) * dt, n = Math.max(1, Math.ceil(dist / 0.22));
  ch.blocked = false;
  for (let i = 0; i < n; i++) { ch.x += vx * dt / n; ch.z += vz * dt / n; resolve(ch); }
  const lim = W.half - 1.5; ch.x = clamp(ch.x, -lim, lim); ch.z = clamp(ch.z, -lim, lim);
  ch.vy -= GRAV * dt; ch.y += ch.vy * dt;
  const g = groundAt(ch.x, ch.z, ch.y);
  if (ch.y <= g) { ch.y = g; ch.vy = 0; ch.onGround = true; }
  else if (ch.onGround && ch.vy <= 0 && ch.y - g < 0.5) { ch.y = g; ch.vy = 0; }
  else ch.onGround = false;
  ch.swim = W.getH(ch.x, ch.z) < -0.7 && ch.y < -0.5;
}

// ================= RAYCAST =================
let rayStamp = 0;
function rayAABB(ox, oy, oz, dx, dy, dz, c) {
  let tmin = 0, tmax = 1e9;
  const ax = [[ox, dx, c.x0, c.x1], [oy, dy, c.y0, c.y1], [oz, dz, c.z0, c.z1]];
  for (const [o, d, mn, mx] of ax) {
    if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) return -1; }
    else { let t1 = (mn - o) / d, t2 = (mx - o) / d; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
  }
  return tmin;
}
function rayCyl(ox, oy, oz, dx, dy, dz, c) {
  const fx = ox - c.x, fz = oz - c.z, a = dx * dx + dz * dz; if (a < 1e-9) return -1;
  const b = 2 * (fx * dx + fz * dz), cc = fx * fx + fz * fz - c.r * c.r, disc = b * b - 4 * a * cc;
  if (disc < 0) return -1; const t = (-b - Math.sqrt(disc)) / (2 * a); if (t < 0) return -1;
  const y = oy + dy * t; if (y < c.y0 || y > c.y1) return -1; return t;
}
function rayRamp(ox, oy, oz, dx, dy, dz, c) {
  const nx = -c.dx, ny = 1, nz = -c.dz, den = dx * nx + dy * ny + dz * nz; if (Math.abs(den) < 1e-6) return -1;
  const t = ((c.cx - ox) * nx + (c.base + 2 - oy) * ny + (c.cz - oz) * nz) / den; if (t < 0) return -1;
  const hx = ox + dx * t - c.cx, hz = oz + dz * t - c.cz; if (Math.abs(hx) > 2 || Math.abs(hz) > 2) return -1; return t;
}
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const fx = ox - cx, fy = oy - cy, fz = oz - cz, b = fx * dx + fy * dy + fz * dz, c = fx * fx + fy * fy + fz * fz - r * r, disc = b * b - c;
  if (disc < 0) return -1; const t = -b - Math.sqrt(disc); return t >= 0 ? t : -1;
}
function rayChar(ox, oy, oz, dx, dy, dz, ch) {
  const fx = ch.x - ox, fy = ch.y + 1.1 - oy, fz = ch.z - oz, tc = fx * dx + fy * dy + fz * dz;
  if (tc < -1) return null; const d2 = fx * fx + fy * fy + fz * fz - tc * tc; if (d2 > 2.2) return null;
  let best = null;
  const th = raySphere(ox, oy, oz, dx, dy, dz, ch.x, ch.y + 1.86, ch.z, 0.32); if (th >= 0) best = { t: th, head: true };
  for (const yy of [0.4, 0.9, 1.35]) { const t = raySphere(ox, oy, oz, dx, dy, dz, ch.x, ch.y + yy, ch.z, 0.44); if (t >= 0 && (!best || t < best.t - 0.05)) best = { t, head: false }; }
  return best;
}
function rayWorld(ox, oy, oz, dx, dy, dz, maxD, opt = {}) {
  let best = maxD, hit = null; const t0 = opt.tStart || 0;
  rayStamp++;
  const step = CELL / 3;
  for (let s = t0; ; s += step) {
    const ss = Math.min(s, maxD), l = gAt(ox + dx * ss, oz + dz * ss);
    if (l) for (const c of l) {
      if (c.dead || c.rs === rayStamp) continue; c.rs = rayStamp;
      if (opt.noTrees && (c.tree || c.pumpkin)) continue;
      const t = c.t === 0 ? rayAABB(ox, oy, oz, dx, dy, dz, c) : c.t === 1 ? rayCyl(ox, oy, oz, dx, dy, dz, c) : rayRamp(ox, oy, oz, dx, dy, dz, c);
      if (t >= t0 && t < best) { best = t; hit = { kind: 'col', col: c }; }
    }
    if (s >= maxD || s > best + step) break;
  }
  const ts = opt.tstep || 1.0;
  for (let t = t0 + ts; t < best + ts; t += ts) {
    const tt = Math.min(t, best);
    if (oy + dy * tt < W.getH(ox + dx * tt, oz + dz * tt)) {
      let a = Math.max(t0, tt - ts), b = tt;
      for (let k = 0; k < 6; k++) { const m = (a + b) / 2; if (oy + dy * m < W.getH(ox + dx * m, oz + dz * m)) b = m; else a = m; }
      if (b < best) { best = b; hit = { kind: 'terrain' }; } break;
    }
    if (tt >= best) break;
  }
  if (opt.chars) {
    for (const b of W.bots) {
      if (!b.alive || b === opt.skip) continue;
      const r = rayChar(ox, oy, oz, dx, dy, dz, b);
      if (r && r.t >= t0 && r.t < best) { best = r.t; hit = { kind: 'char', ch: b, head: r.head }; }
    }
  }
  if (!hit) hit = { kind: 'none' };
  hit.t = best; return hit;
}
function blockedStatic(a, ay, b, by) {
  const dx = b.x - a.x, dy = by - ay, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1;
  const h = rayWorld(a.x, ay, a.z, dx / d, dy / d, dz / d, d, { tstep: 2.5, tStart: 0.5, noTrees: true });
  return h.kind === 'terrain' || (h.kind === 'col' && !h.col.built);
}

// ================= EFFECTS =================
function burst(x, y, z, hex, n = 8, spd = 4) {
  if (!W) return;
  const dxp = x - camera.position.x, dzp = z - camera.position.z; if (dxp * dxp + dzp * dzp > 140 * 140) return;
  const c = new THREE.Color(hex);
  for (let i = 0; i < n; i++) {
    const idx = W.pIdx++ % W.pool.length, p = W.pool[idx];
    p.x = x; p.y = y; p.z = z; p.vx = (R() - 0.5) * spd * 2; p.vy = R() * spd * 1.4; p.vz = (R() - 0.5) * spd * 2; p.life = 0.5 + R() * 0.5; p.max = p.life; p.s = 0.7 + R() * 0.8;
    W.pMesh.setColorAt(idx, c);
  }
  W.pMesh.instanceColor.needsUpdate = true;
}
function updateParticles(dt) {
  let any = false;
  for (let i = 0; i < W.pool.length; i++) {
    const p = W.pool[i];
    if (p.life <= 0) { if (p.was) { M4.makeScale(0, 0, 0); W.pMesh.setMatrixAt(i, M4); p.was = false; any = true; } continue; }
    p.life -= dt; p.vy -= 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const s = p.s * clamp(p.life / p.max, 0, 1) + 0.01; M4.makeScale(s, s, s); M4.setPosition(p.x, p.y, p.z); W.pMesh.setMatrixAt(i, M4); p.was = true; any = true;
  }
  if (any) W.pMesh.instanceMatrix.needsUpdate = true;
  for (const t of W.tracers) if (t.life > 0) { t.life -= dt; if (t.life <= 0) t.l.visible = false; }
}
function tracer(ax, ay, az, bx, by, bz, enemy) {
  const t = W.tracers[W.tIdx++ % W.tracers.length];
  const p = t.l.geometry.attributes.position.array; p[0] = ax; p[1] = ay; p[2] = az; p[3] = bx; p[4] = by; p[5] = bz;
  t.l.geometry.attributes.position.needsUpdate = true; t.l.material = enemy ? W.tracerMatE : W.tracerMat; t.l.visible = true; t.life = enemy ? 0.07 : 0.05;
}
function dmgNum(x, y, z, n, head, shield) { W.nums.push({ x, y, z, txt: String(Math.round(n)), col: shield ? '#7fd3ff' : '#ffffff', t: 0.9 }); }

// ================= HUD helpers =================
const hud = {
  feed: $('#feed'), banner: $('#banner'), loc: $('#loc'), locName: $('#locName'), stormTxt: $('#stormTxt'), alive: $('#aliveN'), kills: $('#killN'),
  hpFill: $('#hpFill'), shFill: $('#shFill'), hpN: $('#hpN'), shN: $('#shN'), slots: $('#slots'), mag: $('#magN'), res: $('#resN'), wood: $('#woodN'),
  heal: $('#healN'), shield: $('#shieldN'), bHeal: $('#bHeal'), bShield: $('#bShield'), cross: $('#cross'), prompt: $('#prompt'), pickBtn: $('#pickBtn'),
  useBar: $('#useBar'), useTxt: $('#useTxt'), useFill: $('#useFill'), drop: $('#dropWrap'), alt: $('#alt'), vign: $('#vignette'), tint: $('#stormTint'), scope: $('#scope'),
  mini: $('#mini'), bigmap: $('#bigmap'), bigC: $('#bigC')
};
const miniCtx = hud.mini.getContext('2d'), bigCtx = hud.bigC.getContext('2d');
let bannerT = 0, locT = 0, lastLoc = null;
function banner(txt, dur = 3) { hud.banner.textContent = txt; hud.banner.style.opacity = 1; bannerT = dur; }
function feed(txt, cls) {
  const d = document.createElement('div'); d.textContent = txt; if (cls) d.className = cls; hud.feed.prepend(d);
  while (hud.feed.children.length > 5) hud.feed.lastChild.remove();
  setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 600); }, 5000);
}
const ICONS = {
  piccone: '<path d="M8 22 L32 7" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M20 3 Q34 -2 45 11 L41 13 Q33 5 23 8Z"/>',
  pistola: '<rect x="12" y="7" width="24" height="7" rx="1.5"/><rect x="14" y="12" width="7" height="10" rx="1.5"/>',
  mitra: '<rect x="6" y="7" width="32" height="7" rx="1.5"/><rect x="18" y="12" width="5" height="10" rx="1"/><rect x="28" y="12" width="5" height="7" rx="1"/><rect x="38" y="9" width="6" height="3"/>',
  assalto: '<rect x="2" y="8" width="12" height="6" rx="1.5"/><rect x="12" y="6" width="26" height="8" rx="1.5"/><rect x="20" y="12" width="5" height="10" rx="1"/><rect x="38" y="9" width="9" height="3"/><rect x="18" y="3" width="10" height="3"/>',
  pompa: '<rect x="2" y="8" width="14" height="7" rx="2"/><rect x="14" y="6" width="32" height="5" rx="1.5"/><rect x="22" y="11" width="16" height="5" rx="1.5"/>',
  cecchino: '<rect x="1" y="9" width="12" height="6" rx="1.5"/><rect x="12" y="8" width="24" height="5" rx="1"/><rect x="36" y="9" width="11" height="3"/><rect x="16" y="2" width="14" height="5" rx="2"/>',
};
function renderSlots() {
  hud.slots.innerHTML = '';
  P.slots.forEach((it, i) => {
    const b = document.createElement('button'); b.className = 'slot' + (i === P.cur ? ' cur' : ''); b.tabIndex = -1;
    if (it) {
      const rc = it.kind === 'piccone' ? '#c9d0dc' : RAR[it.rar].css;
      b.style.background = it.kind === 'piccone' ? '' : `linear-gradient(180deg, ${rc}55, ${rc}22)`;
      if (it.kind !== 'piccone') b.style.borderColor = i === P.cur ? '#fff' : rc + 'aa';
      b.innerHTML = `<em>${i + 1}</em><svg viewBox="0 0 48 24" fill="currentColor" style="color:${it.kind === 'piccone' ? '#fff' : rc}">${ICONS[it.kind]}</svg>`;
      b.setAttribute('aria-label', it.kind === 'piccone' ? 'Piccone' : WEAPONS[it.kind].name + ' ' + RAR[it.rar].name);
    } else { b.innerHTML = `<em>${i + 1}</em>`; b.setAttribute('aria-label', 'Slot vuoto'); }
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); selectSlot(i); });
    hud.slots.appendChild(b);
  });
}
const hudCache = {};
function setTxt(el, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; el.textContent = v; } }
function updateHUD(dt) {
  setTxt(hud.hpN, 'hp', Math.ceil(P.hp)); setTxt(hud.shN, 'sh', Math.ceil(P.shield));
  if (hudCache.hpw !== Math.ceil(P.hp)) { hudCache.hpw = Math.ceil(P.hp); hud.hpFill.style.width = clamp(P.hp, 0, 100) + '%'; }
  if (hudCache.shw !== Math.ceil(P.shield)) { hudCache.shw = Math.ceil(P.shield); hud.shFill.style.width = clamp(P.shield, 0, 100) + '%'; }
  const it = P.slots[P.cur];
  if (it.kind === 'piccone') { setTxt(hud.mag, 'mag', '∞'); setTxt(hud.res, 'res', 'MUN. ' + P.ammo); }
  else { setTxt(hud.mag, 'mag', P.reloadT > 0 ? '…' : it.mag + '/' + WEAPONS[it.kind].mag); setTxt(hud.res, 'res', 'MUN. ' + P.ammo); }
  setTxt(hud.wood, 'wood', P.wood); setTxt(hud.heal, 'heal', P.bende); setTxt(hud.shield, 'shield', P.scudi);
  hud.bHeal.disabled = P.bende <= 0; hud.bShield.disabled = P.scudi <= 0;
  setTxt(hud.alive, 'alive', W.aliveBots + (P.alive ? 1 : 0)); setTxt(hud.kills, 'kills', P.kills);
  const s = W.storm, mmss = t => { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  setTxt(hud.stormTxt, 'storm', s.state === 'wait' ? 'Tempesta tra ' + mmss(s.timer) : s.state === 'shrink' ? 'Si chiude · ' + mmss(s.timer) : 'Cerchio finale');
  // crosshair
  let sp = 10;
  if (it.kind !== 'piccone') { const w = WEAPONS[it.kind]; sp = 4 + w.spread * 260 * (P.aim ? 0.35 : 1) * (P.moving ? 1.3 : 1) * (P.onGround ? 1 : 2) + P.recoil * 40; }
  hud.cross.style.setProperty('--s', sp.toFixed(1) + 'px');
  hud.cross.classList.toggle('dot', it.kind === 'piccone');
  const scoped = P.aim && WEAPONS[it.kind].scope && P.phase === 'ground';
  hud.scope.style.display = scoped ? 'block' : 'none'; hud.cross.style.display = P.phase === 'ground' && P.alive ? 'block' : 'none';
  // timers
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) hud.banner.style.opacity = 0; }
  if (locT > 0) { locT -= dt; if (locT <= 0) hud.loc.style.opacity = 0; }
  hud.vign.style.opacity = clamp(P.hurtT * 1.6, 0, 0.9); P.hurtT = Math.max(0, P.hurtT - dt);
  const out = P.alive && Math.hypot(P.x - s.cx, P.z - s.cz) > s.r;
  hud.tint.style.opacity = out && P.phase === 'ground' ? 1 : 0;
  hud.drop.style.display = P.phase === 'airship' ? 'block' : 'none';
  hud.alt.style.display = P.phase === 'fall' || P.phase === 'glide' ? 'block' : 'none';
  if (P.phase === 'fall' || P.phase === 'glide') setTxt(hud.alt, 'alt', Math.max(0, Math.round(P.y - W.getH(P.x, P.z))) + ' m');
  if (P.useT > 0) { hud.useBar.style.display = 'block'; setTxt(hud.useTxt, 'use', P.useKind === 'bende' ? 'Bende…' : 'Scudo…'); hud.useFill.style.width = (100 * (1 - P.useT / P.useMax)) + '%'; }
  else hud.useBar.style.display = 'none';
}

// ================= MINIMAP =================
function drawMap(ctx, size, big) {
  const S = W.S, half = W.half, k = size / S, s = W.storm;
  const toX = x => (x + half) * k, toY = z => (z + half) * k;
  ctx.clearRect(0, 0, size, size); ctx.drawImage(W.minimapImg, 0, 0, size, size);
  if (big) {
    ctx.font = `900 ${Math.round(size * 0.024)}px Nunito, sans-serif`; ctx.textAlign = 'center';
    for (const v of W.villages) { ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,14,40,.8)'; ctx.strokeText(v.name.toUpperCase(), toX(v.x), toY(v.z) - 6); ctx.fillStyle = '#fff'; ctx.fillText(v.name.toUpperCase(), toX(v.x), toY(v.z) - 6); }
  }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, size, size); ctx.arc(toX(s.cx), toY(s.cz), Math.max(0.5, s.r * k), 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(40,190,110,.4)'; ctx.fill('evenodd'); ctx.restore();
  ctx.lineWidth = big ? 3 : 2; ctx.strokeStyle = 'rgba(150,255,190,.95)'; ctx.beginPath(); ctx.arc(toX(s.cx), toY(s.cz), Math.max(0.5, s.r * k), 0, Math.PI * 2); ctx.stroke();
  if (s.state !== 'done') { ctx.strokeStyle = '#fff'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(toX(s.nx), toY(s.nz), Math.max(0.5, s.nr * k), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  if (W.airship && W.airship.active) {
    const b = W.airship; ctx.strokeStyle = 'rgba(255,215,90,.9)'; ctx.lineWidth = big ? 3 : 2; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(toX(b.sx), toY(b.sz)); ctx.lineTo(toX(b.ex), toY(b.ez)); ctx.stroke(); ctx.setLineDash([]);
  }
  const px = toX(P.x), py = toY(P.z), a = -yaw;
  ctx.save(); ctx.translate(px, py); ctx.rotate(a);
  const sc = big ? 1.6 : 1.1;
  ctx.beginPath(); ctx.moveTo(0, -9 * sc); ctx.lineTo(6 * sc, 6 * sc); ctx.lineTo(0, 3 * sc); ctx.lineTo(-6 * sc, 6 * sc); ctx.closePath();
  ctx.fillStyle = '#ffc53d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#1a1030'; ctx.stroke(); ctx.restore();
}

// ================= PLAYER =================
function newPlayer() {
  const m = makeHuman(outfitLook(settings.outfit));
  P = { isBot: false, name: 'Tu', alive: true, x: 0, y: 150, z: 0, vy: 0, onGround: false, blocked: false, swim: false, hp: 100, shield: 0,
    slots: [{ kind: 'piccone', rar: 0, mag: 0 }, null, null, null, null], cur: 0, ammo: 36, wood: 40, bende: 0, scudi: 0, phase: 'airship',
    fireT: 0, reloadT: 0, useT: 0, useMax: 1, useKind: null, aim: false, kills: 0, dmg: 0, landT: 0, moving: false, swingT: 0, recoil: 0, hurtT: 0,
    model: m, animT: 0, speedNow: 0, deathT: 0, startT: 0 };
  setGun(m, 'piccone', 0); W.scene.add(m.g);
}
function selectSlot(i) {
  if (!P || !P.alive || !P.slots[i] || i === P.cur) return;
  P.cur = i; P.reloadT = 0; P.fireT = Math.max(P.fireT, 0.2);
  const it = P.slots[i]; setGun(P.model, it.kind, it.rar);
  if (it.kind === 'piccone') setAim(false);
  renderSlots(); sfx('click', 0.6);
}
function cycleSlot(dir) { if (!P) return; for (let k = 1; k <= 5; k++) { const i = (P.cur + dir * k + 50) % 5; if (P.slots[i]) { selectSlot(i); return; } } }
function setAim(v) { if (!P) return; if (v && P.slots[P.cur].kind === 'piccone') v = false; P.aim = v; $('#bAim').classList.toggle('on', v); }
function startReload() {
  const it = P.slots[P.cur]; if (it.kind === 'piccone' || P.reloadT > 0) return;
  const w = WEAPONS[it.kind]; if (it.mag >= w.mag) return;
  if (P.ammo <= 0) { banner('Niente munizioni: cercale nei forzieri', 2); sfx('empty'); return; }
  P.reloadT = w.reload; sfx('reload', 0.8);
}
function finishReload() { const it = P.slots[P.cur]; if (it.kind === 'piccone') return; const w = WEAPONS[it.kind]; const take = Math.min(w.mag - it.mag, P.ammo); it.mag += take; P.ammo -= take; }
function useItem(kind) {
  if (!P.alive || P.phase !== 'ground' || P.useT > 0) return;
  if (kind === 'bende') { if (P.bende <= 0) return; if (P.hp >= 100) { banner('Salute già al massimo', 1.5); return; } P.useT = P.useMax = 2.4; }
  else { if (P.scudi <= 0) return; if (P.shield >= 100) { banner('Scudo già al massimo', 1.5); return; } P.useT = P.useMax = 2.8; }
  P.useKind = kind; P.reloadT = 0;
}
function finishUse() {
  if (P.useKind === 'bende' && P.bende > 0) { P.bende--; P.hp = Math.min(100, P.hp + 30); sfx('heal'); burst(P.x, P.y + 1.2, P.z, 0x6cff8a, 10, 2); }
  if (P.useKind === 'scudo' && P.scudi > 0) { P.scudi--; P.shield = Math.min(100, P.shield + 50); sfx('heal'); burst(P.x, P.y + 1.2, P.z, 0x41b9ff, 10, 2); }
  P.useKind = null;
}
function camFwd(out) { const cp = Math.cos(pitch); return out.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp); }
function playerFire() {
  const it = P.slots[P.cur];
  if (P.useT > 0) { P.useT = 0; P.useKind = null; }
  if (it.kind === 'piccone') { pickaxeSwing(); return; }
  const w = WEAPONS[it.kind];
  if (P.reloadT > 0) return;
  if (it.mag <= 0) { if (P.ammo > 0) startReload(); else { sfx('empty'); P.fireT = 0.3; banner('Niente munizioni', 1.2); } return; }
  it.mag--; P.fireT = w.rate; sfx(it.kind, 1);
  const cp = camera.position, f = camFwd(new THREE.Vector3());
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const mx = P.x + rx * 0.45 + f.x * 1.0, my = P.y + 1.42 + f.y * 1.0, mz = P.z + rz * 0.45 + f.z * 1.0;
  muzzle(mx, my, mz);
  const tStart = Math.max(0, (P.x - cp.x) * f.x + (P.y + 1.6 - cp.y) * f.y + (P.z - cp.z) * f.z) + 0.4;
  let spread = w.spread * (P.aim ? 0.35 : 1) * (P.moving ? 1.3 : 1) * (P.onGround ? 1 : 2.2) + P.recoil * 0.15;
  if (w.scope && P.aim) spread = 0.0015;
  const pellets = w.pellets || 1;
  let hits = 0, head = false;
  for (let i = 0; i < pellets; i++) {
    const d = new THREE.Vector3(f.x + (R() - 0.5) * 2 * spread, f.y + (R() - 0.5) * 2 * spread, f.z + (R() - 0.5) * 2 * spread).normalize();
    const h = rayWorld(cp.x, cp.y, cp.z, d.x, d.y, d.z, w.range, { chars: true, skip: P, tStart });
    const hx = cp.x + d.x * h.t, hy = cp.y + d.y * h.t, hz = cp.z + d.z * h.t;
    if (i < 3) tracer(mx, my, mz, hx, hy, hz, false);
    if (h.kind === 'char') {
      let dmg = w.dmg * RAR[it.rar].m * (h.head ? w.head : 1);
      if (it.kind === 'pompa' || it.kind === 'mitra') dmg *= clamp(1.2 - h.t / w.range, 0.4, 1);
      damageBot(h.ch, dmg, P, it.kind, h.head, hx, hy, hz); hits++; head = head || h.head;
      burst(hx, hy, hz, 0xff5050, 4, 3);
    } else if (h.kind === 'col') {
      if (h.col.built) damageBuilt(h.col.built, w.dmg * RAR[it.rar].m);
      if (h.col.pumpkin) smashPumpkin(h.col.pumpkin);
      burst(hx, hy, hz, h.col.tree ? 0x8a5a2b : 0xd8d0c0, 3, 2.5);
    } else if (h.kind === 'terrain') burst(hx, hy, hz, 0x9a8a60, 3, 2.5);
  }
  if (hits) { sfx(head ? 'head' : 'hit', 0.9); P.hitmT = 0.15; P.hitHead = head; }
  P.recoil = Math.min(0.12, P.recoil + (it.kind === 'cecchino' ? 0.08 : it.kind === 'pompa' ? 0.06 : 0.02));
  pitch = clamp(pitch + (it.kind === 'cecchino' ? 0.03 : it.kind === 'pompa' ? 0.025 : 0.006), -1.25, 1.1);
  if (it.mag === 0 && P.ammo > 0) setTimeout(() => { if (P && P.alive && P.slots[P.cur] === it && it.mag === 0) startReload(); }, 250);
}
function pickaxeSwing() {
  P.fireT = WEAPONS.piccone.rate; P.swingT = 0.3; sfx('swing', 0.8);
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  let best = null, bd = 2.9;
  for (const b of W.bots) { if (!b.alive) continue; const dx = b.x - P.x, dz = b.z - P.z, d = Math.hypot(dx, dz); if (d < bd && Math.abs(b.y - P.y) < 2 && (dx * fx + dz * fz) / (d || 1) > 0.5) { bd = d; best = b; } }
  if (best) { damageBot(best, 20, P, 'piccone', false, best.x, best.y + 1.4, best.z); sfx('hit'); P.hitmT = 0.15; P.hitHead = false; return; }
  const l = gAt(P.x + fx * 1.5, P.z + fz * 1.5) || [];
  let tree = null, td = 3.2;
  for (const c of l) {
    if (c.dead) continue;
    if (c.t === 1 && c.pumpkin) { const dx = c.x - P.x, dz = c.z - P.z, d = Math.hypot(dx, dz); if (d < 2.4 && (dx * fx + dz * fz) / (d || 1) > 0.3) { smashPumpkin(c.pumpkin); return; } }
    if (c.t === 1 && c.tree) { const dx = c.x - P.x, dz = c.z - P.z, d = Math.hypot(dx, dz) - c.r; if (d < td && (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1) > 0.35) { td = d; tree = c; } }
  }
  const h = rayWorld(P.x, P.y + 1.3, P.z, fx, 0, fz, 3, {});
  if (h.kind === 'col' && h.col.built && (!tree || h.t < td)) { damageBuilt(h.col.built, 60); sfx('wallhit'); return; }
  if (tree) {
    const t = tree.tree; t.hp--; P.wood = Math.min(999, P.wood + 12); sfx('chop'); burst(t.x, t.y + 1.5, t.z, 0x8a5a2b, 6, 3);
    dmgNum(t.x, t.y + 2.2, t.z, 12, false, false); W.nums[W.nums.length - 1].txt = '+12'; W.nums[W.nums.length - 1].col = '#ffcf8a';
    if (t.hp <= 0) removeTree(t);
  }
}
function removeTree(t) {
  t.alive = false; t.col.dead = true;
  if (t.parts) { M4.makeScale(0, 0, 0); for (const [m, i] of t.parts) { m.setMatrixAt(i, M4); m.instanceMatrix.needsUpdate = true; } }
  burst(t.x, t.y + 3, t.z, 0x4fa640, 14, 4);
}
function damagePlayer(dmg, src) {
  if (!P.alive) return;
  let d = dmg; if (P.shield > 0) { const s = Math.min(P.shield, d); P.shield -= s; d -= s; }
  P.hp -= d; P.hurtT = Math.min(0.6, P.hurtT + 0.25); sfx('hurt', 0.7);
  if (src && src.x !== undefined) { const a = Math.atan2(-(src.x - P.x), -(src.z - P.z)); W.ind.push({ a, t: 1.2 }); }
  if (P.useT > 0 && dmg > 5) { /* keep healing, like the classic games? cancel */ P.useT = 0; P.useKind = null; }
  if (P.hp <= 0) playerDie(src);
}
function playerDie(src) {
  P.hp = 0; P.alive = false; P.deathT = 0;
  const place = W.aliveBots + 1;
  feed((src && src.isBot ? src.name : 'La tempesta') + ' ha eliminato Te', 'dead');
  burst(P.x, P.y + 1, P.z, 0xffc53d, 24, 5);
  P.deadT = 0; setAim(false);
  // drop inventory
  P.slots.forEach(it => { if (it && it.kind !== 'piccone') spawnLoot(P.x, P.y, P.z, { type: 'gun', kind: it.kind, rar: it.rar, mag: it.mag }, (R() - 0.5) * 4, (R() - 0.5) * 4); });
  setTimeout(() => endMatch(false, place, src), 1600);
}
function tryPickup(L) {
  const it = L.item;
  if (it.type === 'gun') {
    let slot = P.slots.findIndex((s, i) => i > 0 && !s);
    if (slot < 0) {
      slot = P.cur > 0 ? P.cur : 1;
      const old = P.slots[slot];
      spawnLoot(P.x, P.y, P.z, { type: 'gun', kind: old.kind, rar: old.rar, mag: old.mag }, Math.sin(yaw) * 2, Math.cos(yaw) * 2).cool = 1.2;
    }
    P.slots[slot] = { kind: it.kind, rar: it.rar, mag: it.mag };
    if (slot === P.cur || P.slots[P.cur].kind === 'piccone') { P.cur = slot; setGun(P.model, it.kind, it.rar); P.reloadT = 0; }
    renderSlots();
    feed('Hai preso: ' + WEAPONS[it.kind].name + ' · ' + RAR[it.rar].name, 'me');
  } else if (it.type === 'munizioni') { P.ammo = Math.min(999, P.ammo + it.n); }
  else if (it.type === 'bende') { P.bende += it.n; }
  else if (it.type === 'scudo') { P.scudi += it.n; }
  else if (it.type === 'legno') { P.wood = Math.min(999, P.wood + it.n); }
  else if (it.type === 'caramelle') { if (P.hp < 100) { P.hp = Math.min(100, P.hp + 15); feed('Caramella: +15 salute', 'me'); } else { P.shield = Math.min(100, P.shield + 15); feed('Caramella: +15 scudo', 'me'); } sfx('heal', 0.7); burst(P.x, P.y + 1.2, P.z, 0xff9a3a, 8, 2); }
  L.taken = true; W.scene.remove(L.m); sfx('pick', 0.8);
}
let promptLoot = null;
function updateLoot(dt) {
  promptLoot = null; let pd = 2.4;
  const cx = camera.position.x, cz = camera.position.z;
  for (const L of W.loot) {
    if (L.taken) continue;
    if (L.vy || L.vx || L.vz) {
      L.vy -= 20 * dt; L.x += L.vx * dt; L.z += L.vz * dt; L.y += L.vy * dt; L.vx *= 0.96; L.vz *= 0.96;
      const g = groundAt(L.x, L.z, L.y + 0.3); if (L.y <= g) { L.y = g; L.vy = 0; L.vx = 0; L.vz = 0; }
    }
    if (L.cool > 0) L.cool -= dt;
    L.t += dt;
    const d2c = (L.x - cx) ** 2 + (L.z - cz) ** 2, vis = d2c < 110 * 110;
    L.m.visible = vis;
    if (vis) { L.m.position.set(L.x, L.y + 0.55 + Math.sin(L.t * 2.5) * 0.12, L.z); L.m.children[0].rotation.y = L.t * 1.3; }
    if (!P.alive || P.phase !== 'ground' || L.cool > 0) continue;
    const d = Math.hypot(L.x - P.x, L.z - P.z);
    if (d < 1.9 && Math.abs(L.y - P.y) < 2.2) {
      if (L.item.type !== 'gun' || P.slots.some((s, i) => i > 0 && !s)) tryPickup(L);
      else if (d < pd) { pd = d; promptLoot = L; }
    } else if (L.item.type === 'gun' && d < 2.4 && d < pd && Math.abs(L.y - P.y) < 2.2) { pd = d; promptLoot = L; }
  }
  if (W.loot.length > 400) W.loot = W.loot.filter(l => !l.taken);
  if (promptLoot) {
    const it = promptLoot.item, txt = (isTouch ? 'Raccogli ' : '[F] Raccogli ') + WEAPONS[it.kind].name + ' · ' + RAR[it.rar].name;
    if (hudCache.prompt !== txt) { hudCache.prompt = txt; hud.pickBtn.textContent = txt; hud.pickBtn.style.borderColor = RAR[it.rar].css; }
    hud.prompt.style.display = 'block';
  } else hud.prompt.style.display = 'none';
  // chests
  for (const c of W.chests) {
    if (c.opened) { if (c.lid.rotation.x > -1.9) c.lid.rotation.x -= dt * 6; continue; }
    if (!P.alive || P.phase !== 'ground') continue;
    if (Math.abs(c.x - P.x) < 2.3 && Math.abs(c.z - P.z) < 2.3 && Math.abs(c.y - P.y) < 2) openChest(c);
  }
}
function openChest(c) {
  c.opened = true; sfx('chest'); burst(c.x, c.y + 0.8, c.z, 0xffd23a, 16, 3);
  const items = [randomLoot(R, 1), { type: 'munizioni', n: 30 }, { type: 'legno', n: 20 }];
  const k = randomLoot(R, 1); if (k.type !== 'gun') items[0] = { type: 'gun', kind: pickW(KINDS, KIND_W), rar: rollRarity(R, 1), mag: 0 }; else items[0] = k;
  if (items[0].type === 'gun') items[0].mag = WEAPONS[items[0].kind].mag;
  if (R() < 0.6) items.push(R() < 0.5 ? { type: 'bende', n: 2 } : { type: 'scudo', n: 1 });
  items.forEach((it, i) => { const a = i / items.length * 6.28 + R(); spawnLoot(c.x, c.y + 0.6, c.z, it, Math.cos(a) * 2.6, Math.sin(a) * 2.6).cool = 0.45; });
}

// ================= BUILDING =================
const woodMats = [0xc29a6a, 0x9a7448, 0x6e5030].map(c => reg(new THREE.MeshStandardMaterial({ color: linC(c), map: TEX.wood, roughness: 0.8 })));
const wallGeoX = new THREE.BoxGeometry(0.3, 4, 4), wallGeoZ = new THREE.BoxGeometry(4, 4, 0.3), rampGeo = new THREE.BoxGeometry(4, 0.25, 4 * Math.SQRT2);
function build(type) {
  if (!P.alive || (P.phase !== 'ground')) return;
  if (P.wood < 10) { banner('Serve legno: colpisci gli alberi col piccone', 2); sfx('empty'); return; }
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  let dx = 0, dz = 0; if (Math.abs(fx) > Math.abs(fz)) dx = Math.sign(fx); else dz = Math.sign(fz);
  const ix = Math.floor(P.x / 4), iz = Math.floor(P.z / 4), base = Math.round((P.y - 0.08) * 4) / 4;
  let b;
  if (type === 'wall') {
    let x0, x1, z0, z1;
    if (dx) { const X = (dx > 0 ? ix + 1 : ix) * 4; x0 = X - 0.15; x1 = X + 0.15; z0 = iz * 4; z1 = z0 + 4; }
    else { const Z = (dz > 0 ? iz + 1 : iz) * 4; z0 = Z - 0.15; z1 = Z + 0.15; x0 = ix * 4; x1 = x0 + 4; }
    const key = 'w' + x0 + ',' + z0 + ',' + Math.round(base);
    if (W.builtKeys.has(key)) return;
    const m = new THREE.Mesh(dx ? wallGeoX : wallGeoZ, woodMats[0]); m.position.set((x0 + x1) / 2, base + 2, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true; W.scene.add(m);
    b = { key, m, hp: 150, max: 150 }; b.col = addBoxCol(x0, base, z0, x1, base + 4, z1, { built: b });
  } else {
    const cx = (ix + dx) * 4 + 2, cz = (iz + dz) * 4 + 2, key = 'r' + cx + ',' + cz + ',' + Math.round(base);
    if (W.builtKeys.has(key)) return;
    const m = new THREE.Mesh(rampGeo, woodMats[0]); m.rotation.order = 'YXZ'; m.rotation.y = Math.atan2(-dx, -dz); m.rotation.x = Math.PI / 4;
    m.position.set(cx, base + 2, cz); m.castShadow = m.receiveShadow = true; W.scene.add(m);
    b = { key, m, hp: 140, max: 140 };
    b.col = { t: 2, cx, cz, dx, dz, base, bx0: cx - 2, bx1: cx + 2, bz0: cz - 2, bz1: cz + 2, built: b }; gInsert(b.col);
  }
  W.builtKeys.add(b.key); W.built.push(b); P.wood -= 10; sfx('build', 0.9);
  burst(b.m.position.x, b.m.position.y, b.m.position.z, 0xc9935a, 6, 2);
}
function damageBuilt(b, dmg) {
  if (b.dead) return;
  b.hp -= dmg; const r = b.hp / b.max; b.m.material = woodMats[r > 0.66 ? 0 : r > 0.33 ? 1 : 2];
  if (b.hp <= 0) { b.dead = true; b.col.dead = true; W.scene.remove(b.m); W.builtKeys.delete(b.key); burst(b.m.position.x, b.m.position.y, b.m.position.z, 0xa8743f, 14, 4); sfx('wallhit', 0.6); }
}

// ================= BOTS =================
function spawnBots() {
  const names = shuffle(NAMES.slice()); const D = W.diff;
  W.lookPool = []; for (let i = 0; i < 16; i++) W.lookPool.push(i % 2 ? randomLook() : outfitLook(FIRST_MONSTER + (i >> 1) % 8));
  for (let i = 0; i < W.map.bots; i++) {
    let x = 0, z = 0, g = 0;
    for (let t = 0; t < 60; t++) {
      if (W.villages.length && R() < 0.35) { const v = pick(W.villages); x = v.x + (R() - 0.5) * 70; z = v.z + (R() - 0.5) * 70; }
      else { x = (R() * 2 - 1) * W.half * 0.88; z = (R() * 2 - 1) * W.half * 0.88; }
      g = W.getH(x, z); if (g > 1.8) break;
    }
    const m = makeHuman(pick(W.lookPool));
    const kind = pickW(KINDS, KIND_W), rar = rollRarity(R, D === 'difficile' ? 1 : 0);
    setGun(m, kind, rar); m.glider.visible = true; W.scene.add(m.g);
    W.bots.push({ isBot: true, name: 'Bot ' + names[i % names.length] + (i >= names.length ? ' ' + i : ''), x, z, y: g + 40 + R() * 80, vy: 0, yaw: R() * 6.28,
      hp: 100, shield: pick([0, 0, 25, 50]), w: { kind, rar }, mag: WEAPONS[kind].mag, reloadT: 0, fireT: 0, think: R() * 0.5, target: null, los: false,
      react: 0, alive: true, landing: true, onGround: false, blocked: false, model: m, animT: R() * 6, mvx: 0, mvz: 0, wx: null, wz: null, strafe: R() < 0.5 ? 1 : -1,
      stuckT: 0, deadT: 0, lostT: 0, kills: 0, flee: false, swim: false, passive: R() < 0.35, onAirship: true, dropAt: 0.06 + Math.pow(R(), 0.8) * 0.9, gx: x, gz: z, fallPh: true });
    m.g.visible = false;
  }
  W.aliveBots = W.bots.length;
}
function damageBot(b, dmg, src, kind, head, hx, hy, hz) {
  if (!b.alive) return;
  let d = dmg, sh = false; if (b.shield > 0) { const s = Math.min(b.shield, d); b.shield -= s; d -= s; sh = true; }
  b.hp -= d;
  if (src === P) { P.dmg += dmg; dmgNum(hx !== undefined ? hx : b.x, (hy !== undefined ? hy : b.y + 1.8) + 0.3, hz !== undefined ? hz : b.z, dmg, head, sh && d <= 0); }
  if (src && src.alive && (!b.target || R() < 0.5) && src !== b) { b.target = src; b.react = Math.min(b.react, 0.25); b.los = true; }
  if (b.hp <= 0) killBot(b, src, kind);
}
function killBot(b, killer, kind) {
  b.alive = false; b.deadT = 1.1; b.model.glider.visible = false; W.aliveBots--;
  burst(b.x, b.y + 1.2, b.z, 0xffc53d, 18, 4);
  const wname = kind === 'storm' ? '' : ' (' + (kind === 'piccone' ? 'piccone' : WEAPONS[kind].name.toLowerCase()) + ')';
  if (killer === P) { P.kills++; sfx('kill'); feed('Hai eliminato ' + b.name + wname, 'me'); banner('Eliminato ' + b.name + '!', 1.6); }
  else if (killer && killer.isBot) { killer.kills++; feed(killer.name + ' ha eliminato ' + b.name); }
  else feed('La tempesta ha eliminato ' + b.name);
  spawnLoot(b.x, b.y, b.z, { type: 'gun', kind: b.w.kind, rar: b.w.rar, mag: WEAPONS[b.w.kind].mag }, (R() - 0.5) * 3, (R() - 0.5) * 3);
  spawnLoot(b.x, b.y, b.z, { type: 'munizioni', n: 30 }, (R() - 0.5) * 3, (R() - 0.5) * 3);
  if (R() < 0.5) spawnLoot(b.x, b.y, b.z, R() < 0.5 ? { type: 'bende', n: 2 } : { type: 'scudo', n: 1 }, (R() - 0.5) * 3, (R() - 0.5) * 3);
  checkWin();
}
function botThink(b) {
  const s = W.storm, D = DIFF[W.diff], canFight = matchT > GRACE;
  if (b.target && (!b.target.alive || (b.target === P && P.phase !== 'ground'))) { b.target = null; b.los = false; }
  if (canFight) {
    let best = null, bd = D.detect * D.detect;
    const bb = b.passive ? 0 : bd * 0.5;
    for (const o of W.bots) { if (o === b || !o.alive || o.landing || o.onAirship) continue; const dx = o.x - b.x, dz = o.z - b.z, d2 = dx * dx + dz * dz; if (d2 < bb && d2 < bd) { bd = d2; best = o; } }
    if (P.alive && P.phase === 'ground' && matchT > P.landT + 2.5) { const d2 = (P.x - b.x) ** 2 + (P.z - b.z) ** 2; if (d2 < bd * 1.1) { bd = d2; best = P; } }
    if (b.target) { const d2 = (b.target.x - b.x) ** 2 + (b.target.z - b.z) ** 2; if (d2 < (D.detect * 1.4) ** 2 && (!best || d2 < bd * 2.2)) best = b.target; }
    if (best) {
      const vis = !blockedStatic(b, b.y + 1.6, best, best.y + 1.3);
      if (vis) { if (best !== b.target) { b.target = best; b.react = D.react * (0.7 + R() * 0.6); } b.los = true; b.lostT = 0; }
      else if (best === b.target) { b.los = false; if (++b.lostT > 8) { b.target = null; b.lostT = 0; } }
    } else if (b.target) { b.los = false; if (++b.lostT > 5) { b.target = null; b.lostT = 0; } }
  }
  const curOut = Math.hypot(s.cx - b.x, s.cz - b.z) > s.r - 3;
  const dxs = s.nx - b.x, dzs = s.nz - b.z, ds = Math.hypot(dxs, dzs) || 1;
  const needMove = s.state !== 'done' && ds > s.nr * 0.75 && (s.state === 'shrink' || s.timer < 22);
  b.flee = curOut;
  let mx = 0, mz = 0;
  const T = b.target;
  if (T && b.los && !(curOut && Math.hypot(T.x - b.x, T.z - b.z) > 22)) {
    const dx = T.x - b.x, dz = T.z - b.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, ideal = WEAPONS[b.w.kind].ideal;
    const f = d > ideal + 6 ? 1 : d < ideal - 4 ? -0.7 : 0;
    if (R() < 0.18) b.strafe *= -1;
    mx = ux * f - uz * b.strafe * 0.85; mz = uz * f + ux * b.strafe * 0.85;
    if (b.onGround && R() < 0.06) b.vy = 8.4;
  } else if (T && !b.los) {
    const dx = T.x - b.x, dz = T.z - b.z, d = Math.hypot(dx, dz) || 1; mx = dx / d; mz = dz / d;
  } else if (needMove || curOut || s.state === 'done') { mx = dxs / ds; mz = dzs / ds; if (ds < 3) { mx = 0; mz = 0; } }
  else {
    if (b.wx === null || Math.hypot(b.wx - b.x, b.wz - b.z) < 4) {
      const a = R() * 6.283, r = 20 + R() * 60; let wx = b.x + Math.cos(a) * r, wz = b.z + Math.sin(a) * r;
      const dd = Math.hypot(wx - s.nx, wz - s.nz); if (dd > s.nr * 0.8 && s.nr > 0) { wx = s.nx + (wx - s.nx) / dd * s.nr * 0.6; wz = s.nz + (wz - s.nz) / dd * s.nr * 0.6; }
      if (W.getH(wx, wz) < 0.5) { wx = s.nx; wz = s.nz; }
      b.wx = wx; b.wz = wz;
    }
    const dx = b.wx - b.x, dz = b.wz - b.z, d = Math.hypot(dx, dz) || 1; mx = dx / d; mz = dz / d;
    if (R() < 0.08) { mx = 0; mz = 0; }
  }
  const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
  b.mvx = mx; b.mvz = mz;
}
function botShoot(b) {
  const w = WEAPONS[b.w.kind], T = b.target;
  b.mag--; b.fireT = w.rate * BOT_RATE * (0.75 + R() * 0.7);
  if (b.mag <= 0) b.reloadT = w.reload * 1.2;
  const ex = b.x, ey = b.y + 1.5, ez = b.z, tx = T.x + (R() - 0.5) * 0.6, ty = T.y + 1.1 + R() * 0.6, tz = T.z + (R() - 0.5) * 0.6;
  const dx = tx - ex, dy = ty - ey, dz = tz - ez, d = Math.hypot(dx, dy, dz) || 1;
  const dP = Math.hypot(b.x - P.x, b.z - P.z);
  sfx(b.w.kind, clamp(1 - dP / 130, 0, 1) * 0.75);
  if (dP < 130) muzzle(ex + dx / d * 0.85, ey - 0.05, ez + dz / d * 0.85);
  const h = rayWorld(ex, ey, ez, dx / d, dy / d, dz / d, d, { tStart: 0.7, tstep: 2 });
  const showT = dP < 100 || T === P;
  if (h.kind === 'col' || h.kind === 'terrain') {
    if (h.kind === 'col' && h.col.built) damageBuilt(h.col.built, w.dmg * (w.pellets || 1) * 0.6);
    if (h.kind === 'col' && h.col.pumpkin) smashPumpkin(h.col.pumpkin);
    if (showT) tracer(ex, ey, ez, ex + dx / d * h.t, ey + dy / d * h.t, ez + dz / d * h.t, true);
    return;
  }
  let p = DIFF[W.diff].acc * w.acc * clamp(1.2 - d / w.range, 0.12, 1);
  if (T === P) { if (P.speedNow > 5) p *= 0.78; if (!P.onGround) p *= 0.7; } else p *= 0.45;
  let dmg = 0, head = false;
  for (let i = 0; i < (w.pellets || 1); i++) if (R() < p) { const hd = R() < 0.1; head = head || hd; dmg += w.dmg * RAR[b.w.rar].m * (hd ? w.head : 1); }
  if (showT) {
    const miss = dmg <= 0 ? 1.5 : 0;
    tracer(ex, ey, ez, tx + (R() - 0.5) * miss * 2, ty + (R() - 0.5) * miss, tz + (R() - 0.5) * miss * 2, true);
  }
  if (dmg > 0) { if (T === P) damagePlayer(dmg, b); else damageBot(T, dmg, b, b.w.kind, head); }
}
function updateBot(b, dt) {
  const m = b.model;
  if (!b.alive) {
    if (b.deadT > 0) { b.deadT -= dt; const k = clamp((1.1 - b.deadT) / 0.45, 0, 1); m.g.rotation.x = k * k * 1.2; m.g.position.y = b.y + 0.1 * k; m.g.scale.setScalar(clamp(b.deadT / 0.4, 0.01, 1)); animHuman(m, { mode: 'dead' }); m.gun.visible = false; if (b.deadT <= 0) { burst(b.x, b.y + 0.7, b.z, 0x9aa0ab, 22, 2.6); m.g.visible = false; W.scene.remove(m.g); } }
    return;
  }
  if (b.onAirship) {
    const airship = W.airship;
    if (!airship) return;
    b.x = airship.x; b.z = airship.z; b.y = airship.y; m.g.visible = false;
    if (airship.t / airship.dur >= b.dropAt) {
      b.onAirship = false; b.y = airship.y - 8;
      let tx = b.x + (R() - 0.5) * 220, tz = b.z + (R() - 0.5) * 220, bestV = null, bd = 230;
      for (const v of W.villages) { const d = Math.hypot(v.x - b.x, v.z - b.z); if (d < bd && R() < 0.75) { bd = d; bestV = v; } }
      if (bestV) { tx = bestV.x + (R() - 0.5) * 60; tz = bestV.z + (R() - 0.5) * 60; }
      for (let k = 0; k < 12 && W.getH(tx, tz) < 1.8; k++) { tx = b.x + (R() - 0.5) * 260; tz = b.z + (R() - 0.5) * 260; }
      b.gx = clamp(tx, -W.half + 10, W.half - 10); b.gz = clamp(tz, -W.half + 10, W.half - 10); b.fallPh = true;
    }
    return;
  }
  if (b.landing) {
    const dxg = b.gx - b.x, dzg = b.gz - b.z, dg = Math.hypot(dxg, dzg), gnd = groundAt(b.x, b.z, b.y);
    if (b.fallPh && b.y - gnd < 48) { b.fallPh = false; m.glider.visible = true; }
    const hs = b.fallPh ? 19 : 12;
    if (dg > 1) { const k = Math.min(1, dg / (hs * dt)); b.x += dxg / dg * hs * dt * k; b.z += dzg / dg * hs * dt * k; b.yaw = angLerp(b.yaw, Math.atan2(-dxg, -dzg), 1 - Math.exp(-3 * dt)); }
    b.y -= (b.fallPh ? 34 : 7.5) * dt;
    const g = groundAt(b.x, b.z, b.y); if (b.y <= g) { b.y = g; b.landing = false; m.glider.visible = false; b.onGround = true; b.px = b.x; b.pz = b.z; }
  } else {
    b.think -= dt; if (b.think <= 0) { b.think = 0.35 + R() * 0.3; botThink(b); }
    let speed = b.flee ? 6.8 : 5.3; if (b.swim) speed *= 0.6;
    const ox = b.x, oz = b.z;
    stepChar(b, b.mvx * speed, b.mvz * speed, dt);
    const moved = Math.hypot(b.x - ox, b.z - oz);
    if ((b.mvx || b.mvz) && moved < speed * dt * 0.35 && b.onGround) { b.stuckT += dt; if (b.stuckT > 0.3) { b.vy = 8.6; b.onGround = false; b.stuckT = 0; b.strafe *= -1; b.wx = null; if (R() < 0.3) { const t = b.mvx; b.mvx = -b.mvz; b.mvz = t; } } }
    else b.stuckT = Math.max(0, b.stuckT - dt);
    let ty = null;
    if (b.target && b.los) ty = Math.atan2(-(b.target.x - b.x), -(b.target.z - b.z)); else if (b.mvx || b.mvz) ty = Math.atan2(-b.mvx, -b.mvz);
    if (ty !== null) b.yaw = angLerp(b.yaw, ty, 1 - Math.exp(-9 * dt));
    b.fireT -= dt; b.react -= dt;
    if (b.reloadT > 0) { b.reloadT -= dt; if (b.reloadT <= 0) b.mag = WEAPONS[b.w.kind].mag; }
    if (b.target && b.los && b.target.alive && b.react <= 0 && b.fireT <= 0 && b.reloadT <= 0 && matchT > GRACE) {
      const d = Math.hypot(b.target.x - b.x, b.target.z - b.z);
      if (d < WEAPONS[b.w.kind].range * 0.95) botShoot(b);
    }
  }
  const dx = b.x - camera.position.x, dz = b.z - camera.position.z, d2 = dx * dx + dz * dz, vis = d2 < 200 * 200;
  m.g.visible = vis;
  if (vis) {
    const hd = GFX[settings.gfx].hiDist; setLOD(m, d2 < hd * hd); m.gun.visible = !b.landing && d2 < 130 * 130;
    m.g.position.set(b.x, b.y, b.z); m.g.rotation.y = b.yaw;
    const spd = b.landing ? 0 : Math.min(8, Math.hypot(b.x - (b.px ?? b.x), b.z - (b.pz ?? b.z)) / Math.max(dt, 1e-3));
    b.animT += dt * spd * 1.9;
    let tp = 0; if (b.target && b.los) tp = Math.atan2(b.target.y - b.y, Math.hypot(b.target.x - b.x, b.target.z - b.z) || 1);
    animHuman(m, { spd, ph: b.animT, pitch: tp, hold: m.hold, swing: 0, air: !b.landing && !b.onGround, mode: b.landing ? (b.fallPh ? 'fall' : 'glide') : 'ground', t: matchT + b.animT * 0.01 });
    m.g.rotation.x = 0;
  }
  b.px = b.x; b.pz = b.z;
}

// ================= STORM =================
function stormInit() {
  W.storm = { phase: 0, state: 'wait', cx: 0, cz: 0, r: W.S * 0.75, nx: 0, nz: 0, nr: 0, fx: 0, fz: 0, fr: 0, timer: 0, dur: 1 };
  chooseNext(); W.storm.timer = STORM[0].w * W.map.timeK;
}
function chooseNext() {
  const s = W.storm, ph = STORM[s.phase], nr = W.S * 0.46 * ph.f;
  let best = null;
  for (let i = 0; i < 24; i++) {
    const a = R() * 6.283, d = Math.sqrt(R()) * Math.max(0, s.r - nr) * 0.9;
    const x = clamp(s.cx + Math.cos(a) * d, -W.half * 0.8, W.half * 0.8), z = clamp(s.cz + Math.sin(a) * d, -W.half * 0.8, W.half * 0.8);
    const ok = W.getH(x, z) > 1.2 && Math.hypot(x - s.cx, z - s.cz) + nr <= s.r;
    if (ok || !best) best = [x, z]; if (ok) break;
  }
  s.nx = best[0]; s.nz = best[1]; s.nr = nr;
}
function stormUpdate(dt) {
  const s = W.storm, k = W.map.timeK;
  if (s.state === 'wait') {
    s.timer -= dt;
    if (s.timer <= 0) { s.state = 'shrink'; s.fx = s.cx; s.fz = s.cz; s.fr = s.r; s.dur = STORM[s.phase].s * k; s.timer = s.dur; banner('La tempesta stregata si sta chiudendo!', 3); sfx('storm'); }
  } else if (s.state === 'shrink') {
    s.timer -= dt; const t = clamp(1 - s.timer / s.dur, 0, 1);
    s.cx = lerp(s.fx, s.nx, t); s.cz = lerp(s.fz, s.nz, t); s.r = lerp(s.fr, s.nr, t);
    if (s.timer <= 0) { s.phase++; if (s.phase < STORM.length) { chooseNext(); s.state = 'wait'; s.timer = STORM[s.phase].w * k; } else { s.state = 'done'; s.timer = 0; } }
  }
  W.stormMesh.position.set(s.cx, 120, s.cz); W.stormMesh.scale.set(Math.max(0.3, s.r), 340, Math.max(0.3, s.r));
  W.stormTick += dt;
  if (W.stormTick >= 1) {
    W.stormTick -= 1; const dmg = STORM[Math.min(s.phase, STORM.length - 1)].d;
    if (P.alive && P.phase === 'ground' && Math.hypot(P.x - s.cx, P.z - s.cz) > s.r) { damagePlayer(dmg, null); }
    for (const b of W.bots) if (b.alive && !b.landing && !b.onAirship && Math.hypot(b.x - s.cx, b.z - s.cz) > s.r) { b.hp -= dmg; if (b.hp <= 0) killBot(b, null, 'storm'); }
  }
}

// ================= MATCH FLOW =================
function makeAirship() { const hb = makePumpkinAirship(); hb.group.userData.fx = hb; return hb.group; }
function startMatch() {
  const map = MAPS[settings.map];
  $('#loading').hidden = false; $('#loadTxt').textContent = map.name + ' · ' + map.size + ' m · ' + 'tu contro ' + map.bots + ' bot';
  setTimeout(() => {
    disposeWorld();
    buildWorld(settings.map, settings.diff);
    newPlayer(); spawnBots(); stormInit();
    const a = R() * Math.PI * 2, R1 = W.S * 0.58, airY = W.map.mountain ? 175 : 140;
    const sx = -Math.cos(a) * R1, sz = -Math.sin(a) * R1, ex = Math.cos(a) * R1, ez = Math.sin(a) * R1;
    const dur = clamp(W.S / 45, 12, 30);
    W.airship = { sx, sz, ex, ez, y: airY, t: 0, dur, active: true, m: makeAirship(), x: sx, z: sz };
    W.airship.m.rotation.y = Math.atan2(-(ex - sx), -(ez - sz)); W.airship.m.position.set(sx, airY, sz); W.scene.add(W.airship.m); W.airship.fx = W.airship.m.userData.fx; sfx('airship');
    yaw = W.airship.m.rotation.y; pitch = -0.35;
    P.x = sx; P.z = sz; P.y = airY - 4;
    matchT = 0; promptLoot = null; for (const k in hudCache) delete hudCache[k];
    hud.feed.innerHTML = ''; renderSlots();
    $('#loading').hidden = true; $('#home').hidden = true; $('#hud').hidden = false; $('#end').hidden = true; $('#pause').hidden = true;
    document.body.classList.add('playing'); state = 'play';
    banner(isTouch ? 'Tocca LANCIATI! quando sei sopra la zona giusta' : 'Premi SPAZIO per lanciarti dal dirigibile', 4);
    checkOrientation(); lastT = performance.now();
  }, 60);
}
function drop() {
  if (P.phase !== 'airship') return;
  P.phase = 'fall'; P.y = W.airship.y - 8; P.vy = 0; sfx('glide', 0.6);
  P.model.g.visible = true; banner('Punta verso un villaggio: lì ci sono più forzieri', 3);
}
function landPlayer() {
  P.phase = 'ground'; P.onGround = true; P.vy = 0; P.landT = matchT; P.model.glider.visible = false;
}
function checkWin() {
  if (P && P.alive && W.aliveBots <= 0 && state === 'play') {
    sfx('win'); banner('#1 Ultimo in piedi!', 5);
    for (let i = 0; i < 6; i++) setTimeout(() => P && burst(P.x + (R() - 0.5) * 6, P.y + 4 + R() * 3, P.z + (R() - 0.5) * 6, pick([0xffc53d, 0x8b4dff, 0x41b9ff, 0xff4d5e]), 20, 5), i * 200);
    setTimeout(() => endMatch(true, 1, null), 2200);
  }
}
function endMatch(win, place, killer) {
  if (state !== 'play' && state !== 'paused') return;
  state = 'over'; exitLock();
  const st = store.get('stats', { games: 0, wins: 0, kills: 0 });
  st.games++; if (win) st.wins++; st.kills += P.kills; store.set('stats', st); refreshStats();
  const total = W.map.bots + 1;
  $('#endTitle').textContent = win ? '#1 ULTIMO IN PIEDI!' : '#' + place + ' su ' + total;
  $('#endTitle').classList.toggle('lose', !win);
  $('#endWhy').textContent = win ? 'Hai vinto su ' + W.map.name + '. Nessuno è rimasto in piedi oltre a te.' : (killer && killer.isBot ? 'Eliminato da ' + killer.name : 'Eliminato dalla tempesta') + ' su ' + W.map.name + '.';
  const t = Math.round(matchT);
  $('#endStats').innerHTML = [['Posizione', '#' + place], ['Elim.', P.kills], ['Danni', Math.round(P.dmg)], ['Tempo', Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0')]]
    .map(([a, b]) => `<div><b>${b}</b><small>${a}</small></div>`).join('');
  $('#end').hidden = false;
}
function goHome() {
  state = 'home'; exitLock(); document.body.classList.remove('playing');
  $('#hud').hidden = true; $('#end').hidden = true; $('#pause').hidden = true; $('#home').hidden = false; hud.bigmap.style.display = 'none'; $('#rotate').style.display = 'none';
  disposeWorld();
}
function pauseGame() { if (state !== 'play') return; state = 'paused'; $('#pause').hidden = false; exitLock(); input.fire = false; }
function resumeGame() { if (state !== 'paused') return; state = 'play'; $('#pause').hidden = true; lastT = performance.now(); }

// ================= UPDATE =================
let camDist = 4.6, camSh = 0.85, camUp = 0.35;
function updatePlayer(dt) {
  P.fireT -= dt; P.recoil = Math.max(0, P.recoil - dt * 0.35); P.swingT -= dt; if (P.hitmT > 0) P.hitmT -= dt;
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) finishReload(); }
  if (P.useT > 0) { P.useT -= dt; if (P.useT <= 0) finishUse(); }
  const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw), rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);
  let mx = input.mx, mz = input.mz;
  const K = input.keys;
  mz += (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0);
  mx += (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
  const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
  const wx = rgtX * mx + fwdX * mz, wz = rgtZ * mx + fwdZ * mz;
  const sprint = input.sprint || K.ShiftLeft || K.ShiftRight;
  if (!P.alive) { input.jumpQ = false; return; }
  if (P.phase === 'airship') {
    P.x = W.airship.x; P.z = W.airship.z; P.y = W.airship.y + 2; P.model.g.visible = false;
    if (input.jumpQ) drop();
  } else if (P.phase === 'fall' || P.phase === 'glide') {
    const fall = P.phase === 'fall', hs = fall ? 19 : 13;
    P.x = clamp(P.x + wx * hs * dt, -W.half + 2, W.half - 2); P.z = clamp(P.z + wz * hs * dt, -W.half + 2, W.half - 2);
    P.y += (fall ? -38 : -7.5) * dt;
    const g = groundAt(P.x, P.z, P.y);
    if (fall && P.y - g < 48) { P.phase = 'glide'; P.model.glider.visible = true; sfx('glide', 0.5); }
    if (P.y <= g) { P.y = g; landPlayer(); }
    P.moving = len > 0.1;
  } else {
    let speed = sprint && !P.aim ? 8.6 : 6.6; if (P.aim) speed = 3.9; if (P.useT > 0) speed *= 0.55; if (P.swim) speed *= 0.6;
    const ox = P.x, oz = P.z;
    stepChar(P, wx * speed, wz * speed, dt);
    P.speedNow = Math.hypot(P.x - ox, P.z - oz) / Math.max(dt, 1e-4);
    if (input.jumpQ && P.onGround && !P.swim) { P.vy = 8.6; P.onGround = false; }
    P.moving = len > 0.1;
    if ((input.fire || K.Mouse0) && P.fireT <= 0) playerFire();
    // location toast
    let near = null; for (const v of W.villages) if (Math.hypot(v.x - P.x, v.z - P.z) < 45) near = v;
    if (near && near !== lastLoc) { hud.locName.textContent = near.name; hud.loc.style.opacity = 1; locT = 2.6; }
    lastLoc = near;
  }
  input.jumpQ = false;
  // model
  const m = P.model;
  if (P.phase !== 'airship') {
    m.g.position.set(P.x, P.y, P.z); m.g.rotation.y = yaw; m.g.rotation.x = 0;
    const gspd = P.phase === 'ground' ? Math.min(9, P.speedNow) : 0;
    P.animT += dt * gspd * 1.9;
    animHuman(m, { spd: gspd, ph: P.animT, pitch: P.phase === 'ground' ? pitch : 0, hold: m.hold, swing: P.swingT, air: P.phase === 'ground' && !P.onGround,
      mode: P.phase === 'fall' ? 'fall' : P.phase === 'glide' ? 'glide' : 'ground', t: matchT });
  }
}
function updateDeadPlayer(dt) {
  if (P.alive) return;
  P.deadT += dt; const k = clamp(P.deadT / 0.45, 0, 1), m = P.model;
  if (P.deadT > 1.1) { if (!P.puffed) { P.puffed = true; burst(P.x, P.y + 0.7, P.z, 0x9aa0ab, 22, 2.6); } m.g.visible = false; return; }
  m.g.visible = true; m.g.rotation.x = k * k * 1.2; m.g.scale.setScalar(clamp((1.1 - P.deadT) / 0.4, 0.01, 1)); m.gun.visible = false; animHuman(m, { mode: 'dead' });
}
function envUpdate(dt) {
  const cp = camera.position;
  W.sky.position.copy(cp);
  const fx = P ? P.x : cp.x, fz = P ? P.z : cp.z, fy = P ? P.y : cp.y;
  GX.followKey(W.L, fx, fy, fz);
  { const hk = clamp((camera.position.y - 30) / 160, 0, 1); W.scene.fog.far = W.fogFar0 * (1 + hk * 1.3); W.scene.fog.near = 60 + hk * 140; } // see further from the airship
  updateHalloweenFx(dt);
  if (W.grass) W.grass.update(cp.x - Math.sin(yaw) * W.grass.A * 0.2, cp.z - Math.cos(yaw) * W.grass.A * 0.2, cp, dt);
  if (W.water) W.water.update(cp, dt);
  if (W.look.lightning) { // storm map: distant lightning flashes light the sky and the scene
    W.flashT -= dt; if (W.flashT < 0) { W.flash = 1; W.flashT = 6 + R() * 10; }
    W.flash = Math.max(0, W.flash - dt * 4);
    const f = W.flash > 0 ? W.flash * (0.55 + 0.45 * Math.sin(W.flash * 40)) : 0;
    W.L.U.uFlash.value = f * 2.2; W.L.key.intensity = W.look.keyI * (1 + f * 2.5);
  }
  for (const c of W.chests) if (c.glow) c.glow.visible = !c.opened;
}
function updateCamera(dt) {
  let dist = 4.6, sh = 0.85, up = 0.35, fov = 70;
  const it = P.slots[P.cur];
  if (P.phase === 'airship') { dist = 34; sh = 0; up = 4; }
  else if (P.phase === 'fall' || P.phase === 'glide') { dist = 8; sh = 0; up = 1.2; }
  else if (!P.alive) { dist = 9; sh = 0; up = 2; }
  else if (P.aim) { if (WEAPONS[it.kind].scope) { dist = 0.05; sh = 0; up = 0.1; fov = 17; } else { dist = 2.3; sh = 0.72; up = 0.3; fov = 54; } }
  const k = 1 - Math.exp(-12 * dt);
  camDist = lerp(camDist, dist, k); camSh = lerp(camSh, sh, k); camUp = lerp(camUp, up, k);
  const cp = Math.cos(pitch), fx = -Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = -Math.cos(yaw) * cp, rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const hx = P.x, hy = P.y + 1.62, hz = P.z;
  let cx = hx - fx * camDist + rx * camSh, cy = hy - fy * camDist + camUp, cz = hz - fz * camDist + rz * camSh;
  const gmin = Math.max(W.getH(cx, cz), -0.6) + 0.45; if (cy < gmin) cy = gmin;
  camera.position.set(cx, cy, cz); camera.lookAt(cx + fx, cy + fy, cz + fz);
  if (Math.abs(camera.fov - fov) > 0.1) { camera.fov = lerp(camera.fov, fov, 1 - Math.exp(-14 * dt)); camera.updateProjectionMatrix(); }
  P.model.g.visible = (P.alive || (P.deadT > 0 && P.deadT < 1.1)) && P.phase !== 'airship' && !(P.aim && WEAPONS[it.kind].scope && P.phase === 'ground');
  if (P.alive) { P.model.gun.visible = P.phase === 'ground'; setLOD(P.model, true); }
}
function drawFx(dt) {
  const c = fxc; c.clearRect(0, 0, fxW, fxH);
  for (let i = W.nums.length - 1; i >= 0; i--) {
    const n = W.nums[i]; n.t -= dt; if (n.t <= 0) { W.nums.splice(i, 1); continue; }
    V.set(n.x, n.y, n.z).project(camera); if (V.z > 1) continue;
    const sx = (V.x + 1) / 2 * fxW, sy = (1 - V.y) / 2 * fxH - (0.9 - n.t) * 34 * fxD;
    c.globalAlpha = clamp(n.t / 0.35, 0, 1); c.font = `900 ${Math.round((n.col === '#ffd23a' ? 22 : 18) * fxD)}px Nunito, sans-serif`; c.textAlign = 'center';
    c.lineWidth = 4 * fxD; c.strokeStyle = 'rgba(10,10,30,.75)'; c.strokeText(n.txt, sx, sy); c.fillStyle = n.col; c.fillText(n.txt, sx, sy);
  }
  c.globalAlpha = 1;
  const cx = fxW / 2, cy = fxH / 2, rad = Math.min(fxW, fxH) * 0.22;
  for (let i = W.ind.length - 1; i >= 0; i--) {
    const d = W.ind[i]; d.t -= dt; if (d.t <= 0) { W.ind.splice(i, 1); continue; }
    const th = -(d.a - yaw), ang = th - Math.PI / 2;
    c.strokeStyle = `rgba(255,60,70,${clamp(d.t, 0, 1) * 0.9})`; c.lineWidth = 7 * fxD; c.lineCap = 'round';
    c.beginPath(); c.arc(cx, cy, rad, ang - 0.32, ang + 0.32); c.stroke();
  }
  if (P.hitmT > 0) {
    c.strokeStyle = P.hitHead ? '#ffd23a' : '#ffffff'; c.lineWidth = 2.5 * fxD; const a = 6 * fxD, b = 13 * fxD;
    c.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.moveTo(cx + sx * a, cy + sy * a); c.lineTo(cx + sx * b, cy + sy * b); } c.stroke();
  }
}
let miniT = 0;
function update(dt) {
  matchT += dt;
  // look input
  const scope = P.aim && WEAPONS[P.slots[P.cur].kind].scope;
  const sens = P.aim ? (scope ? 0.28 : 0.55) : 1;
  yaw -= input.lookDX * sens; pitch = clamp(pitch - input.lookDY * sens, -1.25, 1.1);
  input.lookDX = 0; input.lookDY = 0;
  if (W.airship && W.airship.active) {
    const b = W.airship; b.t += dt; const t = b.t / b.dur;
    b.x = lerp(b.sx, b.ex, t); b.z = lerp(b.sz, b.ez, t); b.m.position.set(b.x, b.y, b.z); if (b.fx) b.fx.update(dt);
    if (t >= 1 && P.phase === 'airship') drop();
    if (t > 1.6) { b.active = false; W.scene.remove(b.m); }
  }
  updatePlayer(dt); updateDeadPlayer(dt);
  for (const b of W.bots) updateBot(b, dt);
  stormUpdate(dt);
  updateLoot(dt);
  updateParticles(dt);
  updateCamera(dt);
  envUpdate(dt);
  updateHUD(dt);
  miniT -= dt; if (miniT <= 0) { miniT = 0.1; drawMap(miniCtx, 232, false); if (hud.bigmap.style.display === 'grid') drawMap(bigCtx, 760, true); }
}


// ================= INPUT =================
const input = { mx: 0, mz: 0, sprint: false, fire: false, jumpQ: false, lookDX: 0, lookDY: 0, keys: {} };
const joy = { id: null, ox: 0, oy: 0 }, looks = new Map(); let fireIds = new Set();
const joyBase = $('#joyBase'), joyKnob = $('#joyKnob');
const touchLayer = $('#touch');
const TSENS = 0.0058;
touchLayer.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  if (e.pointerType === 'mouse') { tryLock(); if (e.button === 0) input.keys.Mouse0 = true; if (e.button === 2) setAim(true); mouseDrag = true; return; }
  e.preventDefault(); initAudio();
  if (e.clientX < innerWidth * 0.42 && joy.id === null) {
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY;
    joyBase.style.left = e.clientX + 'px'; joyBase.style.top = e.clientY + 'px'; joyBase.classList.add('act'); joyKnob.style.transform = '';
  } else looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
window.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') return;
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), max = 50;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
    input.mx = dx / max; input.mz = -dy / max; input.sprint = d > max * 0.97;
  }
  const l = looks.get(e.pointerId);
  if (l) { input.lookDX += (e.clientX - l.x) * TSENS; input.lookDY += (e.clientY - l.y) * TSENS; l.x = e.clientX; l.y = e.clientY; }
}, { passive: true });
function endTouch(e) {
  if (e.pointerId === joy.id) {
    joy.id = null; input.mx = 0; input.mz = 0; input.sprint = false; joyKnob.style.transform = ''; joyBase.classList.remove('act');
    joyBase.style.left = ''; joyBase.style.top = '';
  }
  looks.delete(e.pointerId);
  if (fireIds.has(e.pointerId)) { fireIds.delete(e.pointerId); if (!fireIds.size) { input.fire = false; $('#bFire').classList.remove('on'); $('#bFireL').classList.remove('on'); } }
  if (e.pointerType === 'mouse') { if (e.button === 0) input.keys.Mouse0 = false; if (e.button === 2) setAim(false); mouseDrag = false; }
}
window.addEventListener('pointerup', endTouch); window.addEventListener('pointercancel', endTouch);
function btn(id, fn, opts = {}) {
  const el = $(id);
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation(); initAudio();
    if (opts.look && e.pointerType !== 'mouse') looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
    fn(e);
  });
  el.addEventListener('contextmenu', e => e.preventDefault());
}
const fireDown = (e, el) => { if (state !== 'play') return; fireIds.add(e.pointerId); input.fire = true; $(el).classList.add('on'); };
btn('#bFire', e => fireDown(e, '#bFire'), { look: true });
btn('#bFireL', e => fireDown(e, '#bFireL'));
btn('#bJump', () => { input.jumpQ = true; });
btn('#bAim', () => setAim(!P.aim));
btn('#bReload', () => startReload());
btn('#bWall', () => build('wall'));
btn('#bRamp', () => build('ramp'));
btn('#bHeal', () => useItem('bende'));
btn('#bShield', () => useItem('scudo'));
btn('#bDrop', () => { input.jumpQ = true; });
btn('#pickBtn', () => { if (promptLoot) tryPickup(promptLoot); });
btn('#menuBtn', () => pauseGame());
hud.mini.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); hud.bigmap.style.display = 'grid'; drawMap(bigCtx, 760, true); });
hud.bigmap.addEventListener('pointerdown', e => { e.preventDefault(); hud.bigmap.style.display = 'none'; });
// mouse look
let mouseDrag = false, lockFailed = false;
function tryLock() {
  if (isTouch || lockFailed || document.pointerLockElement) return;
  try { const p = canvas.requestPointerLock ? touchLayer.requestPointerLock() : null; if (p && p.catch) p.catch(() => { lockFailed = true; }); } catch (e) { lockFailed = true; }
}
function exitLock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { } }
document.addEventListener('pointerlockerror', () => { lockFailed = true; });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && state === 'play' && !isTouch && !lockFailed && wasLocked) pauseGame(); wasLocked = !!document.pointerLockElement; });
let wasLocked = false;
window.addEventListener('mousemove', e => {
  if (state !== 'play') return;
  if (document.pointerLockElement) { input.lookDX += e.movementX * 0.0023; input.lookDY += e.movementY * 0.0023; }
  else if (mouseDrag && (e.buttons & 3)) { input.lookDX += e.movementX * 0.004; input.lookDY += e.movementY * 0.004; }
});
window.addEventListener('contextmenu', e => { if (state === 'play') e.preventDefault(); });
window.addEventListener('wheel', e => { if (state === 'play') cycleSlot(e.deltaY > 0 ? 1 : -1); }, { passive: true });
window.addEventListener('keydown', e => {
  if (state === 'play' || state === 'paused') { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault(); }
  if (e.code === 'Escape') { if (state === 'play') pauseGame(); else if (state === 'paused') resumeGame(); return; }
  if (state !== 'play') return;
  initAudio();
  if (e.repeat) { input.keys[e.code] = true; return; }
  input.keys[e.code] = true;
  switch (e.code) {
    case 'Space': input.jumpQ = true; break;
    case 'KeyR': startReload(); break;
    case 'KeyQ': build('wall'); break;
    case 'KeyE': build('ramp'); break;
    case 'KeyF': if (promptLoot) tryPickup(promptLoot); break;
    case 'KeyH': useItem('bende'); break;
    case 'KeyJ': case 'KeyG': useItem('scudo'); break;
    case 'KeyM': hud.bigmap.style.display = hud.bigmap.style.display === 'grid' ? 'none' : 'grid'; drawMap(bigCtx, 760, true); break;
    case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5': selectSlot(+e.code.slice(5) - 1); break;
  }
});
window.addEventListener('keyup', e => { input.keys[e.code] = false; });
window.addEventListener('blur', () => { input.keys = {}; input.fire = false; fireIds.clear(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

// orientation hint
let rotDismissed = false;
function checkOrientation() {
  const show = state === 'play' && isTouch && innerHeight > innerWidth && !rotDismissed;
  $('#rotate').style.display = show ? 'grid' : 'none';
}
$('#rotOk').addEventListener('click', () => { rotDismissed = true; checkOrientation(); });


// ================= HOME =================
const homeScene = new THREE.Scene();
const homeCam = new THREE.PerspectiveCamera(36, 1, 0.1, 1500);
const HL = GX.setupScene(homeScene, renderer, GX.LOOK.home, 40, 300, 1024, 9);
const homeSky = HL.dome; homeSun = HL.key; GX.followKey(HL, 0, 0, 0);
let homeWater = null, homeGrass = null;
const homeClouds = [];
let homeBats = null, homeAmb = null;
(function buildHome() {
  // island: small terrain disc
  const segs = 64, rad = 9, g = new THREE.CircleGeometry(rad, segs, 0, Math.PI * 2);
  const ring = new THREE.RingGeometry(0.01, rad, 64, 14);
  const pos = ring.attributes.position, hn = makeNoise(3);
  const homeH = (x, z) => { const d = Math.hypot(x, z) / rad; return d >= 1 ? -0.75 - (d - 1) * 5 : (1 - smooth(0.55, 1, d)) * 1.0 - smooth(0.85, 1, d) * 0.9 + (hn.fbm(x * 0.5, z * 0.5, 3) - 0.5) * 0.25 * (1 - d) + 0.15; };
  ring.rotateX(-Math.PI / 2);
  const spA = new Uint8Array(pos.count * 4), spB = new Uint8Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z) / rad;
    pos.setY(i, homeH(x, z));
    const v = hn.fbm(x * 0.4 + 5, z * 0.4, 2), sand = smooth(0.66, 0.8, d), dirt = (1 - smooth(0.5, 1.3, Math.hypot(x, z - 0.4))) * 0.8;
    const lv = smooth(0.5, 0.7, v) * 0.7, gr = (1 - sand) * (1 - dirt);
    spA[i * 4] = gr * (1 - lv) * 255; spA[i * 4 + 1] = gr * lv * 255; spA[i * 4 + 2] = sand * 255; spB[i * 4 + 1] = (1 - sand) * dirt * 255; spB[i * 4 + 2] = v * 255;
  }
  ring.setAttribute('splatA', new THREE.BufferAttribute(spA, 4, true)); ring.setAttribute('splatB', new THREE.BufferAttribute(spB, 4, true));
  const uvA = ring.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, pos.getX(i) / 4, pos.getZ(i) / 4);
  ring.computeVertexNormals();
  const isl = new THREE.Mesh(ring, GX.makeTerrainMaterial(GX.LOOK.home)); isl.receiveShadow = true; homeScene.add(isl);
  g.dispose();
  const HN = 96, HS = 40, hh = new Float32Array(HN * HN);
  for (let j = 0; j < HN; j++) for (let i = 0; i < HN; i++) hh[j * HN + i] = homeH(-HS / 2 + (i + 0.5) / HN * HS, -HS / 2 + (j + 0.5) / HN * HS);
  const hTex = GX.heightTexture(hh, HN);
  homeWater = GX.makeWater({ skyU: HL.U, look: GX.LOOK.home, heightTex: hTex, hB: [-HS / 2, -HS / 2, HS], normalTex: TEX.waterN, keyDir: HL.keyDir, radius: 900 });
  homeScene.add(homeWater.mesh);
  const GM = 64, gmd = new Uint8Array(GM * GM * 4);
  for (let j = 0; j < GM; j++) for (let i = 0; i < GM; i++) {
    const x = -rad + (i + 0.5) / GM * rad * 2, z = -rad + (j + 0.5) / GM * rad * 2, d = Math.hypot(x, z) / rad, k = (j * GM + i) * 4;
    let dn = 1 - smooth(0.58, 0.7, d); dn *= smooth(0.9, 1.5, Math.hypot(x, z - 0.4));
    gmd[k] = dn * 255; gmd[k + 1] = smooth(0.5, 0.7, hn.fbm(x * 0.4 + 5, z * 0.4, 2)) * 200; gmd[k + 2] = 140; gmd[k + 3] = 255;
  }
  homeGrass = GX.makeGrass({ count: 2600, A: 13, R: 6.5, heightTex: hTex, hB: [-HS / 2, -HS / 2, HS], maskTex: GX.maskTexture(gmd, GM), mB: [-rad, -rad, rad * 2], look: GX.LOOK.home, blades: 6, seed: 5, wind: 0.8, height: 0.42, keyDir: HL.keyDir });
  homeScene.add(homeGrass.mesh);
  const add = (geo, mat, x, y, z, sc = 1, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.setScalar(sc); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; homeScene.add(m); return m; };
  add(deadTreeGeo(11), VEG_MAT, -3.8, 0.85, -3.4, 0.95, 0.6);
  add(treeGeo('round', 1), VEG_MAT, 5.4, 0.55, -5.8, 0.8);
  for (const [x, z, s] of [[3.6, -1.6, 0.6], [-2.8, 2.6, 0.5]]) add(treeGeo('bush', 9 + Math.round(x * 10)), VEG_MAT, x, 0.95, z, s);
  add(rockGeo(5), ROCK_MAT, 3.3, 0.8, -3.0, 0.5);
  add(graveGeo(0), STONE_MAT, -1.9, 1.0, -2.6, 1, 0.25); add(graveGeo(1), STONE_MAT, -0.4, 1.02, -3.4, 1, -0.1); add(graveGeo(2), STONE_MAT, 1.3, 1.0, -2.9, 1, -0.3);
  const pg = pumpkinGeos();
  const glowH = new GlowPoints(64, GLOW_ADD);
  for (const [x, z, s, ry, lit] of [[1.5, 1.4, 0.85, -0.5, true], [2.3, 0.6, 0.6, -0.9, true], [-1.6, 1.2, 0.7, 0.5, true], [-2.4, 0.2, 0.55, 0.9, false], [2.9, 2.2, 0.5, -0.3, false]]) {
    add(pg.body, VEG_MAT, x, 1.08, z, s, ry); if (lit) { add(pg.face, FACE_MAT, x, 1.08, z, s, ry); glowH.add(x - Math.sin(ry) * 0.6 * s, 1.08 + 0.3 * s, z - Math.cos(ry) * 0.6 * s, 0xff7a1a, 1.6 * s, 1, 0.95); }
  }
  for (const [x, z] of [[-1.6, -2.2], [-0.2, -3.0], [1.1, -2.5], [-2.1, -1.9]]) {
    const c = new THREE.Mesh(U.cylLo, smat(0xe8e0c8, 0.8)); c.scale.set(0.035, 0.16, 0.035); c.position.set(x, 1.13, z); homeScene.add(c);
    const f = new THREE.Mesh(U.sphLo, FACE_MAT); f.scale.set(0.016, 0.03, 0.016); f.position.set(x, 1.24, z); homeScene.add(f);
    glowH.add(x, 1.25, z, 0xffaa50, 0.5, 1, 0.9);
  }
  glowH.commit(); homeScene.add(glowH.points);
  homeBats = makeBats(homeScene, 9, [{ x: 0, y: 1, z: -5 }, { x: -2, y: 0, z: -9 }], 2.6, 3.2, 3, 6);
  homeAmb = makeAmbient(homeScene, 40, 10, (x, z) => Math.hypot(x, z) < 8 ? 1 : 0.1);
  for (let i = 0; i < 12; i++) {
    const sp = new THREE.Sprite(CLOUD_MAT); const sc = 30 + Math.random() * 40; sp.scale.set(sc, sc * 0.5, 1);
    sp.position.set((Math.random() - 0.5) * 200, 22 + Math.random() * 20, -60 - Math.random() * 80); sp.userData.v = 0.6 + Math.random(); homeScene.add(sp); homeClouds.push(sp);
  }
})();
let homeChar = null;
function setHomeChar() {
  if (homeChar) homeScene.remove(homeChar.g);
  homeChar = makeHuman(outfitLook(settings.outfit)); setGun(homeChar, 'assalto', 4);
  homeChar.g.position.set(0, 1.12, 0.4); homeScene.add(homeChar.g);
  $('#oName').textContent = LOOKS[settings.outfit].name;
  $('#oTag').textContent = LOOKS[settings.outfit].monster ? 'Halloween · ' + (settings.outfit - FIRST_MONSTER + 1) + '/8' : 'Classica';
}
function renderMapList() {
  const box = $('#mapList'); box.innerHTML = '';
  MAPS.forEach((m, i) => {
    const b = document.createElement('button'); b.className = 'mapc'; b.setAttribute('aria-pressed', String(i === settings.map));
    const cv = document.createElement('canvas'); cv.width = cv.height = 56; b.appendChild(cv);
    const tx = document.createElement('div'); tx.style.minWidth = '0';
    tx.innerHTML = `<b>${m.name}</b><small>${m.size} m · ${m.bots} bot</small><span class="sz">${m.tag}</span>`;
    b.appendChild(tx);
    b.addEventListener('click', () => { settings.map = i; store.set('map', i); renderMapList(); sfx('click'); });
    box.appendChild(b); drawPreview(cv, m);
  });
}
const previewCache = {};
function drawPreview(cv, map) {
  const ctx = cv.getContext('2d');
  if (!previewCache[map.id]) {
    const { hf } = makeHeightFn(map); const n = 56, img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const wx = (x / n - 0.5) * map.size, wz = (y / n - 0.5) * map.size, h = hf(wx, wz);
      const c = h < 0 ? [34, 72, 104] : toSRGB(terrainColor(map, h, 0, 0.5, 0.4));
      const k = (y * n + x) * 4; img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
    }
    previewCache[map.id] = img;
  }
  ctx.putImageData(previewCache[map.id], 0, 0);
}
function refreshStats() { const st = store.get('stats', { games: 0, wins: 0, kills: 0 }); $('#stWins').textContent = st.wins; $('#stKills').textContent = st.kills; $('#stGames').textContent = st.games; }
function renderDiff() { document.querySelectorAll('#diffSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === settings.diff))); }
function renderGfx() { document.querySelectorAll('#gfxSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.g === settings.gfx))); }
document.querySelectorAll('#diffSeg button').forEach(b => b.addEventListener('click', () => { settings.diff = b.dataset.d; store.set('diff', settings.diff); renderDiff(); sfx('click'); }));
document.querySelectorAll('#gfxSeg button').forEach(b => b.addEventListener('click', () => { settings.gfx = b.dataset.g; store.set('gfx', settings.gfx); renderGfx(); applyGfx(); sfx('click'); }));
$('#oPrev').addEventListener('click', () => { settings.outfit = (settings.outfit + LOOKS.length - 1) % LOOKS.length; store.set('outfit', settings.outfit); setHomeChar(); sfx('click'); });
$('#oNext').addEventListener('click', () => { settings.outfit = (settings.outfit + 1) % LOOKS.length; store.set('outfit', settings.outfit); setHomeChar(); sfx('click'); });
$('#playBtn').addEventListener('click', () => { initAudio(); sfx('click'); startMatch(); });
$('#helpBtn').addEventListener('click', () => { $('#help').hidden = false; });
$('#wipeBtn').addEventListener('click', () => {
  if (!confirm('Cancellare statistiche e impostazioni salvate in questo browser?')) return;
  try { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('isolaT_')) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); } catch (e) { }
  refreshStats(); $('#wipeBtn').textContent = 'Dati cancellati';
});
$('#helpClose').addEventListener('click', () => { $('#help').hidden = true; });
$('#resumeBtn').addEventListener('click', resumeGame);
$('#quitBtn').addEventListener('click', goHome);
$('#againBtn').addEventListener('click', () => { $('#end').hidden = true; startMatch(); });
$('#homeBtn').addEventListener('click', goHome);
$('#homeNote').textContent = isTouch ? 'Consiglio: gioca col telefono in orizzontale. Se va a scatti, scegli grafica Bassa.' : 'Clicca nel gioco per bloccare il mouse. Esc per la pausa.';
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  homeCam.aspect = w / h; homeCam.updateProjectionMatrix();
  fxD = Math.min(window.devicePixelRatio || 1, 2); fxW = fx.width = Math.round(w * fxD); fxH = fx.height = Math.round(h * fxD);
  checkOrientation();
}

// ================= LOOP =================
let lastT = performance.now(), homeT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.max(0, Math.min(0.05, (now - lastT) / 1000)); lastT = now; // never negative: rAF time can precede lastT set after a long load
  if (state === 'home' || !W) {
    homeT += dt;
    if (homeChar) {
      homeChar.g.rotation.y = Math.sin(homeT * 0.35) * 0.55 + 0.25;
      animHuman(homeChar, { spd: 0, ph: 0, pitch: -0.32 + Math.sin(homeT * 0.9) * 0.03, hold: 'rifle', t: homeT, headYaw: Math.sin(homeT * 0.5) * 0.25 });
    }
    for (const c of homeClouds) { c.position.x += c.userData.v * dt; if (c.position.x > 110) c.position.x = -110; }
    if (homeGrass) homeGrass.update(0, 0, V.set(0, 0, 0), dt);
    if (homeWater) homeWater.update(homeCam.position, dt);
    HALO_UNI.uTime.value += dt; HALO_UNI.uScale.value = renderer.domElement.height / (2 * Math.tan(homeCam.fov * Math.PI / 360));
    if (homeBats) homeBats.update(homeT); if (homeAmb) homeAmb.update(homeT, dt, homeCam.position.x, 0, homeCam.position.z - 6);
    const wide = innerWidth / innerHeight;
    homeCam.position.set(Math.sin(homeT * 0.07) * 0.6, 2.05, wide > 1.3 ? 6.4 : 8.6); homeCam.lookAt(0, 1.95, 0);
    homeSky.position.copy(homeCam.position);
    renderer.toneMappingExposure = GX.LOOK.home.exposure;
    renderer.render(homeScene, homeCam);
    return;
  }
  if (state === 'play') update(dt);
  else if (state === 'over') { matchT += dt; for (const b of W.bots) updateBot(b, dt); updateDeadPlayer(dt); updateParticles(dt); yaw += dt * 0.15; updateCamera(dt); envUpdate(dt); }
  renderer.toneMappingExposure = W.look.exposure;
  renderer.render(W.scene, camera);
  if (state === 'play' || state === 'over') drawFx(dt); else fxc.clearRect(0, 0, fxW, fxH);
}
if (!store.get('hw26', false)) { settings.outfit = FIRST_MONSTER; store.set('outfit', settings.outfit); store.set('hw26', true); }
window.addEventListener('resize', resize);
applyGfx(); setHomeChar(); renderMapList(); renderDiff(); renderGfx(); refreshStats();
$('#loading').hidden = true;
requestAnimationFrame(frame);
})();
