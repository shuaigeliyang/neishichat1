/**
 * 数据库迁移验证脚本
 * 设计师：哈雷酱大小姐 (￣▽￣)ﾉ
 */

const { query } = require('../src/config/database');

async function verifyMigration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  数据库迁移验证');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 检查总数
    console.log('📊 检查表单总数：');
    const countResult = await query('SELECT COUNT(*) as total FROM form_templates');
    console.log(`   总数: ${countResult[0].total}`);
    console.log('');

    // 2. 检查新字段
    console.log('🔍 检查新字段是否存在：');
    const columns = await query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'education_system'
      AND TABLE_NAME = 'form_templates'
      AND COLUMN_NAME IN ('project_name', 'table_count', 'form_type', 'auto_fill_enabled', 'auto_fill_fields')
    `);

    const newFields = ['project_name', 'table_count', 'form_type', 'auto_fill_enabled', 'auto_fill_fields'];
    newFields.forEach(field => {
      const exists = columns.some(c => c.COLUMN_NAME === field);
      console.log(`   ${field}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
    });
    console.log('');

    // 3. 按项目统计
    console.log('📁 按项目统计：');
    const byProject = await query(`
      SELECT project_name as '项目', COUNT(*) as '文档数'
      FROM form_templates
      GROUP BY project_name
      ORDER BY COUNT(*) DESC
    `);

    byProject.forEach(item => {
      console.log(`   ${item['项目']}: ${item['文档数']} 个文档`);
    });
    console.log('');

    // 4. 查看前5条数据
    console.log('📋 前5条数据示例：');
    const samples = await query(`
      SELECT template_id, template_name, project_name, category, form_type
      FROM form_templates
      ORDER BY sort_order ASC
      LIMIT 5
    `);

    samples.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.template_name}`);
      console.log(`      项目: ${item.project_name}`);
      console.log(`      分类: ${item.category}`);
      console.log(`      类型: ${item.form_type}`);
    });
    console.log('');

    // 5. 验证结果
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (countResult[0].total === 32) {
      console.log('✅ 迁移成功！已导入32个真实文档数据');
    } else {
      console.log(`⚠️  数据数量不正确，预期32个，实际${countResult[0].total}个`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    process.exit(1);
  }
}

verifyMigration();
