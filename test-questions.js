/**
 * RAG系统准确性测试问题集
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 目的：全面验证RAG检索准确性
 */

const testQuestions = [
  // ========== 第一类：直接事实查询 ==========
  {
    category: "直接事实",
    question: "重修需要什么条件？",
    expectedPage: 58,
    expectedKeywords: ["重修", "前3周", "不超过3门", "课程名", "学分"]
  },
  {
    category: "直接事实",
    question: "转专业的流程是什么？",
    expectedPage: 65,
    expectedKeywords: ["第十四十五周", "教务管理系统", "学院考核", "公示期"]
  },
  {
    category: "直接事实",
    question: "如何申请奖学金？",
    expectedPage: 97,
    expectedKeywords: ["书面申请", "民主评议", "公示", "党政联席会议"]
  },
  {
    category: "直接事实",
    question: "考试作弊会有什么处分？",
    expectedPage: 85,
    expectedKeywords: ["警告", "严重警告", "记过", "留校察看", "开除学籍"]
  },

  // ========== 第二类：复杂流程 ==========
  {
    category: "复杂流程",
    question: "我想转专业，具体需要怎么做？",
    expectedPage: 65,
    expectedKeywords: ["第十四十五周", "教务管理系统", "学院考核", "公示期", "下学期开学"]
  },
  {
    category: "复杂流程",
    question: "我课程不及格，补考和重修有什么区别？",
    expectedPage: 58,
    expectedKeywords: ["补考不及格", "须重修", "课程重修管理办法"]
  },
  {
    category: "复杂流程",
    question: "学生违纪了，学校会怎么处理？",
    expectedPage: 85,
    expectedKeywords: ["警告", "严重警告", "记过", "留校察看", "开除学籍"]
  },

  // ========== 第三类：口语化表达 ==========
  {
    category: "口语化",
    question: "我挂科了咋办？",
    expectedPage: 58,
    expectedKeywords: ["不及格", "重修", "补考"]
  },
  {
    category: "口语化",
    question: "我想换专业，怎么弄？",
    expectedPage: 65,
    expectedKeywords: ["转专业", "第十四十五周", "申请"]
  },
  {
    category: "口语化",
    question: "考试作弊被抓了会有什么后果？",
    expectedPage: 85,
    expectedKeywords: ["处分", "记过", "开除"]
  },

  // ========== 第四类：边界情况 ==========
  {
    category: "边界情况",
    question: "可以免听考试吗？有什么条件？",
    expectedPage: 59,
    expectedKeywords: ["免听考试", "批准", "编班重修", "跟班重修", "个别辅导"]
  },
  {
    category: "边界情况",
    question: "什么情况下会被退学？",
    expectedPage: 24,
    expectedKeywords: ["本人原因申请", "未完成学业", "违纪"]
  },
  {
    category: "边界情况",
    question: "一学期可以重修几门课程？",
    expectedPage: 58,
    expectedKeywords: ["不超过3门", "非应届毕业生"]
  },

  // ========== 第五类：多步骤查询 ==========
  {
    category: "多步骤",
    question: "我因为成绩不好想休学，需要什么手续？",
    expectedPage: 23,
    expectedKeywords: ["休学", "申请", "复学"]
  },
  {
    category: "多步骤",
    question: "休学后想复学，怎么办？",
    expectedPage: 23,
    expectedKeywords: ["复学申请", "学校复查", "合格"]
  },

  // ========== 第六类：数字精确查询 ==========
  {
    category: "精确查询",
    question: "非应届毕业生每学期重修课程不能超过几门？",
    expectedPage: 58,
    expectedKeywords: ["3门"]
  },
  {
    category: "精确查询",
    question: "转专业公示期是几天？",
    expectedPage: 65,
    expectedKeywords: ["5个工作日"]
  },
  {
    category: "精确查询",
    question: "奖学金申请什么时候开始？",
    expectedPage: 97,
    expectedKeywords: ["第十四、十五周"]
  }
];

/**
 * 测试单个问题
 */
async function testSingleQuestion(testQuestion, index) {
  const axios = require('axios');

  try {
    // 登录
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'S2201001',
      password: '123456'
    });

    const token = loginResponse.data.data.token;

    // RAG查询 - 只传递问题字符串
    const ragResponse = await axios.post(
      'http://localhost:3000/api/rag/answer',
      { question: testQuestion.question },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (ragResponse.data.success) {
      const result = ragResponse.data.data;

      // 验证准确性
      const foundPage = result.sources.find(s => s.page === testQuestion.expectedPage);

      return {
        index: index + 1,
        category: testQuestion.category,
        question: testQuestion.question,
        expectedPage: testQuestion.expectedPage,
        foundPage: foundPage ? foundPage.page : null,
        topPages: result.sources.slice(0, 3).map(s => s.page),
        allPages: result.sources.map(s => s.page),
        confidence: result.confidence,
        hasKeyword: result.answer.includes(testQuestion.expectedKeywords[0])
      };
    }

    return null;
  } catch (error) {
    console.error(`✗ 问题${index + 1}测试失败:`, error.message);
    return null;
  }
}

/**
 * 批量测试
 */
async function runTests() {
  console.log('========================================');
  console.log('RAG系统准确性测试');
  console.log('设计师：内师智能体系统 (￣▽￣)ﾉ');
  console.log('========================================\n');

  const results = [];

  for (let i = 0; i < testQuestions.length; i++) {
    const result = await testSingleQuestion(testQuestions[i], i);
    if (result) {
      results.push(result);

      // 显示结果
      console.log(`[${result.index}/${testQuestions.length}] ${result.category}`);
      console.log(`问题：${result.question}`);
      console.log(`期望页码：${result.expectedPage}`);
      console.log(`实际页码：${result.topPages.join(', ')}`);
      console.log(`所有页码：${result.allPages.join(', ')}`);
      console.log(`准确性：${result.foundPage ? '✅ 准确' : '⚠️ 未在Top3'}`);

      if (result.foundPage) {
        console.log(`状态：✅ 完全准确`);
      } else if (result.allPages.includes(result.expectedPage)) {
        console.log(`状态：⚠️ 在前10名内，但不在Top3`);
      } else {
        console.log(`状态：❌ 未找到正确页码`);
      }

      console.log(`置信度：${result.confidence?.toFixed(2) || 'N/A'}`);
      console.log('');
    }
  }

  // 统计
  console.log('========================================');
  console.log('测试统计');
  console.log('========================================');

  const accurate = results.filter(r => r.foundPage).length;
  const inTop10 = results.filter(r => r.allPages.includes(r.expectedPage)).length;
  const total = results.length;

  console.log(`总测试数：${total}`);
  console.log(`完全准确（Top3）：${accurate} (${(accurate/total*100).toFixed(1)}%)`);
  console.log(`在前10名内：${inTop10} (${(inTop10/total*100).toFixed(1)}%)`);
  console.log(`平均置信度：${(results.reduce((sum, r) => sum + (r.confidence || 0), 0) / total).toFixed(2)}`);

  if (accurate === total) {
    console.log('\n✅ 所有测试通过！系统准确性优秀！');
  } else if (inTop10 >= total * 0.8) {
    console.log('\n✅ 系统准确性良好！');
  } else {
    console.log('\n⚠️ 系统需要优化！');
  }
}

// 导出
module.exports = { testQuestions, runTests };

// 如果直接运行
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试失败：', error);
    process.exit(1);
  });
}
