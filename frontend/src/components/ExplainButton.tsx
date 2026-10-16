import React, { useState, useRef, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface ExplainButtonProps {
  title: string
  explanation: string
}

export const ExplainButton: React.FC<ExplainButtonProps> = ({ title, explanation }) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  return (
    <div className="qt-explain" ref={containerRef}>
      <button
        type="button"
        className="qt-explain-trigger"
        onClick={() => setOpen(!open)}
        aria-label={`Explain: ${title}`}
        aria-expanded={open}
      >
        <HelpCircle size={13} aria-hidden="true" />
        <span>Explain this</span>
      </button>
      {open && (
        <div className="qt-explain-popover" role="tooltip" aria-label={title}>
          <div className="qt-explain-header">
            <strong>{title}</strong>
            <button
              type="button"
              className="qt-explain-close"
              onClick={() => setOpen(false)}
              aria-label="Close explanation"
            >
              <X size={12} />
            </button>
          </div>
          <p className="qt-explain-text">{explanation}</p>
        </div>
      )}
    </div>
  )
}
