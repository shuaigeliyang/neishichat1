/**
 * 修复表单名称中的括号类型
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixBrackets() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'education_system'
  });

  try {
    console.log('🔧 开始修复表单名称中的括号...\n');

    const fixes = [
      {
        templateId: 18,
        wrongName: '内江师范学院本科毕业论文评价标准（艺术类）',
        correctName: '内江师范学院本科毕业论文评价标准(艺术类)'
      },
      {
        templateId: 19,
        wrongName: '内江师范学院本科毕业论文评价标准（文、史、法、经、管、教育类）',
        correctName: '内江师范学院本科毕业论文评价标准(文、史、法、经、管、教育类)'
      },
      {
        templateId: 20,
        wrongName: '内江师范学院本科毕业论文评价标准（理工类）',
        correctName: '内江师范学院本科毕业论文评价标准(理工类)'
      }
    ];

    for (const fix of fixes) {
      console.log(`\n修复模板 ${fix.templateId}:`);
      console.log(`修复前: ${fix.wrongName}`);

      const [result] = await connection.execute(`
        UPDATE form_templates
        SET template_name = ?
        WHERE template_id = ?
      `, [fix.correctName, fix.templateId]);

      if (result.affectedRows > 0) {
        console.log(`修复后: ${fix.correctName}`);
        console.log(`✅ 修复成功！`);
      } else {
        console.log(`❌ 修复失败：模板不存在`);
      }
    }

    console.log('\n✅ 所有修复完成！');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    await connection.end();
  }
}

fixBrackets();
