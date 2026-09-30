'use client'

import { useState, useRef } from 'react'
import { ShieldCheck, Send, CheckCircle2, UploadCloud, Loader2, Image as ImageIcon, Banknote, Smartphone, X } from 'lucide-react'
import { submitClaimAction } from '@/app/actions/submit-claim'

export default function SubmitClaimPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'CASH'>('ONLINE')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setErrorMessage('')
    }
  }

  const handleTriggerUpload = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedFile) {
      setErrorMessage('REQUIRED: Paki-upload ang larawan ng resibo / screenshot bago mag-submit.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    const formData = new FormData(e.currentTarget)
    formData.append('paymentMethod', paymentMethod)
    if (selectedFile) {
      formData.append('receiptFile', selectedFile)
    }

    const result = await submitClaimAction(formData)

    setLoading(false)

    if (result.success) {
      setSubmitted(true)
    } else {
      setErrorMessage(result.message)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400 mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">LICOES Membership Fee Submission</h1>
          <p className="text-xs text-slate-400">
            Ipasok ang iyong detalye at katibayan ng pagbabayad (Online o Cash).
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-950/60 border border-emerald-500/40 p-6 rounded-xl text-center space-y-3 animate-in fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-base font-semibold text-emerald-200">Naipasa na ang iyong Claim!</h2>
            <p className="text-xs text-emerald-300/80 leading-relaxed">
              I-che-check ito ng LICOES Treasurer. Kapag na-verify ang resibo, makakatanggap ka ng Official E-Receipt sa iyong email.
            </p>
            <button
              onClick={() => {
                setSubmitted(false)
                setSelectedFile(null)
              }}
              className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Mag-pasa ng panibagong claim
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMessage && (
              <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 rounded-lg font-medium">
                {errorMessage}
              </div>
            )}

            {/* Payment Type Switcher */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Paraan ng Pagbayad (Payment Method)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border font-medium transition-all ${
                    paymentMethod === 'ONLINE'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> GCash / Online
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border font-medium transition-all ${
                    paymentMethod === 'CASH'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Banknote className="w-4 h-4" /> Cash / Physical
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Student ID Number <span className="text-red-400">*</span></label>
              <input
                type="text"
                name="studentId"
                required
                placeholder="hal. 2023-10293"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Buong Pangalan (Full Name) <span className="text-red-400">*</span></label>
              <input
                type="text"
                name="name"
                required
                placeholder="Juan Dela Cruz"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">DWCL Student Email <span className="text-red-400">*</span></label>
              <input
                type="email"
                name="email"
                required
                placeholder="student@dwcl.edu.ph"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Halaga (Amount)</label>
                <input
                  type="text"
                  name="amount"
                  value="₱150.00"
                  readOnly
                  className="w-full bg-slate-950 border border-slate-800/60 text-slate-400 font-semibold rounded-lg p-2.5 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {paymentMethod === 'ONLINE' ? 'GCash Ref No.' : 'OR / AR Slip No.'} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="referenceNo"
                  required
                  placeholder={paymentMethod === 'ONLINE' ? 'hal. 9023182' : 'hal. OR-0812'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 outline-none font-mono text-indigo-400"
                />
              </div>
            </div>

            {/* Clickable & Required File Upload Container */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {paymentMethod === 'ONLINE' ? 'GCash Screenshot' : 'Larawan ng Physical Resibo'} <span className="text-red-400">* Required</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={handleTriggerUpload}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-emerald-500/60 bg-emerald-950/20'
                    : 'border-slate-800 hover:border-indigo-500 bg-slate-950/60'
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-left">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <ImageIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <UploadCloud className="w-7 h-7 text-indigo-400 mx-auto" />
                    <p className="text-xs font-medium text-slate-300">
                      I-click dito para mag-upload ng larawan ng resibo
                    </p>
                    <p className="text-[10px] text-slate-500">
                      PNG, JPG, o WEBP (Max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold p-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ipinapadala...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  I-submit Payment Claim
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}