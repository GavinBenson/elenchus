import { describe, it, expect } from 'vitest'
import { POST } from './route'

describe('POST /api/auth/login', () => {
  it('returns 400 with standard error shape when body is malformed JSON', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({
      error: {
        code: 'validation_error',
        message: 'Request body must be valid JSON',
      },
    })
  })
})
