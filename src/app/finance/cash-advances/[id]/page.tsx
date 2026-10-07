import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import AddExpenseForm from '@/components/finance/AddExpenseForm'
import { getExpensesByCashAdvanceAction } from '@/app/actions/finance-actions'

export default async function CashAdvanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cashAdvance = await db.cashAdvance.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      expenses: { include: { evidence: true } },
    },
  })

  if (!cashAdvance) {
    notFound()
  }

  const expenses = await getExpensesByCashAdvanceAction(id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-emerald-400">Cash Advance</p>
          <h1 className="text-2xl font-bold text-white">{cashAdvance.recipientName}</h1>
        </div>
        <Link href="/finance/cash-advances" className="text-sm text-slate-300 hover:text-white">
          ← Back to list
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Purpose</p>
              <p className="mt-1 text-slate-100">{cashAdvance.purpose}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Status</p>
              <p className="mt-1 text-slate-100">{cashAdvance.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Amount</p>
              <p className="mt-1 text-slate-100">₱{Number(cashAdvance.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Issued</p>
              <p className="mt-1 text-slate-100">{new Date(cashAdvance.dateIssued).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Created By</p>
              <p className="mt-1 text-slate-100">{cashAdvance.createdBy.name}</p>
            </div>
          </div>
        </section>

        {cashAdvance.status === 'OPEN' && <AddExpenseForm cashAdvanceId={id} />}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Expense Records</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No expenses recorded yet.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-slate-800">
                    <td className="px-3 py-3">{expense.description}</td>
                    <td className="px-3 py-3">{expense.vendorName}</td>
                    <td className="px-3 py-3">₱{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3">{new Date(expense.datePurchased).toLocaleDateString()}</td>
                    <td className="px-3 py-3">{expense.evidenceCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
