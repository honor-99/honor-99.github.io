/**
 * 心动 · Heartbeat — a three.js particle heart
 * 粒子爱心: Taubin 隐式曲面 rejection sampling + 自定义 GLSL 点精灵
 * 心跳: 双峰(lub-dub)包络驱动缩放 / 发光 / 火花;单击进入"心动加速"状态
 * 无构建、无外部依赖(three.js 已自托管),所有动态均 GPU 计算
 */
import * as THREE from './three.module.min.js';

/* ------------------------------------------------------------------ */
/* 环境与性能档位                                                       */
/* ------------------------------------------------------------------ */
const isMobile = matchMedia('(max-width: 768px)').matches
  || /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const CFG = {
  heartParticles: isMobile ? 26000 : 48000, // 心体粒子数
  embers: isMobile ? 320 : 640,              // 上升余烬
  sparks: isMobile ? 420 : 920,              // 火花池(复用)
  stars: isMobile ? 900 : 1600,              // 背景星尘
  dpr: Math.min(devicePixelRatio || 1, isMobile ? 1.8 : 2),
  baseCycle: 1.22,   // 静息心跳周期(秒)
  fastCycle: 0.62,   // 最兴奋时的周期
};

const canvas = document.getElementById('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
} catch (e) {
  document.getElementById('fallback').style.display = 'grid';
  throw e;
}
renderer.setPixelRatio(CFG.dpr);
renderer.setClearColor(0x0a0508, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);

/* ------------------------------------------------------------------ */
/* 随机数(带种子,保证每次加载形态一致)                                  */
/* ------------------------------------------------------------------ */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* 配色系统                                                             */
/* ------------------------------------------------------------------ */
const PALETTES = [
  { name: '绯红',   A: '#6e0f2c', B: '#ff2e5f', C: '#ffd9a3', glow: '#ff2450', hi: '#ff5e86', lo: '#8a1030' },
  { name: '玫瑰金', A: '#58143c', B: '#ff6b9d', C: '#ffe3b8', glow: '#ff4d86', hi: '#ff8fb4', lo: '#7c1a52' },
  { name: '落日',   A: '#54180a', B: '#ff8a3d', C: '#ffe9a3', glow: '#ff7a2e', hi: '#ffb066', lo: '#8a3a12' },
  { name: '极光',   A: '#07294d', B: '#37e6ff', C: '#c9ffdf', glow: '#21d4ff', hi: '#7deeff', lo: '#0a5a86' },
];
let paletteIdx = 0;
const palCur = {
  A: new THREE.Color(PALETTES[0].A),
  B: new THREE.Color(PALETTES[0].B),
  C: new THREE.Color(PALETTES[0].C),
};
function applyPaletteCSS(p, immediate) {
  const root = document.documentElement.style;
  root.setProperty('--pulse', hexToRgba(p.glow, 0.20));
  root.setProperty('--c-hi', p.hi);
  root.setProperty('--c-lo', p.lo);
}
function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
applyPaletteCSS(PALETTES[0], true);

/* ------------------------------------------------------------------ */
/* 共享 uniforms                                                        */
/* ------------------------------------------------------------------ */
const shared = {
  uTime:    { value: 0 },
  uBeat:    { value: 0 },
  uScale:   { value: 1 },  // 世界尺寸→像素换算: px = worldSize * uScale / dist
};

