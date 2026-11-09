import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as shaders from './shaders.js';
import { AmbientAudio } from './sound.js';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#universe');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => innerWidth < 761;
const state = {
  ready: false, epoch: 1, time: 0, rate: 1, paused: reducedMotion,
  pulse: 0, journey: false, sound: false, frames: 0, fps: 60,
};
const epochs = [
  { color: '#ed7941', secondary: '#ffe6a6', age: '10<sup>14</sup>', temp: '2.725', caption: '在无尽长夜之前，再看一眼星光。', poem: '每一束尚未熄灭的光，<br/>都是宇宙写给黑暗的信。', bloom: .85 },
  { color: '#d99a59', secondary: '#ffe2ad', age: '10<sup>100</sup>', temp: '0.000', caption: '所有的结束，都是另一种开始。', poem: '当最后一颗恒星熄灭，<br/>宇宙终于学会了安静。', bloom: .72 },
  { color: '#5babb9', secondary: '#d0eaff', age: '0<sup>+</sup>', temp: '∞', caption: '时间再次呼吸，光有了新的名字。', poem: '从一粒不肯沉默的尘埃，<br/>重新长出整个宇宙。', bloom: .9 },
];

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
} catch (error) {
  $('#loading').classList.add('loaded');
  $('#fallback').hidden = false;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .1, 500);
