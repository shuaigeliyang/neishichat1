/**
 * 数据库搜索服务
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：基于MySQL全文索引的文档搜索，完全不依赖API！
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// ✨ 同义词映射表 - 口语化转正式用语
const SYNONYM_MAP = {
    '挂科': '不及格',
    '挂了': '不及格',
    '没过': '不及格',
    '考砸': '不及格',
    '重读': '重修',
    '重考': '补考',
    '转系': '转专业',
    '退学': '休学',
    '补修': '补修课程',
    '免修': '免修课程',
    '要钱': '费用',
    '多少钱': '费用',
    '要交钱': '缴费',
    '收费': '费用'
};

class DatabaseSearchService {
    constructor(options = {}) {
        this.pool = null;
        this.options = {
            host: options.host || process.env.DB_HOST,
            port: options.port || process.env.DB_PORT,
            user: options.user || process.env.DB_USER,
            password: options.password || process.env.DB_PASSWORD,
            database: options.database || process.env.DB_NAME,
            ...options
        };
    }

    /**
     * 初始化连接池
     */
    async initialize() {
        if (this.pool) return;

        this.pool = mysql.createPool({
            host: this.options.host,
            port: this.options.port,
            user: this.options.user,
            password: this.options.password,
            database: this.options.database,
            connectionLimit: 10,
            waitForConnections: true,
            queueLimit: 0
        });

        console.log('✓ 数据库搜索服务已初始化');
    }

    /**
     * 搜索文档
     * @param {string} question - 用户问题
     * @param {Object} options - 搜索选项
     * @returns {Array} 搜索结果
     */
    async search(question, options = {}) {
        const {
            topK = 5,       // 返回结果数量
            minScore = 0.3  // 最低相关度（暂未使用）
        } = options;

        await this.initialize();

        // 提取关键词
        const keywords = this.extractKeywords(question);
        console.log(`✓ 搜索关键词：${keywords.join(', ')}`);

        // 构建搜索查询
        let results = [];

        // 1. 先尝试精确匹配（包含所有关键词的段落优先）
        results = await this.exactMatchSearch(keywords, topK * 2);

        // 2. 如果精确匹配结果不足，使用LIKE模糊搜索
        if (results.length < topK) {
            const likeResults = await this.likeSearch(keywords, topK * 2);
            // 合并结果，去重
            likeResults.forEach(item => {
                if (!results.find(r => r.id === item.id)) {
                    results.push(item);
                }
            });
        }

        // 3. 使用全文搜索（MySQL FULLTEXT）
        const fulltextResults = await this.fulltextSearch(keywords, topK * 2);
        fulltextResults.forEach(item => {
            if (!results.find(r => r.id === item.id)) {
                results.push(item);
            }
        });

        // 计算相关度得分
        results = this.calculateRelevance(question, results, keywords);

        // 排序并返回TopK
        results = results
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, topK);

        console.log(`✓ 找到${results.length}个相关文档`);

        return results.map(item => ({
            chunk: {
                id: item.id,
                chapter_title: item.chapter_title,
                chapter_num: item.chapter_num,
                page_number: item.page_number,
                paragraph_num: item.paragraph_num,
                text: item.text,
                source_file: item.source_file
            },
            score: item.relevanceScore,
            matchType: item.matchType
        }));
    }

    /**
     * 提取关键词（智能版）
     */
    extractKeywords(text) {
        // 常见停用词
        const stopWords = new Set([
            '的', '是', '在', '和', '与', '或', '了', '我', '你', '他', '她', '它', '们',
            '吗', '呢', '吧', '啊', '哦', '嗯', '这', '那', '一个', '可以', '这个', '那个',
            '有', '没有', '会', '能', '要', '不', '很', '都', '请', '问', '一下', '想', '知道',
            '能够', '应该', '请问', '帮我', '我想', '请问我', '能不能', '可不可以', '有没有',
            '是不是', '怎么样', '哪些', '什么', '怎样', '为什么', '怎么', '如何', '好不好'
        ]);

        // ✨ 先进行同义词替换
        let normalizedText = text;
        for (const [colloquial, formal] of Object.entries(SYNONYM_MAP)) {
            normalizedText = normalizedText.replace(new RegExp(colloquial, 'g'), formal);
        }

        // 如果有替换，打印日志
        if (normalizedText !== text) {
            console.log(`  🔄 关键词同义词替换：${text.substring(0, 30)}... → ${normalizedText.substring(0, 30)}...`);
        }

        // 移除标点符号，保留中文和字母数字
        const cleanText = normalizedText.replace(/[，。！？、：；""''【】（）《》，、；：""''!?;:\"\'\[\]()\s,.!?'\"-]/g, '');

        // 提取关键词：2-6个字符的有意义词组
        const keywords = new Set();
        const len = cleanText.length;

        // 提取2-6个字的词
        for (let windowSize = 2; windowSize <= 6; windowSize++) {
            for (let i = 0; i <= len - windowSize; i++) {
                const word = cleanText.substring(i, i + windowSize);
                // 过滤掉包含停用词的词
                let isValid = word.length >= 2 && !stopWords.has(word);

                // 过滤掉纯数字或纯字母的词
                if (isValid && /^[0-9a-zA-Z]+$/.test(word)) {
                    isValid = false;
                }

                if (isValid) {
                    keywords.add(word);
                }
            }
        }

        // ✨ 也把原始问题的关键词加进去（保留口语化搜索）
        const originalClean = text.replace(/[，。！？、：；""''【】（）《》\s,.!?'\"-]/g, '');
        for (let windowSize = 2; windowSize <= 4; windowSize++) {
            for (let i = 0; i <= originalClean.length - windowSize; i++) {
                const word = originalClean.substring(i, i + windowSize);
                if (word.length >= 2 && !stopWords.has(word)) {
                    keywords.add(word);
                }
            }
        }

        // 返回关键词列表（按长度排序，长词优先）
        const result = [...keywords].sort((a, b) => b.length - a.length);
        return result.slice(0, 15); // 最多返回15个关键词
    }

    /**
     * 精确匹配搜索（至少包含N个关键词）
     */
    async exactMatchSearch(keywords, limit) {
        if (keywords.length === 0) return [];

        // 取前8个关键词
        const topKeywords = keywords.slice(0, 8);

        // ✨ 改用OR逻辑：至少包含1个关键词即可
        const orConditions = topKeywords.map(k => `text LIKE '%${k}%'`).join(' OR ');

        const sql = `
            SELECT *,
                (${topKeywords.map(k => `(text LIKE '%${k}%')`).join(' + ')}) as match_count
            FROM document_chunks
            WHERE ${orConditions}
            ORDER BY match_count DESC, CHAR_LENGTH(text) ASC
            LIMIT ${parseInt(limit)}
        `;

        try {
            const [rows] = await this.pool.query(sql);
            return rows.map(row => ({
                ...row,
                matchType: 'exact'
            }));
        } catch (error) {
            console.log('  ⚠ 精确匹配失败：', error.message);
            return [];
        }
    }

    /**
     * LIKE模糊搜索
     */
    async likeSearch(keywords, limit) {
        if (keywords.length === 0) return [];

        // 至少包含一个关键词
        const conditions = keywords.map(() => 'text LIKE ?').join(' OR ');
        const params = keywords.map(k => `%${k}%`);

        const sql = `
            SELECT * FROM document_chunks
            WHERE ${conditions}
            ORDER BY CHAR_LENGTH(text) ASC
            LIMIT ${parseInt(limit)}
        `;

        const [rows] = await this.pool.query(sql, [...params]);

        return rows.map(row => ({
            ...row,
            matchType: 'like'
        }));
    }

    /**
     * 全文搜索（MySQL FULLTEXT）
     */
    async fulltextSearch(keywords, limit) {
        if (keywords.length === 0) return [];

        // 转换关键词为布尔模式
        const matchMode = keywords.map(k => `+${k}`).join(' ');

        try {
            const sql = `
                SELECT *, MATCH(text) AGAINST(? IN BOOLEAN MODE) AS ft_score
                FROM document_chunks
                WHERE MATCH(text) AGAINST(? IN BOOLEAN MODE)
                ORDER BY ft_score DESC
                LIMIT ${parseInt(limit)}
            `;

            const [rows] = await this.pool.query(sql, [matchMode, matchMode]);

            return rows.map(row => ({
                ...row,
                matchType: 'fulltext'
            }));
        } catch (error) {
            console.log('  ⚠ 全文搜索失败：', error.message);
            return [];
        }
    }

    /**
     * 计算相关度得分
     */
    calculateRelevance(question, results, keywords) {
        const questionLower = question.toLowerCase();

        return results.map(item => {
            const textLower = item.text.toLowerCase();
            let score = 0;

            // 1. 关键词命中得分
            keywords.forEach(keyword => {
                const keywordLower = keyword.toLowerCase();
                // 计算关键词在文本中出现的次数
                const matches = (textLower.match(new RegExp(keywordLower, 'g')) || []).length;
                score += matches * 10;

                // 标题匹配额外加分
                if (item.chapter_title && item.chapter_title.toLowerCase().includes(keywordLower)) {
                    score += 50;
                }

                // 问题完整匹配文本中的短语
                if (textLower.includes(questionLower)) {
                    score += 100;
                }
            });

            // 2. 匹配类型加成
            if (item.matchType === 'exact') {
                score *= 1.5;
            } else if (item.matchType === 'fulltext') {
                score *= 1.2;
            }

            // 3. 文本长度惩罚（避免返回超长段落）
            const lengthPenalty = Math.max(0.5, 1 - (item.text.length - 500) / 2000);
            score *= lengthPenalty;

            return {
                ...item,
                relevanceScore: Math.min(1, score / 100)
            };
        });
    }

    /**
     * 获取文档统计
     */
    async getStats() {
        await this.initialize();

        const [[countResult]] = await this.pool.query('SELECT COUNT(*) as count FROM document_chunks');
        const [[chaptersResult]] = await this.pool.query('SELECT COUNT(DISTINCT chapter_title) as count FROM document_chunks');
        const [[pageResult]] = await this.pool.query('SELECT MAX(page_number) as maxPage FROM document_chunks');

        return {
            totalChunks: countResult.count,
            totalChapters: chaptersResult.count,
            maxPage: pageResult.maxPage
        };
    }

    /**
     * 关闭连接池
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            console.log('✓ 数据库连接池已关闭');
        }
    }
}

// 导出
module.exports = DatabaseSearchService;

// 测试
if (require.main === module) {
    (async () => {
        const searchService = new DatabaseSearchService();

        try {
            // 获取统计
            console.log('\n📊 文档统计：');
            const stats = await searchService.getStats();
            console.log(`  - 总文档块：${stats.totalChunks}`);
            console.log(`  - 总章节：${stats.totalChapters}`);
            console.log(`  - 最大页码：${stats.maxPage}`);

            // 测试搜索
            console.log('\n' + '='.repeat(60));
            console.log('❓ 测试问题：挂科了怎么办？');
            console.log('='.repeat(60));

            const results = await searchService.search('挂科了怎么办', { topK: 3 });

            console.log('\n📚 搜索结果：');
            results.forEach((result, i) => {
                console.log(`\n${i + 1}. [${result.chunk.chapter_title}] 第${result.chunk.page_number}页 (得分：${result.score.toFixed(2)})`);
                console.log(`   ${result.chunk.text.substring(0, 150)}...`);
            });

            await searchService.close();
            process.exit(0);
        } catch (error) {
            console.error('测试失败：', error);
            await searchService.close();
            process.exit(1);
        }
    })();
}
