
export interface Student {
  id: string
  name: string
  email: string
  active: boolean
}

export interface StudentsStore {
  students: Student[]
  currentPage: number
  totalPages: number
  totalItems: number

  setStudents: (students: Student[]) => void
  setPagination: (currentPage: number, totalPages: number, totalItems: number) => void
}