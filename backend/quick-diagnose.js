/**
 * 快速诊断表单识别问题
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

const { query } = require('./src/config/database');

async function quickDiagnose() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  表单识别问题诊断');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 测试数据库连接
    console.log('📊 测试1：数据库连接');
    const result = await query('SELECT 1 as test');
    console.log('✅ 数据库连接正常\n');

    // 2. 查询表单模板数量
    console.log('📊 测试2：查询表单模板');
    const templates = await query(`
      SELECT template_id, template_name, project_name, category
      FROM form_templates
      WHERE status = 1
      LIMIT 5
    `);

    console.log(`✅ 找到 ${templates.length} 个表单模板`);
    templates.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.template_name}`);
    });
    console.log('');

    // 3. 测试表单名称识别
    console.log('📊 测试3：表单名称识别');
    const testMessage = '下载内江师范学院学生素质活动与德育实践补修申请表';
    console.log(`   输入: "${testMessage}"`);

    // 清理消息
    const actions = ['下载', '生成', '我要', '需要', '想要', '获取', '申请', '表单'];
    let cleaned = testMessage;
    actions.forEach(action => {
      cleaned = cleaned.replace(new RegExp(action, 'g'), '');
    });
    cleaned = cleaned.replace(/[！!？?。.,，]/g, '').trim();

    console.log(`   清理后: "${cleaned}"`);

    // 查找匹配
    const allTemplates = await query(`
      SELECT template_id, template_name
      FROM form_templates
      WHERE status = 1
    `);

    let bestMatch = null;
    let bestScore = 0;

    for (const template of allTemplates) {
      const templateName = template.template_name;
      let score = 0;

      // 完全匹配
      if (cleaned === templateName) {
        score = 1.0;
      }
      // 包含匹配
      else if (templateName.includes(cleaned) || cleaned.includes(templateName)) {
        score = 0.9;
      }
      // 部分匹配（至少5个字符）
      else if (cleaned.length >= 5 && templateName.includes(cleaned)) {
        score = 0.5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = template;
      }

      if (score >= 0.5) {
        console.log(`   匹配: "${templateName}" - 分数: ${score}`);
      }
    }

    const THRESHOLD = 0.3;
    if (bestMatch && bestScore >= THRESHOLD) {
      console.log(`\n✅ 识别成功！`);
      console.log(`   表单: ${bestMatch.template_name}`);
      console.log(`   分数: ${bestScore}`);
    } else {
      console.log(`\n❌ 识别失败！`);
      console.log(`   最高分: ${bestScore}`);
      console.log(`   最接近: ${bestMatch ? bestMatch.template_name : '无'}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 诊断完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 诊断失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

quickDiagnose();
