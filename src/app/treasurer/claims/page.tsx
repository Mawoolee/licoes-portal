'use client'

import { useState } from 'react'
import { Check, X, Clock, Loader2, Eye, ExternalLink, Smartphone, Banknote, Image as ImageIcon } from 'lucide-react'
import { approvePaymentAction } from '@/app/actions/payment-actions'

export default function PaymentClaimsPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  
  // State para sa Receipt Preview Modal
  const [activeReceipt, setActiveReceipt] = useState<{
    studentName: string
    studentId: string
    method: 'ONLINE' | 'CASH'
    reference: string
    imageUrl: string
  } | null>(null)

  const [claims, setClaims] = useState([
    {
      id: '1',
      studentId: '2023-10293',
      name: 'Juan Dela Cruz',
      email: 'student@dwcl.edu.ph',
      amount: '₱150.00',
      method: 'ONLINE' as const,
      reference: 'GCash #98231',
      date: '2026-09-30',
      status: 'PENDING',
      receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80' // Mock screenshot image
    },
    {
      id: '2',
      studentId: '2022-88210',
      name: 'Maria Clara',
      email: 'maria@dwcl.edu.ph',
      amount: '₱150.00',
      method: 'CASH' as const,
      reference: 'OR #0812',
      date: '2026-09-30',
      status: 'PENDING',
      receiptUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&q=80' // Mock receipt image
    }
  ])

  const handleApprove = async (claim: typeof claims[0]) => {
    setLoadingId(claim.id)
    
    const result = await approvePaymentAction({
      id: claim.id,
      studentName: claim.name,
      studentEmail: claim.email,
      studentId: claim.studentId,
      amount: claim.amount,
      referenceNo: claim.reference,
    })

    if (result.success) {
      setClaims(claims.map(c => c.id === claim.id ? { ...c, status: 'APPROVED' } : c))
      if (activeReceipt) setActiveReceipt(null)
    } else {
      alert(result.message)
    }

    setLoadingId(null)
  }

  const handleReject = (id: string) => {
    setClaims(claims.map(c => c.id === id ? { ...c, status: 'REJECTED' } : c))
    if (activeReceipt) setActiveReceipt(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Membership Fee Verification</h1>
        <p className="text-sm text-slate-500">I-review ang resibo at panagutan ang e-receipt verification para sa mga pumasok na claim.</p>
      </div>

      {/* Claims Table */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b text-xs uppercase text-slate-500 font-semibold">
            <tr>
              <th className="p-4">Student Info</th>
              <th className="p-4">Type</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Reference No.</th>
              <th className="p-4">Proof</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {claims.map((claim) => (
              <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="p-4 font-medium">
                  <div>{claim.name}</div>
                  <div className="text-xs text-slate-400 font-normal">{claim.studentId} • {claim.email}</div>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {claim.method === 'ONLINE' ? <Smartphone className="w-3 h-3 text-indigo-500" /> : <Banknote className="w-3 h-3 text-emerald-500" />}
                    {claim.method}
                  </span>
                </td>
                <td className="p-4 font-semibold text-emerald-600">{claim.amount}</td>
                <td className="p-4 text-slate-500 font-mono text-xs">{claim.reference}</td>
                <td className="p-4">
                  <button
                    onClick={() => setActiveReceipt({
                      studentName: claim.name,
                      studentId: claim.studentId,
                      method: claim.method,
                      reference: claim.reference,
                      imageUrl: claim.receiptUrl
                    })}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Receipt
                  </button>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                    claim.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    claim.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {claim.status === 'PENDING' && <Clock className="w-3 h-3" />}
                    {claim.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  {claim.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(claim)}
                        disabled={loadingId === claim.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-3 rounded-md inline-flex items-center font-medium disabled:opacity-50"
                      >
                        {loadingId === claim.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(claim.id)}
                        className="text-red-600 border border-red-200 hover:bg-red-50 h-8 text-xs px-3 rounded-md inline-flex items-center font-medium"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Lightbox for Receipt Verification */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-sm">{activeReceipt.studentName}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{activeReceipt.studentId} • {activeReceipt.reference}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Image View */}
            <div className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[300px] max-h-[500px]">
              <img
                src={activeReceipt.imageUrl}
                alt="Uploaded Receipt"
                className="max-h-[450px] w-auto object-contain rounded-lg border border-slate-800 shadow-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex items-center justify-between text-xs text-slate-500">
              <span>Paraan: <strong>{activeReceipt.method}</strong></span>
              <a
                href={activeReceipt.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Full Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}