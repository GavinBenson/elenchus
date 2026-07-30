import { z } from 'zod'
import bcrypt from 'bcrypt'
import { db } from '@/lib/db'
import { signSession, SESSION_COOKIE } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(new ApiError(400, 'validation_error', parsed.error.message))
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (!user) {
    return errorResponse(new ApiError(401, 'invalid_credentials', 'Invalid email or password'))
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!valid) {
    return errorResponse(new ApiError(401, 'invalid_credentials', 'Invalid email or password'))
  }

  const token = signSession(user.id)
  const response = Response.json({ id: user.id, email: user.email })
  response.headers.set(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`
  )
  return response
}
