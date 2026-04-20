/**
 * 文档管理控制器
 *
 * 处理文档的CRUD、状态管理、流水线操作
 *
 * @author 哈雷酱 (￣▽￣)／
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import DocumentRegistry from '../services/documentRegistry.js';
import IncrementalPipeline from '../services/incrementalPipeline.js';
import IndexManager from '../services/indexManager.js';
import unifiedIndexManager from '../services/unifiedIndexManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const registry = new DocumentRegistry();
const pipeline = new IncrementalPipeline();
const indexManager = new IndexManager();

/**
 * 获取所有文档列表
 */
export async function getDocuments(req, res) {
    try {
        await registry.initialize();
        const documents = await registry.getAllDocuments();
        const stats = await registry.getStatistics();

        res.json({
            success: true,
            data: {
                documents,
                total: documents.length,
                statistics: stats
            }
        });
    } catch (error) {
        console.error('获取文档列表失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 获取单个文档详情
 */
export async function getDocument(req, res) {
    try {
        const { documentId } = req.params;
        const document = await registry.getDocument(documentId);

        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }

        res.json({ success: true, data: document });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 注册已有文档（手动注册）
 */
export async function registerDocument(req, res) {
    try {
        const { name, filePath, description, tags, priority } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: '请提供文档名称'
            });
        }

        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: '请提供文件路径'
            });
        }

        // 检查文件是否存在
        try {
            await fs.access(filePath);
        } catch {
            return res.status(400).json({ success: false, error: '文件不存在' });
        }

        const fileStats = await fs.stat(filePath);
        const fileName = path.basename(filePath);

        // 注册文档
        const document = await registry.registerDocument({
            name,
            displayName: name,
            description: description || '',
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
            priority: parseInt(priority) || 1,
            sourceFiles: [{
                fileName: fileName,
                fileType: path.extname(filePath),
                fileSize: fileStats.size,
                uploadedAt: new Date().toISOString()
            }]
        });

        // 复制文件到文档库
        const destPath = path.join(
            registry.basePath,
            document.directory,
            'source',
            fileName
        );

        // 确保目标目录存在
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(filePath, destPath);

        console.log(`✓ 文件已复制到: ${destPath}`);

        res.json({
            success: true,
            data: document,
            message: '文档注册成功'
        });
    } catch (error) {
        console.error('注册文档失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 上传并注册文档（兼容前端上传功能）
 */
export async function uploadDocument(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '请上传文件' });
        }

        const { name, description, tags } = req.body;

        // 使用UUID文件名
        const ext = path.extname(req.file.originalname);
        const uniqueName = `${uuidv4()}${ext}`;

        // 注册文档
        const document = await registry.registerDocument({
            name: name || path.basename(req.file.originalname, ext),
            displayName: name,
            description: description || '',
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
            sourceFiles: [{
                fileName: uniqueName,
                originalName: req.file.originalname,
                fileType: ext,
                fileSize: req.file.size,
                uploadedAt: new Date().toISOString()
            }]
        });

        // 将上传的文件移动到文档目录
        const UPLOAD_DIR = path.resolve(__dirname, '../../../../相关文档');
        const sourceDir = path.join(UPLOAD_DIR, document.directory, 'source');
        const destPath = path.join(sourceDir, uniqueName);

        try {
            await fs.mkdir(sourceDir, { recursive: true });
            await fs.rename(req.file.path, destPath);
            console.log(`✓ 文件已移动到: ${destPath}`);
        } catch (error) {
            console.warn(`⚠ 移动文件失败: ${error.message}，文件保留在原位置`);
            // 仍然移动到上传目录的根目录
            const rootDest = path.join(UPLOAD_DIR, uniqueName);
            try {
                await fs.rename(req.file.path, rootDest);
            } catch {}
        }

        res.json({
            success: true,
            data: document,
            message: '文档上传成功，请开始处理'
        });
    } catch (error) {
        if (req.file?.path) {
            try { await fs.unlink(req.file.path); } catch {}
        }
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 更新文档信息
 */
export async function updateDocument(req, res) {
    try {
        const { documentId } = req.params;
        const updates = req.body;

        const document = await registry.getDocument(documentId);
        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }

        // 更新允许的字段
        const allowedUpdates = ['displayName', 'description', 'tags', 'priority'];
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                document[key] = updates[key];
            }
        }
        document.updatedAt = new Date().toISOString();

        // 保存更新
        const reg = await registry.getRegistry();
        const index = reg.documents.findIndex(d => d.documentId === documentId);
        if (index !== -1) {
            reg.documents[index] = document;
            await registry.saveRegistry(reg);
        }

        res.json({ success: true, data: document });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 删除文档
 */
