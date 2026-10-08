import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
    <main className="min-h-screen bg-[var(--bg-cream)] flex items-center justify-center px-8">
      <div className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between gap-16">
        {/* Left: Text */}
        <div className="space-y-8 text-center md:text-left">
          <div className="space-y-4">
            <p className="text-2xl font-extrabold text-[var(--brand-500)] uppercase tracking-widest">
              LICOES · DWCL
            </p>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
              Welcome to<br />LICOES PORTAL
            </h1>
            <p className="text-base text-[var(--text-muted)] max-w-sm">
              The official management system for the League of Integrated Computer and Engineering Students.
            </p>
          </div>

          <div className="flex gap-3 justify-center md:justify-start">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-500)] px-7 py-3 text-base font-semibold text-white hover:bg-[var(--brand-600)] transition-colors shadow-sm"
            >
              Login / Sign Up
            </Link>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Gamitin ang iyong <span className="font-semibold">@dwc-legazpi.edu</span> Google account
          </p>
        </div>

        {/* Right: Logo */}
        <div className="shrink-0">
          <Image
            src="/licoes_logo.png"
            alt="LICOES Logo"
            width={410}
            height={410}
            priority
            className="drop-shadow-md"
          />
        </div>
      </div>
    </main>
  )
}
