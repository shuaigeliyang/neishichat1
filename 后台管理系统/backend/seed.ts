/**
 * 创建默认管理员账号
 * 运行: node --import tsx seed.ts
 */
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'education_system',
  })

  try {
    // 创建管理员表（如果不存在）
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'superadmin') DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('[OK] admin_users 表已创建')

    // 生成密码哈希
    const passwordHash = await bcrypt.hash('admin123', 10)
    console.log('[INFO] 密码 admin123 的哈希:', passwordHash)

    // 插入默认管理员
    try {
      await pool.execute(
        'INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)',
        ['admin', passwordHash, 'superadmin']
      )
      console.log('[OK] 默认管理员账号已创建')
      console.log('  - 用户名: admin')
      console.log('  - 密码: admin123')
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log('[INFO] 管理员账号已存在')
      } else {
        throw err
      }
    }

    console.log('\n[完成] 种子数据初始化完成')
  } catch (error) {
    console.error('[错误]', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
