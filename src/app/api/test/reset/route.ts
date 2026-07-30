import { runSeed } from '../../../../../prisma/seed'
import { ApiError, errorResponse } from '@/lib/errors'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return errorResponse(new ApiError(404, 'not_found', 'Not available in production'))
  }
  await runSeed()
  return Response.json({ ok: true })
}
