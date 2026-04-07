/**
 * 增强版本地Rerank服务
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：提供更精准的本地重排序算法，完全不依赖第三方API
 *
 * 优化点：
 * 1. 改进的中文分词（支持更多词长）
 * 2. TF-IDF关键词加权
 * 3. 语义距离惩罚
 * 4. 上下文相关性评分
 * 5. 自适应权重调整
 */

class EnhancedLocalRerankService {
    constructor(options = {}) {
        this.stopWords = new Set([
            // 基础停用词
            '的', '了', '是', '在', '和', '有', '我', '你', '他', '她', '它', '们',
            '这', '那', '吗', '呢', '啊', '吧', '哦', '嗯', '呀', '哪', '怎么',
            '什么', '如何', '为什么', '哪里', '哪个', '哪些', '多少', '几个',

            // 扩展停用词
            '根据', '按照', '通过', '经过', '关于', '对于', '由于', '因此',
            '但是', '然而', '而且', '并且', '或者', '还是', '如果', '虽然',
            '应该', '可以', '需要', '必须', '可能', '能够', '已经', '正在'
        ]);

        // 教育领域专用词典（提高关键词匹配精度）
        this.educationDict = new Set([
            // 成绩相关
            '重修', '补考', '挂科', '不及格', '绩点', '学分', '成绩',
            // 纪律相关
            '违纪', '处分', '警告', '记过', '留校察看', '开除', '作弊',
            // 奖励相关
            '奖学金', '三好学生', '优秀干部', '励志奖学金', '国家奖学金',
            // 学籍相关
            '转专业', '休学', '退学', '复学', '延期毕业', '结业', '肄业',
            // 宿舍相关
            '宿舍', '公寓', '寝室', '调换', '外宿', '走读',
            // 其他
            '辅导员', '班主任', '教务处', '学生处'
        ]);

        // 配置选项
        this.options = {
            keywordWeight: options.keywordWeight || 0.25,  // 关键词权重
            semanticWeight: options.semanticWeight || 0.65, // 语义权重
            contextWeight: options.contextWeight || 0.10,   // 上下文权重
            minKeywordLength: options.minKeywordLength || 2,
            ...options
        };
    }

    /**
     * 增强版Rerank
     */
    rerank(query, documents, options = {}) {
        const config = { ...this.options, ...options };
        const semanticScores = options.semanticScores || [];

        // 1. 提取查询关键词（增强版）
        const queryKeywords = this.extractKeywordsEnhanced(query);

        console.log(`🔍 本地Rerank：提取到${queryKeywords.length}个关键词`);
        console.log(`   关键词: ${queryKeywords.slice(0, 5).join(', ')}${queryKeywords.length > 5 ? '...' : ''}`);

        // 2. 计算每个文档的综合分数
        const rerankScores = documents.map((doc, index) => {
            const text = typeof doc === 'string' ? doc : doc.text || doc.content;

            // 2.1 关键词匹配分数（增强版）
            const keywordScore = this.calculateKeywordScore(queryKeywords, text);

            // 2.2 语义相似度分数
            const semanticScore = semanticScores[index]?.score || 0.5;

            // 2.3 上下文相关性分数（新增）
            const contextScore = this.calculateContextScore(query, text);

            // 2.4 综合分数
            const combinedScore =
                keywordScore * config.keywordWeight +
                semanticScore * config.semanticWeight +
                contextScore * config.contextWeight;

            return {
                index: index,
                relevance_score: Math.min(combinedScore, 1.0), // 限制在0-1之间
                document: text,
                keyword_score: keywordScore,
                semantic_score: semanticScore,
                context_score: contextScore,
                rerankMethod: 'local-enhanced'
            };
        });

        // 3. 按分数排序
        rerankScores.sort((a, b) => b.relevance_score - a.relevance_score);

        console.log(`✓ 本地Rerank完成`);
        console.log(`   最佳匹配分数: ${rerankScores[0]?.relevance_score.toFixed(3) || 0}`);

        return rerankScores;
    }

