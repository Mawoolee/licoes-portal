import Link from 'next/link'
import { db } from '@/lib/db'
import { CreditCard, CalendarRange } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MembershipFeeHubPage() {
  const [pendingCount, activePeriod] = await Promise.all([
    db.paymentClaim.count({ where: { status: 'PENDING' } }),
    db.collectionPeriod.findFirst({ where: { isActive: true } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Membership Fee
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Manage collection periods and review student payment claims.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
        {/* Payment Claims */}
        <Link
          href="/admin/membership-fee/claims"
          className="group rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-6 flex flex-col gap-4 hover:shadow-md hover:border-[var(--brand-200)] transition-all"
        >
          <div className="inline-flex p-3 rounded-xl bg-[var(--brand-50)] w-fit">
            <CreditCard className="w-6 h-6 text-[var(--brand-500)]" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">Payment Claims</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Review proof of payment, then approve or reject student submissions.
            </p>
            {pendingCount > 0 && (
              <span className="inline-flex items-center mt-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand-500)] text-white">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--brand-500)] font-medium group-hover:underline mt-auto">
            View claims →
          </p>
        </Link>

        {/* Collection Period */}
        <Link
          href="/admin/membership-fee/collection-periods"
          className="group rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-6 flex flex-col gap-4 hover:shadow-md hover:border-[var(--brand-200)] transition-all"
        >
          <div className="inline-flex p-3 rounded-xl bg-blue-50 w-fit">
            <CalendarRange className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">Collection Periods</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Set up academic year periods with 1st and 2nd semester membership fees.
            </p>
            {activePeriod && (
              <p className="text-[11px] text-blue-600 font-semibold mt-2">
                Active: {activePeriod.name}
              </p>
            )}
          </div>
          <p className="text-xs text-blue-500 font-medium group-hover:underline mt-auto">
            Manage periods →
          </p>
        </Link>
      </div>
    </div>
  )
}