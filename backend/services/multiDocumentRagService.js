/**
 * 多文档RAG服务 - 全新重构版
 * 参考Coze多知识库设计
 * 设计师：哈雷酱 (￣▽￣)／
 *
 * 核心设计：
 * 1. 自包含索引：chunks自带embedding，无需外部缓存
 * 2. 按文档分组：支持文档级过滤检索
 * 3. 混合搜索：向量检索 + BM25关键词检索融合
 * 4. 严格基于检索内容回答，禁止编造
 */

// ✨ 强制加载.env文件，确保使用正确的配置
require('dotenv').config();

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const HybridSearch = require('./hybridSearch');
const PythonEmbeddingClient = require('../pythonEmbeddingClient');

class MultiDocumentRAGService {
    constructor(apiKey, options = {}) {
        // apiKey参数保留（向后兼容），但不再使用
        this.options = {
            // 索引文件路径（自包含embedding）
            indexPath: options.indexPath || path.join(__dirname, '../../文档库/indexes/unified_index.json'),
            // ✨ 切换到智谱AI（GLM-4-Flash）！Minimax服务不可用！
            chatUrl: process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4',
            chatModel: process.env.ZHIPU_MODEL || 'glm-4-flash',
            chatApiKey: process.env.ZHIPU_API_KEY,
            // ✨ 优化检索配置：增加检索数量，降低阈值
            defaultTopK: 15,           // 增加到15条（确保内容完整）
            defaultMinScore: 0.3,       // 降低到0.3（包含更多相关内容）
        };

        // 索引数据（内存）
        this.indexData = null;
        this.initialized = false;
        this.lastIndexMtime = null;  // ✨ 记录上次加载索引的时间戳，用于检测更新

        // 混合搜索器
        this.hybridSearch = new HybridSearch({
            vectorWeight: 0.6,  // 向量权重60%
            bm25Weight: 0.4    // BM25权重40%
        });

        // 本地Python Embedding客户端（本小姐的终极武器！）
        this.pythonEmbeddingClient = new PythonEmbeddingClient();

        // 请求队列控制（本小姐的优化！）
        this.chatRequestQueue = [];
        this.isProcessingChat = false;
        this.chatRequestInterval = 1000;  // 每1秒最多1个chat请求
        this.maxChatRetries = 3;

        // 答案缓存（避免重复调用API）
        this.answerCache = new Map();
        this.cacheMaxAge = 300000;  // 缓存5分钟
        this.startCacheCleanup();
    }

    /**
     * 初始化 - 加载索引到内存
     */
    async initialize() {
        if (this.initialized) return;

        console.log('📂 加载统一索引...');
        await this.loadIndex();
        this.initialized = true;
        console.log('✓ 多文档RAG服务初始化完成\n');
    }

    /**
     * 加载索引（支持热更新）
     */
    async loadIndex() {
        try {
            const data = await fs.readFile(this.options.indexPath, 'utf-8');
            this.indexData = JSON.parse(data);

            // 确保结构完整
            if (!this.indexData.documents) this.indexData.documents = [];
            if (!this.indexData.chunks) this.indexData.chunks = [];

            // 统计有embedding的chunks
            const chunksWithEmbedding = this.indexData.chunks.filter(c => c.embedding).length;

            console.log(`✓ 索引加载成功`);
            console.log(`  - 文档数: ${this.indexData.documents.length}`);
            console.log(`  - 总chunks: ${this.indexData.chunks.length}`);
            console.log(`  - 有embedding的chunks: ${chunksWithEmbedding}`);

            // 显示每个文档的统计
            for (const doc of this.indexData.documents) {
                const docChunks = this.indexData.chunks.filter(c => c.documentId === doc.documentId);
                const docWithEmb = docChunks.filter(c => c.embedding).length;
                console.log(`    📄 ${doc.displayName || doc.name}: ${docWithEmb}/${docChunks.length} chunks`);
            }

        } catch (error) {
            console.error('✗ 索引加载失败:', error.message);
            throw error;
        }
    }

    /**
     * 检查索引文件是否更新（通过时间戳）
     * ✨ 修复：后台系统更新索引后，前台系统能感知到变化
     */
    async checkIndexUpdate() {
        try {
            const stats = await fs.stat(this.options.indexPath);
            const fileMtime = stats.mtime.getTime();

            // 如果文件更新时间比记录的更新时间更新，则重新加载
            if (this.lastIndexMtime && fileMtime > this.lastIndexMtime) {
                console.log(`🔄 检测到索引文件已更新，重新加载...`);
                await this.loadIndex();
            }

            // 更新记录的时间戳
            this.lastIndexMtime = fileMtime;
        } catch (error) {
            // 忽略错误，不影响正常查询
        }
    }

