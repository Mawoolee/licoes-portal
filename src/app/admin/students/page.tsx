import { db } from '@/lib/db'
import Link from 'next/link'
import { Users, FileSpreadsheet } from 'lucide-react'

// This is a Server Component — data is fetched at request time
export default async function StudentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; course?: string }>
}) {
  const params = await searchParams
  const query = params.q ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const courseFilter = params.course ?? ''
  const PAGE_SIZE = 60

  const where = {
    ...(query
      ? {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' as const } },
            { id: { contains: query } },
          ],
        }
      : {}),
    ...(courseFilter ? { course: courseFilter } : {}),
  }

  const [students, total, courses] = await Promise.all([
    db.student.findMany({
      where,
      orderBy: [{ course: 'asc' }, { yearLevel: 'asc' }, { fullName: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.student.count({ where }),
    // Get distinct course values for the filter bar
    db.student.findMany({
      select: { course: true },
      distinct: ['course'],
      orderBy: { course: 'asc' },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const courseColors: Record<string, string> = {
    'BSCE CEM': 'bg-orange-100 text-orange-700',
    'BSCE SE': 'bg-amber-100 text-amber-700',
    BSEE: 'bg-yellow-100 text-yellow-700',
    BSCS: 'bg-blue-100 text-blue-700',
    BSIT: 'bg-indigo-100 text-indigo-700',
    BLIS: 'bg-pink-100 text-pink-700',
  }

  function badge(course: string) {
    return courseColors[course] ?? 'bg-slate-100 text-slate-600'
  }

  function buildUrl(overrides: Record<string, string | number>) {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    if (courseFilter) p.set('course', courseFilter)
    if (page !== 1) p.set('page', String(page))
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === '' || v === 1) p.delete(k)
      else p.set(k, String(v))
    })
    const s = p.toString()
    return `/admin/students${s ? `?${s}` : ''}`
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Student Records</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total.toLocaleString()} students across all courses
          </p>
        </div>
        <Link
          href="/admin/alphalist"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Upload Alpha List
        </Link>
      </div>

      {total === 0 && !query && !courseFilter ? (
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-16 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-600">No students imported yet.</p>
          <p className="text-xs text-slate-400">
            Upload the SOECS Alpha List Excel file to populate this roster.
          </p>
          <Link
            href="/admin/alphalist"
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Go to Alpha List Upload
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
          {/* Filter / Search bar */}
          <div className="p-4 border-b flex flex-wrap items-center gap-3">
            {/* Search */}
            <form method="GET" action="/admin/students" className="flex items-center gap-2 flex-1 min-w-48">
              {courseFilter && (
                <input type="hidden" name="course" value={courseFilter} />
              )}
              <input
                name="q"
                defaultValue={query}
                placeholder="Search by name or student ID..."
                className="flex-1 px-3 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium"
              >
                Search
              </button>
              {(query || courseFilter) && (
                <Link
                  href="/admin/students"
                  className="px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-50 font-medium text-slate-600"
                >
                  Clear
                </Link>
              )}
            </form>

            {/* Course filter pills */}
            <div className="flex flex-wrap gap-1.5">
              <Link
                href={buildUrl({ course: '', page: 1 })}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  !courseFilter
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </Link>
              {courses.map(({ course }) => (
                <Link
                  key={course}
                  href={buildUrl({ course, page: 1 })}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    courseFilter === course
                      ? 'bg-violet-600 text-white'
                      : `${badge(course)} hover:opacity-80`
                  }`}
                >
                  {course}
                </Link>
              ))}
            </div>
          </div>

          {/* Table */}
          {students.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No students matched your search.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">A.Y.</th>
                  <th className="px-4 py-3">Sem</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {students.map((s, i) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{s.id}</td>
                    <td className="px-4 py-2.5 font-medium">{s.fullName}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${badge(s.course)}`}>
                        {s.course}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-center font-semibold">{s.yearLevel}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{s.academicYear}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{s.semester}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{' '}
                {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: page - 1 })}
                    className="px-3 py-1.5 rounded border hover:bg-slate-50 font-medium"
                  >
                    ← Prev
                  </Link>
                )}
                <span className="px-3">
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={buildUrl({ page: page + 1 })}
                    className="px-3 py-1.5 rounded border hover:bg-slate-50 font-medium"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
