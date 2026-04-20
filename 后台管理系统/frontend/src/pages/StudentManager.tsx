import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dataApi } from '@/lib/api'
import api from '@/lib/api'

interface College {
  college_id: number
  college_name: string
}

interface Major {
  major_id: number
  major_name: string
  college_id: number
}

interface Class {
  class_id: number
  class_name: string
  major_id: number
}

interface Student {
  student_id: number
  student_code: string
  name: string
  gender: string
  class_id: number
  phone?: string
  email?: string
  enrollment_date: string
  status: string
  class_name?: string
  major_name?: string
  college_name?: string
}

export default function StudentManager() {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [data, setData] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    student_code: '',
    name: '',
    gender: '男',
    major_id: '',
    class_id: '',
    phone: '',
    email: '',
    enrollment_date: '',
    status: '在读',
  })

  const [colleges, setColleges] = useState<College[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedCollege, setSelectedCollege] = useState<number | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await dataApi.getStudents({
        page,
        pageSize,
        search: searchQuery || undefined
      })

      if (response.data.success) {
        setData(response.data.data || [])
        setTotal(response.data.total || 0)
      } else {
        setError(response.data.error || '获取数据失败')
        setData([])
        setTotal(0)
      }
    } catch (err: any) {
      console.error('请求失败:', err)
      setError('网络错误')
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchCascadeData = async () => {
    try {
      const [collegesRes, majorsRes, classesRes] = await Promise.all([
        dataApi.getColleges({ pageSize: 100 }),
        dataApi.getMajors({ pageSize: 100 }),
        dataApi.getClasses({ pageSize: 100 }),
      ])

      if (collegesRes.data.success) setColleges(collegesRes.data.data || [])
      if (majorsRes.data.success) setMajors(majorsRes.data.data || [])
      if (classesRes.data.success) setClasses(classesRes.data.data || [])
    } catch (err) {
      console.error('获取级联数据失败:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, searchQuery])

  useEffect(() => {
    if (dialogOpen) {
      fetchCascadeData()
    }
  }, [dialogOpen])

  const resetForm = () => {
    setFormData({
      student_code: '',
      name: '',
      gender: '男',
      major_id: '',
      class_id: '',
      phone: '',
      email: '',
      enrollment_date: new Date().toISOString().split('T')[0],
      status: '在读',
    })
    setEditingStudent(null)
    setSelectedCollege(null)
  }

  const handleAdd = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    const selectedClass = classes.find(c => c.class_id === student.class_id)
    let majorId = ''
    if (selectedClass) {
      majorId = selectedClass.major_id.toString()
      const selectedMajor = majors.find(m => m.major_id === selectedClass.major_id)
      if (selectedMajor) {
        setSelectedCollege(selectedMajor.college_id)
      }
    }
    setFormData({
      student_code: student.student_code,
      name: student.name,
      gender: student.gender,
      major_id: majorId,
      class_id: student.class_id.toString(),
      phone: student.phone || '',
      email: student.email || '',
      enrollment_date: student.enrollment_date ? student.enrollment_date.split('T')[0] : '',
      status: student.status || '在读',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) { alert('请输入姓名'); return }
    if (!formData.student_code.trim()) { alert('请输入学号'); return }
    if (!formData.class_id) { alert('请选择班级'); return }

    try {
      const payload = {
        ...formData,
        class_id: parseInt(formData.class_id as string),
      }

      let response
      if (editingStudent) {
        response = await api.put(`/students/${editingStudent.student_id}`, payload)
      } else {
        response = await api.post('/students', payload)
      }

      if (response.data.success) {
        alert(editingStudent ? '修改成功！' : '新增成功！')
        setDialogOpen(false)
        fetchData()
      } else {
        alert('操作失败：' + (response.data.error || '未知错误'))
      }
    } catch (err: any) {
      alert('操作失败：' + (err.response?.data?.error || err.message))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条数据吗？')) return
    try {
      const response = await api.delete(`/students/${id}`)
      if (response.data.success) {
        alert('删除成功！')
        fetchData()
      } else {
        alert('删除失败：' + (response.data.error || '未知错误'))
      }
    } catch (err: any) {
      alert('删除失败：' + (err.response?.data?.error || err.message))
    }
  }

  const filteredMajors = selectedCollege
    ? majors.filter(m => m.college_id === selectedCollege)
    : majors

  const filteredClasses = filteredMajors.length > 0
    ? classes.filter(c => filteredMajors.some(m => m.major_id === c.major_id))
    : classes

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">学生信息管理</h2>
        <p className="text-muted-foreground">管理学生信息，支持新增、编辑、删除操作（共{total}条数据）</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>学生列表</CardTitle>
          <CardDescription>可以直接在表格中编辑数据，所有修改会实时同步到数据库</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名或学号..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />新增学生
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">错误: {error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2">加载中...</span>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>学号</TableHead>
                      <TableHead>性别</TableHead>
                      <TableHead>班级</TableHead>
                      <TableHead>专业</TableHead>
                      <TableHead>学院</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length > 0 ? (
                      data.map((row) => (
                        <TableRow key={row.student_id}>
                          <TableCell>{row.student_id}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.student_code}</TableCell>
                          <TableCell>{row.gender}</TableCell>
                          <TableCell>{row.class_name}</TableCell>
                          <TableCell>{row.major_name}</TableCell>
                          <TableCell>{row.college_name}</TableCell>
                          <TableCell>{row.status}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="icon" variant="ghost" onClick={() => handleEdit(row)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(row.student_id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          {error ? '数据加载失败' : '暂无数据'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {total > pageSize && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    共 {total} 条数据，第 {page} / {Math.ceil(total / pageSize)} 页
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))} disabled={page >= Math.ceil(total / pageSize)}>下一页</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStudent ? '编辑学生信息' : '新增学生'}</DialogTitle>
            <DialogDescription>请填写学生信息，带*号的是必填项</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student_code">学号 *</Label>
                <Input id="student_code" value={formData.student_code} onChange={(e) => setFormData({ ...formData, student_code: e.target.value })} placeholder="例如: S2024001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">姓名 *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入姓名" />
              </div>
              <div className="space-y-2">
                <Label>性别</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="男">男</SelectItem>
                    <SelectItem value="女">女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="在读">在读</SelectItem>
                    <SelectItem value="休学">休学</SelectItem>
                    <SelectItem value="毕业">毕业</SelectItem>
                    <SelectItem value="退学">退学</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>学院</Label>
                <Select value={selectedCollege?.toString() || ''} onValueChange={(value) => setSelectedCollege(Number(value))}>
                  <SelectTrigger><SelectValue placeholder="请选择学院" /></SelectTrigger>
                  <SelectContent>
                    {colleges.map((c) => <SelectItem key={c.college_id} value={c.college_id.toString()}>{c.college_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>专业</Label>
                <Select value={formData.major_id || ''} onValueChange={(value) => setFormData({ ...formData, major_id: value, class_id: '' })} disabled={!selectedCollege}>
                  <SelectTrigger><SelectValue placeholder={selectedCollege ? "请选择专业" : "请先选择学院"} /></SelectTrigger>
                  <SelectContent>
                    {filteredMajors.map((m) => <SelectItem key={m.major_id} value={m.major_id.toString()}>{m.major_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>班级 *</Label>
                <Select value={formData.class_id} onValueChange={(value) => setFormData({ ...formData, class_id: value })} disabled={!formData.major_id}>
                  <SelectTrigger><SelectValue placeholder={formData.major_id ? "请选择班级" : "请先选择专业"} /></SelectTrigger>
                  <SelectContent>
                    {filteredClasses.map((c) => <SelectItem key={c.class_id} value={c.class_id.toString()}>{c.class_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editingStudent ? '保存' : '新增'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
