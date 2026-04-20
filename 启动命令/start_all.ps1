# UTF-8 BOM
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$baseDir = "E:\外包\教育系统智能体"
$venvPython = "$baseDir\.venv\Scripts\python.exe"
$logDir = "$baseDir\启动命令"

# Start Embedding Service
Start-Process -FilePath $venvPython `
    -ArgumentList "local_embedding_service_mirror.py" `
    -WorkingDirectory "$baseDir\主系统" `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$logDir\log_embedding.log" `
    -RedirectStandardError "$logDir\log_embedding.err"

Start-Sleep -Seconds 2

# Start Main Backend (Node)
Start-Process -FilePath "node" `
    -ArgumentList "src\app.js" `
    -WorkingDirectory "$baseDir\主系统\backend" `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$logDir\log_main_backend.log" `
    -RedirectStandardError "$logDir\log_main_backend.err"

Start-Sleep -Seconds 2

# Start Admin Backend (Node)
Start-Process -FilePath "node" `
    -ArgumentList "src\app.js" `
    -WorkingDirectory "$baseDir\管理系统\admin-backend" `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$logDir\log_admin_backend.log" `
    -RedirectStandardError "$logDir\log_admin_backend.err"

Start-Sleep -Seconds 2

# Start Main Frontend (npm run dev)
Start-Process -FilePath "cmd" `
    -ArgumentList "/c", "cd /d $baseDir\主系统\frontend-main && npm run dev" `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$logDir\log_main_frontend.log" `
    -RedirectStandardError "$logDir\log_main_frontend.err"

Start-Sleep -Seconds 2

# Start Admin Frontend (npm run dev)
Start-Process -FilePath "cmd" `
    -ArgumentList "/c", "cd /d $baseDir\管理系统\admin-frontend && npm run dev" `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$logDir\log_admin_frontend.log" `
    -RedirectStandardError "$logDir\log_admin_frontend.err"

Write-Host "All services starting..."
