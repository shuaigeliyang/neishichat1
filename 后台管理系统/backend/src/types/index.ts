export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
}

export interface Student {
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

export interface Teacher {
  teacher_id: number
  teacher_code: string
  name: string
  gender: string
  college_id: number
  phone?: string
  email?: string
  title: string
  college_name?: string
}

export interface Course {
  course_id: number
  course_code: string
  course_name: string
  teacher_id: number
  college_id: number
  credits: number
  semester: string
  teacher_name?: string
  college_name?: string
}

export interface College {
  college_id: number
  college_code: string
  college_name: string
  dean_name?: string
  phone?: string
  email?: string
}

export interface Major {
  major_id: number
  major_code: string
  major_name: string
  college_id: number
  degree_type: string
  college_name?: string
}

export interface Class {
  class_id: number
  class_code: string
  class_name: string
  major_id: number
  enrollment_year: number
  student_count?: number
  major_name?: string
  college_name?: string
}

export interface AdminUser {
  id: number
  username: string
  password_hash: string
  role: 'admin' | 'superadmin'
  created_at: string
}
