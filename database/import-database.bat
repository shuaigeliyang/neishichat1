@echo off
REM ============================================
REM 教育系统数据库 - 一键导入脚本
REM 作者：内师智能体系统 (￣▽￣)ﾉ
REM 用途：自动导入 education_system 数据库
REM ============================================

chcp 65001 >nul
cls

echo.
echo ==========================================
echo   教育系统数据库导入工具
echo   作者：内师智能体系统 (￣▽￣)ﾉ
echo ==========================================
echo.

REM 检查MySQL是否可用
where mysql >nul 2>&1
if errorlevel 1 (
    echo ❌ MySQL命令行工具未找到！
    echo.
    echo 请确保：
    echo   1. MySQL 已安装
    echo   2. MySQL bin 目录已添加到 PATH 环境变量
    echo.
    echo MySQL bin 目录通常在：
    echo   C:\Program Files\MySQL\MySQL Server 8.0\bin
    echo.
    pause
    exit /b 1
)

echo ✅ MySQL 工具检测成功
echo.

REM 提示输入MySQL密码
echo 📝 请输入MySQL root用户的密码：
echo.
set /p MYSQL_PWD=密码:

if "%MYSQL_PWD%"=="" (
    echo.
    echo ❌ 密码不能为空！
    pause
    exit /b 1
)

echo.
echo ==========================================
echo ⏳ 正在导入数据库...
echo ==========================================
echo.

REM 测试MySQL连接
mysql -u root -p%MYSQL_PWD% -e "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo ❌ MySQL连接失败！
    echo.
    echo 请检查：
    echo   1. MySQL 服务是否启动
    echo   2. root 用户密码是否正确
    echo.
    pause
    exit /b 1
)

echo ✅ MySQL连接成功
echo.

REM 导入数据
echo 📦 导入数据库表结构和数据...
echo.

mysql -u root -p%MYSQL_PWD% --force < education_system_complete.sql >nul 2>&1

if errorlevel 1 (
    echo ❌ 导入失败！
    echo.
    echo 可能的原因：
    echo   1. SQL 文件路径不正确
    echo   2. 数据库已存在表冲突
    echo   3. 权限不足
    echo.
    echo 请查看上面的错误信息
    pause
    exit /b 1
)

echo ✅ 数据导入成功！
echo.

REM 验证导入
echo ==========================================
echo 🔍 验证导入结果
echo ==========================================
echo.

echo 📋 数据库表列表：
mysql -u root -p%MYSQL_PWD% -e "USE education_system; SHOW TABLES;" 2>nul

echo.
echo 📊 关键表数据统计：
mysql -u root -p%MYSQL_PWD% -e "USE education_system; SELECT '表单模板' AS '表名', COUNT(*) AS '记录数' FROM form_templates UNION ALL SELECT '学生', COUNT(*) FROM students UNION ALL SELECT '教师', COUNT(*) FROM teachers;" 2>nul

echo.
echo ==========================================
echo ✨ 导入完成！
echo ==========================================
echo.
echo 📝 下一步操作：
echo    1. 配置后端环境变量（backend/.env）
echo    2. 安装后端依赖（npm install）
echo    3. 启动后端服务（npm start 或 pm2 start）
echo    4. 测试系统功能
echo.
echo 📖 详细说明请查看 DATABASE_IMPORT_GUIDE.md
echo.
pause
