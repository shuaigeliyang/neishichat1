import express from 'express'
import cors from 'cors'
import config from './config/index.js'
import apiRoutes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  // 中间件
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // API路由
  app.use('/api', apiRoutes)

  // 错误处理
  app.use(errorHandler)

  return app
}
