'use client'

import { useState, useRef, useEffect } from 'react'
import { lookupStudentAction } from '@/app/actions/alphalist-actions'
import { AlertTriangle, CheckCircle2, Scan } from 'lucide-react'

export default function AttendanceTerminalPage() {
  const [scannedInput, setScannedInput] = useState('')
  const [logs, setLogs] = useState<any[]>([])
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean
    message: string
    name?: string
  } | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus sa barcode input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scannedInput.trim()) return

    const rawId = scannedInput.trim()
    setScannedInput('')

    // Hanapin ang student sa Alpha List
    const result = await lookupStudentAction(rawId)

    const now = new Date().toLocaleTimeString('en-US')

    if (result.found && result.student) {
      const student = result.student

      const newLog = {
        id: student.id,
        name: student.fullName,
        section: student.section,
        timeIn: now,
        status: 'PRESENT',
      }

      setLogs((prev) => [newLog, ...prev])
      setLastScanResult({
        success: true,
        message: `SUCCESS: Time-In recorded for ${student.fullName}!`,
        name: student.fullName,
      })
    } else {
      // Kapag wala sa Alpha List
      const newLog = {
        id: rawId,
        name: 'UNREGISTERED STUDENT',
        section: 'N/A',
        timeIn: now,
        status: 'NOT IN ALPHA LIST',
      }

      setLogs((prev) => [newLog, ...prev])
      setLastScanResult({
        success: false,
        message: `WARNING: Student ID ${rawId} is NOT in the Alpha List!`,
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Scan className="w-6 h-6 text-indigo-400" /> LICOES Attendance Terminal
          </h1>
          <p className="text-xs text-slate-400">Barcode Scanner Active • Connected to Alpha List Masterlist</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner Input Section */}
        <div className="space-y-4">
          <form onSubmit={handleScanSubmit} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <label className="text-xs font-medium text-slate-300 block">Scan Barcode / Student ID</label>
            <input
              ref={inputRef}
              type="text"
              value={scannedInput}
              onChange={(e) => setScannedInput(e.target.value)}
              placeholder="I-scan o i-type ang Student ID..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 p-3 rounded-lg text-sm font-mono outline-none"
              autoFocus
            />
          </form>

          {/* Feedback Banner */}
          {lastScanResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              lastScanResult.success ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
            }`}>
              {lastScanResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
              <div className="text-xs">
                <p className="font-semibold">{lastScanResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Session Logs */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-semibold text-xs text-slate-300">
            Real-time Session Logs
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Student ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Section</th>
                <th className="p-3">Time In</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map((log, index) => (
                <tr key={index} className="hover:bg-slate-800/30 font-mono">
                  <td className="p-3 text-indigo-400 font-semibold">{log.id}</td>
                  <td className="p-3 font-sans font-medium text-slate-200">{log.name}</td>
                  <td className="p-3 text-slate-400">{log.section}</td>
                  <td className="p-3 text-emerald-400">{log.timeIn}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                      log.status === 'PRESENT' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}