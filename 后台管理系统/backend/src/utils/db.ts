import mysql from 'mysql2/promise'
import config = require('../config/index')

let pool: mysql.Pool | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      charset: 'utf8mb4',
      timezone: '+08:00'
    })

    console.log('✅ MySQL数据库连接成功！', {
      host: config.database.host,
      database: config.database.name
    })
  }

  return pool
}

// 执行查询
export async function executeQuery<T>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const pool = getPool()
  try {
    const [rows] = await pool.execute(query, params)
    return rows as T[]
  } catch (error) {
    console.error('数据库查询错误:', error)
    throw error
  }
}

// 执行单条查询
export async function executeOne<T>(
  query: string,
  params: any[] = []
): Promise<T | undefined> {
  const results = await executeQuery<T>(query, params)
  return results[0]
}

// 执行更新/插入/删除
export async function executeUpdate(
  query: string,
  params: any[] = []
): Promise<mysql.ResultSetHeader> {
  const pool = getPool()
  try {
    const [result] = await pool.execute(query, params)
    return result as mysql.ResultSetHeader
  } catch (error) {
    console.error('数据库更新错误:', error)
    throw error
  }
}

// 执行事务
export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getPool()
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// 分页查询辅助函数
export async function paginate<T>(
  query: string,
  params: any[],
  page: number,
  pageSize: number
): Promise<{ data: T[]; total: number }> {
  // 获取总数
  const countQuery = query.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) AS count FROM')
  const countResult = await executeQuery<{ count: number }>(countQuery, params)
  const total = countResult[0]?.count || 0

  // 获取分页数据
  const offset = (page - 1) * pageSize
  const paginatedQuery = `${query} LIMIT ${pageSize} OFFSET ${offset}`
  const data = await executeQuery<T>(paginatedQuery, params)

  return { data, total }
}