const homePosition = new THREE.Vector3(.1, 5.9, 22.7);
camera.position.copy(homePosition);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = .055;
controls.enablePan = false;
controls.rotateSpeed = .45;
controls.zoomSpeed = .7;
controls.minDistance = 8.5;
controls.maxDistance = 43;
controls.minPolarAngle = .1;
controls.maxPolarAngle = Math.PI - .1;
controls.target.set(0, 0, 0);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .58, .52, .85);
composer.addPass(bloom);
const lensPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uCenter: { value: new THREE.Vector2(.605, .5) },
    uRadius: { value: .12 },
    uAspect: { value: innerWidth / innerHeight },
    uDark: { value: 1 },
  },
  vertexShader: shaders.haloVertex,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uCenter;
    uniform float uRadius;
    uniform float uAspect;
    uniform float uDark;
    varying vec2 vUv;
    void main(){
      vec2 p=(vUv-uCenter)*vec2(uAspect,1.);
      float d=length(p)/uRadius;
      float lens=exp(-abs(d-1.06)*15.)*.0025*uDark;
      vec2 bent=vUv+normalize(p+vec2(.00001))*lens/vec2(uAspect,1.);
      vec4 color=texture2D(tDiffuse,bent);
      float horizon=(1.-smoothstep(.64,.94,d))*uDark;
      float foreground=1.-smoothstep(-.55,-.28,p.y/uRadius);
      horizon*=1.-foreground;
      color.rgb*=1.-horizon*.965;
      gl_FragColor=color;
    }
  `,
});
composer.addPass(lensPass);
composer.addPass(new OutputPass());

const uniforms = {
  uTime: { value: 0 },
  uPulse: { value: 0 },
  uEpoch: { value: 1 },
  uPixelRatio: { value: renderer.getPixelRatio() },
  uColor: { value: new THREE.Color(epochs[1].color) },
  uSecondary: { value: new THREE.Color(epochs[1].secondary) },
};
function material(vertexShader, fragmentShader, options = {}) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, ...options });
}

// 同一颗种子构造星海，让每次抵达都有相同的空间记忆。
let seed = 74319;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
  return (seed >>> 0) / 4294967296;
}
const sky = new THREE.Mesh(new THREE.SphereGeometry(210, 48, 32), material(shaders.skyVertex, shaders.skyFragment, { side: THREE.BackSide, depthWrite: false }));
scene.add(sky);

function createStars() {
  const count = 9200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const theta = random() * Math.PI * 2;
    const cosPhi = random() * 2 - 1;
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
    const radius = 55 + random() * 135;
    positions.set([radius * sinPhi * Math.cos(theta), radius * cosPhi, radius * sinPhi * Math.sin(theta)], i * 3);
    color.setHSL(.07 + random() * .12, .1 + random() * .35, .4 + random() * .5);
    if (random() > .87) color.setHSL(.58, .25, .7);
    colors.set([color.r, color.g, color.b], i * 3);
    sizes[i] = random() > .98 ? 2.2 : .3 + Math.pow(random(), 3) * 1.15;
    phases[i] = random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  return new THREE.Points(geo, material(shaders.starVertex, shaders.starFragment, { vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
}
const stars = createStars();
scene.add(stars);

const singularity = new THREE.Group();
scene.add(singularity);
const core = new THREE.Mesh(new THREE.SphereGeometry(2.17, 96, 64), material(shaders.coreVertex, shaders.coreFragment));
singularity.add(core);
const halo = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), material(shaders.haloVertex, shaders.haloFragment, {
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
}));
singularity.add(halo);

const diskSystem = new THREE.Group();
diskSystem.rotation.z = -.16;
diskSystem.rotation.x = .07;
singularity.add(diskSystem);
const diskMaterial = material(shaders.diskVertex, shaders.diskFragment, { side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const disk = new THREE.Mesh(new THREE.RingGeometry(2.3, 8, 240, 8), diskMaterial);
disk.rotation.x = -Math.PI / 2;
diskSystem.add(disk);

function makeDust(count) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 3.1 + Math.pow(random(), 1.55) * 14;
    const a = random() * Math.PI * 2;
    const arm = Math.sin(a * 3 + r * .5) * .3;
    pos.set([Math.cos(a) * r, (random() - .5) * (.13 + Math.pow(r / 16, 3) * 3.5) + arm, Math.sin(a) * r], i * 3);
    size[i] = .3 + Math.pow(random(), 3) * 1.5;
    phase[i] = random() * 6.28;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  return new THREE.Points(geo, material(shaders.dustVertex, shaders.dustFragment, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
}
const dust = makeDust(16500);
diskSystem.add(dust);

// 破碎的天文仪：分段挤出的金属圆弧、细密刻度与悬浮石片。
scene.add(new THREE.AmbientLight('#b1b9c9', 1.2));
const keyLight = new THREE.PointLight('#ffc489', 110, 40, 1.5);
keyLight.position.set(-3, 5, 5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight('#7c9eae', 3);
rimLight.position.set(4, 5, -7);
scene.add(rimLight);
const fillLight = new THREE.PointLight('#e8b26c', 55, 30, 1.5);
fillLight.position.set(1, -3, 1);
scene.add(fillLight);

const relicMaterial = new THREE.MeshStandardMaterial({ color: '#45423c', metalness: .82, roughness: .36, emissive: '#5d4023', emissiveIntensity: .055 });
const rimMaterial = new THREE.MeshBasicMaterial({ color: '#99784a', transparent: true, opacity: .55 });
const luminousMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color('#f2c589').multiplyScalar(1.4), transparent: true, opacity: .75 });
const relic = new THREE.Group();
relic.rotation.set(.38, -.26, -.35);
scene.add(relic);
function arcGeometry(radius, width, start, length, depth = .055) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, start, start + length, false);
  shape.absarc(0, 0, radius - width, start + length, start, true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { steps: 1, depth, bevelEnabled: true, bevelSegments: 1, bevelSize: .014, bevelThickness: .012, curveSegments: 90 });
}
const arcSegments = [];
for (let i = 0; i < 7; i++) {
  const start = i / 7 * Math.PI * 2 + .055;
  const length = Math.PI * 2 / 7 - .16 - random() * .10;
  const group = new THREE.Group();
  const arc = new THREE.Mesh(arcGeometry(6.85, .145, start, length, .09), relicMaterial);
  group.add(arc);
  group.add(new THREE.Mesh(arcGeometry(6.88, .012, start, length, .004), luminousMaterial));
  group.add(new THREE.Mesh(arcGeometry(6.62, .009, start + .02, length - .04, .004), rimMaterial));
  group.position.z = (random() - .5) * .45;
  group.rotation.x = (random() - .5) * .04;
  relic.add(group);
  arcSegments.push({ group, base: group.position.z, phase: random() * 6.28 });
}

const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), rimMaterial, 240);
const dummy = new THREE.Object3D();
for (let i = 0; i < 240; i++) {
  const a = i / 240 * Math.PI * 2;
  const major = i % 10 === 0;
  const r = major ? 7.075 : 7.02;
  dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, .05);
  dummy.rotation.z = a;
  dummy.scale.set(major ? .19 : .065, major ? .014 : .008, .012);
  dummy.updateMatrix();ticks.setMatrixAt(i, dummy.matrix);
}
relic.add(ticks);
const orbit = new THREE.Group();
orbit.rotation.set(-.5, .5, .7);
scene.add(orbit);
for (let i = 0; i < 3; i++) {
  const start = i * 2.2;
  orbit.add(new THREE.Mesh(arcGeometry(7.7, .012, start, 1.65, .005), rimMaterial));
}

const fragments = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), relicMaterial, 180);
const fragmentInfo = [];
for (let i = 0; i < 180; i++) {
  const a = random() * Math.PI * 2;
  const r = 7 + random() * 5;
  fragmentInfo.push({ a, r, y: (random() - .5) * 4.5, scale: .025 + Math.pow(random(), 3) * .19, phase: random() * 6.28 });
}
scene.add(fragments);
const farRing = new THREE.Mesh(new THREE.TorusGeometry(10.5, .006, 3, 240, Math.PI * 1.25), rimMaterial);
farRing.rotation.set(1.1, -.3, .9);
scene.add(farRing);

// 引力脉冲是可重复的空间事件，会影响盘面、碎片与合成声音。
const waves = [];
for (let i = 0; i < 3; i++) {
  const wave = new THREE.Mesh(new THREE.RingGeometry(.98, 1, 192), new THREE.MeshBasicMaterial({
    color: '#e9c797', transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(wave);waves.push(wave);
}
const audio = new AmbientAudio();
let pulseStart = -100;
let journeyStart = -100;
let cameraTween = null;
let interactionTimeout;
let toastTimeout;

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
}
function pulse() {
  pulseStart = performance.now() / 1000;
  audio.pulse();
  toast('引力涟漪，正在穿过你。');
}
function selectEpoch(index, notify = true) {
  state.epoch = index;
  const epoch = epochs[index];
  document.querySelectorAll('[data-epoch]').forEach((button) => {
    const active = Number(button.dataset.epoch) === index;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#age').innerHTML = epoch.age;
  $('#temperature').innerHTML = epoch.temp + '<small>K</small>';
  $('#caption-index').textContent = `0${index + 1} / 03`;
  $('#caption').textContent = epoch.caption;
  $('#poem').innerHTML = epoch.poem;
  $('#curvature').innerHTML = index === 1 ? '∞<small>无限</small>' : index === 0 ? '0.97<small>临界</small>' : '0.01<small>新生</small>';
  document.documentElement.style.setProperty('--gold', index === 2 ? '#9acbd0' : '#d9b68a');
  audio.setEpoch(index);
  if (notify) toast(['第一纪元 · 最后的恒星', '第二纪元 · 时间的尽头', '第三纪元 · 另一个黎明'][index]);
}
function refreshTimeUI() {
  const value = state.paused ? 0 : state.rate;
  $('#rate-label').textContent = `${value.toFixed(1)} ×`;
  $('#pause').setAttribute('aria-pressed', String(state.paused));
  $('#pause').setAttribute('aria-label', state.paused ? '继续时间' : '冻结时间');
  $('#pause').innerHTML = state.paused ? '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="m5 3 8 5-8 5z"/></svg>' : '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 3h2v10H4zm6 0h2v10h-2z"/></svg>';
  audio.setRate(value);
}
function togglePause() {
  state.paused = !state.paused;
  if (!state.paused && state.rate === 0) {
    state.rate = 1; $('#time-rate').value = '1';
  }
  refreshTimeUI();
  toast(state.paused ? '此刻，时间为你停留。' : '时间，继续流淌。');
}
function startCameraTween(position, duration = 2) {
  cameraTween = { from: camera.position.clone(), to: position.clone(), start: performance.now() / 1000, duration };
}
function resetView(notify = true) {
  state.journey = false;
  document.body.classList.remove('journey-active', 'clean-ui');
  controls.minDistance = 8.5;
  controls.enabled = true;
  controls.target.set(0, 0, 0);
  startCameraTween(homePosition);
  $('#journey').disabled = false;
  if (notify) toast('回到最后的观测站。');
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { toast('当前窗口暂不支持全屏，可使用浏览器全屏模式。'); }
}

document.querySelectorAll('[data-epoch]').forEach((button) => button.addEventListener('click', () => selectEpoch(Number(button.dataset.epoch))));
$('#time-rate').addEventListener('input', (event) => {
  state.rate = Number(event.target.value);state.paused = state.rate === 0;
  const pct = (state.rate + 2) * 25;
  const start = Math.min(pct, 50), end = Math.max(pct, 50);
  event.target.style.background = `linear-gradient(90deg,#615a4b ${start}%,var(--gold) ${start}%,var(--gold) ${end}%,#615a4b ${end}%)`;
  refreshTimeUI();
});
$('#pause').addEventListener('click', togglePause);
$('#reset').addEventListener('click', () => resetView());
$('.brand').addEventListener('click', (event) => { event.preventDefault();resetView(); });
$('#fullscreen').addEventListener('click', fullscreen);
$('#sound').addEventListener('click', async () => {
  try {
    state.sound = await audio.toggle();
    $('#sound').setAttribute('aria-pressed', String(state.sound));
    $('#sound').setAttribute('aria-label', state.sound ? '关闭环境音' : '开启环境音');
    $('.sound-label').textContent = state.sound ? '声音开启' : '声音关闭';
    toast(state.sound ? '戴上耳机，聆听宇宙的余音。' : '宇宙重归寂静。');
  } catch { toast('声音暂不可用，请检查浏览器的音频权限。'); }
});
const dialog = $('#about-dialog');
$('#about').addEventListener('click', () => dialog.showModal());
$('#close-about').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) { const b = dialog.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close(); } });
$('#capture').addEventListener('click', () => {
  composer.render();
  canvas.toBlob((blob) => {
    if (!blob) { toast('画面保存失败，请稍后重试。');return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `时间的尽头-${['恒星', '永恒', '黎明'][state.epoch]}-${new Date().toISOString().replaceAll(':', '-').slice(0, 19)}.png`;
    link.href = url;link.click();setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('已留住这一瞬间。');
  }, 'image/png');
});
$('#journey').addEventListener('click', () => {
  state.journey = true;
  journeyStart = performance.now() / 1000;
  cameraTween = null;
  controls.enabled = false;
  $('#journey').disabled = true;
  document.body.classList.add('journey-active');
  pulseStart = journeyStart;
  audio.pulse();
});
canvas.addEventListener('dblclick', pulse);
controls.addEventListener('start', () => {
  cameraTween = null;
  $('#interaction-hint').style.opacity = '.25';
  clearTimeout(interactionTimeout);
});
controls.addEventListener('end', () => {
  interactionTimeout = setTimeout(() => { $('#interaction-hint').style.opacity = ''; }, 2500);
});
document.addEventListener('keydown', (event) => {
  if (dialog.open || event.target.matches('input, textarea, select') || event.target.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === ' ' && event.target.matches('button, a')) return;
  if (key === ' ') { event.preventDefault();togglePause(); }
  if (key === 'r' || key === 'escape') resetView();
  if (key === 'g') pulse();
  if (key === 'h') { document.body.classList.toggle('clean-ui');toast(document.body.classList.contains('clean-ui') ? '纯净观测 · 按 H 恢复界面' : '观测界面已恢复'); }
  if (key === 'f') fullscreen();
  if (['1', '2', '3'].includes(key)) selectEpoch(Number(key) - 1);
});

function resize() {
  camera.aspect = innerWidth / innerHeight;
  // 偏移视锥而非天体，既保留海报构图，也让环绕始终以奇点为中心。
  camera.setViewOffset(innerWidth, innerHeight, -innerWidth * (mobile() ? .09 : .105), mobile() ? -innerHeight * .025 : 0, innerWidth, innerHeight);
  camera.fov = mobile() ? 66 : 43;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  uniforms.uPixelRatio.value = renderer.getPixelRatio();
}
window.addEventListener('resize', resize);
canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault();$('#fallback').hidden = false; });
canvas.addEventListener('webglcontextrestored', () => location.reload());
resize();
refreshTimeUI();

