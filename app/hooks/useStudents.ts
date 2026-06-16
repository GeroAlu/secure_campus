import { useCallback } from 'react'
import { useStudentsStore } from '@/app/store/students'
import { useStudentApi } from '@/app/lib/clients/useStudentApi'

export const useStudents = () => {
  
    const { setStudents, setPagination, updateStudentDetail } = useStudentsStore()
    const { getStudentsList, updateStudentDetail: apiUpdateDetail } = useStudentApi()

    const fetchStudents = useCallback(async (page: number = 1) => {
        const response = await getStudentsList(page)
        setStudents(response.list)
        if (response.totalPages) {
            setPagination(response.currentPage, response.totalPages, response.totalItems)
        }
    }, [getStudentsList, setStudents, setPagination])

    const editStudentDetail = useCallback(async (studentId: string, detail: string) => {
        await apiUpdateDetail(studentId, detail)
        updateStudentDetail(studentId, detail)
    }, [apiUpdateDetail, updateStudentDetail])

    return {
        fetchStudents,
        editStudentDetail
    }
}