'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { LogOut, CreditCard, QrCode, ShieldCheck } from 'lucide-react'

export default function TreasurerLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-[var(--bg-cream)] text-[var(--text-primary)] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[var(--brand-100)] bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[var(--brand-500)]" />
          <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">LICOES Portal</span>
          <span className="text-xs bg-[var(--brand-50)] text-[var(--brand-600)] font-semibold px-2 py-0.5 rounded">
            Treasurer
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--text-muted)]">
            {session?.user?.email || 'officer@dwcl.edu.ph'}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-600)] transition-colors border border-[var(--brand-100)] hover:border-[var(--brand-300)] px-3 py-1.5 rounded-md"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex">
        <aside className="w-64 border-r border-[var(--brand-100)] bg-[var(--surface-alt)] p-4 space-y-2">
          <Link
            href="/treasurer/claims"
            className="flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium bg-[var(--brand-500)] text-white shadow-sm"
          >
            <CreditCard className="w-4 h-4" /> Payment Claims
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)] transition-colors"
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