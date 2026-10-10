'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AlertTriangle, User, Lock, Eye, EyeOff } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  not_dwcl: 'Only @dwc-legazpi.edu school accounts are allowed.',
  rejected: 'Your account has been rejected. Please contact the LICOES admin.',
  CredentialsSignin: 'Incorrect email or password. Please try again.',
  OAuthSignin: 'There was a problem with Google Sign-In. Please try again.',
  OAuthCallback: 'There was a problem with Google Sign-In. Please try again.',
  default: 'An error occurred. Please try again.',
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full pl-10 pr-10 py-3 border-b-2 border-[var(--brand-100)] bg-transparent text-sm focus:outline-none focus:border-[var(--brand-500)] transition-colors placeholder:text-[var(--text-muted)]"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

function LoginContent() {
  const params = useSearchParams()
  const router = useRouter()
  const errorKey = params.get('error') ?? ''
  const errorMsg = ERROR_MESSAGES[errorKey] ?? (errorKey ? ERROR_MESSAGES.default : null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl: '/' })
    setLoading(false)
    if (res?.error) {
      setFormError('Incorrect email or password. Please try again.')
    } else if (res?.url) {
      router.push(res.url)
    }
  }

  const displayError = formError ?? errorMsg

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg-cream)] p-4">
      <div className="w-full max-w-3xl flex rounded-2xl overflow-hidden shadow-2xl border border-[var(--brand-100)]">
        <div className="flex-1 bg-white px-10 py-12 flex flex-col justify-center space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">Login</h1>
            <p className="text-sm text-[var(--text-muted)]">Use your DWCL school account</p>
          </div>
          {displayError && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-3 text-sm text-[var(--brand-600)]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{displayError}
            </div>
          )}
          <form onSubmit={handleCredentials} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="email" placeholder="Email (@dwc-legazpi.edu)" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full pl-10 pr-4 py-3 border-b-2 border-[var(--brand-100)] bg-transparent text-sm focus:outline-none focus:border-[var(--brand-500)] transition-colors placeholder:text-[var(--text-muted)]" />
            </div>
            <PasswordInput value={password} onChange={setPassword} placeholder="Password" />
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white font-semibold text-sm transition-colors disabled:opacity-60">
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--brand-100)]" />
            <span className="text-xs text-[var(--text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--brand-100)]" />
          </div>
          <button onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--brand-100)] bg-white px-5 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--brand-50)] transition-colors shadow-sm">
            {GOOGLE_SVG}
            Login with Google
          </button>
          <p className="text-sm text-[var(--text-muted)] text-center">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[var(--brand-500)] font-semibold hover:underline">Sign Up</Link>
          </p>
        </div>
        <div className="w-72 bg-[var(--brand-500)] px-8 py-12 flex flex-col items-center justify-center text-white text-center space-y-5 shrink-0">
          <Image src="/licoes_logo.png" alt="LICOES Logo" width={100} height={100} className="opacity-90 drop-shadow-lg" />
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight">WELCOME BACK!</h2>
            <p className="text-sm text-white/80">Already a member? Please Login</p>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Use your<br /><span className="font-semibold text-white/80">@dwc-legazpi.edu</span><br />Google account
          </p>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}