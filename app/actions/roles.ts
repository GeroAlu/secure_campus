'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { getPermissionsForRole } from '../utils/permissions'

export async function hasPermission(requiredPermission: string) {
    const { userId } = await auth()
    if (!userId) return false
    
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    
    const role = user.publicMetadata?.role as string | null
    const userPermissions = getPermissionsForRole(role)
    
    return userPermissions.includes(requiredPermission) || userPermissions.includes('*')
}

export async function getUsers() {
    try {
        const canManageRoles = await hasPermission('manage:roles')
        if (!canManageRoles) throw new Error("Unauthorized")

        const client = await clerkClient()
        const users = await client.users.getUserList({ limit: 100 })
        
        return users.data.map(user => {
            const role = (user.publicMetadata.role as string) || 'Estudiante'
            return {
                id: user.id,
                email: user.emailAddresses[0]?.emailAddress || 'Sin email',
                firstName: user.firstName,
                lastName: user.lastName,
                role: role,
                permissions: getPermissionsForRole(role)
            }
        })
    } catch (e) {
        console.error('Error fetching users:', e)
        return []
    }
}

export async function setRole(targetUserId: string, targetRole: string) {
    try {
        const { userId: myId } = await auth()
        if (!myId) throw new Error("Unauthenticated")

        // 1. Verificación universal: no puedes editarte a ti mismo
        if (myId === targetUserId) throw new Error("Cannot edit yourself")

        const canManageRoles = await hasPermission('manage:roles')
        if (!canManageRoles) throw new Error("Unauthorized")

        const client = await clerkClient()
        
        // 2. Verificación PBAC: ¿El objetivo ya es un administrador?
        const targetUser = await client.users.getUser(targetUserId)
        const targetCurrentRole = targetUser.publicMetadata?.role as string | null
        const targetCurrentPermissions = getPermissionsForRole(targetCurrentRole)
        
        if (targetCurrentPermissions.includes('manage:roles') || targetCurrentPermissions.includes('*')) {
            throw new Error("Cannot modify a user who possesses the manage:roles permission")
        }

        await client.users.updateUserMetadata(targetUserId, {
            publicMetadata: {
                role: targetRole
            }
        })
        return { success: true }
    } catch (e) {
        console.error('Error updating role:', e)
        return { success: false }
    }
}
