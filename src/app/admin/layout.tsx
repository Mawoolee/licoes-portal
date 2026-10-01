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
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Header */}
      <header className="border-b bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-violet-600" />
          <span className="font-bold text-lg tracking-tight">LICOES Portal</span>
          <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            {session?.user?.email ?? 'admin@dwcl.edu.ph'}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs flex items-center gap-1 text-slate-600 hover:text-red-600 transition-colors border px-3 py-1.5 rounded-md border-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex">
        <aside className="w-60 border-r bg-white dark:bg-slate-900 p-4 space-y-1 shrink-0">
          <p className="text-[10px] font-semibold uppercase text-slate-400 px-2.5 pb-1 tracking-widest">
            Management
          </p>
          {navItems.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(href, exact)
                  ? 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
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
