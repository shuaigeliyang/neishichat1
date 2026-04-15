/**
 * Python Embedding服务的客户端（ES6模块版本）
 * 设计师：哈雷酱 (￣▽￣)ﾉ
 * 功能：通过HTTP调用本地Python embedding服务
 */

import axios from 'axios';
import { promises as fs } from 'fs';

class PythonEmbeddingClient {
    constructor(serviceUrl = 'http://localhost:5001') {
        this.serviceUrl = serviceUrl;
        this.cache = new Map();
        this.cacheFilePath = new URL('./python_embedding_client_cache.json', import.meta.url).pathname;
        this.isAvailable = false;

        // 启动时加载缓存
        this.loadCacheFromFile();
    }

    /**
     * 检查服务是否可用
     */
    async checkService() {
        try {
            const response = await axios.get(`${this.serviceUrl}/health`, {
                timeout: 5000
            });
            this.isAvailable = true;
            console.log('[OK] Python Embedding服务可用');
            console.log('  模型:', response.data.model);
            console.log('  缓存:', response.data.cache_size, '条记录');
            return true;
        } catch (error) {
            this.isAvailable = false;
            console.log('[ERROR] Python Embedding服务不可用');
            console.log('  请运行: python local_embedding_service.py');
            return false;
        }
    }

    /**
     * 确保服务可用
     */
    async ensureService() {
        if (!this.isAvailable) {
            const available = await this.checkService();
            if (!available) {
                throw new Error('Python Embedding服务不可用，请先启动服务');
            }
        }
    }

    /**
     * 为单个文本生成向量
     */
    async getEmbedding(text) {
        await this.ensureService();

        // 检查缓存
        const cacheKey = this.hashText(text);
        if (this.cache.has(cacheKey)) {
            console.log('[OK] 使用缓存的embedding');
            return this.cache.get(cacheKey);
        }

        try {
            console.log('[INFO] 调用Python Embedding服务...');
            const startTime = Date.now();

            const response = await axios.post(`${this.serviceUrl}/embed`, {
                text: text
            }, {
                timeout: 30000
            });

            const duration = Date.now() - startTime;
            console.log(`[OK] Embedding生成完成！耗时: ${duration}ms`);

            const embedding = response.data.embedding;

            // 缓存结果
            this.cache.set(cacheKey, embedding);
            await this.saveCacheToFile();

            return embedding;

        } catch (error) {
            console.error('[ERROR] Embedding生成失败:', error.message);
            throw error;
        }
    }

    /**
     * 批量生成向量
     */
    async getBatchEmbeddings(texts, batchSize = 8) {
        await this.ensureService();

        const embeddings = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            console.log(`  - 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

            try {
                const response = await axios.post(`${this.serviceUrl}/embed_batch`, {
                    texts: batch
                }, {
                    timeout: 60000
                });

                embeddings.push(...response.data.embeddings);

            } catch (error) {
                console.error('[ERROR] 批量Embedding生成失败:', error.message);
                throw error;
            }
        }

        return embeddings;
    }

    /**
     * 为文档块生成向量
     */
    async embedChunks(chunks) {
        console.log(`[INFO] 开始为${chunks.length}个文档块生成向量...`);

        const texts = chunks.map(chunk => chunk.full_context || chunk.text);
        const embeddings = await this.getBatchEmbeddings(texts);

        const chunksWithEmbeddings = chunks.map((chunk, index) => ({
            ...chunk,
            embedding: embeddings[index]
        }));

        console.log('[OK] 向量化完成！');
        return chunksWithEmbeddings;
    }

    /**
     * 计算余弦相似度
     */
    async cosineSimilarity(vec1, vec2) {
        if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        return norm1 && norm2 ? dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2)) : 0;
    }

    /**
     * 找到最相似的文档块
     */
    async findMostSimilar(questionEmbedding, chunks, topK = 5, minScore = 0.3) {
        const similarities = chunks.map(chunk => {
            const embedding = chunk.embedding;
            if (!embedding) {
                return { chunk, score: 0 };
            }

            const score = this.cosineSimilarity(questionEmbedding, embedding);
            return { chunk, score };
        });

        const topKResults = similarities
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .filter(item => item.score >= minScore);

        return topKResults;
    }

    /**
     * 文本哈希（用于缓存）
     */
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    /**
     * 保存缓存到文件
     */
    async saveCacheToFile() {
        try {
            const cacheData = Array.from(this.cache.entries());
            await fs.writeFile(this.cacheFilePath, JSON.stringify(cacheData), 'utf-8');
        } catch (error) {
            console.error('[ERROR] 保存缓存文件失败：', error.message);
        }
    }

    /**
     * 从文件加载缓存
     */
    async loadCacheFromFile() {
        try {
            const data = await fs.readFile(this.cacheFilePath, 'utf-8');
            const cacheData = JSON.parse(data);
            this.cache = new Map(cacheData);
            console.log(`[OK] 已加载embedding缓存，共${this.cache.size}条记录`);
        } catch (error) {
            console.log('[INFO] 未找到缓存文件，将创建新缓存');
        }
    }

    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            serviceAvailable: this.isAvailable
        };
    }
}

export default PythonEmbeddingClient;
