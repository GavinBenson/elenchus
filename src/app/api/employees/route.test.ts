import { describe, it, expect } from 'vitest'
import { GET, POST } from './route'
import { PATCH } from './[id]/route'

function makeRequest(body?: unknown, permissions: string[] = []) {
  return new Request('http://localhost/api/employees', {
    method: body ? 'POST' : 'GET',
    headers: {
      'x-user-id': 'test-user',
      'x-user-permissions': permissions.join(','),
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/employees', () => {
  it('returns 403 when caller lacks edit_employees permission', async () => {
    const response = await POST(makeRequest({ name: 'X', department: 'Y', title: 'Z', hireDate: '2024-01-01' }, []))
    expect(response.status).toBe(403)
  })
})

describe('GET /api/employees', () => {
  it('returns 401 when unauthenticated', async () => {
    const request = new Request('http://localhost/api/employees')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 403 when caller lacks view_all_employees permission', async () => {
    const request = new Request('http://localhost/api/employees', {
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': '' },
    })
    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it('returns 200 when caller has view_all_employees permission', async () => {
    const request = new Request('http://localhost/api/employees', {
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': 'view_all_employees' },
    })
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})

describe('PATCH /api/employees/[id]', () => {
  it('returns 404 for a nonexistent employee id', async () => {
    const request = new Request('http://localhost/api/employees/nonexistent-id', {
      method: 'PATCH',
      headers: {
        'x-user-id': 'test-user',
        'x-user-permissions': 'edit_employees',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated Name' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent-id' }) })
    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json).toEqual({ error: { code: 'not_found', message: 'Employee not found' } })
  })
})
