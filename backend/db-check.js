/**
 * 数据库诊断脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

const { query } = require('./src/config/database');

async function checkDatabase() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  数据库诊断');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 检查表单总数
    console.log('📊 检查表单模板数据');
    const count = await query('SELECT COUNT(*) as total FROM form_templates');
    console.log(`   总数: ${count[0].total}\n`);

    // 2. 查询转专业相关表单
    console.log('🔍 查询转专业相关表单');
    const forms = await query(`
      SELECT template_id, template_name, project_name, category, file_path
      FROM form_templates
      WHERE template_name LIKE '%转专业%'
      OR project_name LIKE '%转专业%'
    `);

    if (forms.length === 0) {
      console.log('   ❌ 没有找到转专业相关表单！\n');
    } else {
      console.log(`   ✅ 找到 ${forms.length} 个转专业表单:`);
      forms.forEach(f => {
        console.log(`      - ${f.template_name}`);
        console.log(`        项目: ${f.project_name}`);
        console.log(`        路径: ${f.file_path}`);
      });
      console.log('');
    }

    // 3. 检查文件是否存在
    console.log('📁 检查模板文件是否存在');
    const fs = require('fs');
    const path = require('path');

    for (const form of forms) {
      const fullPath = path.resolve(__dirname, '..', form.file_path.replace('../', ''));
      const exists = fs.existsSync(fullPath);
      console.log(`   ${exists ? '✅' : '❌'} ${form.template_name}`);
      console.log(`      路径: ${fullPath}`);
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

checkDatabase();