function updateScale() {
  const h = renderer.domElement.height; // 物理像素高
  shared.uScale.value = (h * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
}

/* ------------------------------------------------------------------ */
/* 心体: Taubin 隐式曲面 (x²+9/4y²+z²−1)³ − x²z³ − 9/80·y²z³ = 0        */
/* 公式坐标 z 为竖直方向(x-z 为正脸平面,y 为厚度方向)                    */
/* ------------------------------------------------------------------ */
function buildHeartGeometry(count) {
  const f = (x, y, z) => {
    const a = x * x + 2.25 * y * y + z * z - 1;
    return a * a * a - (x * x + 0.1125 * y * y) * z * z * z;
  };
  const rnd = mulberry32(20261115);
  const S = 1.22; // 整体缩放
  const wantShell = Math.round(count * 0.74);
  const wantCore = count - wantShell;
  const pos = new Float32Array(count * 3);
  const rand = new Float32Array(count);
  const shell = new Float32Array(count);
  let nShell = 0, nCore = 0, guard = count * 90;
  while ((nShell < wantShell || nCore < wantCore) && guard-- > 0) {
    const x = (rnd() * 2 - 1) * 1.42;
    const y = (rnd() * 2 - 1) * 0.92;
    const z = (rnd() * 2 - 1) * 1.32 + 0.05;
    const v = f(x, y, z);
    if (Math.abs(v) < 0.05 && nShell < wantShell) {
      // 壳层粒子:映射到场景坐标 (x→横, z→竖, −y→深度)
      const i = nShell + nCore;
      pos[i * 3] = x * S;
      pos[i * 3 + 1] = z * S;
      pos[i * 3 + 2] = -y * S;
      rand[i] = rnd(); shell[i] = 1;
      nShell++;
    } else if (v < 0 && rnd() < 0.085 && nCore < wantCore) {
      const i = nShell + nCore;
      pos[i * 3] = x * S;
      pos[i * 3 + 1] = z * S;
      pos[i * 3 + 2] = -y * S;
      rand[i] = rnd(); shell[i] = 0;
      nCore++;
    }
  }
  const total = nShell + nCore;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, total * 3), 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand.subarray(0, total), 1));
  geo.setAttribute('aShell', new THREE.BufferAttribute(shell.subarray(0, total), 1));
  return { geo, shellPoints: pos.subarray(0, total * 3), shellCount: nShell };
}

const heart = buildHeartGeometry(CFG.heartParticles);
const heartGeo = heart.geo;

const heartMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: shared.uTime,
    uBeat: shared.uBeat,
    uScale: shared.uScale,
    uColA: { value: palCur.A },
    uColB: { value: palCur.B },
    uColC: { value: palCur.C },
    uWobble: { value: reduceMotion ? 0.004 : 0.013 },
  },
  vertexShader: /* glsl */`
    attribute float aRand;
    attribute float aShell;
    uniform float uTime, uBeat, uScale, uWobble;
    varying float vGlow, vShell, vRand, vH;
    void main() {
      vec3 p = position;
      // 微颤:每颗粒子按自己的相位轻呼吸
      float w = sin(uTime * (0.55 + aRand * 1.4) + aRand * 6.2831);
      p += uWobble * w * vec3(
        sin(aRand * 61.0 + uTime),
        cos(aRand * 47.0 + uTime * 1.3),
        sin(aRand * 83.0 - uTime * 0.9)
      );
      // 心跳:壳层比内核膨胀得更多,像血液涌向表面
      vec3 dir = position / max(0.0001, length(position));
      p += dir * uBeat * (0.055 + 0.105 * aShell);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      // 闪烁
      float tw = 0.72 + 0.28 * sin(uTime * (1.8 + 4.2 * fract(aRand * 7.31)) + aRand * 40.0);
      vGlow = (0.30 + uBeat * (0.55 + 0.45 * aShell)) * tw;
      vShell = aShell;
      vRand = aRand;
      vH = clamp(position.y * 0.5 + 0.55, 0.0, 1.0);
      float size = (0.0062 + 0.0095 * aShell * fract(aRand * 3.7)) * (0.75 + 0.5 * tw) * (1.0 + 0.9 * uBeat * aShell);
      gl_PointSize = size * uScale / max(0.15, -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `,
    fragmentShader: /* glsl */`
      uniform vec3 uColA, uColB, uColC;
      uniform float uTime;
      varying float vGlow, vShell, vRand, vH;
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float d = dot(uv, uv);
        if (d > 1.0) discard;
        float core = exp(-d * 6.5);
        float halo = exp(-d * 2.0) * 0.32;
        // 基色:深绛红 → 主色,沿高度带一点冷暖偏移
        vec3 col = mix(uColA, uColB, vRand * 0.55 + 0.45 * vH);
        // 心跳峰值时壳层高光泛出暖金
        col = mix(col, uColC, clamp(vGlow * 1.15 - 0.42, 0.0, 1.0) * vShell);
        float alpha = (core + halo) * (0.30 + 0.62 * vGlow) * (0.34 + 0.66 * vShell);
        gl_FragColor = vec4(col * (0.6 + vGlow * 1.35), alpha);
      }
    `,
  });
  const heartPoints = new THREE.Points(heartGeo, heartMat);
