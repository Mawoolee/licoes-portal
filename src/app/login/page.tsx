'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ShieldCheck } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  not_dwcl: 'Dapat DWCL school account ang gamitin (@dwc-legazpi.edu).',
  rejected: 'Ang iyong account ay na-reject ng admin. Makipag-ugnayan sa LICOES admin.',
  OAuthSignin: 'May problema sa Google Sign-In. Pakisubukan ulit.',
  OAuthCallback: 'May problema sa Google Sign-In. Pakisubukan ulit.',
  default: 'May naganap na error. Pakisubukan ulit.',
}

function LoginContent() {
  const params = useSearchParams()
  const errorKey = params.get('error') ?? ''
  const errorMsg = ERROR_MESSAGES[errorKey] ?? (errorKey ? ERROR_MESSAGES.default : null)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[var(--bg-cream)]">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-[var(--brand-100)] bg-[var(--surface)] p-10 shadow-[0_18px_45px_rgba(203,24,29,0.08)]">

        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--brand-50)] flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-[var(--brand-500)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              LICOES Portal
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Sign in gamit ang iyong DWCL school account
            </p>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="rounded-md border border-[var(--brand-100)] bg-[var(--brand-50)] p-3 text-sm text-[var(--brand-600)] text-center">
            {errorMsg}
          </div>
        )}

        {/* Google Button */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-[var(--brand-100)] bg-white px-5 py-4 text-base font-semibold text-[var(--text-primary)] hover:bg-[var(--brand-50)] transition-colors shadow-sm"
        >
          <svg width="22" height="22" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <p className="text-center text-xs text-[var(--text-muted)] leading-relaxed">
          Para sa LICOES officers lamang.<br />
          Gamitin ang iyong <span className="font-semibold">@dwc-legazpi.edu</span> account.
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
