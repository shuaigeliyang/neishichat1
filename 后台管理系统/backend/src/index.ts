import { createApp } from './app'
import config = require('./config/index')

const app = createApp()

const server = app.listen(config.port, () => {
  console.log(`🚀 Server is running on port ${config.port}`)
  console.log(`📊 Environment: ${config.nodeEnv}`)
  console.log(`🔗 API URL: http://localhost:${config.port}`)
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})
