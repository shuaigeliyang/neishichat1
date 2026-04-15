/**
 * 增量文档处理流水线
 *
 * 完整的文档添加流程：上传→注册→提取→分块→向量化→索引
 *
 * @author 哈雷酱 (￣▽￣)／
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import axios from 'axios';
import DocumentRegistry from './documentRegistry.js';
import IndexManager from './indexManager.js';
import ApiKeyManager from './apiKeyManager.js';
import eventBus from './eventBus.js';
import unifiedIndexManager from './unifiedIndexManager.js';
import PythonEmbeddingClient from './pythonEmbeddingClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IncrementalPipeline {
    constructor() {
        this.registry = new DocumentRegistry();
        this.indexManager = new IndexManager();
        this.apiKeyManager = new ApiKeyManager();

        // 本地Python Embedding客户端（本小姐的终极武器！）
        this.pythonEmbeddingClient = new PythonEmbeddingClient();

        // 路径配置 - 使用相对路径，便于迁移
        // 相对于后台管理系统backend/src/services目录
        this.basePath = path.resolve(__dirname, '../../../../');  // 教育系统智能体根目录
        this.documentsRoot = path.join(this.basePath, '相关文档');  // 文档根目录
        this.extractDir = path.join(this.basePath, '文档提取');  // 文档提取目录

        // Python脚本路径 - 使用根目录的脚本
        this.extractScript = path.join(this.basePath, 'extract_student_handbook_word.py');
        this.chunkScript = path.join(this.basePath, 'create_chunks_new.py');

        // 指定Python环境 - 使用项目虚拟环境
        this.pythonPath = path.join(this.basePath, '.venv', 'Scripts', 'python.exe');
    }

    /**
     * 执行Python脚本
     */
    async executePythonScript(scriptPath, args) {
        console.log(`[Python] 执行脚本: ${scriptPath}`);
        console.log(`[Python] 参数: ${args.join(' ')}`);

        return new Promise((resolve, reject) => {
            const python = spawn(this.pythonPath, [scriptPath, ...args], {
                cwd: this.basePath
            });

            let stdout = '';
            let stderr = '';

            python.stdout.on('data', (data) => {
                stdout += data.toString();
                process.stdout.write(data);
            });

            python.stderr.on('data', (data) => {
                stderr += data.toString();
                process.stderr.write(data);
            });

            python.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`脚本执行失败 (code ${code}): ${stderr}`));
                }
            });

            python.on('error', (err) => {
                reject(new Error(`Python执行错误: ${err.message}`));
            });
        });
    }

    /**
     * 执行完整流水线
     */
    async processDocument(documentId, options = {}) {
        const {
            onProgress = () => {},
            apiKey = null
        } = options;

        let taskId = null;

        try {
            // 1. 初始化注册表
            await this.registry.initialize();

            // 2. 获取文档信息
            const document = await this.registry.getDocument(documentId);
            if (!document) {
                throw new Error(`文档不存在: ${documentId}`);
            }

            if (document.status === 'indexed') {
                throw new Error(`文档已索引，如需更新请使用rebuild模式`);
            }

            // 3. 生成任务ID
            taskId = this.indexManager.generateTaskId();
            await this.indexManager.initializeProgress(taskId, 6);

            const docDir = path.join(this.documentsRoot, document.directory);
            const sourceFileName = document.sourceFiles[0].fileName;

            // 源文件可能位于：
            // 1. source子目录（新上传且已创建目录结构）
            // 2. 根目录（早期上传或旧格式）
            let sourceFile = path.join(docDir, 'source', sourceFileName);

            try {
                await fs.access(sourceFile);
            } catch {
                // 尝试从根目录读取
                sourceFile = path.join(this.documentsRoot, sourceFileName);
                try {
                    await fs.access(sourceFile);
                    console.log(`✓ 从根目录读取源文件: ${sourceFile}`);
                } catch {
                    throw new Error(`源文件不存在: ${sourceFile}`);
                }
            }

            // ========== 步骤1: 提取文档内容 ==========
            onProgress({ step: 'extract', status: 'processing', message: '正在提取文档内容...', taskId });
            await this.registry.updateDocumentStatus(documentId, 'extracting', {
                step: 'extract',
                status: 'processing',
                details: '正在提取文档内容'
            });
            await this.indexManager.updateProgress(taskId, {
                currentStep: '提取文档内容...',
                completedSteps: 1
            });

            const extractedPath = path.join(docDir, 'extracted', 'content.json');
            await this.executePythonScript(this.extractScript, [sourceFile, extractedPath]);

            // 读取提取结果
            const extractedData = JSON.parse(await fs.readFile(extractedPath, 'utf-8'));
            const totalPages = extractedData.total_pages || extractedData.pages?.length || 0;

            await this.registry.updateDocumentStatus(documentId, 'extracted', {
                step: 'extract',
                status: 'completed',
                details: `提取${totalPages}页内容`,
                statistics: { totalPages }
            });
            await this.indexManager.updateProgress(taskId, {
                currentStep: '文档提取完成',
                completedSteps: 2
            });

            // ========== 步骤2: 智能分块 ==========
            onProgress({ step: 'chunk', status: 'processing', message: '正在进行智能分块...', taskId });
            await this.registry.updateDocumentStatus(documentId, 'chunking', {
                step: 'chunk',
                status: 'processing',
                details: '正在进行智能分块'
            });
            await this.indexManager.updateProgress(taskId, {
                currentStep: '智能分块...',
                completedSteps: 3
            });

            const chunksPath = path.join(docDir, 'chunks', 'chunks.json');
            await this.executePythonScript(this.chunkScript, [extractedPath, chunksPath]);

            // 读取分块结果
            const chunksData = JSON.parse(await fs.readFile(chunksPath, 'utf-8'));
            const chunks = chunksData.chunks;
            const contentType = chunksData.metadata?.content_type || 'general';

            await this.registry.updateDocumentStatus(documentId, 'chunked', {
                step: 'chunk',
                status: 'completed',
                details: `生成${chunks.length}个文档块 (${contentType})`,
                statistics: { totalChunks: chunks.length }
            });
            await this.indexManager.updateProgress(taskId, {
                currentStep: '分块完成',
                completedSteps: 4
            });

            // ========== 步骤3: 向量化 ==========
            onProgress({ step: 'embed', status: 'processing', message: '正在生成向量...', taskId });
            await this.registry.updateDocumentStatus(documentId, 'indexing', {
                step: 'embed',
                status: 'processing',
                details: '正在生成向量'
            });
            await this.indexManager.updateProgress(taskId, {
                currentStep: '生成向量...',
                completedSteps: 5
            });

            // 向量化（使用本地Python服务，不需要API密钥）
            const chunksWithEmbeddings = await this.generateEmbeddings(
                chunks,
                null, // 不再需要API密钥
                (current, total) => {
                    const progress = Math.floor((current / total) * 100);
                    onProgress({
                        step: 'embed',
                        status: 'processing',
                        message: `向量化中... (${current}/${total})`,
                        progress
                    });
                }
            );

            // ========== 步骤4: 初始化统一索引管理器并添加到统一索引 ==========
            onProgress({ step: 'register', status: 'processing', message: '正在注册到统一索引...', taskId });
            await this.indexManager.updateProgress(taskId, {
                currentStep: '注册到统一索引...',
                completedSteps: 6
            });

            // ✨ 关键修复：确保统一索引管理器已初始化
            if (!unifiedIndexManager.initialized) {
                console.log('📂 初始化统一索引管理器...');
                await unifiedIndexManager.initialize();
            }

            // 使用统一索引管理器——所有服务都从这里读取！
            // chunksWithEmbeddings 已包含 embedding，直接传入避免重复 API 调用
            await unifiedIndexManager.addDocument(
                documentId,
                chunksWithEmbeddings,
                document,
                true // skipRegenerateEmbeddings=true：使用已有的embedding
            );

            // ========== 完成 ==========
            await this.registry.updateDocumentStatus(documentId, 'indexed', {
                step: 'register',
                status: 'completed',
                details: '文档已成功索引到统一索引',
                statistics: {
                    indexedChunks: chunksWithEmbeddings.length
                }
            });
            await this.indexManager.completeTask(taskId, {
                pages: totalPages,
                chunks: chunksWithEmbeddings.length
            });

            onProgress({
                step: 'complete',
                status: 'completed',
                message: '处理完成！',
                taskId
            });

            console.log(`\n✅ 文档处理完成: ${document.displayName}`);
            console.log(`   - 页数: ${totalPages}`);
            console.log(`   - 分块: ${chunksWithEmbeddings.length}`);
            console.log(`   - 索引: ${(await import('./projectConfig.js')).default.getIndexPath ? '(统一索引)' : '?'}`);

            // 注意：eventBus.notifyIndexed() 已在 unifiedIndexManager.addDocument() 内部调用
            // UnifiedIndexManager 订阅该事件后会重新加载索引内存缓存

            return {
                success: true,
                documentId,
                taskId,
                statistics: {
                    pages: totalPages,
                    chunks: chunksWithEmbeddings.length,
                    contentType
                }
            };

        } catch (error) {
            console.error(`\n❌ 文档处理失败:`, error.message);

            // 标记为错误状态
            if (documentId) {
                await this.registry.updateDocumentStatus(documentId, 'error', {
                    step: 'process',
                    status: 'failed',
                    details: error.message
                });
            }

            if (taskId) {
                await this.indexManager.failTask(taskId, error);
            }

            onProgress({
                step: 'error',
                status: 'failed',
                message: error.message,
                taskId
            });

            throw error;
        }
    }

    /**
     * 批量生成向量（使用本地Python服务）
     */
    async generateEmbeddings(chunks, apiKey, onProgress) {
        const chunksWithEmbeddings = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            try {
                // 使用本地Python服务生成embedding（完全免费，无限流！）
                const embedding = await this.pythonEmbeddingClient.getEmbedding(
                    chunk.full_context || chunk.text
                );

                chunksWithEmbeddings.push({
                    ...chunk,
                    embedding: embedding
                });

                if (onProgress) {
                    onProgress(i + 1, chunks.length);
                }

            } catch (error) {
                throw new Error(`向量生成失败 (chunk ${i}): ${error.message}`);
            }
        }

        console.log(`\n✓ 向量化完成: ${chunksWithEmbeddings.length} 个向量`);
        return chunksWithEmbeddings;
    }

    /**
     * 删除文档（从注册表和所有索引中移除，保留源文件）
     */
    async deleteDocument(documentId) {
        // 获取文档信息用于事件
        const docInfo = await this.registry.getDocument(documentId);

        // 1. 从统一索引中移除（Single Source of Truth）
        try {
            await unifiedIndexManager.removeDocument(documentId);
            console.log(`✓ 文档已从统一索引删除: ${documentId}`);
            // eventBus.notifyDeleted() 已在 unifiedIndexManager.removeDocument() 内部调用
        } catch (error) {
            console.log(`⚠️ 文档不在统一索引中: ${documentId}`);
            // 即使不在统一索引中，也发布删除事件确保一致性
            eventBus.notifyDeleted(documentId);
        }

        // 2. 从旧索引中移除（向后兼容，防止残留数据）
        try {
            await this.indexManager.removeDocumentFromIndex(documentId);
        } catch (error) {
            // 忽略，旧索引可能本来就没有这个文档
        }

        // 3. 从注册表中移除
        const document = await this.registry.deleteDocument(documentId);

        // 4. 删除处理结果目录（保留source目录）
        const docDir = path.join(this.documentsRoot, document.directory);
        const extractedDir = path.join(docDir, 'extracted');
        const chunksDir = path.join(docDir, 'chunks');

        try {
            await fs.rm(extractedDir, { recursive: true, force: true });
            await fs.rm(chunksDir, { recursive: true, force: true });
            console.log(`✓ 处理结果已清除: ${document.directory}`);
        } catch (error) {
            console.warn(`⚠️ 清除处理结果失败: ${error.message}`);
        }

        return document;
    }

    /**
     * 重建单个文档索引
     */
    async rebuildDocument(documentId, options = {}) {
        // 1. 获取文档信息
        const document = await this.registry.getDocument(documentId);
        if (!document) {
            throw new Error('文档不存在，无法重建');
        }

        // 2. 确保源文件存在
        const sourceFileName = document.sourceFiles[0].fileName;
        let sourceFile = path.join(this.documentsRoot, document.directory, 'source', sourceFileName);

        try {
            await fs.access(sourceFile);
        } catch {
            // 尝试从根目录读取
            sourceFile = path.join(this.documentsRoot, sourceFileName);
            try {
                await fs.access(sourceFile);
            } catch {
                throw new Error(`源文件不存在: ${sourceFile}`);
            }
        }

        // 3. 从统一索引中移除旧数据（如果存在）
        try {
            await unifiedIndexManager.removeDocument(documentId);
        } catch (e) {
            // 忽略，文档可能本来就不在统一索引中
        }

        // 3b. 同时从旧索引中移除（向后兼容）
        try {
            await this.indexManager.removeDocumentFromIndex(documentId);
        } catch (e) {
            // 忽略
        }

        // 4. 清除处理结果
        const docDir = path.join(this.documentsRoot, document.directory);
        const extractedDir = path.join(docDir, 'extracted');
        const chunksDir = path.join(docDir, 'chunks');

        try {
            await fs.rm(extractedDir, { recursive: true, force: true });
            await fs.rm(chunksDir, { recursive: true, force: true });
            await fs.mkdir(extractedDir, { recursive: true });
            await fs.mkdir(chunksDir, { recursive: true });
        } catch (error) {
            console.warn(`⚠️ 清除处理结果失败: ${error.message}`);
        }

        // 5. 重置状态
        await this.registry.updateDocumentStatus(documentId, 'pending');

        // 6. 重新处理
        return await this.processDocument(documentId, options);
    }

    /**
     * 获取处理状态
     */
    async getProcessingStatus(documentId) {
        const document = await this.registry.getDocument(documentId);
        if (!document) {
            return null;
        }

        return {
            documentId: document.documentId,
            name: document.displayName,
            status: document.status,
            statistics: document.statistics,
            processingHistory: document.processingHistory,
            lastUpdate: document.updatedAt
        };
    }
}

export default IncrementalPipeline;
