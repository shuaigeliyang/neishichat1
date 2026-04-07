/**
 * 下载权限验证器（集成日志）
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：验证用户的下载权限
 */

const { query } = require('../config/database');
const permissionLogger = require('../services/permissionLogger');

class DownloadPermissionValidator {
  /**
   * 验证下载权限（集成日志记录）
   * @param {Object} user - 用户信息
   * @param {string} downloadType - 下载类型
   * @returns {Promise<Object>} { allowed, message, scope }
   */
  async validate(user, downloadType) {
    const { type: userType, id: userId } = user;

    console.log('🔐 下载权限验证', { userType, userId, downloadType });

    let result = {
      allowed: false,
      scope: '',
      message: ''
    };

    // 个人信息下载
    if (downloadType === '个人信息') {
      result = {
        allowed: true,
        scope: 'personal',
        message: '可以下载自己的个人信息'
      };
    }

    // 成绩单下载
    else if (downloadType === '成绩单') {
      if (userType === 'student') {
        result = {
          allowed: true,
          scope: 'personal',
          message: '可以下载自己的成绩单'
        };
      } else if (userType === 'teacher') {
        result = {
          allowed: true,
          scope: 'class',
          message: '可以下载授课班级的成绩单'
        };
      } else if (userType === 'admin') {
        result = {
          allowed: true,
          scope: 'all',
          message: '管理员可以下载所有成绩单'
        };
      } else {
        result = {
          allowed: false,
          message: '❌ 只有学生和教师可以下载成绩单'
        };
      }
    }

    // 班级信息下载
    else if (downloadType === '班级信息') {
      if (userType === 'student') {
        result = {
          allowed: false,
          message: '❌ 学生不能下载班级信息，请联系老师或管理员'
        };
      } else if (userType === 'teacher') {
        result = {
          allowed: true,
          scope: 'class',
          message: '可以下载授课班级的信息'
        };
      } else if (userType === 'admin') {
        result = {
          allowed: true,
          scope: 'all',
          message: '管理员可以下载所有班级信息'
        };
      }
    }

    // 学院信息下载 - 仅管理员
    else if (downloadType === '学院信息') {
      if (userType === 'admin') {
        result = {
          allowed: true,
          scope: 'all',
          message: '管理员可以下载学院信息'
        };
      } else {
        result = {
          allowed: false,
          message: '❌ 下载学院信息需要管理员权限'
        };
      }
    }

    // 默认拒绝
    else {
      result = {
        allowed: false,
        message: '❌ 未知的下载类型或权限不足'
      };
    }

    // 记录下载权限验证日志
    await permissionLogger.logDownloadPermission(user, downloadType, result.allowed, result.message);

    return result;
  }
}

module.exports = new DownloadPermissionValidator();
