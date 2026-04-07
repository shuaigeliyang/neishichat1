/**
 * 添加更多表单类型
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

require('dotenv').config();
const { query } = require('../src/config/database');

async function addMoreForms() {
  try {
    console.log('🚀 开始添加更多表单类型...\n');

    // 新增表单模板
    const newForms = [
      {
        name: '复学申请表',
        category: '申请表',
        desc: '用于学生申请复学',
        sort: 5
      },
      {
        name: '请假申请表',
        category: '申请表',
        desc: '用于学生申请请假（病假、事假等）',
        sort: 9
      },
      {
        name: '缓考申请表',
        category: '申请表',
        desc: '用于学生申请缓期考试',
        sort: 10
      },
      {
        name: '重修申请表',
        category: '申请表',
        desc: '用于学生申请课程重修',
        sort: 11
      },
      {
        name: '辅修申请表',
        category: '申请表',
        desc: '用于学生申请辅修专业',
        sort: 12
      },
      {
        name: '交换生申请表',
        category: '申请表',
        desc: '用于学生申请交换项目',
        sort: 13
      },
      {
        name: '在读证明申请表',
        category: '证明表',
        desc: '用于申请开具在读证明',
        sort: 14
      },
      {
        name: '成绩证明申请表',
        category: '证明表',
        desc: '用于申请开具成绩证明',
        sort: 15
      },
      {
        name: '毕业证明申请表',
        category: '证明表',
        desc: '用于申请开具毕业证明',
        sort: 16
      },
      {
        name: '学位证明申请表',
        category: '证明表',
        desc: '用于申请开具学位证明',
        sort: 17
      },
      {
        name: '预毕业证明申请表',
        category: '证明表',
        desc: '用于申请开具预毕业证明',
        sort: 18
      },
      {
        name: '离校手续单',
        category: '其他',
        desc: '用于办理离校手续',
        sort: 19
      },
      {
        name: '宿舍申请表',
        category: '申请表',
        desc: '用于申请宿舍或调换宿舍',
        sort: 20
      },
      {
        name: '贫困生认定申请表',
        category: '申请表',
        desc: '用于申请贫困生认定',
        sort: 21
      },
      {
        name: '助学金申请表',
        category: '申请表',
        desc: '用于申请国家助学金',
        sort: 22
      },
      {
        name: '助学贷款申请表',
        category: '申请表',
        desc: '用于申请国家助学贷款',
        sort: 23
      },
      {
        name: '优秀学生申请表',
        category: '申请表',
        desc: '用于申请优秀学生称号',
        sort: 24
      },
      {
        name: '优秀毕业生申请表',
        category: '申请表',
        desc: '用于申请优秀毕业生称号',
        sort: 25
      }
    ];

    console.log(`📝 准备添加 ${newForms.length} 个新表单...\n`);

    let addedCount = 0;
    for (const form of newForms) {
      // 检查是否已存在
      const existing = await query(`
        SELECT template_id FROM form_templates WHERE template_name = ?
      `, [form.name]);

      if (existing.length === 0) {
        await query(`
          INSERT INTO form_templates (template_name, category, description, file_path, target_audience, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          form.name,
          form.category,
          form.desc,
          `/forms/${form.name}.docx`,
          '全体学生',
          form.sort
        ]);
        console.log(`✅ 添加表单：${form.name} (${form.category})`);
        addedCount++;
      } else {
        console.log(`ℹ️  表单已存在：${form.name}`);
      }
    }

    console.log(`\n🎉 新增表单完成！共添加 ${addedCount} 个表单\n`);

    // 显示所有表单
    console.log('📋 当前所有表单：\n');

    const allForms = await query(`
      SELECT template_id, template_name, category, sort_order
      FROM form_templates
      ORDER BY sort_order ASC
    `);

    // 按分类显示
    const categories = {};
    for (const form of allForms) {
      if (!categories[form.category]) {
        categories[form.category] = [];
      }
      categories[form.category].push(form);
    }

    for (const [category, forms] of Object.entries(categories)) {
      console.log(`\n【${category}】`);
      forms.forEach(form => {
        console.log(`  ${form.sort_order}. ${form.template_name}`);
      });
    }

    console.log(`\n📊 统计信息：`);
    console.log(`  总表单数: ${allForms.length}`);

    const categoryCount = await query(`
      SELECT category, COUNT(*) as count
      FROM form_templates
      GROUP BY category
    `);
    categoryCount.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.count} 个`);
    });

    console.log('\n========================================\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ 添加表单失败:', error.message);
    process.exit(1);
  }
}

// 执行添加
addMoreForms();
