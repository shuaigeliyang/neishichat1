/**
 * 统一索引管理器
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：管理所有政策文档的统一索引
 *
 * 核心职责：
 * - 维护统一索引（unified_index.json）
 * - 聚合所有文档的chunks
 * - 支持增量更新（添加/删除文档）
 * - 向量检索
 */

const fs = require('fs').promises;
const path = require('path');
const EmbeddingService = require('./embeddingService');
const LocalEmbeddingService = require('./localEmbeddingService');

class UnifiedIndexManager {
    constructor(apiKey, options = {}) {
        const basePath = path.resolve(__dirname, '../..');
        this.indexPath = path.join(basePath, '文档库', 'indexes', 'unified_index.json');
        this.indexData = null;

        // Embedding服务配置
        this.embeddingMode = options.embeddingMode || process.env.EMBEDDING_MODE || 'api';
        const cachePath = path.join(basePath, '文档库', 'indexes', 'embedding_cache.json');

        if (this.embeddingMode === 'local') {
            this.embeddingService = new LocalEmbeddingService(cachePath);
            console.log('✓ 统一索引使用本地Embedding服务');
        } else {
            this.embeddingService = new EmbeddingService(apiKey, cachePath);
            console.log('✓ 统一索引使用API Embedding服务');
        }
    }

    /**
     * 初始化统一索引
     */
    async initialize() {
        try {
            await this.loadIndex();

            // 如果不存在或版本不对，创建新的
            if (!this.indexData || this.indexData.version !== '2.0') {
                await this.createIndex();
            }

            return this.indexData;
        } catch (error) {
            console.log('✓ 创建新的统一索引');
            await this.createIndex();
            return this.indexData;
        }
    }

    /**
     * 加载统一索引
     */
    async loadIndex() {
        try {
            const data = await fs.readFile(this.indexPath, 'utf-8');
            this.indexData = JSON.parse(data);
            console.log('✓ 加载统一索引成功');
            console.log(`  - 文档数: ${this.indexData.metadata.totalDocuments}`);
            console.log(`  - 总chunks: ${this.indexData.metadata.totalChunks}`);
            return this.indexData;
        } catch (error) {
            console.log('⚠️ 统一索引不存在，将创建新的');
            return null;
        }
    }

    /**
     * 创建新的统一索引
     */
    async createIndex() {
        this.indexData = {
            version: '2.0',
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                totalDocuments: 0,
                totalChunks: 0,
                provider: this.embeddingMode === 'local' ? 'LOCAL' : 'ZHIPU',
                model: this.embeddingMode === 'local' ? 'bge-small-zh-v1.5' : 'embedding-3',
                dimension: this.embeddingMode === 'local' ? 512 : 2048
            },
            documents: [],
            chunks: []
        };

        await this.saveIndex();
        console.log('✓ 统一索引创建成功');
        return this.indexData;
    }

    /**
     * 保存统一索引
     */
    async saveIndex() {
        this.indexData.metadata.updatedAt = new Date().toISOString();

        // 确保目录存在
        const dir = path.dirname(this.indexPath);
        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(this.indexPath, JSON.stringify(this.indexData, null, 2), 'utf-8');
        console.log('✓ 统一索引已保存');
    }

    /**
     * 添加文档到统一索引
     */
    async addDocument(documentId, documentName, chunks) {
        console.log(`\n✓ 添加文档到统一索引: ${documentName}`);

        // 1. 为chunks生成向量
        console.log(`  - 生成 ${chunks.length} 个 chunks 的向量...`);
        const chunksWithEmbeddings = await this.embeddingService.embedChunks(chunks);

        // 2. 添加documentId和documentName到每个chunk
        const enrichedChunks = chunksWithEmbeddings.map((chunk, idx) => ({
            chunkId: this.getNextChunkId(),
            documentId: documentId,
            documentName: documentName,
            chapter: chunk.chapter_title || chunk.chapter || '',
            page: chunk.page_num || chunk.page || 1,
            text: chunk.text,
            embedding: chunk.embedding
        }));

        // 3. 添加到统一索引
        this.indexData.chunks.push(...enrichedChunks);

        // 4. 更新文档列表
        const existingDocIndex = this.indexData.documents.findIndex(d => d.documentId === documentId);
        if (existingDocIndex >= 0) {
            // 更新现有文档
            this.indexData.documents[existingDocIndex] = {
                documentId: documentId,
                name: documentName,
                indexedAt: new Date().toISOString()
            };
        } else {
            // 添加新文档
            this.indexData.documents.push({
                documentId: documentId,
                name: documentName,
                indexedAt: new Date().toISOString()
            });
            this.indexData.metadata.totalDocuments++;
        }

        // 5. 更新元数据
        this.indexData.metadata.totalChunks = this.indexData.chunks.length;

        // 6. 保存索引
        await this.saveIndex();

        console.log(`  ✓ 已添加 ${enrichedChunks.length} 个 chunks`);
        return enrichedChunks.length;
    }

    /**
     * 从统一索引中删除文档
     */
    async removeDocument(documentId) {
        console.log(`\n✓ 从统一索引删除文档: ${documentId}`);

        // 1. 计算删除前的chunks数量
        const beforeCount = this.indexData.chunks.length;

        // 2. 过滤掉该文档的所有chunks
        this.indexData.chunks = this.indexData.chunks.filter(c => c.documentId !== documentId);

        // 3. 从文档列表中删除
        this.indexData.documents = this.indexData.documents.filter(d => d.documentId !== documentId);

        // 4. 更新元数据
        this.indexData.metadata.totalDocuments = this.indexData.documents.length;
        this.indexData.metadata.totalChunks = this.indexData.chunks.length;

        // 5. 保存索引
        await this.saveIndex();

        const deletedCount = beforeCount - this.indexData.chunks.length;
        console.log(`  ✓ 已删除 ${deletedCount} 个 chunks`);
        return deletedCount;
    }

    /**
     * 向量检索
     */
    async search(queryEmbedding, options = {}) {
        const {
            topK = 5,
            minScore = 0.5,
            documentId = null  // 可选：限制在特定文档内搜索
        } = options;

        // 1. 计算相似度
        const results = this.indexData.chunks
            .filter(chunk => !documentId || chunk.documentId === documentId)
            .map(chunk => {
                const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
                return {
                    ...chunk,
                    score: similarity
                };
            })
            .filter(result => result.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);

        return results;
    }

    /**
     * 计算余弦相似度
     */
    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * 获取下一个chunkId
     */
    getNextChunkId() {
        if (this.indexData.chunks.length === 0) {
            return 1;
        }
        const maxId = Math.max(...this.indexData.chunks.map(c => c.chunkId));
        return maxId + 1;
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        return {
            totalDocuments: this.indexData.metadata.totalDocuments,
            totalChunks: this.indexData.metadata.totalChunks,
            documents: this.indexData.documents.map(doc => ({
                documentId: doc.documentId,
                name: doc.name,
                indexedAt: doc.indexedAt
            }))
        };
    }

    /**
     * 按documentId分组chunks
     */
    groupChunksByDocument(chunks) {
        const grouped = {};
        for (const chunk of chunks) {
            if (!grouped[chunk.documentId]) {
                grouped[chunk.documentId] = {
                    documentId: chunk.documentId,
                    documentName: chunk.documentName,
                    chunks: []
                };
            }
            grouped[chunk.documentId].chunks.push(chunk);
        }
        return Object.values(grouped);
    }
}

module.exports = UnifiedIndexManager;
