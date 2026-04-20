import { createApp } from './app.ts'
import config from './config/index.js'
import { testConnection } from './utils/db.js'

async function main() {
  // 测试数据库连接
  const dbConnected = await testConnection()
  if (!dbConnected) {
    console.error('[ERROR] Cannot connect to database. Please check your configuration.')
    process.exit(1)
  }

  const app = createApp()

  const server = app.listen(config.port, () => {
    console.log(`======================================`)
    console.log(`  教育系统后台管理 - 后端服务`)
    console.log(`======================================`)
    console.log(`  端口: ${config.port}`)
    console.log(`  环境: ${config.nodeEnv}`)
    console.log(`  API: http://localhost:${config.port}/api`)
    console.log(`======================================`)
  })

  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down...')
    server.close(() => {
      console.log('[Server] HTTP server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('[Server] SIGINT received, shutting down...')
    server.close(() => {
      console.log('[Server] HTTP server closed')
      process.exit(0)
    })
  })
}

main().catch((err) => {
  console.error('[Server] Failed to start:', err)
  process.exit(1)
})
