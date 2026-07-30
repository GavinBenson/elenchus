import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod'
export const SESSION_COOKIE = 'elenchus_session'

export function signSession(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifySession(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
    return { userId: payload.userId }
  } catch {
    return null
  }
}
