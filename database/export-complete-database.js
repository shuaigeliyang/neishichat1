/**
 * 完整数据库导出工具（包含数据和结构）
 * 作者：内师智能体系统 (￣▽￣)ﾉ
 */

// 指定正确的.env文件路径
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const { query } = require('../backend/src/config/database');
const fs = require('fs');
const path = require('path');

async function exportCompleteDatabase() {
  console.log('========================================');
  console.log('  完整数据库导出工具');
  console.log('  作者：内师智能体系统 (￣▽￣)ﾉ');
  console.log('========================================\n');

  try {
    // 1. 获取所有表名
    console.log('1️⃣  获取数据库表列表\n');

    const tables = await query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'education_system' AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
    );

    console.log('✅ 找到 ' + tables.length + ' 个表\n');

    // 2. 生成SQL文件内容
    const sqlContent = [];

    // 文件头部
    sqlContent.push('-- ============================================');
    sqlContent.push('-- 教育系统智能体 - 完整数据库导出');
    sqlContent.push('-- 作者：内师智能体系统 (￣▽￣)ﾉ');
    sqlContent.push('-- 导出时间：' + new Date().toLocaleString('zh-CN'));
    sqlContent.push('-- 数据库：education_system');
    sqlContent.push('-- 表数量：' + tables.length);
    sqlContent.push('-- 说明：包含所有表结构和数据');
    sqlContent.push('-- ============================================');
    sqlContent.push('');
    sqlContent.push('-- 使用说明：');
    sqlContent.push('-- 1. 创建数据库：');
    sqlContent.push('--    CREATE DATABASE IF NOT EXISTS education_system;');
    sqlContent.push('--    USE education_system;');
    sqlContent.push('-- 2. 导入数据：');
    sqlContent.push('--    mysql -u root -p < education_system_complete.sql');
    sqlContent.push('-- ============================================');
    sqlContent.push('');
    sqlContent.push('SET NAMES utf8mb4;');
    sqlContent.push('SET FOREIGN_KEY_CHECKS=0;');
    sqlContent.push('');
    sqlContent.push('CREATE DATABASE IF NOT EXISTS education_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    sqlContent.push('USE education_system;');
    sqlContent.push('');

    // 3. 为每个表生成 CREATE TABLE 和数据
    console.log('2️⃣  导出表结构和数据\n');

    let totalInserts = 0;

    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i].TABLE_NAME;

      // 获取创建表语句
      const createResult = await query('SHOW CREATE TABLE `' + tableName + '`');
      const createSQL = createResult[0]['Create Table'];

      // 获取表数据
      const dataResult = await query('SELECT * FROM `' + tableName + '` LIMIT 10000');

      if (dataResult.length === 0) {
        console.log('⚠️  跳过空表: ' + tableName);
        sqlContent.push('-- 表：' + tableName + '（无数据）');
        sqlContent.push(createSQL + ';\n');
        continue;
      }

      sqlContent.push('-- 表：' + tableName + '（' + dataResult.length + '条记录）');

      // 添加 CREATE TABLE
      sqlContent.push('DROP TABLE IF EXISTS `' + tableName + '`;');
      sqlContent.push(createSQL + ';\n');

      // 生成 INSERT 语句
      const columns = Object.keys(dataResult[0]);
      for (let j = 0; j < dataResult.length; j++) {
        const row = dataResult[j];
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) {
            return 'NULL';
          } else if (typeof val === 'string') {
            return "'" + val.replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
          } else if (typeof val === 'number') {
            return val.toString();
          } else if (val instanceof Date) {
            return "'" + val.toISOString() + "'";
          } else {
            return "'" + val + "'";
          }
        });

        const columnsStr = columns.join('`, `');
        const valuesStr = values.join(', ');
        sqlContent.push('INSERT INTO `' + tableName + '` (`' + columnsStr + '`) VALUES (' + valuesStr + ');');
        totalInserts++;
      }

      sqlContent.push('');
      console.log('✅ 已导出: ' + tableName + ' (' + dataResult.length + '条记录)');
    }

    // 4. 恢复设置
    sqlContent.push('SET FOREIGN_KEY_CHECKS=1;');
    sqlContent.push('');
    sqlContent.push('-- ============================================');
    sqlContent.push('-- 导出完成');
    sqlContent.push('-- ============================================');

    // 5. 保存文件
    const outputFile = path.join(__dirname, 'education_system_complete.sql');
    fs.writeFileSync(outputFile, sqlContent.join('\n'), 'utf8');

    const stats = fs.statSync(outputFile);
    console.log('\n3️⃣  保存文件\n');
    console.log('✅ SQL文件已生成！');
    console.log('   文件路径: ' + outputFile);
    console.log('   文件大小: ' + (stats.size / 1024).toFixed(2) + ' KB');
    console.log('   INSERT语句: ' + totalInserts + ' 条');
    console.log('\n========================================');
    console.log('✨ 数据库导出完成！');
    console.log('========================================\n');

  } catch (err) {
    console.error('❌ 导出失败:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

exportCompleteDatabase();
