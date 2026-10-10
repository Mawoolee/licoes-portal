'use client'

import { useState, useTransition } from 'react'
import {
  Check, X, Clock, Loader2, Eye, ExternalLink,
  CheckCircle2, AlertCircle, Receipt, ArrowUpDown,
  User, Calendar, CreditCard, Hash, FileText,
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
  shirtSize: string | null
  paymentMethod: string
  paymentReference: string
  paymentDate: string
  proofOfPaymentUrl: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  verifiedAt: string | null
  createdAt: string
  claimItems: ClaimItem[]
  collectionPeriod: CollectionPeriod
  eReceipt: EReceipt
}

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  REJECTED: 'bg-[var(--brand-50)] text-[var(--brand-600)] border-[var(--brand-100)]',
}

const DELIVERY_COLOR: Record<string, string> = {
  SENT: 'text-green-600',
  FAILED: 'text-[var(--brand-500)]',
  QUEUED: 'text-amber-500',
}

const VS_LABELS: Record<string, string> = {
  GCASH: 'GCash',
  BANK: 'Bank Statement',
  CASH_LOGBOOK: 'Cash Logbook',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function PaymentClaimsClient({ initialClaims }: { initialClaims: Claim[] }) {
  const [claims, setClaims] = useState<Claim[]>(initialClaims)
  const [filter, setFilter] = useState<StatusFilter>('PENDING')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [detailClaim, setDetailClaim] = useState<Claim | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [verificationSource, setVerificationSource] = useState<'GCASH' | 'BANK' | 'CASH_LOGBOOK'>('GCASH')
  const [verificationNote, setVerificationNote] = useState('')
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
      const result = await approvePaymentClaim({ paymentClaimId: approvingId, verificationSource, verificationNote })
      if (result.success) {
        setClaims((prev) => prev.map((c) =>
          c.id === approvingId
            ? { ...c, status: 'APPROVED', eReceipt: { receiptNumber: result.receiptNumber!, deliveryStatus: 'QUEUED' } }
            : c
        ))
        showToast('success', `Approved — E-Receipt ${result.receiptNumber} issued.`)
        setApprovingId(null)
        setVerificationNote('')
        setDetailClaim(null)
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
        setClaims((prev) => prev.map((c) => c.id === rejectingId ? { ...c, status: 'REJECTED', rejectionReason } : c))
        showToast('success', 'Payment claim rejected.')
        setRejectingId(null)
        setRejectionReason('')
        setDetailClaim(null)
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Payment Claims</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Review membership fee payments. Click a row to view full details.
        </p>
      </div>

      {toast && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium border ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-[var(--brand-50)] border-[var(--brand-100)] text-[var(--brand-600)]'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.text}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === s
                ? 'bg-[var(--brand-500)] text-white border-[var(--brand-500)]'
                : 'bg-white border-[var(--brand-100)] text-[var(--text-muted)] hover:bg-[var(--brand-50)]'
            }`}>
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            {s !== 'ALL' && <span className="ml-1.5 font-bold">{counts[s]}</span>}
          </button>
        ))}
        <span className="text-xs text-[var(--text-muted)] ml-auto">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-16 text-center text-[var(--text-muted)] text-sm">
          No {filter === 'ALL' ? '' : filter.toLowerCase()} payment claims.
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-alt)] border-b border-[var(--brand-100)] text-xs uppercase text-[var(--text-muted)] font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Program / Year</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--brand-50)]">
              {filtered.map((claim) => (
                <tr key={claim.id}
                  className="hover:bg-[var(--brand-50)] transition-colors cursor-pointer"
                  onClick={() => setDetailClaim(claim)}>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {fmt(claim.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--text-primary)] text-xs">{claim.submittedFullName}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{claim.submittedStudentNo}</p>
                    <p className="text-xs text-[var(--text-muted)]">{claim.dwclEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {claim.program}<br />Year {claim.yearLevel}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{claim.paymentMethod}</p>
                    <p className="text-xs font-mono text-[var(--text-muted)]">{claim.paymentReference}</p>
                    <p className="text-xs text-[var(--text-muted)]">{fmtDate(claim.paymentDate)}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600">
                    PHP {totalAmount(claim).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${STATUS_BADGE[claim.status]}`}>
                      {claim.status === 'PENDING' && <Clock className="w-3 h-3" />}
                      {claim.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                      {claim.status === 'REJECTED' && <X className="w-3 h-3" />}
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {claim.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setApprovingId(claim.id); setVerificationSource('GCASH') }}
                          className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => setRejectingId(claim.id)}
                          className="text-xs font-semibold text-[var(--brand-600)] border border-[var(--brand-100)] hover:bg-[var(--brand-50)] px-3 py-1.5 rounded-md inline-flex items-center gap-1">
                          <X className="w-3 h-3" /> Reject
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

      {/* ── Detail Modal ── */}
      {detailClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailClaim(null)}>
          <div className="w-full max-w-lg bg-[var(--surface)] rounded-2xl border border-[var(--brand-100)] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-[var(--brand-500)] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white">Payment Claim Details</h2>
                <p className="text-xs text-white/70 mt-0.5">{detailClaim.collectionPeriod.name}</p>
              </div>
              <button onClick={() => setDetailClaim(null)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${STATUS_BADGE[detailClaim.status]}`}>
                  {detailClaim.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                  {detailClaim.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {detailClaim.status === 'REJECTED' && <X className="w-3.5 h-3.5" />}
                  {detailClaim.status}
                </span>
                <p className="text-xs text-[var(--text-muted)]">Submitted: {fmt(detailClaim.createdAt)}</p>
              </div>

              {/* Student Info */}
              <section className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Student Information
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Student ID" value={detailClaim.submittedStudentNo} mono />
                  <DetailField label="Email Address" value={detailClaim.dwclEmail} />
                  <DetailField label="Full Name (Surname, First MI)" value={detailClaim.submittedFullName} span2 />
                  <DetailField label="Program" value={detailClaim.program} />
                  <DetailField label="Year Level" value={`Year ${detailClaim.yearLevel}`} />
                  {detailClaim.shirtSize && <DetailField label="Shirt Size" value={detailClaim.shirtSize} />}
                </div>
              </section>

              {/* Payment Info */}
              <section className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Payment Information
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Mode of Payment" value={detailClaim.paymentMethod} />
                  <DetailField label="Control / Reference No." value={detailClaim.paymentReference} mono />
                  <DetailField label="Date of Payment" value={fmtDate(detailClaim.paymentDate)} />
                  <DetailField label="Amount" value={`PHP ${totalAmount(detailClaim).toFixed(2)}`} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Fee Items</p>
                  {detailClaim.claimItems.map((ci) => (
                    <p key={ci.id} className="text-sm text-[var(--text-primary)]">· {ci.feeItem.name} — <span className="font-semibold text-green-600">PHP {parseFloat(ci.amount).toFixed(2)}</span></p>
                  ))}
                </div>
              </section>

              {/* Proof of Payment */}
              <section className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Proof of Payment
                </p>
                {detailClaim.proofOfPaymentUrl ? (
                  <div className="space-y-2">
                    <img src={detailClaim.proofOfPaymentUrl} alt="Proof of Payment"
                      className="w-full max-h-48 object-contain rounded-lg border border-[var(--brand-100)] cursor-pointer"
                      onClick={() => setPreviewUrl(detailClaim.proofOfPaymentUrl)} />
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewUrl(detailClaim.proofOfPaymentUrl)}
                        className="text-xs text-[var(--brand-500)] flex items-center gap-1 hover:underline">
                        <Eye className="w-3.5 h-3.5" /> View Full
                      </button>
                      <a href={detailClaim.proofOfPaymentUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-[var(--brand-500)] flex items-center gap-1 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">No proof uploaded.</p>
                )}
              </section>

              {/* E-Receipt */}
              {detailClaim.eReceipt && (
                <section className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-xs font-bold text-green-700">{detailClaim.eReceipt.receiptNumber}</p>
                      <p className={`text-[11px] font-semibold ${DELIVERY_COLOR[detailClaim.eReceipt.deliveryStatus]}`}>
                        {detailClaim.eReceipt.deliveryStatus}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Rejection reason */}
              {detailClaim.status === 'REJECTED' && detailClaim.rejectionReason && (
                <section className="rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--brand-500)] mb-1">Rejection Reason</p>
                  <p className="text-xs text-[var(--brand-600)]">{detailClaim.rejectionReason}</p>
                </section>
              )}

              {/* Actions */}
              {detailClaim.status === 'PENDING' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setApprovingId(detailClaim.id); setVerificationSource('GCASH') }}
                    className="flex-1 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg inline-flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => setRejectingId(detailClaim.id)}
                    className="flex-1 py-2.5 text-sm font-semibold text-[var(--brand-600)] border border-[var(--brand-100)] hover:bg-[var(--brand-50)] rounded-lg inline-flex items-center justify-center gap-2">
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Proof Lightbox ── */}
      {previewUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewUrl(null)}
              className="absolute -top-9 right-0 text-white/70 hover:text-white text-sm flex items-center gap-1">
              <X className="w-4 h-4" /> Close
            </button>
            <img src={previewUrl} alt="Proof of Payment"
              className="w-full max-h-[80vh] object-contain rounded-xl border border-white/20 shadow-2xl" />
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {approvingId && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--brand-100)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Confirm Approval</h3>
              <button onClick={() => setApprovingId(null)} className="text-[var(--text-muted)] hover:text-[var(--brand-600)]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Verification Source *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['GCASH', 'BANK', 'CASH_LOGBOOK'] as const).map((vs) => (
                    <button key={vs} type="button" onClick={() => setVerificationSource(vs)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        verificationSource === vs
                          ? 'bg-[var(--brand-500)] text-white border-[var(--brand-500)]'
                          : 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--brand-100)] hover:border-[var(--brand-300)]'
                      }`}>
                      {VS_LABELS[vs]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Verification Note (optional)</label>
                <textarea value={verificationNote} onChange={(e) => setVerificationNote(e.target.value)}
                  placeholder="e.g. Verified GCash ref 98231 — PHP 250.00 received Oct 1"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface-alt)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)] resize-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve & Issue E-Receipt
              </button>
              <button onClick={() => setApprovingId(null)}
                className="px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectingId && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--brand-100)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Reject Payment Claim</h3>
              <button onClick={() => { setRejectingId(null); setRejectionReason('') }} className="text-[var(--text-muted)] hover:text-[var(--brand-600)]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-muted)]">Rejection Reason *</label>
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. GCash reference not found. Please resubmit with the correct 13-digit reference number."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface-alt)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)] resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={isPending || !rejectionReason.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg disabled:opacity-50">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Reject Claim
              </button>
              <button onClick={() => { setRejectingId(null); setRejectionReason('') }}
                className="px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailField({ label, value, mono, span2 }: { label: string; value: string; mono?: boolean; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className={`text-sm text-[var(--text-primary)] mt-0.5 ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
    </div>
  )
}