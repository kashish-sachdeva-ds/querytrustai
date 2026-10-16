import { flushSync } from 'react-dom'

export function withLayoutTransition(update: () => void): void {
  const viewTransitionDocument = document as Document & {
    startViewTransition?: (callback: () => void) => unknown
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (typeof viewTransitionDocument.startViewTransition === 'function' && !reducedMotion) {
    viewTransitionDocument.startViewTransition(() => flushSync(update))
    return
  }

  update()
}
