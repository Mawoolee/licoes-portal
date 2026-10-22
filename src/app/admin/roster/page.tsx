import { db } from '@/lib/db'
import RosterClient from './RosterClient'

export const dynamic = 'force-dynamic'

export default async function RosterPage() {
  const grouped = await db.student.groupBy({
    by: ['course'],
    _count: { id: true },
    orderBy: { course: 'asc' },
  })

  const rows = grouped.map((r) => ({ course: r.course, count: r._count.id }))
  const totalStudents = rows.reduce((s, r) => s + r.count, 0)

  const YEAR_LABELS: Record<string, string> = {
    '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year',
  }

  // Load all students for client-side live search
  const allStudents = await db.student.findMany({
    orderBy: { fullName: 'asc' },
    select: { id: true, fullName: true, course: true, yearLevel: true },
  })

  return (
    <div className="space-y-6">
      <RosterClient
        rows={rows}
        totalStudents={totalStudents}
        allStudents={allStudents.map((s) => ({
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
