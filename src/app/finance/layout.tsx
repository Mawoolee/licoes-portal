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
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-emerald-600" />
          <span className="font-bold text-lg tracking-tight text-white">LICOES Portal</span>
          <span className="text-xs bg-emerald-900 text-emerald-300 font-semibold px-2 py-0.5 rounded">
            Finance
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">
            {session?.user?.email ?? 'finance@dwcl.edu.ph'}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors border border-slate-700 px-3 py-1.5 rounded-md"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex">
        <aside className="w-60 border-r border-slate-800 bg-slate-900 p-4 space-y-1 shrink-0">
          <p className="text-[10px] font-semibold uppercase text-slate-400 px-2.5 pb-1 tracking-widest">
            Finance
          </p>
          {navItems.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(href, exact)
                  ? 'bg-emerald-950 text-emerald-300'
                  : 'text-slate-300 hover:bg-slate-800'
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
