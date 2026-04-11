/**
 * RAG文档问答服务
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：整合所有RAG模块，提供完整的文档问答能力
 *
 * ✨ v2.0: 支持文档注册表，统一从"文档库"目录读取索引
 */

const RetrievalEngine = require('./retrievalEngine');
const QAGenerator = require('./qaGenerator');
const fs = require('fs').promises;
const path = require('path');

class RAGService {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;

        // ✨ 传递embeddingMode选项给RetrievalEngine
        this.retrievalEngine = new RetrievalEngine(apiKey, {
            embeddingMode: options.embeddingMode || process.env.EMBEDDING_MODE || 'api',
            cachePath: options.cachePath
        });

        this.qaGenerator = new QAGenerator(apiKey, options.model || 'glm-4-flash');
        this.initialized = false;

        // 配置选项
        // 前台 basePath = E:/外包/教育系统智能体/backend/
        // 统一索引在 E:/外包/教育系统智能体/文档库/indexes/
        const basePath = path.resolve(__dirname, '../..');  // E:/外包/教育系统智能体
        const projectRoot = basePath;  // 直接用 basePath

        this.options = {
            // 统一索引位置（通过 getAvailableIndexPath 动态获取）
            indexPath: options.indexPath || path.join(projectRoot, '文档库', 'indexes', 'retrieval_index.json'),
            // 向量缓存
            cachePath: options.cachePath || path.join(projectRoot, '文档库', 'indexes', 'embedding_cache.json'),
            // ✨ 修复：不再硬编码旧 chunksPath，改为由调用者传入或使用统一索引
            // 如果需要从原始chunks创建索引，必须在options中显式传入chunksPath
            chunksPath: options.chunksPath,  // 移除默认值，避免硬编码
            handbookPath: projectRoot,
            topK: options.topK || 5,
            minScore: options.minScore || 0.2,  // 从0.5降到0.2，避免过滤掉相关文档
            ...options
        };
    }

    /**
     * ✨ 获取实际可用的索引路径
     * 优先从统一索引位置读取（Single Source of Truth）
     *
     * 前台后端 basePath = E:/外包/教育系统智能体/backend/
     * 统一索引实际位置 = E:/外包/教育系统智能体/文档库/indexes/retrieval_index.json
     */
    async getAvailableIndexPath() {
        // basePath = E:/外包/教育系统智能体（前台 backend 目录往上级）
        const basePath = path.resolve(__dirname, '../..');
        const unifiedIndexPath = path.join(basePath, '文档库', 'indexes', 'retrieval_index.json');

        try {
            await fs.access(unifiedIndexPath);
            console.log(`✓ 发现统一索引: ${unifiedIndexPath}`);
            return unifiedIndexPath;
        } catch { /* 未找到 */ }

        // 回退：根目录旧索引（兼容旧数据）
        try {
            await fs.access(this.options.indexPath);
            console.log(`⚠️ 使用旧索引: ${this.options.indexPath}`);
            return this.options.indexPath;
        } catch {
            console.log('⚠️ 未找到索引文件');
        }

        // 最终回退：返回统一索引路径（会创建新的）
        return unifiedIndexPath;
    }

    /**
     * 初始化服务
     */
    async initialize() {
        console.log('✓ 初始化RAG服务...\n');

        try {
            // ✨ 获取可用的索引路径（优先文档库，回退到旧位置）
            const indexPath = await this.getAvailableIndexPath();
            this.options.indexPath = indexPath;

            // 1. 尝试加载已有索引
            await this.retrievalEngine.loadIndex(indexPath);

            // 2. 如果没有索引，创建新索引
            if (!this.retrievalEngine.indexed) {
                // ✨ 修复：如果没有提供chunksPath，则无法创建新索引
                if (!this.options.chunksPath) {
                    throw new Error('未找到索引且未提供chunksPath参数。请确保索引已存在，或提供chunksPath以创建新索引。');
                }

                console.log('✓ 未找到索引，开始创建新索引...\n');
                console.log(`📂 从chunksPath加载: ${this.options.chunksPath}`);

                // 加载文档块
                await this.retrievalEngine.loadChunks(this.options.chunksPath);

                // 建立索引
                await this.retrievalEngine.buildIndex();

                // 保存索引
                await this.retrievalEngine.saveIndex(this.options.indexPath);
            }

            // 3. 加载向量缓存
            await this.retrievalEngine.embeddingService.loadCache(this.options.cachePath);

            this.initialized = true;

            // 显示统计信息
            const stats = this.retrievalEngine.getStats();
            console.log('\n✓ RAG服务初始化完成！');
            console.log('  - 文档块总数：', stats.totalChunks);
            console.log('  - 已建立索引：', stats.indexed);
            console.log('  - 向量缓存数：', stats.cacheStats.size);
            console.log();

        } catch (error) {
            console.error('✗ 初始化失败：', error.message);
            throw error;
        }
    }

    /**
     * 问答接口
     * @param {string} question - 用户问题
     * @param {Object} options - 配置选项
     * @param {number} options.topK - 检索返回的文档数量
     * @param {number} options.minScore - 最小相似度阈值
     * @param {number} options.maxTokens - 最大生成token数
     * @param {boolean} options.useReranking - 是否使用重排序
     * @param {string[]} options.documentIds - 可选：指定要检索的文档ID列表
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

            // 1. 检索相关文档（✨ 新增：支持documentIds参数）
            const retrievedDocs = await this.retrievalEngine.retrieve(question, {
                topK: options.topK || this.options.topK,
                minScore: options.minScore || this.options.minScore,
                useReranking: options.useReranking !== false,
                documentIds: options.documentIds  // ✨ 新增：文档过滤参数
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
     * 批量问答
     */
    async batchAnswer(questions, options = {}) {
        const results = [];

        for (const question of questions) {
            try {
                const result = await this.answer(question, options);
                results.push({
                    question,
                    success: true,
                    ...result
                });

                // 避免请求过快
                await this.sleep(500);
            } catch (error) {
                results.push({
                    question,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 流式问答（用于实时显示）
     * @param {string} question - 用户问题
     * @param {Object} options - 配置选项
     * @param {number} options.topK - 检索返回的文档数量
     * @param {number} options.minScore - 最小相似度阈值
     * @param {string[]} options.documentIds - 可选：指定要检索的文档ID列表
     */
    async *answerStream(question, options = {}) {
        if (!this.initialized) {
            throw new Error('RAG服务未初始化，请先调用initialize()');
        }

        try {
            // 1. 检索相关文档（✨ 新增：支持documentIds参数）
            const retrievedDocs = await this.retrievalEngine.retrieve(question, {
                topK: options.topK || this.options.topK,
                minScore: options.minScore || this.options.minScore,
                documentIds: options.documentIds  // ✨ 新增：文档过滤参数
            });

            if (retrievedDocs.length === 0) {
                yield '抱歉，根据学生手册，没有找到与您问题相关的信息。';
                return;
            }

            // 2. 流式生成回答
            let fullAnswer = '';
            for await (const chunk of this.qaGenerator.generateAnswerStream(question, retrievedDocs, options)) {
                fullAnswer += chunk;
                yield chunk;
            }

            // 3. 返回来源信息
            yield '\n\n---\n\n**参考资料**：\n';
            const sources = this.qaGenerator.extractSources(retrievedDocs);
            for (const [index, source] of sources.entries()) {
                yield `${index + 1}. ${source.chapter}（第${source.page}页）\n`;
            }

        } catch (error) {
            console.error('✗ 流式问答失败：', error.message);
            throw error;
        }
    }

    /**
     * 保存状态
     */
    async saveState() {
        try {
            // 保存索引
            await this.retrievalEngine.saveIndex(this.options.indexPath);

            // 保存缓存
            await this.retrievalEngine.embeddingService.saveCache(this.options.cachePath);

            console.log('✓ RAG服务状态已保存');
        } catch (error) {
            console.error('✗ 保存状态失败：', error.message);
        }
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            initialized: this.initialized,
            ...this.retrievalEngine.getStats()
        };
    }

    /**
     * 延时函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出
module.exports = RAGService;

// 如果直接运行此文件
if (require.main === module) {
    (async () => {
        const apiKey = process.env.ZHIPU_API_KEY || 'your-api-key-here';
        const ragService = new RAGService(apiKey);

        try {
            // 初始化
            await ragService.initialize();

            // 测试问题
            const testQuestions = [
                '重修需要什么条件？',
                '如何申请奖学金？',
                '转专业的流程是什么？',
                '学生违纪会怎么处理？'
            ];

            // 批量问答
            console.log('✓ 开始批量问答测试...\n');
            const results = await ragService.batchAnswer(testQuestions, {
                topK: 3,
                maxTokens: 1500
            });

            // 显示结果
            console.log('\n✓ 批量问答完成！');
            results.forEach((result, index) => {
                console.log(`\n${'='.repeat(80)}`);
                console.log(`问题${index + 1}：${result.question}`);
                console.log(`成功：${result.success ? '是' : '否'}`);
                if (result.success) {
                    console.log(`置信度：${result.confidence.toFixed(2)}`);
                    console.log(`耗时：${result.elapsed}ms`);
                    if (result.quality.hasWarnings) {
                        console.log(`警告：${result.quality.warnings.join('；')}`);
                    }
                } else {
                    console.log(`错误：${result.error}`);
                }
            });

            // 保存状态
            await ragService.saveState();

            // 显示统计
            const stats = ragService.getStats();
            console.log('\n✓ 最终统计：', stats);

        } catch (error) {
            console.error('测试失败：', error);
            process.exit(1);
        }
    })();
}
