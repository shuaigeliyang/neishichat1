import { promises as fs } from 'fs'
import path from 'path'
import config from '../config/index.js'

// 系统设置（内存中，实际应该持久化）
let systemSettings = {
  apiUrl: config.mainApi.url,
  databasePath: config.database.host,
  chunkSize: 500,
  chunkOverlap: 50,
}

export async function getSettings(req, res) {
  try {
    res.json({
      success: true,
      data: systemSettings,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
    })
  }
}

export async function updateSettings(req, res) {
  try {
    const updates = req.body

    // 更新设置
    systemSettings = {
      ...systemSettings,
      ...updates,
    }

    // TODO: 持久化设置到配置文件
    const settingsPath = path.join(config.knowledgeBase.dir, '后台管理系统', 'backend', 'settings.json')
    await fs.writeFile(settingsPath, JSON.stringify(systemSettings, null, 2))

    res.json({
      success: true,
      data: systemSettings,
      message: 'Settings updated successfully',
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    })
  }
}
