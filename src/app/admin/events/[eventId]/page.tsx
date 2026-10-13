import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Clock, MapPin, LogIn, LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmt(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-PH', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    timeZone: 'Asia/Manila',
  })
}

const YEAR_LABELS: Record<number, string> = {
  1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year',
}

export default async function EventReportPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      attendanceRecords: {
        include: {
          student: { select: { studentNumber: true, fullName: true, program: true, yearLevel: true } },
          sessions: { orderBy: { timeIn: 'asc' } },
        },
        orderBy: { sessions: { _count: 'desc' } },
      },
    },
  })

  if (!event) notFound()

  const total = event.attendanceRecords.length

  // Session log sorted by most recent time-in
  const sessionLog = event.attendanceRecords
    .flatMap((rec) =>
      rec.sessions.map((s) => ({
        id: s.id,
        studentNumber: rec.student.studentNumber,
        fullName: rec.student.fullName,
        program: rec.student.program,
        yearLevel: rec.student.yearLevel,
        timeIn: s.timeIn,
        timeOut: s.timeOut,
        isLateTimeIn: s.isLateTimeIn,
      }))
    )
    .sort((a, b) => new Date(b.timeIn).getTime() - new Date(a.timeIn).getTime())

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
      </Link>

      {/* Event header */}
      <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            {event.isClosed ? 'Closed' : 'Open'}
          </span>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{event.name}</h1>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {event.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(event.timeInStart ?? event.createdAt).toLocaleString('en-PH', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila',
            })}
            {event.timeOutEnd
              ? ` – ${new Date(event.timeOutEnd).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })}`
              : ''}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {total} students present
          </span>
        </div>
      </div>

      {/* Course cards — by program only */}
      {total > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text-muted)] mb-3">
            Select a program to view attendance
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from(
              event.attendanceRecords.reduce((map, rec) => {
                const p = rec.student.program
                map.set(p, (map.get(p) ?? 0) + 1)
                return map
              }, new Map<string, number>())
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([program, count]) => (
                <div
                  key={program}
                  style={{ backgroundColor: '#fdeee4', borderColor: '#f5ccb0' }}
                  className="rounded-2xl border-2 p-8 flex flex-col items-center justify-center gap-2 min-h-[160px]"
                >
                  <h2 className="text-2xl font-extrabold tracking-tight text-center text-[var(--brand-600)]">
                    {program}
                  </h2>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">
                    {count.toLocaleString()} record{count !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Session Log — scrollable, 5 rows visible */}
      {sessionLog.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Session Log
            </p>
            <span className="text-xs text-[var(--text-muted)]">
              {sessionLog.length} scan{sessionLog.length !== 1 ? 's' : ''} — most recent first
            </span>
          </div>

          <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] overflow-hidden shadow-sm">
            <div className="overflow-y-auto max-h-[375px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--brand-100)] sticky top-0 z-10">
                  <tr className="text-xs uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                    <th className="px-4 py-3 w-8">#</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">
                      <span className="flex items-center gap-1 text-green-600">
                        <LogIn className="w-3 h-3" /> Time In
                      </span>
                    </th>
                    <th className="px-4 py-3">
                      <span className="flex items-center gap-1 text-blue-600">
                        <LogOut className="w-3 h-3" /> Time Out
                      </span>
                    </th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--brand-50)]">
                  {sessionLog.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-[var(--brand-50)]/40 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-[var(--text-primary)] text-sm">{entry.fullName}</p>
                        <p className="text-xs text-[var(--text-muted)] font-mono">{entry.studentNumber}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                        {entry.program} · Yr {entry.yearLevel}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-green-700">
                        {fmt(entry.timeIn)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-blue-700">
                        {fmt(entry.timeOut)}
                      </td>
                      <td className="px-4 py-2.5">
                        {entry.isLateTimeIn ? (
                          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Late
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                            On Time
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
