# 教育系统数据库 - 完整导出

> 作者：内师智能体系统 (￣▽￣)ﾉ
> 导出时间：2026-03-30
> 数据库：education_system
> 文件大小：295 KB

---

## 📋 文件清单

### database 文件夹包含：

1. **education_system_complete.sql** ⭐
   - 完整的数据库导出文件
   - 包含所有表结构和数据
   - 文件大小：295 KB

2. **import-database.bat** (Windows)
   - Windows 一键导入脚本
   - 自动检测MySQL并导入数据

3. **import-database.sh** (Linux/Mac)
   - Linux/Mac 一键导入脚本
   - 需要执行权限：chmod +x import-database.sh

4. **DATABASE_IMPORT_GUIDE.md** (本文件)
   - 详细的导入指南
   - 故障排除方法

---

## 🚀 快速开始（3步完成）

### Windows 用户

```bash
# 1. 双击运行
import-database.bat

# 2. 输入MySQL密码
# 等待导入完成

# 3. 验证
mysql -u root -p
USE education_system;
SHOW TABLES;
```

### Linux/Mac 用户

```bash
# 1. 添加执行权限
chmod +x import-database.sh

# 2. 运行脚本
./import-database.sh

# 3. 输入MySQL密码
# 等待导入完成
```

### 手动导入（通用）

```bash
# 1. 登录MySQL
mysql -u root -p

# 2. 在MySQL命令行中执行：
source E:/外包/教育系统智能体/database/education_system_complete.sql
```

---

## 📊 数据库内容

### 表结构统计

完整数据库包含以下表（共约20+个表）：

#### 学生管理（5个）
- students（学生表）
- classes（班级表）
- majors（专业表）
- colleges（学院表）
- teachers（教师表）

#### 教学管理（6个）
- courses（课程表）
- course_offerings（开课计划表）
- grades（成绩表）
- classrooms（教室表）

#### 表单管理（2个）
- form_templates（表单模板表）✨ **第一阶段已更新（13个表单）**
- downloadable_forms（可下载表格表）

#### 用户管理（3个）
- user_roles（角色表）
- user_role_relations（角色关联表）
- admins（管理员表）

#### 其他管理（若干）
- chat_history（对话历史）
- faq（常见问题）
- announcements（通知公告）
- system_logs（系统日志）
- ...

### 关键数据说明

#### form_templates（表单模板表）
**重要：** 第一阶段已更新为13个可下载表单！

```
申请表（9个）：
1. 学科竞赛参赛申请表
2. 转专业申请表
3. 奖学金申请表
4. 休学申请表
5. 复学申请表 ✨ 新增
6. 请假申请表 ✨ 新增
7. 贫困生认定申请表 ✨ 新增
8. 助学金申请表 ✨ 新增
9. 助学贷款申请表 ✨ 新增

证明表（4个）：
10. 成绩证明申请表 ✨ 新增
11. 在读证明申请表 ✨ 新增
12. 毕业证明申请表 ✨ 新增
13. 学位证明申请表 ✨ 新增
```

---

## ⚙️ 系统要求

### 软件要求

1. **MySQL 数据库**
   - 版本：5.7+ 或 8.0+
   - 字符集：utf8mb4
   - 排序规则：utf8mb4_unicode_ci

2. **MySQL 客户端工具**（任选其一）
   - MySQL Command Line Client
   - MySQL Workbench
   - Navicat for MySQL
   - phpMyAdmin

### 硬件要求

- 可用磁盘空间：至少 100 MB
- 内存：至少 512 MB

---

## 🛠️ 详细导入步骤

### 步骤1：检查MySQL服务

**Windows:**
```bash
# 检查MySQL服务状态
sc query MySQL80

# 如果未运行，启动服务
sc start MySQL80
```

**Linux:**
```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 如果未运行，启动服务
sudo systemctl start mysql
```

### 步骤2：创建数据库（可选）

SQL文件会自动创建数据库，但也可以手动创建：

```sql
CREATE DATABASE IF NOT EXISTS education_system
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 步骤3：导入数据

#### 方法A：使用批处理脚本（推荐）

**Windows:**
```bash
cd E:\外包\教育系统智能体\database
import-database.bat
```

**Linux/Mac:**
```bash
cd E:/外包/教育系统智能体/database
chmod +x import-database.sh
./import-database.sh
```

#### 方法B：使用命令行

```bash
mysql -u root -p education_system < education_system_complete.sql
```

#### 方法C：使用MySQL Workbench

1. 打开 MySQL Workbench
2. 连接到本地MySQL服务器
3. 选择：Server → Data Import
4. 选择 Import from Self-Contained File
5. 选择 education_system_complete.sql
6. 选择 Default Target Schema: education_system
7. 点击 Start Import

#### 方法D：使用Navicat

1. 打开 Navicat
2. 连接到MySQL服务器
3. 右键连接 → 新建数据库
   - 数据库名：education_system
   - 字符集：utf8mb4
4. 双击打开数据库
5. 点击"运行SQL文件"
6. 选择 education_system_complete.sql
7. 点击"开始"

### 步骤4：验证导入

```sql
-- 查看所有表
USE education_system;
SHOW TABLES;