export async function deleteDocument(req, res) {
    try {
        const { documentId } = req.params;

        const document = await registry.getDocument(documentId);
        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }

        await pipeline.deleteDocument(documentId);

        res.json({ success: true, message: '文档已删除' });
    } catch (error) {
        console.error('删除文档失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 获取文档处理状态
 */
export async function getDocumentStatus(req, res) {
    try {
        const { documentId } = req.params;
        const status = await pipeline.getProcessingStatus(documentId);

        if (!status) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }

        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 开始处理文档
 */
export async function startProcessing(req, res) {
    try {
        const { documentId } = req.params;
        const { mode = 'incremental', apiKey } = req.body;

        const document = await registry.getDocument(documentId);
        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }

        // 检查文档状态
        if (document.status === 'indexed' && mode === 'incremental') {
            return res.status(400).json({
                success: false,
                error: '文档已索引，请使用 rebuild 模式重建'
            });
        }

        // 异步处理
        const taskId = indexManager.generateTaskId();

        // 启动处理（不等待完成）
        pipeline.processDocument(documentId, {
            apiKey,
            onProgress: (progress) => {
                console.log(`[${progress.taskId}] ${progress.step}: ${progress.message}`);
            }
        }).catch(error => {
            console.error(`处理失败:`, error);
        });

        res.json({
            success: true,
            data: {
                taskId,
                documentId,
                status: 'processing',
                message: '文档处理已启动'
            }
        });
    } catch (error) {
        console.error('启动处理失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 重建文档索引
 */
export async function rebuildDocument(req, res) {
    try {
        const { documentId } = req.params;
        const { apiKey } = req.body;

        const document = await registry.getDocument(documentId);
        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }

        const taskId = indexManager.generateTaskId();

        // 异步重建
        pipeline.rebuildDocument(documentId, { apiKey }).catch(error => {
            console.error(`重建失败:`, error);
        });

        res.json({
            success: true,
            data: {
                taskId,
                documentId,
                status: 'processing',
                message: '文档重建已启动'
            }
        });
    } catch (error) {
        console.error('重建文档失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 获取索引状态
 */
export async function getIndexStatus(req, res) {
    try {
        const status = await indexManager.getIndexStatus();

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 删除全部索引
 */
export async function deleteAllIndex(req, res) {
    try {
        const result = await indexManager.deleteAllIndex();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 获取处理进度
 */
export async function getProgress(req, res) {
    try {
        const { taskId } = req.params;
        const progress = await indexManager.getProgress(taskId);

        if (!progress) {
            return res.status(404).json({ success: false, error: '任务不存在' });
        }

        res.json({ success: true, data: progress });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 获取注册表统计
 */
export async function getStatistics(req, res) {
    try {
        const stats = await registry.getStatistics();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * 获取文档的分块内容
 * 从统一索引读取，通过文档名匹配（兼容注册表ID与统一索引ID不一致的情况）
 */
export async function getDocumentChunks(req, res) {
    try {
        // 确保统一索引已初始化
        if (!unifiedIndexManager.index) {
            await unifiedIndexManager.initialize();
        }

        const { documentId } = req.params;

        const document = await registry.getDocument(documentId);
        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }

        // 优先用注册表中的 documentId 查找
        // 如果找不到（ID不一致），则按文档名查找统一索引中的对应文档
        let unifiedDocId = documentId;
        let docInIndex = unifiedIndexManager.index.documents.find(d => d.documentId === documentId);

        // ID不一致时，按文档名匹配
        if (!docInIndex) {
            const docName = document.displayName || document.name;
            const normalizedName = docName.replace(/\s+/g, '').toLowerCase();
            docInIndex = unifiedIndexManager.index.documents.find(d => {
                const idxName = (d.displayName || d.name || '').replace(/\s+/g, '').toLowerCase();
                return idxName === normalizedName;
            });
            if (docInIndex) {
                unifiedDocId = docInIndex.documentId;
                console.log(`⚠ 文档ID映射: 注册表[${documentId}] → 统一索引[${unifiedDocId}]`);
            }
        }

        if (!docInIndex) {
            return res.json({
                success: true,
                data: {
                    documentId,
                    documentName: document.displayName || document.name,
                    chunks: [],
                    message: '文档尚未索引，请先处理'
                }
            });
        }

        // 从统一索引读取 chunks
        const chunks = unifiedIndexManager.index.chunks
            .filter(c => c.documentId === unifiedDocId)
            .map(chunk => ({
                chunkId: chunk.chunkId,
                text: chunk.text || chunk.full_context || '',
                preview: ((chunk.text || chunk.full_context || '').substring(0, 200) + '...').replace(/\n/g, ' '),
                metadata: {
                    page: chunk.page_num || chunk.metadata?.page,
                    charCount: chunk.char_count
                }
            }));

        console.log(`✓ 从统一索引读取到 ${chunks.length} 个chunks: ${unifiedDocId}`);

        return res.json({
            success: true,
            data: {
                documentId: unifiedDocId,
                originalDocumentId: documentId,
                documentName: document.displayName || document.name,
                totalChunks: chunks.length,
                source: 'unified_index',
                chunks
            }
        });
    } catch (error) {
        console.error('获取chunks失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
