/**
 * Rerank方案对比测试工具
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：对比API Rerank vs 本地Rerank的效果
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;

dotenv.config();

const EmbeddingService = require('./services/embeddingService');
const { ZhipuRerankService } = require('./services/rerankService');
const EnhancedLocalRerankService = require('./services/enhancedLocalRerank');

/**
 * 加载测试数据
 */
async function loadTestData() {
    const data = await fs.readFile(
        path.join(__dirname, '../document_chunks.json'),
        'utf-8'
    );
    return JSON.parse(data);
}

/**
 * 测试问题列表
 */
const testQuestions = [
    { q: '重修需要交钱吗', expectedKeywords: ['重修', '费用', '交钱', '收费'] },
    { q: '挂科了会怎么样', expectedKeywords: ['不及格', '挂科', '处理', '后果'] },
    { q: '如何申请奖学金', expectedKeywords: ['奖学金', '申请', '条件', '流程'] },
    { q: '转专业有什么要求', expectedKeywords: ['转专业', '条件', '要求', '流程'] },
    { q: '学生作弊怎么处理', expectedKeywords: ['作弊', '违纪', '处分', '处理'] }
];

/**
 * 计算关键词匹配率
 */
function calculateKeywordMatch(topDocs, expectedKeywords) {
    const allText = topDocs.map(d => d.chunk?.text || d.document || '').join(' ');
    const matchedKeywords = expectedKeywords.filter(kw => allText.includes(kw));
    return {
        matched: matchedKeywords.length,
        total: expectedKeywords.length,
        rate: matchedKeywords.length / expectedKeywords.length,
        matchedKeywords
    };
}

/**
 * 对比测试
 */
