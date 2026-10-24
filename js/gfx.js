// Isola Tempesta v2 — rendering helpers: assets, sky/env, terrain, grass, water.
// All assets are local (CC0, see CREDITS.md). No network requests to other domains.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

THREE.ColorManagement.enabled = false; // keep the original game's colour maths (lin()/linC() helpers)

const BASE = new URL('../', import.meta.url).href;
export let META = null;

// ---------- small colour helpers ----------
const s2l = x => x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
const l2s = x => { x = Math.min(1, Math.max(0, x)); return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; };
export function hexLin(h) { return new THREE.Vector3(s2l(((h >> 16) & 255) / 255), s2l(((h >> 8) & 255) / 255), s2l((h & 255) / 255)); }
const vlum = v => v.x * 0.2126 + v.y * 0.7152 + v.z * 0.0722;
function acesDisplay(c, exposure) { // three.js ACESFilmicToneMapping + sRGB OETF, on the CPU
  const v = [c.x * exposure / 0.6, c.y * exposure / 0.6, c.z * exposure / 0.6];
  const I = [[0.59719, 0.35458, 0.04823], [0.07600, 0.90834, 0.01566], [0.02840, 0.13383, 0.83777]];
  const O = [[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]];
  const a = I.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]).map(x => (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.4329510) + 0.238081));
  const o = O.map(r => r[0] * a[0] + r[1] * a[1] + r[2] * a[2]);
  return new THREE.Color(l2s(o[0]), l2s(o[1]), l2s(o[2]));
}
function rotY(v, a) { const c = Math.cos(a), s = Math.sin(a); return new THREE.Vector3(c * v.x - s * v.z, v.y, s * v.x + c * v.z); }

// ---------- per-map look (palette from Spark, isola-spark.md) ----------
// colours are sRGB hex; tints are converted to linear in the shaders.
export const LOOK = {
  // Scoglio Corallo: sunset
  scoglio: { sky: 'sunset', rot: 0, skyI: 1.0, grade: 0.55, top: 0x5B4A78, hor: 0xE89A5B, exposure: 1.0,
    key: 0xFFB774, keyI: 3.4, keyMinEl: 13, hemiSky: 0x7a6a98, hemiGround: 0x3A4A6A, hemiI: 0.35, envI: 0.75, sunDisc: 1, moon: 0, stars: 0,
    t: { grass: 0x6E6B3A, leaves: 0x7a5c3a, sand: 0xCDB894, rock: 0x8a8174, snow: 0xe8eef4, dirt: 0x76604a, seabed: 0x8a7a5c },
    water: { shallow: 0x3f8f8a, deep: 0x123548, foam: 0xf2e6d6 }, cloud: 0xd89a86, cloudO: 0.45 },
  // Baia Smeraldo: blue hour, moon rising opposite the last light
  baia: { sky: 'dusk', rot: 0, skyI: 0.62, grade: 0.6, top: 0x24304F, hor: 0xC9875A, exposure: 1.05,
    key: 0xAFC2E0, keyI: 1.6, keyFromMoon: true, keyMinEl: 18, hemiSky: 0x40507a, hemiGround: 0x2a2a30, hemiI: 0.45, envI: 0.95, sunDisc: 0, moon: 1, stars: 0.35,
    t: { grass: 0x4E5A3C, leaves: 0x7A4A2A, sand: 0xa89a7c, rock: 0x6f6c66, snow: 0xe0e6ee, dirt: 0x5e4e3e, seabed: 0x5a5444 },
    water: { shallow: 0x2a5c66, deep: 0x0c1e30, foam: 0xb8c4d0 }, cloud: 0x5D6A7C, cloudO: 0.4 },
  // Arcipelago Tuono: night storm with lightning
  arcipelago: { sky: 'storm', rot: 0, skyI: 0.34, grade: 0.75, top: 0x1E2230, hor: 0x2B3550, exposure: 1.1,
    key: 0x9fb0d8, keyI: 1.25, keyMinEl: 30, hemiSky: 0x2B3550, hemiGround: 0x1a1c22, hemiI: 0.6, envI: 1.35, sunDisc: 0, moon: 0, stars: 0, lightning: 0xD8E4FF,
    t: { grass: 0x48523a, leaves: 0x524636, sand: 0x7D7260, rock: 0x55565a, snow: 0xd8dee6, dirt: 0x4a3e32, seabed: 0x4a4436 }, wet: 1,
    water: { shallow: 0x1d3c44, deep: 0x070f18, foam: 0x9aa6b4 }, cloud: 0x1E2230, cloudO: 0.55 },
  // Terre Selvagge: full moon
  continente: { sky: 'moon', rot: 0, skyI: 0.75, grade: 0.55, top: 0x141A33, hor: 0x3a4766, exposure: 1.1,
    key: 0x9FB4D6, keyI: 2.1, keyMinEl: 20, hemiSky: 0x33406a, hemiGround: 0x1e222a, hemiI: 0.5, envI: 1.0, sunDisc: 0, moon: 0.6, stars: 0.6,
    t: { grass: 0x5A6450, leaves: 0x5a5040, sand: 0x9a9280, rock: 0x6c6e72, snow: 0xdfe6ee, dirt: 0x8a7a66, seabed: 0x5a5648 },
    water: { shallow: 0x2a4e5c, deep: 0x08141f, foam: 0xc8d2de }, cloud: 0x2a3350, cloudO: 0.4 },
};
LOOK.home = Object.assign({}, LOOK.scoglio, { rot: -1.25, keyI: 3.0, envI: 0.9, hemiI: 0.45 });

