import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Receipt } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmt(iso: Date) {
  return iso.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function PaidMembershipFeePage() {
  const activePeriod = await db.collectionPeriod.findFirst({
    where: { isActive: true },
    include: { feeItems: { where: { name: { contains: 'Membership', mode: 'insensitive' } }, take: 1 } },
  })

  const membershipFeeItemId = activePeriod?.feeItems[0]?.id ?? null

  const claims = await db.paymentClaim.findMany({
    where: {
      status: 'APPROVED',
      ...(activePeriod ? { collectionPeriodId: activePeriod.id } : {}),
      ...(membershipFeeItemId ? { claimItems: { some: { feeItemId: membershipFeeItemId } } } : {}),
    },
    include: {
      claimItems: { include: { feeItem: true } },
      collectionPeriod: { select: { name: true } },
      eReceipt: { select: { receiptNumber: true, deliveryStatus: true } },
    },
    orderBy: { verifiedAt: 'desc' },
    take: 200,
  })

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/admin" className="hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">Paid Membership Fee</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Paid Membership Fee</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {activePeriod
              ? `${claims.length} approved payment${claims.length !== 1 ? 's' : ''} · ${activePeriod.name}`
              : 'No active collection period.'}
          </p>
        </div>
        <Link
          href="/admin/membership-fee/claims"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg transition-colors"
        >
          <BadgeCheck className="w-3.5 h-3.5" /> Manage Claims
        </Link>
      </div>

      {claims.length === 0 ? (
        <div className="border-2 border-dashed border-[var(--brand-100)] rounded-2xl p-16 text-center space-y-2">
          <BadgeCheck className="w-12 h-12 text-[var(--brand-200)] mx-auto" />
          <p className="font-semibold text-[var(--text-primary)]">No approved payments yet</p>
          <p className="text-sm text-[var(--text-muted)]">Approved payment claims will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-alt)] border-b border-[var(--brand-100)] text-xs uppercase text-[var(--text-muted)] font-semibold">
              <tr>
                <th className="px-4 py-3">Receipt No.</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Program / Year</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--brand-50)]">
              {claims.map((claim) => {
                const total = claim.claimItems.reduce((s, i) => s + Number(i.amount), 0)
                return (
                  <tr key={claim.id} className="hover:bg-[var(--brand-50)] transition-colors">
                    <td className="px-4 py-3">
                      {claim.eReceipt ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <Receipt className="w-3.5 h-3.5" />
                          {claim.eReceipt.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-xs text-[var(--text-primary)]">{claim.submittedFullName}</p>
                      <p className="text-xs text-[var(--text-muted)] font-mono">{claim.submittedStudentNo}</p>
                      <p className="text-xs text-[var(--text-muted)]">{claim.dwclEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {claim.program}<br />Year {claim.yearLevel}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{claim.paymentMethod}</p>
                      <p className="text-xs font-mono text-[var(--text-muted)]">{claim.paymentReference}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600">
                      PHP {total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {claim.verifiedAt ? fmt(claim.verifiedAt) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
