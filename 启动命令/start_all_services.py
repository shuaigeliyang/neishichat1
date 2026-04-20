import subprocess
import time
import os

base = "E:\\外包\\教育系统智能体"
venv_python = os.path.join(base, ".venv\\Scripts\\python.exe")
log_dir = os.path.join(base, "启动命令")

os.makedirs(log_dir, exist_ok=True)

services = [
    {
        "name": "Embedding Service",
        "cmd": [venv_python, "local_embedding_service_mirror.py"],
        "cwd": os.path.join(base, "backend"),
        "log": os.path.join(log_dir, "log_embedding.log"),
    },
    {
        "name": "Main Backend (Node)",
        "cmd": ["node", "src\\app.js"],
        "cwd": os.path.join(base, "backend"),
        "log": os.path.join(log_dir, "log_main_backend.log"),
    },
    {
        "name": "Admin Backend (Node)",
        "cmd": ["node", "src\\app.js"],
        "cwd": os.path.join(base, "后台管理系统", "backend"),
        "log": os.path.join(log_dir, "log_admin_backend.log"),
    },
    {
        "name": "Main Frontend (npm run dev)",
        "cmd": ["cmd", "/c", "npm run dev"],
        "cwd": os.path.join(base, "frontend"),
        "log": os.path.join(log_dir, "log_main_frontend.log"),
    },
    {
        "name": "Admin Frontend (npm run dev)",
        "cmd": ["cmd", "/c", "npm run dev"],
        "cwd": os.path.join(base, "后台管理系统", "frontend"),
        "log": os.path.join(log_dir, "log_admin_frontend.log"),
    },
]

for s in services:
    print(f"Starting {s['name']}...")
    print(f"  CWD: {s['cwd']}")
    if not os.path.isdir(s["cwd"]):
        print(f"  SKIP: Directory does not exist!")
        continue
    try:
        with open(s["log"], "w") as f:
            proc = subprocess.Popen(
                s["cmd"],
                cwd=s["cwd"],
                stdout=f,
                stderr=subprocess.STDOUT,
            )
        print(f"  PID: {proc.pid}")
    except Exception as e:
        print(f"  ERROR: {e}")
    time.sleep(1)

print("\nAll services started!")
