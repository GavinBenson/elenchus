import { Prisma } from '@/generated/prisma/client'

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export function errorResponse(error: ApiError) {
  return Response.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status }
  )
}

export function toErrorResponse(e: unknown): Response {
  if (e instanceof ApiError) {
    return errorResponse(e)
  }

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2003') {
      return errorResponse(
        new ApiError(400, 'invalid_reference', 'Referenced record does not exist')
      )
    }
    if (e.code === 'P2025') {
      return errorResponse(new ApiError(404, 'not_found', 'Record not found'))
    }
  }

  return errorResponse(new ApiError(500, 'internal_error', 'An unexpected error occurred'))
}
