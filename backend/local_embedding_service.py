"""
本地Embedding服务（Python版）
设计师：哈雷酱
功能：使用sentence-transformers提供本地embedding API

优势：
- 中文支持好
- 性能优秀
- 无需网络
- 完全本地化
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import numpy as np
import json
import os
from datetime import datetime
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# 全局变量
model = None
cache = {}
cache_file = 'python_embedding_cache.json'

# 配置
MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'  # 支持中文
CACHE_MAX_SIZE = 1000

def load_model():
    """加载模型"""
    global model
    if model is None:
        logger.info(f"[INFO] 正在加载模型: {MODEL_NAME}")
        logger.info("这可能需要几分钟，请耐心等待...")
        try:
            model = SentenceTransformer(MODEL_NAME)
            logger.info("[OK] 模型加载完成！")
            logger.info(f"   向量维度: {model.get_sentence_embedding_dimension()}")
            load_cache()
        except Exception as e:
            logger.error(f"[ERROR] 模型加载失败: {e}")
            raise

def load_cache():
    """加载缓存"""
    global cache
    try:
        if os.path.exists(cache_file):
            with open(cache_file, 'r', encoding='utf-8') as f:
                cache = json.load(f)
            logger.info(f"[OK] 已加载缓存，共{len(cache)}条记录")
    except Exception as e:
        logger.info(f"[INFO] 未找到缓存文件: {e}")
        cache = {}

def save_cache():
    """保存缓存"""
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"[ERROR] 保存缓存失败: {e}")

def get_cache_key(text):
    """生成缓存key"""
    import hashlib
    return hashlib.md5(text.encode('utf-8')).hexdigest()

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'service': 'Local Embedding Service (Python)',
        'model': MODEL_NAME,
        'cache_size': len(cache),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/embed', methods=['POST'])
def embed():
    """生成单个文本的向量"""
    try:
        data = request.get_json()
        text = data.get('text')

        if not text:
            return jsonify({'error': '请提供text参数'}), 400

        # 检查缓存
        cache_key = get_cache_key(text)
        if cache_key in cache:
            logger.info('[OK] 使用缓存的embedding')
            return jsonify({
                'embedding': cache[cache_key],
                'cached': True
            })

        # 生成向量
        logger.info(f"[INFO] 生成embedding: {text[:50]}...")
        start_time = datetime.now()

        embedding = model.encode(text, normalize_embeddings=True)
        embedding_list = embedding.tolist()

        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(f"[OK] Embedding生成完成！耗时: {duration:.0f}ms")

        # 保存到缓存
        if len(cache) < CACHE_MAX_SIZE:
            cache[cache_key] = embedding_list
            save_cache()

        return jsonify({
            'embedding': embedding_list,
            'cached': False,
            'dimension': len(embedding_list)
        })

    except Exception as e:
        logger.error(f"[ERROR] Embedding生成失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/embed_batch', methods=['POST'])
def embed_batch():
    """批量生成向量"""
    try:
        data = request.get_json()
        texts = data.get('texts', [])

        if not texts:
            return jsonify({'error': '请提供texts参数'}), 400

        logger.info(f"[INFO] 批量生成embedding: {len(texts)}个文本...")
        start_time = datetime.now()

        embeddings = model.encode(texts, normalize_embeddings=True)
        embeddings_list = embeddings.tolist()

        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(f"[OK] 批量Embedding生成完成！耗时: {duration:.0f}ms")
        logger.info(f"   平均每个: {duration/len(texts):.0f}ms")

        return jsonify({
            'embeddings': embeddings_list,
            'count': len(texts),
            'dimension': len(embeddings_list[0]) if embeddings_list else 0
        })

    except Exception as e:
        logger.error(f"[ERROR] 批量Embedding生成失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/similarity', methods=['POST'])
def similarity():
    """计算余弦相似度"""
    try:
        data = request.get_json()
        vec1 = data.get('vec1')
        vec2 = data.get('vec2')

        if not vec1 or not vec2:
            return jsonify({'error': '请提供vec1和vec2参数'}), 400

        # 转换为numpy数组
        arr1 = np.array(vec1)
        arr2 = np.array(vec2)

        # 计算余弦相似度
        similarity = np.dot(arr1, arr2) / (np.linalg.norm(arr1) * np.linalg.norm(arr2))

        return jsonify({
            'similarity': float(similarity)
        })

    except Exception as e:
        logger.error(f"[ERROR] 相似度计算失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/cache/stats', methods=['GET'])
def cache_stats():
    """获取缓存统计"""
    return jsonify({
        'size': len(cache),
        'max_size': CACHE_MAX_SIZE,
        'usage_percent': len(cache) / CACHE_MAX_SIZE * 100
    })

@app.route('/cache/clear', methods=['POST'])
def cache_clear():
    """清空缓存"""
    global cache
    cache = {}
    save_cache()
    logger.info('[INFO] 缓存已清空')
    return jsonify({'message': '缓存已清空'})

if __name__ == '__main__':
    print("""
================================================================
     本地Embedding服务 - Python版
     设计师：哈雷酱
================================================================

[INFO] 服务启动中...

[INFO] 模型: paraphrase-multilingual-MiniLM-L12-v2
[INFO] 支持中文: 是
[INFO] API端点:
   - GET  /health              健康检查
   - POST /embed               生成单个文本向量
   - POST /embed_batch         批量生成向量
   - POST /similarity           计算相似度
   - GET  /cache/stats         缓存统计
   - POST /cache/clear         清空缓存

[INFO] 使用示例:
   curl -X POST http://localhost:5001/embed ^
     -H "Content-Type: application/json" ^
     -d "{\"text\": \"重修管理办法\"}"

[INFO] 首次启动需要下载模型，请耐心等待...

""")

    # 加载模型
    load_model()

    # 启动服务
    app.run(host='0.0.0.0', port=5001, debug=False)
