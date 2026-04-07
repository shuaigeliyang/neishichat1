# 🎓 教育系统数据库 - 快速开始

> 作者：内师智能体系统 (￣▽￣)ﾉ
> 版本：v1.0
> 更新：2026-03-30

---

## 🚀 三步完成部署

### 步骤1：导入数据库

**Windows 用户：**
```bash
# 双击运行
import-database.bat

# 输入MySQL密码
# 等待完成
```

**Linux/Mac 用户：**
```bash
chmod +x import-database.sh
./import-database.sh
```

### 步骤2：配置后端

编辑 `backend/.env` 文件：
```env
DB_PASSWORD=你的MySQL密码  # 修改这里
```

启动后端：
```bash
cd backend
npm install
npm start
# 或使用 PM2
pm2 start src/app.js --name education-backend
```

### 步骤3：访问系统

打开浏览器访问：`http://47.108.233.194`

**测试账号：**
- 学号：S2201001
- 密码：123456

---

## 📋 数据库内容

**表单模板：** 13个可下载表单 ✨

**申请表（9个）：**
1. 学科竞赛参赛申请表
2. 转专业申请表
3. 奖学金申请表
4. 休学申请表
5. 复学申请表（新增）
6. 请假申请表（新增）
7. 贫困生认定申请表（新增）
8. 助学金申请表（新增）
9. 助学贷款申请表（新增）

**证明表（4个）：**
10. 成绩证明申请表（新增）
11. 在读证明申请表（新增）
12. 毕业证明申请表（新增）
13. 学位证明申请表（新增）

---

## 📖 详细文档

- **DATABASE_IMPORT_GUIDE.md** - 完整导入指南
- **../DEPLOYMENT_GUIDE.md** - 完整部署说明

---

## ⚠️ 注意事项

1. **MySQL版本：** 需要 5.7+ 或 8.0+
2. **字符集：** 必须使用 utf8mb4
3. **密码安全：** 修改默认密码
4. **权限配置：** 确保 .env 文件不被提交

---

## 🆘 遇到问题？

### 问题1：Access denied
**解决：** 检查MySQL密码是否正确

### 问题2：连接失败
**解决：** 检查MySQL服务是否启动

### 问题3：表单下载404
**解决：** 参考 `../FORM_DOWNLOAD_FIX_GUIDE.md`

### 问题4：需要帮助
查看 **DATABASE_IMPORT_GUIDE.md** 或 **../DEPLOYMENT_GUIDE.md**

---

## ✅ 验证导入

导入成功后，运行：

```sql
USE education_system;
SHOW TABLES;
SELECT COUNT(*) FROM form_templates;  -- 应该返回 13
```

---

**祝你部署顺利！** o(￣▽￣)ｄ

---

**最后更新：** 2026-03-30
**作者：** 内师智能体系统 (￣▽￣)ﾉ
