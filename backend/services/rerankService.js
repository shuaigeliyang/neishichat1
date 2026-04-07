/**
 * 智谱AI Rerank服务
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：使用智谱AI rerank-8k模型进行文档重排序
 */

const https = require('https');

class ZhipuRerankService {
    constructor(apiKey, model = 'rerank') {
        this.apiKey = apiKey;
        this.baseUrl = 'open.bigmodel.cn';
        this.model = model; // 'rerank' (标准) 或其他支持的模型
        this.cache = new Map(); // 缓存 rerank 结果
    }

    /**
     * 调用智谱AI Rerank API
     * @param {string} query - 查询问题
     * @param {Array} documents - 文档列表 [{text: string}, ...]
     * @param {Object} options - 配置选项
     * @returns {Promise<Array>} 重排序后的文档索引和分数
     */
    async rerank(query, documents, options = {}) {
        const {
            topN = documents.length,
            useCache = true
        } = options;

        // 检查缓存
        const cacheKey = this.getCacheKey(query, documents);
        if (useCache && this.cache.has(cacheKey)) {
            console.log('✓ Rerank命中缓存');
            return this.cache.get(cacheKey);
        }

        // 准备请求数据
        const requestData = JSON.stringify({
            model: this.model,
            query: query,
            documents: documents.map(doc => typeof doc === 'string' ? doc : doc.text || doc.content),
            top_n: topN
        });

        // 发送请求
        try {
            const results = await this.sendRequest(requestData);

            // 缓存结果
            if (useCache) {
                this.cache.set(cacheKey, results);
            }

            return results;

        } catch (error) {
            console.error('✗ Rerank API调用失败：', error.message);

            // 降级方案：返回原始顺序
            console.log('⚠ 使用降级方案：保持原始顺序');
            return documents.map((_, index) => ({
                index: index,
                relevance_score: 1.0 - (index * 0.1), // 简单降分
                document: typeof documents[index] === 'string'
                    ? documents[index]
                    : documents[index].text || documents[index].content
            }));
        }
    }

    /**
     * 发送HTTPS请求
     */
    sendRequest(requestData) {
        return new Promise((resolve, reject) => {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            };

            const options = {
                hostname: this.baseUrl,
                path: '/api/paas/v4/rerank',
                method: 'POST',
                headers: headers,
                timeout: 30000 // 30秒超时
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);

                        if (res.statusCode !== 200) {
                            return reject(new Error(`API返回错误：${res.statusCode} - ${response.error?.message || '未知错误'}`));
                        }

                        resolve(response.results || []);

                    } catch (error) {
                        reject(new Error(`解析响应失败：${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`请求失败：${error.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('请求超时'));
            });

            req.write(requestData);
            req.end();
        });
    }

    /**
     * 生成缓存键
     */
    getCacheKey(query, documents) {
        // 使用查询和文档数量生成简单缓存键
        const docHash = documents.map(doc =>
            typeof doc === 'string' ? doc : doc.text || doc.content
        ).join('').slice(0, 100); // 取前100字符

        return `${query}__${docHash.length}__${documents.length}`;
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('✓ Rerank缓存已清空');
    }

    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * 批量Rerank（用于大量文档）
     */
    async batchRerank(query, documents, batchSize = 10) {
        if (documents.length <= batchSize) {
            return await this.rerank(query, documents);
        }

        // 分批处理
        const results = [];
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const batchResults = await this.rerank(query, batch);

            // 调整索引偏移
            results.push(...batchResults.map(r => ({
                ...r,
                index: r.index + i
            })));
        }

        // 按分数重新排序
        results.sort((a, b) => b.relevance_score - a.relevance_score);

        return results;
    }
}

/**
 * 本地Rerank服务（关键词匹配，作为备用方案）
 */
class LocalRerankService {
    constructor() {
        this.stopWords = new Set([
            '的', '了', '是', '在', '和', '有', '我', '你', '他', '她', '它', '们',
            '这', '那', '吗', '呢', '啊', '吧', '哦', '嗯', '呀', '哪', '怎么',
            '什么', '如何', '为什么', '哪里', '哪个', '哪些', '多少', '几个'
        ]);
    }

    /**
     * 基于关键词匹配的重排序
     */
    rerank(query, documents, options = {}) {
        const {
            semanticScores = [],
            keywordWeight = 0.3,
            semanticWeight = 0.7
        } = options;

        // 提取查询关键词
        const queryKeywords = this.extractKeywords(query);

        // 计算每个文档的关键词匹配分数
        const rerankScores = documents.map((doc, index) => {
            const text = typeof doc === 'string' ? doc : doc.text || doc.content;
            const keywordMatches = queryKeywords.filter(kw =>
                text.includes(kw)
            ).length;

            const keywordScore = queryKeywords.length > 0
                ? keywordMatches / queryKeywords.length
                : 0;

            // 结合语义分数
            const semanticScore = semanticScores[index]?.score || 0;
            const combinedScore = semanticScore * semanticWeight + keywordScore * keywordWeight;

            return {
                index: index,
                relevance_score: combinedScore,
                document: text,
                keyword_score: keywordScore,
                semantic_score: semanticScore
            };
        });

        // 按分数排序
        rerankScores.sort((a, b) => b.relevance_score - a.relevance_score);

        return rerankScores;
    }

    /**
     * 提取关键词
     */
    extractKeywords(text) {
        const keywords = [];
        // 提取中文词汇（2-4个字符）
        const words = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
        // 提取英文单词
        const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];

        const allWords = [...words, ...englishWords];

        for (const word of allWords) {
            if (!this.stopWords.has(word)) {
                keywords.push(word);
            }
        }

        return keywords;
    }
}

module.exports = {
    ZhipuRerankService,
    LocalRerankService
};
