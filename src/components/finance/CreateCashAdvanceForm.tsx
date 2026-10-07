'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCashAdvanceAction } from '@/app/actions/finance-actions'

export default function CreateCashAdvanceForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    recipientName: '',
    purpose: '',
    amount: '',
    dateIssued: new Date().toISOString().slice(0, 10),
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    startTransition(async () => {
      const result = await createCashAdvanceAction({
        recipientName: form.recipientName,
        purpose: form.purpose,
        amount: Number(form.amount),
        dateIssued: form.dateIssued,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setSuccess('Cash advance created successfully.')
      setForm({
        recipientName: '',
        purpose: '',
        amount: '',
        dateIssued: new Date().toISOString().slice(0, 10),
      })
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Create Cash Advance</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-300">
          <span>Recipient Name</span>
          <input
            value={form.recipientName}
            onChange={(e) => handleChange('recipientName', e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            placeholder="e.g. Juan Dela Cruz"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-300">
          <span>Amount</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            placeholder="2500.00"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-300 md:col-span-2">
          <span>Purpose</span>
          <textarea
            value={form.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
            className="w-full min-h-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            placeholder="Purpose of the cash advance"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-300">
          <span>Date Issued</span>
          <input
            type="date"
            value={form.dateIssued}
            onChange={(e) => handleChange('dateIssued', e.target.value)}
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
        {isPending ? 'Saving...' : 'Create Advance'}
      </button>
    </form>
  )
}