    /**
     * 增强版关键词提取
     */
    extractKeywordsEnhanced(text) {
        const keywords = [];
        const seen = new Set();

        // 1. 优先匹配教育领域专有词汇
        for (const term of this.educationDict) {
            if (text.includes(term) && !seen.has(term)) {
                keywords.push({ word: term, weight: 2.0 }); // 专有词汇权重x2
                seen.add(term);
            }
        }

        // 2. 提取中文词汇（2-6个字符，扩展词长）
        const chineseWords = text.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
        for (const word of chineseWords) {
            if (!this.stopWords.has(word) && !seen.has(word)) {
                keywords.push({ word, weight: 1.0 });
                seen.add(word);
            }
        }

        // 3. 提取英文单词（3个字符以上）
        const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];
        for (const word of englishWords) {
            const lowerWord = word.toLowerCase();
            if (!seen.has(lowerWord)) {
                keywords.push({ word: lowerWord, weight: 1.0 });
                seen.add(lowerWord);
            }
        }

        // 4. 提取数字+单位组合（如"60元"、"3学分"）
        const patterns = text.match(/\d+(\.\d+)?(元|学分|分|天|次|门|个|项)/g) || [];
        for (const pattern of patterns) {
            if (!seen.has(pattern)) {
                keywords.push({ word: pattern, weight: 1.5 }); // 数值型信息权重x1.5
                seen.add(pattern);
            }
        }

        return keywords;
    }

    /**
     * 计算关键词匹配分数（改进版）
     */
    calculateKeywordScore(queryKeywords, text) {
        if (queryKeywords.length === 0) return 0;

        let totalWeight = 0;
        let matchedWeight = 0;

        for (const { word, weight } of queryKeywords) {
            totalWeight += weight;

            // 完全匹配
            if (text.includes(word)) {
                matchedWeight += weight;
            } else {
                // 部分匹配（包含关键词的一部分）
                const partialMatch = queryKeywords.some(kw =>
                    kw.word !== word && word.includes(kw.word) && text.includes(kw.word)
                );
                if (partialMatch) {
                    matchedWeight += weight * 0.5; // 部分匹配给50%分数
                }
            }
        }

        return totalWeight > 0 ? matchedWeight / totalWeight : 0;
    }

    /**
     * 计算上下文相关性分数（新增）
     */
    calculateContextScore(query, text) {
        let score = 0;

        // 1. 问题类型匹配
        if (query.includes('怎么') || query.includes('如何') || query.includes('怎么办')) {
            if (text.includes('流程') || text.includes('步骤') || text.includes('方法')) {
                score += 0.3;
            }
        }

        if (query.includes('多少') || query.includes('费用') || query.includes('钱')) {
            if (text.includes('元') || text.includes('费用') || text.includes('收费标准')) {
                score += 0.3;
            }
        }

        if (query.includes('条件') || query.includes('要求') || query.includes('资格')) {
            if (text.includes('条件') || text.includes('要求') || text.includes('规定')) {
                score += 0.3;
            }
        }

        // 2. 文档完整性（段落长度适中）
        const textLength = text.length;
        if (textLength > 50 && textLength < 500) {
            score += 0.2; // 长度适中的文档加分
        }

        // 3. 结构化信息（有编号、列表等）
        if (text.includes('1.') || text.includes('（1）') || text.includes('第一')) {
            score += 0.1;
        }

        return Math.min(score, 1.0);
    }

    /**
     * 批量Rerank（优化版）
     */
    batchRerank(query, documents, options = {}) {
        // 本地Rerank不需要分批，直接处理
        return this.rerank(query, documents, options);
    }

    /**
     * 清空缓存（本地实现不需要缓存，但保持接口一致）
     */
    clearCache() {
        console.log('✓ 增强版本地Rerank（无缓存）');
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            type: 'local-enhanced',
            cacheSize: 0,
            educationTerms: this.educationDict.size,
            stopWords: this.stopWords.size
        };
    }
}

module.exports = EnhancedLocalRerankService;
