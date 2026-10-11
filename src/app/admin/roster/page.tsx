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

  return (
    <div className="space-y-6">
      <RosterClient rows={rows} totalStudents={totalStudents} />
    </div>
  )
}
