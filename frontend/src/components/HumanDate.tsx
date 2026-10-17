import React from 'react'
import { formatRelativeDate } from '../lib/dateUtils'

interface HumanDateProps {
  iso: string | null | undefined
  className?: string
  fallback?: string
}

export const HumanDate: React.FC<HumanDateProps> = ({ iso, className = '', fallback }) => {
  if (!iso && fallback) {
    return <span className={className}>{fallback}</span>
  }
  const { relative, exact } = formatRelativeDate(iso)
  return (
    <span className={className} title={exact}>
      {relative}
    </span>
  )
}

export default HumanDate
