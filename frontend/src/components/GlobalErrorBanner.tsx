import React from 'react'
import { AlertCircle, AlertTriangle, ShieldAlert, WifiOff, X, RefreshCw } from 'lucide-react'

export type ErrorBannerType =
  | 'invalid_credentials'
  | 'account_locked'
  | 'server_error'
  | 'network_offline'
  | 'custom'

export interface GlobalErrorBannerProps {
  type?: ErrorBannerType
  message?: string
  onDismiss?: () => void
  onRetry?: () => void
  actionLabel?: string
  onAction?: () => void
}

const ERROR_CONFIGS: Record<
  Exclude<ErrorBannerType, 'custom'>,
  { title: string; defaultMessage: string; icon: React.ReactNode; severity: 'error' | 'warning' | 'critical' }
> = {
  invalid_credentials: {
    title: 'Invalid Credentials',
    defaultMessage: 'The email or password you entered is incorrect. Please verify your credentials and try again.',
    icon: <AlertCircle size={18} className="banner-icon-danger" />,
    severity: 'error',
  },
  account_locked: {
    title: 'Account Temporarily Locked',
    defaultMessage: 'Too many consecutive failed login attempts. To protect equipment access, this account is temporarily locked for 15 minutes. Contact your Security Admin.',
    icon: <ShieldAlert size={18} className="banner-icon-critical" />,
    severity: 'critical',
  },
  server_error: {
    title: 'Authentication Service Unavailable',
    defaultMessage: 'The backend service is currently reconnecting or responding slowly. Please wait a moment and try again.',
    icon: <AlertTriangle size={18} className="banner-icon-warning" />,
    severity: 'warning',
  },
  network_offline: {
    title: 'Network Connection Lost',
    defaultMessage: 'Unable to reach the QueryTrust gateway. Please verify your internet connection or VPN status.',
    icon: <WifiOff size={18} className="banner-icon-warning" />,
    severity: 'warning',
  },
}

export const GlobalErrorBanner: React.FC<GlobalErrorBannerProps> = ({
  type = 'custom',
  message,
  onDismiss,
  onRetry,
  actionLabel,
  onAction,
}) => {
  const config = type !== 'custom' ? ERROR_CONFIGS[type] : null
  const displayTitle = config ? config.title : 'Authentication Notice'
  const displayMessage = message || (config ? config.defaultMessage : 'An unexpected error occurred.')
  const severityClass = config ? `banner-severity-${config.severity}` : 'banner-severity-error'

  return (
    <div
      className={`global-error-banner ${severityClass}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="banner-icon-wrap">
        {config ? config.icon : <AlertCircle size={18} className="banner-icon-danger" />}
      </div>

      <div className="banner-content">
        <h4 className="banner-title">{displayTitle}</h4>
        <p className="banner-message">{displayMessage}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: onAction || onRetry ? '0.5rem' : 0, flexWrap: 'wrap' }}>
          {onAction && actionLabel && (
            <button
              type="button"
              className="banner-action-btn"
              onClick={onAction}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: 'var(--qt-accent, #ff5a14)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              <span>{actionLabel}</span>
            </button>
          )}

          {onRetry && (
            <button
              type="button"
              className="banner-retry-btn"
              onClick={onRetry}
              aria-label="Retry authentication"
            >
              <RefreshCw size={12} className="spin-on-hover" />
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          className="banner-dismiss-btn"
          onClick={onDismiss}
          aria-label="Dismiss error notification"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
