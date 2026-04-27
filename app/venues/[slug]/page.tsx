'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EventVenue, Vendor, VendorCategory, VENDOR_STATUSES, VendorStatus } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'
import { ContactList } from '@/components/ContactList'

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

function prettyUrl(u: string): string {
  try {
    const url = new URL(u.startsWith('http') ? u : `https://${u}`)
    return url.hostname.replace(/^www\./, '') + (url.pathname !== '/' ? url.pathname : '')
  } catch {
    return u
  }
}
function fullUrl(u: string): string { return u.startsWith('http') ? u : `https://${u}` }
function igUrl(handle: string): string { return `https://instagram.com/${handle.replace(/^@/, '').trim()}` }
function shortDate(d: string): string { return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' }) }

const statusColor = (s: VendorStatus): string => {
  switch (s) {
    case 'Booked': return 'bg-sage-primary text-white'
    case 'Contacted': return 'bg-dusty-blue/20 text-dusty-blue border border-dusty-blue/40'
    case 'Quoted': return 'bg-rose-accent/20 text-rose-accent border border-rose-accent/40'
    case 'Meeting Scheduled': return 'bg-rose-accent text-white'
    case 'Declined':
    case 'Not a Fit': return 'bg-grey-soft/20 text-grey-soft line-through'
    default: return 'bg-grey-soft/15 text-charcoal'
  }
}

function StarRating({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={`text-lg ${(value || 0) >= n ? 'text-rose-accent' : 'text-grey-soft/30'} hover:text-rose-accent transition-colors`}
        >
          ★
        </button>
      ))}
      {value && <button type="button" onClick={() => onChange(null)} className="text-xs text-grey-soft hover:text-charcoal ml-1">clear</button>}
    </div>
  )
}

