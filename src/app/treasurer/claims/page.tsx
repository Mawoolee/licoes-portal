import { getPaymentClaimsAction } from '@/app/actions/treasurer'
import TreasurerClaimsClient from './TreasurerClaimsClient'

export default async function TreasurerClaimsPage() {
  const raw = await getPaymentClaimsAction()

  // Serialise Prisma Decimal + Date values so they cross the Server→Client boundary cleanly
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

  return <TreasurerClaimsClient initialClaims={claims as any} />
}
