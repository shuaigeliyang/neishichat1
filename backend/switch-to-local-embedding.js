/**
 * 切换到本地Embedding模式并重建索引
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 用途：一键切换到本地embedding模式
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n' + '🔥'.repeat(40));
console.log('🔥 切换到本地Embedding模式');
console.log('🔥 设计师：内师智能体系统 (￣▽￣)ﾉ');
console.log('🔥'.repeat(40) + '\n');

// 1. 检查.env配置
const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf-8');

if (envContent.includes('EMBEDDING_MODE=')) {
    envContent = envContent.replace(/EMBEDDING_MODE=.*/g, 'EMBEDDING_MODE=local');
    console.log('✓ 已更新.env配置：EMBEDDING_MODE=local');
} else {
    envContent += '\n# Embedding服务配置\nEMBEDDING_MODE=local\n';
    console.log('✓ 已添加.env配置：EMBEDDING_MODE=local');
}

fs.writeFileSync(envPath, envContent);

// 2. 检查依赖
console.log('\n📦 检查依赖...');

try {
    require.resolve('@xenova/transformers');
    console.log('✓ @xenova/transformers 已安装');
} catch (e) {
    console.log('⚠️  @xenova/transformers 未安装');
    console.log('   正在安装...\n');

    try {
        execSync('npm install @xenova/transformers onnxruntime-node --save', {
            cwd: __dirname,
            stdio: 'inherit'
        });
        console.log('\n✓ 依赖安装完成！');
    } catch (error) {
        console.error('\n❌ 依赖安装失败：', error.message);
        console.log('💡 请手动运行：npm install @xenova/transformers onnxruntime-node --save');
        process.exit(1);
    }
}

// 3. 提示用户
console.log('\n' + '='.repeat(80));
console.log('✅ 配置完成！接下来请执行以下步骤：');
console.log('='.repeat(80));
console.log('\n📝 步骤1：测试本地embedding服务');
console.log('   node test-local-embedding.js');
console.log('\n📝 步骤2：重建索引（使用本地模式）');
console.log('   node rebuild-index.js');
console.log('\n📝 步骤3：启动服务');
console.log('   npm start');
console.log('\n💡 提示：');
console.log('   - 首次运行需要下载模型（约400MB），请耐心等待');
console.log('   - 模型会缓存到本地，之后启动就快了');
console.log('   - 本地模式完全免费，不会被限流！');
console.log('='.repeat(80) + '\n');
