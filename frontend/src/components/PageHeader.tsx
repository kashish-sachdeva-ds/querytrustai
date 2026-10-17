import React, { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description: string
  helpText?: string
  eyebrow?: string
  actions?: React.ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  helpText,
  eyebrow,
  actions,
}) => {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="standard-page-header">
      <div className="standard-page-header-main">
        {eyebrow && <span className="standard-page-eyebrow">{eyebrow}</span>}
        <div className="standard-page-title-row">
          <h1 className="standard-page-title">{title}</h1>
          {helpText && (
            <button
              type="button"
              className={`page-help-button ${showHelp ? 'active' : ''}`}
              onClick={() => setShowHelp(!showHelp)}
              title="What is this page for and what to click next?"
              aria-label="Toggle page help explanation"
              aria-expanded={showHelp}
            >
              <HelpCircle size={17} />
            </button>
          )}
        </div>
        <p className="standard-page-desc">{description}</p>
      </div>

      {actions && <div className="standard-page-actions">{actions}</div>}

      {showHelp && helpText && (
        <div className="page-help-callout" role="region" aria-label="Page guidance">
          <div className="page-help-callout-content">
            <div className="page-help-callout-title">
              <HelpCircle size={15} />
              <span>How to use this page</span>
            </div>
            <p className="page-help-callout-body">{helpText}</p>
          </div>
          <button
            type="button"
            className="page-help-callout-close"
            onClick={() => setShowHelp(false)}
            aria-label="Close help"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
