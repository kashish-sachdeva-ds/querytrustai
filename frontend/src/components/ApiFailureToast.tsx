import { useEffect, useState } from 'react'

interface ApiFailureDetail {
  message?: string
}

/**
 * A single, non-blocking recovery surface for API 5xx responses and the
 * client-side eight-second timeout. Reloading is deliberate: it refreshes
 * server-derived state without blindly replaying a mutation.
 */
export function ApiFailureToast() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const onFailure = (event: Event) => {
      const detail = (event as CustomEvent<ApiFailureDetail>).detail
      setMessage(detail?.message || 'The service is temporarily unavailable.')
    }
    window.addEventListener('querytrust:api-failure', onFailure)
    return () => window.removeEventListener('querytrust:api-failure', onFailure)
  }, [])

  if (!message) return null

  return (
    <div className="api-failure-toast" role="alert" aria-live="assertive">
      <div>
        <strong>Request needs attention</strong>
        <p>{message}</p>
      </div>
      <div className="api-failure-toast__actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMessage(null)}>
          Dismiss
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
          Reload &amp; retry
        </button>
      </div>
    </div>
  )
}
