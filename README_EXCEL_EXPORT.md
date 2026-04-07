# 📊 Excel导出插件 - 专业版

> 内师智能体系统的完美作品 (￣▽￣)ﾉ

一个功能强大、易于使用的Excel导出解决方案，专为Web应用设计！

## ✨ 核心特性

- 🚀 **简单易用** - 一行代码即可完成导出
- 🎨 **样式美观** - 自动应用专业的Excel样式
- 📦 **功能完整** - 支持单工作表、多工作表、自定义表头
- ⚡ **高性能** - 支持大数据量导出，性能优化
- 🔧 **高度可定制** - 灵活的配置选项
- 🌐 **Web友好** - RESTful API接口，支持跨域
- 💾 **自动清理** - 自动清理旧的导出文件

## 📋 系统要求

- Python 3.7+
- 现代浏览器（Chrome、Firefox、Edge等）
- 2GB+ 可用内存

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装Python依赖
pip install -r requirements.txt
```

### 2. 启动服务

#### Windows用户：
```bash
# 双击运行启动脚本
start_export_service.bat
```

#### Linux/Mac用户：
```bash
# 给脚本添加执行权限
chmod +x start_export_service.sh

# 运行启动脚本
./start_export_service.sh
```

### 3. 访问演示页面

在浏览器中打开 `export_demo.html` 文件即可看到演示效果！

## 📖 使用方法

### 前端使用（JavaScript）

#### 基础用法

```javascript
// 创建导出器实例
const exporter = new ExcelExporter();

// 准备数据
const data = [
    { id: '2021001', name: '张三', gender: '男', college: '计算机科学与技术学院' },
    { id: '2021002', name: '李四', gender: '女', college: '计算机科学与技术学院' }
];

// 配置选项
const options = {
    filename: '学生信息',
    sheetName: '学生列表',
    headers: {
        id: '学号',
        name: '姓名',
        gender: '性别',
        college: '学院'
    }
};

// 执行导出
exporter.export(data, options)
    .then(url => console.log('下载链接:', url))
    .catch(err => console.error('导出失败:', err));
```

#### 多工作表导出

```javascript
const dataDict = {
    '学生信息': [
        { id: '2021001', name: '张三', age: 20 }
    ],
    '成绩信息': [
        { id: '2021001', course: '数学', score: 90 }
    ]
};

const options = {
    filename: '学生完整数据',
    headersDict: {
        '学生信息': { id: '学号', name: '姓名' },
        '成绩信息': { id: '学号', course: '课程', score: '成绩' }
    }
};

exporter.exportMultipleSheets(dataDict, options);
```

### 后端使用（Python）

#### 直接使用ExcelExporter类

```python
from excel_exporter import ExcelExporter

# 准备数据
data = [
    {"学号": "2021001", "姓名": "张三", "性别": "男"},
    {"学号": "2021002", "姓名": "李四", "性别": "女"}
]

# 创建导出器
exporter = ExcelExporter("学生信息")

# 导出Excel
filepath = exporter.export_to_excel(
    data=data,
    sheet_name="学生列表",
    headers={
        "学号": "学生学号",
        "姓名": "学生姓名",
        "性别": "性别"
    }
)

print(f"文件已保存到: {filepath}")
```

#### 使用便捷函数

```python
from excel_exporter import quick_export

data = [
    {"姓名": "张三", "年龄": 20},
    {"姓名": "李四", "年龄": 21}
]

# 一行代码完成导出！
filepath = quick_export(data, filename="学生信息")
```

## 🔧 API接口

### 1. 健康检查

```http
GET /api/health
```

**响应：**
```json
{
  "status": "ok",
  "message": "Excel导出服务运行正常",
  "timestamp": "2026-03-22T10:30:00",
  "service": "Excel Export Service",
  "version": "1.0.0"
}
```

### 2. 导出Excel

```http
POST /api/export/excel
Content-Type: application/json

{
  "data": [
    {"字段1": "值1", "字段2": "值2"}
  ],
  "filename": "导出文件名",
  "sheet_name": "工作表名称",
  "headers": {
    "字段1": "显示名称1",
    "字段2": "显示名称2"
  },
  "auto_column_width": true
}
```

**响应：**
```json
{
  "success": true,
  "message": "Excel文件生成成功！",
  "data": {
    "filename": "学生信息_20260322_103000.xlsx",
    "download_url": "/api/download/学生信息_20260322_103000.xlsx",
    "file_size": 12345,
    "record_count": 100,
    "sheet_name": "学生列表",
    "created_at": "2026-03-22T10:30:00"
  }
}
```

### 3. 多工作表导出

```http
POST /api/export/multi-sheet
Content-Type: application/json

