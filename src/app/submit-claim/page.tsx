'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Image from 'next/image'
import { useSession, signIn, signOut } from 'next-auth/react'
import {
  ShieldCheck, Send, CheckCircle2, UploadCloud, Loader2,
  Image as ImageIcon, Banknote, Smartphone, X, AlertCircle,
  User, CreditCard, ChevronRight, ChevronLeft, LogOut,
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

const STEPS = [
  { id: 1, label: 'Student Info', icon: User },
  { id: 2, label: 'Fee Items',    icon: ShieldCheck },
  { id: 3, label: 'Payment',      icon: CreditCard },
]

export default function SubmitClaimPage() {
  const { data: session, status: sessionStatus } = useSession()

  const [period, setPeriod] = useState<PeriodData>(null)
  const [loadingPeriod, setLoadingPeriod] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [existingStatus, setExistingStatus] = useState<string | null>(null)

  const [currentStep, setCurrentStep] = useState(1)

  // Step 1 — student info
  const [studentNumber, setStudentNumber] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [fullName, setFullName] = useState('')
  const [program, setProgram] = useState('')

  // Step 2 — fee selection
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([])
  const [shirtSizes, setShirtSizes] = useState<Record<string, string>>({})

  // Step 3 — payment
  const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'Bank Transfer' | 'Cash'>('GCash')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [privacyConsent, setPrivacyConsent] = useState(false)

  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // The student's email comes from their Google session — pre-filled & locked
  const dwclEmail = session?.user?.email ?? ''

  // Load active period + check for existing submission once we have the email
  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      setLoadingPeriod(false)
      return
    }
    loadPeriod()
  }, [sessionStatus, dwclEmail])

  function loadPeriod() {
    setFetchError(false)
    setLoadingPeriod(true)
    const url = dwclEmail
      ? `/api/active-period?email=${encodeURIComponent(dwclEmail)}`
      : '/api/active-period'

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setPeriod(data.period ?? null)
        setAlreadySubmitted(data.alreadySubmitted ?? false)
        setExistingStatus(data.existingStatus ?? null)
        if (data.period?.feeItems) {
          const required = data.period.feeItems
            .filter((f: FeeItemOption) => f.isRequired)
            .map((f: FeeItemOption) => f.id)
          setSelectedFeeIds(required)
        }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoadingPeriod(false))
  }

  function toggleFeeItem(id: string, isRequired: boolean) {
    if (isRequired) return
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

  function validateStep1(): string | null {
    if (!studentNumber.trim()) return 'Student ID Number is required.'
    if (!yearLevel) return 'Year Level is required.'
    if (!fullName.trim()) return 'Full Name is required.'
    if (!program) return 'Program is required.'
    return null
  }

  function validateStep2(): string | null {
    if (needsShirtSize()) {
      const shirtFee = period!.feeItems.find((f) => f.requiresShirtSize && selectedFeeIds.includes(f.id))
      if (shirtFee && !shirtSizes[shirtFee.id]) {
        return 'Please select a shirt size for the Intramurals Shirt.'
      }
    }
    return null
  }

  function handleNext() {
    setErrorMessage('')
    if (currentStep === 1) {
      const err = validateStep1()
      if (err) { setErrorMessage(err); return }
    }
    if (currentStep === 2) {
      const err = validateStep2()
      if (err) { setErrorMessage(err); return }
    }
    setCurrentStep((s) => s + 1)
  }

  function handleBack() {
    setErrorMessage('')
    setCurrentStep((s) => s - 1)
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')

    if (!paymentReference.trim()) { setErrorMessage('Reference number is required.'); return }
    if (!paymentDate) { setErrorMessage('Payment date is required.'); return }
    if (!selectedFile) {
      setErrorMessage('Proof of payment is required. Please upload a screenshot or photo of your receipt.')
      return
    }
    if (!privacyConsent) {
      setErrorMessage('You must agree to the privacy consent notice before submitting.')
      return
    }

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
        studentNumber,
        fullName,
        dwclEmail,
        program,
        yearLevel: parseInt(yearLevel),
        shirtSize: shirtFeeId ? shirtSizes[shirtFeeId] : undefined,
        paymentMethod,
        paymentReference,
        paymentDate,
        proofOfPaymentUrl: proofUrl,
        feeItemIds: selectedFeeIds,
        privacyConsent: true,
      })

      if (result.success) {
        setSubmitted(true)
      } else if ((result as any).alreadySubmitted) {
        setAlreadySubmitted(true)
      } else {
        setErrorMessage(result.error ?? 'Submission failed. Please try again.')
      }
    })
  }

  // ── Session loading ────────────────────────────────────────────────────────
  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && loadingPeriod)) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--brand-400)] animate-spin" />
      </main>
    )
  }

  // ── Sign-in gate ───────────────────────────────────────────────────────────
  if (sessionStatus === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 text-center space-y-5">
            <div className="flex justify-center">
              <Image src="/licoes_logo.png" alt="LICOES Logo" width={72} height={72} className="object-contain" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-900">LICOES Membership Fee</h1>
              <p className="text-xs text-slate-500">Sign in with your school Google account to continue.</p>
            </div>
            <div className="space-y-2 pt-1">
              <p className="text-xs text-slate-400 leading-relaxed">
                Your Google account is used to verify your identity and prevent duplicate submissions.
              </p>
              <button
                onClick={() => signIn('google', { callbackUrl: '/submit-claim' })}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors shadow-sm"
              >
                {/* Google logo SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── Fetch error ────────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">Connection Error</h1>
          <p className="text-sm text-slate-500">
            Could not reach the server. Please check your connection and try again.
          </p>
          <button
            onClick={loadPeriod}
            className="mt-2 text-xs bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  // ── No active period ───────────────────────────────────────────────────────
  if (!period) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">No Active Collection Period</h1>
          <p className="text-sm text-slate-500">
            Membership fee submissions are currently closed. Please check back later or contact your LICOES officer.
          </p>
        </div>
      </main>
    )
  }

  // ── Already submitted ──────────────────────────────────────────────────────
  if (alreadySubmitted) {
    const statusLabel =
      existingStatus === 'APPROVED' ? 'Approved'
      : existingStatus === 'PENDING' ? 'Under Review'
      : existingStatus ?? 'Submitted'
    const statusColor =
      existingStatus === 'APPROVED' ? 'text-emerald-600'
      : existingStatus === 'PENDING' ? 'text-amber-600'
      : 'text-slate-600'
    const statusBg =
      existingStatus === 'APPROVED' ? 'bg-emerald-50 border-emerald-200'
      : existingStatus === 'PENDING' ? 'bg-amber-50 border-amber-200'
      : 'bg-slate-50 border-slate-200'

    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-5">
          <div className="flex justify-center">
            <Image src="/licoes_logo.png" alt="LICOES Logo" width={64} height={64} className="object-contain" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-800">Already Submitted</h1>
            <p className="text-xs text-slate-500">You have already submitted a payment claim for this collection period.</p>
          </div>
          <div className={`rounded-xl border px-4 py-3 ${statusBg}`}>
            <p className="text-xs text-slate-500">Claim Status</p>
            <p className={`text-base font-bold mt-0.5 ${statusColor}`}>{statusLabel}</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The LICOES Treasurer will verify your payment and send an official e-receipt to{' '}
            <span className="font-semibold text-slate-600">{dwclEmail}</span> once approved.
          </p>
          <button
            onClick={() => signOut({ callbackUrl: '/submit-claim' })}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </main>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">Claim Submitted!</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your payment claim has been received. The LICOES Treasurer will verify your
            payment and send an official e-receipt to{' '}
            <span className="font-semibold text-slate-700">{dwclEmail}</span> once approved.
          </p>
          <button
            onClick={() => signOut({ callbackUrl: '/submit-claim' })}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </main>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 py-12">
      <div className="w-full max-w-lg space-y-4">

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="flex justify-center mb-1">
            <Image src="/licoes_logo.png" alt="LICOES Logo" width={72} height={72} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">LICOES Membership Fee</h1>
          <p className="text-xs text-slate-500">{period.name}</p>
        </div>

        {/* Signed-in indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Signed in as <span className="font-semibold text-slate-600">{dwclEmail}</span></span>
          <button
            onClick={() => signOut({ callbackUrl: '/submit-claim' })}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-[var(--brand-500)] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((step, idx) => {
            const done   = currentStep > step.id
            const active = currentStep === step.id
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-[var(--brand-500)] text-white ring-4 ring-[var(--brand-100)]'
                        : 'bg-slate-200 text-slate-400'
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                  </div>
                  <span className={`text-[10px] font-semibold whitespace-nowrap ${
                    active ? 'text-[var(--brand-600)]' : done ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-16 h-0.5 mb-4 mx-1 transition-all ${
                    currentStep > step.id ? 'bg-emerald-400' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">

          {/* Error banner */}
          {errorMessage && (
            <div className="bg-red-50 border-b border-red-200 text-red-700 px-5 py-3 flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {errorMessage}
            </div>
          )}

          <div className="p-6">

            {/* ── STEP 1: Student Information ──────────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Student Information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Fill in your school details so we can identify your payment.</p>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Student ID Number *</label>
                      <input
                        value={studentNumber}
                        onChange={(e) => setStudentNumber(e.target.value)}
                        placeholder="e.g. 07305868"
                        className="w-full bg-white border border-slate-300 focus:border-[var(--brand-400)] rounded-lg p-2.5 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Year Level *</label>
                      <select
                        value={yearLevel}
                        onChange={(e) => setYearLevel(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-[var(--brand-400)] rounded-lg p-2.5 outline-none"
                      >
                        <option value="">Select</option>
                        {[1, 2, 3, 4].map((y) => (
                          <option key={y} value={y}>{y}{['st','nd','rd','th'][y-1]} Year</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">Full Name *</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="SURNAME, First Name Middle Name"
                      className="w-full bg-white border border-slate-300 focus:border-[var(--brand-400)] rounded-lg p-2.5 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* DWCL Email — locked to Google session */}
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">DWCL Email</label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-slate-500 truncate select-none">
                        {dwclEmail}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Program *</label>
                      <select
                        value={program}
                        onChange={(e) => setProgram(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-[var(--brand-400)] rounded-lg p-2.5 outline-none"
                      >
                        <option value="">Select</option>
                        {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Fee Items ────────────────────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Fee Items</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Select the items you are paying for.</p>
                </div>
                <div className="space-y-2 text-xs">
                  {period.feeItems.map((fee) => {
                    const selected = selectedFeeIds.includes(fee.id)
                    return (
                      <div
                        key={fee.id}
                        onClick={() => toggleFeeItem(fee.id, fee.isRequired)}
                        className={`flex items-center justify-between rounded-lg px-3 py-3 border transition-all ${
                          fee.isRequired ? 'cursor-default' : 'cursor-pointer'
                        } ${
                          selected
                            ? 'border-[var(--brand-300)] bg-[var(--brand-50)]'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            selected ? 'border-[var(--brand-500)] bg-[var(--brand-500)]' : 'border-slate-300'
                          }`}>
                            {selected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{fee.name}</p>
                            {fee.isRequired && <p className="text-[10px] text-[var(--brand-500)]">Required</p>}
                          </div>
                        </div>
                        <p className="font-bold text-emerald-600">PHP {parseFloat(fee.amount).toFixed(2)}</p>
                      </div>
                    )
                  })}

                  {/* Shirt size selector */}
                  {period.feeItems.filter((f) => f.requiresShirtSize && selectedFeeIds.includes(f.id)).map((f) => (
                    <div key={f.id} className="space-y-1.5 pt-1">
                      <label className="font-medium text-slate-700">Shirt Size for {f.name} *</label>
                      <div className="flex gap-2 flex-wrap">
                        {SHIRT_SIZES.map((sz) => (
                          <button
                            type="button"
                            key={sz}
                            onClick={() => setShirtSizes((p) => ({ ...p, [f.id]: sz }))}
                            className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                              shirtSizes[f.id] === sz
                                ? 'border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-600)]'
                                : 'border-slate-300 text-slate-600 hover:border-slate-400'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-1">
                    <span className="text-slate-500 font-medium">Total</span>
                    <span className="font-bold text-base text-emerald-600">PHP {getTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Payment Details ──────────────────────────────── */}
            {currentStep === 3 && (
              <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-slate-800">Payment Details</h2>
                  <p className="text-xs text-slate-500">How did you pay?</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {(['GCash', 'Bank Transfer', 'Cash'] as const).map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border font-semibold transition-colors ${
                          paymentMethod === m
                            ? 'border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-600)]'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {m === 'Cash' ? <Banknote className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">
                        {paymentMethod === 'Cash' ? 'OR / Slip Number' : 'Reference Number'} *
                      </label>
                      <input
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder={paymentMethod === 'GCash' ? 'e.g. 9023182' : paymentMethod === 'Cash' ? 'e.g. OR-0812' : 'e.g. 12345678'}
                        className="w-full bg-white border border-slate-300 focus:border-[var(--brand-400)] rounded-lg p-2.5 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Payment Date *</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full bg-white border border-slate-300 focus:border-[var(--brand-400)] rounded-lg p-2.5 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Proof of payment */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-medium text-slate-700">
                    {paymentMethod === 'Cash' ? 'Photo of Receipt' : 'Screenshot of Payment'}{' '}
                    <span className="text-[var(--brand-500)]">* Required</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) { setSelectedFile(f); setErrorMessage('') }
                    }}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      selectedFile
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-300 hover:border-[var(--brand-300)] bg-slate-50'
                    }`}
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-lg text-left">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold text-slate-800 truncate">{selectedFile.name}</p>
                            <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <UploadCloud className="w-7 h-7 text-[var(--brand-400)] mx-auto" />
                        <p className="font-medium text-slate-600">Click to upload</p>
                        <p className="text-[10px] text-slate-400">PNG, JPG, WEBP — max 5 MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Privacy consent */}
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-[var(--brand-50)] text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-600)]">Privacy Consent (RA 10173)</p>
                  <p className="text-slate-600 leading-relaxed">
                    By submitting this form, you consent to LICOES collecting and processing your student
                    number, name, DWCL email, payment details, and proof of payment solely for membership
                    fee verification and record-keeping purposes.
                  </p>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      className="mt-0.5 rounded accent-[var(--brand-500)]"
                    />
                    <span className="text-slate-700">
                      I agree to the data processing notice above and consent to LICOES using my
                      information for the stated purpose.
                    </span>
                  </label>
                </div>
              </form>
            )}
          </div>

          {/* Navigation footer */}
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                form="payment-form"
                disabled={isPending || !privacyConsent}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Submit Payment Claim</>
                }
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          Step {currentStep} of {STEPS.length}
        </p>

      </div>
    </main>
  )
}
