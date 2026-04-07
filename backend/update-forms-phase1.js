/**
 * 第一阶段表单数据库更新脚本
 * 作者：内师智能体系统 (￣▽￣)ﾉ
 * 用途：更新数据库，添加第一阶段13个已实现表单
 */

const { query } = require('./src/config/database');

async function updateForms() {
  console.log('========================================');
  console.log('  第一阶段表单数据库更新工具');
  console.log('  作者：内师智能体系统 (￣▽￣)ﾉ');
  console.log('========================================\n');

  try {
    // 1. 清空现有表单数据
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  清空现有表单数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await query('TRUNCATE TABLE form_templates');
    console.log('✅ 已清空表单模板表\n');

    // 2. 插入第一阶段13个表单
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  插入第一阶段13个表单');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const forms = [
      // 申请表（10个）
      ['学科竞赛参赛申请表', '申请表', '用于各类学科竞赛的参赛申请', '/forms/学科竞赛参赛申请表.docx', '全体学生', 1],
      ['转专业申请表', '申请表', '用于学生转专业的正式申请', '/forms/转专业申请表.docx', '全体学生', 2],
      ['奖学金申请表', '申请表', '用于各类奖学金的申请', '/forms/奖学金申请表.docx', '全体学生', 3],
      ['休学申请表', '申请表', '用于学生申请休学', '/forms/休学申请表.docx', '全体学生', 4],
      ['复学申请表', '申请表', '用于学生申请复学', '/forms/复学申请表.docx', '全体学生', 5],
      ['请假申请表', '申请表', '用于学生申请请假（病假、事假等）', '/forms/请假申请表.docx', '全体学生', 6],
      ['贫困生认定申请表', '申请表', '用于申请贫困生认定', '/forms/贫困生认定申请表.docx', '全体学生', 7],
      ['助学金申请表', '申请表', '用于申请国家助学金', '/forms/助学金申请表.docx', '全体学生', 8],
      ['助学贷款申请表', '申请表', '用于申请国家助学贷款', '/forms/助学贷款申请表.docx', '全体学生', 9],
      // 证明表（4个）
      ['成绩证明申请表', '证明表', '用于申请开具成绩证明', '/forms/成绩证明申请表.docx', '全体学生', 10],
      ['在读证明申请表', '证明表', '用于申请开具在读证明', '/forms/在读证明申请表.docx', '全体学生', 11],
      ['毕业证明申请表', '证明表', '用于申请开具毕业证明', '/forms/毕业证明申请表.docx', '全体学生', 12],
      ['学位证明申请表', '证明表', '用于申请开具学位证明', '/forms/学位证明申请表.docx', '全体学生', 13]
    ];

    for (const form of forms) {
      await query(
        `INSERT INTO form_templates (template_name, category, description, file_path, target_audience, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        form
      );
      console.log(`✅ 已插入: ${form[0]}`);
    }

    console.log(`\n✅ 成功插入 ${forms.length} 个表单！\n`);

    // 3. 验证插入结果
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  验证插入结果');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const result = await query(`
      SELECT
        sort_order AS '序号',
        template_name AS '表单名称',
        category AS '分类',
        description AS '说明'
      FROM form_templates
      ORDER BY sort_order
    `);

    console.log('📋 当前数据库中的表单列表：\n');
    result.forEach(form => {
      console.log(`${form['序号']}. ${form['表单名称']} (${form['分类']})`);
      console.log(`   ${form['说明']}\n`);
    });

    // 4. 统计信息
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  统计信息');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const stats = await query(`
      SELECT
        category AS '分类',
        COUNT(*) AS '数量'
      FROM form_templates
      GROUP BY category
    `);

    stats.forEach(stat => {
      console.log(`${stat['分类']}: ${stat['数量']}个`);
    });

    console.log(`\n总计: ${result.length}个表单\n`);

    console.log('========================================');
    console.log('✨ 数据库更新完成！');
    console.log('========================================\n');
    console.log('📝 下一步操作：');
    console.log('   1. 测试表单下载功能');
    console.log('   2. 检查生成的文档是否正常');
    console.log('   3. 如有问题，查看后端日志\n');

  } catch (err) {
    console.error('❌ 更新失败:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 运行更新
updateForms();
