'use server'

import { clerkClient } from '@clerk/nextjs/server'
import pool from '@/lib/db'

/**
 * Garantiza que el usuario autenticado en Clerk exista en la base de datos de Supabase.
 * Se ejecuta pasivamente en la carga inicial de la aplicación.
 */
export async function ensureUserSynced(userId: string) {
  try {
    // 1. Verificar si el usuario ya existe en Supabase
    const dbUserRes = await pool.query(
      'SELECT id, role FROM public.users WHERE clerk_id = $1',
      [userId]
    )

    if (dbUserRes.rowCount !== null && dbUserRes.rowCount > 0) {
      // Ya existe en la base de datos local
      return
    }

    // 2. Si no existe en Supabase, obtener los detalles desde Clerk
    const client = await clerkClient()
    const user = await client.users.getUser(userId)

    const email = user.emailAddresses[0]?.emailAddress
    if (!email) {
      console.warn(`[Sync] El usuario ${userId} no tiene un correo electrónico en Clerk. Sincronización omitida.`);
      return
    }

    const firstName = user.firstName || ''
    const lastName = user.lastName || ''
    let role = user.publicMetadata?.role as string | undefined

    // Si no tiene rol asignado en Clerk, se le asigna 'Estudiante'
    if (!role) {
      role = 'Estudiante'
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: 'Estudiante'
        }
      })
      console.log(`[Sync] Asignado rol 'Estudiante' en Clerk para el usuario: ${email}`)
    }

    // 3. Guardar el usuario en la base de datos de Supabase
    await pool.query(
      `INSERT INTO public.users (clerk_id, first_name, last_name, email, role) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (email) DO UPDATE SET 
         clerk_id = EXCLUDED.clerk_id,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         role = EXCLUDED.role;`,
      [userId, firstName, lastName, email, role]
    )
    console.log(`[Sync] Usuario ${email} sincronizado con éxito en Supabase`)
  } catch (error) {
    console.error(`[Sync] Error al sincronizar el usuario ${userId}:`, error)
  }
}
