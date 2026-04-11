/**
 * 文档管理 API 路由（修复中文文件名版本）
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：提供多政策文档管理的REST API
 *
 * 修复内容：
 * - 正确处理中文文件名
 * - 使用UTF-8编码
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const DocumentRegistry = require('../../services/documentRegistry');
const UnifiedIndexManager = require('../../services/unifiedIndexManager');
const DocumentPipeline = require('../../services/documentPipeline');

const router = express.Router();

// 配置文件上传 - 修复中文文件名
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.resolve(__dirname, '../../../相关文档');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 正确处理中文文件名
        try {
            // 方法1：直接使用原始文件名（推荐）
            const originalName = file.originalname;
            cb(null, originalName);
        } catch (error) {
            // 如果失败，使用安全的方式处理
            const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8')
                .replace(/[^a-zA-Z0-9\u4e00-\u9fa5._\-]/g, '_');
            cb(null, safeName);
        }
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.docx', '.doc', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型，仅支持 .docx, .doc, .pdf'));
        }
    }
});

// 初始化服务（中间件）
router.use(async (req, res, next) => {
    if (!req.registry) {
        req.registry = new DocumentRegistry();
        await req.registry.initialize();
    }

    if (!req.indexManager) {
        const apiKey = process.env.ZHIPU_API_KEY;
        req.indexManager = new UnifiedIndexManager(apiKey, {
            embeddingMode: process.env.EMBEDDING_MODE || 'api'
        });
        await req.indexManager.initialize();
    }

    next();
});

/**
 * GET /api/documents
 * 获取所有文档列表
 */
