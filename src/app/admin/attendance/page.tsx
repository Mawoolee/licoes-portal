import Link from 'next/link'
import { ClipboardList, QrCode } from 'lucide-react'

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Attendance
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          View attendance records or open the scanner terminal.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {/* Attendance List */}
        <Link
          href="/admin/attendance/list"
          className="group rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-6 flex flex-col gap-4 hover:shadow-md hover:border-[var(--brand-200)] transition-all"
        >
          <div className="inline-flex p-3 rounded-xl bg-[var(--brand-50)] w-fit">
            <ClipboardList className="w-6 h-6 text-[var(--brand-500)]" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">Attendance List</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              View who attended each event — present, absent, time-in and time-out records.
            </p>
          </div>
          <p className="text-xs text-[var(--brand-500)] font-medium group-hover:underline mt-auto">
            View records →
          </p>
        </Link>

        {/* Attendance Scanner */}
        <Link
          href="/attendance"
          className="group rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-6 flex flex-col gap-4 hover:shadow-md hover:border-[var(--brand-200)] transition-all"
        >
          <div className="inline-flex p-3 rounded-xl bg-blue-50 w-fit">
            <QrCode className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">Attendance Scanner</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Open the LICOES Attendance Terminal to scan student barcodes for live events.
            </p>
          </div>
          <p className="text-xs text-blue-500 font-medium group-hover:underline mt-auto">
            Open terminal →
          </p>
        </Link>
      </div>
    </div>
  )
}
