/**
 * 本地Embedding服务
 * 设计师：哈雷酱 (￣▽￣)ﾉ
 * 功能：使用本地模型生成文本向量，无需API调用
 *
 * 优势：
 * - 无需API key
 * - 无限流问题
 * - 完全免费
 * - 数据隐私
 */

const { pipeline, env } = require('@xenova/transformers');

class LocalEmbeddingService {
    constructor(modelName = 'Xenova/all-MiniLM-L6-v2') {
        this.modelName = modelName;
        this.generator = null;
        this.cache = new Map();
        this.cacheFilePath = './local_embedding_cache.json';
        this.isInitialized = false;

        // 配置模型缓存目录
        env.allowLocalModels = false;
        env.allowRemoteModels = true;

        // 启动时自动加载缓存
        this.loadCacheFromFile();
    }

    /**
     * 初始化模型
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('📦 正在加载本地Embedding模型...');
            console.log('   模型:', this.modelName);
            console.log('   这可能需要几分钟，请耐心等待...');

            // 使用量化模型减少内存占用
            this.generator = await pipeline('feature-extraction', this.modelName, {
                quantized: true,
                progress_callback: (progress) => {
                    if (progress.status === 'downloading') {
                        const percent = progress.progress ? progress.progress.toFixed(2) : '0.00';
                        process.stdout.write(`\r   下载中: ${percent}%`);
                    } else if (progress.status === 'loading') {
                        process.stdout.write(`\r   加载中: ${progress.file || '模型文件'}`);
                    }
                }
            });

            console.log('\n✓ 模型加载完成！');
            this.isInitialized = true;

            // 显示模型信息
            const modelInfo = this.generator.model.config;
            console.log('   模型信息:');
            console.log('   - 向量维度:', modelInfo.hidden_size || '384');
            console.log('   - 最大序列长度:', modelInfo.max_position_embeddings || '512');
            console.log('');

        } catch (error) {
            console.error('\n✗ 模型加载失败:', error.message);
            throw error;
        }
    }

    /**
     * 为单个文本生成向量
     */
    async getEmbedding(text) {
        // 确保模型已初始化
        if (!this.isInitialized) {
            await this.initialize();
        }

        // 检查缓存
        const cacheKey = this.hashText(text);
        if (this.cache.has(cacheKey)) {
            console.log('✓ 使用缓存的embedding');
            return this.cache.get(cacheKey);
        }

        try {
            console.log('🔄 生成本地embedding...');
            const startTime = Date.now();

            // 生成向量
            const output = await this.generator(text, {
                pooling: 'mean',
                normalize: true
            });

            const embedding = Array.from(output.data);
            const duration = Date.now() - startTime;

            console.log(`✓ Embedding生成完成！耗时: ${duration}ms`);
            console.log(`   向量维度: ${embedding.length}`);

            // 缓存结果
            this.cache.set(cacheKey, embedding);
            await this.saveCacheToFile();

            return embedding;

        } catch (error) {
            console.error('✗ Embedding生成失败:', error.message);
            throw error;
        }
    }

    /**
     * 批量生成向量
     */
    async getBatchEmbeddings(texts, batchSize = 8) {
        const embeddings = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            console.log(`  - 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

            // 批量处理
            const batchPromises = batch.map(text => this.getEmbedding(text));
            const batchResults = await Promise.all(batchPromises);
            embeddings.push(...batchResults);

            // 避免内存占用过高
            if (i + batchSize < texts.length) {
                await this.sleep(500);
            }
        }

        return embeddings;
    }

    /**
     * 为文档块生成向量
     */
    async embedChunks(chunks) {
        console.log(`✓ 开始为${chunks.length}个文档块生成本地向量...`);

        const texts = chunks.map(chunk => chunk.full_context || chunk.text);
        const embeddings = await this.getBatchEmbeddings(texts);

        const chunksWithEmbeddings = chunks.map((chunk, index) => ({
            ...chunk,
            embedding: embeddings[index]
        }));

        console.log('✓ 向量化完成！');
        return chunksWithEmbeddings;
    }

    /**
     * 计算余弦相似度
     */
    cosineSimilarity(vec1, vec2) {
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
     * 延时函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 保存向量缓存到文件
     */
    async saveCacheToFile() {
        try {
            const fs = require('fs').promises;
            const cacheData = Array.from(this.cache.entries());
            await fs.writeFile(this.cacheFilePath, JSON.stringify(cacheData), 'utf-8');
        } catch (error) {
            console.error('✗ 保存缓存文件失败：', error.message);
        }
    }

    /**
     * 从文件加载向量缓存
     */
    async loadCacheFromFile() {
        try {
            const fs = require('fs').promises;
            const data = await fs.readFile(this.cacheFilePath, 'utf-8');
            const cacheData = JSON.parse(data);
            this.cache = new Map(cacheData);
            console.log(`✓ 已加载本地embedding缓存，共${this.cache.size}条记录`);
        } catch (error) {
            console.log('✗ 未找到缓存文件，将创建新缓存');
        }
    }

    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            isInitialized: this.isInitialized
        };
    }
}

// 导出
module.exports = LocalEmbeddingService;

// 如果直接运行此文件
if (require.main === module) {
    (async () => {
        console.log('========================================');
        console.log('本地Embedding服务测试');
        console.log('========================================\n');

        const service = new LocalEmbeddingService();

        try {
            await service.initialize();

            const testText = '重修管理办法';
            console.log('\n测试文本:', testText);

            const embedding = await service.getEmbedding(testText);
            console.log('\n向量维度:', embedding.length);
            console.log('前5个值:', embedding.slice(0, 5).map(v => v.toFixed(6)).join(', '));

            const stats = service.getCacheStats();
            console.log('\n缓存统计:', stats);

            console.log('\n========================================');
            console.log('✅ 测试完成！');
            console.log('========================================');

        } catch (error) {
            console.error('\n测试失败:', error);
            process.exit(1);
        }
    })();
}
