import Link from 'next/link'
import { Clock } from 'lucide-react'

export default function PendingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-cream)]">
      <div className="w-full max-w-md text-center space-y-5 rounded-2xl border border-[var(--brand-100)] bg-[var(--surface)] p-8 shadow-[0_18px_45px_rgba(203,24,29,0.08)]">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--brand-50)] mx-auto">
          <Clock className="w-7 h-7 text-[var(--brand-500)]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Account Pending Approval
          </h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Your account has been submitted and is waiting for admin approval.
            You can access the{' '}
            <span className="font-semibold text-[var(--text-primary)]">List of Students</span>{' '}
            while waiting.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/admin/roster"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-500)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-600)] transition-colors"
          >
            View List of Students
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--brand-100)] px-5 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  )
}
