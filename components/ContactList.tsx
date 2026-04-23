'use client'

import { useEffect, useRef, useState } from 'react'

export function ContactList({ label, values, onChange, placeholder }: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  const [entries, setEntries] = useState<string[]>(values.length === 0 ? [''] : values)
  const focusedRef = useRef(false)

  useEffect(() => {
    if (focusedRef.current) return
    setEntries(values.length === 0 ? [''] : values)
  }, [values])

  const commit = (next: string[]) => {
    const cleaned = next.map(x => x.trim()).filter(Boolean)
    onChange(cleaned)
  }

  return (
    <div>
      <div className="text-xs text-grey-soft mb-1">{label}</div>
      <div className="space-y-1">
        {entries.map((v, i) => (
          <div key={i} className="flex gap-1">
            <input
              value={v}
              onFocus={() => { focusedRef.current = true }}
              onChange={(e) => {
                const next = [...entries]
                next[i] = e.target.value
                setEntries(next)
              }}
              onBlur={() => {
                focusedRef.current = false
                commit(entries)
              }}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
            {entries.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const next = entries.filter((_, j) => j !== i)
                  setEntries(next.length === 0 ? [''] : next)
                  commit(next)
                }}
                className="px-2 text-grey-soft hover:text-red-500 transition-colors"
                aria-label={`Remove ${label.toLowerCase()}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setEntries([...entries, ''])}
        className="mt-1 text-xs text-sage-primary hover:text-sage-primary/80 transition-colors"
      >
        + Add {label.toLowerCase()}
      </button>
    </div>
  )
}
