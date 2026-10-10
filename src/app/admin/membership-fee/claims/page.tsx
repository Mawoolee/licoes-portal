import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getPaymentClaimsAction } from '@/app/actions/treasurer'
import PaymentClaimsClient from './PaymentClaimsClient'

export const dynamic = 'force-dynamic'

export default async function MembershipFeeClaimsPage() {
  const raw = await getPaymentClaimsAction()
  const claims = raw.map((c) => ({
    ...c,
    status: c.status as 'PENDING' | 'APPROVED' | 'REJECTED',
    paymentDate: c.paymentDate.toISOString(),
    verifiedAt: c.verifiedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    claimItems: c.claimItems.map((ci) => ({
      ...ci,
      amount: ci.amount.toString(),
    })),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/admin/membership-fee" className="hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Membership Fee
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">Payment Claims</span>
      </div>
      <PaymentClaimsClient initialClaims={claims as any} />
    </div>
  )
}