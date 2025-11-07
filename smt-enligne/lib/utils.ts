import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function authFetch(input: RequestInfo, init: RequestInit = {}) {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('smt.auth') : null
    const token = raw ? (JSON.parse(raw)?.token as string | null) : null
    const headers = new Headers(init.headers || {})
    if (token) headers.set('Authorization', `Bearer ${token}`)
    // Avoid forcing Content-Type when sending FormData (let browser set boundaries)
    const isFormData = typeof FormData !== 'undefined' && (init as any)?.body instanceof FormData
    if (!isFormData) {
      headers.set('Content-Type', headers.get('Content-Type') || 'application/json')
    }
    // Prefix API base URL if calling backend route starting with /api/
    const base = (typeof process !== 'undefined' && (process as any)?.env?.NEXT_PUBLIC_API_BASE) || 'http://localhost:4000'
    let url = String(input)
    if (url.startsWith('/api/')) {
      url = base.replace(/\/$/, '') + url
    }
    return fetch(url, { ...init, headers }).then((res) => {
      // If API returns 401, show the formal auth-required toast (dynamic import to avoid server imports)
      if (typeof window !== 'undefined' && res && res.status === 401) {
        import('@/hooks/use-toast')
          .then((mod) => {
            try { mod.showAuthRequiredToast() } catch (e) { /* noop */ }
          })
          .catch(() => {
            // ignore dynamic import failures
          })
      }
      return res
    })
  } catch {
    return fetch(input, init).then((res) => {
      if (typeof window !== 'undefined' && res && res.status === 401) {
        import('@/hooks/use-toast')
          .then((mod) => { try { mod.showAuthRequiredToast() } catch (e) { /* noop */ } })
          .catch(() => {})
      }
      return res
    })
  }
}

export function normalizeErrorString(rawInput: unknown) {
  const raw = rawInput == null ? '' : String(rawInput)
  // strip common prefixes like 'Error: ' or 'HTTP 401: '
  const stripped = raw.replace(/^Error:\s*/i, '').replace(/^HTTP\s\d+:\s*/i, '').trim()
  try {
    const parsed = JSON.parse(stripped)
    const message = parsed?.message || stripped
    const statusCode = parsed?.statusCode ?? null
    return { parsed, message: String(message), statusCode }
  } catch {
    return { parsed: null, message: stripped, statusCode: null }
  }
}
