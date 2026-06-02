/**
 * Authenticated fetch wrapper
 *
 * Automatically includes credentials (cookies) for all requests.
 * Use this instead of native fetch() for authenticated API calls.
 */

export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: "include" as RequestCredentials,
  });
}