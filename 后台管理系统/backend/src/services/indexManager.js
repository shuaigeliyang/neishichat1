/**
 * 增量索引管理器 - v2.0
 *
 * 支持增量添加、删除、重建索引操作
 *
 * @author 哈雷酱 (￣▽￣)／
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IndexManager {
    constructor() {
        // 路径配置 - 使用相对路径，便于迁移
        // __dirname = E:\外包\教育系统智能体\后台管理系统\backend\src\services
        // 回退4层: services -> src -> backend -> 教育系统智能体根目录
        this.basePath = path.resolve(__dirname, '../../../../');
        // 与前台系统使用相同的索引文件
        this.indexPath = path.join(this.basePath, 'retrieval_index.json');
        this.progressFilePath = path.join(this.basePath, '相关文档', 'progress.json');
        this.extractDir = path.join(this.basePath, '文档提取');  // 文档提取目录
        this.scriptsPath = path.resolve(__dirname, '../scripts');

        // Python脚本路径
        this.extractScript = path.join(this.scriptsPath, 'extract_docx.py');
        this.chunkScript = path.join(this.scriptsPath, 'create_chunks_intelligent.py');

        this.ensureDirectories();
    }

    /**
     * 确保必要的目录存在
     */
    async ensureDirectories() {
        try {
            // 在相关文档目录下创建indexes子目录
            await fs.mkdir(path.join(this.basePath, '相关文档', 'indexes'), { recursive: true });
        } catch (error) {
            console.error('创建目录失败:', error);
        }
    }

    /**
     * 生成任务ID
     */
    generateTaskId() {
        return `task_${uuidv4()}`;
    }

    /**
     * 初始化进度文件
     */
    async initializeProgress(taskId, totalSteps) {
        const progress = {
            taskId,
            status: 'processing',
            progress: 0,
            currentStep: '初始化...',
            totalSteps,
            completedSteps: 0,
            startTime: new Date().toISOString(),
            error: null
        };

        await this.saveProgress(taskId, progress);
        return progress;
    }

    /**
     * 更新进度
     */
    async updateProgress(taskId, updates) {
        const progress = await this.getProgress(taskId);
        if (!progress) {
            throw new Error('任务不存在');
        }

        const updated = {
            ...progress,
            ...updates,
            progress: updates.completedSteps !== undefined
                ? Math.floor((updates.completedSteps / progress.totalSteps) * 100)
                : progress.progress
        };

        await this.saveProgress(taskId, updated);
        return updated;
    }

    /**
     * 完成任务
     */
    async completeTask(taskId, result = null) {
        const progress = await this.getProgress(taskId);
        if (!progress) {
            throw new Error('任务不存在');
        }

        const completed = {
            ...progress,
            status: 'completed',
            progress: 100,
            completedSteps: progress.totalSteps,
            currentStep: '完成',
            endTime: new Date().toISOString(),
            result
        };

        await this.saveProgress(taskId, completed);
        return completed;
    }

    /**
     * 标记任务失败
     */
    async failTask(taskId, error) {
        const progress = await this.getProgress(taskId);
        if (!progress) {
            throw new Error('任务不存在');
        }

        const failed = {
            ...progress,
            status: 'failed',
            currentStep: '失败',
            endTime: new Date().toISOString(),
            error: error.message || error
        };

        await this.saveProgress(taskId, failed);
        return failed;
    }

    /**
     * 获取进度
     */
    async getProgress(taskId) {
        try {
            const progressData = await fs.readFile(this.progressFilePath, 'utf-8');
            const allProgress = JSON.parse(progressData);
            return allProgress[taskId];
        } catch (error) {
            return null;
        }
    }

    /**
     * 保存进度
     */
    async saveProgress(taskId, progress) {
        try {
            let allProgress = {};
            try {
                const progressData = await fs.readFile(this.progressFilePath, 'utf-8');
                allProgress = JSON.parse(progressData);
            } catch (error) {
                // 文件不存在，创建新对象
            }

            allProgress[taskId] = progress;
            await fs.mkdir(path.dirname(this.progressFilePath), { recursive: true });
            await fs.writeFile(this.progressFilePath, JSON.stringify(allProgress, null, 2));
        } catch (error) {
            console.error('保存进度失败:', error);
        }
    }

    /**
     * 加载索引
     * 支持旧格式（只有chunks）和新格式（有documents和chunks）
     */
    async loadIndex() {
        try {
            const data = await fs.readFile(this.indexPath, 'utf-8');
            const parsed = JSON.parse(data);

            // 兼容旧格式：如果没有documents数组，创建一个空的
            if (!parsed.documents) {
                parsed.documents = [];
            }
            if (!parsed.metadata) {
                parsed.metadata = {
                    totalDocuments: parsed.documents.length,
                    totalChunks: parsed.chunks?.length || 0,
                    provider: 'LOCAL_PYTHON',
                    model: 'paraphrase-multilingual-MiniLM-L12-v2',
                    dimension: 384
                };
            }

            return parsed;
        } catch {
            // 返回空索引结构
            return {
                version: '2.0',
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    totalDocuments: 0,
                    totalChunks: 0,
                    provider: 'LOCAL_PYTHON',
                    model: 'paraphrase-multilingual-MiniLM-L12-v2',
                    dimension: 384,
                    indexName: 'retrieval_index'
                },
                documents: [],
                chunks: []
            };
        }
    }

    /**
     * 保存索引
     */
    async saveIndex(indexData) {
        indexData.metadata.updatedAt = new Date().toISOString();
        await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
        await fs.writeFile(this.indexPath, JSON.stringify(indexData, null, 2));
        return this.indexPath;
    }

    /**
     * 获取索引状态
     */
    async getIndexStatus() {
        try {
            const index = await this.loadIndex();

            return {
                indexed: index.metadata.totalChunks > 0,
                totalDocuments: index.metadata.totalDocuments,
                totalChunks: index.metadata.totalChunks,
                provider: index.metadata.provider,
                model: index.metadata.model,
                lastUpdated: index.metadata.updatedAt,
                documents: index.documents,
                indexPath: this.indexPath
            };
        } catch (error) {
            return {
                indexed: false,
                totalDocuments: 0,
                totalChunks: 0,
                provider: 'UNKNOWN',
                model: 'UNKNOWN',
                lastUpdated: null,
                documents: [],
                indexPath: this.indexPath,
                error: error.message
            };
        }
    }

    /**
     * 增量添加文档到索引
     */
    async addDocumentToIndex(documentId, newChunks, documentMeta, taskId) {
        const index = await this.loadIndex();

        // 检查文档是否已存在
        const existingDoc = index.documents.find(d => d.documentId === documentId);
        if (existingDoc) {
            throw new Error(`文档已存在索引中: ${documentId}`);
        }

        // 确定chunkId范围
        const firstChunkId = index.chunks.length > 0
            ? Math.max(...index.chunks.map(c => c.chunkId)) + 1
            : 1;

        // 添加chunkId到新块
        const chunksWithId = newChunks.map((chunk, i) => ({
            chunkId: firstChunkId + i,
            documentId: documentId,
            documentName: documentMeta.name || documentMeta.displayName,
            ...chunk
        }));

        // 更新文档统计
        const docEntry = {
            documentId: documentId,
            name: documentMeta.name || documentMeta.displayName,
            displayName: documentMeta.displayName || documentMeta.name,
            status: 'indexed',
            indexedAt: new Date().toISOString(),
            statistics: {
                totalChunks: chunksWithId.length,
                firstChunkId: firstChunkId,
                lastChunkId: firstChunkId + chunksWithId.length - 1
            }
        };

        // 合并到索引
        index.metadata.totalDocuments += 1;
        index.metadata.totalChunks += chunksWithId.length;
        index.documents.push(docEntry);
        index.chunks.push(...chunksWithId);

        await this.saveIndex(index);

        console.log(`✓ 文档已添加到索引: ${documentMeta.name} (${chunksWithId.length} chunks)`);
        return index;
    }

    /**
     * 从索引中删除文档
     */
    async removeDocumentFromIndex(documentId, taskId) {
        const index = await this.loadIndex();

        // 检查文档是否存在
        const existingDoc = index.documents.find(d => d.documentId === documentId);
        if (!existingDoc) {
            throw new Error(`文档不在索引中: ${documentId}`);
        }

        // 备份旧索引
        const backupPath = path.join(
            this.basePath,
            'indexes',
            `backup_${Date.now()}_${documentId}.json`
        );
        await fs.copyFile(this.indexPath, backupPath);
        console.log(`✓ 已备份旧索引: ${path.basename(backupPath)}`);

        // 过滤掉该文档的chunks
        const removedChunks = index.chunks.filter(c => c.documentId === documentId);
        index.chunks = index.chunks.filter(c => c.documentId !== documentId);
        index.documents = index.documents.filter(d => d.documentId !== documentId);

        // 更新统计
        index.metadata.totalDocuments = index.documents.length;
        index.metadata.totalChunks = index.chunks.length;
        index.metadata.updatedAt = new Date().toISOString();

        await this.saveIndex(index);

        console.log(`✓ 文档已从索引删除: ${documentId} (${removedChunks.length} chunks)`);
        return {
            removed: existingDoc,
            chunksRemoved: removedChunks.length,
            index
        };
    }

    /**
     * 替换文档索引
     */
    async replaceDocumentIndex(documentId, newChunks, documentMeta, taskId) {
        // 先删除旧文档
        try {
            await this.removeDocumentFromIndex(documentId, taskId);
        } catch (error) {
            if (!error.message.includes('不在索引中')) {
                throw error;
            }
        }

        // 添加新文档
        return await this.addDocumentToIndex(documentId, newChunks, documentMeta, taskId);
    }

    /**
     * 删除全部索引
     */
    async deleteAllIndex() {
        try {
            // 创建备份
            try {
                const backupPath = path.join(
                    this.basePath,
                    'indexes',
                    `full_backup_${Date.now()}.json`
                );
                await fs.copyFile(this.indexPath, backupPath);
                console.log(`✓ 已备份全部索引: ${path.basename(backupPath)}`);
            } catch {
                // 索引不存在，跳过备份
            }

            // 创建新的空索引
            const emptyIndex = {
                version: '2.0',
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    totalDocuments: 0,
                    totalChunks: 0,
                    provider: 'LOCAL_PYTHON',
                    model: 'paraphrase-multilingual-MiniLM-L12-v2',
                    dimension: 384,
                    indexName: 'retrieval_index'
                },
                documents: [],
                chunks: []
            };

            await this.saveIndex(emptyIndex);

            return { success: true, message: '全部索引已删除' };
        } catch (error) {
            console.error('删除索引失败:', error);
            throw error;
        }
    }

    /**
     * 执行Python脚本
     */
    async executePythonScript(scriptPath, args) {
        return new Promise((resolve, reject) => {
            const python = spawn('python', [scriptPath, ...args], {
                cwd: this.scriptsPath
            });

            let stdout = '';
            let stderr = '';

            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            python.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`脚本执行失败 (code ${code}): ${stderr}`));
                }
            });
        });
    }

    /**
     * 检查文件是否存在
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 获取索引路径（供外部使用）
     */
    getIndexFilePath() {
        return this.indexPath;
    }
}

export default IndexManager;
