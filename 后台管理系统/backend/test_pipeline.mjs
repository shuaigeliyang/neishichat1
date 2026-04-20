import IncrementalPipeline from './src/services/incrementalPipeline.js';

async function main() {
    console.log('开始测试...');
    const pipeline = new IncrementalPipeline();
    await pipeline.initialize();
    console.log('初始化完成');
    const result = await pipeline.processDocument('doc_1775891409706_8034112e');
    console.log('处理完成:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
