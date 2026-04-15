/**
 * 文档管理路由
 *
 * @author 哈雷酱 (￣▽￣)／
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
    getDocuments,
    getDocument,
    registerDocument,
    updateDocument,
    deleteDocument,
    getDocumentStatus,
    startProcessing,
    rebuildDocument,
    getIndexStatus,
    deleteAllIndex,
    getProgress,
    getStatistics,
    getDocumentChunks
} from '../controllers/documentRegistry.js';
import DocumentRegistry from '../services/documentRegistry.js';

// ✨ 修复：在ES Module中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const registry = new DocumentRegistry();

// ✨ 修复：使用相对路径替代硬编码绝对路径
// 从后台管理系统/backend/src/routes 往回4层到达项目根目录，再进入相关文档目录
const UPLOAD_DIR = path.resolve(__dirname, '../../../../相关文档');

// 确保上传目录存在
import('fs').then(fs => {
    fs.default.mkdirSync(UPLOAD_DIR, { recursive: true });
});

// 配置文件上传 - 使用UUID避免中文编码问题
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 直接上传到固定目录
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // 使用UUID + 扩展名，完全避免中文编码问题
        const ext = path.extname(file.originalname);
        const uniqueName = `${uuidv4()}${ext}`;
        console.log(`  上传文件: ${file.originalname} -> ${uniqueName}`);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.docx', '.doc', '.pdf', '.txt', '.md'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`不支持的文件类型: ${ext}`));
        }
    }
});

// ========== 特殊路由（必须放在 :documentId 之前）==========

// 获取索引状态 (必须在 /:documentId 之前)
router.get('/index/status', getIndexStatus);

// 删除全部索引 (必须在 /:documentId 之前)
router.delete('/index/all', deleteAllIndex);

// 获取处理进度 (必须在 /:documentId 之前)
router.get('/progress/:taskId', getProgress);

// 获取统计信息 (必须在 /:documentId 之前)
router.get('/statistics', getStatistics);

// ========== 文档管理 ==========

// 获取所有文档
router.get('/', getDocuments);

// 注册已有文档（手动注册路径）
router.post('/register', registerDocument);

// 上传并注册文档
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '请上传文件' });
        }

        const { name, description, tags, priority } = req.body;

        // 使用UUID文件名（multer已经用UUID保存了）
        const savedFileName = req.file.filename;
        const ext = path.extname(req.file.originalname);

        // 注册文档
        const document = await registry.registerDocument({
            name: name || path.basename(req.file.originalname, ext),
            displayName: name,
            description: description || '',
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
            priority: parseInt(priority) || 1,
            sourceFiles: [{
                fileName: savedFileName,  // 使用UUID文件名
                originalName: req.file.originalname,  // 保存原始文件名
                fileType: ext,
                fileSize: req.file.size,
                uploadedAt: new Date().toISOString()
            }]
        });

        // 将上传的文件移动到source子目录
        const sourceDir = path.join(UPLOAD_DIR, document.directory, 'source');
        const destPath = path.join(sourceDir, savedFileName);

        try {
            await fs.mkdir(sourceDir, { recursive: true });
            await fs.rename(req.file.path, destPath);
            console.log(`✓ 文件已移动到: ${destPath}`);
        } catch (error) {
            console.warn(`⚠ 移动文件失败: ${error.message}，文件保留在原位置`);
        }

        console.log(`✓ 文档已注册: ${document.name}`);
        console.log(`✓ 原始文件名: ${req.file.originalname}`);

        res.json({
            success: true,
            data: document,
            message: '文档上传成功，请开始处理'
        });
    } catch (error) {
        // 清理上传的文件
        if (req.file?.path) {
            try {
                await fs.unlink(req.file.path);
            } catch {}
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== 文档ID相关操作 ==========

// 获取单个文档
router.get('/:documentId', getDocument);

// 更新文档信息
router.put('/:documentId', updateDocument);

// 删除文档
router.delete('/:documentId', deleteDocument);

// 获取文档处理状态
router.get('/:documentId/status', getDocumentStatus);

// 获取文档分块内容
router.get('/:documentId/chunks', getDocumentChunks);

// 开始处理文档
router.post('/:documentId/process', startProcessing);

// 重建文档索引
router.post('/:documentId/rebuild', rebuildDocument);

export default router;
