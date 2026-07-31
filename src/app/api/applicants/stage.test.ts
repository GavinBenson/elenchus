import { describe, it, expect } from 'vitest'
import { PATCH } from './[id]/stage/route'
import { DELETE, PATCH as PATCH_APPLICANT } from './[id]/route'
import { db } from '@/lib/db'

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

describe('PATCH /api/applicants/:id/stage — stageChangedAt', () => {
  it('advances stageChangedAt when the stage changes', async () => {
    const recruiter = await db.user.findFirstOrThrow({
      where: { email: 'recruiter@elenchus.test' },
    })
    const posting = await db.jobPosting.create({
      data: {
        title: 'Temp Posting (stageChangedAt test)',
        department: 'Engineering',
        status: 'open',
        createdById: recruiter.id,
      },
    })
    const applicant = await db.applicant.create({
      data: {
        jobPostingId: posting.id,
        name: 'Stage Test Applicant',
        email: 'stage.test@example.com',
        stage: 'applied',
        appliedAt: new Date('2026-01-01T00:00:00.000Z'),
        stageChangedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    })

    try {
      const request = new Request(
        `http://localhost/api/applicants/${applicant.id}/stage`,
        {
          method: 'PATCH',
          headers: {
            'x-user-id': recruiter.id,
            'x-user-permissions': 'delete_applicant',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ stage: 'interview' }),
        }
      )
      const response = await PATCH(request, {
        params: Promise.resolve({ id: applicant.id }),
      })
      expect(response.status).toBe(200)

      const updated = await db.applicant.findUniqueOrThrow({
        where: { id: applicant.id },
      })
      expect(updated.stage).toBe('interview')
      expect(updated.stageChangedAt.getTime()).toBeGreaterThan(
        applicant.stageChangedAt.getTime()
      )
      // appliedAt records when they applied and must not move.
      expect(updated.appliedAt.getTime()).toBe(applicant.appliedAt.getTime())
    } finally {
      await db.applicant.delete({ where: { id: applicant.id } })
      await db.jobPosting.delete({ where: { id: posting.id } })
    }
  })
})

describe('PATCH /api/applicants/:id', () => {
  it('returns 403 when caller lacks edit_job_postings permission', async () => {
    const request = new Request('http://localhost/api/applicants/abc', {
      method: 'PATCH',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': '', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    })
    const response = await PATCH_APPLICANT(request, { params: Promise.resolve({ id: 'abc' }) })
    expect(response.status).toBe(403)
  })

  it('returns 404 (not 500) for a nonexistent id', async () => {
    const request = new Request('http://localhost/api/applicants/nonexistent-id', {
      method: 'PATCH',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': 'edit_job_postings', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    })
    const response = await PATCH_APPLICANT(request, { params: Promise.resolve({ id: 'nonexistent-id' }) })
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
