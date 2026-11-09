# 时间的尽头 · 交互式 3D 网页（源码）

《时间的尽头》的可玩版本：一座在浏览器里实时演算的末日观测站，三个纪元、五秒穿越、程序化环境音。

线上体验：<https://208202.xyz/end-of-time/>

创作过程、提示词与文案：[时间的尽头 · 提示词全记录](https://208202.xyz/2026/11/09/时间的尽头-提示词全记录/)

## 技术栈

- **Three.js `0.180.0`** —— 场景、实例化几何、后期处理
- **GLSL（`src/shaders.js`）** —— 噪声星云、吸积盘、引力偏折、辉光
- **Web Audio（`src/sound.js`）** —— 实时合成五声部低频环境音
- **Vite `6.4.1`** —— 开发服务器与构建
- 无图片、无字体、无模型、无音频素材：所有画面与声音都是算出来的

## 目录结构

```
end-of-time-src/
├── index.html          # 页面骨架与 HUD 结构
├── src/
│   ├── main.js         # 场景装配、相机控制、纪元切换、穿越旅程、交互
│   ├── shaders.js      # 全部 GLSL：星云 / 吸积盘 / 光子环 / 辉光
│   ├── sound.js        # Web Audio 程序化环境音
│   └── style.css       # HUD 与响应式排版
├── public/             # 静态资源（favicon）
├── vite.config.js      # base: '/end-of-time/'
├── server.mjs          # 零依赖静态服务器，用于本地预览产物
└── package.json
```

约 990 行手写代码。

## 本地运行

```bash
npm ci            # 安装依赖（three / vite / playwright）
npm run dev       # 开发服务器 http://localhost:5173
npm run build     # 产物输出到 dist/
npm start         # 用 server.mjs 托管 dist，http://localhost:3000
```

`npm run build` 会读 `vite.config.js` 里的 `base: '/end-of-time/'`，所以产物必须挂在站点的 `/end-of-time/` 路径下才能正常加载资源。

## 与博客的关系

这个目录是**源码**，博客仓库里的 `source/end-of-time/` 是**构建产物**（`dist/` 的拷贝）。发布流程：

```
npm run build  →  dist/  →  复制 7 个文件到 ../source/end-of-time/  →  Hexo 构建  →  master 的 /end-of-time/
```

产物带 hashed 文件名，旧 bundle 会保留一轮，避免 CDN 缓存期内引用 404。

## 已知

- `npm test` 指向 `tests/browser.cjs`（当时用于 32 项浏览器验收），该目录未随仓库提供，选题时请忽略这个脚本。
- 作品是艺术想象：宇宙年龄、温度与曲率属于叙事设定，引力透镜是视觉近似，不是广义相对论的数值模拟。

## 许可

源码可自由阅读、学习与改写。图像与文案为 AI 辅助生成，提示词见上文链接，可自由取用。
