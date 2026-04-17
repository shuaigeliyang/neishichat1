// API 配置
// 使用环境变量或默认值

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 辅助函数：构建完整的 API URL
export function buildApiUrl(path) {
  // 如果 path 已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // 确保 path 以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // 如果 API_BASE_URL 是完整 URL，直接拼接
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    return `${API_BASE_URL}${normalizedPath}`
  }

  // 否则（相对路径），直接返回
  return normalizedPath
}

export default {
  API_BASE_URL,
  buildApiUrl
}
