import AdminLayoutClient from './AdminLayoutClient'
import { db } from '@/lib/db'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pendingCount = await db.officer.count({ where: { status: 'PENDING' } })

  return <AdminLayoutClient pendingCount={pendingCount}>{children}</AdminLayoutClient>
}
