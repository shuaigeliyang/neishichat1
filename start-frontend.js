#!/usr/bin/env node
/**
 * 前台启动脚本 - 教育系统智能体
 * 设计师：哈雷酱 (￣▽￣)／
 *
 * 功能：
 * - 同时启动前端和后端服务
 * - 彩色日志输出
 * - 优雅关闭（Ctrl+C）
 * - 启动顺序管理
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// ============== 颜色配置 ==============
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${colors.bright}========== ${msg} ==========${colors.reset}\n`),
};

// ============== 全局变量 ==============
let backendProcess = null;
let frontendProcess = null;
let isShuttingDown = false;

// ============== 端口检查 ==============
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function waitForPort(port, timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const available = await checkPort(port);
    if (available) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ============== 启动后端 ==============
async function startBackend() {
  log.info('正在启动后端服务 (port 3000)...');

  // 检查端口是否已被占用
  const portAvailable = await checkPort(3000);
  if (!portAvailable) {
    log.warn('端口 3000 已被占用，后端可能已在运行');
    const confirm = await askQuestion('是否继续尝试启动? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      log.info('跳过后端启动');
      return false;
    }
  }

  return new Promise((resolve) => {
    backendProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'backend'),
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: false
    });

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${colors.dim}[Backend]${colors.reset} ${output}`);
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('ExperimentalWarning')) {
        console.log(`${colors.red}[Backend Error]${colors.reset} ${output}`);
      }
    });

    backendProcess.on('error', (err) => {
      log.error(`后端启动失败: ${err.message}`);
      resolve(false);
    });

    backendProcess.on('exit', (code) => {
      if (!isShuttingDown && code !== 0) {
        log.error(`后端进程异常退出，代码: ${code}`);
      }
      backendProcess = null;
    });

    // 等待后端启动
    setTimeout(() => {
      if (backendProcess) {
        log.success('后端服务已启动 (port 3000)');
        resolve(true);
      }
    }, 2000);
  });
}

// ============== 启动前端 ==============
async function startFrontend() {
  log.info('正在启动前端服务 (port 5173)...');

  // 检查端口
  const portAvailable = await checkPort(5173);
  if (!portAvailable) {
    log.warn('端口 5173 已被占用，前端可能已在运行');
    return false;
  }

  return new Promise((resolve) => {
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'frontend'),
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: false
    });

    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        // Vite 启动完成会显示 Local: http://localhost:5173/
        if (output.includes('Local:') || output.includes('ready in')) {
          log.success(`前端服务已就绪!`);
        }
        console.log(`${colors.dim}[Frontend]${colors.reset} ${output}`);
      }
    });

    frontendProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('ExperimentalWarning')) {
        console.log(`${colors.yellow}[Frontend Warn]${colors.reset} ${output}`);
      }
    });

    frontendProcess.on('error', (err) => {
      log.error(`前端启动失败: ${err.message}`);
      resolve(false);
    });

    frontendProcess.on('exit', (code) => {
      if (!isShuttingDown && code !== 0) {
        log.error(`前端进程异常退出，代码: ${code}`);
      }
      frontendProcess = null;
    });

    // 等待前端启动
    setTimeout(() => {
      if (frontendProcess) {
        log.success('前端服务已启动 (port 5173)');
        resolve(true);
      }
    }, 3000);
  });
}

// ============== 优雅关闭 ==============
function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log.info(`收到 ${signal} 信号，开始关闭服务...`);

  const killProcess = (proc, name) => {
    if (proc) {
      log.info(`正在关闭 ${name}...`);
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (proc) {
          proc.kill('SIGKILL');
        }
      }, 3000);
    }
  };

  killProcess(frontendProcess, '前端服务');
  killProcess(backendProcess, '后端服务');

  setTimeout(() => {
    log.success('所有服务已关闭，再见！');
    process.exit(0);
  }, 1000);
}

// 注册信号处理器
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ============== 问答函数 ==============
function askQuestion(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

// ============== 主函数 ==============
async function main() {
  console.log();
  log.title('教育系统智能体 - 前台启动');

  // 显示环境信息
  log.info(`工作目录: ${__dirname}`);
  log.info(`Node版本: ${process.version}`);
  log.info(`平台: ${process.platform}`);

  // 启动后端
  log.title('启动后端服务');
  const backendOk = await startBackend();

  // 启动前端
  log.title('启动前端服务');
  const frontendOk = await startFrontend();

  // 总结
  log.title('启动完成');
  console.log(`  ${colors.green}✓${colors.reset} 后端服务: ${backendOk ? '已启动 (http://localhost:3000)' : '跳过/失败'}`);
  console.log(`  ${colors.green}✓${colors.reset} 前端服务: ${frontendOk ? '已启动 (http://localhost:5173)' : '跳过/失败'}`);
  console.log();
  console.log(`  ${colors.cyan}📍 前端地址: http://localhost:5173${colors.reset}`);
  console.log(`  ${colors.cyan}📍 后端地址: http://localhost:3000${colors.reset}`);
  console.log();
  log.info('按 Ctrl+C 关闭服务');
  console.log();

  // 保持进程运行
  await new Promise(() => {});
}

// 运行
main().catch((err) => {
  log.error(`启动失败: ${err.message}`);
  process.exit(1);
});
