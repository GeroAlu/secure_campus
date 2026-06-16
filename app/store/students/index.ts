import { create } from 'zustand'
import { Student, StudentsStore } from './types'

export const useStudentsStore = create<StudentsStore>()(
  (set) => ({
    students: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    
    setStudents: (students: Student[]) => set({ students }),
    setPagination: (currentPage: number, totalPages: number, totalItems: number) => set({ currentPage, totalPages, totalItems }),
    updateStudentDetail: (studentId: string, detail: string) =>
      set(state => ({
        students: state.students.map(s =>
          s.id === studentId ? { ...s, detail } : s
        ),
      })),
  }),
)

export type { Student }
