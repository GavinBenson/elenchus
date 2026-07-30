import { describe, it, expect } from 'vitest'
import { GET, POST } from './route'
import { GET as permissionsGET } from '../permissions/route'

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

describe('GET /api/roles', () => {
  it('returns 403 for an authenticated caller without manage_roles permission', async () => {
    const request = new Request('http://localhost/api/roles', {
      method: 'GET',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': '' },
    })
    const response = await GET(request)
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error.code).toBe('forbidden')
  })
})

describe('GET /api/permissions', () => {
  it('returns 403 for an authenticated caller without manage_roles permission', async () => {
    const request = new Request('http://localhost/api/permissions', {
      method: 'GET',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': '' },
    })
    const response = await permissionsGET(request)
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error.code).toBe('forbidden')
  })
})
