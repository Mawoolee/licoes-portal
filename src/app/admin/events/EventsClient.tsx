'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import {
  CalendarDays, MapPin, Users, Plus, Lock,
  CheckCircle2, AlertCircle, Loader2, X, LogIn, LogOut, Trash2, Pencil, MoreVertical,
} from 'lucide-react'
import { createEventAction, closeEventAction, deleteEventAction, updateEventAction } from '@/app/actions/attendance-actions'
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
    timeZone: 'Asia/Manila',
  })
}

function fmtTime(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })
}

export default function EventsClient({ initialEvents }: { initialEvents: EventRow[] }) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Create form state ──────────────────────────────────────────────────────
  const [name, setName]               = useState('')
  const [location, setLocation]       = useState('')
  const [timeInStart, setTimeInStart] = useState('')
  const [timeInEnd, setTimeInEnd]     = useState('')
  const [timeOutStart, setTimeOutStart] = useState('')
  const [timeOutEnd, setTimeOutEnd]     = useState('')

  // ── Edit modal state ───────────────────────────────────────────────────────
  const [editEvent, setEditEvent] = useState<EventRow | null>(null)
  const [editName, setEditName]               = useState('')
  const [editLocation, setEditLocation]       = useState('')
  const [editTimeInStart, setEditTimeInStart] = useState('')
  const [editTimeInEnd, setEditTimeInEnd]     = useState('')
  const [editTimeOutStart, setEditTimeOutStart] = useState('')
  const [editTimeOutEnd, setEditTimeOutEnd]     = useState('')
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function toDatetimeLocal(d: Date | null) {
    if (!d) return ''
    // Convert UTC date to PH local string for datetime-local input
    const ph = new Date(new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${ph.getFullYear()}-${pad(ph.getMonth() + 1)}-${pad(ph.getDate())}T${pad(ph.getHours())}:${pad(ph.getMinutes())}`
  }

  function openEditModal(ev: EventRow) {
    setEditEvent(ev)
    setEditName(ev.name)
    setEditLocation(ev.location)
    setEditTimeInStart(toDatetimeLocal(ev.timeInStart))
    setEditTimeInEnd(toDatetimeLocal(ev.timeInEnd))
    setEditTimeOutStart(toDatetimeLocal(ev.timeOutStart))
    setEditTimeOutEnd(toDatetimeLocal(ev.timeOutEnd))
    setEditMsg(null)
  }

  function closeEditModal() {
    setEditEvent(null)
    setEditMsg(null)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editEvent) return
    const fd = new FormData()
    fd.append('name', editName)
    fd.append('location', editLocation)
    fd.append('timeInStart', editTimeInStart)
    fd.append('timeInEnd', editTimeInEnd)
    fd.append('timeOutStart', editTimeOutStart)
    fd.append('timeOutEnd', editTimeOutEnd)

    startTransition(async () => {
      const result = await updateEventAction(editEvent.id, fd)
      if (result.success) {
        setEditMsg({ type: 'success', text: result.message })
        setEvents((prev) => prev.map((ev) =>
          ev.id === editEvent.id
            ? {
                ...ev,
                name: editName,
                location: editLocation,
                timeInStart: new Date(`${editTimeInStart}+08:00`),
                timeInEnd:   new Date(`${editTimeInEnd}+08:00`),
                timeOutStart: new Date(`${editTimeOutStart}+08:00`),
                timeOutEnd:   new Date(`${editTimeOutEnd}+08:00`),
              }
            : ev
        ))
        setTimeout(() => closeEditModal(), 1200)
      } else {
        setEditMsg({ type: 'error', text: result.message })
      }
    })
  }

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

  async function handleDelete(eventId: string, eventName: string) {
    if (!confirm(`Are you sure you want to delete "${eventName}"? This will permanently remove all attendance records for this event.`)) return
    startTransition(async () => {
      const result = await deleteEventAction(eventId)
      if (result.success) {
        setEvents((prev) => prev.filter((ev) => ev.id !== eventId))
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

      {/* Create Event Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => { setShowForm(false); resetForm() }}
        >
          <div
            className="relative w-full max-w-2xl bg-[var(--surface)] rounded-2xl border border-[var(--brand-100)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--brand-100)]">
              <h2 className="font-bold text-xl text-[var(--text-primary)]">Create New Event</h2>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleCreate} className="p-8 space-y-6">
              {/* Basic info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-muted)]">Event Name *</label>
                  <input
                    value={name} onChange={(e) => setName(e.target.value)} required
                    placeholder="e.g. LICOES General Assembly 2026"
                    className="w-full px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface-alt)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-muted)]">Location *</label>
                  <input
                    value={location} onChange={(e) => setLocation(e.target.value)} required
                    placeholder="e.g. DWCL Gymnasium"
                    className="w-full px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface-alt)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]"
                  />
                </div>
              </div>

              {/* Time-In window */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-4">
                <p className="text-sm font-bold text-green-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <LogIn className="w-4 h-4" /> Time-In Window
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-green-700">Start *</label>
                    <input
                      type="datetime-local" value={timeInStart}
                      onChange={(e) => setTimeInStart(e.target.value)} required
                      className="w-full px-4 py-2.5 text-sm border border-green-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-green-700">Cut-off *</label>
                    <input
                      type="datetime-local" value={timeInEnd}
                      onChange={(e) => setTimeInEnd(e.target.value)} required
                      className="w-full px-4 py-2.5 text-sm border border-green-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
                    />
                  </div>
                </div>
              </div>

              {/* Time-Out window */}
              <div className="rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-5 space-y-4">
                <p className="text-sm font-bold text-[var(--brand-600)] flex items-center gap-1.5 uppercase tracking-wider">
                  <LogOut className="w-4 h-4" /> Time-Out Window
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[var(--brand-600)]">Start *</label>
                    <input
                      type="datetime-local" value={timeOutStart}
                      onChange={(e) => setTimeOutStart(e.target.value)} required
                      className="w-full px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[var(--brand-600)]">Cut-off *</label>
                    <input
                      type="datetime-local" value={timeOutEnd}
                      onChange={(e) => setTimeOutEnd(e.target.value)} required
                      className="w-full px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]"
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

              {/* Modal footer */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit" disabled={isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="px-6 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={closeEditModal}
        >
          <div
            className="relative w-full max-w-2xl bg-[var(--surface)] rounded-2xl border border-[var(--brand-100)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--brand-100)]">
              <h2 className="font-bold text-xl text-[var(--text-primary)]">Edit Event</h2>
              <button onClick={closeEditModal} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-muted)]">Event Name *</label>
                  <input
                    value={editName} onChange={(e) => setEditName(e.target.value)} required
                    className="w-full px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface-alt)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--text-muted)]">Location *</label>
                  <input
                    value={editLocation} onChange={(e) => setEditLocation(e.target.value)} required
                    className="w-full px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface-alt)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-4">
                <p className="text-sm font-bold text-green-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <LogIn className="w-4 h-4" /> Time-In Window
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-green-700">Start *</label>
                    <input type="datetime-local" value={editTimeInStart} onChange={(e) => setEditTimeInStart(e.target.value)} required
                      className="w-full px-4 py-2.5 text-sm border border-green-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-green-700">Cut-off *</label>
                    <input type="datetime-local" value={editTimeInEnd} onChange={(e) => setEditTimeInEnd(e.target.value)} required
                      className="w-full px-4 py-2.5 text-sm border border-green-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-5 space-y-4">
                <p className="text-sm font-bold text-[var(--brand-600)] flex items-center gap-1.5 uppercase tracking-wider">
                  <LogOut className="w-4 h-4" /> Time-Out Window
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[var(--brand-600)]">Start *</label>
                    <input type="datetime-local" value={editTimeOutStart} onChange={(e) => setEditTimeOutStart(e.target.value)} required
                      className="w-full px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[var(--brand-600)]">Cut-off *</label>
                    <input type="datetime-local" value={editTimeOutEnd} onChange={(e) => setEditTimeOutEnd(e.target.value)} required
                      className="w-full px-4 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]" />
                  </div>
                </div>
              </div>

              {editMsg && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                  editMsg.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {editMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {editMsg.text}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg disabled:opacity-50 transition-colors">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                  Save Changes
                </button>
                <button type="button" onClick={closeEditModal}
                  className="px-6 py-2.5 text-sm border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
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
            <EventCard key={ev.id} event={ev} onClose={() => handleClose(ev.id)} onDelete={() => handleDelete(ev.id, ev.name)} onEdit={() => openEditModal(ev)} isPending={isPending} fmtDateTime={fmtDateTime} fmtTime={fmtTime} />
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
            <EventCard key={ev.id} event={ev} onClose={() => {}} onDelete={() => handleDelete(ev.id, ev.name)} onEdit={() => {}} isPending={false} fmtDateTime={fmtDateTime} fmtTime={fmtTime} closed />
          ))}
        </section>
      )}
    </div>
  )
}

function EventCard({
  event, onClose, onDelete, onEdit, isPending, fmtDateTime, fmtTime, closed = false,
}: {
  event: EventRow
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
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
        {/* 3-dot menu */}
        <ThreeDotMenu
          onEdit={!closed ? onEdit : undefined}
          onDelete={onDelete}
          disabled={isPending}
        />
      </div>
    </div>
  )
}

function ThreeDotMenu({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit?: () => void
  onDelete: () => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--brand-100)] bg-white hover:bg-[var(--brand-50)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-40 bg-white rounded-xl border border-[var(--brand-100)] shadow-xl py-1 overflow-hidden">
          {onEdit && (
            <button
              onClick={() => { setOpen(false); onEdit() }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--brand-50)] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-[var(--brand-500)]" />
              Edit
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onDelete() }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
