/**
 * 统一索引 API 路由
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：提供统一索引管理的REST API
 */

const express = require('express');
const path = require('path');
const MultiDocumentRAGService = require('../../services/multiDocumentRagService');

const router = express.Router();

// 创建服务实例
const ragService = new MultiDocumentRAGService(null, {
    indexPath: path.join(__dirname, '../../../文档库/indexes/unified_index.json')
});

// 初始化服务
let initialized = false;
async function ensureInitialized() {
    if (!initialized) {
        await ragService.initialize();
        initialized = true;
    }
}

/**
 * GET /api/index/status
 * 获取统一索引状态
 */
router.get('/status', async (req, res) => {
    try {
        await ensureInitialized();
        const stats = ragService.getStatistics();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/index/rebuild
 * 重建统一索引
 */
router.post('/rebuild', async (req, res) => {
    try {
        // TODO: 实现重建逻辑
        res.json({
            success: true,
            message: '统一索引重建功能开发中...'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
