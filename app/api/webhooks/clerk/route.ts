import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  const body = await req.text()

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses && email_addresses.length > 0 ? email_addresses[0].email_address : 'Sin correo'

    // Asignar el rol por defecto en la BD de Clerk
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()
    await client.users.updateUserMetadata(id as string, {
      publicMetadata: {
        role: 'Estudiante' // Asignación explícita
      }
    })

    // Importación dinámica requerida al ser ruta de Edge o API
    const { AddStudentHandler } = await import('@/application/command/AddStudentHandler')
    const handler = new AddStudentHandler()
    await handler.handle({
      clerkId: id as string,
      firstName: first_name as string | null,
      lastName: last_name as string | null,
      email: email
    })

    console.log(`[WEBHOOK] Estudiante creado en la DB Local y Clerk: ${first_name} ${last_name}`)
  }

  return new Response('', { status: 200 })
}
