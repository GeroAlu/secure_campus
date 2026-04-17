"use client"

import { useEffect, useState } from "react"
import { useStudents } from "@/app/hooks/useStudents"
import { useStudentsStore, Student } from "@/app/store/students"
import { useUser } from '@clerk/nextjs'
import { getPermissionsForRole } from "../utils/permissions"

export default function StudentsPage() {
  const { fetchStudents } = useStudents()
  const { students, currentPage, totalPages, totalItems } = useStudentsStore()
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useUser()
  const role = user?.publicMetadata?.role as string | null
  const permissions = getPermissionsForRole(role)

  useEffect(() => {
    const loadStudents = async () => {
      setIsLoading(true)
      try {
        await fetchStudents(1)
      } catch (error) {
        console.error("Error fetching students:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadStudents()
  }, [fetchStudents])

  const handlePageChange = async (newPage: number) => {
      if(newPage < 1 || newPage > totalPages) return;
      setIsLoading(true);
      try {
          await fetchStudents(newPage);
      } catch (error) {
          console.error("Error fetching students:", error);
      } finally {
          setIsLoading(false);
      }
  }

  return (
    <main className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-zinc-950 h-full w-full overflow-hidden">
      <div className="flex flex-col w-full max-w-4xl flex-1 bg-white dark:bg-zinc-900/50 shadow-sm border-x border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Listado de Estudiantes
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Esta es la lista de estudiantes actualmente en el sistema. Total: {totalItems > 0 ? totalItems : '-'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Cargando estudiantes...
            </div>
          ) : students.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400">
              No se encontraron estudiantes.
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full">
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {students.map((student: Student) => (
                  <li key={student.id} className="p-4 sm:p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center"><span className="text-lg font-medium text-zinc-600 dark:text-zinc-300">{student.name.charAt(0).toUpperCase()}</span></div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{student.name}</p>
                          {student.email && <p className="text-sm text-zinc-500 dark:text-zinc-400">{student.email}</p>}
                        </div>
                      </div>
                      {permissions.includes('deactivate:students') && (
                         <button className="text-xs text-red-600 hover:text-red-700 hover:underline">Dar de baja</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 mt-auto">
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        Página <span className="font-medium text-zinc-900 dark:text-zinc-100">{currentPage}</span> de <span className="font-medium text-zinc-900 dark:text-zinc-100">{totalPages}</span>
                    </span>
                    <button 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Siguiente
                    </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}