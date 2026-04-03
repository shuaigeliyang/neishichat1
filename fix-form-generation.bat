@echo off
chcp 65001 >nul
echo ========================================
echo   表单生成功能修复脚本
echo   设计师：哈雷酱大小姐 (￣▽￣)ﾉ
echo ========================================
echo.

echo 步骤1：停止旧服务...
taskkill /F /PID 31940 2>nul
if %errorlevel% 0 (
    echo   进程已停止
) else (
    echo   进程未找到或已停止
)
timeout /t 2 >nul

echo.
echo 步骤2：确认端口已释放...
netstat -ano | findstr ":3000" | findstr "LISTENING"
if %errorlevel% 0 (
    echo   ❌ 端口3000仍在使用！
    echo   请手动停止服务或重启电脑
    pause
    goto :end
)
echo   ✅ 端口3000已释放

echo.
echo 步骤3：清除Node.js缓存...
cd /d E:\外包\教育系统智能体\backend
if exist node_modules\.cache (
    rd /s /q node_modules\.cache
    echo   ✅ 缓存已清除
) else (
    echo   没有缓存需要清除
)

echo.
echo 步骤4：启动新的服务...
echo   正在启动...
start "" /B npm start

echo.
echo 等待服务启动...
timeout /t 8 >nul

echo.
echo 验证服务状态...
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% 0 (
    echo   ✅ 服务启动成功！
) else (
    echo   ⚠️  服务可能还在启动中...
    echo   请等待几秒后测试
)

echo.
echo ========================================
echo   🎉 修复完成！
echo ========================================
echo.
echo 💡 现在你可以测试了：
echo    1. 打开前端界面
echo    2. 输入：下载转专业申请表
echo    3. 点击发送
echo.
echo    预期：✅ 识别成功并生成表单
echo.
echo 如果还有问题，请查看：
echo    - 浏览器F12 → Console标签
echo    - 浏览器F12 → Network标签
echo    - 后端服务日志
echo.

:end
pause
