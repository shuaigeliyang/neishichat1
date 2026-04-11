/**
 * 统一RAG问答路由
 *
 * 使用统一索引管理器，支持多文档问答
 *
 * @author 哈雷酱 (￣▽￣)／
 */

import { Router } from 'express';
import { default as UnifiedRAGService } from '../services/unifiedRagService.js';
import unifiedIndexManager from '../services/unifiedIndexManager.js';

const router = Router();

// 初始化RAG服务
let ragService: any = null;

async function getRAGService() {
    if (!ragService) {
        ragService = new UnifiedRAGService(process.env.ZHIPUAI_API_KEY);
        await ragService.initialize();
    }
    return ragService;
}

/**
 * POST /api/rag/answer
 * 问答接口
 */
router.post('/answer', async (req, res) => {
    try {
        const { question, topK = 5, minScore = 0.3 } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                message: '问题不能为空'
            });
        }

        console.log(`📚 [RAG] 收到问答请求: ${question.substring(0, 50)}...`);

        const service = await getRAGService();
        const result = await service.ask(question, { topK, minScore });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('RAG问答失败:', error);
        res.status(500).json({
            success: false,
            message: `问答失败: ${error.message}`
        });
    }
});

/**
 * GET /api/rag/documents
 * 获取已索引的文档列表
 */
router.get('/documents', async (req, res) => {
    try {
        const service = await getRAGService();
        const documents = service.getIndexedDocuments();

        res.json({
            success: true,
            data: documents
        });

    } catch (error) {
        console.error('获取文档列表失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/rag/documents/:documentId
 * 从统一索引中删除指定文档（不依赖注册表）
 */
router.delete('/documents/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                message: '文档ID不能为空'
            });
        }

        // 确保统一索引已初始化
        if (!unifiedIndexManager.index) {
            await unifiedIndexManager.initialize();
        }

        const docInIndex = unifiedIndexManager.index.documents.find(d => d.documentId === documentId);
        if (!docInIndex) {
            return res.status(404).json({
                success: false,
                message: '文档不在统一索引中'
            });
        }

        const docName = docInIndex.displayName || docInIndex.name;
        const result = await unifiedIndexManager.removeDocument(documentId);

        console.log(`🗑️ [RAG] 已从统一索引删除: ${documentId} (${docName})`);

        res.json({
            success: true,
            message: `已从统一索引中删除: ${docName}`,
            data: {
                documentId,
                documentName: docName,
                chunksRemoved: result.chunksRemoved
            }
        });

    } catch (error) {
        console.error('从统一索引删除文档失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/rag/stats
 * 获取索引统计
 */
router.get('/stats', async (req, res) => {
    try {
        const service = await getRAGService();
        const stats = service.getStatistics();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('获取统计失败:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
