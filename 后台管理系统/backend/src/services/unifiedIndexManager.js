/**
 * 统一索引管理器 - 多文档知识库的核心
 *
 * 统一管理所有文档的向量索引，支持事件驱动同步
 *
 * @author 哈雷酱 (￣▽￣)／
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import eventBus from './eventBus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UnifiedIndexManager {
    constructor() {
        // 索引数据（内存缓存）
        this.index = null;
        this.embeddingCache = new Map();
        this.embeddingCacheMetadata = new Map(); // 缓存元数据

        // 配置
        this.ZHIPUAI_EMBEDDING_URL = 'https://open.bigmodel.cn/api/paas/v4/embeddings';
    }

    /**
     * 初始化
     */
    async initialize() {
        // 确保目录存在
        await this.ensureDirectories();

        // 加载索引
        await this.loadIndex();

        // 加载缓存
        await this.loadCache();

        console.log(`✓ 统一索引管理器初始化完成`);
        console.log(`  - 文档数: ${this.index.documents.length}`);
        console.log(`  - chunks数: ${this.index.chunks.length}`);
        console.log(`  - 缓存数: ${this.embeddingCache.size}`);

        // 订阅事件
        this.subscribeToEvents();
    }

    /**
     * 订阅事件
     */
    subscribeToEvents() {
        const EventTypes = eventBus.constructor.EventTypes;

        // 当索引被更新时，重新加载
        eventBus.on(EventTypes.INDEX_UPDATED, async (event) => {
            console.log('📢 [UnifiedIndexManager] 收到索引更新事件，重新加载...');
            await this.loadIndex();
            await this.loadCache();
        });

        eventBus.on(EventTypes.INDEX_REBUILT, async (event) => {
            console.log('📢 [UnifiedIndexManager] 收到索引重建事件，重新加载...');
            await this.loadIndex();
            await this.loadCache();
        });

        eventBus.on(EventTypes.INDEX_CLEARED, async (event) => {
            console.log('📢 [UnifiedIndexManager] 收到索引清空事件，重新加载...');
            await this.loadIndex();
            await this.loadCache();
        });

        // 当有新文档被索引时，也重新加载（修复：原来缺失了这个订阅！）
        eventBus.on(EventTypes.DOCUMENT_INDEXED, async (event) => {
            console.log(`📢 [UnifiedIndexManager] 收到文档索引事件: ${event.data?.documentId}，重新加载...`);
            await this.loadIndex();
            await this.loadCache();
        });

        // 当有文档被删除时，也重新加载
        eventBus.on(EventTypes.DOCUMENT_DELETED, async (event) => {
            console.log(`📢 [UnifiedIndexManager] 收到文档删除事件: ${event.data?.documentId}，重新加载...`);
            await this.loadIndex();
            await this.loadCache();
        });
    }

    /**
     * 确保目录存在
     */
    async ensureDirectories() {
        const config = await this.getConfig();
        await fs.mkdir(path.dirname(config.paths.retrievalIndex), { recursive: true });
        await fs.mkdir(config.paths.indexDir, { recursive: true });
    }

    /**
     * 获取配置
     */
    async getConfig() {
        // 动态导入projectConfig
        const { default: projectConfig } = await import('./projectConfig.js');
        return await projectConfig.getConfig();
    }

    /**
     * 加载索引
     */
    async loadIndex() {
        const config = await this.getConfig();
        const indexPath = config.paths.retrievalIndex;

        try {
            const data = await fs.readFile(indexPath, 'utf-8');
            this.index = JSON.parse(data);

            // 确保结构完整
            if (!this.index.documents) {
                this.index.documents = [];
            }
            if (!this.index.chunks) {
                this.index.chunks = [];
            }
            if (!this.index.metadata) {
                this.index.metadata = {
                    totalDocuments: this.index.documents.length,
                    totalChunks: this.index.chunks.length,
                    provider: 'ZHIPU',
                    model: 'embedding-3'
                };
            }

            console.log(`✓ 索引已加载: ${this.index.chunks.length} chunks`);
            return this.index;
        } catch (error) {
            console.log(`⚠️ 未找到索引文件，创建新索引...`);
            this.index = this.createEmptyIndex();
            await this.saveIndex();
            return this.index;
        }
    }

    /**
     * 创建空索引
     */
    createEmptyIndex() {
        return {
            version: '2.0',
            timestamp: new Date().toISOString(),
            metadata: {
                totalDocuments: 0,
                totalChunks: 0,
                provider: 'ZHIPU',
                model: 'embedding-3',
                dimension: 2048
            },
            documents: [],
            chunks: []
        };
    }

    /**
     * 保存索引
     */
    async saveIndex() {
        const config = await this.getConfig();
        const indexPath = config.paths.retrievalIndex;

        this.index.timestamp = new Date().toISOString();
        this.index.metadata.totalDocuments = this.index.documents.length;
        this.index.metadata.totalChunks = this.index.chunks.length;

        await fs.writeFile(indexPath, JSON.stringify(this.index, null, 2), 'utf-8');
        console.log(`✓ 索引已保存: ${this.index.chunks.length} chunks`);
    }

    /**
     * 加载Embedding缓存
     */
    async loadCache() {
        const config = await this.getConfig();
        const cachePath = config.paths.embeddingCache;

        try {
            const data = await fs.readFile(cachePath, 'utf-8');
            const cache = JSON.parse(data);

            // 支持新格式 {version, updatedAt, cache: {chunkId: {documentId, embedding}}}
            if (cache.cache) {
                this.embeddingCacheMetadata = cache;
                for (const [chunkId, entry] of Object.entries(cache.cache)) {
                    this.embeddingCache.set(chunkId, entry.embedding);
                }
            }
            // 兼容旧格式 [[chunkId, embedding], ...]
            else if (Array.isArray(data)) {
                const cacheArray = JSON.parse(data);
                for (const entry of cacheArray) {
                    if (entry.length === 2 && typeof entry[0] === 'string') {
                        this.embeddingCache.set(entry[0], entry[1]);
                    }
                }
            }

            console.log(`✓ 缓存已加载: ${this.embeddingCache.size} 条记录`);
        } catch (error) {
            console.log(`⚠️ 未找到缓存文件，创建新缓存...`);
            this.embeddingCache.clear();
            this.embeddingCacheMetadata = {
                version: '2.0',
                updatedAt: new Date().toISOString(),
                cache: {}
            };
        }
    }

    /**
     * 保存Embedding缓存
     */
    async saveCache() {
        const config = await this.getConfig();
        const cachePath = config.paths.embeddingCache;

        this.embeddingCacheMetadata = {
            version: '2.0',
            updatedAt: new Date().toISOString(),
            cache: {}
        };

        for (const [chunkId, embedding] of this.embeddingCache.entries()) {
            // 从chunks中查找documentId
            const chunk = this.index.chunks.find(c => c.chunkId == chunkId);
            this.embeddingCacheMetadata.cache[chunkId] = {
                documentId: chunk?.documentId || 'unknown',
                embedding: embedding,
                createdAt: new Date().toISOString()
            };
        }

        await fs.writeFile(cachePath, JSON.stringify(this.embeddingCacheMetadata, null, 2), 'utf-8');
        console.log(`✓ 缓存已保存: ${this.embeddingCache.size} 条记录`);
    }

    /**
     * 添加文档到索引
     * @param {string} documentId - 文档ID
     * @param {Array} chunks - 已向量化的chunks（包含embedding字段）
     * @param {Object} documentMeta - 文档元数据
     * @param {boolean} skipRegenerateEmbeddings - 如果chunks已有embedding则跳过重新生成
     */
    async addDocument(documentId, chunks, documentMeta, skipRegenerateEmbeddings = true) {
        // 检查文档是否已存在
        const existingIndex = this.index.documents.findIndex(d => d.documentId === documentId);
        if (existingIndex >= 0) {
            throw new Error(`文档已存在索引中: ${documentId}`);
        }

        // 确定chunkId范围
        const firstChunkId = this.index.chunks.length > 0
            ? Math.max(...this.index.chunks.map(c => c.chunkId)) + 1
            : 1;

        // 添加chunkId到新块
        const chunksWithId = chunks.map((chunk, i) => ({
            chunkId: firstChunkId + i,
            documentId: documentId,
            documentName: documentMeta.displayName || documentMeta.name,
            ...chunk
        }));

        // 添加文档记录
        const docEntry = {
            documentId: documentId,
            name: documentMeta.name,
            displayName: documentMeta.displayName || documentMeta.name,
            description: documentMeta.description || '',
            status: 'indexed',
            indexedAt: new Date().toISOString(),
            statistics: {
                totalChunks: chunksWithId.length,
                firstChunkId: firstChunkId,
                lastChunkId: firstChunkId + chunksWithId.length - 1
            }
        };

        // 合并到索引
        this.index.documents.push(docEntry);
        this.index.chunks.push(...chunksWithId);

        // 为新chunks生成embedding并加入缓存（仅对缺少embedding的chunk）
        for (const chunk of chunksWithId) {
            if (!this.embeddingCache.has(String(chunk.chunkId))) {
                // 如果chunk已有embedding，直接使用；否则重新生成
                if (!chunk.embedding && skipRegenerateEmbeddings) {
                    // 只有在没有预生成embedding时才调用API
                    const embedding = await this.generateEmbedding(chunk.text || chunk.full_context);
                    chunk.embedding = embedding;
                }
                if (chunk.embedding) {
                    this.embeddingCache.set(String(chunk.chunkId), chunk.embedding);
                }
            }
        }

        // 保存
        await this.saveIndex();
        await this.saveCache();

        // 发布事件（让其他服务感知索引变更）
        eventBus.notifyIndexed(documentId, documentMeta, chunksWithId);

        console.log(`✓ 文档已添加到统一索引: ${documentMeta.displayName} (${chunksWithId.length} chunks)`);
        return this.index;
    }

    /**
     * 从索引中删除文档
     */
    async removeDocument(documentId) {
        const docIndex = this.index.documents.findIndex(d => d.documentId === documentId);
        if (docIndex < 0) {
            throw new Error(`文档不在索引中: ${documentId}`);
        }

        const doc = this.index.documents[docIndex];

        // 收集要删除的chunkIds
        const chunkIdsToRemove = this.index.chunks
            .filter(c => c.documentId === documentId)
            .map(c => String(c.chunkId));

        // 从索引中移除
        this.index.chunks = this.index.chunks.filter(c => c.documentId !== documentId);
        this.index.documents.splice(docIndex, 1);

        // 从缓存中移除
        for (const chunkId of chunkIdsToRemove) {
            this.embeddingCache.delete(chunkId);
        }

        // 保存
        await this.saveIndex();
        await this.saveCache();

        // 发布事件
        eventBus.notifyDeleted(documentId);

        console.log(`✓ 文档已从索引删除: ${doc.displayName} (${chunkIdsToRemove.length} chunks)`);
        return { removed: doc, chunksRemoved: chunkIdsToRemove.length };
    }

    /**
     * 生成Embedding
     */
    async generateEmbedding(text, apiKey = null) {
        // 获取API Key
        if (!apiKey) {
            const { default: projectConfig } = await import('./projectConfig.js');
            apiKey = process.env.ZHIPUAI_API_KEY;
        }

        try {
            const response = await axios.post(
                this.ZHIPUAI_EMBEDDING_URL,
                {
                    model: 'embedding-3',
                    input: text,
                    encoding_format: 'float'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            return response.data.data[0].embedding;
        } catch (error) {
            console.error('Embedding生成失败:', error.message);
            throw error;
        }
    }

    /**
     * 检索相关chunks
     */
    async retrieve(queryEmbedding, options = {}) {
        const { topK = 5, minScore = 0.3 } = options;

        const scores = [];
        for (const chunk of this.index.chunks) {
            let embedding = chunk.embedding;

            // 尝试从缓存获取
            if (!embedding && this.embeddingCache.has(String(chunk.chunkId))) {
                embedding = this.embeddingCache.get(String(chunk.chunkId));
            }

            if (embedding) {
                const score = this.cosineSimilarity(queryEmbedding, embedding);
                if (score >= minScore) {
                    scores.push({
                        chunk,
                        score
                    });
                }
            }
        }

        // 排序并返回topK
        scores.sort((a, b) => b.score - a.score);
        return scores.slice(0, topK);
    }

    /**
     * 计算余弦相似度
     */
    cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        const docStats = {};
        for (const doc of this.index.documents) {
            const chunks = this.index.chunks.filter(c => c.documentId === doc.documentId);
            docStats[doc.documentId] = {
                name: doc.displayName,
                chunks: chunks.length
            };
        }

        return {
            totalDocuments: this.index.documents.length,
            totalChunks: this.index.chunks.length,
            documents: docStats,
            cacheSize: this.embeddingCache.size
        };
    }

    /**
     * 清空索引
     */
    async clearIndex() {
        this.index = this.createEmptyIndex();
        this.embeddingCache.clear();
        this.embeddingCacheMetadata = {
            version: '2.0',
            updatedAt: new Date().toISOString(),
            cache: {}
        };

        await this.saveIndex();
        await this.saveCache();

        // 发布事件
        eventBus.emit(eventBus.EventTypes.INDEX_CLEARED);

        console.log('✓ 索引已清空');
    }
}

export default new UnifiedIndexManager();
