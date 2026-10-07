'use client'

import { useState, useTransition } from 'react'
import {
  Plus, CheckCircle2, AlertCircle, Loader2, X, Trash2,
  CircleDot, Power, PowerOff, Shirt, DollarSign, ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  createCollectionPeriodAction,
  activateCollectionPeriodAction,
  deactivateCollectionPeriodAction,
  createFeeItemAction,
  deleteFeeItemAction,
} from '@/app/actions/collection-actions'

type FeeItem = {
  id: string
  name: string
  amount: string
  requiresShirtSize: boolean
  isRequired: boolean
}

type Period = {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  feeItems: FeeItem[]
  _count: { paymentClaims: number }
}

export default function CollectionPeriodsClient({ initialPeriods }: { initialPeriods: Period[] }) {
  const [periods, setPeriods] = useState<Period[]>(initialPeriods)
  const [expandedId, setExpandedId] = useState<string | null>(
    initialPeriods.find((p) => p.isActive)?.id ?? initialPeriods[0]?.id ?? null
  )
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [newPeriodName, setNewPeriodName] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fee item form state per period
  const [feeForm, setFeeForm] = useState<Record<string, { name: string; amount: string; requiresShirtSize: boolean; isRequired: boolean; open: boolean }>>({})

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  function getFeeForm(periodId: string) {
    return feeForm[periodId] ?? { name: '', amount: '', requiresShirtSize: false, isRequired: true, open: false }
  }

  function setFeeFormFor(periodId: string, patch: Partial<typeof feeForm[string]>) {
    setFeeForm((prev) => ({ ...prev, [periodId]: { ...getFeeForm(periodId), ...patch } }))
  }

  async function handleCreatePeriod(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', newPeriodName)
    startTransition(async () => {
      const result = await createCollectionPeriodAction(fd)
      if (result.success) {
        const newPeriod: Period = {
          id: result.id ?? crypto.randomUUID(),
          name: newPeriodName,
          isActive: false,
          createdAt: new Date(),
          feeItems: [],
          _count: { paymentClaims: 0 },
        }
        setPeriods((prev) => [newPeriod, ...prev])
        setNewPeriodName('')
        setShowNewPeriod(false)
        setExpandedId(newPeriod.id)
        showToast('success', result.message)
      } else {
        showToast('error', result.message)
      }
    })
  }

  async function handleActivate(periodId: string) {
    startTransition(async () => {
      const result = await activateCollectionPeriodAction(periodId)
      if (result.success) {
        setPeriods((prev) => prev.map((p) => ({ ...p, isActive: p.id === periodId })))
        showToast('success', 'Collection period activated.')
      } else {
        showToast('error', result.message ?? 'Failed.')
      }
    })
  }

  async function handleDeactivate(periodId: string) {
    startTransition(async () => {
      const result = await deactivateCollectionPeriodAction(periodId)
      if (result.success) {
        setPeriods((prev) => prev.map((p) => p.id === periodId ? { ...p, isActive: false } : p))
        showToast('success', 'Collection period deactivated.')
      } else {
        showToast('error', result.message ?? 'Failed.')
      }
    })
  }

  async function handleAddFeeItem(periodId: string, e: React.FormEvent) {
    e.preventDefault()
    const form = getFeeForm(periodId)
    const fd = new FormData()
    fd.append('collectionPeriodId', periodId)
    fd.append('name', form.name)
    fd.append('amount', form.amount)
    fd.append('requiresShirtSize', String(form.requiresShirtSize))
    fd.append('isRequired', String(form.isRequired))

    startTransition(async () => {
      const result = await createFeeItemAction(fd)
      if (result.success) {
        const newItem: FeeItem = {
          id: result.id ?? Date.now().toString(),
          name: form.name,
          amount: parseFloat(form.amount).toFixed(2),
          requiresShirtSize: form.requiresShirtSize,
          isRequired: form.isRequired,
        }
        setPeriods((prev) => prev.map((p) =>
          p.id === periodId ? { ...p, feeItems: [...p.feeItems, newItem] } : p
        ))
        setFeeFormFor(periodId, { name: '', amount: '', requiresShirtSize: false, isRequired: true, open: false })
        showToast('success', result.message)
      } else {
        showToast('error', result.message)
      }
    })
  }

  async function handleDeleteFeeItem(periodId: string, feeItemId: string) {
    startTransition(async () => {
      const result = await deleteFeeItemAction(feeItemId)
      if (result.success) {
        setPeriods((prev) => prev.map((p) =>
          p.id === periodId ? { ...p, feeItems: p.feeItems.filter((f) => f.id !== feeItemId) } : p
        ))
        showToast('success', 'Fee item deleted.')
      } else {
        showToast('error', result.message || 'Failed to delete fee item')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collection Periods</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage academic year / semester periods and their fee items.
            Only one period can be active at a time — the active period accepts student payment submissions.
          </p>
        </div>
        <button
          onClick={() => setShowNewPeriod(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg shrink-0"
        >
          <Plus className="w-4 h-4" /> New Period
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg flex items-center gap-2.5 text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.text}
        </div>
      )}

      {/* New Period Form */}
      {showNewPeriod && (
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">New Collection Period</h2>
            <button onClick={() => { setShowNewPeriod(false); setNewPeriodName('') }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreatePeriod} className="flex gap-3">
            <input
              value={newPeriodName}
              onChange={(e) => setNewPeriodName(e.target.value)}
              required
              placeholder="e.g. A.Y. 2027–2028 1st Semester"
              className="flex-1 px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
          </form>
        </div>
      )}

      {/* Period List */}
      {periods.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-12 text-center text-slate-500 text-sm">
          No collection periods yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => {
            const isExpanded = expandedId === period.id
            const form = getFeeForm(period.id)

            return (
              <div key={period.id} className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
                {/* Period header row */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : period.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{period.name}</span>
                        {period.isActive && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            <CircleDot className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {period.feeItems.length} fee item{period.feeItems.length !== 1 ? 's' : ''} ·{' '}
                        {period._count.paymentClaims} payment claim{period._count.paymentClaims !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>

                  {/* Activate / Deactivate */}
                  <div className="shrink-0 flex gap-2">
                    {period.isActive ? (
                      <button
                        onClick={() => handleDeactivate(period.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200 hover:bg-amber-50 rounded-lg disabled:opacity-50"
                      >
                        <PowerOff className="w-3.5 h-3.5" /> Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(period.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                      >
                        <Power className="w-3.5 h-3.5" /> Set Active
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: fee items */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3">
                    {/* Fee item list */}
                    {period.feeItems.length === 0 ? (
                      <p className="text-xs text-slate-500 py-2">No fee items yet. Add one below.</p>
                    ) : (
                      <div className="space-y-2">
                        {period.feeItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-emerald-700 font-semibold">PHP {parseFloat(item.amount).toFixed(2)}</span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.isRequired ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                                    {item.isRequired ? 'Required' : 'Optional'}
                                  </span>
                                  {item.requiresShirtSize && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 flex items-center gap-1">
                                      <Shirt className="w-2.5 h-2.5" /> Shirt Size
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteFeeItem(period.id, item.id)}
                              disabled={isPending}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1 disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add fee item toggle */}
                    {!form.open ? (
                      <button
                        onClick={() => setFeeFormFor(period.id, { open: true })}
                        className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Fee Item
                      </button>
                    ) : (
                      <form
                        onSubmit={(e) => handleAddFeeItem(period.id, e)}
                        className="border rounded-lg p-3 space-y-3 bg-slate-50 dark:bg-slate-800"
                      >
                        <p className="text-xs font-semibold text-slate-600">New Fee Item</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">Name *</label>
                            <input
                              value={form.name}
                              onChange={(e) => setFeeFormFor(period.id, { name: e.target.value })}
                              required
                              placeholder="e.g. Membership Fee"
                              className="w-full px-2.5 py-1.5 text-sm border rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">Amount (PHP) *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={form.amount}
                              onChange={(e) => setFeeFormFor(period.id, { amount: e.target.value })}
                              required
                              placeholder="250.00"
                              className="w-full px-2.5 py-1.5 text-sm border rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.isRequired}
                              onChange={(e) => setFeeFormFor(period.id, { isRequired: e.target.checked })}
                              className="rounded"
                            />
                            Required
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.requiresShirtSize}
                              onChange={(e) => setFeeFormFor(period.id, { requiresShirtSize: e.target.checked })}
                              className="rounded"
                            />
                            Requires Shirt Size
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
                          >
                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeeFormFor(period.id, { open: false })}
                            className="px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-100 font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
