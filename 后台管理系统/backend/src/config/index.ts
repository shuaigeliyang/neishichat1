import dotenv = require('dotenv')
import path = require('path')
import * as process from 'process'

dotenv.config()

export = {
  port: parseInt(process.env.PORT || '3005', 10),  // ✨ 后台管理系统后端端口：3005
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    name: process.env.DB_NAME || 'education_system',
  },
  mainApi: {
    url: process.env.MAIN_API_URL || 'http://localhost:3000',
  },
  upload: {
    dir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || '../uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },
  knowledgeBase: {
    dir: path.resolve(__dirname, '../../', '..'),
  },
}
