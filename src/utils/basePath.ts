const rawBaseUrl = import.meta.env.BASE_URL || '/'

export const appBasePath = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`
export const routerBaseName = appBasePath === '/' ? '' : appBasePath.replace(/\/$/, '')

export function withBase(path: string) {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${appBasePath}${normalizedPath}`
}
