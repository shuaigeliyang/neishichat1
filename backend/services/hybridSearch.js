/**
 * 混合搜索服务 - BM25 + 向量检索融合
 * 设计师：哈雷酱 (￣▽￣)／
 *
 * 融合算法：
 * 1. 向量检索：捕捉语义相似度（"重修" ≈ "补考"）
 * 2. BM25检索：精确关键词匹配（"重修" 完全匹配"重修"）
 * 3. RRF融合：Reciprocal Rank Fusion，兼顾两种排序的优点
 */

class HybridSearch {
    constructor(options = {}) {
        // BM25配置
        this.k1 = options.k1 || 1.5;          // BM25 term frequency saturation
        this.b = options.b || 0.75;           // BM25 document length normalization
        this.avgDocLength = 0;

        // 融合权重
        this.vectorWeight = options.vectorWeight || 0.5;  // 向量权重
        this.bm25Weight = options.bm25Weight || 0.5;     // BM25权重

        // 停用词
        this.stopWords = new Set([
            '的', '了', '是', '在', '和', '有', '我', '你', '他', '她', '它', '们',
            '这', '那', '吗', '呢', '啊', '吧', '哦', '嗯', '呀', '哪', '怎么',
            '什么', '如何', '为什么', '哪里', '哪个', '哪些', '多少', '几个',
            '一个', '可以', '这个', '那个', '但是', '如果', '因为', '所以',
            '没有', '就是', '不是', '还是', '或者', '已经', '正在'
        ]);
    }

    /**
     * 分词（简单的中文分词）
     */
    tokenize(text) {
        if (!text) return [];

        // 提取中文词（2-6字）
        const chineseWords = text.match(/[\u4e00-\u9fa5]{2,6}/g) || [];

        // 提取英文词
        const englishWords = (text.match(/[a-zA-Z]{2,}/g) || [])
            .map(w => w.toLowerCase());

        // 提取数字+单位
        const numbers = text.match(/\d+(\.\d+)?(元|分|天|次|个|年|月|人|条)/g) || [];

        // 合并并过滤停用词
        const allTokens = [...chineseWords, ...englishWords, ...numbers]
            .filter(token => !this.stopWords.has(token) && token.length > 1);

        return [...new Set(allTokens)]; // 去重
    }

    /**
     * 计算BM25分数
     */
    calculateBM25(query, document, docLength, avgDocLength, docFreq, totalDocs, k1 = 1.5, b = 0.75) {
        const queryTokens = this.tokenize(query);
        const docTokens = this.tokenize(document);

        if (queryTokens.length === 0 || docTokens.length === 0) return 0;

        let score = 0;
        const docTF = {};

        // 统计文档中每个词的出现次数
        for (const token of docTokens) {
            docTF[token] = (docTF[token] || 0) + 1;
        }

        for (const term of queryTokens) {
            const tf = docTF[term] || 0;
            if (tf === 0) continue;

            // IDF: log((N - n + 0.5) / (n + 0.5))
            const n = docFreq[term] || 1;
            const idf = Math.log((totalDocs - n + 0.5) / (n + 0.5) + 1);

            // BM25公式: IDF * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * d/avgD))
            const numerator = tf * (k1 + 1);
            const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));

