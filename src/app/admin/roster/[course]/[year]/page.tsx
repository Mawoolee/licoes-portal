import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'

const YEAR_LABELS: Record<string, string> = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' }

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

  const yearLabel = YEAR_LABELS[year] ?? `Year ${year}`

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
        <Link href="/admin/roster" className="hover:text-slate-300 flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Student Roster
        </Link>
        <span>/</span>
        <Link href={`/admin/roster/${courseSlug}`} className="hover:text-slate-300">{course}</Link>
        <span>/</span>
        <span className="font-semibold text-slate-200">{yearLabel}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{course} · {yearLabel}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {query
              ? `${students.length} result${students.length !== 1 ? 's' : ''} for "${query}"`
              : `${students.length.toLocaleString()} student${students.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Search */}
        <form method="GET" className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search name or ID…"
              className="pl-8 pr-3 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400 w-48"
            />
          </div>
          <button type="submit" className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium">
            Search
          </button>
          {query && (
            <Link href={`/admin/roster/${courseSlug}/${yearSlug}`} className="px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-50 font-medium">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Student Table */}
      {students.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-12 text-center text-slate-500 text-sm">
          No students matched your search.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3 w-8">#</th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">A.Y.</th>
                <th className="px-4 py-3">Semester</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {students.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{s.id}</td>
                  <td className="px-4 py-2.5 font-medium">{s.fullName}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{s.section}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{s.academicYear}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{s.semester}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
