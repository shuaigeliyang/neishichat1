/**
 * 预热常见问题的Embedding缓存
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：预先计算常见问题的embedding，避免运行时调用API
 */

const dotenv = require('dotenv');
const EmbeddingService = require('./services/embeddingService');

dotenv.config();

// 常见问题列表（根据你的实际业务调整）
const COMMON_QUESTIONS = [
    // 重修相关
    '重修需要什么条件？',
    '重修怎么申请？',
    '重修费用是多少？',
    '重修不过怎么办？',

    // 补考相关
    '补考需要什么条件？',
    '补考怎么申请？',
    '补考不过怎么办？',

    // 奖学金相关
    '奖学金怎么申请？',
    '奖学金有哪些类型？',
    '奖学金评定标准是什么？',

    // 纪律处分相关
    '挂科会怎么样？',
    '作弊会被处分吗？',
    '处分怎么撤销？',

    // 转专业相关
    '转专业需要什么条件？',
    '转专业怎么申请？',
    '转专业什么时候可以申请？',

    // 宿舍相关
    '怎么调换宿舍？',
    '可以校外住宿吗？',
    '宿舍管理规定是什么？',

    // 其他
    '怎么请假？',
    '毕业论文要求是什么？',
    '学费多少钱？',
];

async function main() {
    console.log('\n🔥 开始预热常见问题的Embedding缓存...\n');

    const embeddingService = new EmbeddingService(
        process.env.ZHIPU_API_KEY,
        './embedding_cache.json'
    );

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < COMMON_QUESTIONS.length; i++) {
        const question = COMMON_QUESTIONS[i];
        console.log(`[${i + 1}/${COMMON_QUESTIONS.length}] 处理：${question}`);

        try {
            await embeddingService.getEmbedding(question);
            successCount++;
            console.log(`  ✅ 成功\n`);
        } catch (error) {
            failCount++;
            console.log(`  ❌ 失败：${error.message}\n`);
        }

        // 避免请求过快
        if (i < COMMON_QUESTIONS.length - 1) {
            await embeddingService.sleep(500);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 预热完成！');
    console.log(`   成功：${successCount}/${COMMON_QUESTIONS.length}`);
    console.log(`   失败：${failCount}/${COMMON_QUESTIONS.length}`);
    console.log('   缓存文件：./embedding_cache.json');
    console.log('='.repeat(80) + '\n');
}

main().catch(error => {
    console.error('❌ 预热失败：', error);
    process.exit(1);
});