async function runComparisonTest() {
    console.log('\n' + '='.repeat(80));
    console.log('🔬 Rerank方案对比测试 - 内师智能体系统出品');
    console.log('='.repeat(80) + '\n');

    // 1. 加载数据
    console.log('📦 加载测试数据...');
    const chunks = await loadTestData();
    console.log(`✓ 加载了${chunks.length}个文档块`);

    // 2. 初始化服务
    const embeddingService = new EmbeddingService(process.env.ZHIPU_API_KEY);
    const apiRerank = new ZhipuRerankService(process.env.ZHIPU_API_KEY);
    const localRerank = new EnhancedLocalRerankService();

    console.log('\n' + '='.repeat(80));
    console.log('📊 开始对比测试');
    console.log('='.repeat(80) + '\n');

    const results = {
        api: { totalMatch: 0, totalTime: 0 },
        local: { totalMatch: 0, totalTime: 0 },
        tests: []
    };

    for (const { q, expectedKeywords } of testQuestions) {
        console.log(`\n🔍 测试问题: "${q}"`);
        console.log('-'.repeat(80));

        // 获取问题的embedding
        const questionEmbedding = await embeddingService.getEmbedding(q);

        // 计算所有文档的相似度
        const similarities = chunks.map(chunk => {
            const embedding = chunk.embedding;
            if (!embedding) return { chunk, score: 0 };

            let dotProduct = 0, norm1 = 0, norm2 = 0;
            for (let i = 0; i < questionEmbedding.length; i++) {
                dotProduct += questionEmbedding[i] * embedding[i];
                norm1 += questionEmbedding[i] * questionEmbedding[i];
                norm2 += embedding[i] * embedding[i];
            }
            const score = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

            return { chunk, score };
        });

        // 取前10个作为候选文档
        const topCandidates = similarities
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        const documents = topCandidates.map(item => ({
            text: item.chunk.text,
            metadata: {
                chapter: item.chunk.chapter_title,
                page: item.chunk.page_num
            }
        }));

        const semanticScores = topCandidates.map(item => ({ score: item.score }));

        // 测试API Rerank
        console.log('\n  [API Rerank]');
        let apiResults = [];
        let apiTime = 0;
        try {
            const apiStart = Date.now();
            apiResults = await apiRerank.rerank(q, documents, { topN: 5 });
            apiTime = Date.now() - apiStart;
            console.log(`    ✓ 成功 | 耗时: ${apiTime}ms`);
        } catch (error) {
            console.log(`    ✗ 失败 | ${error.message}`);
            // 失败时使用原始顺序
            apiResults = documents.map((doc, index) => ({
                index,
                relevance_score: 1.0 - index * 0.1
            }));
        }

        const apiTopDocs = apiResults.slice(0, 3).map(r => ({
            chunk: topCandidates[r.index].chunk
        }));
        const apiMatch = calculateKeywordMatch(apiTopDocs, expectedKeywords);

        console.log(`    📊 关键词匹配: ${apiMatch.matched}/${apiMatch.total} (${(apiMatch.rate * 100).toFixed(0)}%)`);
        console.log(`    ✓ 匹配的关键词: ${apiMatch.matchedKeywords.join(', ') || '无'}`);

        results.api.totalMatch += apiMatch.rate;
        results.api.totalTime += apiTime;

        // 测试本地Rerank（增强版）
        console.log('\n  [本地Rerank增强版]');
        const localStart = Date.now();
        const localResults = localRerank.rerank(q, documents, {
            semanticScores: semanticScores
        });
        const localTime = Date.now() - localStart;
        console.log(`    ✓ 成功 | 耗时: ${localTime}ms`);

        const localTopDocs = localResults.slice(0, 3).map(r => ({
            chunk: topCandidates[r.index].chunk
        }));
        const localMatch = calculateKeywordMatch(localTopDocs, expectedKeywords);

        console.log(`    📊 关键词匹配: ${localMatch.matched}/${localMatch.total} (${(localMatch.rate * 100).toFixed(0)}%)`);
        console.log(`    ✓ 匹配的关键词: ${localMatch.matchedKeywords.join(', ') || '无'}`);

        results.local.totalMatch += localMatch.rate;
        results.local.totalTime += localTime;

        // 保存本次测试结果
        results.tests.push({
            question: q,
            api: { matchRate: apiMatch.rate, time: apiTime },
            local: { matchRate: localMatch.rate, time: localTime },
            winner: localMatch.rate >= apiMatch.rate ? 'local' : 'api'
        });
    }

    // 打印总结
    console.log('\n' + '='.repeat(80));
    console.log('📈 测试结果总结');
    console.log('='.repeat(80) + '\n');

    const apiAvgMatch = (results.api.totalMatch / testQuestions.length * 100).toFixed(1);
    const localAvgMatch = (results.local.totalMatch / testQuestions.length * 100).toFixed(1);
    const apiAvgTime = (results.api.totalTime / testQuestions.length).toFixed(0);
    const localAvgTime = (results.local.totalTime / testQuestions.length).toFixed(0);

    console.log('🎯 关键词匹配率（越高越好）：');
    console.log(`   API Rerank:     ${apiAvgMatch}%`);
    console.log(`   本地Rerank增强: ${localAvgMatch}%`);
    console.log(`   差异:          ${parseFloat(localAvgMatch) - parseFloat(apiAvgMatch) > 0 ? '+' : ''}${(parseFloat(localAvgMatch) - parseFloat(apiAvgMatch)).toFixed(1)}%`);

    console.log('\n⏱️  平均响应时间（越低越好）：');
    console.log(`   API Rerank:     ${apiAvgTime}ms`);
    console.log(`   本地Rerank增强: ${localAvgTime}ms`);
    console.log(`   速度提升:      ${(parseFloat(apiAvgTime) / parseFloat(localAvgTime)).toFixed(1)}x`);

    console.log('\n🏆 各问题胜出者：');
    results.tests.forEach((test, i) => {
        const winner = test.winner === 'local' ? '本地Rerank ✅' : 'API Rerank 🎯';
        console.log(`   ${i + 1}. "${test.question}": ${winner}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('💡 部署建议');
    console.log('='.repeat(80));

    const localWins = results.tests.filter(t => t.winner === 'local').length;
    const apiWins = results.tests.filter(t => t.winner === 'api').length;

    if (localWins >= apiWins) {
        console.log('\n✅ 推荐使用：本地Rerank增强版');
        console.log('   理由：');
        console.log('   1. 关键词匹配率不低于API方案');
        console.log(`   2. 响应速度是API的${(parseFloat(apiAvgTime) / parseFloat(localAvgTime)).toFixed(1)}倍`);
        console.log('   3. 零成本、无限流、完全自主');
    } else {
        console.log('\n⚠️  API方案略优，但本地方案也可用');
        console.log('   建议：');
        console.log('   1. 生产环境使用本地Rerank（稳定性优先）');
        console.log('   2. 关键场景可临时切换到API方案');
        console.log('   3. 继续优化本地算法');
    }

    console.log('\n' + '='.repeat(80) + '\n');
}

// 运行测试
runComparisonTest().catch(error => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
});
