'use client'

import { useState, useTransition } from 'react'
import {
  CalendarDays, MapPin, Clock, Users, Plus, Lock,
  CheckCircle2, AlertCircle, Loader2, X, LogIn, LogOut,
} from 'lucide-react'
import { createEventAction, closeEventAction } from '@/app/actions/attendance-actions'
import Link from 'next/link'

type EventRow = {
  id: string
  name: string
  location: string
  timeInStart: Date | null
  timeInEnd: Date | null
  timeOutStart: Date | null
  timeOutEnd: Date | null
  isClosed: boolean
  closedAt: Date | null
  createdAt: Date
  _count: { attendanceRecords: number }
}

function fmtDateTime(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function fmtTime(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function EventsClient({ initialEvents }: { initialEvents: EventRow[] }) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const [name, setName]               = useState('')
  const [location, setLocation]       = useState('')
  const [timeInStart, setTimeInStart] = useState('')
  const [timeInEnd, setTimeInEnd]     = useState('')
  const [timeOutStart, setTimeOutStart] = useState('')
  const [timeOutEnd, setTimeOutEnd]     = useState('')

  function resetForm() {
    setName(''); setLocation('')
    setTimeInStart(''); setTimeInEnd('')
    setTimeOutStart(''); setTimeOutEnd('')
    setFormMsg(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', name)
    fd.append('location', location)
    fd.append('timeInStart', timeInStart)
    fd.append('timeInEnd', timeInEnd)
    fd.append('timeOutStart', timeOutStart)
    fd.append('timeOutEnd', timeOutEnd)

    startTransition(async () => {
      const result = await createEventAction(fd)
      if (result.success) {
        setFormMsg({ type: 'success', text: result.message })
        const newEvent: EventRow = {
          id: result.eventId!,
          name,
          location,
          timeInStart: new Date(timeInStart),
          timeInEnd: new Date(timeInEnd),
          timeOutStart: new Date(timeOutStart),
          timeOutEnd: new Date(timeOutEnd),
          isClosed: false,
          closedAt: null,
          createdAt: new Date(),
          _count: { attendanceRecords: 0 },
        }
        setEvents((prev) => [newEvent, ...prev])
        resetForm()
        setTimeout(() => { setShowForm(false); setFormMsg(null) }, 1500)
      } else {
        setFormMsg({ type: 'error', text: result.message })
      }
    })
  }

  async function handleClose(eventId: string) {
    if (!confirm('Close this event? Attendance scanning will be disabled.')) return
    startTransition(async () => {
      const result = await closeEventAction(eventId)
      if (result.success) {
        setEvents((prev) =>
          prev.map((ev) => ev.id === eventId ? { ...ev, isClosed: true, closedAt: new Date() } : ev)
        )
      }
    })
  }

  const openEvents   = events.filter((e) => !e.isClosed)
  const closedEvents = events.filter((e) => e.isClosed)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Events</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Create attendance events and configure their scanning windows.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormMsg(null) }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">Create New Event</h2>
            <button onClick={() => { setShowForm(false); resetForm() }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Event Name *</label>
                <input
                  value={name} onChange={(e) => setName(e.target.value)} required
                  placeholder="e.g. LICOES General Assembly 2026"
                  className="w-full px-3 py-2 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface-alt)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Location *</label>
                <input
                  value={location} onChange={(e) => setLocation(e.target.value)} required
                  placeholder="e.g. DWCL Gymnasium"
                  className="w-full px-3 py-2 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface-alt)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]"
                />
              </div>
            </div>

            {/* Time-In window */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
              <p className="text-xs font-bold text-green-700 flex items-center gap-1.5 uppercase tracking-wider">
                <LogIn className="w-3.5 h-3.5" /> Time-In Window
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-green-700">Start *</label>
                  <input
                    type="datetime-local" value={timeInStart}
                    onChange={(e) => setTimeInStart(e.target.value)} required
                    className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-green-700">Cut-off *</label>
                  <input
                    type="datetime-local" value={timeInEnd}
                    onChange={(e) => setTimeInEnd(e.target.value)} required
                    className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
                  />
                </div>
              </div>
            </div>

            {/* Time-Out window */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5 uppercase tracking-wider">
                <LogOut className="w-3.5 h-3.5" /> Time-Out Window
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-700">Start *</label>
                  <input
                    type="datetime-local" value={timeOutStart}
                    onChange={(e) => setTimeOutStart(e.target.value)} required
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-700">Cut-off *</label>
                  <input
                    type="datetime-local" value={timeOutEnd}
                    onChange={(e) => setTimeOutEnd(e.target.value)} required
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>

            {formMsg && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                formMsg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {formMsg.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />}
                {formMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit" disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Event
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm() }}
                className="px-4 py-2 text-sm border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Open Events */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Open Events ({openEvents.length})
        </h2>
        {openEvents.length === 0 ? (
          <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)] text-sm">
            No open events. Create one to start scanning attendance.
          </div>
        ) : (
          openEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} onClose={() => handleClose(ev.id)} isPending={isPending} fmtDateTime={fmtDateTime} fmtTime={fmtTime} />
          ))
        )}
      </section>

      {/* Closed Events */}
      {closedEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Closed Events ({closedEvents.length})
          </h2>
          {closedEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} onClose={() => {}} isPending={false} fmtDateTime={fmtDateTime} fmtTime={fmtTime} closed />
          ))}
        </section>
      )}
    </div>
  )
}

function EventCard({
  event, onClose, isPending, fmtDateTime, fmtTime, closed = false,
}: {
  event: EventRow
  onClose: () => void
  isPending: boolean
  fmtDateTime: (d: Date | null | undefined) => string
  fmtTime: (d: Date | null | undefined) => string
  closed?: boolean
}) {
  return (
    <div className={`rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-5 flex items-start justify-between gap-4 transition-opacity ${closed ? 'opacity-60' : ''}`}>
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            closed
              ? 'bg-slate-50 text-slate-500 border-slate-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {closed ? <Lock className="w-2.5 h-2.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
            {closed ? 'Closed' : 'Open'}
          </span>
          <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">{event.name}</h3>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {event.location}
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <LogIn className="w-3 h-3" /> Time-In: {fmtTime(event.timeInStart)} – {fmtTime(event.timeInEnd)}
          </span>
          <span className="flex items-center gap-1 text-blue-600">
            <LogOut className="w-3 h-3" /> Time-Out: {fmtTime(event.timeOutStart)} – {fmtTime(event.timeOutEnd)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {event._count.attendanceRecords} scanned
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {!closed && (
          <>
            <Link
              href={`/attendance?eventId=${event.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Open Scanner
            </Link>
            <button
              onClick={onClose} disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> Close Event
            </button>
          </>
        )}
        {closed && (
          <Link
            href={`/admin/events/${event.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] text-[var(--text-muted)] transition-colors"
          >
            <Users className="w-3.5 h-3.5" /> View Report
          </Link>
        )}
      </div>
    </div>
  )
}
