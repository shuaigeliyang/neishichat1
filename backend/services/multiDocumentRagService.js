/**
 * 多文档RAG服务
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：支持多政策文档的RAG问答
 *
 * 核心改进：
 * - 从统一索引读取数据
 * - 支持多文档来源追踪
 * - 自动聚合所有已索引政策
 * - 标注答案来源文档
 */

const RetrievalEngine = require('./retrievalEngine');
const QAGenerator = require('./qaGenerator');
const UnifiedIndexManager = require('./unifiedIndexManager');
const fs = require('fs').promises;
const path = require('path');

class MultiDocumentRAGService {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.embeddingMode = options.embeddingMode || process.env.EMBEDDING_MODE || 'api';

        // 使用统一索引管理器
        this.indexManager = new UnifiedIndexManager(apiKey, {
            embeddingMode: this.embeddingMode
        });

        this.qaGenerator = new QAGenerator(apiKey, options.model || 'glm-4-flash');
        this.initialized = false;
    }

    /**
     * 初始化服务
     */
    async initialize() {
        console.log('✓ 初始化多文档RAG服务...\n');

        try {
            // 1. 初始化统一索引管理器
            await this.indexManager.initialize();

            // 2. 加载embedding缓存
            const basePath = path.resolve(__dirname, '../..');
            const cachePath = path.join(basePath, '文档库', 'indexes', 'embedding_cache.json');
            await this.indexManager.embeddingService.loadCache(cachePath);

            this.initialized = true;

            // 显示统计信息
            const stats = this.indexManager.getStatistics();
            console.log('\n✓ 多文档RAG服务初始化完成！');
            console.log('  - 已索引文档数：', stats.totalDocuments);
            console.log('  - 总chunks数：', stats.totalChunks);
            console.log('  - 已索引文档：');
            stats.documents.forEach(doc => {
                console.log(`    • ${doc.name}`);
            });
            console.log();

        } catch (error) {
            console.error('✗ 初始化失败：', error.message);
            throw error;
        }
    }

    /**
     * 智能问答（支持多文档）
     */
    async ask(question, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const {
            topK = 5,
            minScore = 0.5,
            useReranking = true
        } = options;

        try {
            console.log(`\n========== 问题：${question} ==========`);

            // 1. 为问题生成向量
            const questionEmbedding = await this.indexManager.embeddingService.generateEmbedding(question);

            // 2. 在统一索引中检索
            const results = await this.indexManager.search(questionEmbedding, {
                topK: topK,
                minScore: minScore
            });

            if (results.length === 0) {
                console.log('⚠️ 未找到相关内容');
                return {
                    answer: '抱歉，我在已索引的政策文档中没有找到与您问题相关的内容。',
                    sources: []
                };
            }

            // 3. 按文档分组结果
            const groupedResults = this.indexManager.groupChunksByDocument(results);

            console.log(`\n✓ 检索到 ${results.length} 个相关chunks`);
            console.log(`  来源文档：${groupedResults.length} 个`);

            // 4. 生成答案
            const context = results.map(r => r.text).join('\n\n');
            const answer = await this.qaGenerator.generateAnswer(question, context);

            // 5. 格式化来源信息
            const sources = this.formatSources(groupedResults);

            console.log(`\n========== 回答生成完成 ==========\n`);

            return {
                answer: answer,
                sources: sources,
                retrievedChunks: results.length
            };

        } catch (error) {
            console.error('✗ 问答失败：', error.message);
            throw error;
        }
    }

    /**
     * 格式化来源信息
     */
    formatSources(groupedResults) {
        return groupedResults.map(group => ({
            documentId: group.documentId,
            documentName: group.documentName,
            chunks: group.chunks.map(chunk => ({
                chapter: chunk.chapter,
                page: chunk.page,
                score: chunk.score,
                preview: chunk.text.substring(0, 100) + '...'
            }))
        }));
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        if (!this.initialized) {
            return null;
        }

        const indexStats = this.indexManager.getStatistics();

        return {
            totalDocuments: indexStats.totalDocuments,
            totalChunks: indexStats.totalChunks,
            documents: indexStats.documents
        };
    }

    /**
     * 获取所有已索引文档
     */
    getIndexedDocuments() {
        if (!this.initialized) {
            return [];
        }

        const stats = this.indexManager.getStatistics();
        return stats.documents;
    }
}

module.exports = MultiDocumentRAGService;
