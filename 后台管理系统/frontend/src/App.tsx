import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<StudentManager />} />
            <Route path="/teachers" element={<TeacherManager />} />
            <Route path="/courses" element={<CourseManager />} />
            <Route path="/policy-documents" element={<PolicyDocuments />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
