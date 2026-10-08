import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Clock, CheckCircle2, MapPin } from 'lucide-react'

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
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!event) notFound()

  const total = event.attendanceRecords.length

  function fmt(d: Date | null) {
    if (!d) return '—'
    return new Date(d).toLocaleTimeString('en-PH', {
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    })
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
      </Link>

      {/* Event header */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            Closed
          </span>
          <h1 className="text-xl font-bold">{event.name}</h1>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {event.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(event.timeInStart ?? event.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
            {event.timeOutEnd ? ` – ${new Date(event.timeOutEnd).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {total} students present
          </span>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-sm">Attendance Records ({total})</span>
        </div>

        {total === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No attendance records for this event.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Program / Year</th>
                <th className="px-4 py-3">Time In</th>
                <th className="px-4 py-3">Time Out</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {event.attendanceRecords.map((rec, i) => {
                const firstSession = rec.sessions[0]
                const lastSession = rec.sessions[rec.sessions.length - 1]
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                      {rec.student.studentNumber}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{rec.student.fullName}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {rec.student.program} · Yr {rec.student.yearLevel}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-emerald-600 font-mono">
                      {firstSession ? fmt(firstSession.timeIn) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">
                      {lastSession?.timeOut ? fmt(lastSession.timeOut) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
