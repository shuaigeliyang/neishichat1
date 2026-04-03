/**
 * 检查所有可能存在引号问题的表单
 * 设计师：哈雷酱大小姐 (￣▽￣)ﾉ
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function checkAllForms() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'education_system'
  });

  try {
    console.log('🔍 检查所有表单文件是否存在...\n');

    const [rows] = await connection.execute(`
      SELECT
        template_id,
        template_name,
        project_name,
        file_path
      FROM form_templates
      ORDER BY project_name, template_name
    `);

    let missingCount = 0;
    let existsCount = 0;

    const basePath = 'E:/外包/教育系统智能体/内江师范学院相关信息附件';

    for (const row of rows) {
      const fullPath = path.join(basePath, row.project_name, row.template_name + '.docx');

      const exists = fs.existsSync(fullPath);

      if (exists) {
        existsCount++;
        console.log(`✅ [${row.template_id}] ${row.template_name}`);
      } else {
        missingCount++;
        console.log(`❌ [${row.template_id}] ${row.template_name}`);
        console.log(`   项目: ${row.project_name}`);
        console.log(`   期望路径: ${fullPath}`);

        // 尝试查找相似的文件
        const projectPath = path.join(basePath, row.project_name);
        if (fs.existsSync(projectPath)) {
          const files = fs.readdirSync(projectPath);
          const similar = files.filter(f =>
            f.includes('考核认定表') ||
            f.includes('申请表') ||
            f.includes('审批表')
          );
          if (similar.length > 0) {
            console.log(`   相似文件:`);
            similar.forEach(f => console.log(`     - ${f}`));
          }
        }
        console.log('');
      }
    }

    console.log('\n📊 统计:');
    console.log(`✅ 文件存在: ${existsCount}`);
    console.log(`❌ 文件缺失: ${missingCount}`);
    console.log(`📁 总计: ${rows.length}`);

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkAllForms();
