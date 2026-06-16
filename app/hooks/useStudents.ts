import { useCallback } from 'react'
import { useStudentsStore } from '@/app/store/students'
import { useStudentApi } from '@/app/lib/clients/useStudentApi'

export const useStudents = () => {
  
    const { setStudents, setPagination, updateStudentDetail, updateStudentActive } = useStudentsStore()
    const { getStudentsList, updateStudentDetail: apiUpdateDetail, updateStudentActive: apiUpdateActive } = useStudentApi()

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

    const toggleStudentActive = useCallback(async (studentId: string, active: boolean) => {
        await apiUpdateActive(studentId, active)
        updateStudentActive(studentId, active)
    }, [apiUpdateActive, updateStudentActive])

    return {
        fetchStudents,
        editStudentDetail,
        toggleStudentActive
    }
}