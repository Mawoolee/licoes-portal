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
  QrCode,
} from 'lucide-react'

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/admin/collection-periods',
    label: 'Collection Periods',
    icon: Banknote,
    exact: false,
  },
  {
    href: '/admin/roster',
    label: 'Student Roster',
    icon: FileSpreadsheet,
    exact: false,
  },
  {
    href: '/admin/events',
    label: 'Events',
    icon: CalendarDays,
    exact: false,
  },
  {
    href: '/admin/config',
    label: 'Configuration',
    icon: Settings,
    exact: false,
  },
  {
    href: '/treasurer/claims',
    label: 'Payment Claims',
    icon: CreditCard,
    exact: false,
  },
  {
    href: '/attendance',
    label: 'Attendance Scanner',
    icon: QrCode,
    exact: false,
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-cream)] text-[var(--text-primary)] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[var(--brand-100)] bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[var(--brand-500)]" />
          <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">LICOES Portal</span>
          <span className="text-xs bg-[var(--brand-50)] text-[var(--brand-600)] font-semibold px-2 py-0.5 rounded">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--text-muted)]">
            {session?.user?.email ?? 'admin@dwcl.edu.ph'}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
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
          {navItems.map(({ href, label, icon: Icon, exact }) => (
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
              {label}
            </Link>
          ))}
        </aside>

        <main className="flex-1 p-8 min-w-0">{children}</main>
      </div>
    </div>
  )
}
