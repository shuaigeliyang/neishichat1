/**
 * RAG服务测试脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

const RAGService = require('./services/ragService');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

async function testRAG() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        RAG服务测试 - 内师智能体系统出品 (￣▽￣)ﾉ             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 创建RAG服务实例
    console.log('📦 创建RAG服务实例...');
    const ragService = new RAGService(process.env.ZHIPU_API_KEY);
    console.log('✅ RAG服务实例创建成功\n');

    // 初始化RAG服务
    console.log('🚀 初始化RAG服务...');
    await ragService.initialize();
    console.log('✅ RAG服务初始化成功\n');

    // 测试问答
    const testQuestion = '挂科了会怎么样';
    console.log(`❓ 测试问题：${testQuestion}\n`);

    console.log('🔍 开始检索...');
    const result = await ragService.answer(testQuestion, {
      minScore: 0.3,
      topK: 3
    });

    console.log('\n✅ 检索成功！\n');
    console.log('═'.repeat(80));
    console.log('📊 检索结果：');
    console.log('═'.repeat(80));
    console.log(`回答：${result.answer}\n`);
    console.log(`置信度：${(result.confidence * 100).toFixed(1)}%`);
    console.log(`返回文档数：${result.sources.length}`);
    console.log(`耗时：${result.elapsed}ms\n`);

    if (result.sources && result.sources.length > 0) {
      console.log('📚 参考文档：');
      result.sources.forEach((source, index) => {
        console.log(`\n${index + 1}. ${source.chapter}（第${source.page}页）`);
        console.log(`   相似度：${source.score?.toFixed(3) || 'N/A'}`);
        console.log(`   Rerank方法：${source.rerankMethod || 'unknown'}`);
      });
    } else {
      console.log('⚠️  未找到相关文档');
    }

    console.log('\n═'.repeat(80));
    console.log('🎉 测试完成！\n');

  } catch (error) {
    console.error('\n❌ 测试失败：');
    console.error('错误信息：', error.message);
    console.error('错误堆栈：', error.stack);
    process.exit(1);
  }
}

// 运行测试
testRAG();
