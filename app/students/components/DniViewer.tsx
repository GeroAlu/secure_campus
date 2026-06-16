'use client'

import { useState } from 'react'

interface DniViewerProps {
    studentId: string
}

export function DniViewer({ studentId }: DniViewerProps) {
    const [dni, setDni] = useState<string | null>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const showDni = async () => {
        if (isVisible) {
            setIsVisible(false)
            setDni(null)
            setError(null)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/student/${studentId}/dni`)
            
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('No tenés permiso para ver el DNI')
                }
                throw new Error('Error al obtener DNI')
            }

            const data = await response.json()
            setDni(data.dni)
            setIsVisible(true)

            // Ocultar automáticamente después de 5 segundos
            setTimeout(() => {
                setIsVisible(false)
                setDni(null)
            }, 5000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido')
            setTimeout(() => setError(null), 3000)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">DNI:</span>
            
            {isVisible && dni ? (
                <span className="font-mono text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 px-2 py-0.5 rounded border border-yellow-300 dark:border-yellow-700">
                    {dni}
                </span>
            ) : (
                <span className="text-sm text-zinc-400 dark:text-zinc-500 tracking-wider select-none font-mono">••••••••</span>
            )}

            <button
                onClick={showDni}
                disabled={isLoading}
                className={`
                    p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    ${error ? 'text-red-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}
                `}
                title={isVisible ? 'Ocultar DNI' : 'Mostrar DNI (5 segundos)'}
            >
                {isLoading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : isVisible ? (
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                )}
            </button>

            {error && (
                <span className="text-xs text-red-500 dark:text-red-400">{error}</span>
            )}

            {isVisible && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 animate-pulse select-none">
                    (oculta en 5s)
                </span>
            )}
        </div>
    )
}