scene.add(heartPoints);

/* ------------------------------------------------------------------ */
/* 余烬:绕心缓缓上升的暖色尘埃,全程序化,GPU 计算                       */
/* ------------------------------------------------------------------ */
function buildEmbers(count) {
  const rnd = mulberry32(998877);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = rnd();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); // 占位,真实位置在 shader 里算
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: shared.uTime,
      uBeat: shared.uBeat,
      uScale: shared.uScale,
      uColB: { value: palCur.B },
      uColC: { value: palCur.C },
    },
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime, uBeat, uScale;
      varying float vA, vHot;
      void main() {
        float speed = 0.10 + aSeed * 0.10;
        float t = fract(uTime * speed + aSeed * 7.0);
        float y = mix(-2.3, 2.9, t);
        float ang = aSeed * 6.2831 + uTime * (0.16 + aSeed * 0.12);
        float r = 1.35 + 0.55 * sin(aSeed * 40.0) + t * 0.42;
        vec3 p = vec3(cos(ang) * r, y + 0.18 * sin(uTime * 1.7 + aSeed * 50.0), sin(ang) * r * 0.72 - 0.25);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(0.62, 1.0, t));
        vHot = aSeed;
        float size = 0.034 * (0.6 + 0.8 * aSeed) * (1.0 + 0.7 * uBeat);
        gl_PointSize = size * uScale / max(0.15, -mv.z) * vA;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColB, uColC;
      varying float vA, vHot;
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float d = dot(uv, uv);
        if (d > 1.0) discard;
        float core = exp(-d * 5.0);
        vec3 col = mix(uColB, uColC, step(0.6, vHot));
        gl_FragColor = vec4(col, core * vA * 0.5);
      }
    `,
  });
  return new THREE.Points(geo, mat);
}
const embers = buildEmbers(CFG.embers);
scene.add(embers);

/* ------------------------------------------------------------------ */
/* 背景星尘                                                             */
/* ------------------------------------------------------------------ */
function buildStars(count) {
  const rnd = mulberry32(424242);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // 大球壳上均匀分布
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2;
    const r = 9 + rnd() * 9;
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(th);
    pos[i * 3 + 1] = r * u;
    pos[i * 3 + 2] = r * s * Math.sin(th);
    seed[i] = rnd();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: shared.uTime, uScale: shared.uScale },
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime, uScale;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 2.2) + aSeed * 90.0), 3.0);
        gl_PointSize = (0.016 + 0.02 * aSeed) * uScale / max(0.15, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float d = dot(uv, uv);
        if (d > 1.0) discard;
        gl_FragColor = vec4(vec3(0.92, 0.88, 0.95), exp(-d * 4.5) * vA * 0.5);
      }
    `,
  });
  return new THREE.Points(geo, mat);
}
const stars = buildStars(CFG.stars);
scene.add(stars);

