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

export default function GuestsPage() {
  const { session, logout } = useAuth()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (!session) return

    const fetchGuests = async () => {
      try {
        const { data, error } = await supabase.from('guests').select('*').order('name')
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
      .channel('guests-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setGuests(prev => [...prev, payload.new as Guest].sort((a, b) => a.name.localeCompare(b.name)))
        } else if (payload.eventType === 'UPDATE') {
          setGuests(prev => prev.map(g => g.id === payload.new.id ? payload.new as Guest : g))
        } else if (payload.eventType === 'DELETE') {
          setGuests(prev => prev.filter(g => g.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session])

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const optimistic: Guest = {
      id: `temp-${Date.now()}`,
      name: newName.trim(),
      address: null, email: [], phone: [],
      party_size: 1,
      invitation_sent: false, rsvp_received: false,
      attending: null, meal: null, notes: null
    }
    setGuests(prev => [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    try {
      const { data, error } = await supabase.from('guests').insert({ name: optimistic.name }).select().single()
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
      const { error } = await supabase.from('guests').update(updates).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error updating guest:', err)
      setError('Failed to save.')
    }
  }

  const deleteGuest = async (id: string) => {
    setGuests(prev => prev.filter(g => g.id !== id))
    try {
      const { error } = await supabase.from('guests').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error deleting guest:', err)
      setError('Failed to delete.')
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

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Home</Link>
          <h1 className="text-2xl font-serif text-charcoal">Guests</h1>
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

        <form onSubmit={addGuest} className="bg-white rounded-2xl p-4 mb-6 border border-grey-soft/20 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add guest name..."
            className="flex-1 px-3 py-2 border border-grey-soft/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary"
          />
          <button type="submit" disabled={!newName.trim()} className="px-4 py-2 bg-sage-primary text-white rounded-xl text-sm hover:bg-sage-primary/90 disabled:opacity-50 transition-colors">Add</button>
        </form>

        <div className="space-y-3">
          {guests.length === 0 && (
            <div className="text-center text-grey-soft py-8">No guests yet. Add your first one above.</div>
          )}
          {guests.map(g => (
            <div key={g.id} className="bg-white rounded-2xl border border-grey-soft/20 p-4">
              <div className="flex justify-between items-start gap-2 mb-3">
                <input
                  defaultValue={g.name}
                  onBlur={(e) => { if (e.target.value !== g.name && e.target.value.trim()) updateGuest(g.id, { name: e.target.value.trim() }) }}
                  className="flex-1 text-lg font-medium text-charcoal bg-transparent border-b border-transparent hover:border-grey-soft/30 focus:border-sage-primary focus:outline-none px-1"
                />
                <button onClick={() => deleteGuest(g.id)} className="text-grey-soft hover:text-red-500 transition-colors text-sm px-2">×</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <ContactList
                  label="Email"
                  values={g.email || []}
                  onChange={(next) => updateGuest(g.id, { email: next })}
                  placeholder="email@example.com"
                />
                <ContactList
                  label="Phone"
                  values={g.phone || []}
                  onChange={(next) => updateGuest(g.id, { phone: next })}
                  placeholder="555-555-5555"
                />
              </div>

              <textarea
                defaultValue={g.address || ''}
                onBlur={(e) => { if (e.target.value !== (g.address || '')) updateGuest(g.id, { address: e.target.value || null }) }}
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
                    value={g.party_size}
                    onChange={(e) => updateGuest(g.id, { party_size: parseInt(e.target.value) || 1 })}
                    className="w-14 px-2 py-1 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
                  />
                </label>
                <input
                  defaultValue={g.meal || ''}
                  onBlur={(e) => { if (e.target.value !== (g.meal || '')) updateGuest(g.id, { meal: e.target.value || null }) }}
                  placeholder="Meal choice"
                  className="flex-1 min-w-[120px] px-3 py-1 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateGuest(g.id, { invitation_sent: !g.invitation_sent })}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${g.invitation_sent ? 'bg-rose-accent text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}
                >
                  {g.invitation_sent ? '✓ Invitation sent' : 'Invitation sent'}
                </button>
                <button
                  onClick={() => updateGuest(g.id, { rsvp_received: !g.rsvp_received })}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${g.rsvp_received ? 'bg-rose-accent text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}
                >
                  {g.rsvp_received ? '✓ RSVP received' : 'RSVP received'}
                </button>
                <select
                  value={g.attending === null ? '' : g.attending ? 'yes' : 'no'}
                  onChange={(e) => updateGuest(g.id, { attending: e.target.value === '' ? null : e.target.value === 'yes' })}
                  className="px-3 py-1 text-xs rounded-full border border-sage-primary/40 bg-sage-primary/10 text-charcoal focus:outline-none focus:ring-1 focus:ring-sage-primary/40"
                >
                  <option value="">Attending?</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <textarea
                defaultValue={g.notes || ''}
                onBlur={(e) => { if (e.target.value !== (g.notes || '')) updateGuest(g.id, { notes: e.target.value || null }) }}
                placeholder="Notes..."
                rows={1}
                className="mt-3 w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30 placeholder:text-grey-soft/60"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
