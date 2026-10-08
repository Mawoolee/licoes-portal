import { redirect } from 'next/navigation'

// Sign-up is now handled automatically via Google Sign-In.
// First-time DWCL Google sign-in creates a PENDING account.
export default function SignupPage() {
  redirect('/login')
}
