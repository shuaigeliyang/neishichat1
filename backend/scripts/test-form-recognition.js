/**
 * 测试表单识别功能
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */
const formNameRecognizer = require('../src/services/formNameRecognizer');

async function testFormRecognition() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  测试表单识别功能');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testCases = [
    '下载内江师范学院学生素质活动与德育实践补修申请表',
    '下载转专业申请表',
    '生成奖学金申请表',
    '我要竞赛申请表'
  ];

  for (const input of testCases) {
    console.log(`\n测试输入: "${input}"`);
    console.log('─'.repeat(50));

    const result = await formNameRecognizer.recognizeFormName(input);

    if (result.recognized) {
      console.log('✅ 识别成功!');
      console.log('   表单名称:', result.templateName);
      console.log('   项目:', result.project);
      console.log('   置信度:', result.confidence.toFixed(2));
    } else {
      console.log('❌ 识别失败!');
      console.log('   原因:', result.reason);
      console.log('   最佳匹配:', result.bestMatch || '无');
      console.log('   最高分:', result.bestScore?.toFixed(2) || '0.00');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(0);
}

testFormRecognition().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
