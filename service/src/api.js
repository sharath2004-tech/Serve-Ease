const _raw = import.meta.env.VITE_API_URL || '/api'
const BASE = _raw.endsWith('/api') ? _raw : _raw.replace(/\/$/, '') + '/api'

export const api = async (path, method = 'GET', body = null) => {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}
