-- 管理员用户表
CREATE TABLE IF NOT EXISTS admin_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'superadmin') DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 注意：请运行 npm run seed 来创建默认管理员账号
-- 或手动执行以下SQL（密码: admin123）
--
-- INSERT INTO admin_users (username, password_hash, role) VALUES
-- ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'superadmin');
