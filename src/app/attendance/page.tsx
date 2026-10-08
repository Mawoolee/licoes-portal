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
  Timer,
} from 'lucide-react'
import { getActiveEventsAction, recordScanAction } from '@/app/actions/attendance-actions'
import { getWindowStatus } from '@/lib/attendance-utils'
import type { WindowStatus } from '@/lib/attendance-utils'

type EventOption = {
  id: string
  name: string
  location: string
  timeInStart: Date | null
  timeInEnd: Date | null
  timeOutStart: Date | null
  timeOutEnd: Date | null
  isClosed: boolean
}

type ScanLog = {
  id: string
  studentId: string
  studentName: string
  section: string
  scanMode: 'TIME_IN' | 'TIME_OUT'
  isLate?: boolean
  timeIn?: string
  timeOut?: string
  timestamp: string
  status: 'SUCCESS' | 'DUPLICATE' | 'BLOCKED' | 'UNREGISTERED' | 'ERROR'
}

function fmtTime(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  })
}

function fmtWindow(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const WINDOW_LABELS: Record<WindowStatus, string> = {
  TIME_IN: 'TIME IN',
  TIME_OUT: 'TIME OUT',
  OUTSIDE: 'Outside Window',
  UNCONFIGURED: 'Not Configured',
}

const WINDOW_STYLES: Record<WindowStatus, string> = {
  TIME_IN: 'bg-green-50 border-green-200 text-green-700',
  TIME_OUT: 'bg-blue-50 border-blue-200 text-blue-700',
  OUTSIDE: 'bg-amber-50 border-amber-200 text-amber-700',
  UNCONFIGURED: 'bg-slate-50 border-slate-200 text-slate-500',
}

export default function AttendancePage() {
  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [currentWindow, setCurrentWindow] = useState<{ status: WindowStatus; isLate: boolean }>({
    status: 'UNCONFIGURED',
    isLate: false,
  })

  const [scannedInput, setScannedInput] = useState('')
  const [logs, setLogs] = useState<ScanLog[]>([])
  const [lastResult, setLastResult] = useState<{
    success: boolean
    message: string
    scanMode?: 'TIME_IN' | 'TIME_OUT'
    isLate?: boolean
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadEvents()
  }, [])

  // Update window status every 30 seconds
  useEffect(() => {
    if (!selectedEventId) return
    const selected = events.find((e) => e.id === selectedEventId)
    if (!selected) return
    const update = () => setCurrentWindow(getWindowStatus(selected))
    update()
    const interval = setInterval(update, 30_000)
    return () => clearInterval(interval)
  }, [selectedEventId, events])

  useEffect(() => {
    if (selectedEventId) inputRef.current?.focus()
  }, [selectedEventId])

  function loadEvents() {
    setLoadingEvents(true)
    getActiveEventsAction().then((evts) => {
      setEvents(evts as EventOption[])
      if (evts.length === 1) setSelectedEventId(evts[0].id)
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
      setLastResult({
        success: result.success,
        message: result.message,
        scanMode: result.scanMode,
        isLate: result.isLate,
      })

      const nowStr = new Date().toLocaleTimeString('en-PH', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
      })

      const logStatus: ScanLog['status'] = result.success
        ? 'SUCCESS'
        : result.message.includes('already timed')
        ? 'DUPLICATE'
        : result.message.includes('Outside')
        ? 'BLOCKED'
        : result.message.includes('not found') || result.message.includes('Unregistered')
        ? 'UNREGISTERED'
        : 'ERROR'

      const log: ScanLog = {
        id: `${raw}-${Date.now()}`,
        studentId: result.studentId,
        studentName: result.studentName,
        section: result.section,
        scanMode: result.scanMode,
        isLate: result.isLate,
        timeIn: result.timeIn,
        timeOut: result.timeOut,
        timestamp: nowStr,
        status: logStatus,
      }
      setLogs((prev) => [log, ...prev])
      setTimeout(() => inputRef.current?.focus(), 50)
    })
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId)
  const successCount = logs.filter((l) => l.status === 'SUCCESS').length
  const canScan = currentWindow.status === 'TIME_IN' || currentWindow.status === 'TIME_OUT'

  return (
    <div
      className="min-h-screen bg-[var(--bg-cream)] text-[var(--text-primary)] p-6 space-y-5"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header */}
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
          onClick={(e) => { e.stopPropagation(); loadEvents() }}
          disabled={loadingEvents}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-600)] flex items-center gap-1.5 border border-[var(--brand-100)] px-3 py-1.5 rounded-lg"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-4">

          {/* Event selector */}
          <div className="bg-white border border-[var(--brand-100)] rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5 uppercase tracking-wide">
              <CalendarDays className="w-3.5 h-3.5" /> Select Event
            </label>
            {loadingEvents ? (
              <p className="text-xs text-[var(--text-muted)] animate-pulse">Loading events…</p>
            ) : events.length === 0 ? (
              <div className="text-xs text-amber-600 space-y-1">
                <p>No open events found.</p>
                <a href="/admin/events" className="underline">Create an event →</a>
              </div>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[var(--surface-alt)] border border-[var(--brand-100)] text-[var(--text-primary)] text-xs px-3 py-2 rounded-lg focus:outline-none"
              >
                <option value="">— Select an event —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Window status + times */}
          {selectedEvent && (
            <div className={`rounded-xl border p-4 space-y-3 ${WINDOW_STYLES[currentWindow.status]}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" /> Current Window
                </span>
                <span className="font-bold text-sm">{WINDOW_LABELS[currentWindow.status]}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="space-y-0.5">
                  <p className="font-semibold opacity-60 uppercase tracking-wider">Time-In</p>
                  <p className="font-mono">{fmtWindow(selectedEvent.timeInStart)} – {fmtWindow(selectedEvent.timeInEnd)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold opacity-60 uppercase tracking-wider">Time-Out</p>
                  <p className="font-mono">{fmtWindow(selectedEvent.timeOutStart)} – {fmtWindow(selectedEvent.timeOutEnd)}</p>
                </div>
              </div>

              {currentWindow.status === 'OUTSIDE' && (
                <p className="text-xs font-medium">
                  ⚠ Scanning is locked. Outside of all attendance windows.
                </p>
              )}
              {currentWindow.status === 'UNCONFIGURED' && (
                <p className="text-xs font-medium">
                  This event has no windows configured yet.
                </p>
              )}
            </div>
          )}

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
              placeholder={
                !selectedEventId
                  ? 'Select an event first'
                  : !canScan
                  ? 'Scanning locked — outside window'
                  : `Ready to scan (${WINDOW_LABELS[currentWindow.status]})…`
              }
              disabled={!selectedEventId || !canScan || isPending}
              className="w-full bg-[var(--surface-alt)] border-2 border-[var(--brand-100)] focus:border-[var(--brand-400)] text-[var(--text-primary)] font-mono px-4 py-3 rounded-xl text-lg outline-none disabled:opacity-40 transition-all"
            />
            {!canScan && selectedEventId && (
              <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Scanner locked — outside attendance window
              </p>
            )}
            <p className="text-[10px] text-[var(--text-muted)] text-center">
              Scanner auto-submits on Enter. Click anywhere to re-focus.
            </p>
          </form>

          {/* Feedback banner */}
          {lastResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
                lastResult.success
                  ? lastResult.isLate
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : lastResult.scanMode === 'TIME_OUT'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {lastResult.success ? (
                lastResult.scanMode === 'TIME_OUT'
                  ? <LogOut className="w-5 h-5 shrink-0 mt-0.5" />
                  : <LogIn className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-xs flex items-center gap-1.5">
                  {lastResult.success
                    ? lastResult.isLate
                      ? '⚠ LATE — '
                      : ''
                    : ''}
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
              <p className="text-2xl font-bold text-[var(--brand-500)]">{successCount}</p>
              <p className="text-[10px] text-[var(--text-muted)]">scans recorded</p>
            </div>
            <div className="bg-white border border-[var(--brand-100)] rounded-xl p-4 space-y-1">
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Clock className="w-3 h-3" /> Mode
              </p>
              <p className={`text-sm font-bold ${
                currentWindow.status === 'TIME_IN' ? 'text-green-600' :
                currentWindow.status === 'TIME_OUT' ? 'text-blue-600' :
                'text-[var(--text-muted)]'
              }`}>
                {selectedEventId ? WINDOW_LABELS[currentWindow.status] : '○ Idle'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {isPending ? 'Processing…' : 'Ready'}
              </p>
            </div>
          </div>
        </div>

        {/* Right column: live log */}
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
                      <td className="p-3 font-sans font-medium text-[var(--text-primary)] truncate max-w-[140px]">
                        {log.studentName}
                      </td>
                      <td className="p-3 text-[var(--text-muted)] font-sans">{log.section}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold font-sans border ${
                          log.scanMode === 'TIME_IN'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {log.scanMode === 'TIME_IN'
                            ? <><LogIn className="w-2.5 h-2.5" /> IN</>
                            : <><LogOut className="w-2.5 h-2.5" /> OUT</>}
                          {log.isLate && (
                            <span className="ml-1 bg-amber-100 text-amber-700 px-1 rounded text-[9px]">LATE</span>
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">{log.timestamp}</td>
                      <td className="p-3">
                        {log.status === 'SUCCESS' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold font-sans bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> OK
                          </span>
                        )}
                        {log.status === 'DUPLICATE' && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold font-sans bg-amber-50 text-amber-700 border border-amber-200">
                            DUPLICATE
                          </span>
                        )}
                        {log.status === 'BLOCKED' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold font-sans bg-slate-50 text-slate-500 border border-slate-200">
                            <Lock className="w-2.5 h-2.5" /> BLOCKED
                          </span>
                        )}
                        {(log.status === 'UNREGISTERED' || log.status === 'ERROR') && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold font-sans bg-red-50 text-red-600 border border-red-200">
                            <AlertTriangle className="w-2.5 h-2.5" /> {log.status}
                          </span>
                        )}
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
