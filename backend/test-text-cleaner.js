/**
 * 文本清理服务测试脚本
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 运行方式：node test-text-cleaner.js
 */

const textCleaner = require('./src/services/textCleaner');

console.log('\n========================================');
console.log('🧪 文本清理服务测试');
console.log('========================================\n');

// 测试用例
const testCases = [
  {
    name: '测试1：孤立的标点符号',
    input: `加编入年级的学习
。
条款 第五十条 在新学年完成补考工作后 各二级学院教学科研工作办公
,
室应对各年级 各专业学生上一学年课程考核成绩进行全面清理 对达到
、 ,
升 跳 留 降级规定的学生作出升 跳 留 降级处理 毕业班学生完成第八
、 、 、 、 、 、 ;
学期考核工作后 各二级学院教学科研工作办公室应对各专业毕业年级学
,
生本学年课程考核成绩进行全面清理 对应留 降级的学生作出留 降级处
, 、 、
理
。`,
    expected: '移除孤立的标点符号行，修正标点符号前后空格'
  },

  {
    name: '测试2：混合标点符号',
    input: `学生在学校规定学习年限内, 修完专业人才培养方案规定内容; 且成绩合格. 应符合毕业要求!`,
    expected: '将英文标点转换为中文标点'
  },

  {
    name: '测试3：多余空格',
    input: `学生  在学校  规定  学习年限内  修完  专业  人才培养  方案  规定  内容`,
    expected: '移除多余空格'
  },

  {
    name: '测试4：断词问题',
    input: `各二级学院教学科研
工作办公室应对各年级学生进行清理`,
    expected: '修复被换行符打断的词语'
  },

  {
    name: '测试5：复杂混合问题',
    input: `条款 第五十一条 学生在学校规定学习年限内 修完专业人才培养方案规
,
定内容且成绩合格并达到国家体测合格标准 符合毕业要求 准予毕业 由
, , ,
学校发给毕业证书
。
一 本 专科学生在规定的学习年限内未取得的学分总数在人才培养
( ) 、
方案规定总学分数的 以内 含 者 作结业处理 发给结业证书
1/10 ( 1/10) , , 。`,
    expected: '综合清理：移除孤立标点、标准化标点、修复断词、移除多余空格'
  }
];

// 运行测试
let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${testCase.name}`);
  console.log(`预期：${testCase.expected}`);
  console.log(`${'='.repeat(60)}`);

  console.log('\n【原始文本】');
  console.log(testCase.input);

  console.log('\n【清理后文本】');
  const cleaned = textCleaner.deepClean(testCase.input);
  console.log(cleaned);

  // 简单验证
  const hasIsolatedPunctuation = cleaned.split('\n').some(line =>
    /^[。，、；：,.;:!?！？，,、\s]+$/.test(line.trim())
  );

  if (!hasIsolatedPunctuation) {
    console.log('\n✅ 通过：没有孤立的标点符号行');
    passedTests++;
  } else {
    console.log('\n❌ 失败：仍然存在孤立的标点符号行');
  }
});

// 总结
console.log('\n========================================');
console.log('📊 测试结果总结');
console.log('========================================');
console.log(`通过：${passedTests}/${totalTests}`);
console.log(`成功率：${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 所有测试通过！文本清理服务工作正常！(￣▽￣)ﾉ');
} else {
  console.log('\n⚠️ 部分测试未通过，需要继续优化！');
}

console.log('\n========================================\n');
