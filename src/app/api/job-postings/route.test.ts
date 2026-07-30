import { describe, it, expect } from 'vitest'
import { POST } from './route'

describe('POST /api/job-postings', () => {
  it('returns 403 when caller lacks edit_job_postings permission', async () => {
    const request = new Request('http://localhost/api/job-postings', {
      method: 'POST',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': '', 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'X', department: 'Y' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })
})
