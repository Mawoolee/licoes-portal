'use client'

import { useState, useTransition } from 'react'
import {
  Check, X, Clock, Loader2, Eye, ExternalLink,
  Smartphone, Banknote, Image as ImageIcon,
  CheckCircle2, AlertCircle, ChevronDown, Receipt,
} from 'lucide-react'
import { approvePaymentClaim, rejectPaymentClaim } from '@/app/actions/treasurer'

type FeeItem = { id: string; name: string }
type ClaimItem = { id: string; amount: string; feeItem: FeeItem }
type EReceipt = { receiptNumber: string; deliveryStatus: string } | null
type CollectionPeriod = { name: string }

type Claim = {
  id: string
  submittedStudentNo: string
  submittedFullName: string
  dwclEmail: string
  program: string
  yearLevel: number
  paymentMethod: string
  paymentReference: string
  paymentDate: Date
  proofOfPaymentUrl: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  verifiedAt: Date | null
  createdAt: Date
  claimItems: ClaimItem[]
  collectionPeriod: CollectionPeriod
  eReceipt: EReceipt
}

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'

export default function TreasurerClaimsClient({ initialClaims }: { initialClaims: Claim[] }) {
  const [claims, setClaims] = useState<Claim[]>(initialClaims)
  const [filter, setFilter] = useState<StatusFilter>('PENDING')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Receipt preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Approve modal
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [verificationSource, setVerificationSource] = useState<'GCASH' | 'BANK' | 'CASH_LOGBOOK'>('GCASH')
  const [verificationNote, setVerificationNote] = useState('')

  // Reject modal
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 5000)
  }

  function totalAmount(claim: Claim) {
    return claim.claimItems.reduce((s, i) => s + parseFloat(i.amount), 0)
  }

  async function handleApprove() {
    if (!approvingId) return
    startTransition(async () => {
      const result = await approvePaymentClaim({
        paymentClaimId: approvingId,
        verificationSource,
        verificationNote,
      })
      if (result.success) {
        setClaims((prev) =>
          prev.map((c) =>
            c.id === approvingId
              ? { ...c, status: 'APPROVED', eReceipt: { receiptNumber: result.receiptNumber!, deliveryStatus: 'QUEUED' } }
              : c
          )
        )
        showToast('success', `Approved — E-Receipt ${result.receiptNumber} queued for delivery.`)
        setApprovingId(null)
        setVerificationNote('')
      } else {
        showToast('error', result.error ?? 'Approval failed.')
      }
    })
  }

  async function handleReject() {
    if (!rejectingId || !rejectionReason.trim()) return
    startTransition(async () => {
      const result = await rejectPaymentClaim({ paymentClaimId: rejectingId, rejectionReason })
      if (result.success) {
        setClaims((prev) =>
          prev.map((c) => (c.id === rejectingId ? { ...c, status: 'REJECTED', rejectionReason } : c))
        )
        showToast('success', 'Payment claim rejected.')
        setRejectingId(null)
        setRejectionReason('')
      } else {
        showToast('error', result.error ?? 'Rejection failed.')
      }
    })
  }

  const filtered = filter === 'ALL' ? claims : claims.filter((c) => c.status === filter)
  const counts = {
    PENDING: claims.filter((c) => c.status === 'PENDING').length,
    APPROVED: claims.filter((c) => c.status === 'APPROVED').length,
    REJECTED: claims.filter((c) => c.status === 'REJECTED').length,
  }

  const statusBadge = (status: string) => {
    if (status === 'PENDING') return 'bg-amber-100 text-amber-700'
    if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-700'
    return 'bg-[var(--brand-50)] text-[var(--brand-600)]'
  }

  const deliveryBadge = (s: string) => {
    if (s === 'SENT') return 'text-emerald-600'
    if (s === 'FAILED') return 'text-[var(--brand-500)]'
    return 'text-amber-500'
  }

  const vsLabel = { GCASH: 'GCash', BANK: 'Bank Statement', CASH_LOGBOOK: 'Cash Logbook' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-600)]">Membership Fee Verification</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Review proof of payment, verify against GCash / bank records, then approve or reject.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg flex items-center gap-2.5 text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-[var(--brand-50)] border border-[var(--brand-100)] text-[var(--brand-600)]'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.text}
        </div>
      )}

      {/* Filter tabs + summary */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === s
                ? 'bg-[var(--brand-500)] text-white border-[var(--brand-500)]'
                : 'bg-white border-[var(--brand-100)] text-[var(--text-muted)] hover:bg-[var(--brand-50)]'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            {s !== 'ALL' && (
              <span className="ml-1.5 font-bold">{counts[s]}</span>
            )}
          </button>
        ))}
        <span className="text-xs text-[var(--text-muted)] ml-auto">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[var(--brand-100)] rounded-xl p-16 text-center text-[var(--text-muted)] text-sm shadow-sm">
          No {filter === 'ALL' ? '' : filter.toLowerCase()} payment claims.
        </div>
      ) : (
        <div className="bg-white border border-[var(--brand-100)] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-alt)] border-b border-[var(--brand-100)] text-xs uppercase text-[var(--text-muted)] font-semibold">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Period</th>
                <th className="p-4">Fee Items</th>
                <th className="p-4">Method · Reference</th>
                <th className="p-4">Proof</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--brand-50)]">
              {filtered.map((claim) => (
                <tr key={claim.id} className="hover:bg-[var(--bg-cream)] transition-colors">
                  {/* Student */}
                  <td className="p-4">
                    <p className="font-semibold">{claim.submittedFullName}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{claim.submittedStudentNo}</p>
                    <p className="text-xs text-[var(--text-muted)]">{claim.dwclEmail}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{claim.program} · Yr {claim.yearLevel}</p>
                  </td>

                  {/* Period */}
                  <td className="p-4 text-xs text-[var(--text-muted)] max-w-[120px]">
                    {claim.collectionPeriod.name}
                  </td>

                  {/* Fee Items */}
                  <td className="p-4">
                    <div className="space-y-0.5">
                      {claim.claimItems.map((ci) => (
                        <p key={ci.id} className="text-xs text-[var(--text-primary)]">· {ci.feeItem.name}</p>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-emerald-600 mt-1">
                      PHP {totalAmount(claim).toFixed(2)}
                    </p>
                  </td>

                  {/* Method + Reference */}
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-600)] mb-1">
                      {claim.paymentMethod === 'ONLINE' || claim.paymentMethod === 'GCash'
                        ? <Smartphone className="w-3 h-3 text-[var(--brand-500)]" />
                        : <Banknote className="w-3 h-3 text-emerald-500" />}
                      {claim.paymentMethod}
                    </span>
                    <p className="text-xs font-mono text-[var(--text-muted)]">{claim.paymentReference}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(claim.paymentDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>

                  {/* Proof */}
                  <td className="p-4">
                    {claim.proofOfPaymentUrl ? (
                      <button
                        onClick={() => setPreviewUrl(claim.proofOfPaymentUrl)}
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-600)] hover:text-[var(--brand-500)] font-medium bg-[var(--brand-50)] hover:bg-[var(--brand-100)] px-2.5 py-1 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] italic">None</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadge(claim.status)}`}>
                      {claim.status === 'PENDING' && <Clock className="w-3 h-3" />}
                      {claim.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                      {claim.status === 'REJECTED' && <X className="w-3 h-3" />}
                      {claim.status}
                    </span>
                    {claim.status === 'APPROVED' && claim.eReceipt && (
                      <p className={`text-[11px] font-mono mt-1 ${deliveryBadge(claim.eReceipt.deliveryStatus)}`}>
                        <Receipt className="w-2.5 h-2.5 inline mr-0.5" />
                        {claim.eReceipt.receiptNumber} · {claim.eReceipt.deliveryStatus}
                      </p>
                    )}
                    {claim.status === 'REJECTED' && claim.rejectionReason && (
                      <p className="text-[11px] text-[var(--brand-500)] mt-1 max-w-[140px] truncate" title={claim.rejectionReason}>
                        {claim.rejectionReason}
                      </p>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    {claim.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setApprovingId(claim.id); setVerificationSource('GCASH') }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 rounded-md"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => { setRejectingId(claim.id) }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-600)] border border-[var(--brand-100)] hover:bg-[var(--brand-50)] h-8 px-3 rounded-md"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Proof of Payment Lightbox ─────────────────────────── */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <img
              src={previewUrl}
              alt="Proof of Payment"
              className="w-full max-h-[80vh] object-contain rounded-xl border border-[var(--brand-100)] shadow-2xl"
            />
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open full image
            </a>
          </div>
        </div>
      )}

      {/* ── Approve Modal ─────────────────────────────────────── */}
      {approvingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--brand-100)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Confirm Approval</h3>
              <button onClick={() => setApprovingId(null)} className="text-[var(--text-muted)] hover:text-[var(--brand-600)]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Verification Source *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['GCASH', 'BANK', 'CASH_LOGBOOK'] as const).map((vs) => (
                    <button
                      key={vs}
                      type="button"
                      onClick={() => setVerificationSource(vs)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        verificationSource === vs
                          ? 'bg-[var(--brand-500)] text-white border-[var(--brand-500)]'
                          : 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--brand-100)] hover:border-[var(--brand-300)]'
                      }`}
                    >
                      {vsLabel[vs]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Verification Note (optional)</label>
                <textarea
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  placeholder="e.g. Verified GCash ref 98231 — PHP 250.00 received Oct 1"
                  rows={3}
                  className="w-full px-3 py-2 text-sm text-[var(--text-primary)] border border-[var(--brand-100)] rounded-lg bg-[var(--surface-alt)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve & Issue E-Receipt
              </button>
              <button
                onClick={() => setApprovingId(null)}
                className="px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ─────────────────────────────────────── */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--brand-100)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Reject Payment Claim</h3>
              <button onClick={() => { setRejectingId(null); setRejectionReason('') }} className="text-[var(--text-muted)] hover:text-[var(--brand-600)]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-muted)]">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. GCash reference not found. Please resubmit with the correct 13-digit reference number."
                rows={4}
                className="w-full px-3 py-2 text-sm text-[var(--text-primary)] border border-[var(--brand-100)] rounded-lg bg-[var(--surface-alt)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)] resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={isPending || !rejectionReason.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Reject Claim
              </button>
              <button
                onClick={() => { setRejectingId(null); setRejectionReason('') }}
                className="px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
