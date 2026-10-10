import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getCollectionPeriodsAction } from '@/app/actions/collection-actions'
import CollectionPeriodsClient from './CollectionPeriodsClient'

export default async function CollectionPeriodsPage() {
  const periods = await getCollectionPeriodsAction()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/admin/membership-fee" className="hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Membership Fee
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">Collection Periods</span>
      </div>
      <CollectionPeriodsClient initialPeriods={periods} />
    </div>
  )
}