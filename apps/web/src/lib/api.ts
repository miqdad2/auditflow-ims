const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Typed API error — callers can inspect statusCode for specific handling
export class ApiError extends Error {
  statusCode: number;
  errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch'));
}

async function parseError(res: Response, fallback: string): Promise<ApiError> {
  try {
    const body = await res.json();
    const message = Array.isArray(body?.message)
      ? body.message.join('; ')
      : (body?.message ?? fallback);
    return new ApiError(message, res.status, body?.errorCode);
  } catch {
    return new ApiError(fallback, res.status);
  }
}

function handle401() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auditflow_token');
    localStorage.removeItem('auditflow_user');
    window.location.replace('/login?reason=session_expired');
  }
}

// GET — safe to retry internally; caller can still catch
export async function apiGet<T>(path: string, token: string): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      handle401();
      throw new ApiError('Your session has expired. Please log in again.', 401);
    }
    if (!res.ok) {
      throw await parseError(res, 'Request failed');
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isNetworkError(err)) throw new ApiError('Server unavailable. Please check your connection.', 0);
    throw new ApiError('An unexpected error occurred.', 0);
  }
}

// POST (unauthenticated) — no retry
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw await parseError(res, 'Request failed');
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isNetworkError(err)) throw new ApiError('Server unavailable. Please check your connection.', 0);
    throw new ApiError('An unexpected error occurred.', 0);
  }
}

// POST (authenticated) — no retry
export async function apiPostAuth<T>(path: string, body: unknown, token: string): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      handle401();
      throw new ApiError('Your session has expired. Please log in again.', 401);
    }
    if (!res.ok) {
      throw await parseError(res, 'Request failed');
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isNetworkError(err)) throw new ApiError('Server unavailable. Please check your connection.', 0);
    throw new ApiError('An unexpected error occurred.', 0);
  }
}

// PATCH — no retry
export async function apiPatchAuth<T>(path: string, body: unknown, token: string): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      handle401();
      throw new ApiError('Your session has expired. Please log in again.', 401);
    }
    if (!res.ok) {
      throw await parseError(res, 'Request failed');
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isNetworkError(err)) throw new ApiError('Server unavailable. Please check your connection.', 0);
    throw new ApiError('An unexpected error occurred.', 0);
  }
}

// DELETE — no retry
export async function apiDeleteAuth<T>(path: string, token: string): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      handle401();
      throw new ApiError('Your session has expired. Please log in again.', 401);
    }
    if (!res.ok) {
      throw await parseError(res, 'Request failed');
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isNetworkError(err)) throw new ApiError('Server unavailable. Please check your connection.', 0);
    throw new ApiError('An unexpected error occurred.', 0);
  }
}

// File upload — no retry
export async function apiUploadFile<T>(
  path: string,
  formData: FormData,
  token: string,
): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (res.status === 401) {
      handle401();
      throw new ApiError('Your session has expired. Please log in again.', 401);
    }
    if (!res.ok) {
      throw await parseError(res, 'Upload failed');
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isNetworkError(err)) throw new ApiError('Server unavailable. Upload could not be completed.', 0);
    throw new ApiError('An unexpected error occurred during upload.', 0);
  }
}
