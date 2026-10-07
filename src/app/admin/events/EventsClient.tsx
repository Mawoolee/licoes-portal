'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, MapPin, Clock, Users, Plus, Lock, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react'
import { createEventAction, closeEventAction } from '@/app/actions/attendance-actions'
import Link from 'next/link'

type EventRow = {
  id: string
  name: string
  location: string
  windowStart: Date
  windowEnd: Date
  isClosed: boolean
  closedAt: Date | null
  createdAt: Date
  _count: { attendanceRecords: number }
}

export default function EventsClient({ initialEvents }: { initialEvents: EventRow[] }) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form fields
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')

  function resetForm() {
    setName('')
    setLocation('')
    setWindowStart('')
    setWindowEnd('')
    setFormMsg(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', name)
    fd.append('location', location)
    fd.append('windowStart', windowStart)
    fd.append('windowEnd', windowEnd)

    startTransition(async () => {
      const result = await createEventAction(fd)
      if (result.success) {
        setFormMsg({ type: 'success', text: result.message })
        // Reload events by re-fetching via server — we refresh the page data
        // by adding the new event optimistically
        const newEvent: EventRow = {
          id: result.eventId!,
          name,
          location,
          windowStart: new Date(windowStart),
          windowEnd: new Date(windowEnd),
          isClosed: false,
          closedAt: null,
          createdAt: new Date(),
          _count: { attendanceRecords: 0 },
        }
        setEvents((prev) => [newEvent, ...prev])
        resetForm()
        setTimeout(() => {
          setShowForm(false)
          setFormMsg(null)
        }, 1500)
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
          prev.map((ev) =>
            ev.id === eventId ? { ...ev, isClosed: true, closedAt: new Date() } : ev
          )
        )
      }
    })
  }

  const openEvents = events.filter((e) => !e.isClosed)
  const closedEvents = events.filter((e) => e.isClosed)

  function fmt(d: Date) {
    return new Date(d).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create attendance events and manage their scanning windows.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormMsg(null) }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      {/* Create Event Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Create New Event</h2>
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Event Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. LICOES General Assembly 2026"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Location *</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  placeholder="e.g. DWCL Gymnasium"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Attendance Window Start *</label>
                <input
                  type="datetime-local"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Attendance Window End *</label>
                <input
                  type="datetime-local"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              </div>
            </div>

            {formMsg && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                formMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
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
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Event
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm() }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Open Events */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Open Events ({openEvents.length})
        </h2>
        {openEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-8 text-center text-slate-500 text-sm">
            No open events. Create one to start scanning attendance.
          </div>
        ) : (
          openEvents.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              onClose={() => handleClose(ev.id)}
              isPending={isPending}
              fmt={fmt}
            />
          ))
        )}
      </section>

      {/* Closed Events */}
      {closedEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Closed Events ({closedEvents.length})
          </h2>
          {closedEvents.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              onClose={() => {}}
              isPending={false}
              fmt={fmt}
              closed
            />
          ))}
        </section>
      )}
    </div>
  )
}

function EventCard({
  event,
  onClose,
  isPending,
  fmt,
  closed = false,
}: {
  event: EventRow
  onClose: () => void
  isPending: boolean
  fmt: (d: Date) => string
  closed?: boolean
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-xl p-5 flex items-start justify-between gap-4 ${
      closed ? 'opacity-60' : ''
    }`}>
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            closed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {closed ? <Lock className="w-2.5 h-2.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            {closed ? 'Closed' : 'Open'}
          </span>
          <h3 className="font-semibold text-sm truncate">{event.name}</h3>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {event.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {fmt(event.windowStart)} – {fmt(event.windowEnd)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {event._count.attendanceRecords} scanned
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!closed && (
          <Link
            href={`/attendance?eventId=${event.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            <CalendarDays className="w-3.5 h-3.5" /> Open Scanner
          </Link>
        )}
        {!closed && (
          <button
            onClick={onClose}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" /> Close Event
          </button>
        )}
        {closed && (
          <Link
            href={`/admin/events/${event.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-slate-50"
          >
            <Users className="w-3.5 h-3.5" /> View Report
          </Link>
        )}
      </div>
    </div>
  )
}
