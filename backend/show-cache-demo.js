/**
 * Embedding缓存演示脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：展示缓存文件的工作原理
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = './embedding_cache.json';

console.log('\n' + '🔥'.repeat(40));
console.log('🔥 Embedding缓存文件解析');
console.log('🔥 设计师：内师智能体系统 (￣▽￣)ﾉ');
console.log('🔥'.repeat(40) + '\n');

// 读取缓存文件
if (!fs.existsSync(CACHE_FILE)) {
    console.log('❌ 缓存文件不存在！');
    console.log('   请先运行测试：node test-rag-endpoint.js\n');
    process.exit(1);
}

const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));

console.log('📊 缓存文件统计：');
console.log('='.repeat(80));
console.log(`   文件大小：${(fs.statSync(CACHE_FILE).size / 1024).toFixed(2)} KB`);
console.log(`   缓存条目数：${cacheData.length} 个`);
console.log(`   向量维度：${cacheData[0][1].length} 维`);
console.log(`   内存占用：${(JSON.stringify(cacheData).length / 1024 / 1024).toFixed(2)} MB`);

// 展示前3个缓存条目
console.log('\n📝 缓存条目示例（前3个）：');
console.log('='.repeat(80));

const exampleQuestions = {
    '-595383725': '重修需要什么条件？',
    '-123456789': '奖学金怎么申请？',
    '-987654321': '挂科会怎么样？'
};

cacheData.slice(0, 3).forEach(([hash, vector], index) => {
    console.log(`\n条目 ${index + 1}：`);
    console.log(`   哈希值：${hash}`);

    // 尝试显示对应的问题
    const question = exampleQuestions[hash] || '（未知问题）';
    console.log(`   可能的问题：${question}`);

    console.log(`   向量维度：${vector.length}`);
    console.log(`   向量前5个值：[${vector.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`);
    console.log(`   向量后5个值：[${vector.slice(-5).map(v => v.toFixed(6)).join(', ')}]`);

    // 计算向量的统计信息
    const sum = vector.reduce((a, b) => a + b, 0);
    const avg = sum / vector.length;
    const max = Math.max(...vector);
    const min = Math.min(...vector);

    console.log(`   向量统计：`);
    console.log(`     - 平均值：${avg.toFixed(6)}`);
    console.log(`     - 最大值：${max.toFixed(6)}`);
    console.log(`     - 最小值：${min.toFixed(6)}`);
    console.log(`     - 范围：${(max - min).toFixed(6)}`);
});

// 展示相似度计算
console.log('\n📝 相似度计算演示：');
console.log('='.repeat(80));

function cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

if (cacheData.length >= 2) {
    const vec1 = cacheData[0][1];
    const vec2 = cacheData[1][1];

    const similarity = cosineSimilarity(vec1, vec2);

    console.log(`   条目1 vs 条目2 的相似度：${similarity.toFixed(6)}`);
    console.log(`   说明：`);
    if (similarity > 0.8) {
        console.log(`     - 相似度很高（> 0.8），说明这两个问题含义很接近！✅`);
    } else if (similarity > 0.5) {
        console.log(`     - 相似度中等（0.5-0.8），说明这两个问题有一定关联。`);
    } else {
        console.log(`     - 相似度较低（< 0.5），说明这两个问题含义差异较大。❌`);
    }
}

// 展示缓存的价值
console.log('\n💰 缓存的价值：');
console.log('='.repeat(80));
console.log(`   假设每次API调用成本：0.0004 元（20元/5000万tokens）`);
console.log(`   假设每次API调用耗时：500 ms`);

const apiCostPerCall = 0.0004;
const apiTimePerCall = 500; // ms

const savedCost = cacheData.length * apiCostPerCall;
const savedTime = cacheData.length * apiTimePerCall;

console.log(`\n   当前缓存 ${cacheData.length} 个问题，已为你节省：`);
console.log(`   - 成本：${savedCost.toFixed(4)} 元`);
console.log(`   - 时间：${(savedTime / 1000).toFixed(1)} 秒`);
console.log(`   - API调用：${cacheData.length} 次`);

console.log(`\n   如果这 ${cacheData.length} 个问题每个被查询 10 次：`);
console.log(`   - 节省成本：${(savedCost * 10).toFixed(4)} 元`);
console.log(`   - 节省时间：${(savedTime * 10 / 1000).toFixed(1)} 秒`);
console.log(`   - 避免API调用：${cacheData.length * 10} 次`);

console.log(`\n   随着缓存条目增加，节省的成本和时间会更多！✨`);

// 维护建议
console.log('\n🔧 维护建议：');
console.log('='.repeat(80));
console.log('   1. 定期备份缓存文件（避免丢失）');
console.log('   2. 如果文件过大（> 10MB），可以考虑清理旧条目');
console.log('   3. 部署到生产环境前，运行 preload-questions.js 预热常见问题');
console.log('   4. 监控缓存命中率（越高越好）');

console.log('\n' + '='.repeat(80));
console.log('✅ 解析完成！');
console.log('='.repeat(80) + '\n');
