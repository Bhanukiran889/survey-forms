export class ApiError extends Error { constructor(message: string, public status: number, public fields?: { path: string; message: string }[]) { super(message); } }
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options, headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), ...options?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error?.message ?? 'The request could not be completed. Please try again.', response.status, data.error?.fields);
  return data;
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
