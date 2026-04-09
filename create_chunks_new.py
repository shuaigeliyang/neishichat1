#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
学生手册智能分块工具
设计师：内师智能体系统 (￣▽￣)ﾉ
功能：基于高质量数据源创建优化的文档分块
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import re
from pathlib import Path
from typing import List, Dict

class SmartChunker:
    """智能文档分块器 - 本小姐的优雅设计！"""

    def __init__(self, chunk_size=1000, overlap=200):
        self.chunk_size = chunk_size  # 目标分块大小（字符数）
        self.overlap = overlap  # 分块重叠大小

    def clean_text(self, text: str) -> str:
        """清理文本，移除多余空白"""
        # 移除多余的空行
        text = re.sub(r'\n{3,}', '\n\n', text)
        # 移除行首行尾空白
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(lines)
        return text.strip()

    def split_by_paragraph(self, text: str) -> List[str]:
        """按段落分割文本"""
        # 按双换行符分割段落
        paragraphs = text.split('\n\n')
        # 过滤空段落
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        return paragraphs

    def split_by_sentences(self, text: str) -> List[str]:
        """按句子分割文本（中文句号、问号、感叹号）"""
        # 中文句子分割
        sentences = re.split(r'[。！？；]', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences

    def create_chunk(self, text: str, page_num: int, chunk_id: int,
                     context_before: str = "", context_after: str = "") -> Dict:
        """创建分块对象 - 本小姐的专业结构设计！"""
        return {
            "chunk_id": chunk_id,
            "page_num": page_num,
            "text": text,
            "char_count": len(text),
            # 添加上下文信息，提升语义搜索效果
            "full_context": f"{context_before} {text} {context_after}".strip()
        }

    def chunk_page(self, page_data: Dict, chunk_id: int) -> List[Dict]:
        """对单个页面进行智能分块"""
        text = self.clean_text(page_data["text"])
        page_num = page_data["page_num"]

        # 如果文本很短，直接作为一个分块
        if len(text) <= self.chunk_size:
            return [self.create_chunk(text, page_num, chunk_id)]

        chunks = []

        # 方法1：尝试按段落分块
        paragraphs = self.split_by_paragraph(text)

        if len(paragraphs) > 1:
            # 合并小段落
            current_chunk = ""
            for para in paragraphs:
                if len(current_chunk) + len(para) <= self.chunk_size:
                    current_chunk += para + "\n\n"
                else:
                    if current_chunk:
                        chunks.append(self.create_chunk(current_chunk, page_num, chunk_id))
                        chunk_id += 1
                    current_chunk = para + "\n\n"

            if current_chunk:
                chunks.append(self.create_chunk(current_chunk, page_num, chunk_id))
                chunk_id += 1

            if chunks:
                return chunks

        # 方法2：按句子分块（带重叠）
        sentences = self.split_by_sentences(text)
        current_chunk = ""

        for i, sentence in enumerate(sentences):
            # 检查是否添加重叠内容
            if len(current_chunk) > self.chunk_size:
                # 保存当前分块
                chunks.append(self.create_chunk(current_chunk, page_num, chunk_id))
                chunk_id += 1

                # 创建重叠：保留最后几个句子作为下一个分块的开头
                overlap_sentences = []
                overlap_text = ""
                for sent in reversed(sentences[max(0, i-5):i]):
                    if len(overlap_text) + len(sent) <= self.overlap:
                        overlap_sentences.insert(0, sent)
                        overlap_text = sent + "。" + overlap_text
                    else:
                        break

                current_chunk = overlap_text + sentence + "。"
            else:
                current_chunk += sentence + "。"

        # 保存最后一个分块
        if current_chunk:
            chunks.append(self.create_chunk(current_chunk, page_num, chunk_id))

        return chunks

    def chunk_document(self, pages: List[Dict]) -> List[Dict]:
        """处理整个文档"""
        print(f"✓ 开始智能分块，共 {len(pages)} 页...")
        print(f"  - 目标分块大小：{self.chunk_size} 字符")
        print(f"  - 分块重叠：{self.overlap} 字符")

        all_chunks = []
        chunk_id = 1

        for page_data in pages:
            chunks = self.chunk_page(page_data, chunk_id)
            all_chunks.extend(chunks)
            chunk_id += len(chunks)

            # 每处理500页显示进度
            if len(all_chunks) % 500 == 0:
                print(f"  - 已处理 {len(all_chunks)} 个分块...")

        return all_chunks

def analyze_chunks(chunks: List[Dict]):
    """分析分块统计信息"""
    print(f"\n✓ 分块统计信息：")
    print(f"  - 总分块数：{len(chunks)}")

    # 统计分块大小分布
    sizes = [c["char_count"] for c in chunks]
    avg_size = sum(sizes) / len(sizes)
    min_size = min(sizes)
    max_size = max(sizes)

    print(f"  - 平均大小：{avg_size:.0f} 字符")
    print(f"  - 最小大小：{min_size} 字符")
    print(f"  - 最大大小：{max_size} 字符")

    # 统计页码范围
    page_nums = [c["page_num"] for c in chunks]
    print(f"  - 页码范围：{min(page_nums)} ~ {max(page_nums)}")

def main():
    """主函数"""
    # 配置路径
    source_path = r"E:\外包\教育系统智能体\student_handbook_full.json_不完整"
    output_path = r"E:\外包\教育系统智能体\document_chunks_new.json"

    print("=" * 60)
    print("学生手册智能分块工具")
    print("设计师：内师智能体系统 (￣▽￣)ﾉ")
    print("=" * 60)

    # 读取源文件
    print(f"\n✓ 正在读取源文件：{source_path}")
    with open(source_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    total_pages = data["total_pages"]
    pages = data["pages"]

    print(f"  - 总页数：{total_pages}")
    print(f"  - 实际页数：{len(pages)}")

    # 创建分块
    chunker = SmartChunker(chunk_size=1000, overlap=200)
    chunks = chunker.chunk_document(pages)

    # 分析结果
    analyze_chunks(chunks)

    # 保存结果
    print(f"\n✓ 正在保存分块文件：{output_path}")
    output_data = {
        "metadata": {
            "total_chunks": len(chunks),
            "total_pages": total_pages,
            "source_file": source_path,
            "chunk_config": {
                "chunk_size": 1000,
                "overlap": 200
            }
        },
        "chunks": chunks
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\n✓ 分块完成！共生成 {len(chunks)} 个文档块")
    print(f"✓ 保存路径：{output_path}")

if __name__ == "__main__":
    main()
