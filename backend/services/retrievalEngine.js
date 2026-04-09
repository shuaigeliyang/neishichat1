/**
 * 检索引擎
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：语义搜索和文档检索
 */

const fs = require('fs').promises;
const path = require('path');
const EmbeddingService = require('./embeddingService');
const LocalEmbeddingService = require('./localEmbeddingService'); // ✨ 新增：本地embedding服务
const { ZhipuRerankService, LocalRerankService } = require('./rerankService');
const EnhancedLocalRerankService = require('./enhancedLocalRerank');

class RetrievalEngine {
    constructor(apiKey, options = {}) {
        // ✨ 新增：选择embedding服务类型
        this.embeddingMode = options.embeddingMode || 'api'; // 'api' 或 'local'

        if (this.embeddingMode === 'local') {
            // 使用本地embedding服务（完全免费，无限并发！）
            const cachePath = options.cachePath || './local_embedding_cache.json';
            this.embeddingService = new LocalEmbeddingService(cachePath);
            console.log('✓ Embedding模式：本地模型（完全免费，无API调用）');
        } else {
            // 使用智谱AI API服务
            const cachePath = options.cachePath || './embedding_cache.json';
            this.embeddingService = new EmbeddingService(apiKey, cachePath);
            console.log('✓ Embedding模式：智谱AI API');
        }

        this.chunks = [];
        this.indexed = false;

        // Rerank配置
        this.rerankMode = options.rerankMode || 'hybrid'; // 'api', 'local', 'hybrid', 'none'
        this.useEnhancedLocal = options.enhancedLocal !== false; // 默认使用增强版
        this.zhipuRerank = new ZhipuRerankService(apiKey);

        // 选择使用哪个本地Rerank服务
        if (this.useEnhancedLocal) {
            this.localRerank = new EnhancedLocalRerankService({
                keywordWeight: options.keywordWeight || 0.25,
                semanticWeight: options.semanticWeight || 0.65,
                contextWeight: options.contextWeight || 0.10
            });
            console.log(`✓ Rerank模式：${this.rerankMode} (增强版本地)`);
        } else {
            this.localRerank = new LocalRerankService();
            console.log(`✓ Rerank模式：${this.rerankMode} (基础版本地)`);
        }
    }

    /**
     * 加载文档块
     */
    async loadChunks(chunksPath) {
        try {
            const data = await fs.readFile(chunksPath, 'utf-8');
            this.chunks = JSON.parse(data);
            console.log(`✓ 加载了${this.chunks.length}个文档块`);
            return this.chunks;
        } catch (error) {
            console.error('✗ 加载文档块失败：', error.message);
            throw error;
        }
    }

    /**
     * 建立索引（向量化所有文档块）
     */
    async buildIndex() {
        if (this.chunks.length === 0) {
            throw new Error('请先加载文档块');
        }

        console.log('✓ 开始建立检索索引...');
        const startTime = Date.now();

        // 为所有文档块生成向量
        this.chunks = await this.embeddingService.embedChunks(this.chunks);

        const endTime = Date.now();
        console.log(`✓ 索引建立完成，耗时：${(endTime - startTime) / 1000}秒`);

        this.indexed = true;
        return this.chunks;
    }

    /**
     * 检索相关文档
     */
    async retrieve(question, options = {}) {
        const {
            topK = 5,
            minScore = 0.5,
            useReranking = true
        } = options;

        if (!this.indexed) {
            throw new Error('请先建立索引');
        }

        console.log(`\n✓ 检索问题：${question}`);

        // 1. 将问题向量化
        const questionEmbedding = await this.embeddingService.getEmbedding(question);

        // 2. 计算相似度（✨ 修改：传入minScore参数，让findMostSimilar内部也使用这个阈值）
        const results = await this.embeddingService.findMostSimilar(
            questionEmbedding,
            this.chunks,
            topK * 2,  // 多取一些，用于重排序
            minScore    // ✨ 新增：传入minScore参数
        );

        // 3. 过滤低分结果（✨ 注：这一步现在是冗余的，因为findMostSimilar内部已经过滤了，但保留以备将来需要）
        let filteredResults = results;  // ✨ 修改：不再重复过滤，因为findMostSimilar已经过滤了

        // 4. 重排序（可选）
        if (useReranking && filteredResults.length > 0) {
            filteredResults = await this.rerank(question, filteredResults);
        }

        // 5. 取Top-K
        const finalResults = filteredResults.slice(0, topK);

        console.log(`✓ 找到${finalResults.length}个相关文档块`);
        finalResults.forEach((item, index) => {
            const pageTitle = item.chunk.text ? item.chunk.text.substring(0, 30) + '...' : 'N/A';
            console.log(`  ${index + 1}. [第${item.chunk.page_num}页] ${pageTitle} 相似度：${item.score.toFixed(3)}`);
        });

        return finalResults;
    }

