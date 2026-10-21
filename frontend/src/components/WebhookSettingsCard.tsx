import React, { useState, useEffect } from 'react'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Trash2,
  ShieldCheck,
  Eye,
  EyeOff,
  Radio,
} from 'lucide-react'
import {
  type WebhookTestResponse,
} from '../api/client'
import {
  useWebhookQuery,
  useSaveWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
} from '../api/queries'
import { ExplainButton } from './ExplainButton'
import { HumanDate } from './HumanDate'

interface WebhookSettingsCardProps {
  onNotify?: (notification: { type: 'success' | 'error'; message: string }) => void
}

export const WebhookSettingsCard: React.FC<WebhookSettingsCardProps> = ({ onNotify }) => {
  const { data: webhookConfig, isLoading: isQueryLoading, refetch } = useWebhookQuery()
  const saveMutation = useSaveWebhookMutation()
  const deleteMutation = useDeleteWebhookMutation()
  const testMutation = useTestWebhookMutation()

  // Form states
  const [name, setName] = useState('Default Alert Webhook')
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState<'discord' | 'slack' | 'generic'>('discord')
  const [secretToken, setSecretToken] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [notifyOnAnomaly, setNotifyOnAnomaly] = useState(true)
  const [notifyOnDataQuality, setNotifyOnDataQuality] = useState(true)

  // Local feedback states
  const [testResult, setTestResult] = useState<WebhookTestResponse | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sync with fetched webhook data
  useEffect(() => {
    if (webhookConfig) {
      setName(webhookConfig.name || 'Default Alert Webhook')
      setUrl(webhookConfig.url || '')
      setPlatform(webhookConfig.platform || 'discord')
      setIsActive(webhookConfig.is_active ?? true)
      setNotifyOnAnomaly(webhookConfig.notify_on_anomaly ?? true)
      setNotifyOnDataQuality(webhookConfig.notify_on_data_quality ?? true)
    }
  }, [webhookConfig])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)
    setTestResult(null)

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setStatusMessage({ type: 'error', text: 'Webhook URL cannot be empty.' })
      return
    }

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setStatusMessage({ type: 'error', text: 'Webhook URL must start with http:// or https://' })
      return
    }

    try {
      await saveMutation.mutateAsync({
        name: name.trim() || 'Default Alert Webhook',
        url: trimmedUrl,
        platform,
        secret_token: secretToken.trim() ? secretToken.trim() : null,
        is_active: isActive,
        notify_on_anomaly: notifyOnAnomaly,
        notify_on_data_quality: notifyOnDataQuality,
      })

      setStatusMessage({
        type: 'success',
        text: `Webhook integration for ${platform.toUpperCase()} successfully saved and active.`,
      })
      if (onNotify) {
        onNotify({
          type: 'success',
          message: `Webhook integration for ${platform.toUpperCase()} saved.`,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save webhook configuration.'
      setStatusMessage({ type: 'error', text: msg })
    }
  }

  const handleTestDispatch = async () => {
    setStatusMessage(null)
    setTestResult(null)

    const targetUrl = url.trim()
    if (!targetUrl && !webhookConfig) {
      setStatusMessage({ type: 'error', text: 'Enter a destination webhook URL first before testing.' })
      return
    }

    try {
      const res = await testMutation.mutateAsync({
        url: targetUrl || undefined,
        platform,
      })
      setTestResult(res)
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Test alert dispatched! Received HTTP ${res.status_code || 200} in ${res.latency_ms?.toFixed(0) || 0} ms.`,
        })
      } else {
        setStatusMessage({
          type: 'error',
          text: `Test failed: ${res.message}`,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to dispatch test notification.'
      setStatusMessage({ type: 'error', text: msg })
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove this webhook configuration? Automated alert dispatches will stop.')) {
      return
    }

    setStatusMessage(null)
    setTestResult(null)
    try {
      await deleteMutation.mutateAsync()
      setUrl('')
      setName('Default Alert Webhook')
      setSecretToken('')
      setStatusMessage({ type: 'success', text: 'Webhook configuration removed.' })
      if (onNotify) {
        onNotify({ type: 'success', message: 'Webhook configuration removed.' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete webhook configuration.'
      setStatusMessage({ type: 'error', text: msg })
    }
  }

  return (
    <div
      className="content-card full-width-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        marginBottom: '1.5rem',
        border: '1px solid var(--qt-border)',
        borderRadius: 'var(--qt-radius-card, 10px)',
        background: 'var(--qt-surface)',
      }}
    >
      {/* Header */}
      <div
        className="card-header"
        style={{
          padding: '1.1rem 1.4rem',
          borderBottom: '1px solid var(--qt-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255, 92, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--qt-accent)',
            }}
          >
            <Bell size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, margin: 0, color: 'var(--qt-ink)' }}>
                Alert Webhooks & Dispatcher
              </h3>
              {webhookConfig ? (
                webhookConfig.is_active ? (
                  <span
                    className="badge badge-success"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}
                  >
                    <Radio size={11} /> Connected ({webhookConfig.platform.toUpperCase()})
                  </span>
                ) : (
                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    Paused
                  </span>
                )
              ) : (
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                  Not Configured
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--qt-muted)', margin: '2px 0 0' }}>
              Broadcast automated anomaly detections &amp; data quality degradation to Discord, Slack, or generic HTTP endpoints.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => refetch()}
            disabled={isQueryLoading}
            style={{ fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} className={isQueryLoading ? 'spin-icon' : ''} style={{ marginRight: 4 }} />
            <span>Reload</span>
          </button>
          <ExplainButton
            title="Alert Webhook Architecture"
            explanation="When IsolationForest detects severe sensor anomalies or the data quality profiler identifies broken constraints, QueryTrust AI assembles a rich JSON/embed payload and dispatches it asynchronously with SSRF protections and HMAC-SHA256 signatures."
          />
        </div>
      </div>

      {/* Body Content */}
      <div style={{ padding: '1.4rem' }}>
        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`notification-banner ${
              statusMessage.type === 'success' ? 'notification-success' : 'notification-error'
            }`}
            style={{ marginBottom: '1.25rem' }}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={16} style={{ color: 'var(--qt-success)', flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={16} style={{ color: 'var(--qt-danger)', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: '0.84rem' }}>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Platform Selection Cards */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--qt-ink)',
                marginBottom: '0.5rem',
              }}
            >
              Target Platform &amp; Formatting Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {/* Discord Option */}
              <div
                onClick={() => setPlatform('discord')}
                style={{
                  border: platform === 'discord' ? '2px solid #5865F2' : '1px solid var(--qt-border)',
                  background: platform === 'discord' ? 'rgba(88, 101, 242, 0.08)' : 'var(--qt-canvas, #151821)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: '#5865F2',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  D
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--qt-ink)' }}>Discord</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)' }}>Rich embeds &amp; severity colors</div>
                </div>
              </div>

              {/* Slack Option */}
              <div
                onClick={() => setPlatform('slack')}
                style={{
                  border: platform === 'slack' ? '2px solid #4A154B' : '1px solid var(--qt-border)',
                  background: platform === 'slack' ? 'rgba(74, 21, 75, 0.12)' : 'var(--qt-canvas, #151821)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: '#4A154B',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  S
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--qt-ink)' }}>Slack</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)' }}>Interactive Block Kit blocks</div>
                </div>
              </div>

              {/* Generic HTTPS Webhook */}
              <div
                onClick={() => setPlatform('generic')}
                style={{
                  border: platform === 'generic' ? '2px solid var(--qt-accent)' : '1px solid var(--qt-border)',
                  background: platform === 'generic' ? 'rgba(255, 92, 0, 0.08)' : 'var(--qt-canvas, #151821)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: 'var(--qt-accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  &lt;&gt;
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--qt-ink)' }}>Custom Webhook</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--qt-muted)' }}>JSON payload + HMAC header</div>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook URL & Name */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: '1.25rem' }}>
            <div>
              <label
                htmlFor="webhook-url-input"
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--qt-ink)', marginBottom: 4 }}
              >
                Webhook Destination URL *
              </label>
              <input
                id="webhook-url-input"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  platform === 'discord'
                    ? 'https://discord.com/api/webhooks/...'
                    : platform === 'slack'
                    ? 'https://hooks.slack.com/services/...'
                    : 'https://api.yourdomain.com/webhooks/alerts'
                }
                className="form-control font-mono"
                style={{ width: '100%', fontSize: '0.82rem', padding: '8px 12px' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--qt-muted)', marginTop: 4, display: 'block' }}>
                SSRF-guarded. AWS/GCP cloud metadata IPs (<code>169.254.169.254</code>) are blocked.
              </span>
            </div>

            <div>
              <label
                htmlFor="webhook-name-input"
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--qt-ink)', marginBottom: 4 }}
              >
                Webhook Name / Target Channel
              </label>
              <input
                id="webhook-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. #prod-alerts-war-room"
                className="form-control"
                style={{ width: '100%', fontSize: '0.82rem', padding: '8px 12px' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--qt-muted)', marginTop: 4, display: 'block' }}>
                Friendly label to identify this destination channel.
              </span>
            </div>
          </div>

          {/* Optional HMAC Secret Token */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="webhook-secret-token"
              style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--qt-ink)', marginBottom: 4 }}
            >
              HMAC-SHA256 Signing Secret (Optional)
            </label>
            <div style={{ position: 'relative', maxWidth: 460 }}>
              <input
                id="webhook-secret-token"
                type={showSecret ? 'text' : 'password'}
                value={secretToken}
                onChange={(e) => setSecretToken(e.target.value)}
                placeholder={webhookConfig?.has_secret_token ? '•••••••••••••••• (Secret stored)' : 'Paste secret key for X-QueryTrust-Signature header'}
                className="form-control font-mono"
                style={{ width: '100%', fontSize: '0.82rem', padding: '8px 36px 8px 12px' }}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--qt-muted)',
                  cursor: 'pointer',
                  padding: 4,
                }}
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--qt-muted)', marginTop: 4, display: 'block' }}>
              When set, all webhook calls include an <code>X-QueryTrust-Signature: sha256=...</code> header to verify origin.
            </span>
          </div>

          {/* Alert Trigger Triggers */}
          <div
            style={{
              background: 'var(--qt-canvas, #151821)',
              border: '1px solid var(--qt-border)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: '1.4rem',
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--qt-ink)', marginBottom: 10 }}>
              Trigger Conditions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifyOnAnomaly}
                  onChange={(e) => setNotifyOnAnomaly(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--qt-ink)' }}>
                    IsolationForest Telemetry Outliers
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--qt-muted)' }}>
                    Dispatches whenever automated ML scans identify critical sensor readings (CPU, packet loss, extreme temperature).
                  </p>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifyOnDataQuality}
                  onChange={(e) => setNotifyOnDataQuality(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--qt-ink)' }}>
                    Data Quality Rule Degradation
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--qt-muted)' }}>
                    Dispatches whenever automated data profiling detects critical rule failures (null asset tags, negative uptime, schema drift).
                  </p>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--qt-ink)' }}>
                    Enable Automated Dispatching
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--qt-muted)' }}>
                    Keep active to allow real-time notifications to stream automatically.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={saveMutation.isPending}
                style={{ fontSize: '0.82rem', padding: '7px 16px' }}
              >
                {saveMutation.isPending ? (
                  <>
                    <RefreshCw size={13} className="spin-icon" style={{ marginRight: 6 }} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Webhook Configuration</span>
                )}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleTestDispatch}
                disabled={testMutation.isPending || (!url && !webhookConfig)}
                style={{ fontSize: '0.82rem', padding: '7px 14px' }}
                title="Send a sample test notification now"
              >
                {testMutation.isPending ? (
                  <>
                    <RefreshCw size={13} className="spin-icon" style={{ marginRight: 6 }} />
                    <span>Sending Test...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} style={{ marginRight: 6 }} />
                    <span>Send Test Alert</span>
                  </>
                )}
              </button>

              {testResult && (
                <span
                  className={`badge ${testResult.success ? 'badge-success' : 'badge-danger'}`}
                  style={{ fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}
                >
                  {testResult.success ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  {testResult.success
                    ? `HTTP ${testResult.status_code || 200} (${testResult.latency_ms?.toFixed(0) || 0} ms)`
                    : 'Dispatch Failed'}
                </span>
              )}
            </div>

            {webhookConfig && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--qt-danger)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              >
                <Trash2 size={13} style={{ marginRight: 4 }} />
                <span>Remove Webhook</span>
              </button>
            )}
          </div>
        </form>

        {/* Telemetry & Health Audit Footer */}
        {webhookConfig && (
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--qt-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: '0.74rem',
              color: 'var(--qt-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <strong>Last Dispatched:</strong>{' '}
                {webhookConfig.last_dispatched_at ? (
                  <HumanDate iso={webhookConfig.last_dispatched_at} />
                ) : (
                  'Never dispatched'
                )}
              </div>
              {webhookConfig.last_status_code && (
                <div>
                  <strong>Last HTTP Status:</strong>{' '}
                  <span
                    className={
                      webhookConfig.last_status_code.startsWith('2')
                        ? 'text-success'
                        : 'text-danger'
                    }
                    style={{ fontWeight: 600 }}
                  >
                    HTTP {webhookConfig.last_status_code}
                  </span>
                </div>
              )}
              {webhookConfig.last_error && (
                <div style={{ color: 'var(--qt-danger)' }}>
                  <strong>Last Error:</strong> {webhookConfig.last_error}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} style={{ color: 'var(--qt-success)' }} />
              <span>SSRF Guarded &bull; AES-256 Workspace Isolated</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
