import { describe, it, expect } from 'vitest'
import { signSession, verifySession } from './auth'

describe('session tokens', () => {
  it('round-trips a valid token', () => {
    const token = signSession('user-123')
    const result = verifySession(token)
    expect(result?.userId).toBe('user-123')
  })

  it('rejects a garbage token', () => {
    expect(verifySession('not-a-real-token')).toBeNull()
  })
})
