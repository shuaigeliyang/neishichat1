/**
 * 测试问题标准化功能
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

// 同义词映射表（从rag.js复制）
const SYNONYM_MAP = {
    // 成绩相关
    '挂科': '不及格',
    '挂了': '不及格',
    '没过': '不及格',
    '考砸了': '成绩不合格',
    '考得很差': '成绩不合格',

    // 补考相关
    '重考': '补考',
    '补试': '补考',
    '重新考试': '补考',

    // 重修相关
    '重读': '重修',
    '重新学习': '重修',
    '再学一遍': '重修',

    // 处理相关
    '怎么办': '如何处理',
    '怎么样': '后果',
    '怎么处理': '处理办法',
    '会有什么后果': '后果',

    // 其他常见口语
    '能不能': '是否可以',
    '可不可以': '是否可以',
    '怎么样才行': '条件是什么'
};

function normalizeQuestion(question) {
    let normalized = question;

    // 替换所有同义词
    for (const [colloquial, formal] of Object.entries(SYNONYM_MAP)) {
        const regex = new RegExp(colloquial, 'g');
        normalized = normalized.replace(regex, formal);
    }

    return normalized;
}

// 测试用例
const testCases = [
    {
        question: '学生挂科了会怎么样',
        expected: '学生不及格会后果'
    },
    {
        question: '我挂了怎么办',
        expected: '我不及格如何处理'
    },
    {
        question: '成绩不合格怎么处理',
        expected: '成绩不合格如何处理'  // 不需要标准化
    },
    {
        question: '能不能补考',
        expected: '是否可以补考'
    },
    {
        question: '挂科了能不能重修',
        expected: '不及格是否可以重修'
    },
    {
        question: '考砸了怎么办',
        expected: '成绩不合格如何处理'
    }
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        问题标准化功能测试 - 内师智能体系统出品 (￣▽￣)ﾉ        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
    const result = normalizeQuestion(testCase.question);
    const pass = result === testCase.expected;

    console.log(`测试 ${index + 1}:`);
    console.log(`  原始问题：${testCase.question}`);
    console.log(`  标准化后：${result}`);
    console.log(`  预期结果：${testCase.expected}`);
    console.log(`  状态：${pass ? '✅ 通过' : '❌ 失败'}`);
    console.log('');

    if (pass) {
        passCount++;
    } else {
        failCount++;
    }
});

console.log(''.repeat(60));
console.log(`测试结果：`);
console.log(`  ✅ 通过：${passCount}/${testCases.length}`);
console.log(`  ❌ 失败：${failCount}/${testCases.length}`);
console.log(`  通过率：${(passCount / testCases.length * 100).toFixed(1)}%`);
console.log(''.repeat(60));

// 额外测试：实际使用场景
console.log(`\n📝 实际使用场景示例：\n`);

const realQuestions = [
    '学生挂科了会怎么样',
    '我想知道如果挂科了怎么办',
    '成绩不合格会有什么后果',
    '补考没过还能重修吗',
    '能不能申请重修'
];

realQuestions.forEach(question => {
    const normalized = normalizeQuestion(question);
    console.log(`原始：${question}`);
    console.log(`标准化：${normalized}`);
    console.log(`是否变化：${normalized !== question ? '是 ✅' : '否'}`);
    console.log('');
});

console.log('✅ 测试完成！');
