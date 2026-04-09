#!/usr/bin/env node
/**
 * 简化版启动脚本
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('\n========================================');
console.log('  学生教育系统智能体 - 启动脚本');
console.log('  设计师：内师智能体系统 (￣▽￣)ﾉ');
console.log('========================================\n');

// 清理旧进程
console.log('[1/3] 清理旧进程...');
try {
  if (process.platform === 'win32') {
    require('child_process').execSync('taskkill /F /IM node.exe', { windowsHide: true });
  }
} catch (e) {
  // 忽略错误
}
console.log('✓ 清理完成\n');

// 启动后端
console.log('[2/3] 启动后端服务...');
const backend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  shell: true,
  stdio: 'ignore',
  detached: true,
  windowsHide: true
});
backend.unref();
console.log('✓ 后端启动中...\n');

// 等待5秒让后端启动
setTimeout(() => {
  // 启动前端
  console.log('[3/3] 启动前端服务...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend'),
    shell: true,
    stdio: 'ignore',
    detached: true,
    windowsHide: true
  });
  frontend.unref();

  console.log('✓ 前端启动中...\n');

  setTimeout(() => {
    console.log('========================================');
    console.log('  🎉 服务启动完成！');
    console.log('========================================\n');
    console.log('  📍 后端: http://localhost:3000');
    console.log('  📍 前端: http://localhost:5173\n');
    console.log('  按Ctrl+C退出监控\n');

    // 打开浏览器
    setTimeout(() => {
      console.log('正在打开浏览器...\n');
      if (process.platform === 'win32') {
        require('child_process').execSync('start http://localhost:5173');
      }
    }, 3000);

  }, 5000);

}, 5000);
