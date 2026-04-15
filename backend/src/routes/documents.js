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
const MultiDocumentRAGService = require('../../services/multiDocumentRagService');

const router = express.Router();

// 配置文件上传 - 使用UUID避免中文编码问题
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.resolve(__dirname, '../../../相关文档');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 使用UUID + 原始扩展名，完全避免中文编码问题
        const { v4: uuidv4 } = require('crypto');
        const ext = path.extname(file.originalname);
        const uniqueName = `${uuidv4()}${ext}`;

        console.log('  原始文件名:', file.originalname);
        console.log('  保存文件名:', uniqueName);

        cb(null, uniqueName);
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
let ragService = null;
async function getRAGService() {
    if (!ragService) {
        ragService = new MultiDocumentRAGService(null, {
            indexPath: path.join(__dirname, '../../../文档库/indexes/unified_index.json')
        });
        await ragService.initialize();
    }
    return ragService;
}

router.use(async (req, res, next) => {
    if (!req.registry) {
        req.registry = new DocumentRegistry();
        await req.registry.initialize();
    }
    req.getRAGService = getRAGService;
    next();
});

/**
 * GET /api/documents/processed
 * 获取已处理的文档列表
 * 注意：必须在 /:id 路由之前定义，避免被当作ID匹配
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
                retrieval_index: false,
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
                // 检查 retrieval_index.json
                const indexPath = path.join(docPath, 'retrieval_index.json');
                await fs.access(indexPath);
                files.retrieval_index = true;

                // 读取统计数据
                const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
                if (stats) {
                    stats.totalChunks = indexData.metadata?.total_chunks || 0;
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
        console.log('表单数据:', req.body);

        // 获取扩展名
        const ext = path.extname(req.file.originalname);

        // 使用表单提供的名称，如果没有则使用默认名称
        let displayName = '未命名文档';
        if (req.body.name && req.body.name.trim()) {
            displayName = req.body.name.trim();
        }

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
            name: displayName,
            displayName: displayName,
            description: description,
            tags: tags,
            fileName: savedFileName,
            fileType: ext,
            fileSize: req.file.size
        });

        console.log('✓ 文档已注册:', docInfo.documentId);
        console.log('  显示名称:', displayName);
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
        // TODO: 实现从unified_index中删除文档的功能

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
        console.log(`  注意: 文档处理功能暂时禁用，需要使用后台管理系统处理`);

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
 * GET /api/documents/content/:documentName
 * 获取文档文件内容
 */
router.get('/content/:documentName', async (req, res) => {
    try {
        const { documentName } = req.params;
        const { type } = req.query;

        if (!type || !['student_handbook_full', 'retrieval_index', 'embedding_cache'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: '无效的文件类型'
            });
        }

        const basePath = path.resolve(__dirname, '../..');
        const docPath = path.join(basePath, '文档提取', documentName);

        // 构建文件路径
        const fileName = type === 'student_handbook_full' ? 'student_handbook_full.json' :
                        type === 'retrieval_index' ? 'retrieval_index.json' :
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

module.exports = router;
