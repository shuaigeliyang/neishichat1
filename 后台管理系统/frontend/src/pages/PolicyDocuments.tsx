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

// ==================== 类型定义 ====================

interface PolicyDocument {
  documentId: string
  name: string
  displayName: string
  description: string
  status: 'pending' | 'processing' | 'indexed' | 'error'
  tags: string[]
  sourceFiles?: {
    fileName: string
    fileType: string
    fileSize: number
    uploadedAt: string
  }[]
  statistics?: {
    totalPages: number
    totalChunks: number
    indexedChunks: number
    fileSize?: number
  }
  indexedAt?: string | null
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

interface ProcessedDocument {
  documentId: string
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

  // 已处理文档
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([])
  const [processedDocsLoading, setProcessedDocsLoading] = useState(false)

  // 上传状态
  const [uploading, setUploading] = useState(false)

  // 对话框状态
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
  const [chunksDialogOpen, setChunksDialogOpen] = useState(false)
  const [fileContentDialogOpen, setFileContentDialogOpen] = useState(false)

  // 选中的文件内容
  const [selectedFileContent, setSelectedFileContent] = useState<any>(null)

  // 选中的文档
  const [selectedDocument, setSelectedDocument] = useState<PolicyDocument | null>(null)
  const [selectedChunks, setSelectedChunks] = useState<any[]>([])

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
      const response = await fetch('/api/documents')
      const result = await response.json()

