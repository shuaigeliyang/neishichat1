/**
 * 教育系统智能体 - 完整数据库导出工具
 * 作者：内师智能体系统 (￣▽￣)ﾉ
 * 用途：导出 education_system 数据库的所有表结构和数据
 * 输出：完整的 SQL 文件，包含建表语句和数据
 */

const { query } = require('../backend/src/config/database');
const path = require('path');
const fs = require('fs');
const path = require('path');

async function exportDatabase() {
  console.log('========================================');
  console.log('  教育系统数据库导出工具');
  console.log('  作者：内师智能体系统 (￣▽￣)ﾉ');
  console.log('========================================\n');

  try {
    // 1. 获取所有表名
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  获取数据库表列表');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const tables = await query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'education_system'
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    console.log(`✅ 找到 ${tables.length} 个表：`);
    tables.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.TABLE_NAME}`);
    });
    console.log('');

    // 2. 生成SQL文件头部
    const sqlContent = [];
    sqlContent.push('-- ============================================');
    sqlContent.push('-- 教育系统智能体 - 完整数据库导出');
    sqlContent.push('-- 作者：内师智能体系统 (￣▽￣)ﾉ');
    sqlContent.push('-- 导出时间：' + new Date().toLocaleString('zh-CN'));
    sqlContent.push('-- 数据库：education_system');
    sqlContent.push('-- 表数量：' + tables.length);
    sqlContent.push('-- ============================================');
    sqlContent.push('');
    sqlContent.push('-- ============================================');
    sqlContent.push('-- 使用说明');
    sqlContent.push('-- ============================================');
    sqlContent.push('-- 1. 创建数据库：');
    sqlContent.push('--    CREATE DATABASE IF NOT EXISTS education_system;');
    sqlContent.push('--    USE education_system;');
    sqlContent.push('--');
    sqlContent.push('-- 2. 导入数据：');
    sqlContent.push('--    mysql -u root -p < education_system_complete.sql');
    sqlContent.push('--');
    sqlContent.push('-- 3. 或在MySQL客户端中：');
    sqlContent.push('--    source education_system_complete.sql;');
    sqlContent.push('-- ============================================');
    sqlContent.push('');
    sqlContent.push('SET NAMES utf8mb4;');
    sqlContent.push('SET FOREIGN_KEY_CHECKS = 0;');
    sqlContent.push('');

    // 3. 为每个表生成 DROP TABLE 和 CREATE TABLE 语句
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  导出表结构');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const table of tables) {
      const tableName = table.TABLE_NAME;

      // DROP TABLE
      sqlContent.push(`-- ------------------------------------------`);
      sqlContent.push(`-- 表：${tableName}`);
      sqlContent.push(`-- ------------------------------------------`);
      sqlContent.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);

      // CREATE TABLE
      const createTableSQL = await query(`
        SHOW CREATE TABLE \`${tableName}\`
      `);

      sqlContent.push(createTableSQL[0]['Create Table'] + ';');
      sqlContent.push('');

      console.log(`✅ 已导出表结构: ${tableName}`);
    }

    // 4. 导出数据
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  导出表数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 先禁用外键检查
    sqlContent.push('-- ============================================');
    sqlContent.push('-- 数据导出');
    sqlContent.push('-- ============================================');
    sqlContent.push('');

    for (const table of tables) {
      const tableName = table.TABLE_NAME;

      // 获取表的行数
      const countResult = await query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
      const rowCount = countResult[0].count;

      if (rowCount === 0) {
        console.log(`⚠️  跳过空表: ${tableName}`);
        continue;
      }

      sqlContent.push(`-- ------------------------------------------`);
      sqlContent.push(`-- 数据：${tableName} (${rowCount} 行)`);
      sqlContent.push(`-- ------------------------------------------`);

      // 获取表的所有数据
      const data = await query(`SELECT * FROM \`${tableName}\``);

      // 生成 INSERT 语句
      for (const row of data) {
        const columns = Object.keys(row);
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) {
            return 'NULL';
          } else if (typeof val === 'string') {
            return `'${val.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
          } else if (typeof val === 'number') {
            return val;
          } else if (val instanceof Date) {
            return `'${val.toISOString()}'`;
          } else {
            return `'${val}'`;
          }
        });

        const columnsStr = columns.join('`, `');
        const valuesStr = values.join(', ');

        sqlContent.push(`INSERT INTO \`${tableName}\` (\`${columnsStr}\`) VALUES (${valuesStr});`);
      }

      sqlContent.push('');
      console.log(`✅ 已导出数据: ${tableName} (${rowCount} 行)`);
    }

    // 5. 恢复外键检查
    sqlContent.push('SET FOREIGN_KEY_CHECKS = 1;');
    sqlContent.push('');
    sqlContent.push('-- ============================================');
    sqlContent.push('-- 导出完成');
    sqlContent.push('-- ============================================');

    // 6. 保存到文件
    const outputFile = path.join(__dirname, 'education_system_complete.sql');
    fs.writeFileSync(outputFile, sqlContent.join('\n'), 'utf8');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  保存文件');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const stats = fs.statSync(outputFile);
    console.log(`✅ SQL文件已生成！`);
    console.log(`   文件路径: ${outputFile}`);
    console.log(`   文件大小: ${(stats.size / 1024).toFixed(2)} KB`);

    // 7. 生成使用说明文档
    const readmeContent = `# 教育系统数据库 - 完整导出

> 作者：内师智能体系统 (￣▽￣)ﾉ
> 导出时间：${new Date().toLocaleString('zh-CN')}
> 数据库：education_system
> 表数量：${tables.length}

---

## 📋 文件说明

### education_system_complete.sql
完整的数据库导出文件，包含：
- ✅ 数据库所有表的结构（CREATE TABLE）
- ✅ 所有表的数据（INSERT语句）
- ✅ 完整的索引和约束
- ✅ 字符集设置（utf8mb4）

**文件大小：** ${(stats.size / 1024).toFixed(2)} KB

---

## 🚀 导入步骤

### 方法1：使用命令行（推荐）

\`\`\`bash
# 1. 登录MySQL
mysql -u root -p

# 2. 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS education_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 3. 使用数据库
USE education_system;

# 4. 导入数据
source E:/外包/教育系统智能体/database/education_system_complete.sql

# 或者一行命令
mysql -u root -p education_system < E:/外包/教育系统智能体/database/education_system_complete.sql
\`\`\`

### 方法2：使用MySQL客户端

1. 打开 MySQL Workbench 或其他客户端
2. 连接到MySQL服务器
3. 执行以下命令：
   \`\`\`sql
   CREATE DATABASE IF NOT EXISTS education_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE education_system;
   source E:/外包/教育系统智能体/database/education_system_complete.sql;
   \`\`\`

### 方法3：使用Navicat

1. 打开 Navicat
2. 连接到MySQL服务器
3. 右键点击连接 → 新建数据库 → 名称：education_system
4. 双击打开数据库
5. 点击"运行SQL文件" → 选择 education_system_complete.sql
6. 点击"开始"执行导入

---

## 📊 数据库表清单

${tables.map((t, i) => `${i + 1}. ${t.TABLE_NAME}`).join('\n')}

---

## ⚠️ 注意事项

### 1. 数据库编码
确保使用 **utf8mb4** 编码，支持中文和特殊字符！

### 2. 外键约束
导入时会自动禁用外键检查，导入完成后自动恢复。

### 3. 覆盖警告
⚠️ **如果数据库已存在，将会被覆盖！**
如需保留原数据，请先备份！

### 4. 权限要求
确保MySQL用户有以下权限：
- CREATE
- DROP
- INSERT
- UPDATE
- DELETE
- INDEX

---

## 🔍 验证导入

导入完成后，运行以下命令验证：

\`\`\`sql
-- 查看所有表
SHOW TABLES;

-- 验证表单数据
SELECT COUNT(*) FROM form_templates;

-- 验证学生数据
SELECT COUNT(*) FROM students;

-- 验证教师数据
SELECT COUNT(*) FROM teachers;
\`\`\`

预期结果：
- 表单模板表：13条记录
- 学生表：多条记录
- 教师表：多条记录

---

## 🛠️ 故障排除

### 问题1：字符编码错误

**错误信息：** \`Incorrect string value\`

**解决：**
\`\`\`sql
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
\`\`\`

### 问题2：外键约束错误

**错误信息：** \`Cannot add foreign key constraint\`

**解决：**
\`\`\`sql
SET FOREIGN_KEY_CHECKS = 0;
-- 导入数据
SET FOREIGN_KEY_CHECKS = 1;
\`\`\`

### 问题3：文件路径错误

**错误：** \`Failed to open file\`

**解决：**
- 使用正斜杠 /
- 或使用双反斜杠 \\\\
- 或使用引号包裹路径

---

## 📝 导出信息

- **导出时间：** ${new Date().toLocaleString('zh-CN')}
- **数据库版本：** MySQL 5.7+
- **字符集：** utf8mb4
- **排序规则：** utf8mb4_unicode_ci

---

## 📞 需要帮助？

如果导入过程中遇到问题，请提供：
1. 错误信息截图
2. MySQL版本
3. 操作系统
4. 使用的客户端工具

---

**文档版本：** 1.0
**最后更新：** ${new Date().toLocaleString('zh-CN')}
**作者：** 内师智能体系统 (￣▽￣)ﾉ

哼，跟着本小姐的步骤，一定能成功导入！笨蛋！(￣ω￣)ﾉ
`;

    const readmeFile = path.join(__dirname, 'DATABASE_IMPORT_GUIDE.md');
    fs.writeFileSync(readmeFile, readmeContent, 'utf8');

    console.log(`✅ README文件已生成！`);
    console.log(`   文件路径: ${readmeFile}`);

    // 8. 生成快速导入脚本
    const batScript = `@echo off
REM ============================================
REM 教育系统数据库 - 快速导入脚本
REM 作者：内师智能体系统 (￣▽￣)ﾉ
REM ============================================

echo.
echo ==========================================
echo   教育系统数据库导入工具
echo   作者：内师智能体系统 (￣▽￣)ﾉ
echo ==========================================
echo.

REM 检查MySQL是否可用
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ MySQL命令行工具未找到！
    echo    请确保MySQL已安装并添加到PATH环境变量
    pause
    exit /b 1
)

echo ✅ MySQL工具检测成功
echo.

REM 提示输入MySQL密码
set /p MYSQL_PWD=请输入MySQL root密码:

echo.
echo 开始导入数据库...
echo.

REM 导入数据
mysql -u root -p%MYSQL_PWD% education_system < education_system_complete.sql

if errorlevel 1 (
    echo.
    echo ❌ 导入失败！
    echo    请检查：
    echo    1. MySQL密码是否正确
    echo    2. 数据库 education_system 是否已创建
    echo    3. SQL文件路径是否正确
    pause
    exit /b 1
)

echo.
echo ==========================================
echo ✨ 导入完成！
echo ==========================================
echo.
echo 📝 验证导入：
echo    1. 打开MySQL客户端
echo    2. USE education_system;
echo    3. SHOW TABLES;
echo.
pause
`;

    const batFile = path.join(__dirname, 'import-database.bat');
    fs.writeFileSync(batFile, batScript, 'utf8');

    console.log(`✅ BAT脚本已生成！`);
    console.log(`   文件路径: ${batFile}`);

    // 9. 生成Shell脚本（Linux/Mac）
    const shScript = `#!/bin/bash
# ============================================
# 教育系统数据库 - 快速导入脚本
# 作者：内师智能体系统 (￣▽￣)ﾉ
# ============================================

echo ""
echo "=========================================="
echo "  教育系统数据库导入工具"
echo "  作者：内师智能体系统 (￣▽￣)ﾉ"
echo "=========================================="
echo ""

# 检查MySQL是否可用
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL命令行工具未找到！"
    echo "   请确保MySQL已安装并添加到PATH环境变量"
    exit 1
fi

echo "✅ MySQL工具检测成功"
echo ""

# 提示输入MySQL密码
read -sp "请输入MySQL root密码: " MYSQL_PWD
echo ""

# 创建数据库（如果不存在）
echo "创建数据库..."
mysql -u root -p$MYSQL_PWD -e "CREATE DATABASE IF NOT EXISTS education_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 创建数据库失败！请检查密码是否正确"
    exit 1
fi

echo "✅ 数据库创建成功"
echo ""

# 导入数据
echo "导入数据..."
mysql -u root -p$MYSQL_PWD education_system < education_system_complete.sql

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 导入失败！"
    echo "   请检查："
    echo "   1. MySQL密码是否正确"
    echo "   2. SQL文件路径是否正确"
    exit 1
fi

echo ""
echo "=========================================="
echo "✨ 导入完成！"
echo "=========================================="
echo ""
echo "📝 验证导入："
echo "   mysql -u root -p education_system"
echo "   SHOW TABLES;"
echo ""
`;

    const shFile = path.join(__dirname, 'import-database.sh');
    fs.writeFileSync(shFile, shScript, 'utf8');
    fs.chmodSync(shFile, '0755');

    console.log(`✅ Shell脚本已生成！`);
    console.log(`   文件路径: ${shFile}`);

    // 10. 完成
    console.log('\n========================================');
    console.log('✨ 数据库导出完成！');
    console.log('========================================\n');

    console.log('📁 生成的文件：');
    console.log('   1. education_system_complete.sql - 完整数据库');
    console.log('   2. DATABASE_IMPORT_GUIDE.md - 导入指南');
    console.log('   3. import-database.bat - Windows导入脚本');
    console.log('   4. import-database.sh - Linux/Mac导入脚本');

    console.log('\n💡 使用方法：');
    console.log('   Windows用户：双击运行 import-database.bat');
    console.log('   Linux/Mac用户：bash import-database.sh');
    console.log('   或手动执行 SQL 文件\n');

    console.log('📮 现在可以把整个 database 文件夹发给同学了！');
    console.log('   记得告诉同学看 DATABASE_IMPORT_GUIDE.md 文件哦～\n');

  } catch (err) {
    console.error('❌ 导出失败:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 运行导出
exportDatabase();
