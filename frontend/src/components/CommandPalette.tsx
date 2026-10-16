import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { Command, Search } from 'lucide-react'

export interface CommandPaletteAction {
  id: string
  label: string
  description: string
  icon: LucideIcon
  keywords?: string[]
  run: () => void
}

interface CommandPaletteProps {
  actions: CommandPaletteAction[]
  onClose: () => void
}

export function CommandPalette({ actions, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return actions

    return actions.filter((action) =>
      [action.label, action.description, ...(action.keywords || [])]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    )
  }, [actions, query])

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    inputRef.current?.focus()
    document.body.classList.add('command-palette-open')

    return () => {
      document.body.classList.remove('command-palette-open')
      previousFocusRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, Math.max(filteredActions.length - 1, 0)))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
      }
      if (event.key === 'Home') {
        event.preventDefault()
        setActiveIndex(0)
      }
      if (event.key === 'End') {
        event.preventDefault()
        setActiveIndex(Math.max(filteredActions.length - 1, 0))
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        inputRef.current?.focus()
      }
      if (event.key === 'Enter' && filteredActions[activeIndex]) {
        event.preventDefault()
        filteredActions[activeIndex].run()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, filteredActions, onClose])

  const selectAction = (action: CommandPaletteAction) => {
    action.run()
    onClose()
  }

  return createPortal(
    <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Quick actions"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-palette-search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages and actions…"
            role="combobox"
            aria-label="Search quick actions"
            aria-controls="command-palette-list"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-activedescendant={filteredActions[activeIndex] ? `command-${filteredActions[activeIndex].id}` : undefined}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-palette-list" id="command-palette-list" role="listbox" aria-label="Quick actions">
          {filteredActions.length ? filteredActions.map((action, index) => {
            const Icon = action.icon
            return (
              <button
                id={`command-${action.id}`}
                className={`command-palette-item ${index === activeIndex ? 'command-palette-item--active' : ''}`}
                key={action.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectAction(action)}
              >
                <span className="command-palette-icon"><Icon size={17} /></span>
                <span className="command-palette-copy">
                  <span>{action.label}</span>
                  <small>{action.description}</small>
                </span>
                <span className="command-palette-run" aria-hidden="true">↵</span>
              </button>
            )
          }) : (
            <div className="command-palette-empty">
              <Command size={18} aria-hidden="true" />
              <span>No matching actions</span>
            </div>
          )}
        </div>
        <footer className="command-palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Run</span>
          <span><kbd>Esc</kbd> Close</span>
        </footer>
      </section>
    </div>,
    document.body
  )
}
