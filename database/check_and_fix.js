/**
 * 检测和修复重复成绩数据的Node.js脚本
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 使用方法：
 * node check_and_fix.js
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function checkAndFix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'education_system'
  });

  try {
    console.log('🔍 开始检测重复数据...\n');

    // 1. 检测重复数据
    const [duplicates] = await connection.execute(`
      SELECT
        g.grade_id,
        g.student_id,
        g.offering_id,
        c.course_code,
        c.course_name,
        g.total_score
      FROM grades g
      LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
      LEFT JOIN courses c ON co.course_id = c.course_id
      WHERE (g.student_id, g.offering_id) IN (
        SELECT student_id, offering_id
        FROM grades
        GROUP BY student_id, offering_id
        HAVING COUNT(*) > 1
      )
      ORDER BY g.offering_id, g.grade_id
    `);

    if (duplicates.length === 0) {
      console.log('✅ 太棒了！没有发现重复数据！\n');
      return;
    }

    console.log(`❌ 发现 ${duplicates.length} 条重复记录：\n`);
    console.log('grade_id  |  student_id  |  offering_id  |  course_code  |  course_name  |  score');
    console.log('-'.repeat(100));
    duplicates.forEach(d => {
      console.log(`${d.grade_id} | ${d.student_id} | ${d.offering_id} | ${d.course_code} | ${d.course_name} | ${d.total_score}`);
    });
    console.log('\n');

    // 2. 统计重复的student_id+offering_id组合
    const [duplicateGroups] = await connection.execute(`
      SELECT student_id, offering_id, COUNT(*) as count
      FROM grades
      GROUP BY student_id, offering_id
      HAVING COUNT(*) > 1
    `);

    console.log(`📊 共有 ${duplicateGroups.length} 组重复数据：\n`);

    // 3. 询问是否修复
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('是否要删除重复数据？(只保留每组的最早记录) [y/N]: ', async (answer) => {
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('❌ 已取消修复操作\n');
        await connection.end();
        return;
      }

      console.log('\n🔧 开始修复...\n');

      // 4. 备份到临时表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS grades_backup_before_fix AS
        SELECT * FROM grades
      `);
      console.log('✅ 已创建备份表 grades_backup_before_fix');

      // 5. 删除重复数据
      const [result] = await connection.execute(`
        DELETE g1 FROM grades g1
        INNER JOIN grades g2
        WHERE g1.grade_id > g2.grade_id
        AND g1.student_id = g2.student_id
        AND g1.offering_id = g2.offering_id
      `);

      console.log(`✅ 已删除 ${result.affectedRows} 条重复记录\n`);

      // 6. 验证修复结果
      const [remainingDuplicates] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM (
          SELECT student_id, offering_id
          FROM grades
          GROUP BY student_id, offering_id
          HAVING COUNT(*) > 1
        ) as temp
      `);

      if (remainingDuplicates[0].count === 0) {
        console.log('✅ 修复成功！现在没有重复数据了！\n');
      } else {
        console.log(`⚠️  仍有 ${remainingDuplicates[0].count} 组重复数据，可能需要手动检查\n`);
      }

      // 7. 添加唯一索引
      try {
        await connection.execute(`
          ALTER TABLE grades
          ADD UNIQUE KEY uk_student_offering (student_id, offering_id)
        `);
        console.log('✅ 已添加唯一索引，防止未来出现重复数据\n');
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log('ℹ️  唯一索引已存在，无需添加\n');
        } else {
          console.log('⚠️  添加唯一索引失败:', error.message, '\n');
        }
      }

      await connection.end();
    });

  } catch (error) {
    console.error('❌ 执行出错:', error.message);
    await connection.end();
    process.exit(1);
  }
}

checkAndFix();
