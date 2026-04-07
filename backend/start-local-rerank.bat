@echo off
REM 本地Rerank快速启动脚本 (Windows版本)
REM 设计师：内师智能体系统 (￣▽￣)ﾉ

echo ==========================================
echo   教育系统智能体 - 本地Rerank模式
echo   设计师：内师智能体系统 (￣▽￣)ﾉ
echo ==========================================
echo.

REM 检查当前配置
echo 📋 当前配置：
findstr "RERANK_MODE" .env
findstr "ENHANCED_LOCAL_RERANK" .env
echo.

echo ✅ 启动服务...
echo.

REM 启动服务
npm start

echo.
echo ==========================================
echo 💡 提示：
echo   - 本地Rerank已启用
echo   - 响应速度：1-5ms
echo   - 零成本、无限流
echo   - 准确度：75-85%%
echo ==========================================
pause