// ---------- loading ----------
async function fetchBitmap(url) {
  const r = await fetch(BASE + url); if (!r.ok) throw new Error('asset ' + url + ' ' + r.status);
  const b = await r.blob();
  return createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
}
function pixels(bmp, size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(bmp, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size).data;
}
const TER_KEYS = ['grass', 'leaves', 'sand', 'rock', 'snow', 'dirt'];
export const ASSETS = { terrainC: null, terrainN: null, house: {}, sky: {}, veg: {} };
export async function loadAssets(renderer, opts, onProgress) {
  META = await (await fetch(BASE + 'assets/assets.json')).json();
  const size = opts.terrainSize || 1024, aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const jobs = [];
  let done = 0; const tick = () => { done++; onProgress && onProgress(done / total); };
  // terrain layers -> 2 texture arrays
  const tc = new Array(6), tn = new Array(6);
  TER_KEYS.forEach((k, i) => {
    jobs.push(fetchBitmap(`assets/tex/t_${k}_c.webp`).then(b => { tc[i] = pixels(b, size); b.close && b.close(); tick(); }));
    jobs.push(fetchBitmap(`assets/tex/t_${k}_n.webp`).then(b => { tn[i] = pixels(b, size); b.close && b.close(); tick(); }));
  });
  // house materials
  for (const k of ['plaster', 'roof', 'wood', 'stone']) for (const s of ['c', 'n']) {
    jobs.push(fetchBitmap(`assets/tex/h_${k}_${s}.webp`).then(b => {
      const t = new THREE.Texture(b); t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
      if (s === 'c') t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
      (ASSETS.house[k] = ASSETS.house[k] || {})[s] = t; tick();
    }));
  }
  // sky panoramas (LDR, derived from Poly Haven HDRIs)
  for (const key in META.hdri) {
    jobs.push(fetchBitmap(META.hdri[key].bg).then(b => {
      const t = new THREE.Texture(b); t.flipY = false; // rows: top of image = zenith; handled in shader
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
      ASSETS.sky[key] = { tex: t, meta: META.hdri[key], horizon: horizonAverage(pixels(b, 256), 256) }; tick();
    }));
  }
  // vegetation models (Quaternius, CC0; meshopt + WebP)
  if (opts.veg !== false) {
    const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
    for (const [k, hgt] of Object.entries(VEG_MODELS)) jobs.push(gl.loadAsync(BASE + `assets/veg/${k}.glb`).then(g => { ASSETS.veg[k] = vegParts(g.scene, hgt, aniso); tick(); }));
  }
  const total = jobs.length;
  await Promise.all(jobs);
  ASSETS.terrainC = arrayTex(tc, size, true, aniso);
  ASSETS.terrainN = arrayTex(tn, size, false, aniso);
  return ASSETS;
}
const VEG_MODELS = { dead1: 7.2, dead2: 6.8, dead3: 7.0, twist1: 7.8, twist2: 7.4 };
// flatten a glTF scene into [{geo, mat}] with the base at y=0 and a target height
function vegParts(root, height, aniso) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), k = height / (box.max.y - box.min.y);
  const parts = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone();
    for (const n of Object.keys(geo.attributes)) { // de-quantize (KHR_mesh_quantization) before transforming
      const a = geo.attributes[n]; if (a.array instanceof Float32Array && !a.isInterleavedBufferAttribute) continue;
      const f = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a.getComponent(i, c);
      geo.setAttribute(n, new THREE.BufferAttribute(f, a.itemSize));
    }
    geo.applyMatrix4(o.matrixWorld);
    geo.translate(0, -box.min.y, 0); geo.scale(k, k, k);
    for (const n of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(n)) geo.deleteAttribute(n);
    if (geo.attributes.color) geo.deleteAttribute('color');
    geo.computeBoundingSphere();
    const src = o.material, leaf = src.transparent || src.alphaTest > 0 || /leaf|leaves/i.test(src.name);
    if (src.map) src.map.anisotropy = aniso;
    const mat = new THREE.MeshStandardMaterial({ map: src.map || null, normalMap: src.normalMap || null, color: src.color, roughness: leaf ? 0.75 : 0.92, metalness: 0,
      side: leaf ? THREE.DoubleSide : THREE.FrontSide, alphaTest: leaf ? 0.45 : 0, transparent: false });
    parts.push({ geo, mat, leaf });
  });
  return parts;
}
function arrayTex(list, size, srgb, aniso) {
  const n = list.length, buf = new Uint8Array(size * size * 4 * n);
  list.forEach((d, i) => buf.set(d, i * size * size * 4));
  const t = new THREE.DataArrayTexture(buf, size, size, n);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true; t.anisotropy = aniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  return t;
}
function horizonAverage(px, n) { // linear mean of the sky ring 2–8° above the horizon, 64 azimuth bins
  const h = n / 2, bins = [];
  for (let b = 0; b < 64; b++) {
    const v = new THREE.Vector3(); let c = 0;
    for (let x = Math.floor(b * n / 64); x < Math.floor((b + 1) * n / 64); x++) for (let r = Math.floor(h * (1 - 8 / 90)); r <= Math.floor(h * (1 - 2 / 90)); r++) {
      const k = ((r * n) + x) * 4; v.x += s2l(px[k] / 255); v.y += s2l(px[k + 1] / 255); v.z += s2l(px[k + 2] / 255); c++;
    }
    bins.push(v.multiplyScalar(1 / c));
  }
  const avg = bins.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / 64);
  return { avg, bins };
}

