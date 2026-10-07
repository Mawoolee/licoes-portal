import Link from 'next/link'
import { getAllExpensesAction } from '@/app/actions/finance-actions'

export default async function FinanceExpensesPage() {
  const expenses = await getAllExpensesAction()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Expenses</h1>
        <p className="text-sm text-slate-400">All expenses across active cash advances.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">AR</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No expenses recorded.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-slate-800 hover:bg-slate-800/60">
                    <td className="px-3 py-3">{expense.description}</td>
                    <td className="px-3 py-3">{expense.vendorName}</td>
                    <td className="px-3 py-3">₱{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3">{new Date(expense.datePurchased).toLocaleDateString()}</td>
                    <td className="px-3 py-3">{expense.acknowledgmentReceiptNumber ?? '—'}</td>
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
