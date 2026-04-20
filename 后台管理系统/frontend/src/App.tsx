import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StudentManager from './pages/StudentManager'
import TeacherManager from './pages/TeacherManager'
import CourseManager from './pages/CourseManager'
import PolicyDocuments from './pages/PolicyDocuments'
import Settings from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    setIsAuthenticated(!!token)
  }, [])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// 公开路由（已登录则跳转到首页）
function PublicRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    setIsAuthenticated(!!token)
  }, [])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="students" element={<StudentManager />} />
            <Route path="teachers" element={<TeacherManager />} />
            <Route path="courses" element={<CourseManager />} />
            <Route path="policy-documents" element={<PolicyDocuments />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
