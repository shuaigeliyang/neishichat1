/**
 * 文档处理管道服务（完整版）
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：处理文档的完整流程（上传→提取→分块→向量化→索引）
 *
 * 完整流程：
 * 1. 提取文档内容（.docx → student_handbook_full.json）
 * 2. 智能分块
 * 3. 向量化
 * 4. 添加到统一索引
 * 5. 更新文档注册表
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const DocumentRegistry = require('./documentRegistry');
const UnifiedIndexManager = require('./unifiedIndexManager');

class DocumentPipeline {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.embeddingMode = options.embeddingMode || process.env.EMBEDDING_MODE || 'api';

        // 使用相对路径
        this.basePath = path.resolve(__dirname, '../..');

        // 初始化服务
        this.registry = new DocumentRegistry();
        this.indexManager = new UnifiedIndexManager(apiKey, {
            embeddingMode: this.embeddingMode
        });
    }

    /**
     * 初始化管道
     */
    async initialize() {
        await this.registry.initialize();
        await this.indexManager.initialize();
        console.log('✓ 文档处理管道初始化完成\n');
    }

    /**
     * 处理新文档（完整流程）
     */
    async processDocument(documentId, docName) {
        console.log(`\n========== 开始处理文档: ${docName} ==========`);

        try {
            // 1. 更新状态为处理中
            await this.registry.updateDocumentStatus(documentId, 'processing');

            // 2. 定义路径（使用相对路径）
            const sourceDir = path.join(this.basePath, '相关文档');
            const targetDir = path.join(this.basePath, '文档提取', docName);
            const sourceFile = path.join(sourceDir, `${docName}.docx`);

            // 3. 确保目标目录存在
            await fs.mkdir(targetDir, { recursive: true });

            // 4. 复制文件到文档提取目录
            const targetFile = path.join(targetDir, `${docName}.docx`);
            await fs.copyFile(sourceFile, targetFile);
            console.log(`✓ 文件已复制到: ${targetFile}`);

            // 5. 提取文档内容
            console.log('\n--- 步骤1: 提取文档内容 ---');
            await this.extractDocument(targetFile, targetDir);

            // 6. 读取提取的内容
            console.log('\n--- 步骤2: 读取提取内容 ---');
            const contentPath = path.join(targetDir, 'student_handbook_full.json');
            const contentData = await this.readExtractedContent(contentPath);

            // 7. 智能分块
            console.log('\n--- 步骤3: 智能分块 ---');
            const chunks = await this.chunkContent(contentData, targetDir);
            console.log(`✓ 生成了 ${chunks.length} 个 chunks`);

            // 8. 向量化并添加到索引
            console.log('\n--- 步骤4: 向量化并建立索引 ---');
            await this.indexManager.initialize(); // 重新加载索引
            const indexedCount = await this.indexManager.addDocument(
                documentId,
                docName,
                chunks
            );
            console.log(`✓ 已添加 ${indexedCount} 个 chunks 到统一索引`);

            // 9. 更新状态为已索引
            const statistics = {
                totalPages: contentData.total_pages || contentData.pages?.length || 0,
                totalChunks: chunks.length,
                indexedChunks: indexedCount
            };
            await this.registry.updateDocumentStatus(documentId, 'indexed', statistics);

            console.log(`\n========== 文档处理完成: ${docName} ==========`);
            console.log(`  - 总页数: ${statistics.totalPages}`);
            console.log(`  - 总chunks: ${statistics.totalChunks}`);
            console.log(`  - 已索引: ${statistics.indexedChunks}`);

            return {
                success: true,
                documentId: documentId,
                docName: docName,
                statistics: statistics
            };

        } catch (error) {
            console.error(`✗ 文档处理失败: ${error.message}`);
            await this.registry.updateDocumentStatus(documentId, 'error');
            throw error;
        }
    }

    /**
     * 提取文档内容
     */
    async extractDocument(docxFile, targetDir) {
        console.log(`  提取文件: ${docxFile}`);

        try {
            // 使用Python脚本提取word文档
            const pythonScript = path.join(this.basePath, 'extract_student_handbook_word.py');
            const command = `python "${pythonScript}" "${docxFile}" "${targetDir}"`;

            console.log(`  执行命令: ${command}`);
            const { stdout, stderr } = await execAsync(command);

            if (stdout) console.log(`  ${stdout}`);
            if (stderr) console.error(`  ${stderr}`);

            // 检查输出文件是否生成
            const outputFile = path.join(targetDir, 'student_handbook_full.json');
            try {
                await fs.access(outputFile);
                console.log(`  ✓ 提取成功: ${outputFile}`);
            } catch (err) {
                throw new Error('提取失败，未生成输出文件');
            }

        } catch (error) {
            console.error(`  ✗ 提取失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 读取提取的内容
     */
    async readExtractedContent(jsonPath) {
        try {
            const data = await fs.readFile(jsonPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`读取提取内容失败: ${error.message}`);
        }
    }

    /**
     * 对内容进行分块
     */
    async chunkContent(contentData, targetDir) {
        const chunks = [];
        let chunkId = 0;
        let currentChapter = null;

        // 遍历每一页
        for (const page of contentData.pages || []) {
            const lines = page.text.split('\n')
                .map(l => l.trim())
                .filter(l => l && !this.isNoiseLine(l));

            let currentParagraph = [];

            for (const line of lines) {
                // 检测章节标题
                if (this.isChapterTitle(line)) {
                    // 保存之前的段落
                    if (currentParagraph.length > 0) {
                        chunks.push({
                            id: ++chunkId,
                            text: currentParagraph.join('\n'),
                            page_num: page.page_num,
                            chapter_title: currentChapter || '未知章节',
                            section_title: '',
                            chunk_type: 'content'
                        });
                        currentParagraph = [];
                    }

                    const cleanedLine = this.cleanText(line);
                    currentChapter = cleanedLine;

                    // 章节标题作为独立chunk
                    chunks.push({
                        id: ++chunkId,
                        text: cleanedLine,
                        page_num: page.page_num,
                        chapter_title: cleanedLine,
                        section_title: '',
                        chunk_type: 'chapter_title'
                    });
                } else {
                    currentParagraph.push(line);

                    // 当段落累积到一定长度时创建chunk
                    const currentText = currentParagraph.join('\n');
                    if (currentText.length > 500) {
                        chunks.push({
                            id: ++chunkId,
                            text: currentText,
                            page_num: page.page_num,
                            chapter_title: currentChapter || '未知章节',
                            section_title: '',
                            chunk_type: 'content'
                        });
                        currentParagraph = [];
                    }
                }
            }

            // 保存最后的段落
            if (currentParagraph.length > 0) {
                chunks.push({
                    id: ++chunkId,
                    text: currentParagraph.join('\n'),
                    page_num: page.page_num,
                    chapter_title: currentChapter || '未知章节',
                    section_title: '',
                    chunk_type: 'content'
                });
            }
        }

        // 保存chunks到文件（用于后续处理）
        const chunksPath = path.join(targetDir, 'document_chunks.json');
        await fs.writeFile(chunksPath, JSON.stringify(chunks, null, 2), 'utf-8');
        console.log(`  ✓ Chunks已保存: ${chunksPath}`);

        return chunks;
    }

    /**
     * 检测是否是噪音行
     */
    isNoiseLine(line) {
        if (/^[，,。、；;：:！!？?"""''（）()\s\-—…·]+$/.test(line)) return true;
        if (/^—\s*\d+\s*—$/.test(line)) return true;
        return false;
    }

    /**
     * 检测是否是章节标题
     */
    isChapterTitle(line) {
        return /^第[一二三四五六七八九十\d]+章|^第[一二三四五六七八九十\d]+节|^[一二三四五六七八九十]+、/.test(line);
    }

    /**
     * 清理文本
     */
    cleanText(text) {
        return text.trim()
            .replace(/\s+/g, ' ')
            .substring(0, 200);
    }

    /**
     * 获取文档处理状态
     */
    getDocumentStatus(documentId) {
        const doc = this.registry.getDocumentById(documentId);
        if (!doc) return null;

        return {
            documentId: doc.documentId,
            name: doc.name,
            status: doc.status,
            statistics: doc.statistics,
            updatedAt: doc.updatedAt
        };
    }
}

module.exports = DocumentPipeline;
