'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import {
  ShieldCheck, Send, CheckCircle2, UploadCloud, Loader2,
  Image as ImageIcon, Banknote, Smartphone, X, AlertCircle,
} from 'lucide-react'
import { submitPaymentClaim } from '@/app/actions/student'

type FeeItemOption = {
  id: string
  name: string
  amount: string
  requiresShirtSize: boolean
  isRequired: boolean
}

type PeriodData = {
  id: string
  name: string
  feeItems: FeeItemOption[]
} | null

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const PROGRAMS = ['BSCE (CEM)', 'BSCE (SE)', 'BSIT', 'BSCS', 'BSEE', 'BLIS']

export default function SubmitClaimPage() {
  const [period, setPeriod] = useState<PeriodData>(null)
  const [loadingPeriod, setLoadingPeriod] = useState(true)

  const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'Bank Transfer' | 'Cash'>('GCash')
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([])
  const [shirtSizes, setShirtSizes] = useState<Record<string, string>>({})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [privacyConsent, setPrivacyConsent] = useState(false)

  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load active collection period + fee items on mount
  useEffect(() => {
    fetch('/api/active-period')
      .then((r) => r.json())
      .then((data) => {
        setPeriod(data.period ?? null)
        if (data.period?.feeItems) {
          // Pre-select required items
          const required = data.period.feeItems
            .filter((f: FeeItemOption) => f.isRequired)
            .map((f: FeeItemOption) => f.id)
          setSelectedFeeIds(required)
        }
      })
      .catch(() => setPeriod(null))
      .finally(() => setLoadingPeriod(false))
  }, [])

  function toggleFeeItem(id: string, isRequired: boolean) {
    if (isRequired) return // can't deselect required items
    setSelectedFeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function getTotal() {
    if (!period) return 0
    return period.feeItems
      .filter((f) => selectedFeeIds.includes(f.id))
      .reduce((sum, f) => sum + parseFloat(f.amount), 0)
  }

  function needsShirtSize() {
    if (!period) return false
    return period.feeItems.some((f) => f.requiresShirtSize && selectedFeeIds.includes(f.id))
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage('')

    if (!selectedFile) {
      setErrorMessage('Proof of payment is required. Please upload a screenshot or photo of your receipt.')
      return
    }
    if (!privacyConsent) {
      setErrorMessage('You must agree to the privacy consent notice before submitting.')
      return
    }
    if (needsShirtSize()) {
      const shirtFee = period!.feeItems.find((f) => f.requiresShirtSize && selectedFeeIds.includes(f.id))
      if (shirtFee && !shirtSizes[shirtFee.id]) {
        setErrorMessage('Please select a shirt size for the Intramurals Shirt.')
        return
      }
    }

    const form = e.currentTarget
    const data = new FormData(form)

    // Convert file to data URL for storage (no UploadThing key required)
    let proofUrl = ''
    try {
      proofUrl = await fileToDataUrl(selectedFile)
    } catch {
      setErrorMessage('Failed to read the uploaded file. Please try again.')
      return
    }

    const shirtFeeId = period?.feeItems.find((f) => f.requiresShirtSize && selectedFeeIds.includes(f.id))?.id

    startTransition(async () => {
      const result = await submitPaymentClaim({
        studentNumber: data.get('studentNumber') as string,
        fullName: data.get('fullName') as string,
        dwclEmail: data.get('dwclEmail') as string,
        program: data.get('program') as string,
        yearLevel: parseInt(data.get('yearLevel') as string),
        shirtSize: shirtFeeId ? shirtSizes[shirtFeeId] : undefined,
        paymentMethod,
        paymentReference: data.get('paymentReference') as string,
        paymentDate: data.get('paymentDate') as string,
        proofOfPaymentUrl: proofUrl,
        feeItemIds: selectedFeeIds,
        privacyConsent: true,
      })

      if (result.success) {
        setSubmitted(true)
      } else {
        setErrorMessage(result.error ?? 'Submission failed. Please try again.')
      }
    })
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingPeriod) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </main>
    )
  }

  // ── No active period ───────────────────────────────────────────────────────
  if (!period) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h1 className="text-xl font-bold">No Active Collection Period</h1>
          <p className="text-sm text-slate-400">
            Membership fee submissions are currently closed. Please check back later or contact your LICOES officer.
          </p>
        </div>
      </main>
    )
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-sm w-full">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <h1 className="text-xl font-bold">Claim Submitted!</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Your payment claim has been received. The LICOES Treasurer will verify your
            payment and send an official e-receipt to your DWCL email once approved.
          </p>
          <button
            onClick={() => { setSubmitted(false); setSelectedFile(null); setPrivacyConsent(false) }}
            className="mt-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Submit Another
          </button>
        </div>
      </main>
    )
  }

  // ── Main Form ──────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 py-12">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400 mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">LICOES Membership Fee</h1>
          <p className="text-xs text-slate-400">{period.name}</p>
        </div>

        {errorMessage && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 rounded-lg flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Student Info */}
          <section className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Student Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Student ID Number *</label>
                <input name="studentNumber" required placeholder="e.g. 07305868"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Year Level *</label>
                <select name="yearLevel" required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none">
                  <option value="">Select</option>
                  {[1,2,3,4].map((y) => <option key={y} value={y}>{y}{['st','nd','rd','th'][y-1]} Year</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Full Name *</label>
              <input name="fullName" required placeholder="SURNAME, First Name Middle Name"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">DWCL Email *</label>
                <input name="dwclEmail" type="email" required placeholder="you@dwcl.edu.ph"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Program *</label>
                <select name="program" required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none">
                  <option value="">Select</option>
                  {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Fee Items */}
          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fee Items</p>
            <div className="space-y-2">
              {period.feeItems.map((fee) => {
                const selected = selectedFeeIds.includes(fee.id)
                return (
                  <div key={fee.id}
                    onClick={() => toggleFeeItem(fee.id, fee.isRequired)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 border cursor-pointer transition-all ${
                      selected ? 'border-indigo-500 bg-indigo-600/10' : 'border-slate-800 bg-slate-950/60'
                    } ${fee.isRequired ? 'cursor-default' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                      }`}>
                        {selected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{fee.name}</p>
                        {fee.isRequired && <p className="text-[10px] text-red-400">Required</p>}
                      </div>
                    </div>
                    <p className="font-bold text-emerald-400">PHP {parseFloat(fee.amount).toFixed(2)}</p>
                  </div>
                )
              })}
            </div>

            {/* Shirt size selector */}
            {period.feeItems.filter((f) => f.requiresShirtSize && selectedFeeIds.includes(f.id)).map((f) => (
              <div key={f.id} className="space-y-1">
                <label className="text-slate-300 font-medium">Shirt Size for {f.name} *</label>
                <div className="flex gap-2 flex-wrap">
                  {SHIRT_SIZES.map((sz) => (
                    <button type="button" key={sz} onClick={() => setShirtSizes((p) => ({ ...p, [f.id]: sz }))}
                      className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                        shirtSizes[f.id] === sz
                          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}>{sz}</button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-1 border-t border-slate-800">
              <span className="text-slate-400">Total</span>
              <span className="font-bold text-base text-emerald-400">PHP {getTotal().toFixed(2)}</span>
            </div>
          </section>

          {/* Payment Method */}
          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payment Details</p>
            <div className="grid grid-cols-3 gap-2">
              {(['GCash', 'Bank Transfer', 'Cash'] as const).map((m) => (
                <button type="button" key={m} onClick={() => setPaymentMethod(m)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border font-semibold transition-colors ${
                    paymentMethod === m
                      ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                      : 'border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}>
                  {m === 'Cash' ? <Banknote className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                  {m}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">
                  {paymentMethod === 'Cash' ? 'OR / Slip Number' : 'Reference Number'} *
                </label>
                <input name="paymentReference" required
                  placeholder={paymentMethod === 'GCash' ? 'e.g. 9023182' : paymentMethod === 'Cash' ? 'e.g. OR-0812' : 'e.g. 12345678'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none font-mono text-indigo-300" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Payment Date *</label>
                <input name="paymentDate" type="date" required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none" />
              </div>
            </div>
          </section>

          {/* Proof of Payment */}
          <section className="space-y-1">
            <label className="text-slate-300 font-medium">
              {paymentMethod === 'Cash' ? 'Photo of Receipt' : 'Screenshot of Payment'}{' '}
              <span className="text-red-400">* Required</span>
            </label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) { setSelectedFile(f); setErrorMessage('') }
            }} className="hidden" />
            <div onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-800 hover:border-indigo-500 bg-slate-950/60'
              }`}>
              {selectedFile ? (
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-left">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud className="w-7 h-7 text-indigo-400 mx-auto" />
                  <p className="text-xs font-medium text-slate-300">Click to upload</p>
                  <p className="text-[10px] text-slate-500">PNG, JPG, WEBP — max 5 MB</p>
                </div>
              )}
            </div>
          </section>

          {/* Privacy Consent */}
          <section className="border border-slate-800 rounded-lg p-3 space-y-2 bg-slate-950/40">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Privacy Consent (RA 10173)</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              By submitting this form, you consent to LICOES collecting and processing your student
              number, name, DWCL email, payment details, and proof of payment solely for membership
              fee verification and record-keeping purposes.
            </p>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={privacyConsent} onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="mt-0.5 rounded" />
              <span className="text-xs text-slate-300">
                I agree to the data processing notice above and consent to LICOES using my
                information for the stated purpose.
              </span>
            </label>
          </section>

          <button type="submit" disabled={isPending || !privacyConsent}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold p-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Payment Claim</>}
          </button>
        </form>
      </div>
    </main>
  )
}
