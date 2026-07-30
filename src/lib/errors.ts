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
