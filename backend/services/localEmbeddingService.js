/**
 * 本地向量化服务
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：使用本地模型进行文本向量化，完全避免API调用和限流！
 *
 * 优势：
 * - ✅ 完全免费，无API调用
 * - ✅ 无限并发，不怕多用户
 * - ✅ 数据隐私，所有计算在本地
 * - ✅ 无网络延迟，响应更快
 *
 * 劣势：
 * - ❌ 首次加载需要下载模型（约几百MB）
 * - ❌ 需要一定内存和CPU
 * - ❌ 模型效果可能略低于API
 */

const fs = require('fs').promises;
const path = require('path');

class LocalEmbeddingService {
    constructor(cacheFilePath = './local_embedding_cache.json') {
        this.model = null;
        this.modelName = 'Xenova/all-MiniLM-L6-v2'; // 轻量级但效果不错的模型
        this.cacheFilePath = cacheFilePath;
        this.cache = new Map();
        this.isModelLoaded = false;
        this.dimension = 384; // all-MiniLM-L6-v2的向量维度

        // 启动时加载缓存
        this.loadCacheFromFile();
    }

    /**
     * 加载模型（首次调用时会自动下载模型）
     */
    async loadModel() {
        if (this.isModelLoaded) {
            return;
        }

        console.log('🔄 正在加载本地embedding模型...');
        console.log(`   模型：${this.modelName}`);
        console.log('   ⏳ 首次运行需要下载模型（约400MB），请耐心等待...');

        try {
            // 动态导入transformers（避免启动时就加载）
            const { pipeline } = await import('@xenova/transformers');

            // 创建特征提取pipeline
            this.model = await pipeline('feature-extraction', this.modelName, {
                progress_callback: (progress) => {
                    if (progress.status === 'downloading') {
                        const percent = progress.progress ? progress.progress.toFixed(2) : 0;
                        console.log(`   📥 下载中... ${percent}%`);
                    } else if (progress.status === 'loading') {
                        console.log('   📦 加载模型中...');
                    }
                }
            });

            this.isModelLoaded = true;
            console.log('✅ 模型加载完成！\n');
        } catch (error) {
            console.error('❌ 模型加载失败：', error.message);
            throw new Error(`本地embedding模型加载失败: ${error.message}`);
        }
    }

    /**
     * 为单个文本生成向量
     */
    async getEmbedding(text) {
        // 确保模型已加载
        if (!this.isModelLoaded) {
            await this.loadModel();
        }

        // 检查缓存
        const cacheKey = this.hashText(text);
        if (this.cache.has(cacheKey)) {
            console.log('✓ 使用缓存的embedding');
            return this.cache.get(cacheKey);
        }

        try {
            // 使用模型生成embedding
            const output = await this.model(text, {
                pooling: 'mean', // 使用平均池化
                normalize: true  // 归一化向量
            });

            // 提取向量数据
            const embedding = Array.from(output.data);

            // 缓存结果
            this.cache.set(cacheKey, embedding);

            // 持久化到文件
            await this.saveCacheToFile();

            return embedding;
        } catch (error) {
            console.error('✗ 本地向量化失败：', error.message);
            throw error;
        }
    }

    /**
     * 批量生成向量
     */
    async getBatchEmbeddings(texts, batchSize = 10) {
        const embeddings = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            console.log(`  - 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

            const batchPromises = batch.map(text => this.getEmbedding(text));
            const batchResults = await Promise.all(batchPromises);
            embeddings.push(...batchResults);

            // 本地模型不需要延迟，但为了系统稳定性可以短暂休息
            await this.sleep(100);
        }

        return embeddings;
    }

    /**
     * 为文档块生成向量
     */
    async embedChunks(chunks) {
        console.log(`✓ 开始为${chunks.length}个文档块生成向量（本地模型）...`);

        // 使用full_context（包含上下文）进行向量化
        const texts = chunks.map(chunk => chunk.full_context || chunk.text);

        const embeddings = await this.getBatchEmbeddings(texts);

        // 将向量添加到文档块
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
        if (vec1.length !== vec2.length) {
            throw new Error('向量长度不一致');
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
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

        // 排序并取Top-K
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
     * 保存缓存到文件
     */
    async saveCacheToFile() {
        try {
            const cacheData = Array.from(this.cache.entries());
            await fs.writeFile(this.cacheFilePath, JSON.stringify(cacheData), 'utf-8');
        } catch (error) {
            console.error('✗ 保存缓存文件失败：', error.message);
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
            console.log(`✓ 已加载本地embedding缓存，共${this.cache.size}条记录`);
        } catch (error) {
            console.log('✗ 未找到缓存文件，将创建新缓存');
        }
    }

    /**
     * 保存向量缓存（兼容旧接口）
     */
    async saveCache(filePath) {
        try {
            const cacheData = Array.from(this.cache.entries());
            await fs.writeFile(filePath, JSON.stringify(cacheData), 'utf-8');
            console.log(`✓ 向量缓存已保存到：${filePath}`);
        } catch (error) {
            console.error('✗ 保存缓存失败：', error.message);
        }
    }

    /**
     * 加载向量缓存（兼容旧接口）
     */
    async loadCache(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const cacheData = JSON.parse(data);
            this.cache = new Map(cacheData);
            console.log(`✓ 向量缓存已加载，共${this.cache.size}条`);
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
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
            modelLoaded: this.isModelLoaded,
            dimension: this.dimension
        };
    }

    /**
     * 清理资源
     */
    async dispose() {
        if (this.model) {
            // 释放模型资源
            this.model = null;
            this.isModelLoaded = false;
            console.log('✓ 本地embedding模型已释放');
        }
    }
}

// 导出
module.exports = LocalEmbeddingService;

// 如果直接运行此文件
if (require.main === module) {
    (async () => {
        const localService = new LocalEmbeddingService();

        try {
            // 测试向量化
            const testTexts = [
                '重修管理办法',
                '奖学金申请流程',
                '学生违纪处分条例'
            ];

            console.log('📋 测试本地embedding服务\n');

            for (const text of testTexts) {
                console.log(`\n测试文本：${text}`);
                const embedding = await localService.getEmbedding(text);
                console.log(`✓ 向量维度：${embedding.length}`);
            }

            // 显示缓存统计
            const stats = localService.getCacheStats();
            console.log('\n📊 缓存统计：', stats);

            // 测试相似度计算
            console.log('\n📊 测试相似度计算：');
            const emb1 = await localService.getEmbedding('重修管理办法');
            const emb2 = await localService.getEmbedding('课程重修规定');
            const emb3 = await localService.getEmbedding('奖学金申请');

            const sim1 = localService.cosineSimilarity(emb1, emb2);
            const sim2 = localService.cosineSimilarity(emb1, emb3);

            console.log(`   "重修管理办法" vs "课程重修规定": ${sim1.toFixed(3)}`);
            console.log(`   "重修管理办法" vs "奖学金申请": ${sim2.toFixed(3)}`);

            // 释放资源
            await localService.dispose();

            console.log('\n✅ 测试完成！');

        } catch (error) {
            console.error('\n❌ 测试失败：', error);
            await localService.dispose();
            process.exit(1);
        }
    })();
}