    /**
     * 重排序（支持智谱AI Rerank和本地关键词匹配）
     */
    async rerank(question, results) {
        try {
            // 准备文档列表
            const documents = results.map(item => ({
                text: item.chunk.text,
                metadata: {
                    page: item.chunk.page_num
                }
            }));

            // 根据模式选择rerank方式
            switch (this.rerankMode) {
                case 'api':
                    // 仅使用智谱AI Rerank
                    return await this.rerankWithAPI(question, documents, results);

                case 'local':
                    // 仅使用本地关键词匹配
                    return this.rerankWithLocal(question, documents, results);

                case 'hybrid':
                default:
                    // 混合模式：优先API，失败时降级到本地
                    return await this.rerankWithHybrid(question, documents, results);

                case 'none':
                    // 不进行重排序
                    return results;
            }

        } catch (error) {
            console.error('✗ Rerank失败，使用原始结果：', error.message);
            return results;
        }
    }

    /**
     * 使用智谱AI Rerank API
     */
    async rerankWithAPI(question, documents, originalResults) {
        console.log('🔄 使用智谱AI Rerank API...');
        const startTime = Date.now();

        try {
            const rerankResults = await this.zhipuRerank.rerank(question, documents, {
                topN: originalResults.length,
                useCache: true
            });

            const elapsed = Date.now() - startTime;
            console.log(`✓ API Rerank完成，耗时：${elapsed}ms`);

            // 重新排序结果
            const rerankedMap = new Map();
            rerankResults.forEach((item, index) => {
                rerankedMap.set(item.index, {
                    ...originalResults[item.index],
                    score: item.relevance_score,
                    rerankScore: item.relevance_score,
                    rerankMethod: 'api'
                });
            });

            // 保持未rerank的项（如果有）
            const finalResults = originalResults.map((item, index) =>
                rerankedMap.get(index) || { ...item, rerankMethod: 'none' }
            );

            return finalResults.sort((a, b) => b.score - a.score);

        } catch (error) {
            console.error('✗ API Rerank失败：', error.message);
            throw error;
        }
    }

    /**
     * 使用本地关键词匹配
     */
    rerankWithLocal(question, documents, originalResults) {
        console.log('🔄 使用本地关键词匹配Rerank...');
        const startTime = Date.now();

        const semanticScores = originalResults.map(item => ({
            score: item.score
        }));

        const rerankResults = this.localRerank.rerank(question, documents, {
            semanticScores: semanticScores,
            keywordWeight: 0.3,
            semanticWeight: 0.7
        });

        const elapsed = Date.now() - startTime;
        console.log(`✓ 本地Rerank完成，耗时：${elapsed}ms`);

        // 重新排序结果
        const rerankedResults = rerankResults.map(item => ({
            ...originalResults[item.index],
            score: item.relevance_score,
            rerankScore: item.keyword_score,
            semanticScore: item.semantic_score,
            rerankMethod: 'local'
        }));

        return rerankedResults;
    }

    /**
     * 混合模式：API失败时降级到本地
     */
    async rerankWithHybrid(question, documents, originalResults) {
        try {
            // 先尝试API
            return await this.rerankWithAPI(question, documents, originalResults);

        } catch (error) {
            console.log('⚠ API Rerank失败，降级到本地关键词匹配');
            return this.rerankWithLocal(question, documents, originalResults);
        }
    }

    /**
     * 保存索引
     */
    async saveIndex(indexPath) {
        try {
            const indexData = {
                chunks: this.chunks,
                indexed: this.indexed,
                timestamp: new Date().toISOString()
            };

            await fs.writeFile(indexPath, JSON.stringify(indexData), 'utf-8');
            console.log(`✓ 索引已保存到：${indexPath}`);
        } catch (error) {
            console.error('✗ 保存索引失败：', error.message);
        }
    }

    /**
     * 加载索引
     */
    async loadIndex(indexPath) {
        try {
            const data = await fs.readFile(indexPath, 'utf-8');
            const indexData = JSON.parse(data);

            this.chunks = indexData.chunks;
            this.indexed = indexData.indexed;

            console.log(`✓ 索引已加载，共${this.chunks.length}个文档块`);
            console.log(`✓ 索引时间：${indexData.timestamp}`);
        } catch (error) {
            console.log('✗ 未找到索引文件，需要重新建立索引');
        }
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            totalChunks: this.chunks.length,
            indexed: this.indexed,
            chunksWithEmbedding: this.chunks.filter(c => c.embedding).length,
            cacheStats: this.embeddingService.getCacheStats()
        };
    }
}

// 导出
module.exports = RetrievalEngine;

// 如果直接运行此文件
if (require.main === module) {
    (async () => {
        const engine = new RetrievalEngine(process.env.ZHIPU_API_KEY || 'your-api-key-here');

        try {
            // 1. 加载文档块
            await engine.loadChunks(path.join(__dirname, '../../document_chunks.json'));

            // 2. 建立索引
            await engine.buildIndex();

            // 3. 保存索引
            await engine.saveIndex(path.join(__dirname, '../../retrieval_index.json'));

            // 4. 测试检索
            const testQuestions = [
                '重修需要什么条件？',
                '如何申请奖学金？',
                '转专业的流程是什么？'
            ];

            for (const question of testQuestions) {
                console.log('\n' + '='.repeat(80));
                const results = await engine.retrieve(question, { topK: 3 });
                console.log('='.repeat(80));
            }

            // 5. 显示统计
            const stats = engine.getStats();
            console.log('\n✓ 检索引擎统计：', stats);

        } catch (error) {
            console.error('测试失败：', error);
            process.exit(1);
        }
    })();
}
