'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import {
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  RefreshCw,
  Users,
  CalendarDays,
  Lock,
} from 'lucide-react'
import { getActiveEventsAction, recordScanAction } from '@/app/actions/attendance-actions'

type EventOption = {
  id: string
  name: string
  location: string
  windowStart: Date
  windowEnd: Date
  isClosed: boolean
}

type ScanLog = {
  id: string
  studentId: string
  studentName: string
  section: string
  scanMode: 'TIME_IN' | 'TIME_OUT'
  timeIn?: string
  timeOut?: string
  timestamp: string
  status: 'PRESENT' | 'UNREGISTERED' | 'ERROR'
}

export default function AttendancePage() {
  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [loadingEvents, setLoadingEvents] = useState(true)

  const [scannedInput, setScannedInput] = useState('')
  const [logs, setLogs] = useState<ScanLog[]>([])
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; scanMode?: 'TIME_IN' | 'TIME_OUT' } | null>(null)
  const [isPending, startTransition] = useTransition()

  const inputRef = useRef<HTMLInputElement>(null)

  // Load active events on mount
  useEffect(() => {
    getActiveEventsAction().then((evts) => {
      setEvents(evts as EventOption[])
      if (evts.length === 1) setSelectedEventId(evts[0].id)
      setLoadingEvents(false)
    })
  }, [])

  // Auto-focus input when an event is selected
  useEffect(() => {
    if (selectedEventId) inputRef.current?.focus()
  }, [selectedEventId])

  function refreshEvents() {
    setLoadingEvents(true)
    getActiveEventsAction().then((evts) => {
      setEvents(evts as EventOption[])
      setLoadingEvents(false)
    })
  }

  function playBeep(success: boolean) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(success ? 880 : 330, ctx.currentTime)
      osc.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } catch {}
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    const raw = scannedInput.trim()
    if (!raw || !selectedEventId) return
    setScannedInput('')

    startTransition(async () => {
      const result = await recordScanAction(selectedEventId, raw)

      playBeep(result.success)
      setLastResult({ success: result.success, message: result.message, scanMode: result.scanMode })

      const nowStr = new Date().toLocaleTimeString('en-PH', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
      })

      const log: ScanLog = {
        id: `${raw}-${Date.now()}`,
        studentId: result.studentId,
        studentName: result.studentName,
        section: result.section,
        scanMode: result.scanMode,
        timeIn: result.timeIn,
        timeOut: result.timeOut,
        timestamp: nowStr,
        status: result.success
          ? 'PRESENT'
          : result.message.includes('not found') || result.message.includes('NOT IN')
          ? 'UNREGISTERED'
          : 'ERROR',
      }
      setLogs((prev) => [log, ...prev])

      // Re-focus for the next scan
      setTimeout(() => inputRef.current?.focus(), 50)
    })
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId)
  const presentCount = logs.filter((l) => l.status === 'PRESENT').length

  return (
    <div
      className="min-h-screen bg-[var(--bg-cream)] text-[var(--text-primary)] p-6 space-y-5"
      onClick={() => inputRef.current?.focus()}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--brand-100)] pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--brand-50)] text-[var(--brand-600)] p-2.5 rounded-xl border border-[var(--brand-100)]">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">LICOES Attendance Terminal</h1>
            <p className="text-xs text-[var(--text-muted)]">
              {selectedEvent
                ? `${selectedEvent.name} · ${selectedEvent.location}`
                : 'Select an event to begin scanning'}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); refreshEvents() }}
          disabled={loadingEvents}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-600)] flex items-center gap-1.5 border border-[var(--brand-100)] px-3 py-1.5 rounded-lg"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
          Refresh Events
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left column: event selector + scanner input ── */}
        <div className="space-y-4">
          {/* Event selector */}
          <div className="bg-white border border-[var(--brand-100)] rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5 uppercase tracking-wide">
              <CalendarDays className="w-3.5 h-3.5" /> Active Event
            </label>
            {loadingEvents ? (
              <p className="text-xs text-[var(--text-muted)] animate-pulse">Loading events…</p>
            ) : events.length === 0 ? (
              <div className="text-xs text-amber-400 space-y-1">
                <p>No open events found.</p>
                <a href="/admin/events" className="underline hover:text-amber-300">
                  Create an event in Admin →
                </a>
              </div>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[var(--surface-alt)] border border-[var(--brand-100)] text-[var(--text-primary)] text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[var(--brand-400)]"
              >
                <option value="">— Select an event —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Scanner input */}
          <form
            onSubmit={handleScan}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[var(--brand-100)] rounded-xl p-4 space-y-3"
          >
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              Barcode / Student ID
            </label>
            <input
              ref={inputRef}
              type="text"
              value={scannedInput}
              onChange={(e) => setScannedInput(e.target.value)}
              placeholder={selectedEventId ? 'Ready to scan…' : 'Select an event first'}
              disabled={!selectedEventId || isPending}
              className="w-full bg-[var(--surface-alt)] border-2 border-[var(--brand-100)] focus:border-[var(--brand-400)] text-[var(--text-primary)] font-mono px-4 py-3 rounded-xl text-lg outline-none disabled:opacity-40 transition-all"
            />
            <p className="text-[10px] text-[var(--text-muted)] text-center">
              The scanner auto-submits on Enter. Click anywhere to re-focus.
            </p>
          </form>

          {/* Feedback banner */}
          {lastResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
                lastResult.success
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/70 border-red-500/40 text-red-300'
              }`}
            >
              {lastResult.success ? (
                lastResult.scanMode === 'TIME_OUT' ? (
                  <LogOut className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <LogIn className="w-5 h-5 shrink-0 mt-0.5" />
                )
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-xs">
                  {lastResult.success
                    ? lastResult.scanMode === 'TIME_OUT'
                      ? 'TIME-OUT Recorded'
                      : 'TIME-IN Recorded'
                    : 'Scan Failed'}
                </p>
                <p className="text-[11px] mt-0.5 opacity-80">{lastResult.message}</p>
              </div>
            </div>
          )}

          {/* Session stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-[var(--brand-100)] rounded-xl p-4 space-y-1">
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Users className="w-3 h-3" /> This Session
              </p>
              <p className="text-2xl font-bold text-[var(--brand-500)]">{presentCount}</p>
              <p className="text-[10px] text-[var(--text-muted)]">scans recorded</p>
            </div>
            <div className="bg-white border border-[var(--brand-100)] rounded-xl p-4 space-y-1">
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Clock className="w-3 h-3" /> Status
              </p>
              <p className={`text-sm font-bold ${selectedEventId ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>
                {selectedEventId ? '● LIVE' : '○ Idle'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {isPending ? 'Processing…' : 'Ready'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right column: live session log table ── */}
        <div className="lg:col-span-2 bg-white border border-[var(--brand-100)] rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--brand-100)] flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--text-muted)]" /> Live Session Log
            </h2>
            <button
              onClick={(e) => { e.stopPropagation(); setLogs([]) }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-600)]"
            >
              Clear
            </button>
          </div>

          <div className="overflow-auto flex-1 max-h-[520px]">
            {logs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)]">
                <QrCode className="w-8 h-8 mb-2 stroke-[1.5]" />
                <p className="text-xs">No scans yet in this session.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--brand-100)] text-[var(--text-muted)] uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Section</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--brand-50)]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--bg-cream)]">
                      <td className="p-3 text-[var(--brand-600)] font-semibold">{log.studentId}</td>
                      <td className="p-3 font-sans font-medium text-[var(--text-primary)] truncate max-w-[160px]">
                        {log.studentName}
                      </td>
                      <td className="p-3 text-[var(--text-muted)] font-sans">{log.section}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold font-sans ${
                          log.scanMode === 'TIME_IN'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {log.scanMode === 'TIME_IN'
                            ? <><LogIn className="w-2.5 h-2.5" /> IN</>
                            : <><LogOut className="w-2.5 h-2.5" /> OUT</>}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-400">{log.timestamp}</td>
                      <td className="p-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold font-sans ${
                          log.status === 'PRESENT'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : log.status === 'UNREGISTERED'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {log.status === 'UNREGISTERED' ? (
                            <span className="flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> NOT IN LIST
                            </span>
                          ) : (
                            log.status
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