/* ------------------------------------------------------------------ */
/* 火花池:心跳峰值 & 单击时从心壳喷出                                   */
/* ------------------------------------------------------------------ */
const sparkPool = (() => {
  const M = CFG.sparks;
  const pos = new Float32Array(M * 3);
  const vel = new Float32Array(M * 3);
  const life = new Float32Array(M);   // 剩余寿命
  const maxLife = new Float32Array(M);
  const seed = new Float32Array(M);
  const rnd = mulberry32(777);
  for (let i = 0; i < M; i++) seed[i] = rnd();
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  const lifeAttr = new THREE.BufferAttribute(life, 1);
  lifeAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aLife', lifeAttr);
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uScale: shared.uScale,
      uColC: { value: palCur.C },
      uColB: { value: palCur.B },
    },
    vertexShader: /* glsl */`
      attribute float aLife, aSeed;
      uniform float uScale;
      varying float vA, vSeed;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = clamp(aLife * 1.6, 0.0, 1.0);
        vSeed = aSeed;
        float size = (0.016 + 0.02 * aSeed) * vA;
        gl_PointSize = size * uScale / max(0.15, -mv.z) * step(0.001, aLife);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColC, uColB;
      varying float vA, vSeed;
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float d = dot(uv, uv);
        if (d > 1.0) discard;
        float core = exp(-d * 5.5);
        vec3 col = mix(uColB, uColC, vSeed);
        gl_FragColor = vec4(col * 1.4, core * vA);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let cursor = 0;
  function spawn(n, boost, white) {
    const shellN = heart.shellCount;
    const P = heart.shellPoints;
    for (let k = 0; k < n; k++) {
      const i = cursor; cursor = (cursor + 1) % M;
      // 随机挑一颗壳层粒子作为出发点,沿径向喷出
      const j = (Math.random() * shellN) | 0;
      let x = P[j * 3], y = P[j * 3 + 1], z = P[j * 3 + 2];
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      const len = Math.max(0.0001, Math.hypot(x, y, z));
      const sp = (1.1 + Math.random() * 1.3) * boost;
      vel[i * 3] = (x / len) * sp * (0.85 + Math.random() * 0.3);
      vel[i * 3 + 1] = (y / len) * sp * (0.85 + Math.random() * 0.3) + 0.35;
      vel[i * 3 + 2] = (z / len) * sp * (0.85 + Math.random() * 0.3);
      maxLife[i] = 0.7 + Math.random() * 0.8;
      life[i] = maxLife[i];
      seed[i] = white ? 1.0 : Math.random();
    }
    lifeAttr.needsUpdate = true; // 下一帧统一置位也行
  }
  function step(dt) {
    for (let i = 0; i < M; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      const damp = Math.pow(0.55, dt); // 近似空气阻力
      vel[i * 3] *= damp; vel[i * 3 + 1] = vel[i * 3 + 1] * damp - 0.55 * dt; vel[i * 3 + 2] *= damp;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  }
  return { points, spawn, step };
})();
scene.add(sparkPool.points);

/* ------------------------------------------------------------------ */
/* 心跳包络: lub-dub 双峰                                              */
/* ------------------------------------------------------------------ */
function beatEnvelope(phase) {
  // phase ∈ [0,1): 第一峰(主搏)在 0.12,第二峰(回搏)在 0.34
  const g = (c, w, h) => h * Math.exp(-((phase - c) * (phase - c)) / (2 * w * w));
  return g(0.12, 0.048, 1.0) + g(0.34, 0.056, 0.52);
}

/* ------------------------------------------------------------------ */
/* 相机控制:拖动环绕 + 滚轮/双指缩放 + 单击触发心动加速                  */
/* ------------------------------------------------------------------ */
const orbit = {
  theta: 0.35, phi: 1.42, radius: 5.4,
  tTheta: 0.35, tPhi: 1.42, tRadius: 5.4,
  autoSpin: true, lastInteract: -10,
  MIN: 3.1, MAX: 9.5,
};
let excite = 0;          // 心动程度 0..1
let loveCount = 0;
const loveEl = document.getElementById('love-n');

const pointers = new Map();
let downInfo = null;     // 单击判定
let pinchDist = 0;

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
  }
  orbit.lastInteract = clockTime;
});
canvas.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) {
    // 悬停视差
    const nx = (e.clientX / innerWidth) * 2 - 1;
    const ny = (e.clientY / innerHeight) * 2 - 1;
    parallax.setTarget(nx, ny);
    return;
  }
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    orbit.tTheta -= dx * 0.0052;
    orbit.tPhi = THREE.MathUtils.clamp(orbit.tPhi - dy * 0.0042, 0.55, Math.PI - 0.55);
    if (downInfo) downInfo.moved += Math.abs(dx) + Math.abs(dy);
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist > 0) orbit.tRadius = THREE.MathUtils.clamp(orbit.tRadius * (pinchDist / Math.max(1, d)), orbit.MIN, orbit.MAX);
    pinchDist = d;
  }
  orbit.autoSpin = false;
  orbit.lastInteract = clockTime;
});
canvas.addEventListener('pointerup', (e) => {
  pointers.delete(e.pointerId);
  if (downInfo && downInfo.moved < 8 && performance.now() - downInfo.t < 380) {
    onHeartTap();
  }
  downInfo = null;
});
canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); downInfo = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  orbit.tRadius = THREE.MathUtils.clamp(orbit.tRadius * (1 + e.deltaY * 0.0011), orbit.MIN, orbit.MAX);
  orbit.autoSpin = false;
  orbit.lastInteract = clockTime;
}, { passive: false });

function onHeartTap() {
  loveCount++;
  loveEl.textContent = String(loveCount);
  excite = Math.min(1, excite + 0.38);
  sparkPool.spawn(Math.round(120 + 160 * excite), 1.25 + 0.55 * excite, true);
  audio.thump(0.9, 74);
  loveEl.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.55)' }, { transform: 'scale(1)' }],
    { duration: 420, easing: 'cubic-bezier(.2,2.6,.4,.8)' }
  );
}

/* 悬停视差 */
const parallax = {
  x: 0, y: 0, tx: 0, ty: 0,
  setTarget(nx, ny) { this.tx = nx * 0.12; this.ty = ny * 0.08; },
};

/* ------------------------------------------------------------------ */
/* 音效:WebAudio 合成心跳,默认关闭                                      */
/* ------------------------------------------------------------------ */
const audio = {
  enabled: false, ctx: null, master: null,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  thump(vol, freq) {
    if (!this.enabled) return;
    this.ensure();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.52, t + 0.15);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.3);
  },
};
const btnAudio = document.getElementById('btn-audio');
btnAudio.addEventListener('click', () => {
  audio.enabled = !audio.enabled;
  if (audio.enabled) { audio.ensure(); audio.thump(0.8, 74); }
  btnAudio.classList.toggle('on', audio.enabled);
  btnAudio.textContent = audio.enabled ? '♪ 音效中' : '♪ 音效';
});

/* 配色切换 */
const btnPalette = document.getElementById('btn-palette');
btnPalette.addEventListener('click', () => {
  paletteIdx = (paletteIdx + 1) % PALETTES.length;
  applyPaletteCSS(PALETTES[paletteIdx]);
  btnPalette.textContent = `✦ ${PALETTES[paletteIdx].name}`;
});

/* 全屏 */
document.getElementById('btn-full').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});

/* ------------------------------------------------------------------ */
/* 尺寸 / 可见性                                                        */
/* ------------------------------------------------------------------ */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  updateScale();
}
addEventListener('resize', resize);
resize();

/* ------------------------------------------------------------------ */
/* 主循环                                                               */
/* ------------------------------------------------------------------ */
const clock = new THREE.Clock();
let clockTime = 0;
let cycleT = 0;          // 当前心跳周期相位累计(秒)
let prevPhase = 0;
let fpsAcc = 0, fpsN = 0, fpsTimer = 0;
const metaEl = document.getElementById('meta');
metaEl.textContent = `${heart.geo.attributes.position.count.toLocaleString()} particles`;

const glowEl = document.getElementById('glow');

let rafId = 0;
function frame() {
  rafId = requestAnimationFrame(frame);
  if (document.hidden) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  clockTime += dt;
  shared.uTime.value = clockTime;

  // 心动程度衰减 & 周期加速
  excite *= Math.exp(-dt / 3.2);
  const cycle = THREE.MathUtils.lerp(CFG.baseCycle, CFG.fastCycle, excite);
  cycleT += dt;
  const phase = (cycleT % cycle) / cycle;

  // 相位跨过 lub(0.10)/dub(0.34) 时触发音效与火花
  const crossed = (mark) => prevPhase < mark && phase >= mark;
  if (crossed(0.10)) {
    audio.thump(0.85, 72);
    sparkPool.spawn(Math.round(46 + 110 * excite), 0.95 + 0.7 * excite, false);
  }
  if (crossed(0.34)) audio.thump(0.5, 58);
  prevPhase = phase;

  const beat = beatEnvelope(phase);
  shared.uBeat.value = beat;

  // 相机
  if (!reduceMotion && clockTime - orbit.lastInteract > 4) orbit.autoSpin = true;
  if (orbit.autoSpin) orbit.tTheta += dt * (reduceMotion ? 0.03 : 0.085) * (1 + 0.3 * excite);
  const k = 1 - Math.exp(-dt * 5.2);
  orbit.theta += (orbit.tTheta - orbit.theta) * k;
  orbit.phi += (orbit.tPhi - orbit.phi) * k;
  orbit.radius += (orbit.tRadius - orbit.radius) * (1 - Math.exp(-dt * 4));
  parallax.x += (parallax.tx - parallax.x) * (1 - Math.exp(-dt * 3));
  parallax.y += (parallax.ty - parallax.y) * (1 - Math.exp(-dt * 3));
  const sinPhi = Math.sin(orbit.phi);
  camera.position.set(
    orbit.radius * sinPhi * Math.sin(orbit.theta) + parallax.x,
    orbit.radius * Math.cos(orbit.phi) + parallax.y + 0.15,
    orbit.radius * sinPhi * Math.cos(orbit.theta)
  );
  camera.lookAt(0, 0.05, 0);

  // 心体随节律整体呼吸
  const s = 1 + beat * 0.045;
  heartPoints.scale.setScalar(s);
  embers.material.uniforms.uBeat.value = beat;

  sparkPool.step(dt);
  stars.rotation.y += dt * 0.008;
  stars.rotation.x += dt * 0.003;

  // 配色渐变
  const tgt = PALETTES[paletteIdx];
  const kc = 1 - Math.exp(-dt * 2.6);
  palCur.A.lerp(new THREE.Color(tgt.A), kc);
  palCur.B.lerp(new THREE.Color(tgt.B), kc);
  palCur.C.lerp(new THREE.Color(tgt.C), kc);

  // 屏幕辉光跟随心跳
  glowEl.style.setProperty('--beat-o', String(0.22 + beat * 0.5));
  glowEl.style.setProperty('--beat-s', String(1 + beat * 0.035));

  // FPS 统计
  fpsAcc += dt; fpsN++; fpsTimer += dt;
  if (fpsTimer > 0.8) {
    metaEl.textContent = `${heart.geo.attributes.position.count.toLocaleString()} particles · ${Math.round(fpsN / fpsAcc)} fps`;
    fpsAcc = 0; fpsN = 0; fpsTimer = 0;
  }

  renderer.render(scene, camera);
}
frame();
document.body.classList.add('ready');

// ?shot 模式:跳过淡入过渡,便于无头截图/封面生成
if (location.search.includes('shot')) {
  document.body.style.transition = 'none';
  document.body.style.opacity = '1';
  document.getElementById('glow').style.transition = 'none';
}