// ---------- sky ----------
const SKY_GLSL = /* glsl */`
uniform sampler2D uBg; uniform float uRot; uniform vec3 uTint; uniform float uSkyI;
uniform vec3 uTop; uniform vec3 uHor; uniform float uGrade; uniform float uLumRef;
uniform vec3 uSunDir; uniform vec3 uSunC; uniform float uSunDisc;
uniform vec3 uMoonDir; uniform float uMoon; uniform float uStars; uniform float uFlash;
vec3 skyBase(vec3 d, float lod) {
  float c = cos(uRot), s = sin(uRot);
  vec3 r = vec3(c * d.x + s * d.z, d.y, -s * d.x + c * d.z);
  float u = atan(r.z, r.x) * 0.15915494 + 0.5;
  float v = 0.5 - asin(clamp(r.y, -1.0, 1.0)) * 0.31830989;
  vec3 col = textureLod(uBg, vec2(u, v), lod).rgb;
  float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 g = mix(uHor, uTop, pow(clamp(d.y, 0.0, 1.0), 0.55));
  col = mix(col, g * (L / uLumRef), uGrade);
  return col * uTint * uSkyI;
}
vec3 skyColor(vec3 d, float lod) {
  vec3 dd = normalize(vec3(d.x, max(d.y, 0.004), d.z));
  vec3 col = skyBase(dd, lod);
  float sd = max(dot(dd, uSunDir), 0.0);
  col += uSunC * (pow(sd, 10.0) * 0.18 + pow(sd, 90.0) * 0.5 + smoothstep(0.99955, 0.99972, sd) * 5.0) * uSunDisc;
  float md = max(dot(dd, uMoonDir), 0.0);
  col += vec3(0.72, 0.8, 1.0) * (pow(md, 400.0) * 0.18 + pow(md, 24.0) * 0.03) * uMoon;
  float disc = smoothstep(0.99950, 0.99966, md);
  float cr = 0.85 + 0.15 * sin(dd.x * 1700.0) * sin(dd.y * 1500.0 + dd.z * 1100.0);
  col = mix(col, vec3(0.95, 0.96, 1.0) * 1.4 * cr, disc * step(0.01, uMoon));
  if (uStars > 0.0) {
    vec3 q = floor(dd * 420.0); float rr = fract(sin(dot(q, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    col += vec3(step(0.9975, rr) * smoothstep(0.1, 0.45, dd.y) * uStars * (0.35 + 0.65 * fract(rr * 91.7)) * 0.5);
  }
  return col * (1.0 + uFlash);
}`;
export function makeSkyUniforms(look) {
  const S = ASSETS.sky[look.sky], m = S.meta, rot = look.rot || 0;
  const raw = new THREE.Vector3().fromArray(m.lightDir).normalize();
  const sunDir = rotY(raw, rot);
  const moonDir = look.keyFromMoon ? new THREE.Vector3(-sunDir.x, 0.42, -sunDir.z).normalize() : sunDir.clone();
  const L = vlum(S.horizon.avg) || 0.3;
  const U = {
    uBg: { value: S.tex }, uRot: { value: rot }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uSkyI: { value: look.skyI },
    uTop: { value: hexLin(look.top) }, uHor: { value: hexLin(look.hor) }, uGrade: { value: look.grade }, uLumRef: { value: 1 },
    uSunDir: { value: sunDir }, uSunC: { value: hexLin(look.key) }, uSunDisc: { value: look.sunDisc },
    uMoonDir: { value: moonDir }, uMoon: { value: look.moon }, uStars: { value: look.stars }, uFlash: { value: 0 },
    uFogC: { value: new THREE.Color() }, uBand: { value: 0.07 }, uEnv: { value: 0 },
  };
  // grade normalisation: the grade colour g is scaled so that horizon luminance is preserved
  U.uLumRef.value = Math.max(0.02, vlum(hexLin(look.hor)) / L * L) / Math.max(0.02, L) * L; // = lum(hor)
  U.uLumRef.value = Math.max(0.02, vlum(hexLin(look.hor)));
  // horizon (fog) colour as it appears on screen
  const g = hexLin(look.hor), hz = S.horizon.avg.clone();
  const graded = hz.clone().lerp(g.clone().multiplyScalar(vlum(hz) / U.uLumRef.value), look.grade).multiplyScalar(look.skyI);
  U.uFogC.value.copy(acesDisplay(graded, look.exposure));
  // key light direction: real sun/moon azimuth, elevation clamped for readable shadows
  let kd = (look.keyFromMoon ? moonDir : sunDir).clone();
  const el = Math.asin(kd.y), minEl = (look.keyMinEl || 12) * Math.PI / 180;
  if (el < minEl) { const h = Math.hypot(kd.x, kd.z); kd.set(kd.x / h * Math.cos(minEl), Math.sin(minEl), kd.z / h * Math.cos(minEl)); }
  return { U, keyDir: kd.normalize(), fog: U.uFogC.value, horizonLin: graded };
}
export function makeSkyMaterial(U, forEnv) {
  return new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: '#include <common>\nuniform vec3 uFogC; uniform float uBand;\n' + SKY_GLSL + `
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        gl_FragColor = vec4(skyColor(d, 0.0), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float band = smoothstep(-0.015, uBand, d.y);
        ${forEnv ? 'gl_FragColor.rgb = mix(pow(uFogC, vec3(2.2)) * 0.7, gl_FragColor.rgb, band);' : 'gl_FragColor.rgb = mix(uFogC, gl_FragColor.rgb, band);'}
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  });
}
export function makeSkyDome(U) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), makeSkyMaterial(U, false));
  m.renderOrder = -10; m.frustumCulled = false; return m;
}
export function buildEnvironment(renderer, U) {
  const sc = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), makeSkyMaterial(U, true)); sc.add(dome);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(sc, 0, 0.1, 100);
  pm.dispose(); dome.geometry.dispose(); dome.material.dispose();
  return rt.texture;
}

// apply look to a scene: sky dome, fog, environment, lights. returns handles
export function setupScene(scene, renderer, look, fogNear, fogFar, shadowSize, shadowRange) {
  const sky = makeSkyUniforms(look);
  const dome = makeSkyDome(sky.U); scene.add(dome);
  scene.fog = new THREE.Fog(sky.fog.clone(), fogNear, fogFar);
  scene.environment = buildEnvironment(renderer, sky.U);
  scene.environmentIntensity = look.envI;
  const hemi = new THREE.HemisphereLight(new THREE.Color().setRGB(...hexLin(look.hemiSky).toArray()), new THREE.Color().setRGB(...hexLin(look.hemiGround).toArray()), look.hemiI);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(new THREE.Color().setRGB(...hexLin(look.key).toArray()), look.keyI);
  key.castShadow = shadowSize > 0;
  if (shadowSize > 0) {
    key.shadow.mapSize.set(shadowSize, shadowSize);
    const c = key.shadow.camera; c.left = -shadowRange; c.right = shadowRange; c.top = shadowRange; c.bottom = -shadowRange; c.near = 1; c.far = 420; c.updateProjectionMatrix();
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04; key.shadow.radius = 2;
  }
  scene.add(key); scene.add(key.target);
  return { sky, dome, hemi, key, keyDir: sky.keyDir, look, U: sky.U };
}
export function followKey(L, x, y, z) {
  L.key.target.position.set(x, y, z);
  L.key.position.set(x + L.keyDir.x * 180, y + L.keyDir.y * 180, z + L.keyDir.z * 180);
}

// ---------- height / mask textures ----------
export function heightTexture(H, N) {
  const d = new Uint16Array(N * N);
  for (let i = 0; i < N * N; i++) d[i] = THREE.DataUtils.toHalfFloat(H[i]);
  const t = new THREE.DataTexture(d, N, N, THREE.RedFormat, THREE.HalfFloatType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}
export function maskTexture(data, M) {
  const t = new THREE.DataTexture(data, M, M, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}

// ---------- terrain material: 6 PBR layers, height-blended, triplanar rock ----------
// splat attributes: splatA = (grass, leaves, sand, rock) splatB = (snow, dirt, macro, wet) — Uint8 normalised
export function makeTerrainMaterial(look) {
  const T = look.t, tint = TER_KEYS.map(k => hexLin(T[k]));
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const U = {
    uAlb: { value: ASSETS.terrainC }, uNrm: { value: ASSETS.terrainN },
    uTint: { value: tint }, uSeabed: { value: hexLin(T.seabed) },
    uSc: { value: [1 / 2.6, 1 / 2.6, 1 / 3.2, 1 / 5.5, 1 / 4.5, 1 / 3.0] },
    uRough: { value: [0.93, 0.9, 0.95, look.wet ? 0.55 : 0.82, 0.62, 0.95] },
    uWet: { value: look.wet ? 1 : 0 },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 splatA; attribute vec4 splatB; varying vec4 vSA; varying vec4 vSB; varying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSA = splatA; vSB = splatB; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        precision highp sampler2DArray;
        uniform sampler2DArray uAlb; uniform sampler2DArray uNrm; uniform vec3 uTint[6]; uniform vec3 uSeabed; uniform float uSc[6]; uniform float uRough[6]; uniform float uWet;
        varying vec4 vSA; varying vec4 vSB; varying vec3 vWP; varying vec3 vWN;`)
      .replace('#include <map_fragment>', `
        vec3 Ng = normalize(vWN);
        float wL[6]; wL[0] = vSA.x; wL[1] = vSA.y; wL[2] = vSA.z; wL[3] = vSA.w; wL[4] = vSB.x; wL[5] = vSB.y;
        vec3 C[6]; vec3 Nt[6]; float Hb[6]; float hmax = 0.0;
        vec3 tw = pow(abs(Ng), vec3(4.0)); tw /= (tw.x + tw.y + tw.z);
        for (int i = 0; i < 6; i++) {
          C[i] = vec3(0.0); Nt[i] = vec3(0.0); Hb[i] = 0.0;
          if (wL[i] < 0.004) continue;
          float fi = float(i); float sc = uSc[i];
          vec3 c; vec3 n;
          if (i == 3) { // rock: triplanar
            vec4 cx = texture(uAlb, vec3(vWP.zy * sc, fi)), cy = texture(uAlb, vec3(vWP.xz * sc, fi)), cz = texture(uAlb, vec3(vWP.xy * sc, fi));
            vec3 nx = texture(uNrm, vec3(vWP.zy * sc, fi)).xyz * 2.0 - 1.0, ny = texture(uNrm, vec3(vWP.xz * sc, fi)).xyz * 2.0 - 1.0, nz = texture(uNrm, vec3(vWP.xy * sc, fi)).xyz * 2.0 - 1.0;
            c = cx.rgb * tw.x + cy.rgb * tw.y + cz.rgb * tw.z;
            n = vec3(0.0, nx.y, nx.x) * tw.x + vec3(ny.x, 0.0, -ny.y) * tw.y + vec3(nz.x, nz.y, 0.0) * tw.z;
          } else {
            vec2 uv = vWP.xz * sc;
            c = texture(uAlb, vec3(uv, fi)).rgb;
            float far = dot(texture(uAlb, vec3(uv * 0.137 + 0.31, fi)).rgb, vec3(0.333));
            c *= mix(1.0, far * 4.0, 0.45);
            vec3 tn = texture(uNrm, vec3(uv, fi)).xyz * 2.0 - 1.0;
            n = vec3(tn.x, 0.0, -tn.y);
          }
          C[i] = c * uTint[i] * 4.0; Nt[i] = n;
          float h = dot(c, vec3(0.333)) * 2.0;
          Hb[i] = wL[i] + h * 0.35;
          hmax = max(hmax, Hb[i]);
        }
        vec3 alb = vec3(0.0); vec3 nsum = vec3(0.0); float rsum = 0.0; float wsum = 0.0;
        for (int i = 0; i < 6; i++) {
          if (wL[i] < 0.004) continue;
          float w = max(Hb[i] - hmax + 0.22, 0.0) * wL[i];
          alb += C[i] * w; nsum += Nt[i] * w; rsum += uRough[i] * w; wsum += w;
        }
        alb /= max(wsum, 1e-4); nsum /= max(wsum, 1e-4); float tRough = rsum / max(wsum, 1e-4);
        alb *= 0.86 + vSB.z * 0.28;
        // shoreline: wet sand band, darker seabed
        float wetB = (1.0 - smoothstep(0.15, 0.9, vWP.y)) * step(-0.2, vWP.y);
        float under = smoothstep(0.1, -0.6, vWP.y);
        alb = mix(alb, alb * 0.62, max(wetB, vSB.w * 0.6));
        tRough = mix(tRough, 0.32, max(wetB * 0.8, vSB.w * uWet * 0.5));
        alb = mix(alb, uSeabed * mix(1.0, 0.35, smoothstep(0.0, -7.0, vWP.y)) * (0.75 + 0.25 * dot(alb, vec3(1.0)) / max(0.05, dot(uSeabed, vec3(1.0)))), under);
        diffuseColor.rgb *= alb;
        vec3 tNw = normalize(Ng + nsum * 0.9);
      `)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * tRough / 0.95;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(tNw, 0.0)).xyz);');
  };
  mat.customProgramCacheKey = () => 'terrain6';
  return mat;
}

