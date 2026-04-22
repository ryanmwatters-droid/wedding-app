'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Guest } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'

function ContactList({ label, values, onChange, placeholder }: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  const entries = values.length === 0 ? [''] : values
  return (
    <div>
      <div className="text-xs text-grey-soft mb-1">{label}</div>
      <div className="space-y-1">
        {entries.map((v, i) => (
          <div key={i} className="flex gap-1">
            <input
              value={v}
              onChange={(e) => {
                const next = [...entries]
                next[i] = e.target.value
                onChange(next.filter(x => x.trim() || x === ''))
              }}
              onBlur={() => onChange(entries.map(x => x.trim()).filter(Boolean))}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
            {entries.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(entries.filter((_, j) => j !== i).map(x => x.trim()).filter(Boolean))}
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
        onClick={() => onChange([...entries.map(x => x.trim()).filter(Boolean), ''])}
        className="mt-1 text-xs text-sage-primary hover:text-sage-primary/80 transition-colors"
      >
        + Add {label.toLowerCase()}
      </button>
    </div>
  )
}

function StatusPill({ label, active, onClick }: { label: string; active: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e) }}
      className={`w-7 h-7 rounded-full text-xs font-medium transition-colors flex items-center justify-center ${active ? 'bg-rose-accent text-white' : 'bg-grey-soft/15 text-grey-soft hover:bg-grey-soft/25'}`}
      title={label}
      aria-label={label}
    >
      {label[0]}
    </button>
  )
}

function AttendingDot({ attending }: { attending: boolean | null }) {
  const color = attending === true ? 'bg-sage-primary' : attending === false ? 'bg-rose-accent/60' : 'bg-grey-soft/30'
  const label = attending === true ? 'Yes' : attending === false ? 'No' : '—'
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-grey-soft w-6">{label}</span>
    </div>
  )
}

