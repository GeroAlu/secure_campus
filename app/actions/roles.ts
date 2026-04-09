'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

async function checkIsAdmin() {
    const { userId } = await auth()
    if (!userId) return false
    
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    return user.publicMetadata?.role === 'Administrador'
}

export async function getUsers() {
    try {
        const isAdmin = await checkIsAdmin()
        if (!isAdmin) throw new Error("Unauthorized")

        const client = await clerkClient()
        const users = await client.users.getUserList({ limit: 100 })
        return users.data.map(user => ({
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress || 'Sin email',
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.publicMetadata.role as string || 'Estudiante',
        }))
    } catch (e) {
        console.error('Error fetching users:', e)
        return []
    }
}

export async function setRole(userId: string, targetRole: string) {
    try {
        const isAdmin = await checkIsAdmin()
        if (!isAdmin) throw new Error("Unauthorized")

        const client = await clerkClient()
        await client.users.updateUserMetadata(userId, {
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
