import { Response } from 'express'
import bcrypt from 'bcryptjs'
import { executeOne, executeUpdate } from '../utils/db.js'
import { generateToken, AuthRequest, JwtPayload } from '../middleware/auth.js'
import type { ApiResponse, AdminUser } from '../types/index.js'

export async function login(req: AuthRequest, res: Response<ApiResponse<{ token: string; user: Omit<AdminUser, 'password_hash'> }>>) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' })
      return
    }

    const user = await executeOne<AdminUser>(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    )

    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role as 'admin' | 'superadmin',
    })

    const { password_hash, ...userInfo } = user
    res.json({
      success: true,
      data: { token, user: userInfo },
      message: '登录成功',
    })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    res.status(500).json({ success: false, error: '登录失败' })
  }
}

export async function register(req: AuthRequest, res: Response<ApiResponse>) {
  try {
    const { username, password, role = 'admin' } = req.body

    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' })
      return
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: '密码长度至少6位' })
      return
    }

    const existing = await executeOne<AdminUser>('SELECT id FROM admin_users WHERE username = ?', [username])
    if (existing) {
      res.status(409).json({ success: false, error: '用户名已存在' })
      return
    }

    const password_hash = await bcrypt.hash(password, 10)
    await executeUpdate(
      'INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, password_hash, role]
    )

    res.json({ success: true, message: '注册成功' })
  } catch (error) {
    console.error('[Auth] Register error:', error)
    res.status(500).json({ success: false, error: '注册失败' })
  }
}

export async function getProfile(req: AuthRequest, res: Response<ApiResponse>) {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' })
    return
  }

  const user = await executeOne<Omit<AdminUser, 'password_hash'>>(
    'SELECT id, username, role, created_at FROM admin_users WHERE id = ?',
    [req.user.id]
  )

  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }

  res.json({ success: true, data: user })
}