// ---------- grass: GPU-wrapped instanced tufts with wind ----------
function tuftGeometry(blades, seed) {
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const P = [], UV = [], N = [], I = [];
  for (let b = 0; b < blades; b++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.26, ox = Math.cos(a) * r, oz = Math.sin(a) * r;
    const face = rnd() * Math.PI, fx = Math.cos(face), fz = Math.sin(face);
    const h = 0.34 + rnd() * 0.42, w = 0.036 + rnd() * 0.028, lean = (rnd() - 0.5) * 0.5, la = rnd() * Math.PI * 2;
    const base = P.length / 3, rows = [0, 0.3, 0.62, 1];
    rows.forEach((t, k) => {
      const ww = w * (1 - t * 0.92), bend = lean * t * t * h, cx = ox + Math.cos(la) * bend, cz = oz + Math.sin(la) * bend, y = h * t * (1 - Math.abs(lean) * t * 0.3);
      if (k < 3) { P.push(cx - fx * ww, y, cz - fz * ww, cx + fx * ww, y, cz + fz * ww); UV.push(0, t, 1, t); N.push(-fz, 0.3, fx, -fz, 0.3, fx); }
      else { P.push(cx, y, cz); UV.push(0.5, 1); N.push(-fz, 0.3, fx); }
    });
    for (let k = 0; k < 2; k++) { const i0 = base + k * 2; I.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2); }
    I.push(base + 4, base + 5, base + 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I);
  return g;
}
// opts: { count, A (wrap size), R (visible radius), heightTex, hB:[x0,z0,size], maskTex, mB:[x0,z0,size], look, blades, seed }
export function makeGrass(o) {
  const geo = tuftGeometry(o.blades || 6, o.seed || 7), n = o.count;
  const data = new Float32Array(n * 4), hue = new Float32Array(n);
  let s = (o.seed || 7) * 7919 >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < n; i++) { data[i * 4] = rnd() * o.A; data[i * 4 + 1] = rnd() * o.A; data[i * 4 + 2] = rnd() * 6.283; data[i * 4 + 3] = 0.75 + rnd() * 0.6; hue[i] = rnd(); }
  geo.setAttribute('iData', new THREE.InstancedBufferAttribute(data, 4));
  geo.setAttribute('iHue', new THREE.InstancedBufferAttribute(hue, 1));
  const tint = hexLin(o.look.t.grass), dry = hexLin(o.look.t.leaves);
  const U = {
    uCenter: { value: new THREE.Vector3() }, uCam: { value: new THREE.Vector3() }, uA: { value: o.A }, uR: { value: o.R }, uTime: { value: 0 },
    uHgt: { value: o.heightTex }, uHB: { value: new THREE.Vector3(...o.hB) }, uMsk: { value: o.maskTex }, uMB: { value: new THREE.Vector3(...o.mB) },
    uRoot: { value: tint.clone().multiplyScalar(0.42) }, uTip: { value: tint.clone().multiplyScalar(1.55) }, uDry: { value: dry.clone().multiplyScalar(1.1) },
    uWind: { value: o.wind || 1 }, uHeight: { value: o.height || 0.7 }, uKeyW: { value: (o.keyDir || new THREE.Vector3(0, 1, 0)).clone() },
  };
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.82, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uCenter; uniform vec3 uCam; uniform float uA; uniform float uR; uniform float uTime; uniform float uWind; uniform float uHeight;
        uniform sampler2D uHgt; uniform vec3 uHB; uniform sampler2D uMsk; uniform vec3 uMB;
        attribute vec4 iData; attribute float iHue; varying float vT; varying float vHue; varying float vDry; varying float vAO;`)
      .replace('#include <begin_vertex>', `
        vec2 wxz = iData.xy + uA * floor((uCenter.xz - iData.xy) / uA + 0.5);
        vec2 huv = (wxz - uHB.xy) / uHB.z, muv = (wxz - uMB.xy) / uMB.z;
        float gh = textureLod(uHgt, huv, 0.0).r;
        vec4 mk = textureLod(uMsk, muv, 0.0);
        float inside = step(0.0, muv.x) * step(muv.x, 1.0) * step(0.0, muv.y) * step(muv.y, 1.0);
        float dc = length(wxz - uCam.xz);
        float fade = 1.0 - smoothstep(uR * 0.72, uR, dc);
        float edge = 1.0 - smoothstep(uA * 0.4, uA * 0.5, max(abs(wxz.x - uCenter.x), abs(wxz.y - uCenter.z)));
        float dens = smoothstep(0.12, 0.5, mk.r);
        float sc = iData.w * fade * edge * dens * inside;
        float cr = cos(iData.z), sr = sin(iData.z);
        vec3 transformed = vec3(cr * position.x - sr * position.z, position.y * uHeight * mix(0.55, 1.15, mk.r) * (0.8 + 0.4 * mk.b), sr * position.x + cr * position.z) * sc;
        float t = uv.y; float tt = t * t;
        float gust = sin(uTime * 0.7 + wxz.x * 0.05 + wxz.y * 0.03) * 0.5 + 0.5;
        float w1 = sin(uTime * 1.9 + wxz.x * 0.35 + wxz.y * 0.22) + 0.45 * sin(uTime * 3.3 + wxz.x * 0.9 - wxz.y * 0.7);
        transformed.x += (w1 * 0.07 + 0.06 + gust * 0.08) * tt * sc * uWind;
        transformed.z += (cos(uTime * 1.5 + wxz.y * 0.4) * 0.05 + gust * 0.03) * tt * sc * uWind;
        transformed += vec3(wxz.x, gh - 0.03, wxz.y);
        vT = t; vHue = iHue; vDry = mk.g; vAO = 0.55 + 0.45 * t;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uKeyW; uniform vec3 uRoot; uniform vec3 uTip; uniform vec3 uDry; varying float vT; varying float vHue; varying float vDry; varying float vAO;')
      .replace('#include <color_fragment>', `
        vec3 gc = mix(uRoot, uTip, smoothstep(0.0, 1.0, vT));
        gc *= 0.82 + 0.36 * vHue;
        gc = mix(gc, uDry * mix(0.55, 1.05, vT), clamp(vDry * 0.85 + step(0.93, vHue) * 0.5, 0.0, 1.0));
        diffuseColor.rgb = gc;`)
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(normalize(vec3(0.0, 1.0, 0.0) + normalize(vec3(uKeyW.x, 0.0, uKeyW.z)) * 0.75), 0.0)).xyz);')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vAO; reflectedLight.directDiffuse *= mix(0.7, 1.0, vAO);');
  };
  mat.customProgramCacheKey = () => 'grassgpu';
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false;
  return {
    mesh, U, geo, mat,
    update(cx, cz, cam, dt) { U.uCenter.value.set(cx, 0, cz); U.uCam.value.copy(cam); U.uTime.value += dt; },
    dispose() { geo.dispose(); mat.dispose(); mesh.dispose && mesh.dispose(); },
  };
}

