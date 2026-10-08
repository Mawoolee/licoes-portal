import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'

const YEAR_LABELS: Record<string, string> = {
  '1': '1st Year',
  '2': '2nd Year',
  '3': '3rd Year',
  '4': '4th Year',
}

function fmt(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export default async function EventCourseYearPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; course: string; year: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { eventId, course: courseSlug, year: yearSlug } = await params
  const { q } = await searchParams
  const course = decodeURIComponent(courseSlug)
  const year = decodeURIComponent(yearSlug)
  const query = q?.trim() ?? ''

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) notFound()

  const records = await db.attendanceRecord.findMany({
    where: {
      eventId,
      student: {
        program: course,
        yearLevel: parseInt(year),
      },
      ...(query
        ? {
            OR: [
              { student: { fullName: { contains: query, mode: 'insensitive' } } },
              { student: { studentNumber: { contains: query } } },
            ],
          }
        : {}),
    },
    include: {
      student: true,
      sessions: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { student: { fullName: 'asc' } },
  })

  const yearLabel = YEAR_LABELS[year] ?? `Year ${year}`
  const presentCount = records.filter((r) => r.status === 'PRESENT').length
  const absentCount = records.length - presentCount

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] flex-wrap">
        <Link
          href="/admin/attendance/list"
          className="hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Attendance List
        </Link>
        <span>/</span>
        <Link href={`/admin/attendance/${eventId}`} className="hover:text-[var(--text-primary)] transition-colors">
          {event.name}
        </Link>
        <span>/</span>
        <Link href={`/admin/attendance/${eventId}/${courseSlug}`} className="hover:text-[var(--text-primary)] transition-colors">
          {course}
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">{yearLabel}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {course} · {yearLabel}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{event.name}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-200">
              ● {presentCount} Present
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-500 border border-red-200">
              ● {absentCount} Absent
            </span>
          </div>
        </div>

        {/* Search */}
        <form method="GET" className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search name or ID…"
              className="pl-8 pr-3 py-1.5 text-xs border border-[var(--brand-100)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)] w-48"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg font-medium transition-colors"
          >
            Search
          </button>
          {query && (
            <Link
              href={`/admin/attendance/${eventId}/${courseSlug}/${yearSlug}`}
              className="px-3 py-1.5 text-xs border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      {records.length === 0 ? (
        <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-muted)]">
          {query ? 'No students matched your search.' : 'No attendance records for this group.'}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-alt)] border-b border-[var(--brand-100)]">
              <tr className="text-xs uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Time In</th>
                <th className="px-4 py-3">Time Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--brand-50)]">
              {records.map((r, idx) => {
                const isPresent = r.status === 'PRESENT'
                const firstSession = r.sessions[0]
                const lastSession = r.sessions[r.sessions.length - 1]
                const timeIn = firstSession?.timeIn ?? null
                const timeOut = lastSession?.timeOut ?? null

                return (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      isPresent
                        ? 'bg-green-50/40 hover:bg-green-50'
                        : 'bg-red-50/30 hover:bg-red-50/60'
                    }`}
                  >
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                      {r.student.studentNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                      {r.student.fullName}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {r.student.program}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {YEAR_LABELS[String(r.student.yearLevel)] ?? `Year ${r.student.yearLevel}`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          isPresent
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-red-100 text-red-600 border border-red-300'
                        }`}
                      >
                        {isPresent ? '✓ Present' : '✗ Absent'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {fmt(timeIn)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {fmt(timeOut)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
