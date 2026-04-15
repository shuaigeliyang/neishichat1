/**
 * 完整的文档处理和索引构建服务
 * 实现增量、替换、删除的完整流程
 */
import { spawn } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import ProjectConfigManager from './projectConfigManager.js';
import ApiKeyManager from './apiKeyManager.js';
import IndexManager from './indexManager.js';
import PythonEmbeddingClient from './pythonEmbeddingClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentProcessingService {
    constructor() {
        this.configManager = new ProjectConfigManager();
        this.apiKeyManager = new ApiKeyManager();

        // 本地Python Embedding客户端（本小姐的终极武器！）
        this.pythonEmbeddingClient = new PythonEmbeddingClient();

        // 路径配置
        // ✨ 将索引保存到前台系统的根目录，这样前台系统可以直接使用
        this.basePath = path.resolve(__dirname, '../../../../');
        this.scriptsPath = path.resolve(__dirname, '../scripts');

        // Python脚本路径
        this.extractScript = path.join(this.scriptsPath, 'extract_docx.py');
        this.chunkScript = path.join(this.scriptsPath, 'create_chunks_intelligent.py');
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
     * 提取DOCX文档
     */
    async extractDocument(docxPath, outputPath) {
        try {
            console.log(`提取文档: ${docxPath}`);

            const { stdout, stderr } = await this.executePythonScript(
                this.extractScript,
                [docxPath, outputPath]
            );

            // 读取提取结果
            const result = JSON.parse(await fs.readFile(outputPath, 'utf-8'));

            console.log(`✓ 文档提取完成: ${result.total_pages} 页`);
            return result;
        } catch (error) {
            console.error('文档提取失败:', error);
            throw error;
        }
    }

    /**
     * 智能分块
     */
    async createChunks(documentPath, chunksPath) {
        try {
            console.log(`智能分块: ${documentPath}`);

            const { stdout, stderr } = await this.executePythonScript(
                this.chunkScript,
                [documentPath, chunksPath]
            );

            // 读取分块结果
            const result = JSON.parse(await fs.readFile(chunksPath, 'utf-8'));

            console.log(`✓ 智能分块完成: ${result.metadata.total_chunks} 个块`);
            console.log(`  内容类型: ${result.metadata.content_type}`);
            console.log(`  策略: ${JSON.stringify(result.metadata.strategy)}`);

            return result;
        } catch (error) {
            console.error('智能分块失败:', error);
            throw error;
        }
    }

    /**
     * 批量生成向量（使用本地Python服务）
     */
    async generateEmbeddings(chunks, apiKey, taskId, onUpdate) {
        try {
            const chunksWithEmbeddings = [];
            let cacheHits = 0;

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];

                // 更新进度
                if (onUpdate && i % 5 === 0) {
                    await onUpdate({
                        currentStep: `向量化中... (${i + 1}/${chunks.length})`,
                        completedSteps: i
                    });
                }

                try {
                    // 使用本地Python服务生成embedding（完全免费，无限流！）
                    const embedding = await this.pythonEmbeddingClient.getEmbedding(
                        chunk.full_context || chunk.text
                    );

                    chunksWithEmbeddings.push({
                        ...chunk,
                        embedding: embedding
                    });

                } catch (error) {
                    console.error(`向量生成失败 (chunk ${i}):`, error.message);
                    throw error;
                }
            }

            console.log(`✓ 向量化完成: ${chunksWithEmbeddings.length} 个向量`);
            return chunksWithEmbeddings;
        } catch (error) {
            console.error('向量化失败:', error);
            throw error;
        }
    }

    /**
     * 构建完整索引
     */
    async buildIndex(documentId, filePath, options, taskId) {
        try {
            // 1. 获取API密钥
            const keyConfig = this.configManager.getAvailableApiKey();
            if (!keyConfig) {
                throw new Error('未找到可用的API密钥，请先配置');
            }

            // 2. 准备临时文件路径
            const tempDir = path.join(this.basePath, 'temp');
            await fs.mkdir(tempDir, { recursive: true });

            const timestamp = Date.now();
            const jsonPath = path.join(tempDir, `document_${timestamp}.json`);
            const chunksPath = path.join(tempDir, `chunks_${timestamp}.json`);
            const indexPath = path.join(this.basePath, 'retrieval_index.json');

            // 3. 提取文档（如果是DOCX）
            if (filePath.endsWith('.docx') || filePath.endsWith('.doc')) {
                await this.extractDocument(filePath, jsonPath);
            } else {
                // 如果是JSON，直接复制
                await fs.copyFile(filePath, jsonPath);
            }

            // 4. 智能分块
            const chunksData = await this.createChunks(jsonPath, chunksPath);
            const chunks = chunksData.chunks;

            // 5. 向量化
            const chunksWithEmbeddings = await this.generateEmbeddings(
                chunks,
                keyConfig.apiKey,
                taskId,
                async (update) => {
                    const indexManager = new IndexManager();
                    await indexManager.updateProgress(taskId, update);
                }
            );

            // 6. 创建或更新索引
            const indexData = {
                version: '2.0',
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    totalDocuments: 1,
                    totalChunks: chunksWithEmbeddings.length,
                    provider: 'LOCAL_PYTHON',
                    model: 'embedding-3',
                    dimension: 2048
                },
                documents: [
                    {
                        documentId: documentId,
                        fileName: path.basename(filePath),
                        fileType: path.extname(filePath),
                        fileSize: 0,
                        uploadTime: new Date().toISOString(),
                        indexedTime: new Date().toISOString(),
                        metadata: chunksData.metadata
                    }
                ],
                chunks: chunksWithEmbeddings
            };

            // 7. 保存索引（保存到前台系统根目录）
            console.log(`✓ 正在保存索引到前台系统目录：${indexPath}`);
            await fs.mkdir(path.dirname(indexPath), { recursive: true });
            await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
            console.log(`✓ 索引已保存，前台系统可以直接使用！`);

            // 8. 清理临时文件
            await fs.unlink(jsonPath);
            await fs.unlink(chunksPath);

            console.log(`✓ 索引构建完成`);
            console.log(`✓ 前台系统（端口3000）现在可以使用这个索引了！`);
            return indexData;
        } catch (error) {
            console.error('构建索引失败:', error);
            throw error;
        }
    }

    /**
     * 增量添加文档到索引
     */
    async addToIndex(documentId, filePath, taskId) {
        try {
            // 构建新文档的索引
            const newIndex = await this.buildIndex(documentId, filePath, {}, taskId);

            // 合并到现有索引
            const existingIndexPath = path.join(this.basePath, 'retrieval_index.json');
            const existingData = JSON.parse(await fs.readFile(existingIndexPath, 'utf-8'));

            // 合并
            existingData.metadata.totalDocuments += 1;
            existingData.metadata.totalChunks += newIndex.metadata.totalChunks;
            existingData.metadata.updatedAt = new Date().toISOString();
            existingData.documents.push(...newIndex.documents);
            existingData.chunks.push(...newIndex.chunks);

            // 保存
            await fs.writeFile(existingIndexPath, JSON.stringify(existingData, null, 2));

            console.log(`✓ 增量添加完成`);
            return existingData;
        } catch (error) {
            console.error('增量添加失败:', error);
            throw error;
        }
    }

    /**
     * 替换索引
     */
    async replaceIndex(documentId, filePath, taskId) {
        try {
            // 备份旧索引
            const oldIndexPath = path.join(this.basePath, 'retrieval_index.json');
            const backupPath = path.join(
                this.basePath,
                `retrieval_index_backup_${Date.now()}.json`
            );

            try {
                await fs.copyFile(oldIndexPath, backupPath);
                console.log(`✓ 已备份旧索引: ${backupPath}`);
            } catch (error) {
                console.log('旧索引不存在，跳过备份');
            }

            // 构建新索引
            const newIndex = await this.buildIndex(documentId, filePath, {}, taskId);

            console.log(`✓ 索引替换完成`);
            return newIndex;
        } catch (error) {
            console.error('替换索引失败:', error);
            throw error;
        }
    }

    /**
     * 从索引中删除文档
     */
    async removeFromIndex(documentId) {
        try {
            const indexPath = path.join(this.basePath, 'retrieval_index.json');
            const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));

            // 过滤文档和文档块
            indexData.documents = indexData.documents.filter(
                doc => doc.documentId !== documentId
            );
            indexData.chunks = indexData.chunks.filter(
                chunk => chunk.documentId !== documentId
            );

            // 更新元数据
            indexData.metadata.totalDocuments = indexData.documents.length;
            indexData.metadata.totalChunks = indexData.chunks.length;
            indexData.metadata.updatedAt = new Date().toISOString();

            // 保存
            await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));

            console.log(`✓ 文档已从索引中删除`);
            return indexData;
        } catch (error) {
            console.error('删除文档失败:', error);
            throw error;
        }
    }
}

export default DocumentProcessingService;
