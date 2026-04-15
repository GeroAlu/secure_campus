"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, UserButton, useAuth, useUser } from '@clerk/nextjs'
import { getPermissionsForRole } from './utils/permissions';

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        }`}
    >
      {children}
    </Link>
  );
};

export function Header() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string | null;
  const permissions = getPermissionsForRole(role);

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md shrink-0 z-20 w-full">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold tracking-wide text-zinc-800 dark:text-zinc-200 uppercase">
          Secure Campus IA
        </h1>
        <nav className="flex items-center gap-2">
          {isSignedIn && (
            <>
              <NavLink href="/">Chat</NavLink>
              <NavLink href="/students">Directorio</NavLink>
              {(permissions.includes('manage:roles') || permissions.includes('*')) && (
                <NavLink href="/roles">Gestión de Usuarios</NavLink>
              )}
            </>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {isLoaded && !isSignedIn && (
          <SignInButton mode="modal">
            <button className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
              Iniciar Sesión
            </button>
          </SignInButton>
        )}
        {isLoaded && isSignedIn && (
          <UserButton />
        )}
      </div>
    </header>
  );
}