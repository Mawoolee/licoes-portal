import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, MapPin, CheckCircle2, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AttendanceListPage() {
  const events = await db.event.findMany({
    orderBy: { windowStart: 'desc' },
    include: {
      _count: { select: { attendanceRecords: true } },
    },
  })

  const now = new Date()

  function getEventStatus(event: (typeof events)[0]) {
    if (event.isClosed) return 'closed'
    if (new Date(event.windowEnd) < now) return 'ended'
    if (new Date(event.windowStart) <= now) return 'live'
    return 'upcoming'
  }

  const STATUS_STYLES = {
    live: 'bg-green-50 text-green-600 border-green-200',
    upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
    ended: 'bg-[var(--brand-50)] text-[var(--brand-600)] border-[var(--brand-100)]',
    closed: 'bg-slate-50 text-slate-500 border-slate-200',
  }

  const STATUS_LABELS = {
    live: '● Live',
    upcoming: 'Upcoming',
    ended: 'Ended',
    closed: 'Closed',
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link
          href="/admin/attendance"
          className="hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Attendance
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">Attendance List</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Attendance List
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Select an event to view attendance records.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-muted)]">
          No events found. Create an event first in the Events section.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const status = getEventStatus(event)
            return (
              <Link
                key={event.id}
                href={`/admin/attendance/${event.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] px-5 py-4 hover:shadow-md hover:border-[var(--brand-200)] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-50)] flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5 text-[var(--brand-500)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{event.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <MapPin className="w-3 h-3" /> {event.location}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Clock className="w-3 h-3" />
                        {new Date(event.windowStart).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {event._count.attendanceRecords.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">records</p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[status]}`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-[var(--text-muted)] group-hover:text-[var(--brand-500)] transition-colors text-sm">
                    →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
