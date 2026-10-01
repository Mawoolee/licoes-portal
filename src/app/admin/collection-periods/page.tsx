import { getCollectionPeriodsAction } from '@/app/actions/collection-actions'
import CollectionPeriodsClient from './CollectionPeriodsClient'

export default async function CollectionPeriodsPage() {
  const periods = await getCollectionPeriodsAction()
  return <CollectionPeriodsClient initialPeriods={periods} />
}
