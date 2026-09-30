'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { LogOut, CreditCard, QrCode, ShieldCheck } from 'lucide-react'

export default function TreasurerLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Header */}
      <header className="border-b bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-lg tracking-tight">LICOES Portal</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded">
            Treasurer
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            {session?.user?.email || 'officer@dwcl.edu.ph'}
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
        <aside className="w-64 border-r bg-white dark:bg-slate-900 p-4 space-y-2">
          <Link
            href="/treasurer/claims"
            className="flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          >
            <CreditCard className="w-4 h-4" /> Payment Claims
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <QrCode className="w-4 h-4" /> Attendance Scanner
          </Link>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}