import { z, ZodSchema } from 'zod'
import { ApiError } from './errors'

export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ApiError(400, 'validation_error', result.error.issues.map((i) => i.message).join('; '))
  }
  return result.data
}