// ---------- water ----------
export function makeWater(o) { // { skyU, look, heightTex, hB, normalTex, radius }
  const W = o.look.water;
  const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  for (const k in o.skyU) U[k] = o.skyU[k]; // shared references -> same grading/flash as the sky
  Object.assign(U, {
    uTime: { value: 0 }, uN: { value: o.normalTex }, uHgt: { value: o.heightTex }, uHB: { value: new THREE.Vector3(...o.hB) },
    uShallow: { value: hexLin(W.shallow) }, uDeep: { value: hexLin(W.deep) }, uFoam: { value: hexLin(W.foam) },
    uKeyDir: { value: o.keyDir.clone() }, uKeyC: { value: hexLin(o.look.key).multiplyScalar(o.look.keyI) }, uAmb: { value: o.look.envI }, uWR: { value: o.radius || 1500 },
  });
  const mat = new THREE.ShaderMaterial({
    uniforms: U, fog: true, transparent: true, depthWrite: true,
    vertexShader: `#include <common>
      #include <fog_pars_vertex>
      varying vec3 vWP; uniform float uWR;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `#include <common>
      #include <fog_pars_fragment>
      ${SKY_GLSL}
      uniform float uTime; uniform sampler2D uN; uniform sampler2D uHgt; uniform vec3 uHB;
      uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uFoam; uniform vec3 uKeyDir; uniform vec3 uKeyC; uniform float uAmb;
      varying vec3 vWP; uniform float uWR;
      void main(){
        vec3 toC = cameraPosition - vWP; float dist = length(toC); vec3 V = toC / dist;
        vec2 p = vWP.xz; float t = uTime;
        vec3 n1 = texture(uN, p * 0.043 + t * vec2(0.011, 0.006)).xyz * 2.0 - 1.0;
        vec3 n2 = texture(uN, p * 0.107 - t * vec2(0.009, -0.014)).xyz * 2.0 - 1.0;
        vec3 n3 = texture(uN, p * 0.0071 + t * vec2(0.0021, 0.0013)).xyz * 2.0 - 1.0;
        vec2 nxy = (n1.xy + n2.xy) * 0.5 + n3.xy * 0.7;
        nxy *= mix(1.0, 0.3, smoothstep(25.0, 320.0, dist));
        vec3 N = normalize(vec3(nxy.x * 0.42, 1.0, nxy.y * 0.42));
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 refl = skyColor(R, 1.5);
        float F = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        float H = textureLod(uHgt, (p - uHB.xy) / uHB.z, 0.0).r;
        float depth = max(-H, 0.0);
        vec3 body = mix(uShallow, uDeep, smoothstep(0.2, 6.0, depth)) * uAmb;
        body += uShallow * 0.25 * max(dot(N, uKeyDir), 0.0) * uKeyC * 0.15;
        vec3 col = mix(body, refl, F);
        float sp = pow(max(dot(R, uKeyDir), 0.0), 260.0);
        col += uKeyC * sp * 1.4;
        float shore = 1.0 - smoothstep(0.0, 0.75, depth);
        float fn = texture(uN, p * 0.31 + t * vec2(0.03, 0.02)).x;
        float foam = shore * smoothstep(0.55, 0.75, fn + 0.35 * sin(depth * 9.0 - t * 1.6));
        foam += (1.0 - smoothstep(0.0, 0.12, depth)) * 0.6;
        col = mix(col, uFoam * (uAmb * 0.8 + 0.2), clamp(foam, 0.0, 1.0) * 0.75);
        float a = mix(0.45, 0.97, smoothstep(0.0, 2.2, depth));
        a = max(a, F); a = max(a, clamp(foam, 0.0, 1.0));
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #ifdef USE_FOG
          // the sea keeps its colour longer than the land; the last part of the disc fades fully into the horizon haze
          float ff = smoothstep(fogNear, fogFar, vFogDepth) * 0.62;
          ff = max(ff, smoothstep(uWR * 0.5, uWR * 0.95, length(cameraPosition.xz - vWP.xz)));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, ff);
        #endif
      }`,
  });
  const geo = new THREE.CircleGeometry(1, 72); geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat); mesh.scale.setScalar(o.radius || 1500); mesh.frustumCulled = false; mesh.renderOrder = 1;
  return {
    mesh, U,
    update(cam, dt) { mesh.position.set(cam.x, 0, cam.z); U.uTime.value += dt; },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// ---------- house materials ----------
export function houseMaps(k) { return ASSETS.house[k]; }
