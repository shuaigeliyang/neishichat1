"""
MySQL数据导出脚本 - 导出为Excel格式
用于导入到Coze数据库

设计师：内师智能体系统 (￣▽￣)ﾉ
"""

import pandas as pd
import pymysql
from datetime import datetime
import os

# ==================== 配置区域 ====================

# 数据库连接配置
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'root',  # 请修改为你的MySQL密码
    'database': 'education_system',
    'charset': 'utf8mb4'
}

# 导出目录
OUTPUT_DIR = 'E:/外包/教育系统智能体/exports'

# ==================== 导出函数 ====================

def export_students():
    """导出学生信息"""
    print("\n[1/3] 正在导出学生信息...")

    conn = pymysql.connect(**DB_CONFIG)

    query = """
    SELECT
        s.student_id AS '学号',
        s.name AS '姓名',
        CASE WHEN s.gender = 'M' THEN '男' ELSE '女' END AS '性别',
        s.enrollment_date AS '入学日期',
        CONCAT(c.grade, '级') AS '年级',
        c.class_name AS '班级',
        m.major_name AS '专业',
        col.college_name AS '学院',
        COALESCE(s.phone, '未填写') AS '手机号',
        COALESCE(s.email, '未填写') AS '邮箱',
        CASE WHEN s.status = 'active' THEN '在读' ELSE '其他' END AS '状态'
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.class_id
    LEFT JOIN majors m ON c.major_id = m.major_id
    LEFT JOIN colleges col ON m.college_id = col.college_id
    ORDER BY s.student_id
    """

    try:
        df = pd.read_sql(query, conn)
        output_file = os.path.join(OUTPUT_DIR, '学生信息.xlsx')
        df.to_excel(output_file, index=False, engine='openpyxl')
        print(f"✓ 导出成功：{len(df)}条记录")
        print(f"  保存位置：{output_file}")
        return len(df)
    except Exception as e:
        print(f"✗ 导出失败：{str(e)}")
        return 0
    finally:
        conn.close()


def export_grades():
    """导出学生成绩"""
    print("\n[2/3] 正在导出学生成绩...")

    conn = pymysql.connect(**DB_CONFIG)

    query = """
    SELECT
        s.student_code AS '学号',
        s.name AS '姓名',
        c.course_name AS '课程名称',
        c.course_type AS '课程类型',
        g.usual_score AS '平时成绩',
        g.midterm_score AS '期中成绩',
        g.final_score AS '期末成绩',
        g.total_score AS '总评成绩',
        c.credits AS '学分',
        co.semester AS '学期',
        CONCAT(co.semester, '学期') AS '学年学期',
        t.name AS '授课教师'
    FROM grades g
    INNER JOIN students s ON g.student_id = s.student_id
    INNER JOIN course_offerings co ON g.offering_id = co.offering_id
    INNER JOIN courses c ON co.course_id = c.course_id
    INNER JOIN teachers t ON co.teacher_id = t.teacher_id
    ORDER BY co.semester DESC, s.student_code, c.course_name
    """

    try:
        df = pd.read_sql(query, conn)
        output_file = os.path.join(OUTPUT_DIR, '学生成绩.xlsx')
        df.to_excel(output_file, index=False, engine='openpyxl')
        print(f"[OK] 导出成功：{len(df)}条记录")
        print(f"  保存位置：{output_file}")

        # 统计信息
        if len(df) > 0 and '学期' in df.columns:
            print(f"  学期范围：{df['学期'].min()} ~ {df['学期'].max()}")

        return len(df)
    except Exception as e:
        print(f"[ERROR] 导出失败：{str(e)}")
        return 0
    finally:
        conn.close()


def export_timetable():
    """导出课程表"""
    print("\n[3/3] 正在导出课程表...")

    conn = pymysql.connect(**DB_CONFIG)

    query = """
    SELECT
        s.student_code AS '学号',
        s.name AS '姓名',
        c.course_name AS '课程名称',
        c.course_type AS '课程类型',
        c.credits AS '学分',
        t.name AS '授课教师',
        co.schedule AS '上课时间安排',
        co.classroom AS '教室',
        co.semester AS '学期'
    FROM students s
    INNER JOIN classes cl ON s.class_id = cl.class_id
    INNER JOIN course_offerings co ON cl.class_id = co.class_id
    INNER JOIN courses c ON co.course_id = c.course_id
    INNER JOIN teachers t ON co.teacher_id = t.teacher_id
    WHERE co.status = 1
    ORDER BY s.student_code, c.course_name
    """

    try:
        df = pd.read_sql(query, conn)
        output_file = os.path.join(OUTPUT_DIR, '课程表.xlsx')
        df.to_excel(output_file, index=False, engine='openpyxl')
        print(f"[OK] 导出成功：{len(df)}条记录")
        print(f"  保存位置：{output_file}")
        return len(df)
    except Exception as e:
        print(f"[ERROR] 导出失败：{str(e)}")
        return 0
    finally:
        conn.close()


def export_all():
    """导出所有数据"""
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    print("=" * 50)
    print("  MySQL数据导出工具")
    print("  设计师：内师智能体系统")
    print("=" * 50)
    print(f"开始时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # 创建输出目录
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"[OK] 创建输出目录：{OUTPUT_DIR}")

    # 测试数据库连接
    print("\n正在连接数据库...")
    try:
        conn = pymysql.connect(**DB_CONFIG)
        conn.close()
        print("[OK] 数据库连接成功")
    except Exception as e:
        print(f"[ERROR] 数据库连接失败：{str(e)}")
        print("\n请检查：")
        print("1. MySQL服务是否启动")
        print("2. 数据库配置是否正确")
        print("3. 数据库 'education_system' 是否存在")
        return

    # 导出数据
    total = 0
    total += export_students()
    total += export_grades()
    total += export_timetable()

    # 完成
    print("\n" + "=" * 50)
    print(f"导出完成！共导出 {total} 条记录")
    print(f"结束时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    print("\n下一步操作：")
    print("1. 打开Coze平台：https://www.coze.cn")
    print("2. 进入你的Bot编辑页面")
    print("3. 点击「知识」→「数据库」")
    print("4. 创建表并导入Excel文件")
    print("\n提示：")
    print("- 学生信息.xlsx -> 创建「学生信息」表")
    print("- 学生成绩.xlsx -> 创建「学生成绩」表")
    print("- 课程表.xlsx -> 创建「课程表」表")


if __name__ == '__main__':
    export_all()
