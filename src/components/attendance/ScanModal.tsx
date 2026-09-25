'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, XCircle, Clock, AlertTriangle, ScanBarcode } from 'lucide-react'

interface ScanResult {
  scanMode: 'TIME_IN' | 'TIME_OUT'
  student: {
    studentNumber: string
    fullName: string
    program: string
    yearLevel: number
    dwclEmail: string
  }
  attendance: {
    eventName: string
    session: { timeIn: string; timeOut?: string }
    history: Array<{ eventName: string; status: string; isClosed: boolean }>
  }
  paymentStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'UNPAID'
}

interface ScanModalProps {
  eventId: string
  officerId: string
}

export function ScanModal({ eventId, officerId }: ScanModalProps) {
  const [open, setOpen] = useState(false)
  const [scanMode, setScanMode] = useState<'TIME_IN' | 'TIME_OUT'>('TIME_IN')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcodeValue: barcodeInput.trim(),
          eventId,
          scanMode,
          officerId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to process barcode scan.')
        setResult(null)
      } else {
        setResult(data)
        setError(null)
      }
    } catch {
      setError('Connection error. Please check network connectivity.')
    } finally {
      setLoading(false)
      setBarcodeInput('')
      inputRef.current?.focus()
    }
  }

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-600">PAID (APPROVED)</Badge>
      case 'PENDING':
        return <Badge variant="outline" className="text-amber-500 border-amber-500">PENDING APPROVAL</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">PAYMENT REJECTED</Badge>
      default:
        return <Badge variant="secondary">UNPAID</Badge>
    }
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <ScanBarcode className="w-4 h-4" /> Start ID Scanner
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>LICOES Attendance Scanner</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={scanMode === 'TIME_IN' ? 'default' : 'outline'}
                  onClick={() => setScanMode('TIME_IN')}
                >
                  Time In
                </Button>
                <Button
                  size="sm"
                  variant={scanMode === 'TIME_OUT' ? 'default' : 'outline'}
                  onClick={() => setScanMode('TIME_OUT')}
                >
                  Time Out
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              Scan barcode on Student Organization ID for active session: <strong>{scanMode}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Barcode Input Form */}
          <form onSubmit={handleScanSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Ready to scan Barcode..."
                disabled={loading}
                className="font-mono text-lg"
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Processing...' : 'Submit'}
              </Button>
            </div>
          </form>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Scan Result Profile Summary */}
          {result && (
            <div className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <h3 className="text-lg font-bold">{result.student.fullName}</h3>
                  <p className="text-sm text-slate-500 font-mono">{result.student.studentNumber}</p>
                  <p className="text-xs text-slate-600">
                    {result.student.program} - Year {result.student.yearLevel}
                  </p>
                </div>
                <div>{getPaymentBadge(result.paymentStatus)}</div>
              </div>

              {/* Session Confirmation */}
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 p-2 rounded text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Successfully recorded <strong>{result.scanMode}</strong> at{' '}
                  {new Date(
                    result.scanMode === 'TIME_IN'
                      ? result.attendance.session.timeIn
                      : result.attendance.session.timeOut!
                  ).toLocaleTimeString()}
                </span>
              </div>

              {/* Event Attendance Summary */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  Event Attendance History
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.attendance.history.map((h, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-1 bg-white dark:bg-slate-800 rounded border">
                      <span>{h.eventName}</span>
                      <span className="flex items-center gap-1">
                        {h.status === 'PRESENT' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                        {h.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}