router.get('/', async (req, res) => {
    try {
        const documents = req.registry.getAllDocuments();
        const statistics = req.registry.getStatistics();

        res.json({
            success: true,
            data: {
                documents: documents,
                statistics: statistics
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/documents/:id
 * 获取单个文档详情
 */
router.get('/:id', async (req, res) => {
    try {
        const document = req.registry.getDocumentById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                error: '文档不存在'
            });
        }

        res.json({
            success: true,
            data: document
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/documents/upload
 * 上传新文档（修复中文文件名）
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: '请上传文件'
            });
        }

        console.log('\n========== 文档上传 ==========');
        console.log('原始文件名:', req.file.originalname);
        console.log('保存文件名:', req.file.filename);

        // 获取表单数据
        const originalFileName = req.file.originalname;
        const baseName = path.parse(originalFileName).name;
        const ext = path.parse(originalFileName).ext;

        // 使用表单提供的名称，或者原始文件名（去掉扩展名）
        const name = req.body.name || baseName;

        const description = req.body.description || '';
        const tags = req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [];

        // 使用相对路径
        const basePath = path.resolve(__dirname, '../..');
        const sourceDir = path.join(basePath, '相关文档');

        // 确保相关文档目录存在
        await fs.mkdir(sourceDir, { recursive: true });

        // 文件已经自动保存到相关文档目录，使用原始文件名
        const savedFileName = req.file.filename;
        const savedFilePath = path.join(sourceDir, savedFileName);

        console.log('文件保存路径:', savedFilePath);

        // 注册文档到注册表
        const docInfo = await req.registry.registerDocument({
            name: name,
            displayName: name,
            description: description,
            tags: tags,
            fileName: savedFileName,
            fileType: ext,
            fileSize: req.file.size
        });

        console.log('✓ 文档已注册:', docInfo.documentId);
        console.log('  文档名称:', name);
        console.log('  文件名:', savedFileName);

        res.json({
            success: true,
            data: {
                documentId: docInfo.documentId,
                name: docInfo.name,
                displayName: docInfo.displayName,
                status: docInfo.status,
                fileName: savedFileName
            },
            message: '文档上传成功！点击"处理"按钮开始自动提取和索引'
        });

    } catch (error) {
        console.error('✗ 上传失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/documents/:id/replace
 * 替换文档
 */
router.post('/:id/replace', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: '请上传文件'
            });
        }

        const document = req.registry.getDocumentById(req.params.id);
        if (!document) {
            return res.status(404).json({
                success: false,
                error: '文档不存在'
            });
        }

        // 备份旧文件
        const docDirectory = path.resolve(__dirname, '../../../文档提取', document.name);
        const archiveDir = path.join(docDirectory, 'archive');
        await fs.mkdir(archiveDir, { recursive: true });

        const oldFiles = await fs.readdir(docDirectory);
        for (const oldFile of oldFiles) {
            if (oldFile.endsWith('.docx') || oldFile.endsWith('.pdf')) {
                const timestamp = Date.now();
                await fs.rename(
                    path.join(docDirectory, oldFile),
                    path.join(archiveDir, `${timestamp}_${oldFile}`)
                );
            }
        }

        // 保存新文件
        const newFileName = req.file.filename;
        const newFilePath = path.join(docDirectory, newFileName);
        await fs.rename(req.file.path, newFilePath);

        // 更新注册表
        const updated = await req.registry.replaceDocument(req.params.id, {
            fileName: newFileName,
            fileType: path.extname(req.file.filename),
            fileSize: req.file.size
        });

        res.json({
            success: true,
            data: {
                documentId: updated.documentId,
                oldStatus: 'indexed',
                newStatus: updated.status
            },
            message: '文档已准备替换，请开始处理'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/documents/:id
 * 删除文档
 */
router.delete('/:id', async (req, res) => {
    try {
        const document = req.registry.getDocumentById(req.params.id);
        if (!document) {
            return res.status(404).json({
                success: false,
                error: '文档不存在'
            });
        }

        // 从统一索引中删除
        await req.indexManager.removeDocument(req.params.id);

        // 从注册表中删除
        await req.registry.deleteDocument(req.params.id);

        res.json({
            success: true,
            message: '文档已删除，相关索引已清理'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/documents/:id/process
 * 开始处理文档（完整自动化流程：提取→分块→向量化→索引）
 */
router.post('/:id/process', async (req, res) => {
    try {
        const document = req.registry.getDocumentById(req.params.id);
        if (!document) {
            return res.status(404).json({
                success: false,
                error: '文档不存在'
            });
        }

        console.log(`\n========== 收到文档处理请求 ==========`);
        console.log(`  文档ID: ${document.documentId}`);
        console.log(`  文档名称: ${document.name}`);
        console.log(`  文件: ${document.sourceFiles[0].fileName}`);

        // 创建处理管道
        const apiKey = process.env.ZHIPU_API_KEY;
        const pipeline = new DocumentPipeline(apiKey, {
            embeddingMode: process.env.EMBEDDING_MODE || 'api'
        });
        await pipeline.initialize();

        // 异步处理文档（完整流程）
        processDocumentAsync(pipeline, document.documentId, document.name);

        res.json({
            success: true,
            data: {
                documentId: document.documentId,
                name: document.name,
                status: 'processing'
            },
            message: '文档处理已启动（提取→分块→向量化→索引），请稍后刷新查看状态'
        });

    } catch (error) {
        console.error('✗ 启动处理失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/documents/:id/status
 * 获取文档处理状态
 */
router.get('/:id/status', async (req, res) => {
    try {
        const document = req.registry.getDocumentById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                error: '文档不存在'
            });
        }

        res.json({
            success: true,
            data: {
                documentId: document.documentId,
                name: document.name,
                displayName: document.displayName,
                status: document.status,
                statistics: document.statistics,
                updatedAt: document.updatedAt
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/documents/processed
 * 获取已处理的文档列表
 */
router.get('/processed', async (req, res) => {
    try {
        const basePath = path.resolve(__dirname, '../..');
        const extractedDir = path.join(basePath, '文档提取');

        // 确保目录存在
        try {
            await fs.access(extractedDir);
        } catch {
            return res.json({
                success: true,
                data: { documents: [] }
            });
        }

        // 读取所有文档目录
        const docDirs = await fs.readdir(extractedDir);
        const processedDocs = [];

        for (const docDir of docDirs) {
            const docPath = path.join(extractedDir, docDir);
            const stat = await fs.stat(docPath);

            // 只处理目录
            if (!stat.isDirectory()) continue;

            // 检查三个文件是否存在
            const files = {
                student_handbook_full: false,
                document_chunks: false,
                embedding_cache: false
            };

            let stats = null;

            try {
                // 检查 student_handbook_full.json
                const handbookPath = path.join(docPath, 'student_handbook_full.json');
                await fs.access(handbookPath);
                files.student_handbook_full = true;

                // 读取统计数据
                const handbookData = JSON.parse(await fs.readFile(handbookPath, 'utf-8'));
                stats = {
                    totalPages: handbookData.total_pages || handbookData.pages?.length || 0
                };
            } catch (err) {
                // 文件不存在
            }

            try {
                // 检查 document_chunks.json
                const chunksPath = path.join(docPath, 'document_chunks.json');
                await fs.access(chunksPath);
                files.document_chunks = true;

                // 读取统计数据
                const chunksData = JSON.parse(await fs.readFile(chunksPath, 'utf-8'));
                if (stats) {
                    stats.totalChunks = chunksData.length || 0;
                }
            } catch (err) {
                // 文件不存在
            }

            try {
                // 检查 embedding_cache.json
                const cachePath = path.join(docPath, 'embedding_cache.json');
                await fs.access(cachePath);
                files.embedding_cache = true;
            } catch (err) {
                // 文件不存在
            }

            processedDocs.push({
                name: docDir,
                path: docPath,
                files: files,
                stats: stats
            });
        }

        res.json({
            success: true,
            data: {
                documents: processedDocs
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/documents/content/:documentName
 * 获取文档文件内容
 */
router.get('/content/:documentName', async (req, res) => {
    try {
        const { documentName } = req.params;
        const { type } = req.query;

        if (!type || !['student_handbook_full', 'document_chunks', 'embedding_cache'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: '无效的文件类型'
            });
        }

        const basePath = path.resolve(__dirname, '../..');
        const docPath = path.join(basePath, '文档提取', documentName);

        // 构建文件路径
        const fileName = type === 'student_handbook_full' ? 'student_handbook_full.json' :
                        type === 'document_chunks' ? 'document_chunks.json' :
                        'embedding_cache.json';

        const filePath = path.join(docPath, fileName);

        // 读取文件
        let content;
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            content = JSON.parse(data);
        } catch (err) {
            return res.status(404).json({
                success: false,
                error: '文件不存在'
            });
        }

        res.json({
            success: true,
            data: content
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/index/status
 * 获取统一索引状态
 */
router.get('/index/status', async (req, res) => {
    try {
        const stats = req.indexManager.getStatistics();

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
router.post('/index/rebuild', async (req, res) => {
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

/**
 * 异步处理文档
 */
async function processDocumentAsync(pipeline, documentId, docName) {
    try {
        await pipeline.processDocument(documentId, docName);
    } catch (error) {
        console.error(`文档处理失败 (${documentId}):`, error.message);
    }
}

module.exports = router;
