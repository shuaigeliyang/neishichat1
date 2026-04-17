import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const config = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
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
  upload: {
    dir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || '../uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },
  knowledgeBase: {
    dir: path.resolve(__dirname, '../../', '..'),
  },
}

export default config
