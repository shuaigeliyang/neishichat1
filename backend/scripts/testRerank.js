/**
 * Rerank服务测试脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 *
 * 运行方式：
 * node scripts/testRerank.js [mode]
 *
 * mode参数（可选）：
 *   - api: 测试智谱AI Rerank
 *   - local: 测试本地Rerank
 *   - hybrid: 测试混合模式（默认）
 */

require('dotenv').config();
const { ZhipuRerankService, LocalRerankService } = require('../services/rerankService');

// 测试数据
const testQueries = [
    '重修需要什么条件？',
    '如何申请奖学金？',
    '转专业的流程是什么？',
    '学生违纪会怎么处理？'
];

const testDocuments = [
    {
        text: '重修课程需满足以下条件：(1)课程考核不合格，经补考后仍不合格者；(2)因故未参加考核且不符合缓考条件者；(3)对已获学分不满意，可申请重修，成绩按高分记载。重修需在规定时间内向所在学院提出申请，经批准后办理相关手续。',
        chapter: '第二章 学业管理',
        page: 15
    },
    {
        text: '奖学金申请条件：1.热爱社会主义祖国，拥护中国共产党的领导；2.遵守宪法和法律，遵守学校规章制度；3.诚实守信，道德品质优良；4.学习成绩优异，综合素质测评在班级前30%。申请材料包括申请表、成绩单、获奖证书等，每年9月受理申请。',
        chapter: '第三章 奖励与处分',
        page: 28
    },
    {
        text: '转专业程序：学生可在第一学年结束后申请转专业。条件：原专业成绩排名前30%，无违纪记录。流程：1.向原学院提交申请；2.参加转入学院考核；3.经双方学院同意后报教务处审批。转专业后需补修转入专业的必修课程。',
        chapter: '第二章 学业管理',
        page: 22
    },
    {
        text: '学生违纪处理：根据违纪程度分为警告、严重警告、记过、留校察看、开除学籍五种。轻微违纪给予警告或严重警告；较重违纪给予记过或留校察看；严重违纪如作弊、打架等可给予开除学籍。受处分学生可申诉，申诉期一般为15个工作日。',
        chapter: '第三章 奖励与处分',
        page: 35
    },
    {
        text: '课程选课规则：每学期选课不超过30学分。必修课必须选，选修课根据培养方案选择。选课时间一般为每学期最后两周和开学第一周。退课须在开学两周内办理，逾期不予退课。未选课而参加考核者成绩无效。',
        chapter: '第二章 学业管理',
        page: 18
    }
];

/**
 * 测试智谱AI Rerank
 */
async function testZhipuRerank() {
    console.log('\n' + '='.repeat(80));
    console.log('【测试模式】智谱AI Rerank API');
    console.log('='.repeat(80) + '\n');

    const apiKey = process.env.ZHIPU_API_KEY;

    if (!apiKey || apiKey === 'your-api-key-here') {
        console.error('✗ 错误：请设置有效的 ZHIPU_API_KEY 环境变量！');
        console.log('  提示：可以在 .env 文件中设置，或直接运行：export ZHIPU_API_KEY=your-key');
        return false;
    }

    const rerankService = new ZhipuRerankService(apiKey);
    const query = testQueries[0];

    console.log(`📝 查询：${query}\n`);

    try {
        const startTime = Date.now();

        const results = await rerankService.rerank(query, testDocuments, {
            topN: 3,
            useCache: true
        });

        const elapsed = Date.now() - startTime;

        console.log(`✓ Rerank成功！耗时：${elapsed}ms\n`);
        console.log('【重排序结果】');
        results.forEach((item, index) => {
            const doc = testDocuments[item.index];
            console.log(`\n${index + 1}. 分数：${item.relevance_score.toFixed(4)}`);
            console.log(`   章节：${doc.chapter}`);
            console.log(`   内容：${doc.text.slice(0, 80)}...`);
        });

        // 显示缓存统计
        const cacheStats = rerankService.getCacheStats();
        console.log(`\n📊 缓存统计：${cacheStats.size} 条记录`);

        return true;

    } catch (error) {
        console.error(`\n✗ 测试失败：${error.message}`);
        console.log('  可能原因：');
        console.log('  1. API密钥无效或已过期');
        console.log('  2. 网络连接问题');
        console.log('  3. API服务暂时不可用');
        return false;
    }
}

/**
 * 测试本地Rerank
 */
