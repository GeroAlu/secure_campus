import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/'])
const isRolesRoute = createRouteMatcher(['/roles(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  // Verificar si es una ruta de roles e impedir acceso si no es admin
  if (isRolesRoute(request)) {
    const sessionClaims = await auth();
    const metadata = sessionClaims.sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
    const role = metadata?.role as string | undefined;
    
    if (role !== 'Administrador') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