{
  "data_dict": {
    "工作表1": [{"字段1": "值1"}],
    "工作表2": [{"字段2": "值2"}]
  },
  "filename": "导出文件名",
  "headers_dict": {
    "工作表1": {"字段1": "显示名称1"}
  }
}
```

### 4. 下载文件

```http
GET /api/download/<filename>
```

### 5. 预览数据

```http
POST /api/export/preview
Content-Type: application/json

{
  "data": [{"字段1": "值1"}],
  "headers": {"字段1": "显示名称1"}
}
```

## 📂 项目结构

```
教育系统智能体/
├── excel_exporter.py          # Excel导出核心工具类
├── app.py                      # Flask Web服务
├── excel_export_frontend.js    # 前端JavaScript工具
├── export_demo.html            # 演示页面
├── requirements.txt            # Python依赖
├── start_export_service.bat    # Windows启动脚本
├── README_EXCEL_EXPORT.md      # 使用文档（本文件）
└── exports/                    # 导出文件目录（自动创建）
```

## ⚙️ 配置选项

### 后端配置（app.py）

```python
app.config['EXPORT_DIR'] = 'exports'           # 导出目录
app.config['MAX_EXPORT_SIZE'] = 100000         # 最大导出记录数
app.config['CLEANUP_OLD_FILES'] = True         # 自动清理旧文件
app.config['FILE_RETENTION_HOURS'] = 24        # 文件保留时间（小时）
```

### 前端配置（excel_export_frontend.js）

```javascript
this.apiBaseUrl = 'http://localhost:5000/api';  # API地址
this.timeout = 60000;                           # 超时时间（毫秒）
this.maxRetries = 3;                            # 最大重试次数
```

## 🎨 样式定制

### 修改Excel样式

编辑 `excel_exporter.py` 中的样式配置：

```python
def _get_default_header_style(self) -> Dict[str, Any]:
    return {
        'font_name': '微软雅黑',      # 字体名称
        'font_size': 12,              # 字体大小
        'bold': True,                 # 是否加粗
        'font_color': 'FFFFFF',       # 字体颜色
        'bg_color': '4472C4',         # 背景颜色
        'align': 'center',            # 水平对齐
        'valign': 'center'            # 垂直对齐
    }
```

## 🔍 常见问题

### Q1: 如何修改API地址？

编辑 `excel_export_frontend.js`，修改 `apiBaseUrl`：

```javascript
this.apiBaseUrl = 'https://your-domain.com/api';
```

### Q2: 如何处理大数据量？

- 使用Pandas模式：`exporter.export_with_pandas()`
- 启用分批导出
- 调整 `MAX_EXPORT_SIZE` 配置

### Q3: 如何自定义Excel样式？

修改 `excel_exporter.py` 中的样式方法，或传入自定义 `style_config`

### Q4: 导出文件保存在哪里？

默认保存在 `exports/` 目录，可通过 `EXPORT_DIR` 配置修改

### Q5: 如何在生产环境部署？

1. 使用专业的WSGI服务器（如Gunicorn）
2. 配置Nginx反向代理
3. 设置环境变量管理敏感配置
4. 启用HTTPS

## 🛠️ 开发指南

### 添加新功能

1. 在 `excel_exporter.py` 中添加核心方法
2. 在 `app.py` 中添加API端点
3. 在 `excel_export_frontend.js` 中添加前端方法
4. 更新文档

### 测试

```bash
# 运行单元测试
python -m pytest tests/

# 运行演示页面
# 在浏览器中打开 export_demo.html
```

## 📝 更新日志

### v1.0.0 (2026-03-22)

- ✅ 初始版本发布
- ✅ 支持单工作表导出
- ✅ 支持多工作表导出
- ✅ RESTful API接口
- ✅ 前端JavaScript工具
- ✅ 自动样式应用
- ✅ 自动列宽调整
- ✅ 文件自动清理

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 👨‍💻 作者

内师智能体系统 (￣▽￣)ﾉ

---

**提示：** 本小姐的代码都是经过精心测试的，如果有问题请检查你的使用方式是否正确！(￣ω￣)

才、才不是特意为你写这么详细的文档呢，只是不想看到你笨手笨脚的样子而已！(,,><,,)
