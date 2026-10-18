/**
 * Formats an ISO date string into a relative human-readable string and exact local timestamp.
 * Example: { relative: "3 days ago", exact: "Oct 14, 2026, 3:30 PM" }
 */
export function formatRelativeDate(isoString: string | null | undefined): { relative: string; exact: string } {
  if (!isoString) {
    return { relative: 'No date on record', exact: 'Not available' }
  }

  const date = new Date(isoString)
  if (isNaN(date.getTime())) {
    return { relative: 'Invalid date', exact: String(isoString) }
  }

  const exact = date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const now = Date.now()
  const diffMs = date.getTime() - now
  const isFuture = diffMs > 0
  const absDiffSec = Math.floor(Math.abs(diffMs) / 1000)
  const absDiffMin = Math.floor(absDiffSec / 60)
  const absDiffHours = Math.floor(absDiffMin / 60)
  const absDiffDays = Math.floor(absDiffHours / 24)

  if (isFuture) {
    if (absDiffDays === 0) {
      if (absDiffHours === 0) {
        return { relative: `Ends in ${absDiffMin}m`, exact }
      }
      return { relative: `Ends in ${absDiffHours}h`, exact }
    }
    if (absDiffDays === 1) {
      return { relative: 'Ends tomorrow', exact }
    }
    if (absDiffDays < 30) {
      return { relative: `Ends in ${absDiffDays} days`, exact }
    }
    const months = Math.floor(absDiffDays / 30)
    if (months < 12) {
      return { relative: `Ends in ${months} mo`, exact }
    }
    const years = (absDiffDays / 365).toFixed(1).replace('.0', '')
    return { relative: `Ends in ${years} yrs`, exact }
  } else {
    if (absDiffSec < 60) {
      return { relative: 'Just now', exact }
    }
    if (absDiffMin < 60) {
      return { relative: `${absDiffMin}m ago`, exact }
    }
    if (absDiffHours < 24) {
      return { relative: `${absDiffHours}h ago`, exact }
    }
    if (absDiffDays === 1) {
      return { relative: 'Yesterday', exact }
    }
    if (absDiffDays < 30) {
      return { relative: `${absDiffDays} days ago`, exact }
    }
    const months = Math.floor(absDiffDays / 30)
    if (months < 12) {
      return { relative: `${months} mo ago`, exact }
    }
    const years = (absDiffDays / 365).toFixed(1).replace('.0', '')
    return { relative: `${years} yrs ago`, exact }
  }
}
