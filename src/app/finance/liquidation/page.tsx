import { getLiquidationRecordsAction } from '@/app/actions/finance-actions'

export default async function LiquidationPage() {
  const records = await getLiquidationRecordsAction()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Liquidation</h1>
        <p className="text-sm text-slate-400">Review submitted liquidation records and balances.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Purpose</th>
                <th className="px-3 py-2">Total Advanced</th>
                <th className="px-3 py-2">Total Liquidated</th>
                <th className="px-3 py-2">Balance</th>
                <th className="px-3 py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No liquidation records yet.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="border-b border-slate-800 hover:bg-slate-800/60">
                    <td className="px-3 py-3">{record.recipientName}</td>
                    <td className="px-3 py-3">{record.purpose}</td>
                    <td className="px-3 py-3">₱{record.totalAdvanced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3">₱{record.totalLiquidated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3">₱{record.unliquidatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3">{new Date(record.submittedAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
