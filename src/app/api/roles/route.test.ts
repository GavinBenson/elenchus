import { describe, it, expect } from 'vitest'
import { POST } from './route'

describe('POST /api/roles', () => {
  it('returns 403 for a non-admin caller', async () => {
    const request = new Request('http://localhost/api/roles', {
      method: 'POST',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': '', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'new-role' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })
})
