/**
 * Enterprise Authentication Validation & Security Sanitization Utilities
 * Adheres to OWASP ASVS and NIST 800-63B guidelines.
 */

export interface PasswordRequirements {
  minLength: boolean
  hasUpper: boolean
  hasLower: boolean
  hasNumber: boolean
  hasSpecial: boolean
}

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

export interface PasswordStrength {
  score: number // 0 to 4
  level: PasswordStrengthLevel
  label: string
  color: string
  requirements: PasswordRequirements
}

export interface LoginFormValues {
  email: string
  password: string
  rememberMe: boolean
}

export interface ValidationErrors {
  email?: string
  password?: string
}

/**
 * Sanitizes input strings by trimming and stripping null bytes & dangerous control characters.
 * Prevents basic injection and null-byte bypass vectors.
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  return input
    .replace(/\0/g, '') // strip null bytes
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // strip ASCII control chars
    .trim()
}

/**
 * Validates work email address using RFC 5322 compatible regex.
 */
export function validateEmail(email: string): string | null {
  const sanitized = sanitizeInput(email)
  if (!sanitized) {
    return 'Work email is required.'
  }
  // Standard RFC 5322 compliant regex for enterprise email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  if (!emailRegex.test(sanitized)) {
    return 'Please enter a valid work email address (e.g. name@company.com).'
  }
  return null
}

/**
 * Computes dynamic password strength and detailed requirement checklist.
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements: PasswordRequirements = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  }

  let score = 0
  if (password.length >= 8) score += 1
  if (requirements.hasUpper && requirements.hasLower) score += 1
  if (requirements.hasNumber) score += 1
  if (requirements.hasSpecial || password.length >= 12) score += 1

  if (password.length === 0) {
    return {
      score: 0,
      level: 'weak',
      label: 'Too Short',
      color: 'var(--qt-muted, #71717a)',
      requirements,
    }
  }

  if (score <= 1) {
    return {
      score: 1,
      level: 'weak',
      label: 'Weak',
      color: '#ef4444', // Red
      requirements,
    }
  }

  if (score === 2) {
    return {
      score: 2,
      level: 'fair',
      label: 'Fair',
      color: '#f59e0b', // Amber
      requirements,
    }
  }

  if (score === 3) {
    return {
      score: 3,
      level: 'good',
      label: 'Good',
      color: '#3b82f6', // Blue
      requirements,
    }
  }

  return {
    score: 4,
    level: 'strong',
    label: 'Strong',
    color: '#10b981', // Emerald green
    requirements,
  }
}

/**
 * Validates the entire login form state.
 */
export function validateLoginForm(values: LoginFormValues): ValidationErrors {
  const errors: ValidationErrors = {}

  const emailErr = validateEmail(values.email)
  if (emailErr) errors.email = emailErr

  if (!values.password) {
    errors.password = 'Password is required.'
  } else if (values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.'
  }

  return errors
}
