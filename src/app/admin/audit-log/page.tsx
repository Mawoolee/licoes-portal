import { db } from '@/lib/db'
import { ShieldCheck, User, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  // Account
  ACCOUNT_SIGNUP:           { label: 'Sign Up',              color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ACCOUNT_ADMIN_CREATED:    { label: 'Account Created',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ACCOUNT_APPROVED:         { label: 'Account Approved',     color: 'bg-green-50 text-green-700 border-green-200' },
  ACCOUNT_REJECTED:         { label: 'Account Rejected',     color: 'bg-red-50 text-red-700 border-red-200' },
  ACCOUNT_DELETED:          { label: 'Account Deleted',      color: 'bg-red-50 text-red-700 border-red-200' },
  ACCOUNT_ROLE_UPDATED:     { label: 'Role Updated',         color: 'bg-amber-50 text-amber-700 border-amber-200' },
  // Attendance
  ATTENDANCE_TIME_IN:           { label: 'Time In',          color: 'bg-green-50 text-green-700 border-green-200' },
  ATTENDANCE_TIME_IN_LATE:      { label: 'Time In (Late)',   color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ATTENDANCE_TIME_OUT:          { label: 'Time Out',         color: 'bg-teal-50 text-teal-700 border-teal-200' },
  ATTENDANCE_TIME_OUT_NO_TIMEIN:{ label: 'Time Out (No Time-In)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  // Payments / Treasurer
  PAYMENT_APPROVED:         { label: 'Payment Approved',     color: 'bg-green-50 text-green-700 border-green-200' },
  PAYMENT_REJECTED:         { label: 'Payment Rejected',     color: 'bg-red-50 text-red-700 border-red-200' },
  PAYMENT_CLAIM_SUBMITTED:  { label: 'Claim Submitted',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
  // Finance
  CASH_ADVANCE_CREATED:     { label: 'Cash Advance Created', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  EXPENSE_CREATED:          { label: 'Expense Created',      color: 'bg-purple-50 text-purple-700 border-purple-200' },
  LIQUIDATION_CREATED:      { label: 'Liquidation Created',  color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

function getActionMeta(action: string) {
  return ACTION_LABELS[action] ?? { label: action.replace(/_/g, ' '), color: 'bg-slate-50 text-slate-600 border-slate-200' }
}

function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    timeZone: 'Asia/Manila',
  })
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page: pageParam, q } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)
  const query = q?.trim() ?? ''

  const where = query
    ? {
        OR: [
          { action: { contains: query, mode: 'insensitive' as const } },
          { officer: { name: { contains: query, mode: 'insensitive' as const } } },
          { officer: { email: { contains: query, mode: 'insensitive' as const } } },
          { targetRecord: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        officer: { select: { id: true, name: true, email: true } },
      },
    }),
    db.auditLog.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[var(--brand-500)]" /> Audit Log
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Complete record of all system actions. {total.toLocaleString()} total entries.
          </p>
        </div>

        {/* Search */}
        <form method="GET" className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search action, officer, record…"
            className="px-3 py-1.5 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)] w-56"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg font-medium transition-colors"
          >
            Search
          </button>
          {query && (
            <a
              href="/admin/audit-log"
              className="px-3 py-1.5 text-sm border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors"
            >
              Clear
            </a>
          )}
        </form>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-muted)]">
          {query ? 'No entries matched your search.' : 'No audit log entries yet.'}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-alt)] border-b border-[var(--brand-100)]">
                <tr className="text-xs uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Timestamp</span>
                  </th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> Officer</span>
                  </th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-50)]">
                {logs.map((log) => {
                  const meta = getActionMeta(log.action)
                  let details = ''
                  try {
                    const parsed = log.newVal ? JSON.parse(log.newVal) : null
                    if (parsed) details = Object.entries(parsed).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')
                  } catch {}

                  return (
                    <tr key={log.id} className="hover:bg-[var(--brand-50)]/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono whitespace-nowrap">
                        {fmtDateTime(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.officer ? (
                          <div>
                            <p className="font-medium text-[var(--text-primary)] text-xs">{log.officer.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">{log.officer.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] italic">System / Student</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {log.targetRecord}
                        {log.recordId && (
                          <p className="font-mono text-[10px] opacity-60 truncate max-w-[100px]">{log.recordId}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)] max-w-[200px] truncate">
                        {log.reason && <span className="text-amber-600 font-medium">{log.reason} · </span>}
                        {details || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-[var(--text-muted)] text-xs">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} entries
              </p>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <a
                    href={`/admin/audit-log?page=${page - 1}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
                    className="px-3 py-1.5 text-xs border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors"
                  >
                    ← Prev
                  </a>
                )}
                <span className="text-xs text-[var(--text-muted)] px-2">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <a
                    href={`/admin/audit-log?page=${page + 1}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
                    className="px-3 py-1.5 text-xs border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors"
                  >
                    Next →
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
