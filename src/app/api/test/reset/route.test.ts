import { describe, it, expect, afterEach, vi } from 'vitest'
import { POST } from './route'

describe('POST /api/test/reset', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 404 in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const response = await POST()
    expect(response.status).toBe(404)
  })
})
