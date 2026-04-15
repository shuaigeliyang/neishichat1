import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Edit, Trash2, Loader2, Upload, FileText, RefreshCw, Eye, Play, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ==================== 类型定义 ====================

interface PolicyDocument {
  documentId: string
  name: string
  displayName: string
  description: string
  status: 'pending' | 'processing' | 'indexed' | 'error'
  tags: string[]
  sourceFiles: {
    fileName: string
    fileType: string
    fileSize: number
    uploadedAt: string
  }[]
  statistics: {
    totalPages: number
    totalChunks: number
    indexedChunks: number
    fileSize: number
  }
  indexedAt: string | null
  updatedAt: string
}

interface DocumentStatistics {
  totalDocuments: number
  indexedDocuments: number
  pendingDocuments: number
  errorDocuments: number
  totalChunks: number
  indexedChunks: number
}

interface IndexStatus {
  totalDocuments: number
  totalChunks: number
  documents: {
    documentId: string
    name: string
    indexedAt: string
  }[]
}

interface DocumentChunk {
  chunkId: number
  documentId: string
  documentName: string
  chapter: string
  page: number
  text: string
  score?: number
}

interface ProcessedDocument {
  documentId: string  // ✨ 新增
  name: string
  path: string
  files: {
    student_handbook_full: boolean
    document_chunks: boolean
    embedding_cache: boolean
  }
  stats?: {
    totalPages: number
    totalChunks: number
  }
}

interface FileContent {
  type: 'student_handbook_full' | 'document_chunks' | 'embedding_cache'
  content: any
  documentName: string
}

// ==================== 主组件 ====================

