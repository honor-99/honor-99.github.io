import { defineConfig } from 'vite';

export default defineConfig({
  // 部署到博客子目录 https://208202.xyz/end-of-time/
  base: '/end-of-time/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/build/three.core.js')) return 'three-core';
          if (id.includes('node_modules/three/build/')) return 'three-renderer';
          if (id.includes('node_modules/three/src/')) return 'three-core';
          if (id.includes('node_modules/three/examples/')) return 'three-effects';
        },
      },
    },
  },
});
