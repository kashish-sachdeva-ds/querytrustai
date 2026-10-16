/**
 * Small URL-state helpers used instead of a routing dependency. Keeping view
 * state in the address bar makes filtered inventory and audit views shareable.
 */
export function readUrlParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name)
}

export function replaceUrlParams(values: Record<string, string | number | null | undefined>): void {
  const params = new URLSearchParams(window.location.search)

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') {
      params.delete(key)
    } else {
      params.set(key, String(value))
    }
  }

  const query = params.toString()
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
}

export function pushUrlParams(values: Record<string, string | number | null | undefined>): void {
  const params = new URLSearchParams(window.location.search)

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') {
      params.delete(key)
    } else {
      params.set(key, String(value))
    }
  }

  const query = params.toString()
  window.history.pushState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
}
