'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut,
  ShieldCheck,
  FileSpreadsheet,
  LayoutDashboard,
  CalendarDays,
  Banknote,
  Settings,
  CreditCard,
  ClipboardList,
  UserCog,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact: boolean
  badge?: number
  pendingOnly?: boolean // shown to pending users
  hiddenFromPending?: boolean // hidden from pending users
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/admin/roster',
    label: 'List of Students',
    icon: FileSpreadsheet,
    exact: false,
  },
  // --- below items are hidden from PENDING accounts ---
  {
    href: '/admin/accounts',
    label: 'Account Management',
    icon: UserCog,
    exact: false,
    hiddenFromPending: true,
  },
  {
    href: '/admin/collection-periods',
    label: 'Collection Periods',
    icon: Banknote,
    exact: false,
    hiddenFromPending: true,
  },
  {
    href: '/admin/events',
    label: 'Events',
    icon: CalendarDays,
    exact: false,
    hiddenFromPending: true,
  },
  {
    href: '/admin/config',
    label: 'Configuration',
    icon: Settings,
    exact: false,
    hiddenFromPending: true,
  },
  {
    href: '/treasurer/claims',
    label: 'Payment Claims',
    icon: CreditCard,
    exact: false,
    hiddenFromPending: true,
  },
  {
    href: '/admin/attendance',
    label: 'Attendance',
    icon: ClipboardList,
    exact: false,
    hiddenFromPending: true,
  },
]

export default function AdminLayoutClient({
  children,
  pendingCount,
}: {
  children: React.ReactNode
  pendingCount: number
}) {
  const { data: session } = useSession()
  const pathname = usePathname()

  const isPending = (session?.user as any)?.status === 'PENDING'
  const isAdmin = (session?.user as any)?.roles?.includes('ADMIN')

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (isPending && item.hiddenFromPending) return false
    return true
  }).map((item) => ({
    ...item,
    badge:
      item.href === '/admin/accounts' && pendingCount > 0
        ? pendingCount
        : undefined,
  }))

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const roleBadge = isPending ? 'Pending' : isAdmin ? 'Admin' : 'Officer'

  return (
    <div className="min-h-screen bg-[var(--bg-cream)] text-[var(--text-primary)] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[var(--brand-100)] bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[var(--brand-500)]" />
          <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
            LICOES Portal
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              isPending
                ? 'bg-amber-50 text-amber-600'
                : 'bg-[var(--brand-50)] text-[var(--brand-600)]'
            }`}
          >
            {roleBadge}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--text-muted)]">
            {session?.user?.email ?? ''}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-xs flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-500)] transition-colors border border-[var(--brand-100)] px-3 py-1.5 rounded-md"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex">
        <aside className="w-60 border-r border-[var(--brand-100)] bg-[var(--surface-alt)] p-4 space-y-1 shrink-0">
          <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)] px-2.5 pb-1 tracking-widest">
            Management
          </p>

          {/* Pending notice */}
          {isPending && (
            <div className="mx-1 mb-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-700 leading-snug">
              Ang iyong account ay naghihintay ng approval. Limited lang ang access mo sa ngayon.
            </div>
          )}

          {visibleItems.map(({ href, label, icon: Icon, exact, badge }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(href, exact)
                  ? 'bg-[var(--brand-500)] text-white'
                  : 'text-[var(--text-muted)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    isActive(href, exact)
                      ? 'bg-white text-[var(--brand-500)]'
                      : 'bg-[var(--brand-500)] text-white'
                  }`}
                >
                  {badge}
                </span>
              )}
            </Link>
          ))}
        </aside>

        <main className="flex-1 p-8 min-w-0">{children}</main>
      </div>
    </div>
  )
}
