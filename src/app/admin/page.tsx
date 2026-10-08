import Link from 'next/link'
import { db } from '@/lib/db'
import { Users, CalendarDays, BadgeCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  // Get the active collection period for this semester
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

  const [studentCount, eventCount, paidCount] = await Promise.all([
    // Total students this semester
    db.student.count(),

    // Total events this semester
    db.event.count(),

    // Total students who paid membership fee in the active period
    membershipFeeItemId
      ? db.paymentClaim.count({
          where: {
            collectionPeriodId: activePeriod!.id,
            status: 'APPROVED',
            claimItems: {
              some: { feeItemId: membershipFeeItemId },
            },
          },
        })
      : Promise.resolve(0),
  ])

  const stats = [
    {
      label: 'Total Students',
      sublabel: activePeriod ? `${activePeriod.name}` : 'This semester',
      value: studentCount.toLocaleString(),
      icon: Users,
      href: '/admin/roster',
      iconBg: 'bg-[var(--brand-50)]',
      iconColor: 'text-[var(--brand-500)]',
    },
    {
      label: 'Total Events',
      sublabel: 'This semester',
      value: eventCount.toLocaleString(),
      icon: CalendarDays,
      href: '/admin/attendance/list',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Paid Membership Fee',
      sublabel: activePeriod ? `${activePeriod.name}` : 'No active period',
      value: paidCount.toLocaleString(),
      icon: BadgeCheck,
      href: '/admin/payments',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-500',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Dashboard
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Overview of students, events, and membership collections.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, sublabel, value, icon: Icon, href, iconBg, iconColor }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-6 flex flex-col gap-4 hover:shadow-md hover:border-[var(--brand-200)] transition-all"
          >
            <div className={`inline-flex p-2.5 rounded-lg w-fit ${iconBg}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <p className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {value}
              </p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{label}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{sublabel}</p>
            </div>
            <p className="text-xs text-[var(--brand-500)] font-medium group-hover:underline mt-auto">
              View details →
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
