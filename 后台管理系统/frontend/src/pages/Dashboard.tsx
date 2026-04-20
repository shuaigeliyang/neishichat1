import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, BookOpen, Users, GraduationCap, Loader2, Building } from 'lucide-react'
import { dataApi } from '@/lib/api'

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  loading?: boolean
}

function StatCard({ title, value, description, icon, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    courses: 0,
    colleges: 0,
    majors: 0,
    classes: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dataApi.getStats()
        if (response.data.success && response.data.data) {
          setStats(response.data.data as typeof stats)
        }
      } catch (error) {
        console.error('获取统计数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">系统概览</h2>
        <p className="text-muted-foreground">
          查看系统整体运行状态和数据统计
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="学生总数"
          value={stats.students}
          description="在校学生数量"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <StatCard
          title="教师总数"
          value={stats.teachers}
          description="在职教师数量"
          icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <StatCard
          title="课程总数"
          value={stats.courses}
          description="开设课程数量"
          icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <StatCard
          title="学院总数"
          value={stats.colleges}
          description="教学学院数量"
          icon={<Building className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <StatCard
          title="专业总数"
          value={stats.majors}
          description="开设专业数量"
          icon={<Database className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        <StatCard
          title="班级总数"
          value={stats.classes}
          description="教学班级数量"
          icon={<Database className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
            <CardDescription>系统最近的操作记录</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">系统启动成功</p>
                  <p className="text-xs text-muted-foreground">刚刚</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">连接到MySQL数据库</p>
                  <p className="text-xs text-muted-foreground">刚刚</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">加载数据统计</p>
                  <p className="text-xs text-muted-foreground">刚刚</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
            <CardDescription>各模块运行状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">前端服务</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  运行中
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">后端API</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  运行中
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">MySQL数据库</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  已连接
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">认证状态</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  已认证
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
