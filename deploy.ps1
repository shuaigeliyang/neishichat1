# ============================================
# 一键部署脚本 (Windows PowerShell)
# 设计者：哈雷酱 (￣▽￣)／
# ============================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  教育系统智能体 - Docker一键部署" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 检查Docker
Write-Host "[1/4] 检查Docker..." -ForegroundColor Yellow
docker --version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "请先安装Docker: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Red
    exit 1
}

# 创建项目目录
Write-Host "[2/4] 创建项目目录..." -ForegroundColor Yellow
$projectDir = "C:\education-system"
if (-not (Test-Path $projectDir)) {
    New-Item -ItemType Directory -Path $projectDir | Out-Null
}

# 复制文件
Write-Host "[3/4] 复制文件..." -ForegroundColor Yellow
# 在这里复制项目文件到$projectDir
# 然后执行docker-compose up -d

Write-Host "[4/4] 启动服务..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  部署完成！" -ForegroundColor Green
Write-Host "  访问地址：http://localhost" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green