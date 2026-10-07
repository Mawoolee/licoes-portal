import Link from 'next/link'
import { db } from '@/lib/db'
import { FileSpreadsheet, Users, CalendarDays, QrCode } from 'lucide-react'

export default async function AdminDashboardPage() {
  // Fetch quick stats in parallel
  const [studentCount, eventCount] = await Promise.all([
    db.student.count(),
    db.event.count(),
  ])

  const stats = [
    {
      label: 'Students in Alpha List',
      value: studentCount.toLocaleString(),
      icon: Users,
      href: '/admin/students',
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
    {
      label: 'Events Created',
      value: eventCount.toLocaleString(),
      icon: CalendarDays,
      href: '/admin/events',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    },
  ]

  const quickLinks = [
    {
      href: '/admin/alphalist',
      label: 'Import Student Data',
      description: 'Import student records from the SOECS Excel file',
      icon: FileSpreadsheet,
    },
    {
      href: '/admin/roster',
      label: 'Student Roster',
      description: 'Browse students by program and year level',
      icon: Users,
    },
    {
      href: '/admin/events',
      label: 'Manage Events',
      description: 'Create and close attendance events',
      icon: CalendarDays,
    },
    {
      href: '/attendance',
      label: 'Attendance Terminal',
      description: 'Open the barcode scanner for a live event',
      icon: QrCode,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Admin Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage student records, events, and system settings.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3 hover:shadow-sm transition-shadow"
          >
            <div className={`inline-flex p-2.5 rounded-lg ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-violet-400 hover:shadow-sm transition-all group space-y-2"
            >
              <Icon className="w-5 h-5 text-slate-400 group-hover:text-violet-600 transition-colors" />
              <p className="font-semibold text-sm text-[var(--text-primary)]">{label}</p>
              <p className="text-xs text-slate-400">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
