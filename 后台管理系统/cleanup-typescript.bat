@echo off
echo ========================================
echo 清理 TypeScript 文件脚本
echo ========================================
echo.

echo [1/3] 清理后端 .ts 文件...
cd /d "%~dp0backend\src"
del /s /q *.ts 2>nul
echo ✓ 后端 .ts 文件已删除

echo.
echo [2/3] 清理前端 .ts/.tsx 文件...
cd /d "%~dp0frontend\src"
del /s /q *.ts 2>nul
del /s /q *.tsx 2>nul
echo ✓ 前端 .ts/.tsx 文件已删除

echo.
echo [3/3] 删除 TypeScript 配置文件...
cd /d "%~dp0"
del /q backend\tsconfig.json 2>nul
del /q frontend\tsconfig.json 2>nul
del /q frontend\tsconfig.node.json 2>nul
del /q frontend\vite.config.ts 2>nul
echo ✓ TypeScript 配置文件已删除

echo.
echo ========================================
echo 清理完成！
echo ========================================
echo.
echo 后续步骤：
echo 1. 在后端目录运行: bun install
echo 2. 在前端目录运行: bun install
echo 3. 启动后端: cd backend && bun run dev
echo 4. 启动前端: cd frontend && bun run dev
echo.
pause
