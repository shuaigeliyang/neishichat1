#!/usr/bin/env node
/**
 * 超简单启动脚本
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('\n========================================');
console.log('  启动教育系统智能体');
console.log('========================================\n');

// 先启动前端
console.log('[1/2] 启动前端...');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  shell: true,
  stdio: 'ignore',
  detached: true,
  windowsHide: true
});
frontend.unref();
console.log('✓ 前端已启动\n');

// 再启动后端
console.log('[2/2] 启动后端...');
const backend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  shell: true,
  stdio: 'ignore',
  detached: true,
  windowsHide: true
});
backend.unref();
console.log('✓ 后端已启动\n');

console.log('========================================');
console.log('  🎉 启动完成！');
console.log('========================================\n');
console.log('  📍 前端: http://localhost:5173');
console.log('  📍 后端: http://localhost:3000\n');
console.log('  按Ctrl+C退出\n');
