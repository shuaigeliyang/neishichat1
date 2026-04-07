/**
 * 结果评估器
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 功能：评估查询结果并决定最佳的展示方式
 */

const logger = require('../utils/logger');

/**
 * 评估结果类型
 */
const ResultType = {
  EMPTY: 'empty',        // 空结果
  DISPLAY: 'display',    // 直接显示（少量数据）
  PAGINATION: 'pagination', // 分页显示（中等数据）
  DOWNLOAD: 'download'   // 仅下载（大量数据）
};

/**
 * 评估配置
 */
const CONFIG = {
  thresholds: {
    display: 50,      // <= 50条：直接显示
    pagination: 500,  // 50-500条：分页 + 下载
    download: 50000   // > 500条：仅下载
  },
  maxPreviewRows: 50,  // 预览最多显示的行数
  maxDownloadRows: 10000 // 最多允许下载的行数
};

/**
 * 评估查询结果
 * @param {Array} result - 查询结果数组
 * @param {string} sql - SQL语句（可选）
 * @returns {Object}
 */
function evaluateResult(result, sql = '') {
  const rowCount = Array.isArray(result) ? result.length : 0;

  logger.info('评估查询结果', { rowCount, sqlLength: sql.length });

  // 1. 空结果
  if (rowCount === 0) {
    return {
      type: ResultType.EMPTY,
      rowCount: 0,
      message: '未找到相关数据～',
      displayData: null,
      downloadAvailable: false
    };
  }

  // 2. 大量数据（仅下载）
  if (rowCount > CONFIG.thresholds.pagination) {
    return {
      type: ResultType.DOWNLOAD,
      rowCount: rowCount,
      message: `✅ 查询成功！找到 ${rowCount} 条记录\n\n由于数据量很大，已为您生成Excel下载链接，请点击下方按钮下载完整数据。`,
      displayData: null,
      downloadAvailable: true,
      suggestedAction: 'download'
    };
  }

  // 3. 中等数据（分页 + 下载）
  if (rowCount > CONFIG.thresholds.display) {
    const previewData = result.slice(0, CONFIG.maxPreviewRows);

    return {
      type: ResultType.PAGINATION,
      rowCount: rowCount,
      message: `✅ 查询成功！找到 ${rowCount} 条记录\n\n由于数据量较大，已为您生成Excel下载链接，同时显示前 ${CONFIG.maxPreviewRows} 条预览。`,
      displayData: previewData,
      downloadAvailable: true,
      suggestedAction: 'preview_with_download',
      previewCount: previewData.length
    };
  }

  // 4. 少量数据（直接显示）
  return {
    type: ResultType.DISPLAY,
    rowCount: rowCount,
    message: `✅ 查询成功！找到 ${rowCount} 条记录`,
    displayData: result,
    downloadAvailable: true,
    suggestedAction: 'display'
  };
}

/**
 * 生成用户友好的结果描述
 * @param {Object} evaluation - 评估结果
 * @param {string} explanation - AI的查询说明
 * @returns {string}
 */
function generateResultMessage(evaluation, explanation = '') {
  let message = evaluation.message;

  // 添加AI的查询说明
  if (explanation) {
    message += `\n\n💡 ${explanation}`;
  }

  // 根据结果类型添加建议
  switch (evaluation.type) {
    case ResultType.DISPLAY:
      message += '\n\n您可以向下滚动查看完整数据，或点击下载按钮保存为Excel文件。';
      break;

    case ResultType.PAGINATION:
      message += `\n\n📊 当前显示前 ${evaluation.previewCount} 条数据预览。`;
      break;

    case ResultType.DOWNLOAD:
      message += '\n\n建议下载后使用Excel查看完整数据。';
      break;

    case ResultType.EMPTY:
      message += '\n\n💡 建议：\n- 检查查询条件是否正确\n- 尝试使用更通用的查询词\n- 查看数据是否存在于数据库中';
      break;
  }

  return message;
}

/**
 * 提取结果中的实体（用于上下文）
 * @param {Array} result - 查询结果
 * @param {string} sql - SQL语句
 * @returns {Object}
 */
function extractEntities(result, sql = '') {
  const entities = {};

  if (!Array.isArray(result) || result.length === 0) {
    return entities;
  }

  // 从结果中提取实体
  const firstRow = result[0];

  // 提取学院
  if (firstRow.college_name || firstRow.学院) {
    entities.college = firstRow.college_name || firstRow.学院;
  }

  // 提取专业
  if (firstRow.major_name || firstRow.专业) {
    entities.major = firstRow.major_name || firstRow.专业;
  }

  // 提取班级
  if (firstRow.class_name || firstRow.班级) {
    entities.class = firstRow.class_name || firstRow.班级;
  }

  // 提取学生姓名
  if (firstRow.name || firstRow.姓名) {
    entities.student = firstRow.name || firstRow.姓名;
  }

  // 从SQL中提取信息
  if (sql) {
    // 提取WHERE条件中的值
    const whereMatches = sql.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/is);
    if (whereMatches) {
      entities.whereClause = whereMatches[1].trim();
    }
  }

  return entities;
}

/**
 * 验证结果数量是否在允许范围内
 * @param {number} rowCount - 结果行数
 * @returns {Object}
 */
function validateRowCount(rowCount) {
  if (rowCount > CONFIG.maxDownloadRows) {
    return {
      valid: false,
      error: `结果超过最大允许下载行数（${CONFIG.maxDownloadRows}条），请优化查询条件`,
      suggestedLimit: CONFIG.maxDownloadRows
    };
  }

  return {
    valid: true
  };
}

module.exports = {
  ResultType,
  evaluateResult,
  generateResultMessage,
  extractEntities,
  validateRowCount,
  CONFIG
};
