'use client'

import { useState, useTransition } from 'react'
import type { ConfigItem, ConfigItemType, ActionResult } from '@/app/actions/config-actions'
import {
  addConfigItemAction,
  toggleConfigItemAction,
  deleteConfigItemAction,
} from '@/app/actions/config-actions'

interface ConfigSectionProps {
  type: ConfigItemType
  items: ConfigItem[]
}

const TYPE_LABELS: Record<ConfigItemType, string> = {
  PROGRAM: 'Program',
  YEAR_LEVEL: 'Year Level',
  SHIRT_SIZE: 'Shirt Size',
  PAYMENT_METHOD: 'Payment Method',
}

export default function ConfigSection({ type, items }: ConfigSectionProps) {
  const [inputValue, setInputValue] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setActionError(null)

    startTransition(async () => {
      const result: ActionResult = await addConfigItemAction(type, inputValue)
      if (result.success) {
        setInputValue('')
      } else {
        setFormError(result.error)
      }
    })
  }

  function handleToggle(id: string) {
    setActionError(null)
    startTransition(async () => {
      const result: ActionResult = await toggleConfigItemAction(id)
      if (!result.success) {
        setActionError(result.error)
      }
    })
  }

  function handleDelete(id: string) {
    setActionError(null)
    startTransition(async () => {
      const result: ActionResult = await deleteConfigItemAction(id)
      if (!result.success) {
        setActionError(result.error)
      }
    })
  }

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-violet-300">
        {TYPE_LABELS[type]}
      </h2>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex items-start gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setFormError(null)
            }}
            placeholder={`Add ${TYPE_LABELS[type]}…`}
            disabled={isPending}
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-600 disabled:opacity-50"
          />
          {formError && (
            <p className="mt-1 text-xs text-red-400">{formError}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending || inputValue.trim() === ''}
          className="shrink-0 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Add
        </button>
      </form>

      {/* Action-level error (toggle / delete) */}
      {actionError && (
        <p className="text-xs text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
          {actionError}
        </p>
      )}

      {/* Item list */}
      {items.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No items yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 bg-slate-800 rounded-lg px-3 py-2"
            >
              <span
                className={`text-sm flex-1 truncate ${
                  item.isActive ? 'text-slate-100' : 'text-slate-500 line-through'
                }`}
              >
                {item.value}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggle(item.id)}
                  disabled={isPending}
                  title={item.isActive ? 'Deactivate' : 'Activate'}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    item.isActive
                      ? 'bg-emerald-900 text-emerald-300 hover:bg-emerald-800'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {item.isActive ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={isPending}
                  title="Delete"
                  className="text-xs px-2.5 py-1 rounded-md font-medium bg-red-900 text-red-300 hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