const targetColor = new THREE.Color();
const targetSecondary = new THREE.Color();
const tempVector = new THREE.Vector3();
const projectedCenter = new THREE.Vector3();
const projectedEdge = new THREE.Vector3();
let lastTime = performance.now() / 1000;
let fpsStart = lastTime;
let fpsFrames = 0;
function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) { lastTime = performance.now() / 1000;return; }
  const now = performance.now() / 1000;
  const delta = Math.min(now - lastTime, .075);
  lastTime = now;
  if (!state.paused) state.time += delta * state.rate;
  const t = state.time;
  uniforms.uTime.value = t;
  const blend = 1 - Math.exp(-delta * 1.7);
  targetColor.set(epochs[state.epoch].color);
  targetSecondary.set(epochs[state.epoch].secondary);
  uniforms.uColor.value.lerp(targetColor, blend);
  uniforms.uSecondary.value.lerp(targetSecondary, blend);
  uniforms.uEpoch.value = THREE.MathUtils.lerp(uniforms.uEpoch.value, state.epoch, blend);
  bloom.strength = THREE.MathUtils.lerp(bloom.strength, epochs[state.epoch].bloom * .72, blend);
  keyLight.color.copy(uniforms.uSecondary.value);
  fillLight.color.copy(uniforms.uColor.value);
  luminousMaterial.color.copy(uniforms.uColor.value).multiplyScalar(1.2);

  const pulseAge = now - pulseStart;
  state.pulse = pulseAge > 0 && pulseAge < 5 ? Math.exp(-pulseAge * .8) * Math.sin(Math.min(pulseAge * 2, Math.PI)) : 0;
  uniforms.uPulse.value = Math.max(0, state.pulse);
  for (let i = 0; i < waves.length; i++) {
    const age = pulseAge - i * .33;
    const wave = waves[i];
    wave.visible = age > 0 && age < 4;
    if (wave.visible) {
      wave.quaternion.copy(camera.quaternion);
      wave.scale.setScalar(2.3 + age * 5.5);
      wave.material.opacity = Math.max(0, .25 * (1 - age / 4));
      wave.material.color.copy(uniforms.uSecondary.value);
    }
  }
  halo.quaternion.copy(camera.quaternion);
  tempVector.copy(camera.position).normalize().multiplyScalar(.3);
  halo.position.copy(tempVector);
  core.rotation.y = t * .025;
  relic.rotation.z = -.35 + t * .009;
  relic.rotation.y = -.26 + Math.sin(t * .045) * .06;
  orbit.rotation.z = .7 - t * .012;
  farRing.rotation.z = .9 + t * .003;
  stars.rotation.y = t * .0004;
  for (const segment of arcSegments) segment.group.position.z = segment.base + Math.sin(t * .2 + segment.phase) * .07;
  for (let i = 0; i < fragmentInfo.length; i++) {
    const f = fragmentInfo[i];
    const a = f.a + t * .012 / (f.r * .1);
    const radius = f.r * (1 + state.pulse * .07);
    dummy.position.set(Math.cos(a) * radius, f.y + Math.sin(f.phase + t * .15) * .15, Math.sin(a) * radius * .5);
    dummy.rotation.set(f.phase + t * .06, a, t * .03 + f.phase);
    dummy.scale.set(f.scale, f.scale * 1.6, f.scale * .65);
    dummy.updateMatrix();fragments.setMatrixAt(i, dummy.matrix);
  }
  fragments.instanceMatrix.needsUpdate = true;

  if (cameraTween) {
    const progress = Math.min((now - cameraTween.start) / cameraTween.duration, 1);
    const ease = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(cameraTween.from, cameraTween.to, ease);
    if (progress === 1) cameraTween = null;
  }
  if (state.journey) {
    const age = now - journeyStart;
    if (age < 5) {
      const p = Math.min(age / 5, 1);
      const distance = THREE.MathUtils.lerp(23.5, 3.1, p * p);
      const a = age * .11;
      camera.position.set(Math.sin(a) * distance * .5, (1 - p) * 5.9 + .35, Math.cos(a) * distance);
      camera.lookAt(0, 0, 0);
      $('#flash').style.opacity = String(Math.max(0, (p - .86) / .14));
    } else if (age < 5.15) {
      selectEpoch((state.epoch + 1) % 3, false);
      state.journey = false;
      camera.position.set(-2, 2.5, 10);
      $('#flash').style.opacity = '0';
      document.body.classList.remove('journey-active');
      controls.enabled = true;
      $('#journey').disabled = false;
      startCameraTween(homePosition, 3);
      toast('你穿过了终点。欢迎来到另一段时间。');
    } else {
      // 标签页切换、断点或系统休眠后仍能安全完成旅程。
      selectEpoch((state.epoch + 1) % 3, false);
      $('#flash').style.opacity = '0';
      resetView(false);
    }
  }
  if (!state.journey) controls.update();
  camera.updateMatrixWorld();
  projectedCenter.set(0, 0, 0).project(camera);
  projectedEdge.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(2.17).project(camera);
  lensPass.uniforms.uCenter.value.set(projectedCenter.x * .5 + .5, projectedCenter.y * .5 + .5);
  lensPass.uniforms.uRadius.value = Math.abs(projectedEdge.x - projectedCenter.x) * .5 * camera.aspect;
  lensPass.uniforms.uAspect.value = camera.aspect;
  lensPass.uniforms.uDark.value = Math.max(0, 1 - Math.abs(uniforms.uEpoch.value - 1) * 1.4);
  renderer.info.reset();
  composer.render();
  state.frames++;
  fpsFrames++;
  if (now - fpsStart > 1.5) {
    state.fps = Math.round(fpsFrames / (now - fpsStart));
    fpsFrames = 0;fpsStart = now;
    if (state.frames > 120 && state.fps < 28 && renderer.getPixelRatio() > 1) {
      renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - .25));
      composer.setPixelRatio(renderer.getPixelRatio());resize();
    }
  }
  if (!state.ready && state.frames >= 3) {
    state.ready = true;
    $('#loading').classList.add('loaded');
    document.documentElement.dataset.ready = 'true';
  }
}
animate();

// 为作品的浏览器验收暴露只读快照，所有操作仍通过真实界面完成。
window.__universe = {
  getState: () => ({ ...state, camera: camera.position.toArray(), target: controls.target.toArray(), pixelRatio: renderer.getPixelRatio(), drawCalls: renderer.info.render.calls, geometries: renderer.info.memory.geometries, webgl: renderer.capabilities.isWebGL2 ? 2 : 1, audio: audio.getState() }),
};
