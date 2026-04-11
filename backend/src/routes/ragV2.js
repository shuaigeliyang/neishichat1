/**
 * 多文档RAG问答API路由
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：提供多政策文档问答的HTTP接口
 *
 * 核心改进：
 * - 使用MultiDocumentRAGService支持多文档检索
 * - 保留原有的同义词映射和问题标准化
 * - 增强的来源标注（按文档分组）
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const MultiDocumentRAGService = require('../../services/multiDocumentRagService');

// 创建多文档RAG服务实例
const ragService = new MultiDocumentRAGService(process.env.ZHIPU_API_KEY, {
    embeddingMode: process.env.EMBEDDING_MODE || 'api'
});

/**
 * 同义词映射表 - 将口语化表达转换为正式用语
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 版本：v2.0 - 完整版（涵盖教育领域常见口语化表达）
 */
const SYNONYM_MAP = {
    // 成绩与考核
    '挂科': '不及格',
    '挂了': '不及格',
    '没过': '不及格',
    '考砸了': '成绩不合格',
    '考得很差': '成绩不合格',
    '考得好': '成绩优秀',
    '满分': '100分',
    '及格': '成绩合格',
    '过了': '通过',
    '通过': '通过考核',

    // 纪律与处分
    '被抓': '被处分',
    '背处分': '受到处分',
    '记过': '记过处分',
    '警告': '警告处分',
    '处分': '纪律处分',
    '被抓作弊': '考试作弊',
    '作弊被抓': '考试作弊',
    '违纪': '违反纪律',
    '违规': '违反规定',

    // 奖励与荣誉
    '拿奖学金': '获得奖学金',
    '评奖学金': '申请奖学金',
    '拿奖': '获得奖励',
    '得奖': '获得奖励',
    '评优': '评优评先',
    '评先': '评优评先',

    // 课程与学习
    '选课': '选择课程',
    '退课': '退选课程',
    '重读': '重修',
    '补考': '课程补考',
    '重考': '补考',
    '补修': '补修课程',
    '免修': '免修课程',
    '旁听': '旁听课程',

    // 学籍管理
    '退学': '退学处理',
    '休学': '休学申请',
    '复学': '复学申请',
    '转专业': '转换专业',
    '转系': '转换专业',
    '升学': '升入高年级',
    '留级': '留级处理',
    '跳级': '跳级学习',
    '延毕': '延期毕业',
    '结业': '结业处理',
    '肄业': '肄业证书',

    // 宿舍生活
    '住校': '住校学习',
    '走读': '走读生',
    '换宿舍': '调换宿舍',
    '搬出去': '外宿申请',
    '住外面': '校外住宿',

    // 考勤管理
    '请假': '请假申请',
    '缺勤': '缺席',
    '旷课': '无故旷课',
    '迟到': '迟到记录',
    '早退': '早退记录',
    '逃课': '旷课',
    '翘课': '旷课',

    // 证件办理
    '办证': '办理证件',
    '补办': '补办证件',
    '丢证件': '证件丢失',
    '学生证': '学生证件',
    '校园卡': '一卡通',

    // 实践环节
    '实习': '实习课程',
    '实训': '实训课程',
    '见习': '见习活动',
    '做实验': '实验课程',
    '写论文': '毕业论文',
    '答辩': '论文答辩',

    // 费用相关
    '学费': '学费费用',
    '住宿费': '住宿费用',
    '书本费': '教材费用',
    '报名费': '报名费用',
    '重修费': '重修费用',
    '要钱': '收费',
    '多少钱': '费用',
    '要交钱': '需要缴费',
    '要多少钱': '收费标准',
    '收费': '费用',
    '交钱': '缴费',
    '费用': '费用标准',
    '收费标准': '费用标准',

    // 后果和影响
    '会怎么样': '后果',
    '怎么样': '后果',
    '会怎样': '后果',
    '结果怎么样': '后果',
    '有什么后果': '后果',
    '后果是什么': '后果',
    '有什么影响': '影响',
    '会怎么样了': '后果',
    '会怎样了': '后果',
    '最后怎么样': '后果',
    '最后会怎样': '后果',
    '会导致什么': '导致',
    '会引起什么': '引起',

    // 时间表达
    '这学期': '本学期',
    '下学期': '下一学期',
    '上学期': '上一学期',
    '开学': '开学时间',
    '放假': '假期',
    '寒暑假': '寒假和暑假',
    '周末': '周末时间',

    // 咨询问答
    '问问': '咨询',
    '问一下': '咨询',
    '想了解': '了解情况',
    '想知道': '咨询',
    '怎么申请': '申请流程',
    '怎么办': '如何处理',
    '怎么做': '操作流程',
    '去哪办': '办理地点',
    '找谁办': '办理部门',
    '要什么材料': '所需材料',
    '需要什么': '所需材料',

    // 疑问词汇
    '能不能': '是否可以',
    '可不可以': '是否可以',
    '行不行': '是否可行',
    '好不好': '是否合适',
    '对不对': '是否正确',
    '有没有': '是否存在',
    '会不会': '是否会',
    '要多久': '需要多长时间',
    '什么时候': '时间',
    '在哪': '地点',
    '哪些': '哪些内容'
};

