/**
 * 验证表单名称修复
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verifyFix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'education_system'
  });

  try {
    console.log('🔍 验证表单名称修复...\n');

    const [rows] = await connection.execute(`
      SELECT
        template_id,
        template_name,
        project_name,
        CASE
          WHEN template_name LIKE '%("第二课堂成绩单")%' THEN '✅ 已修复'
          ELSE '❌ 需要检查'
        END AS status
      FROM form_templates
      WHERE template_name LIKE '%第二课堂成绩单%'
        AND template_name LIKE '%考核认定表%'
    `);

    if (rows.length === 0) {
      console.log('❌ 未找到相关表单记录');
    } else {
      rows.forEach(row => {
        console.log(`模板ID: ${row.template_id}`);
        console.log(`表单名称: ${row.template_name}`);
        console.log(`项目名称: ${row.project_name}`);
        console.log(`状态: ${row.status}`);
        console.log('');
      });
    }

    console.log('✅ 验证完成！');
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  } finally {
    await connection.end();
  }
}

verifyFix();
