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
    if (newPage < 1 || newPage > totalPages) return;
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
                          {student.email && <MaskedEmail email={student.email} />}
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

function MaskedEmail({ email }: { email: string }) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (secondsLeft <= 0) return

    const timer = setTimeout(() => {
      setSecondsLeft(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [secondsLeft])

  const isRevealed = secondsLeft > 0
  // Creamos el texto enmascarado con caracteres '*' con la misma longitud que el email
  const maskedText = "*".repeat(email.length)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-0.5">
      <div className="flex items-center gap-2">
        <span
          className={`text-sm ${isRevealed
              ? "text-zinc-600 dark:text-zinc-300 select-all font-medium"
              : "text-zinc-400 dark:text-zinc-500 font-mono tracking-wider select-none"
            }`}
        >
          {isRevealed ? email : maskedText}
        </span>
        <button
          onClick={() => setSecondsLeft(isRevealed ? 0 : 5)}
          className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none transition-colors cursor-pointer"
          title={isRevealed ? "Ocultar correo" : "Visualizar correo por 5 segundos"}
          aria-label={isRevealed ? "Ocultar correo" : "Visualizar correo"}
        >
          {isRevealed ? (
            // Ojo tachado (ocultar)
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            // Ojo abierto (mostrar)
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          )}
        </button>
      </div>
      {isRevealed && (
        <span className="text-xs text-yellow-600 dark:text-yellow-500 font-medium select-none animate-pulse">
          El mail se ocultará en {secondsLeft}s
        </span>
      )}
    </div>
  )
}