import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const roles = session?.user.roles ?? []

  if (roles.includes('ADMIN')) redirect('/admin')
  if (roles.includes('TREASURER')) redirect('/treasurer/claims')
  if (roles.includes('ATTENDANCE_OFFICER')) redirect('/attendance')
  if (roles.includes('FINANCE_OFFICER')) redirect('/finance/cash-advances')
  if (session) redirect('/unauthorized')

  redirect('/login')
}
