import ApiKeyManager from '../services/apiKeyManager.js'
import IndexManager from '../services/indexManager.js'
import DocumentProcessingService from '../services/documentProcessingService.js'
import ProjectConfigManager from '../services/projectConfigManager.js'

const apiKeyManager = new ApiKeyManager()
const indexManager = new IndexManager()
const documentProcessor = new DocumentProcessingService()
const projectConfigManager = new ProjectConfigManager()

/**
 * 获取支持的模型列表
 */
export async function getSupportedModels(req, res) {
  try {
    const models = apiKeyManager.getSupportedModels()

    res.json({
      success: true,
      data: models
    })
  } catch (error) {
    console.error('获取模型列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取模型列表失败'
    })
  }
}

/**
 * 验证API密钥
 */
export async function validateApiKey(req, res) {
  try {
    const { provider, apiKey } = req.body

    if (!provider || !apiKey) {
      res.status(400).json({
        success: false,
        error: '请提供provider和apiKey'
      })
      return
    }

    const result = await apiKeyManager.validateApiKey(provider, apiKey)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('验证API密钥失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '验证API密钥失败'
    })
  }
}

/**
 * 获取项目配置状态
 */
export async function getProjectConfigStatus(req, res) {
  try {
    const keyConfig = projectConfigManager.getAvailableApiKey()
    const ragConfig = projectConfigManager.getRAGServiceConfig()

    res.json({
      success: true,
      data: {
        hasApiKey: !!keyConfig,
        apiKeySource: keyConfig?.source,
        ragConfig: ragConfig
      }
    })
  } catch (error) {
    console.error('获取项目配置失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取项目配置失败'
    })
  }
}

/**
 * 获取索引状态
 */
export async function getIndexStatus(req, res) {
  try {
    const status = await indexManager.getIndexStatus()

    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('获取索引状态失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取索引状态失败'
    })
  }
}

/**
 * 获取构建进度
 */
export async function getBuildProgress(req, res) {
  try {
    const { taskId } = req.params

    const progress = await indexManager.getProgress(taskId)

    if (!progress) {
      res.status(404).json({
        success: false,
        error: '任务不存在'
      })
      return
    }

    res.json({
      success: true,
      data: progress
    })
  } catch (error) {
    console.error('获取构建进度失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取构建进度失败'
    })
  }
}

/**
 * 删除文档索引
 */
export async function deleteDocumentIndex(req, res) {
  try {
    const { documentId } = req.params

    await documentProcessor.removeFromIndex(documentId)

    res.json({
      success: true,
      message: '文档索引已删除'
    })
  } catch (error) {
    console.error('删除文档索引失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '删除文档索引失败'
    })
  }
}

/**
 * 删除全部索引
 */
export async function deleteAllIndex(req, res) {
  try {
    const result = await indexManager.deleteAllIndex()

    res.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('删除全部索引失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '删除全部索引失败'
    })
  }
}

/**
 * 构建索引（完整流程）
 */
export async function buildIndex(req, res) {
  try {
    const { documentId, mode } = req.body

    if (!documentId) {
      res.status(400).json({
        success: false,
        error: '请提供documentId'
      })
      return
    }

    // 创建任务ID
    const taskId = indexManager.generateTaskId()

    // 初始化进度
    await indexManager.initializeProgress(taskId, 5)

    // 异步构建索引
    buildIndexAsync(taskId, documentId, mode)

    res.json({
      success: true,
      data: {
        taskId,
        message: '索引构建已启动'
      }
    })
  } catch (error) {
    console.error('构建索引失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '构建索引失败'
    })
  }
}

/**
 * 异步构建索引
 */
async function buildIndexAsync(taskId, documentId, mode) {
  try {
    // 这里应该从数据库获取文档信息
    // 暂时使用示例路径
    const filePath = 'E:/外包/教育系统智能体/相关文档/2025年本科学生手册-定.docx'

    // 更新进度：开始处理
    await indexManager.updateProgress(taskId, {
      currentStep: '开始处理文档...',
      completedSteps: 1
    })

    // 根据模式执行不同操作
    if (mode === 'add') {
      await documentProcessor.addToIndex(documentId, filePath, taskId)
    } else if (mode === 'replace') {
      await documentProcessor.replaceIndex(documentId, filePath, taskId)
    } else {
      await documentProcessor.buildIndex(documentId, filePath, {}, taskId)
    }

    // 完成
    await indexManager.completeTask(taskId, {
      message: '索引构建完成'
    })

    console.log(`索引构建完成: ${taskId}`)
  } catch (error) {
    await indexManager.failTask(taskId, error)
    console.error(`索引构建失败: ${taskId}`, error)
  }
}