/**
 * 标准化问题 - 将口语化表达转换为正式用语
 */
function normalizeQuestion(question) {
    let normalized = question;

    // 应用同义词映射
    for (const [colloquial, formal] of Object.entries(SYNONYM_MAP)) {
        const regex = new RegExp(colloquial, 'g');
        normalized = normalized.replace(regex, formal);
    }

    return normalized;
}

/**
 * 格式化来源信息 - 按文档分组
 */
function formatSources(sources) {
    if (!sources || sources.length === 0) return [];

    // 按documentId分组
    const grouped = {};

    for (const source of sources) {
        const docId = source.documentId || 'unknown';
        const docName = source.documentName || '未知文档';

        if (!grouped[docId]) {
            grouped[docId] = {
                documentId: docId,
                documentName: docName,
                chunks: []
            };
        }

        grouped[docId].chunks.push({
            chapter: source.chapter || '',
            page: source.page || source.page_num || 0,
            score: source.score || 0,
            text: source.text ? source.text.substring(0, 100) + '...' : ''
        });
    }

    // 转换为数组并排序
    return Object.values(grouped).map(doc => ({
        documentName: doc.documentName,
        chunks: doc.chunks.sort((a, b) => b.score - a.score)
    }));
}

/**
 * 初始化RAG服务
 */
router.post('/initialize', authenticate, async (req, res) => {
    try {
        await ragService.initialize();

        const stats = ragService.getStatistics();

        res.json({
            success: true,
            message: '多文档RAG服务初始化成功',
            stats: stats
        });
    } catch (error) {
        console.error('初始化失败：', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 问答接口 - 支持多政策文档
 */
router.post('/answer', authenticate, async (req, res) => {
    try {
        console.log('\n========================================');
        console.log('📚 [多文档RAG] 收到问答请求');
        console.log('========================================');

        const { question, options = {} } = req.body;

        console.log('📝 原始问题：', question);
        console.log('📋 请求选项：', options);

        if (!question) {
            console.log('❌ 错误：问题为空');
            return res.status(400).json({
                success: false,
                error: '请提供问题'
            });
        }

        // 标准化问题（将口语化表达转换为正式用语）
        const normalizedQuestion = normalizeQuestion(question);
        console.log('📝 标准化后问题：', normalizedQuestion);

        // 如果未初始化，先初始化
        if (!ragService.initialized) {
            console.log('🔧 多文档RAG服务未初始化，开始初始化...');
            await ragService.initialize();
            console.log('✅ 多文档RAG服务初始化完成');
        } else {
            console.log('✅ 多文档RAG服务已初始化');
        }

        console.log('🚀 开始调用多文档RAG服务...');

        // 调用多文档问答服务
        const result = await ragService.ask(normalizedQuestion, {
            topK: options.topK || 15,
            minScore: options.minScore || 0.3,
            useReranking: options.useReranking !== false
        });

        // 格式化来源信息（按文档分组）
        const formattedSources = formatSources(result.sources);

        console.log('\n📊 检索结果统计：');
        console.log(`   检索到chunks: ${result.retrievedChunks}`);
        console.log(`   来源文档数: ${formattedSources.length}`);

        formattedSources.forEach(source => {
            console.log(`   📄 ${source.documentName}: ${source.chunks.length} 个chunks`);
        });

        console.log('========================================\n');

        // 构建响应
        const response = {
            success: true,
            data: {
                question: question,
                normalizedQuestion: normalizedQuestion,
                answer: result.answer,
                sources: formattedSources,
                retrievedChunks: result.retrievedChunks,
                // ✨ 新增：来源文档列表
                sourceDocuments: formattedSources.map(s => s.documentName)
            }
        };

        res.json(response);

    } catch (error) {
        console.error('❌ 问答处理失败：', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

/**
 * 获取已索引文档列表
 */
router.get('/documents', authenticate, async (req, res) => {
    try {
        const documents = ragService.getIndexedDocuments();

        res.json({
            success: true,
            data: {
                documents: documents,
                total: documents.length
            }
        });
    } catch (error) {
        console.error('获取文档列表失败：', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 获取服务统计信息
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const stats = ragService.getStatistics();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('获取统计信息失败：', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 健康检查
 */
router.get('/health', async (req, res) => {
    try {
        const stats = ragService.getStatistics();

        res.json({
            success: true,
            status: 'healthy',
            initialized: ragService.initialized,
            stats: stats
        });
    } catch (error) {
        res.json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;
