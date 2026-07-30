import { describe, it, expect } from 'vitest'
import { PATCH } from './[id]/stage/route'
import { DELETE } from './[id]/route'

describe('PATCH /api/applicants/:id/stage', () => {
  it('returns 400 for an invalid stage value', async () => {
    const request = new Request('http://localhost/api/applicants/abc/stage', {
      method: 'PATCH',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': 'delete_applicant', 'content-type': 'application/json' },
      body: JSON.stringify({ stage: 'not-a-real-stage' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'abc' }) })
    expect(response.status).toBe(400)
  })

  it('returns 404 (not 500) for a nonexistent id', async () => {
    const request = new Request('http://localhost/api/applicants/nonexistent-id/stage', {
      method: 'PATCH',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': 'delete_applicant', 'content-type': 'application/json' },
      body: JSON.stringify({ stage: 'interview' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent-id' }) })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toEqual({ error: { code: 'not_found', message: 'Applicant not found' } })
  })
})

describe('DELETE /api/applicants/:id', () => {
  it('returns 404 (not 500) for a nonexistent id', async () => {
    const request = new Request('http://localhost/api/applicants/nonexistent-id', {
      method: 'DELETE',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': 'delete_applicant' },
    })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent-id' }) })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toEqual({ error: { code: 'not_found', message: 'Applicant not found' } })
  })
})
