import { describe, it, expect } from 'vitest'
import { POST } from './route'
import { PATCH, DELETE, GET } from './[id]/route'

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

describe('PATCH/DELETE/GET /api/job-postings/[id] with nonexistent id', () => {
  it('PATCH returns 404 (not 500) for a nonexistent id', async () => {
    const request = new Request('http://localhost/api/job-postings/nonexistent-id', {
      method: 'PATCH',
      headers: {
        'x-user-id': 'test-user',
        'x-user-permissions': 'edit_job_postings',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ title: 'Updated Title' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent-id' }) })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toEqual({ error: { code: 'not_found', message: 'Job posting not found' } })
  })

  it('DELETE returns 404 (not 500) for a nonexistent id', async () => {
    const request = new Request('http://localhost/api/job-postings/nonexistent-id', {
      method: 'DELETE',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': 'edit_job_postings' },
    })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent-id' }) })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toEqual({ error: { code: 'not_found', message: 'Job posting not found' } })
  })

  it('GET returns 404 for a nonexistent id', async () => {
    const request = new Request('http://localhost/api/job-postings/nonexistent-id', {
      method: 'GET',
      headers: { 'x-user-id': 'test-user' },
    })
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent-id' }) })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toEqual({ error: { code: 'not_found', message: 'Job posting not found' } })
  })
})
