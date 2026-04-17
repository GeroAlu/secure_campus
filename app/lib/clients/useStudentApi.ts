'use client'

import { api } from '@/app/lib/api'
import { GetStudentsListResponse } from '@/application/query/GetStudentsListHandler'

const BASE_URL = '/api/student/list'

import { useCallback } from 'react'

export const useStudentApi = () => {
    const getStudentsList = useCallback(async (page: number = 1): Promise<GetStudentsListResponse> => {
        return api.get<GetStudentsListResponse>(`${BASE_URL}?page=${page}`)
    }, [])

    return {
        getStudentsList
    }
}