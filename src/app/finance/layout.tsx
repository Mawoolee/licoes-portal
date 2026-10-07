'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut,
  Wallet,
  Receipt,
  BookOpen,
  HandCoins,
} from 'lucide-react'

const navItems = [
  {
    href: '/finance/cash-advances',
    label: 'Cash Advances',
    icon: HandCoins,
    exact: false,
  },
  {
    href: '/finance/expenses',
    label: 'Expenses',
    icon: Receipt,
    exact: false,
  },
  {
    href: '/finance/liquidation',
    label: 'Liquidation',
    icon: BookOpen,
    exact: false,
  },
]

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
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
          <Wallet className="w-6 h-6 text-[var(--brand-500)]" />
          <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">LICOES Portal</span>
          <span className="text-xs bg-[var(--brand-50)] text-[var(--brand-600)] font-semibold px-2 py-0.5 rounded">
            Finance
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--text-muted)]">
            {session?.user?.email ?? 'finance@dwcl.edu.ph'}
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
            Finance
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
