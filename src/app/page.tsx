import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ShieldCheck } from 'lucide-react'

export default async function WelcomePage() {
  const session = await getServerSession(authOptions)

  // If already logged in, redirect to appropriate destination
  if (session) {
    const status = (session.user as any).status
    const roles = (session.user as any).roles as string[]

    if (status === 'PENDING') redirect('/pending')
    if (roles.includes('ADMIN')) redirect('/admin')
    if (roles.includes('TREASURER')) redirect('/treasurer/claims')
    if (roles.includes('ATTENDANCE_OFFICER')) redirect('/attendance')
    if (roles.includes('FINANCE_OFFICER')) redirect('/finance/cash-advances')
    redirect('/unauthorized')
  }

  return (
    <main className="min-h-screen bg-[var(--bg-cream)] flex items-center justify-center px-6">
      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-between gap-10">
        {/* Left: Text */}
        <div className="space-y-6 text-center md:text-left">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--brand-500)] uppercase tracking-widest">
              LICOES · DWCL
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
              Welcome to<br />LICOES PORTAL
            </h1>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              The official management system for the League of Integrated Computer and Engineering Students.
            </p>
          </div>

          <div className="flex gap-3 justify-center md:justify-start">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-500)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-600)] transition-colors shadow-sm"
            >
              Login / Sign Up
            </Link>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Gamitin ang iyong <span className="font-semibold">@dwc-legazpi.edu</span> Google account
          </p>
        </div>

        {/* Right: Seal */}
        <div className="shrink-0 w-64 h-64 rounded-full bg-[var(--brand-50)] border-4 border-[var(--brand-100)] flex items-center justify-center">
          <div className="text-center space-y-2">
            <ShieldCheck className="w-16 h-16 text-[var(--brand-500)] mx-auto" />
            <p className="text-xs font-bold text-[var(--brand-600)] tracking-widest uppercase">LICOES · DWCL</p>
          </div>
        </div>
      </div>
    </main>
  )
}
