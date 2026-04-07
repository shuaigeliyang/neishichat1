/**
 * 测试检索功能
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

require('dotenv').config();
const RetrievalEngine = require('../services/retrievalEngine');

async function testRetrieval() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          检索功能测试 - 内师智能体系统出品 (￣▽￣)ﾉ          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const apiKey = process.env.ZHIPU_API_KEY;
    const engine = new RetrievalEngine(apiKey, {
        rerankMode: 'hybrid'
    });

    try {
        // 加载文档
        await engine.loadChunks('../document_chunks.json');
        console.log(`✓ 已加载 ${engine.chunks.length} 个文档块\n`);

        // 建立索引
        console.log('✓ 正在建立向量索引...');
        await engine.buildIndex();
        console.log('✓ 索引建立完成\n');

        // 测试不同的问题表述
        const testQueries = [
            '学生挂科了会怎么样',        // 口语化
            '学生不及格会怎么样',        // 稍正式
            '课程考核不合格怎么办',      // 正式用语
            '补考和重修的规定是什么',     // 具体询问
            '成绩不合格如何处理'         // 另一种表述
        ];

        for (const query of testQueries) {
            console.log(''.repeat(80));
            console.log(`📝 查询：${query}`);
            console.log(''.repeat(80));

            const results = await engine.retrieve(query, {
                topK: 3,
                minScore: 0.3,  // 降低阈值看看
                useReranking: true
            });

            if (results.length === 0) {
                console.log('❌ 未找到相关文档\n');
            } else {
                console.log(`✓ 找到 ${results.length} 个相关文档：\n`);
                results.forEach((item, index) => {
                    console.log(`${index + 1}. [分数: ${item.score.toFixed(4)}]`);
                    console.log(`   章节：${item.chunk.section_title || item.chunk.chapter_title || '未知'}`);
                    console.log(`   内容：${item.chunk.text.slice(0, 100)}...`);
                    if (item.rerankMethod) {
                        console.log(`   Rerank方法：${item.rerankMethod}`);
                    }
                    console.log('');
                });
            }

            // 延时避免API限流
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        console.error('✗ 测试失败：', error);
    }
}

testRetrieval();
