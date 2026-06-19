'use server'

import { clerkClient } from '@clerk/nextjs/server'
import pool, { getEncryptionKey } from '@/lib/db'

export async function ensureUserSynced(userId: string) {
  try {
    const key = getEncryptionKey()

    const dbUserRes = await pool.query(
      'SELECT id, role FROM public.users WHERE clerk_id_hash = encode(digest($1::text, \'sha256\'), \'hex\')',
      [userId]
    )

    if (dbUserRes.rowCount !== null && dbUserRes.rowCount > 0) {
      return
    }

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

    if (!role) {
      role = 'Estudiante'
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: 'Estudiante'
        }
      })
      console.log(`[Sync] Asignado rol 'Estudiante' en Clerk para el usuario: ${email}`)
    }

    await pool.query(
      `INSERT INTO public.users (clerk_id, clerk_id_hash, first_name, last_name, email, email_hash, role) 
       VALUES (
         pgp_sym_encrypt($1::text, $6::text),
         encode(digest($1::text, 'sha256'), 'hex'),
         $2, $3,
         $4::text,
         encode(digest($4::text, 'sha256'), 'hex'),
         $5
       )
       ON CONFLICT (email_hash) DO UPDATE SET 
         clerk_id = pgp_sym_encrypt($1::text, $6::text),
         clerk_id_hash = encode(digest($1::text, 'sha256'), 'hex'),
         first_name = $2,
         last_name = $3,
         email = $4::text,
         email_hash = encode(digest($4::text, 'sha256'), 'hex'),
         role = $5;`,
      [userId, firstName, lastName, email, role, key]
    )
    console.log(`[Sync] Usuario ${email} sincronizado con éxito en Supabase`)
  } catch (error) {
    console.error(`[Sync] Error al sincronizar el usuario ${userId}:`, error)
  }
}
