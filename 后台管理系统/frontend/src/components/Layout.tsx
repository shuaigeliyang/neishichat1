import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  Settings,
  Menu,
  LogOut,
} from 'lucide-react'
import { Button } from './ui/button'
import { useState } from 'react'

const navigation = [
  { name: '系统概览', href: '/', icon: LayoutDashboard },
  { name: '学生管理', href: '/students', icon: Users },
  { name: '教师管理', href: '/teachers', icon: GraduationCap },
  { name: '课程管理', href: '/courses', icon: BookOpen },
  { name: '文档管理', href: '/policy-documents', icon: FileText },
  { name: '系统设置', href: '/settings', icon: Settings },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="flex h-16 items-center gap-4 px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">教育系统智能体 - 后台管理系统</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 */}
        <aside
          className={cn(
            'sticky top-16 h-[calc(100vh-4rem)] border-r bg-background transition-all',
            sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
          )}
        >
          <nav className="space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* 主内容区域 - 使用 Outlet 渲染子路由 */}
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
