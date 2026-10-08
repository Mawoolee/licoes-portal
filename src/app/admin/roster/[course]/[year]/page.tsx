import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import StudentsTableClient from './StudentsTableClient'

const YEAR_LABELS: Record<string, string> = {
  '1': '1st Year',
  '2': '2nd Year',
  '3': '3rd Year',
  '4': '4th Year',
}

export default async function CourseYearStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ course: string; year: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { course: courseSlug, year: yearSlug } = await params
  const { q } = await searchParams
  const course = decodeURIComponent(courseSlug)
  const year = decodeURIComponent(yearSlug)
  const query = q?.trim() ?? ''

  const students = await db.student.findMany({
    where: {
      course,
      yearLevel: year,
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: 'insensitive' } },
              { id: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { fullName: 'asc' },
  })

  if (students.length === 0 && !query) notFound()

  // Get active collection period for membership fee check
  const activePeriod = await db.collectionPeriod.findFirst({
    where: { isActive: true },
    include: {
      feeItems: {
        where: { name: { contains: 'Membership', mode: 'insensitive' } },
        take: 1,
      },
    },
  })
  const membershipFeeItemId = activePeriod?.feeItems[0]?.id ?? null

  // Load student profiles + attendance for all students on this page
  const studentIds = students.map((s) => s.id)

  const profiles = await db.studentProfile.findMany({
    where: { studentNumber: { in: studentIds } },
    include: {
      paymentClaims: membershipFeeItemId
        ? {
            where: {
              collectionPeriodId: activePeriod!.id,
              status: 'APPROVED',
              claimItems: { some: { feeItemId: membershipFeeItemId } },
            },
            take: 1,
          }
        : false,
      attendanceRecords: {
        include: { event: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const profileMap = new Map(profiles.map((p) => [p.studentNumber, p]))

  const rows = students.map((s) => {
    const profile = profileMap.get(s.id)
    return {
      id: s.id,
      fullName: s.fullName,
      course: s.course,
      yearLevel: s.yearLevel,
      section: s.section,
      hasPaidMembership: (profile?.paymentClaims?.length ?? 0) > 0,
      attendance:
        profile?.attendanceRecords.map((r) => ({
          eventId: r.eventId,
          eventName: r.event.name,
          eventDate: new Date(r.event.timeInStart ?? r.event.createdAt).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          status: r.status as 'PRESENT' | 'ABSENT',
        })) ?? [],
    }
  })

  const yearLabel = YEAR_LABELS[year] ?? `Year ${year}`

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] flex-wrap">
        <Link
          href="/admin/roster"
          className="hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> List of Students
        </Link>
        <span>/</span>
        <Link
          href={`/admin/roster/${courseSlug}`}
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          {course}
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">{yearLabel}</span>
      </div>

      {/* Header + Search */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {course} · {yearLabel}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {query
              ? `${rows.length} result${rows.length !== 1 ? 's' : ''} for "${query}"`
              : `${rows.length.toLocaleString()} student${rows.length !== 1 ? 's' : ''} · Click a name to view full details`}
          </p>
        </div>

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
              href={`/admin/roster/${courseSlug}/${yearSlug}`}
              className="px-3 py-1.5 text-xs border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      <StudentsTableClient students={rows} />
    </div>
  )
}
