import React from 'react'
import { Check, X } from 'lucide-react'
import type { PasswordStrength } from '../lib/authValidation'

export interface PasswordStrengthMeterProps {
  strength: PasswordStrength
  passwordLength: number
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  strength,
  passwordLength,
}) => {
  if (passwordLength === 0) {
    return null
  }

  const { score, label, color, requirements } = strength

  return (
    <div className="password-strength-container" aria-live="polite">
      <div className="strength-header">
        <span className="strength-caption">Password Strength</span>
        <span
          className="strength-label"
          style={{ color }}
          data-testid="password-strength-label"
        >
          {label}
        </span>
      </div>

      {/* 4-Segment Progress Bar */}
      <div className="strength-meter-track" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={4}>
        {[1, 2, 3, 4].map((step) => {
          const isActive = score >= step
          return (
            <div
              key={step}
              className={`strength-segment ${isActive ? 'is-active' : ''}`}
              style={{
                backgroundColor: isActive ? color : undefined,
              }}
            />
          )
        })}
      </div>

      {/* Requirements dynamic checklist */}
      <div className="strength-requirements-grid">
        <div className={`req-item ${requirements.minLength ? 'is-met' : ''}`}>
          {requirements.minLength ? <Check size={12} className="req-icon-check" /> : <X size={12} className="req-icon-x" />}
          <span>8+ characters</span>
        </div>

        <div className={`req-item ${requirements.hasUpper && requirements.hasLower ? 'is-met' : ''}`}>
          {requirements.hasUpper && requirements.hasLower ? <Check size={12} className="req-icon-check" /> : <X size={12} className="req-icon-x" />}
          <span>Upper & lowercase</span>
        </div>

        <div className={`req-item ${requirements.hasNumber ? 'is-met' : ''}`}>
          {requirements.hasNumber ? <Check size={12} className="req-icon-check" /> : <X size={12} className="req-icon-x" />}
          <span>Number (0-9)</span>
        </div>

        <div className={`req-item ${requirements.hasSpecial ? 'is-met' : ''}`}>
          {requirements.hasSpecial ? <Check size={12} className="req-icon-check" /> : <X size={12} className="req-icon-x" />}
          <span>Symbol (!@#$)</span>
        </div>
      </div>
    </div>
  )
}
