/**
 * Excel导出前端工具 - 专业版
 * 作者：内师智能体系统 (￣▽￣)ﾉ
 * 功能：提供简洁易用的Excel导出功能
 *
 * 使用方法：
 * 1. 在HTML中引入此文件
 * 2. 调用 ExcelExporter.export() 方法
 */

class ExcelExporter {
    /**
     * Excel导出工具类
     */
    constructor() {
        // API配置 - 根据你的实际部署修改
        this.apiBaseUrl = 'http://localhost:5000/api';  // 本地开发
        // this.apiBaseUrl = 'https://your-domain.com/api';  // 生产环境

        // 请求配置
        this.timeout = 60000;  // 超时时间：60秒
        this.maxRetries = 3;   // 最大重试次数
    }

    /**
     * 导出Excel - 主要方法！
     *
     * @param {Array} data - 要导出的数据（数组格式）
     * @param {Object} options - 配置选项
     * @returns {Promise<string>} 返回下载链接
     *
     * @example
     * const exporter = new ExcelExporter();
     * const data = [
     *     { id: 1, name: '张三', age: 20 },
     *     { id: 2, name: '李四', age: 21 }
     * ];
     * const options = {
     *     filename: '学生信息',
     *     sheetName: '学生列表',
     *     headers: {
     *         id: '学号',
     *         name: '姓名',
     *         age: '年龄'
     *     }
     * };
     * exporter.export(data, options)
     *     .then(url => console.log('下载链接:', url))
     *     .catch(err => console.error('导出失败:', err));
     */
    async export(data, options = {}) {
        // 参数验证
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('数据不能为空，笨蛋！(￣へ￣)');
        }

        // 默认配置
        const defaultOptions = {
            filename: `export_${this._getCurrentTimestamp()}`,
            sheetName: 'Sheet1',
            headers: {},
            autoColumnWidth: true,
            showSuccessMessage: true,
            showErrorMessage: true
        };

        const config = { ...defaultOptions, ...options };