function VenueDetail({ venue, onUpdate, onDelete, onClose }: {
  venue: EventVenue
  onUpdate: (id: string, updates: Partial<EventVenue>) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const dateValue = venue.event_date ? new Date(venue.event_date).toISOString().slice(0, 16) : ''

  return (
    <div className="p-4">
      <div className="flex justify-between items-start gap-2 mb-4">
        <input
          defaultValue={venue.venue_name || ''}
          onBlur={(e) => { if (e.target.value !== (venue.venue_name || '')) onUpdate(venue.id, { venue_name: e.target.value || null }) }}
          placeholder="Venue name"
          className="flex-1 text-xl font-serif text-charcoal bg-transparent border-b border-transparent hover:border-grey-soft/30 focus:border-sage-primary focus:outline-none px-1"
        />
        <button onClick={onClose} className="text-grey-soft hover:text-charcoal text-xl px-2">×</button>
      </div>

      <div className="mb-4">
        <select value={venue.status} onChange={(e) => onUpdate(venue.id, { status: e.target.value as VendorStatus })} className={`px-3 py-1 text-sm rounded-full focus:outline-none ${statusColor(venue.status)}`}>
          {VENDOR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <div className="text-xs text-grey-soft mb-1">Contact person</div>
        <input defaultValue={venue.contact_name || ''} onBlur={(e) => { if (e.target.value !== (venue.contact_name || '')) onUpdate(venue.id, { contact_name: e.target.value || null }) }} placeholder="Who you spoke with" className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <ContactList label="Email" values={venue.email || []} onChange={(next) => onUpdate(venue.id, { email: next })} placeholder="email@venue.com" />
        <ContactList label="Phone" values={venue.phone || []} onChange={(next) => onUpdate(venue.id, { phone: next })} placeholder="555-555-5555" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">Website</div>
          <input defaultValue={venue.venue_url || ''} onBlur={(e) => { if (e.target.value !== (venue.venue_url || '')) onUpdate(venue.id, { venue_url: e.target.value || null }) }} placeholder="https://..." className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Instagram</div>
          <input defaultValue={venue.instagram || ''} onBlur={(e) => { if (e.target.value !== (venue.instagram || '')) onUpdate(venue.id, { instagram: e.target.value || null }) }} placeholder="@handle" className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-grey-soft mb-1">Address</div>
        <textarea defaultValue={venue.venue_address || ''} onBlur={(e) => { if (e.target.value !== (venue.venue_address || '')) onUpdate(venue.id, { venue_address: e.target.value || null }) }} placeholder="Street, city, state" rows={2} className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
      </div>

      <div className="mb-3">
        <div className="text-xs text-grey-soft mb-1">Event date & time</div>
        <input type="datetime-local" defaultValue={dateValue} onBlur={(e) => {
          const newVal = e.target.value ? new Date(e.target.value).toISOString() : null
          if (newVal !== venue.event_date) onUpdate(venue.id, { event_date: newVal })
        }} className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">Estimated $</div>
          <input type="number" min={0} step={100} defaultValue={venue.estimated_cost || ''} onBlur={(e) => { const v = e.target.value ? parseFloat(e.target.value) : null; if (v !== venue.estimated_cost) onUpdate(venue.id, { estimated_cost: v }) }} placeholder="0" className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Quoted $</div>
          <input type="number" min={0} step={100} defaultValue={venue.quoted_cost || ''} onBlur={(e) => { const v = e.target.value ? parseFloat(e.target.value) : null; if (v !== venue.quoted_cost) onUpdate(venue.id, { quoted_cost: v }) }} placeholder="0" className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Deposit $</div>
          <input type="number" min={0} step={100} defaultValue={venue.deposit_paid || ''} onBlur={(e) => { const v = e.target.value ? parseFloat(e.target.value) : null; if (v !== venue.deposit_paid) onUpdate(venue.id, { deposit_paid: v }) }} placeholder="0" className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">First contact</div>
          <input type="date" defaultValue={venue.first_contact_date || ''} onBlur={(e) => { if (e.target.value !== (venue.first_contact_date || '')) onUpdate(venue.id, { first_contact_date: e.target.value || null }) }} className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Last contact</div>
          <input type="date" defaultValue={venue.last_contact_date || ''} onBlur={(e) => { if (e.target.value !== (venue.last_contact_date || '')) onUpdate(venue.id, { last_contact_date: e.target.value || null }) }} className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">Next action date</div>
          <input type="date" defaultValue={venue.next_action_date || ''} onBlur={(e) => { if (e.target.value !== (venue.next_action_date || '')) onUpdate(venue.id, { next_action_date: e.target.value || null }) }} className="px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Next action</div>
          <input defaultValue={venue.next_action || ''} onBlur={(e) => { if (e.target.value !== (venue.next_action || '')) onUpdate(venue.id, { next_action: e.target.value || null }) }} placeholder="e.g. Send follow-up email" className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">Recommended by</div>
          <input defaultValue={venue.recommended_by || ''} onBlur={(e) => { if (e.target.value !== (venue.recommended_by || '')) onUpdate(venue.id, { recommended_by: e.target.value || null }) }} placeholder="Friend, planner, etc." className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Rating</div>
          <StarRating value={venue.rating} onChange={(n) => onUpdate(venue.id, { rating: n })} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">Pros</div>
          <textarea defaultValue={venue.pros || ''} onBlur={(e) => { if (e.target.value !== (venue.pros || '')) onUpdate(venue.id, { pros: e.target.value || null }) }} placeholder="What we love..." rows={2} className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Cons</div>
          <textarea defaultValue={venue.cons || ''} onBlur={(e) => { if (e.target.value !== (venue.cons || '')) onUpdate(venue.id, { cons: e.target.value || null }) }} placeholder="Concerns..." rows={2} className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-grey-soft mb-1">Notes</div>
        <textarea defaultValue={venue.notes || ''} onBlur={(e) => { if (e.target.value !== (venue.notes || '')) onUpdate(venue.id, { notes: e.target.value || null }) }} placeholder="Capacity, package details, anything else..." rows={4} className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30 placeholder:text-grey-soft/60" />
      </div>

      <button onClick={() => { onDelete(venue.id); onClose() }} className="text-xs text-grey-soft hover:text-red-500 transition-colors">Delete venue</button>
    </div>
  )
}

export default function VenueListPage() {
  const params = useParams<{ slug: string }>()
  const { session, logout } = useAuth()
  const [venues, setVenues] = useState<EventVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [vendorPool, setVendorPool] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [importSearch, setImportSearch] = useState('')
  const [importSelection, setImportSelection] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  const label = params.slug === 'wedding' ? 'Wedding' : params.slug === 'engagement' ? 'Engagement Party' : params.slug

  useEffect(() => {
    if (!session) return

    const fetchVenues = async () => {
      try {
        const { data, error } = await supabase.from('event_venues').select('*').eq('slug', params.slug).order('created_at')
        if (error) throw error
        setVenues(data || [])
      } catch (err) {
        console.error('Error fetching venues:', err)
        setError('Failed to load venues.')
      } finally {
        setLoading(false)
      }
    }

    fetchVenues()

    const channel = supabase
      .channel(`venues-${params.slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_venues', filter: `slug=eq.${params.slug}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setVenues(prev => prev.some(v => v.id === payload.new.id) ? prev : [...prev, payload.new as EventVenue])
        } else if (payload.eventType === 'UPDATE') {
          setVenues(prev => prev.map(v => v.id === payload.new.id ? payload.new as EventVenue : v))
        } else if (payload.eventType === 'DELETE') {
          setVenues(prev => prev.filter(v => v.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session, params.slug])

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

  const updateVenue = async (id: string, updates: Partial<EventVenue>) => {
    setVenues(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    try {
      const { error } = await supabase.from('event_venues').update(updates).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Update failed:', err)
      setError('Failed to save.')
    }
  }

  const deleteVenue = async (id: string) => {
    setVenues(prev => prev.filter(v => v.id !== id))
    try {
      const { error } = await supabase.from('event_venues').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Delete failed:', err)
      setError('Failed to delete.')
    }
  }

  const addManual = async () => {
    try {
      const { error } = await supabase.from('event_venues').insert({ slug: params.slug, label, status: 'Lead' })
      if (error) throw error
    } catch (err) {
      console.error('Add failed:', err)
      setError('Failed to add venue.')
    }
  }

  const openImport = async () => {
    setImportOpen(true)
    setImportSearch('')
    setImportSelection(new Set())
    try {
      const [vendorsRes, catsRes] = await Promise.all([
        supabase.from('vendors').select('*').order('business_name'),
        supabase.from('vendor_categories').select('*')
      ])
      if (vendorsRes.error) throw vendorsRes.error
      if (catsRes.error) throw catsRes.error
      setVendorPool(vendorsRes.data || [])
      setCategories(catsRes.data || [])
    } catch (err) {
      console.error('Import load failed:', err)
      setError('Failed to load vendors.')
    }
  }

  const doImport = async () => {
    if (importSelection.size === 0) return
    setImporting(true)
    try {
      const toInsert = vendorPool
        .filter(v => importSelection.has(v.id))
        .map(v => ({
          slug: params.slug,
          label,
          venue_name: v.business_name,
          venue_url: v.website,
          contact_name: v.contact_name,
          email: v.email,
          phone: v.phone,
          instagram: v.instagram,
          status: v.status,
          estimated_cost: v.estimated_cost,
          quoted_cost: v.quoted_cost,
          deposit_paid: v.deposit_paid,
          first_contact_date: v.first_contact_date,
          last_contact_date: v.last_contact_date,
          next_action_date: v.next_action_date,
          next_action: v.next_action,
          recommended_by: v.recommended_by,
          rating: v.rating,
          pros: v.pros,
          cons: v.cons,
          notes: v.notes,
        }))
      const { error } = await supabase.from('event_venues').insert(toInsert)
      if (error) throw error
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
        <p className="text-charcoal">Loading...</p>
      </div>
    </div>
  )

  const selected = venues.find(v => v.id === selectedId) || null
  const catById = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const existingNames = new Set(venues.map(v => (v.venue_name || '').toLowerCase()))
  const filteredImport = vendorPool.filter(v => v.business_name.toLowerCase().includes(importSearch.toLowerCase()))
  const bookedCount = venues.filter(v => v.status === 'Booked').length

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Home</Link>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
            <button onClick={() => setError('')} className="float-right ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-grey-soft mb-1">{label}</div>
          <h1 className="text-3xl font-serif text-charcoal mb-1">Venue</h1>
          <p className="text-xs text-grey-soft">{venues.length} {venues.length === 1 ? 'candidate' : 'candidates'}{bookedCount > 0 && ` · ${bookedCount} booked`}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6">
          <button onClick={openImport} className="px-4 py-2 text-sm text-sage-primary border border-sage-primary/30 hover:bg-sage-primary/5 rounded-xl transition-colors">+ Import from Vendors</button>
          <button onClick={addManual} className="px-4 py-2 text-sm text-grey-soft border border-grey-soft/30 hover:bg-grey-soft/5 rounded-xl transition-colors">+ Add manually</button>
        </div>

        {venues.length === 0 ? (
          <div className="text-center text-grey-soft py-8 italic">No venues yet. Import from your vendors or add one manually.</div>
        ) : (
          <div className="space-y-2">
            {venues.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(v.id) }}
                className="bg-white rounded-2xl border border-grey-soft/20 p-4 cursor-pointer hover:border-sage-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-charcoal font-medium text-base">{v.venue_name || '(Unnamed venue)'}</div>
                    {v.contact_name && <div className="text-xs text-grey-soft">{v.contact_name}</div>}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${statusColor(v.status)}`}>{v.status}</span>
                </div>

                {(v.venue_url || v.instagram) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-2">
                    {v.venue_url && (
                      <a href={fullUrl(v.venue_url)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sage-primary hover:underline truncate max-w-[260px]">↗ {prettyUrl(v.venue_url)}</a>
                    )}
                    {v.instagram && (
                      <a href={igUrl(v.instagram)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-rose-accent hover:underline">@{v.instagram.replace(/^@/, '')}</a>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-grey-soft">
                  {v.event_date && <span className="text-charcoal">📅 {new Date(v.event_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  {v.last_contact_date && <span>Last: {shortDate(v.last_contact_date)}</span>}
                  {v.next_action_date && (
                    <span>Next: {shortDate(v.next_action_date)}{v.next_action ? ` · ${v.next_action}` : ''}</span>
                  )}
                  {v.quoted_cost != null && <span className="text-charcoal">Quoted: {fmt(Number(v.quoted_cost))}</span>}
                  {v.estimated_cost != null && v.quoted_cost == null && <span>Est: {fmt(Number(v.estimated_cost))}</span>}
                  {v.rating != null && (
                    <span className="text-rose-accent">{'★'.repeat(v.rating)}<span className="text-grey-soft/30">{'★'.repeat(5 - v.rating)}</span></span>
                  )}
                </div>

                {v.notes && <div className="text-xs text-grey-soft italic mt-2 line-clamp-2">{v.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 flex items-end sm:items-center justify-center" onClick={() => setSelectedId(null)}>
          <div className="bg-white w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <VenueDetail venue={selected} onUpdate={updateVenue} onDelete={deleteVenue} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 flex items-end sm:items-center justify-center" onClick={() => setImportOpen(false)}>
          <div className="bg-white w-full sm:max-w-xl max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-grey-soft/15 flex justify-between items-center">
              <h2 className="text-lg font-serif text-charcoal">Import from Vendors</h2>
              <button onClick={() => setImportOpen(false)} className="text-grey-soft hover:text-charcoal text-xl px-2">×</button>
            </div>
            <div className="p-4 border-b border-grey-soft/15">
              <input value={importSearch} onChange={(e) => setImportSearch(e.target.value)} placeholder="Search vendors..." className="w-full px-3 py-2 text-sm border border-grey-soft/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30" />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredImport.length === 0 ? (
                <div className="text-center text-grey-soft py-8 text-sm italic">{vendorPool.length === 0 ? 'No vendors yet.' : 'No matches.'}</div>
              ) : (
                filteredImport.map(v => {
                  const dup = existingNames.has(v.business_name.toLowerCase())
                  const checked = importSelection.has(v.id)
                  return (
                    <label key={v.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${dup ? 'opacity-50' : 'hover:bg-cream/40'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={dup}
                        onChange={() => setImportSelection(prev => {
                          const next = new Set(prev)
                          if (checked) next.delete(v.id); else next.add(v.id)
                          return next
                        })}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-charcoal font-medium truncate">{v.business_name}</div>
                        <div className="text-xs text-grey-soft truncate">
                          {catById[v.category_id] && `${catById[v.category_id]} · `}{v.status}
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
              <button onClick={doImport} disabled={importSelection.size === 0 || importing} className="px-4 py-2 text-sm bg-sage-primary text-white rounded-xl disabled:opacity-50 hover:bg-sage-primary/90">
                {importing ? 'Importing...' : `Import ${importSelection.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
