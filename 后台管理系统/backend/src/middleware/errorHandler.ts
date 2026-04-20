import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../types/index.js'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void {
  console.error('[Error]', err.message)
  console.error('[Stack]', err.stack)

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
  })
}
