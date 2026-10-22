'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, MapPin, Clock, Trash2 } from 'lucide-react'
import { getAllEventsAction, deleteEventAction } from '@/app/actions/attendance-actions'

type EventItem = {
  id: string
  name: string
  location: string
  timeInStart: Date | null
  timeOutEnd: Date | null
  isClosed: boolean
  createdAt: Date
  _count: { attendanceRecords: number }
}

type EventStatus = 'live' | 'upcoming' | 'ended' | 'closed'

const STATUS_STYLES: Record<EventStatus, string> = {
  live:     'bg-green-50 text-green-600 border-green-200',
  upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
  ended:    'bg-[var(--brand-50)] text-[var(--brand-600)] border-[var(--brand-100)]',
  closed:   'bg-slate-50 text-slate-500 border-slate-200',
}

const STATUS_LABELS: Record<EventStatus, string> = {
  live:     '● Live',
  upcoming: 'Upcoming',
  ended:    'Ended',
  closed:   'Closed',
}

function getEventStatus(event: EventItem): EventStatus {
  const now = new Date()
  if (event.isClosed) return 'closed'
  if (event.timeOutEnd && new Date(event.timeOutEnd) < now) return 'ended'
  if (event.timeInStart && new Date(event.timeInStart) <= now) return 'live'
  return 'upcoming'
}

function EventRow({
  event,
  status,
  isPending,
  onDelete,
}: {
  event: EventItem
  status: EventStatus
  isPending: boolean
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] px-5 py-4 hover:shadow-md hover:border-[var(--brand-200)] transition-all">
      <Link href={`/admin/attendance/${event.id}`} className="flex items-center gap-4 flex-1 min-w-0 group">
        <div className="w-10 h-10 rounded-lg bg-[var(--brand-50)] flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-[var(--brand-500)]" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)] truncate">{event.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <MapPin className="w-3 h-3" /> {event.location}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock className="w-3 h-3" />
              {new Date(event.timeInStart ?? event.createdAt).toLocaleDateString('en-PH', {
                month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
              })}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold text-[var(--text-primary)]">{event._count.attendanceRecords.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--text-muted)]">records</p>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
        <Link href={`/admin/attendance/${event.id}`} className="text-[var(--text-muted)] hover:text-[var(--brand-500)] transition-colors text-sm">
          →
        </Link>
        <button
          onClick={onDelete}
          disabled={isPending}
          className="inline-flex items-center justify-center w-8 h-8 text-red-500 border border-red-200 bg-white hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function AttendanceListPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getAllEventsAction().then((data) => setEvents(data as EventItem[]))
  }, [])

  function handleDelete(eventId: string, eventName: string) {
    if (!confirm(`Are you sure you want to delete "${eventName}"? This will permanently remove all attendance records for this event.`)) return
    startTransition(async () => {
      const result = await deleteEventAction(eventId)
      if (result.success) setEvents((prev) => prev.filter((e) => e.id !== eventId))
    })
  }

  const withStatus = events.map((e) => ({ ...e, status: getEventStatus(e) }))
  const live     = withStatus.filter((e) => e.status === 'live')
  const upcoming = withStatus.filter((e) => e.status === 'upcoming')
  const ended    = withStatus.filter((e) => e.status === 'ended')
  const closed   = withStatus.filter((e) => e.status === 'closed')

  const sections: { label: string; items: typeof withStatus }[] = [
    { label: 'Live', items: live },
    { label: 'Upcoming', items: upcoming },
    { label: 'Ended', items: ended },
    { label: 'Closed', items: closed },
  ].filter((s) => s.items.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/admin/attendance" className="hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Attendance
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">Attendance List</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Attendance List</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Select an event to view attendance records.</p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-muted)]">
          No events found. Create an event first in the Events section.
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map(({ label, items }) => (
            <div key={label} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {label} ({items.length})
              </h2>
              {items.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  status={event.status}
                  isPending={isPending}
                  onDelete={() => handleDelete(event.id, event.name)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
