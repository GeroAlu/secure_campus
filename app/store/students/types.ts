
export interface Student {
  id: string
  name: string
  email: string
  active: boolean
  detail?: string | null
}

export interface StudentsStore {
  students: Student[]
  currentPage: number
  totalPages: number
  totalItems: number

  setStudents: (students: Student[]) => void
  setPagination: (currentPage: number, totalPages: number, totalItems: number) => void
  updateStudentDetail: (studentId: string, detail: string) => void
  updateStudentActive: (studentId: string, active: boolean) => void
}