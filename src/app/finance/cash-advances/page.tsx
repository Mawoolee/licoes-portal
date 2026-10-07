import Link from 'next/link'
import CreateCashAdvanceForm from '@/components/finance/CreateCashAdvanceForm'
import { getCashAdvancesAction } from '@/app/actions/finance-actions'

export default async function CashAdvancesPage() {
  const advances = await getCashAdvancesAction()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cash Advances</h1>
          <p className="text-sm text-slate-400">Track validation and issuance of cash advances.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Advance List</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Recipient</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      No cash advances yet.
                    </td>
                  </tr>
                ) : (
                  advances.map((advance) => (
                    <tr key={advance.id} className="border-b border-slate-800 hover:bg-slate-800/60">
                      <td className="px-3 py-3">{advance.recipientName}</td>
                      <td className="px-3 py-3">{advance.purpose}</td>
                      <td className="px-3 py-3">₱{advance.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-3 py-3">{new Date(advance.dateIssued).toLocaleDateString()}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${advance.status === 'OPEN' ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                          {advance.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/finance/cash-advances/${advance.id}`} className="text-emerald-400 hover:text-emerald-300">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <CreateCashAdvanceForm />
      </div>
    </div>
  )
}