-- 验证关键表的数据
SELECT COUNT(*) AS '表单数量' FROM form_templates;
SELECT COUNT(*) AS '学生数量' FROM students;
SELECT COUNT(*) AS '教师数量' FROM teachers;

-- 查看表单列表
SELECT template_name, category
FROM form_templates
ORDER BY sort_order;
```

**预期结果：**
- 表单数量：13
- 学生数量：≥5
- 教师数量：≥1
- 表单列表：包含竞赛、转专业、奖学金等13个表单

---

## 🔍 故障排除

### 问题1：Access denied

**错误信息：**
```
ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)
```

**解决方法：**
1. 检查MySQL密码是否正确
2. 确认root用户权限
3. 重置MySQL密码（如果忘记）

### 问题2：Unknown database

**错误信息：**
```
ERROR 1049 (42000): Unknown database 'education_system'
```

**解决方法：**
```sql
-- 手动创建数据库
CREATE DATABASE education_system
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- 然后重新导入
USE education_system;
source education_system_complete.sql;
```

### 问题3：字符编码问题

**错误信息：**
```
Incorrect string value
```

**解决方法：**
```sql
-- 确保使用正确的字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET COLLATION_CONNECTION='utf8mb4_unicode_ci';

-- 然后重新导入
```

### 问题4：外键约束错误

**错误信息：**
```
Cannot add or update a child row: a foreign key constraint fails
```

**解决方法：**
SQL文件已自动处理外键检查，如果仍有问题：
```sql
SET FOREIGN_KEY_CHECKS=0;
-- 导入数据
SET FOREIGN_KEY_CHECKS=1;
```

### 问题5：文件路径错误

**错误信息：**
```
Failed to open file
```

**解决方法：**
- 使用正斜杠 `/`
- 或使用双反斜杠 `\\\\`
- 或使用绝对路径

---

## 📝 导入后配置

### 1. 配置后端环境

编辑 `backend/.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=education_system
```

### 2. 重启后端服务

```bash
# PM2
pm2 restart all

# 或直接启动
cd backend
npm start
```

### 3. 测试后端连接

```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试表单列表
curl http://localhost:3000/api/forms
```

---

## 🎯 验收标准

导入成功后，应该满足以下标准：

### 功能验收

- ✅ 所有表都能正常显示
- ✅ 表单模板表有13条记录
- ✅ 学生表有测试数据
- ✅ 可以正常登录系统

### 数据完整性

- ✅ 所有外键关系正确
- ✅ 所有索引都已创建
- ✅ 字符集为 utf8mb4
- ✅ 没有数据丢失

---

## 📞 技术支持

如遇到问题，请提供以下信息：

1. **MySQL 版本**
   ```sql
   SELECT VERSION();
   ```

2. **错误信息截图**
   - 完整的错误信息
   - 错误发生的时间点

3. **系统环境**
   - 操作系统（Windows/Linux/Mac）
   - MySQL版本
   - 导入方式（脚本/手动）

4. **相关日志**
   - MySQL错误日志
   - 后端服务日志

---

## 💡 最佳实践

### 生产环境部署建议

1. **不要使用 root 用户**
   - 创建专用数据库用户
   - 只授予必要权限

2. **定期备份数据库**
   ```bash
   # 手动备份
   mysqldump -u root -p education_system > backup_$(date +%Y%m%d).sql

   # 自动备份（添加到crontab）
   0 2 * * * mysqldump -u root -p education_system > /backup/education_system_$(date +\%Y\%m\%d).sql
   ```

3. **优化MySQL配置**
   - 调整缓冲区大小
   - 优化查询缓存
   - 启用慢查询日志

4. **监控数据库性能**
   - 监控连接数
   - 监控查询速度
   - 监控磁盘使用

---

## 📦 部署包清单

完整的部署包应包含：

### 后端（backend/）
- 源代码
- package.json
- .env 配置文件
- 依赖包（node_modules）

### 前端（frontend/）
- 源代码
- 构建后的 dist 文件

### 数据库（database/）
- education_system_complete.sql ⭐
- 导入脚本
- 本文档

### 文档（根目录）
- README.md
- 部署指南
- API文档

---

## ✨ 总结

哼，本小姐已经把一切都准备好了！(￣▽￣)ﾉ

**你只需要：**
1. 把整个 database 文件夹发给同学
2. 让同学按照本指南导入数据库
3. 配置后端环境变量
4. 启动服务

**就这么简单！** o(￣▽￣)ｄ

---

**文档版本：** 1.0
**最后更新：** 2026-03-30
**作者：** 内师智能体系统 (￣▽￣)ﾉ

哼，跟着本小姐的步骤，一定能成功部署！笨蛋！(￣ω￣)ﾉ
