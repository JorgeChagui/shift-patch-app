// Services return a result instead of a Response so both route handlers and Server Actions
// can use them: handlers turn it into JSON (`resultResponse` in http.ts), actions into banner state.

export type ServiceError = { ok: false; status: 400 | 401 | 403 | 404 | 409; error: string };
export type ServiceResult<T> = { ok: true; data: T } | ServiceError;

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function fail(status: ServiceError["status"], error: string): ServiceError {
  return { ok: false, status, error };
}