export default function PolicyDocuments() {
  // ==================== 状态管理 ====================

  // 文档列表状态
  const [documents, setDocuments] = useState<PolicyDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsError, setDocumentsError] = useState<string | null>(null)

  // 统计信息状态
  const [statistics, setStatistics] = useState<DocumentStatistics | null>(null)

  // 索引状态
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null)

  // 文档内容状态
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([])
  const [processedDocsLoading, setProcessedDocsLoading] = useState(false)
  const [fileContentDialogOpen, setFileContentDialogOpen] = useState(false)
  const [selectedFileContent, setSelectedFileContent] = useState<FileContent | null>(null)

  // 上传状态
  const [uploading, setUploading] = useState(false)

  // 对话框状态
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
  const [chunksDialogOpen, setChunksDialogOpen] = useState(false)

  // 选中的文档
  const [selectedDocument, setSelectedDocument] = useState<PolicyDocument | null>(null)
  const [selectedChunks, setSelectedChunks] = useState<DocumentChunk[]>([])

  // 上传表单状态
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    name: '',
    description: '',
    tags: ''
  })

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('')

  // ==================== API调用 ====================

  // 获取所有文档
  const fetchDocuments = async () => {
    setDocumentsLoading(true)
    setDocumentsError(null)

    try {
      const response = await fetch('http://localhost:3005/api/documents')
      const result = await response.json()

      if (result.success) {
        setDocuments(result.data.documents || [])
        // ✨ 修复：转换字段名以匹配前端期望
        setStatistics({
          totalDocuments: result.data.statistics?.total || 0,
          indexedDocuments: result.data.statistics?.indexed || 0,
          pendingDocuments: result.data.statistics?.pending || 0,
          errorDocuments: result.data.statistics?.error || 0,
          totalChunks: result.data.statistics?.totalChunks || 0,
          indexedChunks: result.data.statistics?.indexedChunks || 0
        })
      } else {
        setDocumentsError(result.error || '获取文档列表失败')
      }
    } catch (err: any) {
      setDocumentsError('网络错误: ' + err.message)
    } finally {
      setDocumentsLoading(false)
    }
  }

  // 获取索引状态
  const fetchIndexStatus = async () => {
    try {
      const response = await fetch('http://localhost:3005/api/documents/index/status')
      const result = await response.json()

      if (result.success) {
        setIndexStatus(result.data)
      }
    } catch (err: any) {
      console.error('获取索引状态失败:', err)
    }
  }

  // 获取已处理的文档列表 - 从文档目录扫描
  const fetchProcessedDocuments = async () => {
    setProcessedDocsLoading(true)

    try {
      // 使用 /api/documents 获取所有文档，然后过滤已处理的
      const response = await fetch('http://localhost:3005/api/documents')
      const result = await response.json()

      if (result.success) {
        // 将已处理的文档转换为 ProcessedDocument 格式
        const indexedDocs = result.data.documents
          .filter((doc: any) => doc.status === 'indexed')
          .map((doc: any) => ({
            documentId: doc.documentId,  // ✨ 新增：传递documentId
            name: doc.name || doc.displayName,
            path: doc.directory || '',
            files: {
              student_handbook_full: doc.statistics?.totalPages > 0,
              document_chunks: doc.statistics?.totalChunks > 0,
              embedding_cache: doc.statistics?.indexedChunks > 0
            },
            stats: {
              totalPages: doc.statistics?.totalPages || 0,
              totalChunks: doc.statistics?.totalChunks || 0
            }
          }))
        setProcessedDocuments(indexedDocs)
      }
    } catch (err: any) {
      console.error('获取已处理文档失败:', err)
    } finally {
      setProcessedDocsLoading(false)
    }
  }

  // 查看文件内容
  const handleViewFileContent = async (documentId: string, documentName: string, fileType: 'student_handbook_full' | 'document_chunks' | 'embedding_cache') => {
    try {
      // ✨ 修复：使用正确的API路径 /api/documents/:documentId/chunks
      const response = await fetch(`http://localhost:3005/api/documents/${documentId}/chunks`)
      const result = await response.json()

      if (result.success) {
        const chunks = result.data.chunks || []

        // ✨ 根据文件类型设置不同的content格式
        if (fileType === 'document_chunks') {
          // document_chunks: 需要转换格式以匹配前端期望
          const transformedChunks = chunks.map((c: any, index: number) => ({
            id: index + 1,
            page_num: c.metadata?.page || c.page || 1,
            chapter_title: c.metadata?.chapter || c.chapter || '',
            text: c.text,
            preview: c.preview || c.text?.substring(0, 150)
          }))

          setSelectedFileContent({
            type: fileType,
            content: transformedChunks,  // 直接返回数组，前端会用到 .length, .slice(), .reduce()
            documentName: documentName
          })
        } else if (fileType === 'embedding_cache') {
          // embedding_cache: 包含embedding的数据
          const transformedCache = chunks.map((c: any, index: number) => ({
            id: index + 1,
            page_num: c.metadata?.page || c.page || 1,
            text: c.text,
            hasEmbedding: !!c.embedding,
            embeddingLength: c.embedding?.length || 0
          }))

          setSelectedFileContent({
            type: fileType,
            content: transformedCache,
            documentName: documentName
          })
        } else {
          // student_handbook_full: 页面格式
          setSelectedFileContent({
            type: fileType,
            content: {
              chunks: chunks,
              total_pages: result.data.totalChunks || chunks.length,
              totalCharacters: chunks.reduce((sum: number, c: any) => sum + (c.text?.length || 0), 0)
            },
            documentName: documentName
          })
        }

        setFileContentDialogOpen(true)
      } else {
        alert('读取文件失败：' + result.error)
      }
    } catch (err: any) {
      alert('读取文件失败：' + err.message)
    }
  }

  // 上传新文档
  const handleUpload = async () => {
    if (!uploadForm.file) {
      alert('请选择文件')
      return
    }

    if (!uploadForm.name) {
      alert('请输入文档名称')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', uploadForm.file)
      formData.append('name', uploadForm.name)
      formData.append('description', uploadForm.description)
      formData.append('tags', uploadForm.tags)

      const response = await fetch('http://localhost:3005/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        alert('文档上传成功！请点击"处理"按钮开始处理文档')
        setUploadDialogOpen(false)
        resetUploadForm()
        fetchDocuments()
      } else {
        alert('上传失败：' + result.error)
      }
    } catch (err: any) {
      alert('上传失败：' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // 处理文档
  const handleProcess = async (documentId: string) => {
    if (!confirm('确定要开始处理这个文档吗？这可能需要一些时间。')) return

    try {
      const response = await fetch(`http://localhost:3005/api/documents/${documentId}/process`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        alert('文档处理已启动！请稍后刷新查看状态')
        // 开始轮询状态
        startPolling(documentId)
      } else {
        alert('启动处理失败：' + result.error)
      }
    } catch (err: any) {
      alert('启动处理失败：' + err.message)
    }
  }

  // 删除文档
  const handleDelete = async (documentId: string) => {
    if (!confirm('确定要删除这个文档吗？这将同时删除相关的索引数据。')) return

    try {
      const response = await fetch(`http://localhost:3005/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        alert('文档删除成功！')
        fetchDocuments()
        fetchIndexStatus()
      } else {
        alert('删除失败：' + result.error)
      }
    } catch (err: any) {
      alert('删除失败：' + err.message)
    }
  }

  // 查看文档chunks
  const handleViewChunks = async (document: PolicyDocument) => {
    setSelectedDocument(document)
    setChunksDialogOpen(true)
    setSelectedChunks([])  // 先清空，避免显示旧数据

    try {
      const response = await fetch(`http://localhost:3005/api/documents/${document.documentId}/chunks`)
      const result = await response.json()

      if (result.success && result.data?.chunks) {
        // 转换数据格式以匹配前端
        const chunks = result.data.chunks.map((chunk: any, index: number) => ({
          chunkId: chunk.chunkId || index + 1,
          page: chunk.metadata?.page_num || chunk.page_num || chunk.metadata?.page || 1,
          text: chunk.text || chunk.preview || ''
        }))
        setSelectedChunks(chunks)
      }
    } catch (err) {
      console.error('获取chunks失败:', err)
    }
  }

  // 替换文档
  const handleReplace = async (documentId: string) => {
    if (!uploadForm.file) {
      alert('请选择新文件')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', uploadForm.file)

      const response = await fetch(`http://localhost:3005/api/documents/${documentId}/replace`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        alert('文档已准备替换，请点击"处理"按钮重新处理')
        setReplaceDialogOpen(false)
        resetUploadForm()
        fetchDocuments()
      } else {
        alert('替换失败：' + result.error)
      }
    } catch (err: any) {
      alert('替换失败：' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // ==================== 辅助函数 ====================

  // 重置上传表单
  const resetUploadForm = () => {
    setUploadForm({
      file: null,
      name: '',
      description: '',
      tags: ''
    })
  }

  // 状态轮询
  const startPolling = (documentId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:3005/api/documents/${documentId}/status`)
        const result = await response.json()

        if (result.success) {
          const status = result.data.status

          if (status === 'indexed' || status === 'error') {
            clearInterval(interval)
            fetchDocuments()

            if (status === 'indexed') {
              alert('文档处理完成！')
            } else if (status === 'error') {
              // 显示详细错误信息
              const errorMsg = result.data.error?.message || '文档处理失败，请查看控制台日志'
              alert(`文档处理失败！\n\n错误原因：${errorMsg}`)
            }
          }
        }
      } catch (err) {
        console.error('轮询状态失败:', err)
      }
    }, 3000) // 每3秒轮询一次

    // 5分钟后停止轮询
    setTimeout(() => clearInterval(interval), 300000)
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
  }

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'indexed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'indexed':
        return '已索引'
      case 'processing':
        return '处理中'
      case 'error':
        return '错误'
      default:
        return '待处理'
    }
  }

  // 过滤文档
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // ==================== 初始化 ====================

  useEffect(() => {
    fetchDocuments()
    fetchIndexStatus()
    fetchProcessedDocuments()

    // 每30秒刷新一次数据
    const interval = setInterval(() => {
      fetchDocuments()
      fetchIndexStatus()
      fetchProcessedDocuments()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // ==================== 渲染 ====================

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">政策文档管理</h2>
        <p className="text-muted-foreground">
          管理多个政策文档，支持上传、处理、替换和删除操作
        </p>
      </div>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">文档管理</TabsTrigger>
          <TabsTrigger value="content">文档内容</TabsTrigger>
          <TabsTrigger value="index">索引状态</TabsTrigger>
        </TabsList>

        {/* 文档管理 */}
        <TabsContent value="documents" className="space-y-4">
          {/* 统计卡片 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总文档数</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.totalDocuments || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已索引</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.indexedDocuments || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">待处理</CardTitle>
                <Clock className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.pendingDocuments || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">错误</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.errorDocuments || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* 操作栏 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>文档列表</CardTitle>
                  <CardDescription>
                    管理所有政策文档
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索文档..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    上传文档
                  </Button>
                  <Button variant="outline" onClick={fetchDocuments}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    刷新
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2">加载中...</span>
                </div>
              ) : documentsError ? (
                <div className="text-center text-red-500 py-8">
                  {documentsError}
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无文档，点击"上传文档"按钮添加第一个文档
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>文档名称</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>标签</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>统计</TableHead>
                      <TableHead>更新时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.documentId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {doc.displayName}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {doc.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {doc.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-secondary rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.status)}
                              <span className="text-sm">{getStatusText(doc.status)}</span>
                            </div>
                            {doc.status === 'error' && doc.error && (
                              <div className="text-xs text-red-500 max-w-md truncate" title={doc.error.message}>
                                错误: {doc.error.message}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {doc.statistics.totalPages > 0 && (
                              <div>{doc.statistics.totalPages} 页</div>
                            )}
                            {doc.statistics.totalChunks > 0 && (
                              <div>{doc.statistics.indexedChunks}/{doc.statistics.totalChunks} chunks</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(doc.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {doc.status === 'pending' || doc.status === 'error' ? (
                              <Button
                                size="sm"
                                onClick={() => handleProcess(doc.documentId)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                处理
                              </Button>
                            ) : null}
                            {doc.status === 'indexed' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewChunks(doc)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  查看
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedDocument(doc)
                                    setReplaceDialogOpen(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  替换
                                </Button>
                              </>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(doc.documentId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 文档内容 */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>文档内容</CardTitle>
                  <CardDescription>
                    查看已处理文档的三个生成文件
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={fetchProcessedDocuments}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {processedDocsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2">加载中...</span>
                </div>
              ) : processedDocuments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无已处理的文档
                </div>
              ) : (
                <div className="space-y-4">
                  {processedDocuments.map((doc) => (
                    <Card key={doc.name}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{doc.name}</CardTitle>
                          {doc.stats && (
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>{doc.stats.totalPages} 页</span>
                              <span>{doc.stats.totalChunks} chunks</span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* student_handbook_full.json */}
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {doc.files.student_handbook_full ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              )}
                              <div>
                                <p className="font-medium">student_handbook_full.json</p>
                                <p className="text-xs text-muted-foreground">
                                  提取的完整文档内容
                                </p>
                              </div>
                            </div>
                            {doc.files.student_handbook_full && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewFileContent(doc.documentId, doc.name, 'student_handbook_full')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                查看
                              </Button>
                            )}
                          </div>

                          {/* document_chunks.json */}
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {doc.files.document_chunks ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              )}
                              <div>
                                <p className="font-medium">document_chunks.json</p>
                                <p className="text-xs text-muted-foreground">
                                  文档分块数据
                                </p>
                              </div>
                            </div>
                            {doc.files.document_chunks && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewFileContent(doc.documentId, doc.name, 'document_chunks')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                查看
                              </Button>
                            )}
                          </div>

                          {/* embedding_cache.json */}
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {doc.files.embedding_cache ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              )}
                              <div>
                                <p className="font-medium">embedding_cache.json</p>
                                <p className="text-xs text-muted-foreground">
                                  向量缓存数据
                                </p>
                              </div>
                            </div>
                            {doc.files.embedding_cache && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewFileContent(doc.documentId, doc.name, 'embedding_cache')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                查看
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 索引状态 */}
        <TabsContent value="index" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>统一索引状态</CardTitle>
              <CardDescription>
                查看所有已索引文档的整体情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              {indexStatus ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">已索引文档</p>
                        <p className="text-2xl font-bold">{indexStatus.totalDocuments}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">总chunks数</p>
                        <p className="text-2xl font-bold">{indexStatus.totalChunks}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">已索引文档列表</h3>
                    <div className="space-y-2">
                      {indexStatus.documents.map((doc) => (
                        <div
                          key={doc.documentId}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                ID: {doc.documentId}
                              </p>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(doc.indexedAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  加载中...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 上传对话框 */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>上传新政策文档</DialogTitle>
            <DialogDescription>
              上传新的政策文档，系统将自动处理并添加到知识库中
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">选择文件</Label>
              <Input
                id="file"
                type="file"
                accept=".docx,.doc,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    // 自动提取文件名（不含扩展名）作为文档名称
                    const fileName = file.name;
                    const lastDot = fileName.lastIndexOf('.');
                    const baseName = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
                    setUploadForm({
                      ...uploadForm,
                      file,
                      name: uploadForm.name || baseName  // 仅在名称为空时自动填充
                    });
                  } else {
                    setUploadForm({
                      ...uploadForm,
                      file: null
                    });
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                支持 .docx, .doc, .pdf 格式，最大50MB
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">文档名称</Label>
              <Input
                id="name"
                placeholder="例如：奖学金评定办法"
                value={uploadForm.name}
                onChange={(e) => setUploadForm({
                  ...uploadForm,
                  name: e.target.value
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">文档描述</Label>
              <Textarea
                id="description"
                placeholder="简要描述文档内容..."
                value={uploadForm.description}
                onChange={(e) => setUploadForm({
                  ...uploadForm,
                  description: e.target.value
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">标签</Label>
              <Input
                id="tags"
                placeholder="用逗号分隔，例如：奖学金,评定,奖励"
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({
                  ...uploadForm,
                  tags: e.target.value
                })}
              />
              <p className="text-xs text-muted-foreground">
                用逗号分隔多个标签
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setUploadDialogOpen(false)
              resetUploadForm()
            }}>
              取消
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  上传
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 替换对话框 */}
      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>替换文档</DialogTitle>
            <DialogDescription>
              为 "{selectedDocument?.displayName}" 上传新版本，需要重新处理
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="replace-file">选择新文件</Label>
              <Input
                id="replace-file"
                type="file"
                accept=".docx,.doc,.pdf"
                onChange={(e) => setUploadForm({
                  ...uploadForm,
                  file: e.target.files?.[0] || null
                })}
              />
              <p className="text-xs text-muted-foreground">
                旧文件将被备份到archive目录
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setReplaceDialogOpen(false)
              resetUploadForm()
            }}>
              取消
            </Button>
            <Button
              onClick={() => selectedDocument && handleReplace(selectedDocument.documentId)}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  替换中...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  替换
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chunks查看对话框 */}
      <Dialog open={chunksDialogOpen} onOpenChange={setChunksDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>文档Chunks - {selectedDocument?.displayName}</DialogTitle>
            <DialogDescription>
              {selectedDocument?.statistics.totalChunks} 个文档块
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedChunks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                暂无chunks数据
              </div>
            ) : (
              <div className="space-y-2">
                {selectedChunks.map((chunk) => (
                  <div key={chunk.chunkId} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-medium">
                        Chunk #{chunk.chunkId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        第{chunk.page}页
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setChunksDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 文件内容查看对话框 */}
      <Dialog open={fileContentDialogOpen} onOpenChange={setFileContentDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFileContent?.type === 'student_handbook_full' && '文档完整内容'}
              {selectedFileContent?.type === 'document_chunks' && '文档分块数据'}
              {selectedFileContent?.type === 'embedding_cache' && '向量缓存数据'}
              {' - '}{selectedFileContent?.documentName}
            </DialogTitle>
            <DialogDescription>
              {selectedFileContent?.type === 'student_handbook_full' && '提取的完整文档内容，包含所有页面信息'}
              {selectedFileContent?.type === 'document_chunks' && '文档分块后的数据，包含章节和页码信息'}
              {selectedFileContent?.type === 'embedding_cache' && '向量缓存数据，用于加速检索'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedFileContent?.type === 'student_handbook_full' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">总chunks数</p>
                    <p className="text-2xl font-bold">{selectedFileContent.content.totalChunks || selectedFileContent.content.chunks?.length || 0}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">总字符数</p>
                    <p className="text-2xl font-bold">
                      {selectedFileContent.content.totalCharacters?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">来源</p>
                    <p className="text-sm font-medium">统一索引</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Chunks预览</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedFileContent.content.chunks?.slice(0, 10).map((chunk: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Chunk #{index + 1}</span>
                          <span className="text-xs text-muted-foreground">
                            第{chunk.metadata?.page || chunk.page || 1}页 | {chunk.text?.length || 0}字符
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {chunk.preview || chunk.text?.substring(0, 200)}...
                        </p>
                      </div>
                    )) || <div className="text-center text-muted-foreground">暂无数据</div>}
                  </div>
                  {selectedFileContent.content.chunks?.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      还有 {selectedFileContent.content.chunks.length - 10} 个chunks未显示...
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedFileContent?.type === 'document_chunks' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">总chunks数</p>
                    <p className="text-2xl font-bold">{selectedFileContent.content.length || 0}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">总字符数</p>
                    <p className="text-2xl font-bold">
                      {selectedFileContent.content.reduce((sum: number, chunk: any) => sum + (chunk.text?.length || 0), 0).toLocaleString() || 0}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Chunks预览</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedFileContent.content.slice(0, 20).map((chunk: any, index: number) => (
                      <div key={chunk.id || index} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium">Chunk #{chunk.id || index + 1}</span>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>第{chunk.page_num}页</span>
                            {chunk.chapter_title && (
                              <span className="max-w-32 truncate">{chunk.chapter_title}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {chunk.text?.substring(0, 150) || '(空内容)'}...
                        </p>
                      </div>
                    )) || <div className="text-center text-muted-foreground">暂无chunks数据</div>}
                  </div>
                  {selectedFileContent.content.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      还有 {selectedFileContent.content.length - 20} 个chunks未显示...
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedFileContent?.type === 'embedding_cache' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">缓存向量数</p>
                    <p className="text-2xl font-bold">{Array.isArray(selectedFileContent.content) ? selectedFileContent.content.length : 0}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">向量维度</p>
                    <p className="text-2xl font-bold">
                      {Array.isArray(selectedFileContent.content) && selectedFileContent.content[0]?.embeddingLength || 0}
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">模型</p>
                    <p className="text-sm font-medium">本地Python Embedding</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">缓存条目预览</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {Array.isArray(selectedFileContent.content) ? selectedFileContent.content.slice(0, 15).map((item: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-sm truncate flex-1">
                            {item.text?.substring(0, 80)}...
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {item.embeddingLength || 0} 维
                          </span>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>第{item.page_num || 1}页</span>
                          {item.hasEmbedding && <span className="text-green-500">已向量化</span>}
                        </div>
                      </div>
                    )) : <div className="text-center text-muted-foreground">暂无缓存数据</div>}
                  </div>
                  {Array.isArray(selectedFileContent.content) && selectedFileContent.content.length > 15 && (
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      还有 {selectedFileContent.content.length - 15} 个缓存条目未显示...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              // 导出为JSON文件
              if (selectedFileContent) {
                const blob = new Blob([JSON.stringify(selectedFileContent.content, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${selectedFileContent.documentName}_${selectedFileContent.type}.json`
                a.click()
                URL.revokeObjectURL(url)
              }
            }}>
              导出JSON
            </Button>
            <Button onClick={() => setFileContentDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
