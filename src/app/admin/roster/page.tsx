import { db } from '@/lib/db'
import RosterClient from './RosterClient'

export const dynamic = 'force-dynamic'

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const grouped = await db.student.groupBy({
    by: ['course'],
    _count: { id: true },
    orderBy: { course: 'asc' },
  })

  const rows = grouped.map((r) => ({ course: r.course, count: r._count.id }))
  const totalStudents = rows.reduce((s, r) => s + r.count, 0)

  // Search results — query across all students by name or ID
  const searchResults = query
    ? await db.student.findMany({
        where: {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { id: { contains: query } },
          ],
        },
        orderBy: { fullName: 'asc' },
        take: 50,
      })
    : []

  const YEAR_LABELS: Record<string, string> = {
    '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year',
  }

  return (
    <div className="space-y-6">
      <RosterClient
        rows={rows}
        totalStudents={totalStudents}
        query={query}
        searchResults={searchResults.map((s) => ({
          id: s.id,
          fullName: s.fullName,
          course: s.course,
          yearLevel: s.yearLevel,
          yearLabel: YEAR_LABELS[s.yearLevel] ?? `Year ${s.yearLevel}`,
        }))}
      />
    </div>
  )
}
