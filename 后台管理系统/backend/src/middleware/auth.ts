import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import config from '../config/index.js'

export interface JwtPayload {
  id: number
  username: string
  role: 'admin' | 'superadmin'
}

export interface AuthRequest extends Request {
  user?: JwtPayload
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ success: false, error: '无效或过期的令牌' })
  }
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn']
  })
}
