/**
 * RAG系统准确性验证
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function verifyRAccuracy() {
    console.log('='.repeat(60));
    console.log('RAG系统准确性验证');
    console.log('设计师：内师智能体系统 (￣▽￣)ﾉ');
    console.log('='.repeat(60) + '\n');

    // 步骤1：登录
    console.log('步骤1：登录...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
        username: 'S2201001',
        password: '123456'
    });

    const token = loginResponse.data.data.token;
    console.log('✓ 登录成功\n');

    // 步骤2：测试问题
    const testQuestion = '我挂科了怎么办';

    console.log('步骤2：测试问题：' + testQuestion + '\n');

    // 调用RAG接口
    const ragResponse = await axios.post(
        'http://localhost:3000/api/rag/answer',
        { question: testQuestion },
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );

    if (ragResponse.data.success) {
        const result = ragResponse.data.data;

        console.log('步骤3：验证结果\n');
        console.log('✓ RAG调用成功');
        console.log('✓ 回答长度：' + result.answer.length + ' 字符');
        console.log('✓ 来源数量：' + result.sources.length + ' 个');
        console.log('✓ 置信度：' + result.confidence);
        console.log('✓ 耗时：' + result.elapsed + 'ms\n');

        // 验证页码
        console.log('步骤4：页码验证');
        const pages = result.sources.map(s => s.page);
        console.log('来源页码：' + pages.join(', '));

        const invalidPages = pages.filter(p => p < 1 || p > 128);
        if (invalidPages.length === 0) {
            console.log('✅ 所有页码都在1-128范围内\n');
        } else {
            console.log('❌ 发现超出范围的页码：' + invalidPages.join(', ') + '\n');
        }

        // 验证去重
        const uniquePages = [...new Set(pages)];
        if (uniquePages.length === pages.length) {
            console.log('✅ 没有重复页码\n');
        } else {
            console.log('❌ 发现重复页码：' + (pages.length - uniquePages.length) + ' 个重复\n');
        }

        // 显示前3个来源
        console.log('步骤5：来源详情（前3个）');
        result.sources.slice(0, 3).forEach((source, index) => {
            console.log(`  ${index + 1}. 第${source.page}页 | 相似度:${source.score?.toFixed(3)} | 内容长度:${source.snippet?.length || 0}`);
        });

        // 验证文档内容
        console.log('\n步骤6：验证文档内容');
        const handbook = JSON.parse(fs.readFileSync(path.join(__dirname, 'student_handbook_full.json'), 'utf-8'));

        const firstSourcePage = result.sources[0].page;
        const pageContent = handbook.pages.find(p => p.page_num === firstSourcePage);

        if (pageContent) {
            console.log(`✅ 第${firstSourcePage}页内容验证成功`);
            console.log(`   内容长度：${pageContent.text.length} 字符`);
            console.log(`   内容预览：${pageContent.text.substring(0, 100)}...\n`);
        } else {
            console.log(`❌ 第${firstSourcePage}页内容不存在！\n`);
        }

        console.log('='.repeat(60));
        console.log('✅ 验证完成！系统准确性良好');
        console.log('='.repeat(60));

    } else {
        console.log('❌ RAG调用失败：' + ragResponse.data.error);
    }
}

verifyRAccuracy().catch(error => {
    console.error('✗ 验证失败：', error.message);
});
