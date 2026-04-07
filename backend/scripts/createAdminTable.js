/**
 * 创建管理员表并插入管理员用户
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

require('dotenv').config();
const { query } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function createAdminTable() {
  try {
    console.log('🚀 开始创建管理员表和用户...\n');

    // 创建admins表
    console.log('📝 创建admins表...');
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        admin_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '管理员ID',
        username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
        password VARCHAR(255) NOT NULL COMMENT '密码（加密）',
        name VARCHAR(50) NOT NULL COMMENT '姓名',
        email VARCHAR(100) COMMENT '邮箱',
        phone VARCHAR(20) COMMENT '电话',
        role VARCHAR(50) DEFAULT '超级管理员' COMMENT '角色',
        status TINYINT DEFAULT 1 COMMENT '状态：1-启用，0-停用',
        last_login DATETIME COMMENT '最后登录时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_username (username),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表'
    `);
    console.log('✅ admins表创建成功\n');

    // 检查是否已有管理员
    const existingAdmins = await query('SELECT * FROM admins WHERE username = ?', ['admin']);

    if (existingAdmins.length === 0) {
      console.log('📝 插入默认管理员账号...\n');

      // 生成密码哈希
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // 插入默认管理员
      await query(`
        INSERT INTO admins (username, password, name, email, role, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['admin', hashedPassword, '系统管理员', 'admin@edu.cn', '超级管理员', 1]);

      console.log('✅ 默认管理员账号创建成功\n');
      console.log('   用户名: admin');
      console.log('   密码: admin123');
      console.log('   角色: 超级管理员\n');

    } else {
      console.log('ℹ️  管理员账号已存在');
      console.log(`   用户名: ${existingAdmins[0].username}\n`);
    }

    // 显示所有管理员
    const allAdmins = await query('SELECT admin_id, username, name, email, role, status FROM admins');
    console.log('📋 当前所有管理员:');
    console.table(allAdmins.map(a => ({
      ID: a.admin_id,
      用户名: a.username,
      姓名: a.name,
      邮箱: a.email,
      角色: a.role,
      状态: a.status === 1 ? '启用' : '停用'
    })));

    console.log('\n🎉 管理员表创建完成！\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ 创建管理员表失败:', error.message);
    process.exit(1);
  }
}

createAdminTable();
