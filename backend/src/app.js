/**
 * 应用程序入口文件
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// 创建Express应用
const app = express();

// 信任代理
app.set('trust proxy', 1);

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/guest', require('./routes/guest')); // 访客聊天路由（新增！）
app.use('/api/students', require('./routes/students'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/grades', require('./routes/grades'));
app.use('/api/regulations', require('./routes/regulations'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/export', require('./routes/export'));
app.use('/api/intelligent', require('./routes/intelligent')); // 智能查询路由（新）
app.use('/api/rag', require('./routes/rag')); // RAG文档问答路由（单文档版本）
app.use('/api/rag-v2', require('./routes/ragV2')); // RAG文档问答路由（多文档版本 ✨新增）
app.use('/api/handbook', require('./routes/handbook')); // 学生手册查询路由（新增！）
app.use('/api/documents', require('./routes/documents')); // 文档管理路由（多政策系统新增！）

// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  logger.info(`🎉 服务器启动成功！`, {
    host: HOST,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    url: `http://${HOST}:${PORT}`
  });
  console.log(`\n========================================`);
  console.log(`  学生教育系统智能体 - 后端服务`);
  console.log(`  作者：内师智能体系统 (￣▽￣)ﾉ`);
  console.log(`========================================`);
  console.log(`  服务地址：http://${HOST}:${PORT}`);
  console.log(`  健康检查：http://${HOST}:${PORT}/health`);
  console.log(`  环境：${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================\n`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

module.exports = app;
