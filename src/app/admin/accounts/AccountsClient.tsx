'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AccountStatus, Role } from '@prisma/client'
import { CheckCircle, XCircle, Clock, ShieldCheck, User } from 'lucide-react'

type OfficerRow = {
  id: string
  name: string
  email: string
  roles: Role[]
  status: AccountStatus
  createdAt: Date
}

const ALL_ROLES: Role[] = [
  'ADMIN',
  'ATTENDANCE_OFFICER',
  'TREASURER',
  'FINANCE_OFFICER',
  'AUDITOR',
]

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  ATTENDANCE_OFFICER: 'Attendance Officer',
  TREASURER: 'Treasurer',
  FINANCE_OFFICER: 'Finance Officer',
  AUDITOR: 'Auditor',
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  ACTIVE: {
    label: 'Active',
    icon: CheckCircle,
    className: 'bg-green-50 text-green-600 border-green-200',
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-red-50 text-red-600 border-red-200',
  },
}

export default function AccountsClient({ officers }: { officers: OfficerRow[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editRoles, setEditRoles] = useState<Record<string, Role[]>>({})
  const [activeTab, setActiveTab] = useState<AccountStatus | 'ALL'>('PENDING')

  const pendingCount = officers.filter((o) => o.status === 'PENDING').length

  const displayed =
    activeTab === 'ALL' ? officers : officers.filter((o) => o.status === activeTab)

  async function updateAccount(
    officerId: string,
    action: 'approve' | 'reject' | 'update-roles',
    roles?: Role[]
  ) {
    setLoadingId(officerId)
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId, action, roles }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.message ?? 'An error occurred.')
      } else {
        router.refresh()
      }
    } finally {
      setLoadingId(null)
    }
  }

  function getRolesForOfficer(officer: OfficerRow): Role[] {
    return editRoles[officer.id] ?? officer.roles
  }

  function toggleRole(officerId: string, currentRoles: Role[], role: Role) {
    const next = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role]
    setEditRoles((prev) => ({ ...prev, [officerId]: next }))
  }

  const tabs: { key: AccountStatus | 'ALL'; label: string }[] = [
    { key: 'PENDING', label: `Pending (${pendingCount})` },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'ALL', label: 'All' },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--brand-100)]">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-md ${
              activeTab === key
                ? 'border-b-2 border-[var(--brand-500)] text-[var(--brand-500)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {displayed.length === 0 && (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">
          Walang accounts sa kategoryang ito.
        </div>
      )}

      <div className="space-y-3">
        {displayed.map((officer) => {
          const statusCfg = STATUS_CONFIG[officer.status]
          const StatusIcon = statusCfg.icon
          const currentRoles = getRolesForOfficer(officer)
          const rolesChanged =
            JSON.stringify(currentRoles.slice().sort()) !==
            JSON.stringify(officer.roles.slice().sort())
          const isLoading = loadingId === officer.id

          return (
            <div
              key={officer.id}
              className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-5 space-y-4"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--brand-50)] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[var(--brand-500)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[var(--text-primary)]">
                      {officer.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{officer.email}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      Signed up:{' '}
                      {new Date(officer.createdAt).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.className}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusCfg.label}
                </span>
              </div>

              {/* Roles */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Roles
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_ROLES.map((role) => {
                    const selected = currentRoles.includes(role)
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(officer.id, currentRoles, role)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                          selected
                            ? 'bg-[var(--brand-500)] text-white border-[var(--brand-500)]'
                            : 'border-[var(--brand-100)] text-[var(--text-muted)] hover:border-[var(--brand-300)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {ROLE_LABELS[role]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {officer.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => updateAccount(officer.id, 'approve', currentRoles)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-60"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {isLoading ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => updateAccount(officer.id, 'reject')}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {isLoading ? 'Processing...' : 'Reject'}
                    </button>
                  </>
                )}

                {officer.status === 'ACTIVE' && rolesChanged && (
                  <button
                    onClick={() => updateAccount(officer.id, 'update-roles', currentRoles)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[var(--brand-500)] text-white font-semibold hover:bg-[var(--brand-600)] transition-colors disabled:opacity-60"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isLoading ? 'Saving...' : 'Save Roles'}
                  </button>
                )}

                {officer.status === 'ACTIVE' && (
                  <button
                    onClick={() => updateAccount(officer.id, 'reject')}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-red-200 text-red-500 font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Deactivate
                  </button>
                )}

                {officer.status === 'REJECTED' && (
                  <button
                    onClick={() => updateAccount(officer.id, 'approve', currentRoles)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-60"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {isLoading ? 'Processing...' : 'Re-activate'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
