'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
      const body = await response.json()
      setError(body.error.message)
      return
    }
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} data-testid="login-form" className="max-w-sm mx-auto mt-24 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Log in</h1>
      <input
        data-testid="login-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="border p-2 rounded"
      />
      <input
        data-testid="login-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="border p-2 rounded"
      />
      {error && <p data-testid="login-error" className="text-red-600">{error}</p>}
      <button data-testid="login-submit" type="submit" className="bg-black text-white p-2 rounded">
        Log in
      </button>
    </form>
  )
}
