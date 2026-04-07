/**
 * 表单数据库诊断脚本
 * 作者：内师智能体系统 (￣▽￣)ﾉ
 * 用途：检查数据库中的表单模板数据
 */

const { query } = require('./src/config/database');

async function checkFormDatabase() {
  console.log('========================================');
  console.log('  表单数据库诊断工具');
  console.log('  作者：内师智能体系统 (￣▽￣)ﾉ');
  console.log('========================================\n');

  try {
    // 1. 检查 form_templates 表是否存在
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  检查 form_templates 表');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const tables = await query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'education_system'
      AND TABLE_NAME LIKE '%form%'
    `);

    console.log('✅ 找到的表单相关表：');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });
    console.log('');

    // 2. 检查 form_templates 表结构
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  检查 form_templates 表结构');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const columns = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'education_system'
      AND TABLE_NAME = 'form_templates'
      ORDER BY ORDINAL_POSITION
    `);

    if (columns.length === 0) {
      console.log('❌ form_templates 表不存在！');
    } else {
      console.log('✅ form_templates 表结构：');
      columns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }
    console.log('');

    // 3. 检查表单数据
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  检查表单数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const forms = await query(`
      SELECT
        template_id,
        template_name,
        category,
        description,
        file_type,
        download_count,
        target_audience,
        status,
        sort_order
      FROM form_templates
      ORDER BY sort_order ASC, template_id ASC
    `);

    if (forms.length === 0) {
      console.log('❌ form_templates 表中没有数据！');
    } else {
      console.log(`✅ 找到 ${forms.length} 个表单模板：\n`);
      forms.forEach(form => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`ID: ${form.template_id}`);
        console.log(`名称: ${form.template_name || '❌ NULL (这就是问题！)'}`);
        console.log(`分类: ${form.category || 'NULL'}`);
        console.log(`说明: ${form.description || 'NULL'}`);
        console.log(`状态: ${form.status === 1 ? '✅ 可用' : '❌ 不可用'}`);
        console.log(`排序: ${form.sort_order}`);
        console.log(`目标用户: ${form.target_audience || 'NULL'}`);
        console.log(`下载次数: ${form.download_count || 0}`);
      });
    }
    console.log('');

    // 4. 检查是否有 NULL 的 template_name
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  检查数据完整性');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const nullNames = await query(`
      SELECT template_id, description
      FROM form_templates
      WHERE template_name IS NULL OR template_name = ''
    `);

    if (nullNames.length > 0) {
      console.log(`❌ 发现 ${nullNames.length} 个 template_name 为空的记录：`);
      nullNames.forEach(form => {
        console.log(`   - ID: ${form.template_id}, description: ${form.description}`);
      });
      console.log('');
      console.log('💡 解决方案：');
      console.log('   1. 删除这些记录');
      console.log('   2. 或者运行 SQL 修复脚本');
    } else {
      console.log('✅ 所有记录的 template_name 都有值');
    }
    console.log('');

    // 5. 提供修复建议
    if (nullNames.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔧 修复 SQL 脚本');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('-- 方案1：删除无效记录');
      console.log(`DELETE FROM form_templates WHERE template_name IS NULL OR template_name = '';`);
      console.log('');
      console.log('-- 方案2：如果 description 中有表单名称，可以尝试修复');
      nullNames.forEach(form => {
        const name = form.description?.replace(/申请表的说明文档|证明表的说明文档/g, '');
        if (name) {
          console.log(`UPDATE form_templates SET template_name = '${name}' WHERE template_id = ${form.template_id};`);
        }
      });
      console.log('');
      console.log('-- 方案3：重新插入正确的数据（推荐）');
      console.log('-- 先清空表');
      console.log('TRUNCATE TABLE form_templates;');
      console.log('-- 再运行: mysql -u root -p education_system < database/create_form_templates.sql');
    }

  } catch (err) {
    console.error('❌ 诊断失败:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

// 运行诊断
checkFormDatabase();
