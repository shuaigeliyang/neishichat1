import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'education-admin-secret-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    name: process.env.DB_NAME || 'education_system',
  },
  mainApi: {
    url: process.env.MAIN_API_URL || 'http://localhost:3000',
  },
}
