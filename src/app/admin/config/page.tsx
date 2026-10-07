import { getConfigItemsAction } from '@/app/actions/config-actions'
import ConfigSection from '@/components/admin/ConfigSection'

export default async function AdminConfigPage() {
  const [programs, yearLevels, shirtSizes, paymentMethods] = await Promise.all([
    getConfigItemsAction('PROGRAM'),
    getConfigItemsAction('YEAR_LEVEL'),
    getConfigItemsAction('SHIRT_SIZE'),
    getConfigItemsAction('PAYMENT_METHOD'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuration</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage dropdown options used across the portal.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConfigSection type="PROGRAM" items={programs} />
        <ConfigSection type="YEAR_LEVEL" items={yearLevels} />
        <ConfigSection type="SHIRT_SIZE" items={shirtSizes} />
        <ConfigSection type="PAYMENT_METHOD" items={paymentMethods} />
      </div>
    </div>
  )
}
