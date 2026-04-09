import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        timeout: 60000,  // ✨ 增加超时时间到60秒（RAG处理可能需要10-20秒）
        proxyTimeout: 60000  // 代理超时也设置为60秒
      }
    }
  }
});
