import { describe, it, expect } from 'vitest'
import { GET, POST } from './route'

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
})
