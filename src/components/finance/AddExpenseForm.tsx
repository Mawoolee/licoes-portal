'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createExpenseAction } from '@/app/actions/finance-actions'

export default function AddExpenseForm({ cashAdvanceId }: { cashAdvanceId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    description: '',
    vendorName: '',
    amount: '',
    datePurchased: new Date().toISOString().slice(0, 10),
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    startTransition(async () => {
      const result = await createExpenseAction({
        cashAdvanceId,
        description: form.description,
        vendorName: form.vendorName,
        amount: Number(form.amount),
        datePurchased: form.datePurchased,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setSuccess('Expense added successfully.')
      setForm({
        description: '',
        vendorName: '',
        amount: '',
        datePurchased: new Date().toISOString().slice(0, 10),
      })
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Add Expense</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-300 md:col-span-2">
          <span>Description</span>
          <input
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            placeholder="Office supplies, travel, etc."
          />
        </label>

        <label className="space-y-1 text-sm text-slate-300">
          <span>Vendor</span>
          <input
            value={form.vendorName}
            onChange={(e) => setForm((prev) => ({ ...prev, vendorName: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            placeholder="Vendor name"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-300">
          <span>Amount</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            placeholder="1000.00"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-300">
          <span>Date Purchased</span>
          <input
            type="date"
            value={form.datePurchased}
            onChange={(e) => setForm((prev) => ({ ...prev, datePurchased: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-4 text-sm text-emerald-400">{success}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
      >
        {isPending ? 'Saving...' : 'Add Expense'}
      </button>
    </form>
  )
}
