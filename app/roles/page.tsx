'use client'

import { useEffect, useState } from 'react'
import { getUsers, setRole } from '../actions/roles'
import { useUser } from '@clerk/nextjs'
import { getPermissionsForRole } from '../utils/permissions'

type UserInfo = {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    permissions: string[];
}

export default function RolesPage() {
    const { user: currentUser, isLoaded } = useUser()
    const [users, setUsers] = useState<UserInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<string>('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchUsers = async () => {
        const data = await getUsers()
        setUsers(data as UserInfo[])
        setLoading(false)
    }

    useEffect(() => {
        const loadData = async () => {
            if (isLoaded && currentUser) {
                const role = currentUser.publicMetadata.role as string | undefined;
                const perms = getPermissionsForRole(role);
                if (perms.includes("manage:roles") || perms.includes("*")) {
                    await fetchUsers();
                }
            }
        };
        loadData();
    }, [isLoaded, currentUser])

    const startEditing = (user: UserInfo) => {
        setEditingUserId(user.id);
        setSelectedRoleForEdit(user.role);
    }

    const cancelEditing = () => {
        setEditingUserId(null);
        setSelectedRoleForEdit('');
        setErrorMsg(null);
    }

    const saveRoleAction = async (userId: string, currentRole: string) => {
        if (selectedRoleForEdit === currentRole) {
            cancelEditing();
            return;
        }

        setUpdatingId(userId);
        setEditingUserId(null);
        setErrorMsg(null);

        const result = await setRole(userId, selectedRoleForEdit)
        if (!result.success) {
            setErrorMsg("No tienes permisos para modificar a este usuario.");
        }

        await fetchUsers()
        setUpdatingId(null);
    }

    const isEditable = (targetUser: UserInfo) => {
        if (!currentUser) return false;
        // No editarse a sí mismo
        if (currentUser.id === targetUser.id) return false;
        // No editar a alguien que tenga rango mayor
        if (targetUser.permissions.includes("manage:roles") || targetUser.permissions.includes("*")) return false;

        return true;
    }

    const userRole = currentUser?.publicMetadata?.role as string | undefined;
    const permissions = currentUser ? getPermissionsForRole(userRole) : [];
    const canManageRoles = permissions.includes("manage:roles") || permissions.includes("*");

    if (!isLoaded || (canManageRoles && loading)) {
        return (
            <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 h-full w-full">
                <div className="w-8 h-8 rounded-full border-4 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
            </main>
        )
    }

    if (!canManageRoles) {
        return (
            <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 h-full w-full">
                <div className="flex flex-col items-center justify-center max-w-md p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 flex items-center justify-center rounded-full mb-4">
                        <svg className="w-8 h-8 text-red-600 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Acceso Denegado</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Solo los directivos o administradores pueden acceder a la gestión de roles de la institución.
                    </p>
                </div>
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
                        Asigna roles predefinidos a los usuarios. Los permisos se adaptarán automáticamente.
                    </p>
                    {errorMsg && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-600 rounded">
                            {errorMsg}
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {users.map((user) => (
                            <li key={user.id} className="p-4 sm:p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                                {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.firstName} {user.lastName}</p>
                                            {user.email && <MaskedEmail email={user.email} />}
                                        </div>
                                    </div>
                                    <div>
                                        {editingUserId === user.id ? (
                                            <div className="flex gap-2 items-center">
                                                <select
                                                    value={selectedRoleForEdit}
                                                    onChange={(e) => setSelectedRoleForEdit(e.target.value)}
                                                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-sm rounded-md border-r-8 border-transparent outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 cursor-pointer text-zinc-900 dark:text-zinc-100"
                                                >
                                                    <option value="Estudiante">Estudiante</option>
                                                    <option value="Auxiliar docente">Auxiliar docente</option>
                                                    <option value="Docente">Docente</option>
                                                    <option value="Administrador">Administrador</option>
                                                </select>
                                                <button
                                                    onClick={() => saveRoleAction(user.id, user.role)}
                                                    className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-sm rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                                                >
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={cancelEditing}
                                                    className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-4 items-center">
                                                <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-700">
                                                    {user.role}
                                                </span>
                                                {isEditable(user) ? (
                                                    <button
                                                        disabled={updatingId === user.id}
                                                        onClick={() => startEditing(user)}
                                                        className="px-4 py-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                                                    >
                                                        {updatingId === user.id ? 'Actualizando...' : 'Editar rol'}
                                                    </button>
                                                ) : (
                                                    <span className="px-4 py-1.5 text-zinc-400 text-sm italic">Protegido</span>
                                                )}
                                            </div>
                                        )}
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
                    className={`text-xs ${isRevealed
                            ? "text-zinc-500 dark:text-zinc-400 select-all font-medium"
                            : "text-zinc-400 dark:text-zinc-500 font-mono tracking-wider select-none"
                        }`}
                >
                    {isRevealed ? email : maskedText}
                </span>
                <button
                    onClick={() => setSecondsLeft(isRevealed ? 0 : 5)}
                    className="p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none transition-colors cursor-pointer"
                    title={isRevealed ? "Ocultar correo" : "Visualizar correo por 5 segundos"}
                    aria-label={isRevealed ? "Ocultar correo" : "Visualizar correo"}
                >
                    {isRevealed ? (
                        // Ojo tachado (ocultar)
                        <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                    ) : (
                        // Ojo abierto (mostrar)
                        <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                    )}
                </button>
            </div>
            {isRevealed && (
                <span className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-500 font-medium select-none animate-pulse">
                    El mail se ocultará en {secondsLeft}s
                </span>
            )}
        </div>
    )
}

