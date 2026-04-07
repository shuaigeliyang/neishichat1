/**
 * 测试RAG文档查询功能
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 用途：测试embedding和文档查询功能是否正常
 */

const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3000';
const TEST_USER = {
    username: 'admin',
    password: 'admin123'
};

// 获取JWT Token
async function login() {
    try {
        const response = await axios.post(`${API_URL}/api/auth/login`, TEST_USER);
        return response.data.data.token;
    } catch (error) {
        console.error('❌ 登录失败：', error.response?.data || error.message);
        throw error;
    }
}

// 测试RAG初始化
async function testInitialize(token) {
    console.log('\n📝 测试1：初始化RAG服务');
    console.log('='.repeat(80));

    try {
        const response = await axios.post(
            `${API_URL}/api/rag/initialize`,
            {},
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        console.log('✅ RAG服务初始化成功！');
        console.log(`   文档块数量：${response.data.data.stats.totalChunks}`);
        console.log(`   已索引：${response.data.data.stats.indexed ? '是' : '否'}`);
        console.log(`   缓存条目：${response.data.data.stats.cacheStats?.size || 0}`);

        return true;
    } catch (error) {
        console.log('⚠️  RAG服务初始化失败或已初始化');
        console.log(`   错误：${error.response?.data?.error || error.message}`);
        return false;
    }
}

// 测试文档查询
async function testQuery(token, question, index) {
    console.log(`\n📝 测试2.${index}：查询文档`);
    console.log('='.repeat(80));
    console.log(`问题：${question}`);

    try {
        const startTime = Date.now();

        const response = await axios.post(
            `${API_URL}/api/rag/answer`,
            { question },
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        const elapsed = Date.now() - startTime;

        console.log(`✅ 查询成功！耗时：${elapsed}ms`);
        console.log(`   置信度：${(response.data.data.confidence * 100).toFixed(1)}%`);
        console.log(`   返回文档数：${response.data.data.sources.length}`);
        console.log(`   回答：${response.data.data.answer.substring(0, 100)}...`);

        // 显示来源文档
        if (response.data.data.sources.length > 0) {
            console.log('\n   来源文档：');
            response.data.data.sources.forEach((source, i) => {
                console.log(`     ${i + 1}. ${source.chapter} (相似度: ${source.score?.toFixed(3)})`);
            });
        }

        return { success: true, elapsed, ...response.data.data };

    } catch (error) {
        console.log(`❌ 查询失败`);
        console.log(`   错误：${error.response?.data?.error || error.message}`);
        return { success: false, error: error.response?.data?.error || error.message };
    }
}

// 主测试流程
async function main() {
    console.log('\n' + '🔥'.repeat(40));
    console.log('🔥 RAG文档查询功能测试');
    console.log('🔥 设计师：内师智能体系统 (￣▽￣)ﾉ');
    console.log('🔥'.repeat(40));

    try {
        // 1. 登录
        console.log('\n📝 步骤1：登录...');
        const token = await login();
        console.log('✅ 登录成功！');

        // 2. 初始化RAG服务
        await testInitialize(token);

        // 3. 测试查询
        const testQuestions = [
            '重修需要什么条件？',
            '奖学金怎么申请？',
            '挂科会怎么样？'
        ];

        const results = [];
        for (let i = 0; i < testQuestions.length; i++) {
            const result = await testQuery(token, testQuestions[i], i + 1);
            results.push(result);
        }

        // 4. 统计结果
        console.log('\n' + '='.repeat(80));
        console.log('📊 测试结果总结');
        console.log('='.repeat(80));

        const successCount = results.filter(r => r.success).length;
        const avgTime = results
            .filter(r => r.success)
            .reduce((sum, r) => sum + r.elapsed, 0) / successCount;

        console.log(`\n成功查询：${successCount}/${results.length}`);
        console.log(`平均响应时间：${avgTime.toFixed(0)}ms`);
        console.log(`最快响应：${Math.min(...results.filter(r => r.success).map(r => r.elapsed))}ms`);
        console.log(`最慢响应：${Math.max(...results.filter(r => r.success).map(r => r.elapsed))}ms`);

        // 检查缓存效果
        console.log('\n📝 测试3：缓存效果测试');
        console.log('='.repeat(80));
        console.log('再次查询相同问题，应该使用缓存...');

        const cacheTestStart = Date.now();
        await testQuery(token, '重修需要什么条件？', 1);
        const cacheTestElapsed = Date.now() - cacheTestStart;

        console.log(`\n第二次查询耗时：${cacheTestElapsed}ms`);
        console.log(`与第一次对比：缓存${results[0].elapsed > cacheTestElapsed ? '✅ 命中' : '❌ 未命中'}！`);

        console.log('\n' + '='.repeat(80));
        console.log('✅ 测试完成！');
        console.log('='.repeat(80) + '\n');

        // 检查embedding缓存文件
        const cachePath = './embedding_cache.json';
        if (fs.existsSync(cachePath)) {
            const stats = fs.statSync(cachePath);
            console.log('💡 提示：');
            console.log(`   Embedding缓存文件大小：${(stats.size / 1024).toFixed(2)} KB`);
            console.log('   该文件会缓存所有查询过的embedding，大幅减少API调用！');
        }

    } catch (error) {
        console.error('\n❌ 测试失败：', error.message);
        process.exit(1);
    }
}

// 运行测试
main();
