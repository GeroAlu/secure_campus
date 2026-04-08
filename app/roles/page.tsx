'use client'

import { useEffect, useState } from 'react'
import { getUsers, setRole } from '../actions/roles'

type UserInfo = {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
}

export default function RolesPage() {
    const [users, setUsers] = useState<UserInfo[]>([])
    const [loading, setLoading] = useState(true)

    const fetchUsers = async () => {
        setLoading(true)
        const data = await getUsers()
        setUsers(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleRoleChange = async (userId: string, currentRole: string, newRole: string) => {
        if(currentRole === newRole) return;
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'Actualizando...' } : u))
        await setRole(userId, newRole)
        fetchUsers()
    }

    if (loading) {
        return (
            <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 h-full w-full">
                <div className="w-8 h-8 rounded-full border-4 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
            </main>
        )
    }

    return (
        <main className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-zinc-950 h-full w-full overflow-hidden">
            <div className="flex flex-col w-full max-w-4xl flex-1 bg-white dark:bg-zinc-900/50 shadow-sm border-x border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        Gestión de Roles
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Desde aquí puedes modificar los niveles de acceso de todos los usuarios registrados en Clerk.
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {users.map((user) => (
                            <li key={user.id} className="p-4 sm:p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                            {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.firstName} {user.lastName}</p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <select 
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, user.role, e.target.value)}
                                            disabled={user.role === 'Actualizando...'}
                                            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-sm rounded-md border-r-8 border-transparent outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 cursor-pointer"
                                        >
                                            {user.role === 'Actualizando...' && <option value="Actualizando...">Actualizando...</option>}
                                            <option value="Estudiante">Estudiante</option>
                                            <option value="Auxiliar docente">Auxiliar docente</option>
                                            <option value="Docente">Docente</option>
                                            <option value="Administrador">Administrador</option>
                                        </select>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </main>
    )
}
