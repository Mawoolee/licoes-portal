'use client'

import { useState } from 'react'
import { FileSpreadsheet, UploadCloud, CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react'
import { uploadAlphaListAction } from '@/app/actions/alphalist-actions'

export default function AlphaListUploadPage() {
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [importedCount, setImportedCount] = useState<number | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setStatusMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadAlphaListAction(formData)

    setLoading(false)

    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message })
      setImportedCount(result.count || 0)
    } else {
      setStatusMessage({ type: 'error', text: result.message })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SOECS Alpha List Management</h1>
        <p className="text-sm text-slate-500">I-upload ang opisyal na SOECS Alpha List Excel file para sa kasalukuyang semestre.</p>
      </div>

      {/* Upload Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm text-center">
        <label className="cursor-pointer space-y-4 block">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <FileSpreadsheet className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-base font-semibold">I-click para mag-upload ng `SOECS Alpha List.xlsx`</h3>
            <p className="text-xs text-slate-400 mt-1">Awtomatikong babasahin ang mga sheets: BSIT, BSCS, BSEE, BSCE, BLIS</p>
          </div>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
        </label>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          statusMessage.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' : 'bg-red-950/40 border border-red-500/40 text-red-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Stats Overview */}
      {importedCount !== null && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Users className="w-4 h-4" /> Total Enrolled Students
            </div>
            <div className="text-2xl font-bold text-white">{importedCount}</div>
            <div className="text-[11px] text-emerald-400 font-medium">Active Alpha List Sync</div>
          </div>
        </div>
      )}
    </div>
  )
}