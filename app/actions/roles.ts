'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { getPermissionsForRole } from '../utils/permissions'
import { roleActionSchema } from '../../lib/validation'
import pool, { getEncryptionKey } from '../../lib/db'

export async function hasPermission(requiredPermission: string) {
    const { userId } = await auth()
    if (!userId) return false
    
    const dbUserRes = await pool.query(
      'SELECT role FROM public.users WHERE clerk_id_hash = encode(digest($1::text, \'sha256\'), \'hex\')',
      [userId]
    )
    if (dbUserRes.rowCount === null || dbUserRes.rowCount === 0) {
      return false
    }
    
    const role = dbUserRes.rows[0].role
    const userPermissions = getPermissionsForRole(role)
    
    return userPermissions.includes(requiredPermission) || userPermissions.includes('*')
}

export async function getUsers() {
    try {
        const canManageRoles = await hasPermission('manage:roles')
        if (!canManageRoles) throw new Error("Unauthorized")

        const key = getEncryptionKey()
        const usersResult = await pool.query(
            `SELECT 
                pgp_sym_decrypt(clerk_id, $1::text)::text AS clerk_id,
                first_name,
                last_name,
                email,
                role
             FROM public.users
             ORDER BY created_at DESC`,
            [key]
        )
        
        return usersResult.rows.map(row => {
            const role = row.role || 'Estudiante'
            return {
                id: row.clerk_id || '',
                email: row.email || 'Sin email',
                firstName: row.first_name,
                lastName: row.last_name,
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
        const parsed = roleActionSchema.safeParse({ targetUserId, targetRole })
        if (!parsed.success) {
            throw new Error(`Invalid arguments: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`)
        }

        const { userId: myId } = await auth()
        if (!myId) throw new Error("Unauthenticated")

        if (myId === parsed.data.targetUserId) throw new Error("Cannot edit yourself")

        const canManageRoles = await hasPermission('manage:roles')
        if (!canManageRoles) throw new Error("Unauthorized")

        const client = await clerkClient()
        
        const targetUserRes = await pool.query(
            `SELECT role FROM public.users WHERE clerk_id_hash = encode(digest($1::text, 'sha256\'), \'hex\')`,
            [parsed.data.targetUserId]
        )
        
        if (targetUserRes.rowCount !== null && targetUserRes.rowCount > 0) {
            const targetCurrentRole = targetUserRes.rows[0].role
            const targetCurrentPermissions = getPermissionsForRole(targetCurrentRole)
            
            if (targetCurrentPermissions.includes('manage:roles') || targetCurrentPermissions.includes('*')) {
                throw new Error("Cannot modify a user who possesses the manage:roles permission")
            }
        }

        await pool.query(
            `UPDATE public.users SET role = $1 WHERE clerk_id_hash = encode(digest($2::text, 'sha256\'), \'hex\')`,
            [parsed.data.targetRole, parsed.data.targetUserId]
        )

        await client.users.updateUserMetadata(parsed.data.targetUserId, {
            publicMetadata: {
                role: parsed.data.targetRole
            }
        })
        return { success: true }
    } catch (e) {
        console.error('Error updating role:', e)
        return { success: false }
    }
}
