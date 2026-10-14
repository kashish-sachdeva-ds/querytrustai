import React from 'react'
import { Sparkles, ShieldCheck, Activity, MessageSquareText, History, FlaskConical } from 'lucide-react'

interface PlaceholderViewProps {
  title: string
  milestone: string
  description: string
  features: string[]
  icon: 'ask-data' | 'data-quality' | 'anomalies' | 'history' | 'evaluations'
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  title,
  milestone,
  description,
  features,
  icon,
}) => {
  const renderIcon = () => {
    switch (icon) {
      case 'ask-data':
        return <MessageSquareText size={36} className="text-indigo" />
      case 'data-quality':
        return <ShieldCheck size={36} className="text-emerald" />
      case 'anomalies':
        return <Activity size={36} className="text-amber" />
      case 'history':
        return <History size={36} className="text-cyan" />
      case 'evaluations':
        return <FlaskConical size={36} className="text-indigo" />
      default:
        return <Sparkles size={36} className="text-indigo" />
    }
  }

  return (
    <div className="placeholder-container">
      <div className="placeholder-card">
        <div className="placeholder-icon-wrapper">{renderIcon()}</div>
        <span className="badge-pill" style={{ margin: '0 auto 1rem auto' }}>
          Scheduled for {milestone}
        </span>
        <h2 className="placeholder-title">{title}</h2>
        <p className="placeholder-desc">{description}</p>

        <div className="placeholder-feature-list">
          <div className="feature-list-title">Planned Capabilities:</div>
          {features.map((feat, idx) => (
            <div key={idx} className="feature-item">
              <span className="feature-bullet" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        <div className="placeholder-footer-note">
          <span>In accordance with ANTIGRAVITY_MASTER_PROMPT milestone progression.</span>
        </div>
      </div>
    </div>
  )
}