        try {
            // 显示加载提示
            this._showLoading('正在生成Excel文件...');

            // 发送请求
            const response = await this._request('/export/excel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: data,
                    filename: config.filename,
                    sheet_name: config.sheetName,
                    headers: config.headers,
                    auto_column_width: config.autoColumnWidth
                })
            });

            // 处理响应
            if (response.success) {
                const downloadUrl = `${this.apiBaseUrl}${response.data.download_url}`;

                // 自动下载
                this._downloadFile(downloadUrl, response.data.filename);

                // 显示成功消息
                if (config.showSuccessMessage) {
                    this._showSuccess(`✅ Excel文件生成成功！共导出 ${response.data.record_count} 条记录`);
                }

                return downloadUrl;
            } else {
                throw new Error(response.message || '导出失败');
            }

        } catch (error) {
            // 显示错误消息
            if (config.showErrorMessage) {
                this._showError(`❌ 导出失败：${error.message}`);
            }
            throw error;
        } finally {
            // 隐藏加载提示
            this._hideLoading();
        }
    }

    /**
     * 多工作表导出
     *
     * @param {Object} dataDict - 多个工作表的数据对象
     * @param {Object} options - 配置选项
     * @returns {Promise<string>}
     *
     * @example
     * const dataDict = {
     *     '学生信息': [{ id: 1, name: '张三' }],
     *     '成绩信息': [{ id: 1, course: '数学', score: 90 }]
     * };
     * exporter.exportMultipleSheets(dataDict, { filename: '学生数据' });
     */
    async exportMultipleSheets(dataDict, options = {}) {
        if (!dataDict || typeof dataDict !== 'object') {
            throw new Error('数据格式错误，需要提供对象格式的工作表数据');
        }

        const defaultOptions = {
            filename: `multi_export_${this._getCurrentTimestamp()}`,
            headersDict: {},
            showSuccessMessage: true,
            showErrorMessage: true
        };

        const config = { ...defaultOptions, ...options };

        try {
            this._showLoading('正在生成多工作表Excel文件...');

            const response = await this._request('/export/multi-sheet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data_dict: dataDict,
                    filename: config.filename,
                    headers_dict: config.headersDict
                })
            });

            if (response.success) {
                const downloadUrl = `${this.apiBaseUrl}${response.data.download_url}`;
                this._downloadFile(downloadUrl, response.data.filename);

                if (config.showSuccessMessage) {
                    this._showSuccess(`✅ 多工作表Excel文件生成成功！共 ${response.data.sheet_count} 个工作表`);
                }

                return downloadUrl;
            } else {
                throw new Error(response.message || '导出失败');
            }

        } catch (error) {
            if (config.showErrorMessage) {
                this._showError(`❌ 导出失败：${error.message}`);
            }
            throw error;
        } finally {
            this._hideLoading();
        }
    }

    /**
     * 预览导出数据
     *
     * @param {Array} data - 要预览的数据
     * @param {Object} headers - 表头映射
     * @returns {Promise<Object>}
     */
    async preview(data, headers = {}) {
        try {
            const response = await this._request('/export/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: data,
                    headers: headers
                })
            });

            return response;

        } catch (error) {
            console.error('预览失败:', error);
            throw error;
        }
    }

    /**
     * 检查服务健康状态
     *
     * @returns {Promise<Object>}
     */
    async checkHealth() {
        try {
            const response = await this._request('/health', {
                method: 'GET'
            });
            return response;
        } catch (error) {
            console.error('健康检查失败:', error);
            throw error;
        }
    }

    /**
     * 发送HTTP请求（内部方法）
     */
    async _request(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;

        // 添加超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('请求超时，请稍后重试');
            }

            throw error;
        }
    }

    /**
     * 下载文件（内部方法）
     */
    _downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 显示加载提示（内部方法）
     */
    _showLoading(message = '加载中...') {
        // 移除已存在的加载提示
        this._hideLoading();

        // 创建加载提示元素
        const loader = document.createElement('div');
        loader.id = 'excel-exporter-loader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: 'Microsoft YaHei', sans-serif;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px 50px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4472C4;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        `;

        const text = document.createElement('div');
        text.textContent = message;
        text.style.cssText = `
            color: #333;
            font-size: 16px;
            margin-top: 10px;
        `;

        content.appendChild(spinner);
        content.appendChild(text);
        loader.appendChild(content);
        document.body.appendChild(loader);

        // 添加旋转动画
        if (!document.getElementById('excel-exporter-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'excel-exporter-spinner-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * 隐藏加载提示（内部方法）
     */
    _hideLoading() {
        const loader = document.getElementById('excel-exporter-loader');
        if (loader) {
            loader.remove();
        }
    }

    /**
     * 显示成功消息（内部方法）
     */
    _showSuccess(message) {
        this._showMessage(message, 'success');
    }

    /**
     * 显示错误消息（内部方法）
     */
    _showError(message) {
        this._showMessage(message, 'error');
    }

    /**
     * 显示消息（内部方法）
     */
    _showMessage(message, type = 'info') {
        // 移除已存在的消息
        const existingMessage = document.getElementById('excel-exporter-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageBox = document.createElement('div');
        messageBox.id = 'excel-exporter-message';

        const bgColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3';

        messageBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 25px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-family: 'Microsoft YaHei', sans-serif;
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
        `;

        messageBox.textContent = message;
        document.body.appendChild(messageBox);

        // 添加动画
        if (!document.getElementById('excel-exporter-message-style')) {
            const style = document.createElement('style');
            style.id = 'excel-exporter-message-style';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // 3秒后自动消失
        setTimeout(() => {
            messageBox.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => messageBox.remove(), 300);
        }, 3000);
    }

    /**
     * 获取当前时间戳（内部方法）
     */
    _getCurrentTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    }
}

// 全局实例（方便使用）
const excelExporter = new ExcelExporter();

// 导出到全局
if (typeof window !== 'undefined') {
    window.ExcelExporter = ExcelExporter;
    window.excelExporter = excelExporter;
}

// Node.js环境导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelExporter;
}
