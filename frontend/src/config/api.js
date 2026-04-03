// API配置文件
const API_CONFIG = {
  // 开发环境
  development: 'http://localhost:3000',
  // 生产环境
  production: 'http://your-production-server.com',
  // 当前环境
  current: process.env.NODE_ENV || 'development'
};

// 导出API基础URL
export const API_BASE_URL = API_CONFIG[API_CONFIG.current];
