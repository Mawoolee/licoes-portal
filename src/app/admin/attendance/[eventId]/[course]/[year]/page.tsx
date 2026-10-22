import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import AttendanceTableClient from './AttendanceTableClient'

export const dynamic = 'force-dynamic'

const YEAR_LABELS: Record<string, string> = {
  '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year',
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
      ...(query ? {
        OR: [
          { student: { fullName: { contains: query, mode: 'insensitive' } } },
          { student: { studentNumber: { contains: query } } },
        ],
      } : {}),
    },
    include: {
      student: true,
      sessions: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { student: { fullName: 'asc' } },
  })

  const yearLabel = YEAR_LABELS[year] ?? `Year ${year}`
  const presentCount = records.filter((r) => r.status === 'PRESENT').length
  const absentCount  = records.length - presentCount

  const rows = records.map((r, idx) => {
    const firstSession = r.sessions[0]
    const lastSession  = r.sessions[r.sessions.length - 1]
    return {
      idx,
      id: r.id,
      studentNumber: r.student.studentNumber,
      fullName: r.student.fullName,
      program: r.student.program,
      yearLevel: r.student.yearLevel,
      status: r.status as 'PRESENT' | 'ABSENT',
      sessionId: firstSession?.id ?? null,
      timeIn:  firstSession?.timeIn  ?? null,
      timeOut: lastSession?.timeOut  ?? null,
      isLateTimeIn: firstSession?.isLateTimeIn ?? false,
    }
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] flex-wrap">
        <Link href="/admin/attendance/list" className="hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Attendance List
        </Link>
        <span>/</span>
        <Link href={`/admin/attendance/${eventId}`} className="hover:text-[var(--text-primary)] transition-colors">{event.name}</Link>
        <span>/</span>
        <Link href={`/admin/attendance/${eventId}/${courseSlug}`} className="hover:text-[var(--text-primary)] transition-colors">{course}</Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">{yearLabel}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{course} · {yearLabel}</h1>
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
            <input name="q" defaultValue={query} placeholder="Search name or ID…"
              className="pl-8 pr-3 py-1.5 text-xs border border-[var(--brand-100)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)] w-48" />
          </div>
          <button type="submit" className="px-3 py-1.5 text-xs bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg font-medium transition-colors">
            Search
          </button>
          {query && (
            <Link href={`/admin/attendance/${eventId}/${courseSlug}/${yearSlug}`}
              className="px-3 py-1.5 text-xs border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Table via client component for interactivity */}
      <AttendanceTableClient rows={rows} eventId={eventId} courseSlug={courseSlug} yearSlug={yearSlug} />
    </div>
  )
}