    /**
     * 生成问题向量（使用本地Python服务）
     */
    async generateEmbedding(text) {
        // 使用本地Python embedding服务（完全免费，无限流！）
        return await this.pythonEmbeddingClient.getEmbedding(text);
    }

    /**
     * 计算余弦相似度
     */
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
    }

    /**
     * 检索相关chunks - 混合搜索（向量 + BM25）
     */
    async search(queryEmbedding, options = {}) {
        const { topK = 5, minScore = 0.2, documentIds = null } = options;

        // 1. 按文档过滤（如果有指定）
        let chunks = this.indexData.chunks;
        if (documentIds && documentIds.length > 0) {
            chunks = chunks.filter(c => documentIds.includes(c.documentId));
            console.log(`🎯 文档过滤: ${documentIds.length}个文档, ${chunks.length}个chunks`);
        }

        const query = options.question || '';

        // 2. 向量检索（使用余弦相似度）
        console.log('🔍 向量检索...');
        const vectorResults = chunks
            .filter(c => c.embedding)
            .map(c => ({ ...c, score: this.cosineSimilarity(queryEmbedding, c.embedding) }))
            .filter(r => r.score >= 0.1)  // 先低阈值，后面融合会过滤
            .sort((a, b) => b.score - a.score)
            .slice(0, 30);  // 取前30个，后面融合

        console.log(`   向量检索: ${vectorResults.length} 个候选`);

        // 3. BM25关键词检索
        console.log('🔍 BM25检索...');
        this.hybridSearch.preprocess(chunks);
        const bm25Results = this.hybridSearch.searchBM25(query, chunks, 30);

        console.log(`   BM25检索: ${bm25Results.length} 个候选`);

        // 4. 融合两种检索结果
        console.log('🔄 混合融合...');
        const fusedResults = this.hybridSearch.weightedFusion(
            vectorResults,
            bm25Results,
            0.6  // 向量权重60%
        );

        // 5. 过滤并返回TopK
        const results = fusedResults
            .filter(r => r.fusedScore >= minScore)
            .slice(0, topK);

        console.log(`✓ 混合检索到 ${results.length} 个相关chunks`);

        // 打印详细分数
        if (results.length > 0) {
            console.log('   分数详情（向量/BM25/融合）:');
            results.slice(0, 3).forEach((r, i) => {
                console.log(`   [${i + 1}] ${r.documentName} p${r.page_num}: ${r.vectorScoreNorm?.toFixed(2) || '?'}/${r.bm25ScoreNorm?.toFixed(2) || '?'}/${r.fusedScore?.toFixed(2) || '?'}`);
            });
        }

        return results;
    }

    /**
     * Chat请求队列处理（本小姐的优雅解决方案！）
     */
    async enqueueChatRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.chatRequestQueue.push({
                fn: requestFn,
                resolve,
                reject,
                retries: 0
            });

            if (!this.isProcessingChat) {
                this.processChatQueue();
            }
        });
    }

    async processChatQueue() {
        if (this.chatRequestQueue.length === 0) {
            this.isProcessingChat = false;
            return;
        }

        this.isProcessingChat = true;
        const task = this.chatRequestQueue.shift();

        try {
            const result = await task.fn();
            task.resolve(result);
        } catch (error) {
            // 如果是429限流错误，重试
            if (error.response?.status === 429 && task.retries < this.maxChatRetries) {
                task.retries++;
                console.log(`⚠️ Chat API遇到限流，重试第${task.retries}次...`);

                // 指数退避
                const backoffTime = Math.pow(2, task.retries) * 1000;
                await this.sleep(backoffTime);

                // 重新加入队列
                this.chatRequestQueue.unshift(task);
            } else {
                task.reject(error);
            }
        }

        // 处理下一个请求，添加间隔避免限流
        setTimeout(() => this.processChatQueue(), this.chatRequestInterval);
    }

    /**
     * 延时函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 生成答案
     * ✨ 严格基于检索到的文档内容回答，不允许编造
     */
    async generateAnswer(question, context) {
        // 检查缓存（本小姐的优化！）
        const cacheKey = this.hashText(question + context.substring(0, 200));
        const cached = this.answerCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
            console.log('✓ 使用缓存的答案');
            return cached.answer;
        }

        // 使用队列包装请求（避免并发触发限流！）
        return this.enqueueChatRequest(async () => {
            const systemPrompt = `你是教育系统的智能助手，擅长基于文档内容进行智能总结和概括。

【智能总结模式 - 核心能力】
你的核心能力是对检索到的多个文档片段进行：
1. **智能概括**：提取关键信息，用简洁的语言总结要点
2. **结构化组织**：将相关内容归类，避免简单罗列
3. **用户友好**：用通俗易懂的语言回答，避免照搬原文
4. **准确标注**：明确说明每个信息点的来源（文档名称和页码）
5. **✨ 完整全面**：必须涵盖所有重要方面，不能遗漏关键信息

【✨ 必须包含的内容维度】
针对"挂科/成绩不合格"类问题，必须包含以下维度：
1. **补考规定**：补考机会、补考流程、补考成绩认定
2. **重修流程**：重修申请、重修方式、重修费用
3. **结业处理**：什么情况会结业、结业后的补救措施
4. **时间限制**：最长修业年限、毕业要求
5. **影响后果**：对毕业的影响、对学位的影响
6. **特殊规定**：不同课程类型的不同处理方式
7. **具体流程**：如何申请、去哪里申请、需要什么材料

【总结技巧 - 必须掌握】
1. **提取核心**：从每个文档片段中提取所有关键要点
2. **合并同类**：将多个文档中相似的内容合并说明
3. **逻辑组织**：按照"是什么→为什么→怎么办→后果"的逻辑组织答案
4. **简洁表达**：用1-2句话概括原文，而不是大段复制
5. **保留来源**：在每个要点后标注出处（如：来源《学生手册》第21页）

【示例对比】
❌ 错误做法（简单罗列，遗漏关键信息）：
"关于课程成绩不合格的处理：可以申请补考一次，补考不合格则必须重修。重修可以继续申请直到合格。来源：第21页"

✅ 正确做法（智能概括，完整全面）：
"关于课程成绩不合格的处理，根据《2025年本科学生手册》为您总结如下：

**1. 补考流程（第21页）**
- 补考机会：仅一次机会，补考通过后成绩记为60分，注明"补考"字样
- 补考对象：普通课程考核不合格者（通识选修课和实践教学环节除外）

**2. 重修规定（第21页）**
- 重修条件：补考仍未通过，必须重修
- 重修方式：可申请免听课程，经老师同意后直接参加考核
- 重修次数：可继续申请重修，直到合格

**3. 结业处理（第59页）**
- 结业条件：超过最长修业年限仍未达到毕业要求者，作永久结业处理
- 补救措施：结业生可在规定时间内申请返校重修，通过后可换发毕业证书

**4. 课程类型差异（第21页）**
- 普通课程：补考一次 → 不合格则重修
- 通识选修课：不安排补考，直接重选或另选
- 实践教学环节：不安排补考，必须重修

**5. 影响说明（第62页）**
- 提前毕业：有重修课程记录者不能申请提前毕业
- 学位授予：重修课程会影响学位申请条件"

【关键概念区分 - 必须理解】
1. "免修"：因身体原因不能参加课程，申请免除学习（需要医院证明）
2. "补考"：课程考核不合格后的再次考试机会
3. "重修"：补考不合格后需要重新学习课程
4. 这三个是完全不同的概念，严禁混淆！

【严格的页码和内容匹配规则】
1. 每个文档片段都有明确的"页码：第X页"和内容主题
2. 第21页的主题是"课程免修、缓考"，包含"计算机等级证书认定学分"
3. 第25页的主题是"考勤纪律、考试纪律、旷课处分"
4. 第59页的主题是"重修流程、结业处理"
5. 严禁将第21页的"免修"内容说成是"补考重修"

【绝对禁止的幻觉】
1. 禁止编造不存在的"第十二条"关于补考的规定
2. 禁止说"第25页第十二条"（实际不存在）
3. 禁止将第21页的"免修"内容误称为"补考规定"
4. 禁止将"计算机等级证书认定"说成是"补考合格后的处理"

【必须遵守的规则】
1. 只能使用文档片段中明确标注的页码
2. 如果文档片段是第21页，就必须说"第21页"
3. 严禁编造、猜测或混淆页码
4. 严禁将文档A的内容错误地归因为文档B
5. 如果文档片段中没有相关信息，明确说明"根据提供的文档，没有找到相关内容"
6. **✨ 必须涵盖所有重要方面，不能遗漏关键信息**

【文档片段】
${context}

【用户问题】
${question}

【回答要求】
- 对文档内容进行智能概括和总结，不要简单罗列
- 提取关键信息，用简洁的语言表达
- 按照逻辑结构组织答案（是什么、为什么、怎么办、后果）
- 在每个要点后明确标注来源（文档名称和页码）
- 严格区分"免修"、"补考"、"重修"的概念
- **✨ 必须包含所有重要维度：补考、重修、结业、时间限制、影响后果等**
- 如果文档片段中没有相关信息，明确说明
- 不要编造任何文档片段中没有的内容
`;

            // ✨ 智谱AI使用OpenAI兼容格式 /chat/completions
            const response = await axios.post(
                `${this.options.chatUrl}/chat/completions`,
                {
                    model: this.options.chatModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: question }
                    ],
                    temperature: 0.7,
                    max_tokens: 4096
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.options.chatApiKey}`
                    },
                    timeout: 60000
                }
            );

            // ✨ 提取answer（OpenAI格式返回 choices[0].message.content）
            let answer = '';
            if (response.data?.choices?.[0]?.message?.content) {
                answer = response.data.choices[0].message.content;
            } else if (response.data?.choices?.[0]?.text) {
                answer = response.data.choices[0].text;
            } else {
                answer = JSON.stringify(response.data) || '';
            }

            // 缓存答案
            this.answerCache.set(cacheKey, {
                answer,
                timestamp: Date.now()
            });

            return answer;
        });
    }

    /**
     * 智能问答
     * ✨ 修复：每次查询前检查索引文件是否更新
     */
    async ask(question, options = {}) {
        if (!this.initialized) await this.initialize();

        // ✨ 检查索引文件是否更新（通过时间戳）
        await this.checkIndexUpdate();

        const { topK = 5, minScore = 0.2, documentIds = null } = options;

        console.log(`\n========== 问题：${question} ==========`);

        // 1. 生成问题向量
        console.log('🔄 生成问题向量...');
        const questionEmbedding = await this.generateEmbedding(question);

        // 2. 混合检索（向量 + BM25）
        const results = await this.search(questionEmbedding, { topK, minScore, documentIds, question });

        if (results.length === 0) {
            console.log('⚠️ 未检索到任何相关文档');
            return {
                answer: '抱歉，没有找到与您问题相关的内容。',
                sources: [],
                retrievedChunks: 0,
                confidence: 0
            };
        }

        // ✨ 3. 检查置信度 - 使用融合分数
        const highestScore = results[0]?.fusedScore || results[0]?.score || 0;
        console.log(`📊 最高融合分数: ${highestScore.toFixed(4)}`);

        // 打印检索到的chunks内容（前3个）
        console.log('📄 检索到的内容（前3个）：');
        results.slice(0, 3).forEach((r, i) => {
            console.log(`  [${i + 1}] ${r.documentName} (第${r.page_num || r.page || '?'}页) 融合分:${(r.fusedScore || r.score).toFixed(3)}`);
            console.log(`      内容: ${(r.text || r.full_context || '').substring(0, 100)}...`);
        });

        // ✨ 智能模式切换：根据置信度选择最佳答案生成策略
        // - 高置信度 (>= 0.4)：LLM总结模式（智能概括，用户友好）
        // - 低置信度 (< 0.4)：拒绝回答（质量太差）
        //
        // 注意：移除了"直接答案模式"，所有有效检索都使用LLM智能总结

        // 4. 按文档分组（必须在模式选择之前定义）
        const grouped = {};
        for (const r of results) {
            if (!grouped[r.documentId]) {
                grouped[r.documentId] = { documentId: r.documentId, documentName: r.documentName, chunks: [] };
            }
            // 修复：使用 page_num 而不是 page，使用融合分数
            // ✨ 修复：返回完整text而不是截断的preview
            const fullText = r.text || r.full_context || '';
            grouped[r.documentId].chunks.push({
                chapter: r.chapter || r.chapter_title || '未知章节',
                page: r.page_num || r.page || 0,
                score: r.fusedScore || r.score,
                vectorScore: r.vectorScore,
                bm25Score: r.bm25Score,
                text: fullText,  // ✨ 返回完整文本
                preview: fullText.substring(0, 150)  // 仅用于列表预览
            });
        }

        // ✨ 简化的两层模式切换
        if (highestScore < 0.4) {
            // 模式1：低置信度 - 拒绝回答
            console.log(`⚠️ 置信度不足（${highestScore.toFixed(3)} < 0.4），拒绝生成答案`);
            return {
                answer: '抱歉，根据已索引的文档，没有找到与您问题相关的内容。',
                sources: [],
                retrievedChunks: results.length,
                confidence: highestScore,
                mode: 'rejected'
            };
        } else {
            // 模式2：LLM智能总结模式（包括高置信度和中等置信度）
            console.log(`🤖 使用LLM智能总结模式（置信度${highestScore.toFixed(3)} >= 0.4）`);

            // 构建上下文（包含更多信息，格式更清晰）
            const context = results.map((r, i) => {
                const pageNum = r.page_num || r.page || '?';
                const text = r.text || r.full_context || '';
                return `【文档片段 ${i + 1}】
文档名称：${r.documentName}
页码：第${pageNum}页
────────────────────────────────
${text}
────────────────────────────────`;
            }).join('\n\n');

            // 生成答案（LLM会进行总结和概括）
            console.log('🔄 LLM正在智能概括文档内容...');
            const answer = await this.generateAnswer(question, context);

            console.log('✅ LLM总结生成完成\n');

            return {
                answer,
                sources: Object.values(grouped),
                retrievedChunks: results.length,
                confidence: highestScore,
                mode: 'llm_summary'
            };
        }
    }

    /**
     * 格式化直接答案（避免LLM幻觉）
     * ✨ 显示全部结果，按置信度从高到低排序
     * ✨ 每条只显示关键摘要，一眼就能看完
     */
    formatDirectAnswer(results, question) {
        // ✨ 只保留置信度>50%的高质量结果
        const highQualityResults = results
            .filter(r => (r.fusedScore || r.score || 0) > 0.5)
            .sort((a, b) => (b.fusedScore || b.score || 0) - (a.fusedScore || a.score || 0)); // ✨ 按置信度降序

        console.log(`📊 质量过滤：${results.length}条 → ${highQualityResults.length}条（置信度>50%）`);

        if (highQualityResults.length === 0) {
            return `❌ 抱歉，没有找到相关内容

💡 建议尝试：
• 换个说法提问
• 检查是否有错别字
• 查阅纸质学生手册`;
        }

        // ✨ 显示全部结果（不再限制数量）
        let answer = `✅ 找到了${highQualityResults.length}条相关内容（按匹配度排序）\n\n`;

        // 按置信度排序展示
        for (let i = 0; i < highQualityResults.length; i++) {
            const r = highQualityResults[i];
            const pageNum = r.page_num || r.page || '?';
            const confidence = Math.round((r.fusedScore || r.score || 0) * 100);
            const text = (r.text || r.full_context || '').trim();
            // 提取关键句（前120字符，避免太长）
            const keySentence = text.length > 120 ? text.substring(0, 120) + '...' : text;

            answer += `📄 ${r.documentName} 第${pageNum}页 [匹配度${confidence}%]\n`;
            answer += `   ${keySentence}\n\n`;
        }

        // 底部提示
        const topConfidence = Math.round((highQualityResults[0]?.fusedScore || highQualityResults[0]?.score || 0) * 100);
        answer += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        answer += `💡 以上内容直接来源于学生手册\n`;
        answer += `💡 点击"查看完整内容"可验证准确性\n`;
        answer += `⭐ 最高匹配度：${topConfidence}%`;

        return answer;
    }

    /**
     * 获取统计
     */
    getStatistics() {
        return {
            totalDocuments: this.indexData?.documents?.length || 0,
            totalChunks: this.indexData?.chunks?.length || 0,
            chunksWithEmbedding: this.indexData?.chunks?.filter(c => c.embedding).length || 0,
            documents: this.indexData?.documents || []
        };
    }

    /**
     * 获取已索引文档列表
     */
    getIndexedDocuments() {
        return (this.indexData?.documents || []).map(doc => ({
            documentId: doc.documentId,
            name: doc.name,
            displayName: doc.displayName || doc.name,
            description: doc.description || '',
            status: doc.status || 'indexed'
        }));
    }

    /**
     * 文本哈希（用于缓存）
     */
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    /**
     * 启动缓存清理任务
     */
    startCacheCleanup() {
        // 每5分钟清理一次过期缓存
        setInterval(() => {
            const now = Date.now();
            let cleanedCount = 0;

            for (const [key, value] of this.answerCache.entries()) {
                if (now - value.timestamp > this.cacheMaxAge) {
                    this.answerCache.delete(key);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                console.log(`🧹 清理了${cleanedCount}条过期答案缓存`);
            }
        }, 300000); // 5分钟
    }

    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            answerCache: this.answerCache.size,
            chatRequestQueue: this.chatRequestQueue.length
        };
    }
}

module.exports = MultiDocumentRAGService;
