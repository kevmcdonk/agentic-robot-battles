'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/robots', label: 'Robots' },
  { href: '/battles', label: 'Battles' },
  { href: '/leagues', label: 'Leagues' },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AuthenticatedNav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status !== 'authenticated') {
    return null;
  }

  if (pathname === '/') {
    return null;
  }

  const user = session?.user as { roles?: string[] } | undefined;
  const isAdmin = user?.roles?.includes('admin') ?? false;
  const navItems = isAdmin
    ? [...NAV_ITEMS, { href: '/admin', label: 'Admin' }]
    : NAV_ITEMS;

  return (
    <header className="sticky top-0 z-40 border-b border-[#3a3a3a] bg-[#141414]/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-8" aria-label="Primary">
        <Link href="/dashboard" className="arena-heading text-sm tracking-widest text-[#FFD700] hover:text-[#FF6B00] focus:outline-none focus:underline">
          AGENTIC ROBOT BATTLES
        </Link>
        <ul className="flex items-center gap-2 sm:gap-3">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700] ${
                    active
                      ? 'bg-[#FFD700] text-[#1a1a1a]'
                      : 'text-[#8a9aa8] hover:bg-[#2a2a2a] hover:text-[#FFD700]'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}