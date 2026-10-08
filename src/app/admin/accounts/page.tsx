import { db } from '@/lib/db'
import AccountsClient from './AccountsClient'

export const dynamic = 'force-dynamic'

export default async function AccountManagementPage() {
  const officers = await db.officer.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      status: true,
      createdAt: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Account Management
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          I-approve o i-reject ang mga bagong sign-up na officer accounts.
        </p>
      </div>

      <AccountsClient officers={officers} />
    </div>
  )
}
