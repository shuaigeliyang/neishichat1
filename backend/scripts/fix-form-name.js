/**
 * 修复表单名称中的引号问题
 * 设计师：哈雷酱大小姐 (￣▽￣)ﾉ
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixFormName() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'education_system'
  });

  try {
    console.log('🔧 开始修复表单名称...\n');

    // 查找需要修复的记录
    const [rows] = await connection.execute(`
      SELECT template_id, template_name
      FROM form_templates
      WHERE template_name LIKE '%第二课堂成绩单%'
        AND template_name LIKE '%考核认定表%'
    `);

    if (rows.length === 0) {
      console.log('❌ 未找到需要修复的表单');
      return;
    }

    const form = rows[0];
    console.log('修复前:', form.template_name);

    // 修复：添加缺失的中文全角引号
    const correctName = '内江师范学院素质活动与德育实践（"第二课堂成绩单"）考核认定表';

    const [result] = await connection.execute(`
      UPDATE form_templates
      SET template_name = ?
      WHERE template_id = ?
    `, [correctName, form.template_id]);

    console.log('修复后:', correctName);
    console.log('\n✅ 修复成功！影响行数:', result.affectedRows);

    // 验证修复结果
    const [verifyRows] = await connection.execute(`
      SELECT template_name
      FROM form_templates
      WHERE template_id = ?
    `, [form.template_id]);

    console.log('\n🔍 验证结果:');
    console.log('数据库中的名称:', verifyRows[0].template_name);
    console.log('是否包含引号:', verifyRows[0].template_name.includes('"') ? '✅ 是' : '❌ 否');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    await connection.end();
  }
}

fixFormName();