            score += idf * (numerator / denominator);
        }

        return score;
    }

    /**
     * RRF融合算法（Reciprocal Rank Fusion）
     * @param {Array} rankings - 多个排序结果，每个元素是 {results: [{id, score}], k: 排名衰减参数}
     */
    static reciprocalRankFusion(rankings, k = 60) {
        const scores = new Map();

        for (const { results } of rankings) {
            results.forEach((item, rank) => {
                const id = item.chunk_id || item.id || JSON.stringify(item);
                const currentScore = scores.get(id) || 0;
                // RRF公式: 1 / (k + rank)
                scores.set(id, currentScore + 1 / (k + rank + 1));
            });
        }

        // 合并分数到原始对象
        const fusedResults = [];
        for (const [id, rrfScore] of scores) {
            const item = rankings[0].results.find(r =>
                (r.chunk_id || r.id || JSON.stringify(r)) === id
            );
            if (item) {
                fusedResults.push({
                    ...item,
                    rrf_score: rrfScore
                });
            }
        }

        // 按RRF分数排序
        fusedResults.sort((a, b) => b.rrf_score - a.rrf_score);

        return fusedResults;
    }

    /**
     * Min-Max归一化
     */
    normalize(scores) {
        if (scores.length === 0) return scores;

        const values = scores.map(s => s.score);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        if (range === 0) return scores.map(s => ({ ...s, normalizedScore: 1 }));

        return scores.map(s => ({
            ...s,
            normalizedScore: (s.score - min) / range
        }));
    }

    /**
     * 加权融合
     */
    weightedFusion(vectorResults, bm25Results, vectorWeight = 0.5) {
        // 构建分数映射
        const scoreMap = new Map();

        // 添加向量分数
        for (const result of vectorResults) {
            const key = result.chunk_id || result.id;
            scoreMap.set(key, {
                ...result,
                vectorScore: result.score,
                bm25Score: 0
            });
        }

        // 合并BM25分数
        for (const result of bm25Results) {
            const key = result.chunk_id || result.id;
            if (scoreMap.has(key)) {
                const existing = scoreMap.get(key);
                existing.bm25Score = result.score;
            } else {
                scoreMap.set(key, {
                    ...result,
                    vectorScore: 0,
                    bm25Score: result.score
                });
            }
        }

        // 归一化
        const allResults = Array.from(scoreMap.values());
        const normalizedVector = this.normalize(allResults.map(r => ({ ...r, score: r.vectorScore })));
        const normalizedBM25 = this.normalize(allResults.map(r => ({ ...r, score: r.bm25Score })));

        // 融合分数
        for (let i = 0; i < allResults.length; i++) {
            allResults[i].vectorScoreNorm = normalizedVector[i].normalizedScore;
            allResults[i].bm25ScoreNorm = normalizedBM25[i].normalizedScore;
            allResults[i].fusedScore =
                vectorWeight * normalizedVector[i].normalizedScore +
                (1 - vectorWeight) * normalizedBM25[i].normalizedScore;
        }

        // 按融合分数排序
        return allResults.sort((a, b) => b.fusedScore - a.fusedScore);
    }

    /**
     * 预处理文档集合（计算全局统计）
     */
    preprocess(chunks) {
        // 计算平均文档长度
        const docLengths = chunks.map(c => (c.text || c.full_context || '').length);
        this.avgDocLength = docLengths.reduce((a, b) => a + b, 0) / docLengths.length;

        // 计算文档频率（每个词出现在多少文档中）
        const docFreq = {};

        for (const chunk of chunks) {
            const tokens = new Set(this.tokenize(chunk.text || chunk.full_context || ''));
            for (const token of tokens) {
                docFreq[token] = (docFreq[token] || 0) + 1;
            }
        }

        this.totalDocs = chunks.length;
        this.docFreq = docFreq;

        console.log(`  📊 BM25预处理: avgDocLen=${this.avgDocLength.toFixed(0)}, 词汇量=${Object.keys(docFreq).length}`);

        return { avgDocLength: this.avgDocLength, docFreq, totalDocs: this.totalDocs };
    }

    /**
     * BM25检索
     */
    searchBM25(query, chunks, topK = 20) {
        if (!this.docFreq) {
            this.preprocess(chunks);
        }

        const results = [];

        for (const chunk of chunks) {
            const text = chunk.text || chunk.full_context || '';
            const docLength = text.length;

            const score = this.calculateBM25(
                query, text, docLength,
                this.avgDocLength, this.docFreq, this.totalDocs,
                this.k1, this.b
            );

            if (score > 0) {
                results.push({
                    ...chunk,
                    score,
                    searchType: 'bm25'
                });
            }
        }

        // 按分数排序并取TopK
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
}

module.exports = HybridSearch;