function GuestDetail({ guest, onUpdate, onDelete, onClose }: {
  guest: Guest
  onUpdate: (id: string, updates: Partial<Guest>) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-start gap-2 mb-4">
        <input
          defaultValue={guest.name}
          onBlur={(e) => { if (e.target.value !== guest.name && e.target.value.trim()) onUpdate(guest.id, { name: e.target.value.trim() }) }}
          className="flex-1 text-xl font-serif text-charcoal bg-transparent border-b border-transparent hover:border-grey-soft/30 focus:border-sage-primary focus:outline-none px-1"
        />
        <button onClick={onClose} className="text-grey-soft hover:text-charcoal text-xl px-2" aria-label="Close">×</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <ContactList label="Email" values={guest.email || []} onChange={(next) => onUpdate(guest.id, { email: next })} placeholder="email@example.com" />
        <ContactList label="Phone" values={guest.phone || []} onChange={(next) => onUpdate(guest.id, { phone: next })} placeholder="555-555-5555" />
      </div>

      <textarea
        defaultValue={guest.address || ''}
        onBlur={(e) => { if (e.target.value !== (guest.address || '')) onUpdate(guest.id, { address: e.target.value || null }) }}
        placeholder="Mailing address"
        rows={2}
        className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30 mb-3"
      />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="flex items-center gap-1 text-sm text-charcoal">
          Party size:
          <input
            type="number"
            min={1}
            value={guest.party_size}
            onChange={(e) => onUpdate(guest.id, { party_size: parseInt(e.target.value) || 1 })}
            className="w-14 px-2 py-1 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </label>
        <input
          defaultValue={guest.meal || ''}
          onBlur={(e) => { if (e.target.value !== (guest.meal || '')) onUpdate(guest.id, { meal: e.target.value || null }) }}
          placeholder="Meal choice"
          className="flex-1 min-w-[120px] px-3 py-1 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => onUpdate(guest.id, { invitation_sent: !guest.invitation_sent })} className={`px-3 py-1 text-xs rounded-full transition-colors ${guest.invitation_sent ? 'bg-rose-accent text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}>
          {guest.invitation_sent ? '✓ Invitation sent' : 'Invitation sent'}
        </button>
        <button onClick={() => onUpdate(guest.id, { rsvp_received: !guest.rsvp_received })} className={`px-3 py-1 text-xs rounded-full transition-colors ${guest.rsvp_received ? 'bg-rose-accent text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}>
          {guest.rsvp_received ? '✓ RSVP received' : 'RSVP received'}
        </button>
        <select value={guest.attending === null ? '' : guest.attending ? 'yes' : 'no'} onChange={(e) => onUpdate(guest.id, { attending: e.target.value === '' ? null : e.target.value === 'yes' })} className="px-3 py-1 text-xs rounded-full border border-sage-primary/40 bg-sage-primary/10 text-charcoal focus:outline-none focus:ring-1 focus:ring-sage-primary/40">
          <option value="">Attending?</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>

      <textarea
        defaultValue={guest.notes || ''}
        onBlur={(e) => { if (e.target.value !== (guest.notes || '')) onUpdate(guest.id, { notes: e.target.value || null }) }}
        placeholder="Notes..."
        rows={2}
        className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30 placeholder:text-grey-soft/60 mb-4"
      />

      <button onClick={() => { onDelete(guest.id); onClose() }} className="text-xs text-grey-soft hover:text-red-500 transition-colors">Delete guest</button>
    </div>
  )
}

export function GuestList({ tableName, title, importFromTable }: {
  tableName: string
  title: string
  importFromTable?: { table: string; label: string }
}) {
  const { session, logout } = useAuth()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importPool, setImportPool] = useState<Guest[]>([])
  const [importSelection, setImportSelection] = useState<Set<string>>(new Set())
  const [importSearch, setImportSearch] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!session) return

    const fetchGuests = async () => {
      try {
        const { data, error } = await supabase.from(tableName).select('*').order('name')
        if (error) throw error
        setGuests(data || [])
      } catch (err) {
        console.error('Error fetching guests:', err)
        setError('Failed to load guests.')
      } finally {
        setLoading(false)
      }
    }

    fetchGuests()

    const channel = supabase
      .channel(`${tableName}-realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setGuests(prev => prev.some(g => g.id === payload.new.id) ? prev : [...prev, payload.new as Guest].sort((a, b) => a.name.localeCompare(b.name)))
        } else if (payload.eventType === 'UPDATE') {
          setGuests(prev => prev.map(g => g.id === payload.new.id ? payload.new as Guest : g))
        } else if (payload.eventType === 'DELETE') {
          setGuests(prev => prev.filter(g => g.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session, tableName])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null)
        setImportOpen(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const optimistic: Guest = {
      id: `temp-${Date.now()}`, name: newName.trim(),
      address: null, email: [], phone: [], party_size: 1,
      invitation_sent: false, rsvp_received: false,
      attending: null, meal: null, notes: null
    }
    setGuests(prev => [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    try {
      const { data, error } = await supabase.from(tableName).insert({ name: optimistic.name }).select().single()
      if (error) throw error
      setGuests(prev => prev.map(g => g.id === optimistic.id ? data as Guest : g))
    } catch (err) {
      console.error('Error adding guest:', err)
      setError('Failed to add guest.')
      setGuests(prev => prev.filter(g => g.id !== optimistic.id))
    }
  }

  const updateGuest = async (id: string, updates: Partial<Guest>) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
    try {
      const { error } = await supabase.from(tableName).update(updates).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error updating guest:', err)
      setError('Failed to save.')
    }
  }

  const deleteGuest = async (id: string) => {
    setGuests(prev => prev.filter(g => g.id !== id))
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error deleting guest:', err)
      setError('Failed to delete.')
    }
  }

  const openImport = async () => {
    if (!importFromTable) return
    setImportOpen(true)
    setImportSelection(new Set())
    setImportSearch('')
    try {
      const { data, error } = await supabase.from(importFromTable.table).select('*').order('name')
      if (error) throw error
      setImportPool(data || [])
    } catch (err) {
      console.error('Error fetching import pool:', err)
      setError('Failed to load import list.')
    }
  }

  const doImport = async () => {
    setImporting(true)
    try {
      const toInsert = importPool
        .filter(g => importSelection.has(g.id))
        .map(g => ({
          name: g.name,
          address: g.address,
          email: g.email,
          phone: g.phone,
          party_size: g.party_size
        }))
      if (toInsert.length > 0) {
        const { error } = await supabase.from(tableName).insert(toInsert)
        if (error) throw error
      }
      setImportOpen(false)
    } catch (err) {
      console.error('Import failed:', err)
      setError('Failed to import.')
    } finally {
      setImporting(false)
    }
  }

  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>
  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-primary mx-auto mb-4"></div>
        <p className="text-charcoal">Loading guest list...</p>
      </div>
    </div>
  )

  const totalInvited = guests.reduce((s, g) => s + (g.party_size || 1), 0)
  const sent = guests.filter(g => g.invitation_sent).length
  const received = guests.filter(g => g.rsvp_received).length
  const attending = guests.filter(g => g.attending).reduce((s, g) => s + (g.party_size || 1), 0)
  const declined = guests.filter(g => g.attending === false).length

  const selectedGuest = guests.find(g => g.id === selectedId) || null
  const existingNames = new Set(guests.map(g => g.name.toLowerCase()))
  const filteredImport = importPool.filter(g => g.name.toLowerCase().includes(importSearch.toLowerCase()))

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Home</Link>
          <h1 className="text-2xl font-serif text-charcoal">{title}</h1>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
            <button onClick={() => setError('')} className="float-right ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 mb-6 border border-grey-soft/20">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-xl font-bold text-charcoal">{totalInvited}</div>
              <div className="text-xs text-grey-soft">Invited</div>
            </div>
            <div>
              <div className="text-xl font-bold text-rose-accent">{sent}</div>
              <div className="text-xs text-grey-soft">Sent</div>
            </div>
            <div>
              <div className="text-xl font-bold text-rose-accent">{received}</div>
              <div className="text-xs text-grey-soft">RSVP'd</div>
            </div>
            <div>
              <div className="text-xl font-bold text-sage-primary">{attending}</div>
              <div className="text-xs text-grey-soft">Attending{declined > 0 && ` · ${declined} no`}</div>
            </div>
          </div>
        </div>

        <form onSubmit={addGuest} className="bg-white rounded-2xl p-4 mb-3 border border-grey-soft/20 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add guest name..."
            className="flex-1 px-3 py-2 border border-grey-soft/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary"
          />
          <button type="submit" disabled={!newName.trim()} className="px-4 py-2 bg-sage-primary text-white rounded-xl text-sm hover:bg-sage-primary/90 disabled:opacity-50 transition-colors">Add</button>
        </form>

        {importFromTable && (
          <button onClick={openImport} className="w-full mb-6 px-4 py-2 text-sm text-sage-primary border border-sage-primary/30 hover:bg-sage-primary/5 rounded-xl transition-colors">
            + Import from {importFromTable.label}
          </button>
        )}

        {guests.length === 0 ? (
          <div className="text-center text-grey-soft py-8">No guests yet. Add your first one above.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-grey-soft/20 overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 text-xs text-grey-soft border-b border-grey-soft/15">
              <div>Name</div>
              <div className="text-center w-12">Party</div>
              <div className="text-center w-7" title="Invitation sent">Inv</div>
              <div className="text-center w-7" title="RSVP received">RSVP</div>
              <div className="text-center w-12">Attending</div>
            </div>
            {guests.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                className="w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-3 text-left hover:bg-cream/40 transition-colors border-b border-grey-soft/10 last:border-0"
              >
                <div className="min-w-0">
                  <div className="text-charcoal font-medium truncate">{g.name}</div>
                </div>
                <div className="text-sm text-grey-soft text-center w-12">{g.party_size}</div>
                <StatusPill label="Invitation sent" active={g.invitation_sent} onClick={() => updateGuest(g.id, { invitation_sent: !g.invitation_sent })} />
                <StatusPill label="RSVP received" active={g.rsvp_received} onClick={() => updateGuest(g.id, { rsvp_received: !g.rsvp_received })} />
                <div className="w-12 flex justify-center"><AttendingDot attending={g.attending} /></div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedGuest && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 flex items-end sm:items-center justify-center" onClick={() => setSelectedId(null)}>
          <div className="bg-white w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <GuestDetail guest={selectedGuest} onUpdate={updateGuest} onDelete={deleteGuest} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}

      {importOpen && importFromTable && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 flex items-end sm:items-center justify-center" onClick={() => setImportOpen(false)}>
          <div className="bg-white w-full sm:max-w-xl max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-grey-soft/15 flex justify-between items-center">
              <h2 className="text-lg font-serif text-charcoal">Import from {importFromTable.label}</h2>
              <button onClick={() => setImportOpen(false)} className="text-grey-soft hover:text-charcoal text-xl px-2">×</button>
            </div>
            <div className="p-4 border-b border-grey-soft/15">
              <input
                value={importSearch}
                onChange={(e) => setImportSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 text-sm border border-grey-soft/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredImport.length === 0 ? (
                <div className="text-center text-grey-soft py-8 text-sm">No matches.</div>
              ) : (
                filteredImport.map(g => {
                  const dup = existingNames.has(g.name.toLowerCase())
                  const checked = importSelection.has(g.id)
                  return (
                    <label key={g.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${dup ? 'opacity-50' : 'hover:bg-cream/40'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={dup}
                        onChange={() => setImportSelection(prev => {
                          const next = new Set(prev)
                          if (checked) next.delete(g.id); else next.add(g.id)
                          return next
                        })}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-charcoal font-medium truncate">{g.name}</div>
                        <div className="text-xs text-grey-soft truncate">
                          {(g.email && g.email.length > 0) ? g.email[0] : ''}
                          {g.party_size > 1 && ` · party of ${g.party_size}`}
                          {dup && ' · already added'}
                        </div>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
            <div className="p-4 border-t border-grey-soft/15 flex justify-end gap-2">
              <button onClick={() => setImportOpen(false)} className="px-4 py-2 text-sm text-grey-soft hover:text-charcoal">Cancel</button>
              <button
                onClick={doImport}
                disabled={importSelection.size === 0 || importing}
                className="px-4 py-2 text-sm bg-sage-primary text-white rounded-xl disabled:opacity-50 hover:bg-sage-primary/90"
              >
                {importing ? 'Importing...' : `Import ${importSelection.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