      if (result.success) {
        const docs = result.data?.documents || []
        setDocuments(docs.map((d: any) => ({
          ...d,
          displayName: d.displayName || d.name,
          tags: d.tags || []
        })))
        setStatistics({
          totalDocuments: result.data?.statistics?.total || result.data?.statistics?.totalDocuments || 0,
          indexedDocuments: result.data?.statistics?.indexed || result.data?.statistics?.indexedDocuments || 0,
          pendingDocuments: result.data?.statistics?.pending || result.data?.statistics?.pendingDocuments || 0,
          errorDocuments: result.data?.statistics?.error || result.data?.statistics?.errorDocuments || 0,
          totalChunks: result.data?.statistics?.totalChunks || 0,
          indexedChunks: result.data?.statistics?.indexedChunks || 0
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
      const response = await fetch('/api/documents/index/status')
      const result = await response.json()

      if (result.success) {
        setIndexStatus(result.data)
      }
    } catch (err: any) {
      console.error('获取索引状态失败:', err)
    }
  }

  // 获取已处理的文档列表
  const fetchProcessedDocuments = async () => {
    setProcessedDocsLoading(true)

    try {
      const response = await fetch('/api/documents')
      const result = await response.json()

      if (result.success) {
        const indexedDocs = (result.data?.documents || [])
          .filter((doc: any) => doc.status === 'indexed')
          .map((doc: any) => ({
            documentId: doc.documentId,
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

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        alert('文档上传成功！')
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
      const response = await fetch(`/api/documents/${documentId}/process`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        alert('文档处理已启动！请稍后刷新查看状态')
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
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        alert('文档删除成功！')
        fetchDocuments()
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
    setSelectedChunks([])

    try {
      const response = await fetch(`/api/documents/${document.documentId}/chunks`)
      const result = await response.json()

      if (result.success && result.data?.chunks) {
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

  // 查看文件内容（文档内容/文档分块/向量缓存）
  const handleViewFileContent = async (
    doc: ProcessedDocument,
    fileType: 'student_handbook_full' | 'document_chunks' | 'embedding_cache'
  ) => {
    setSelectedDocument(doc as any)
    setFileContentDialogOpen(true)
    setSelectedFileContent(null)

    try {
      const response = await fetch(`/api/documents/${doc.documentId}/chunks`)
      const result = await response.json()

      if (result.success) {
        const content = result.data

        // 根据文件类型格式化内容
        if (fileType === 'document_chunks') {
          // 文档分块：展示chunks列表
          const chunks = (content.chunks || []).map((chunk: any, index: number) => ({
            chunkId: chunk.chunkId || index + 1,
            text: chunk.text || chunk.preview || '',
            page: chunk.metadata?.page || chunk.page_num || 1
          }))
          setSelectedFileContent({
            type: 'chunks',
            totalChunks: chunks.length,
            chunks
          })
        } else if (fileType === 'embedding_cache') {
          // 向量缓存：展示统计信息
          setSelectedFileContent({
            type: 'embeddings',
            totalChunks: content.totalChunks || 0,
            indexedChunks: content.totalChunks || 0,
            message: '向量已缓存至向量数据库'
          })
        } else {
          // 文档内容：展示原始内容概览
          setSelectedFileContent({
            type: 'content',
            totalChunks: content.totalChunks || 0,
            totalPages: doc.stats?.totalPages || 0,
            message: '文档内容已提取完成'
          })
        }
      } else {
        setSelectedFileContent({
          type: 'error',
          message: result.error || '获取内容失败'
        })
      }
    } catch (err: any) {
      console.error('获取文件内容失败:', err)
      setSelectedFileContent({
        type: 'error',
        message: err.message || '网络错误'
      })
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

      const response = await fetch(`/api/documents/${documentId}/replace`, {
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

  const resetUploadForm = () => {
    setUploadForm({
      file: null,
      name: '',
      description: '',
      tags: ''
    })
  }

  const startPolling = (documentId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/status`)
        const result = await response.json()

        if (result.success) {
          const status = result.data.status

          if (status === 'indexed' || status === 'error') {
            clearInterval(interval)
            fetchDocuments()
            fetchProcessedDocuments()

            if (status === 'indexed') {
              alert('文档处理完成！')
            } else if (status === 'error') {
              alert('文档处理失败！')
            }
          }
        }
      } catch (err) {
        console.error('轮询状态失败:', err)
      }
    }, 3000)

    setTimeout(() => clearInterval(interval), 300000)
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
  }

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

  const filteredDocuments = documents.filter(doc =>
    (doc.name || doc.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // ==================== 初始化 ====================

  useEffect(() => {
    fetchDocuments()
    fetchIndexStatus()
    fetchProcessedDocuments()

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
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">暂无文档</p>
                  <p className="text-sm">点击"上传文档"按钮添加第一个文档</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>文档名称</TableHead>
                      <TableHead>描述</TableHead>
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
                            {doc.displayName || doc.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {doc.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(doc.status)}
                            <span className="text-sm">{getStatusText(doc.status)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {doc.statistics?.totalPages > 0 && (
                              <div>{doc.statistics.totalPages} 页</div>
                            )}
                            {doc.statistics?.totalChunks > 0 && (
                              <div>{doc.statistics.indexedChunks}/{doc.statistics.totalChunks} chunks</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(doc.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
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
                              <Trash2 className="h-4 w-4 text-red-500" />
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
                    查看已处理文档的生成文件
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
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">暂无已处理的文档</p>
                  <p className="text-sm">请先上传并处理文档</p>
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
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {doc.files.student_handbook_full ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-gray-300" />
                              )}
                              <div>
                                <p className="font-medium">文档内容</p>
                                <p className="text-xs text-muted-foreground">
                                  提取的完整文档内容
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewFileContent(doc, 'student_handbook_full')}
                              disabled={!doc.files.student_handbook_full}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              查看
                            </Button>
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {doc.files.document_chunks ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-gray-300" />
                              )}
                              <div>
                                <p className="font-medium">文档分块</p>
                                <p className="text-xs text-muted-foreground">
                                  文档分块数据
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewFileContent(doc, 'document_chunks')}
                              disabled={!doc.files.document_chunks}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              查看
                            </Button>
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {doc.files.embedding_cache ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-gray-300" />
                              )}
                              <div>
                                <p className="font-medium">向量缓存</p>
                                <p className="text-xs text-muted-foreground">
                                  向量缓存数据
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewFileContent(doc, 'embedding_cache')}
                              disabled={!doc.files.embedding_cache}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              查看
                            </Button>
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
                    {indexStatus.documents.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        暂无已索引的文档
                      </div>
                    ) : (
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
                    )}
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
                  const file = e.target.files?.[0] || null
                  if (file) {
                    const fileName = file.name
                    const lastDot = fileName.lastIndexOf('.')
                    const baseName = lastDot > 0 ? fileName.substring(0, lastDot) : fileName
                    setUploadForm({
                      ...uploadForm,
                      file,
                      name: uploadForm.name || baseName
                    })
                  } else {
                    setUploadForm({
                      ...uploadForm,
                      file: null
                    })
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
              为 "{selectedDocument?.displayName || selectedDocument?.name}" 上传新版本，需要重新处理
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
                旧文件将被备份
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
            <DialogTitle>文档Chunks - {selectedDocument?.displayName || selectedDocument?.name}</DialogTitle>
            <DialogDescription>
              {selectedChunks.length} 个文档块
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedChunks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                加载中...
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
              {selectedFileContent?.type === 'chunks' && '文档分块详情'}
              {selectedFileContent?.type === 'embeddings' && '向量缓存详情'}
              {selectedFileContent?.type === 'content' && '文档内容概览'}
              {selectedFileContent?.type === 'error' && '错误'}
              {selectedDocument?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedFileContent?.type === 'chunks' && `${selectedFileContent.totalChunks} 个分块`}
              {selectedFileContent?.type === 'embeddings' && `${selectedFileContent.indexedChunks} 个向量已缓存`}
              {selectedFileContent?.type === 'content' && `${selectedFileContent.totalPages} 页文档内容`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedFileContent === null ? (
              <div className="text-center text-muted-foreground py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                加载中...
              </div>
            ) : selectedFileContent.type === 'error' ? (
              <div className="text-center text-red-500 py-8">
                <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                <p>{selectedFileContent.message}</p>
              </div>
            ) : selectedFileContent.type === 'chunks' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">共 {selectedFileContent.chunks.length} 个分块</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedFileContent.chunks.reduce((sum: number, c: any) => sum + (c.text?.length || 0), 0).toLocaleString()} 字符
                  </span>
                </div>
                <div className="max-h-[50vh] overflow-y-auto space-y-2">
                  {selectedFileContent.chunks.map((chunk: any) => (
                    <div key={chunk.chunkId} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">分块 #{chunk.chunkId}</span>
                        <span className="text-xs text-muted-foreground">第 {chunk.page} 页</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {chunk.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedFileContent.type === 'embeddings' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-500">
                          {selectedFileContent.indexedChunks}
                        </div>
                        <div className="text-sm text-muted-foreground">已缓存向量</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-500">
                          100%
                        </div>
                        <div className="text-sm text-muted-foreground">缓存率</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">{selectedFileContent.message}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    向量数据已存储至向量数据库，可用于语义检索
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold">
                          {selectedFileContent.totalPages}
                        </div>
                        <div className="text-sm text-muted-foreground">文档页数</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold">
                          {selectedFileContent.totalChunks}
                        </div>
                        <div className="text-sm text-muted-foreground">内容块数</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">{selectedFileContent.message}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    文档内容已成功提取，可用于后续的文档分块和向量化处理
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setFileContentDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
