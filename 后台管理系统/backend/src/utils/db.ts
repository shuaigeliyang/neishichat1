import mysql from 'mysql2/promise'
import config from '../config/index.js'

// 创建连接池
const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function executeQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params)
  return rows as T[]
}

export async function executeOne<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  const rows = await executeQuery<T>(sql, params)
  return rows[0]
}

export async function executeUpdate(sql: string, params: any[] = []): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params)
  return result as mysql.ResultSetHeader
}

export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection()
    await connection.ping()
    connection.release()
    console.log('[DB] MySQL connection established')
    return true
  } catch (error) {
    console.error('[DB] MySQL connection failed:', error)
    return false
  }
}

export default pool
