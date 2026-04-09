/**
 * 数据库RAG服务
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：基于MySQL数据库的RAG问答，不依赖API向量搜索！
 */

const DatabaseSearchService = require('./databaseSearchService');
const QAGenerator = require('./qaGenerator');
const axios = require('axios');

class DatabaseRAGService {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.searchService = new DatabaseSearchService(options);
        this.qaGenerator = new QAGenerator(apiKey, options.model || 'glm-4-flash');
        this.initialized = false;

        this.options = {
            topK: options.topK || 5,
            minScore: options.minScore || 0.2,
            ...options
        };
    }

    /**
     * 初始化服务
     */
    async initialize() {
        console.log('✓ 初始化数据库RAG服务...');

        try {
            // 获取统计信息
            const stats = await this.searchService.getStats();
            console.log(`  - 文档块总数：${stats.totalChunks}`);
            console.log(`  - 总章节：${stats.totalChapters}`);
            console.log(`  - 最大页码：${stats.maxPage}`);

            this.initialized = true;
            console.log('✓ 数据库RAG服务初始化完成！\n');
        } catch (error) {
            console.error('✗ 初始化失败：', error.message);
            throw error;
        }
    }

    /**
     * 问答接口
     */
    async answer(question, options = {}) {
        if (!this.initialized) {
            throw new Error('RAG服务未初始化，请先调用initialize()');
        }

        const startTime = Date.now();

        try {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`【问题】${question}`);
            console.log(`${'='.repeat(80)}\n`);

            // 1. 检索相关文档
            const retrievedDocs = await this.searchService.search(question, {
                topK: options.topK || this.options.topK,
                minScore: options.minScore || this.options.minScore
            });

            // 2. 检查是否找到相关文档
            if (retrievedDocs.length === 0) {
                return {
                    answer: '抱歉，根据学生手册，没有找到与您问题相关的信息。建议您：\n1. 检查问题表述是否准确\n2. 咨询辅导员或相关部门\n3. 查阅学生手册纸质版',
                    sources: [],
                    confidence: 0,
                    elapsed: Date.now() - startTime,
                    warning: '未找到相关文档'
                };
            }

            // 3. 生成回答
            const result = await this.qaGenerator.generateAnswer(question, retrievedDocs, {
                maxTokens: options.maxTokens || 2000,
                temperature: options.temperature || 0.3,
                includeCitations: options.includeCitations !== false
            });

            // 4. 检查回答质量
            const quality = this.qaGenerator.checkAnswerQuality(result.answer, retrievedDocs);

            // 5. 格式化回答
            const formattedAnswer = this.qaGenerator.formatAnswer(result.answer, result.sources);

            const elapsed = Date.now() - startTime;

            console.log(`\n${'='.repeat(80)}`);
            console.log(`【回答】\n${formattedAnswer}`);
            console.log(`${'='.repeat(80)}`);
            console.log(`✓ 完成，耗时：${elapsed}ms\n`);

            return {
                answer: formattedAnswer,
                sources: result.sources,
                confidence: quality.maxScore,
                elapsed,
                quality: quality,
                usage: result.usage
            };

        } catch (error) {
            console.error('✗ 问答失败：', error.message);
            throw error;
        }
    }

    /**
     * 获取统计信息
     */
    async getStats() {
        return await this.searchService.getStats();
    }

    /**
     * 关闭服务
     */
    async close() {
        await this.searchService.close();
    }
}

// 导出
module.exports = DatabaseRAGService;
