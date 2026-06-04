import '../server/config.js'

export function resolveLanrenAuth() {
  const token = process.env.LANREN_AUTH_TOKEN?.trim()
  const authorization = process.env.LANREN_AUTHORIZATION?.trim()
  if (token && authorization) {
    return { token, authorization }
  }

  const storageRaw = process.env.LANREN_AUTH_STORAGE?.trim()
  if (storageRaw) {
    try {
      const parsed = JSON.parse(storageRaw)
      const state = parsed?.state ?? parsed
      const storageToken = state?.token?.trim()
      const storageAuthorization = state?.authorization?.trim()
      if (storageToken && storageAuthorization) {
        return { token: storageToken, authorization: storageAuthorization }
      }
    } catch {
      // fall through
    }
  }

  return null
}

export function requireLanrenAuth() {
  const auth = resolveLanrenAuth()
  if (auth) return auth

  console.error('Missing Lanren auth credentials.')
  console.error('Option A — paste auth-storage from DevTools → Application → Local Storage:')
  console.error('  LANREN_AUTH_STORAGE={"state":{"token":"...","authorization":"..."},...}')
  console.error('Option B — set both headers separately:')
  console.error('  LANREN_AUTH_TOKEN=...')
  console.error('  LANREN_AUTHORIZATION=...')
  process.exit(1)
}