async function testLocalRerank() {
    console.log('\n' + '='.repeat(80));
    console.log('【测试模式】本地关键词匹配 Rerank');
    console.log('='.repeat(80) + '\n');

    const localRerank = new LocalRerankService();
    const query = testQueries[1];

    console.log(`📝 查询：${query}\n`);

    // 模拟语义搜索分数
    const semanticScores = testDocuments.map((_, i) => ({
        score: 0.5 + Math.random() * 0.4  // 随机生成 0.5-0.9 的分数
    }));

    const startTime = Date.now();

    const results = localRerank.rerank(query, testDocuments, {
        semanticScores: semanticScores,
        keywordWeight: 0.3,
        semanticWeight: 0.7
    });

    const elapsed = Date.now() - startTime;

    console.log(`✓ Rerank成功！耗时：${elapsed}ms\n`);
    console.log('【重排序结果】');
    results.forEach((item, index) => {
        const doc = testDocuments[item.index];
        console.log(`\n${index + 1}. 综合分数：${item.relevance_score.toFixed(4)}`);
        console.log(`   语义分数：${item.semantic_score.toFixed(4)}`);
        console.log(`   关键词分数：${item.keyword_score.toFixed(4)}`);
        console.log(`   章节：${doc.chapter}`);
        console.log(`   内容：${doc.text.slice(0, 80)}...`);
    });

    // 显示提取的关键词
    const keywords = localRerank.extractKeywords(query);
    console.log(`\n🔑 提取的关键词：${keywords.join('、')}`);

    return true;
}

/**
 * 测试混合模式
 */
async function testHybridMode() {
    console.log('\n' + '='.repeat(80));
    console.log('【测试模式】混合模式（API优先，失败降级到本地）');
    console.log('='.repeat(80) + '\n');

    const apiKey = process.env.ZHIPU_API_KEY;

    if (!apiKey || apiKey === 'your-api-key-here') {
        console.log('⚠ 未设置API密钥，直接测试本地Rerank...\n');
        return await testLocalRerank();
    }

    const query = testQueries[2];
    console.log(`📝 查询：${query}\n`);

    try {
        // 先尝试API
        const zhipuRerank = new ZhipuRerankService(apiKey);
        const startTime = Date.now();

        const results = await zhipuRerank.rerank(query, testDocuments, {
            topN: 3
        });

        const elapsed = Date.now() - startTime;
        console.log(`✓ API Rerank成功！耗时：${elapsed}ms\n`);
        console.log('【重排序结果】');
        results.forEach((item, index) => {
            const doc = testDocuments[item.index];
            console.log(`\n${index + 1}. 分数：${item.relevance_score.toFixed(4)}`);
            console.log(`   章节：${doc.chapter}`);
            console.log(`   内容：${doc.text.slice(0, 80)}...`);
        });

        return true;

    } catch (error) {
        console.log(`⚠ API Rerank失败：${error.message}`);
        console.log('🔄 自动降级到本地Rerank...\n');

        // 降级到本地
        return await testLocalRerank();
    }
}

/**
 * 批量测试
 */
async function batchTest() {
    console.log('\n' + '='.repeat(80));
    console.log('【批量测试】所有查询和文档');
    console.log('='.repeat(80) + '\n');

    const apiKey = process.env.ZHIPU_API_KEY;

    if (!apiKey || apiKey === 'your-api-key-here') {
        console.log('⚠ 未设置API密钥，使用本地Rerank...\n');
        const localRerank = new LocalRerankService();

        for (const query of testQueries) {
            console.log(`\n📝 查询：${query}`);
            const results = localRerank.rerank(query, testDocuments);
            console.log(`✓ Top-1：第${results[0].index + 1}个文档（分数：${results[0].relevance_score.toFixed(4)}）`);
        }

        return;
    }

    const rerankService = new ZhipuRerankService(apiKey);

    for (const query of testQueries) {
        console.log(`\n📝 查询：${query}`);

        try {
            const results = await rerankService.rerank(query, testDocuments, { topN: 1 });
            console.log(`✓ Top-1：第${results[0].index + 1}个文档（分数：${results[0].relevance_score.toFixed(4)}）`);
        } catch (error) {
            console.log(`✗ 失败：${error.message}`);
        }
    }

    // 显示最终缓存统计
    const stats = rerankService.getCacheStats();
    console.log(`\n📊 缓存统计：${stats.size} 条记录`);
}

/**
 * 主函数
 */
async function main() {
    const mode = process.argv[2] || 'hybrid';

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          Rerank服务测试 - 内师智能体系统出品 (￣▽￣)ﾉ          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    try {
        switch (mode) {
            case 'api':
                await testZhipuRerank();
                break;

            case 'local':
                await testLocalRerank();
                break;

            case 'hybrid':
                await testHybridMode();
                break;

            case 'batch':
                await batchTest();
                break;

            default:
                console.log(`\n✗ 未知模式：${mode}`);
                console.log('  可用模式：api, local, hybrid, batch');
                break;
        }

        console.log('\n' + '='.repeat(80));
        console.log('✓ 测试完成！');
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n✗ 测试过程出错：', error);
        process.exit(1);
    }
}

// 运行测试
if (require.main === module) {
    main();
}

module.exports = { testZhipuRerank, testLocalRerank, testHybridMode, batchTest };
