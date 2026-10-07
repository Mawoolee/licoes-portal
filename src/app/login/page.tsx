'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/'
    })

    if (res?.error) {
      setError('Maling email o password. Pakisubukan ulit.')
      setLoading(false)
    } else if (res?.url) {
      router.push(res.url)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[var(--bg-cream)]">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[var(--brand-100)] bg-[var(--surface)] p-8 shadow-[0_18px_45px_rgba(203,24,29,0.08)]">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">LICOES Officer Login</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Gamitin ang iyong DWCL email at password para makapasok sa officer dashboard.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-[var(--brand-100)] bg-[var(--brand-50)] p-3 text-sm text-[var(--brand-600)]">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-muted)]">DWCL Email</label>
            <Input
              type="email"
              placeholder="officer@dwcl.edu.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-muted)]">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying credentials...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </main>
  )
}