'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EventVenue, Vendor, VendorCategory, VENDOR_STATUSES, VendorStatus } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'
import { ContactList } from '@/components/ContactList'

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

export default function VenueDetailPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const { session, logout } = useAuth()
  const [venue, setVenue] = useState<EventVenue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [vendorPool, setVendorPool] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [importSearch, setImportSearch] = useState('')

  useEffect(() => {
    if (!session) return

    const fetchVenue = async () => {
      try {
        const { data, error } = await supabase.from('event_venues').select('*').eq('slug', params.slug).single()
        if (error) throw error
        setVenue(data)
      } catch (err) {
        console.error('Error fetching venue:', err)
        setError('Failed to load venue.')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    fetchVenue()

    const channel = supabase
      .channel(`venue-${params.slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_venues', filter: `slug=eq.${params.slug}` }, (payload) => {
        if (payload.eventType === 'UPDATE') setVenue(payload.new as EventVenue)
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session, params.slug, router])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setImportOpen(false) }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const updateVenue = async (updates: Partial<EventVenue>) => {
    if (!venue) return
    setVenue({ ...venue, ...updates })
    try {
      const { error } = await supabase.from('event_venues').update(updates).eq('id', venue.id)
      if (error) throw error
    } catch (err) {
      console.error('Update failed:', err)
      setError('Failed to save.')
    }
  }

  const openImport = async () => {
    setImportOpen(true)
    setImportSearch('')
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

  const importVendor = async (v: Vendor) => {
    if (!venue) return
    if (venue.venue_name && !confirm(`Replace current venue info with "${v.business_name}"?`)) return

    const updates: Partial<EventVenue> = {
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
    }
    await updateVenue(updates)
    setImportOpen(false)
  }

  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>
  if (loading || !venue) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-primary mx-auto mb-4"></div>
        <p className="text-charcoal">Loading...</p>
      </div>
    </div>
  )

  const dateValue = venue.event_date ? new Date(venue.event_date).toISOString().slice(0, 16) : ''
  const catById = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const filteredImport = vendorPool.filter(v => v.business_name.toLowerCase().includes(importSearch.toLowerCase()))

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

        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider text-grey-soft mb-1">{venue.label}</div>
          <h1 className="text-3xl font-serif text-charcoal">Venue</h1>
        </div>

        <button
          onClick={openImport}
          className="w-full mb-4 px-4 py-2 text-sm text-sage-primary border border-sage-primary/30 hover:bg-sage-primary/5 rounded-xl transition-colors"
        >
          + Import from Vendors
        </button>

        <div className="bg-white rounded-2xl p-5 border border-grey-soft/20 space-y-4">
          <div className="flex justify-between items-start gap-2">
            <input
              defaultValue={venue.venue_name || ''}
              key={`name-${venue.venue_name || ''}`}
              onBlur={(e) => { if (e.target.value !== (venue.venue_name || '')) updateVenue({ venue_name: e.target.value || null }) }}
              placeholder="Venue name"
              className="flex-1 text-xl font-serif text-charcoal bg-transparent border-b border-grey-soft/30 focus:border-sage-primary focus:outline-none px-1"
            />
          </div>

          <div>
            <select
              value={venue.status}
              onChange={(e) => updateVenue({ status: e.target.value as VendorStatus })}
              className={`px-3 py-1 text-sm rounded-full focus:outline-none ${statusColor(venue.status)}`}
            >
              {VENDOR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <div className="text-xs text-grey-soft mb-1">Contact person</div>
            <input
              defaultValue={venue.contact_name || ''}
              key={`contact-${venue.contact_name || ''}`}
              onBlur={(e) => { if (e.target.value !== (venue.contact_name || '')) updateVenue({ contact_name: e.target.value || null }) }}
              placeholder="Who you spoke with"
              className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ContactList label="Email" values={venue.email || []} onChange={(next) => updateVenue({ email: next })} placeholder="email@venue.com" />
            <ContactList label="Phone" values={venue.phone || []} onChange={(next) => updateVenue({ phone: next })} placeholder="555-555-5555" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-grey-soft mb-1">Website</div>
              <input
                defaultValue={venue.venue_url || ''}
                key={`url-${venue.venue_url || ''}`}
                onBlur={(e) => { if (e.target.value !== (venue.venue_url || '')) updateVenue({ venue_url: e.target.value || null }) }}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
            <div>
              <div className="text-xs text-grey-soft mb-1">Instagram</div>
              <input
                defaultValue={venue.instagram || ''}
                key={`ig-${venue.instagram || ''}`}
                onBlur={(e) => { if (e.target.value !== (venue.instagram || '')) updateVenue({ instagram: e.target.value || null }) }}
                placeholder="@handle"
                className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-grey-soft mb-1">Address</div>
            <textarea
              defaultValue={venue.venue_address || ''}
              key={`addr-${venue.venue_address || ''}`}
              onBlur={(e) => { if (e.target.value !== (venue.venue_address || '')) updateVenue({ venue_address: e.target.value || null }) }}
              placeholder="Street, city, state"
              rows={2}
              className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
          </div>

          <div>
            <div className="text-xs text-grey-soft mb-1">Event date & time</div>
            <input
              type="datetime-local"
              defaultValue={dateValue}
              key={`date-${dateValue}`}
              onBlur={(e) => {
                const newVal = e.target.value ? new Date(e.target.value).toISOString() : null
                if (newVal !== venue.event_date) updateVenue({ event_date: newVal })
              }}
              className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-grey-soft mb-1">Estimated $</div>
              <input
                type="number"
                min={0}
                step={100}
                defaultValue={venue.estimated_cost || ''}
                key={`est-${venue.estimated_cost ?? ''}`}
                onBlur={(e) => { const v = e.target.value ? parseFloat(e.target.value) : null; if (v !== venue.estimated_cost) updateVenue({ estimated_cost: v }) }}
                placeholder="0"
                className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
            <div>
              <div className="text-xs text-grey-soft mb-1">Quoted $</div>
              <input
                type="number"
                min={0}
                step={100}
                defaultValue={venue.quoted_cost || ''}
                key={`quo-${venue.quoted_cost ?? ''}`}
                onBlur={(e) => { const v = e.target.value ? parseFloat(e.target.value) : null; if (v !== venue.quoted_cost) updateVenue({ quoted_cost: v }) }}
                placeholder="0"
                className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
            <div>
              <div className="text-xs text-grey-soft mb-1">Deposit $</div>
              <input
                type="number"
                min={0}
                step={100}
                defaultValue={venue.deposit_paid || ''}
                key={`dep-${venue.deposit_paid ?? ''}`}
                onBlur={(e) => { const v = e.target.value ? parseFloat(e.target.value) : null; if (v !== venue.deposit_paid) updateVenue({ deposit_paid: v }) }}
                placeholder="0"
                className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-grey-soft mb-1">First contact</div>
              <input
                type="date"
                defaultValue={venue.first_contact_date || ''}
                key={`fc-${venue.first_contact_date || ''}`}
                onBlur={(e) => { if (e.target.value !== (venue.first_contact_date || '')) updateVenue({ first_contact_date: e.target.value || null }) }}
                className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
            <div>
              <div className="text-xs text-grey-soft mb-1">Last contact</div>
              <input
                type="date"
                defaultValue={venue.last_contact_date || ''}
                key={`lc-${venue.last_contact_date || ''}`}
                onBlur={(e) => { if (e.target.value !== (venue.last_contact_date || '')) updateVenue({ last_contact_date: e.target.value || null }) }}
                className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div>
              <div className="text-xs text-grey-soft mb-1">Next action date</div>
              <input
                type="date"
                defaultValue={venue.next_action_date || ''}
                key={`nad-${venue.next_action_date || ''}`}
                onBlur={(e) => { if (e.target.value !== (venue.next_action_date || '')) updateVenue({ next_action_date: e.target.value || null }) }}
                className="px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
            <div>
              <div className="text-xs text-grey-soft mb-1">Next action</div>
              <input
                defaultValue={venue.next_action || ''}
                key={`na-${venue.next_action || ''}`}
                onBlur={(e) => { if (e.target.value !== (venue.next_action || '')) updateVenue({ next_action: e.target.value || null }) }}
                placeholder="e.g. Send follow-up email"
                className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-grey-soft mb-1">Recommended by</div>
              <input
                defaultValue={venue.recommended_by || ''}
                key={`rb-${venue.recommended_by || ''}`}
                onBlur={(e) => { if (e.target.value !== (venue.recommended_by || '')) updateVenue({ recommended_by: e.target.value || null }) }}
                placeholder="Friend, planner, etc."
                className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
            <div>
              <div className="text-xs text-grey-soft mb-1">Rating</div>
              <StarRating value={venue.rating} onChange={(n) => updateVenue({ rating: n })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-grey-soft mb-1">Pros</div>
              <textarea
                defaultValue={venue.pros || ''}
                key={`pros-${venue.pros || ''}`}
                onBlur={(e) => { if (e.target.value !== (venue.pros || '')) updateVenue({ pros: e.target.value || null }) }}
                placeholder="What we love..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
            <div>
              <div className="text-xs text-grey-soft mb-1">Cons</div>
              <textarea
                defaultValue={venue.cons || ''}
                key={`cons-${venue.cons || ''}`}
                onBlur={(e) => { if (e.target.value !== (venue.cons || '')) updateVenue({ cons: e.target.value || null }) }}
                placeholder="Concerns..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-grey-soft mb-1">Notes</div>
            <textarea
              defaultValue={venue.notes || ''}
              key={`notes-${venue.notes || ''}`}
              onBlur={(e) => { if (e.target.value !== (venue.notes || '')) updateVenue({ notes: e.target.value || null }) }}
              placeholder="Capacity, package details, anything else..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30 placeholder:text-grey-soft/60"
            />
          </div>
        </div>
      </div>

      {importOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 flex items-end sm:items-center justify-center" onClick={() => setImportOpen(false)}>
          <div className="bg-white w-full sm:max-w-xl max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-grey-soft/15 flex justify-between items-center">
              <h2 className="text-lg font-serif text-charcoal">Import from Vendors</h2>
              <button onClick={() => setImportOpen(false)} className="text-grey-soft hover:text-charcoal text-xl px-2">×</button>
            </div>
            <div className="p-4 border-b border-grey-soft/15">
              <input
                value={importSearch}
                onChange={(e) => setImportSearch(e.target.value)}
                placeholder="Search vendors..."
                className="w-full px-3 py-2 text-sm border border-grey-soft/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredImport.length === 0 ? (
                <div className="text-center text-grey-soft py-8 text-sm italic">
                  {vendorPool.length === 0 ? 'No vendors yet. Add some on the Vendors page first.' : 'No matches.'}
                </div>
              ) : (
                filteredImport.map(v => (
                  <button
                    key={v.id}
                    onClick={() => importVendor(v)}
                    className="w-full text-left p-3 rounded-lg hover:bg-cream/40 transition-colors"
                  >
                    <div className="text-charcoal font-medium">{v.business_name}</div>
                    <div className="text-xs text-grey-soft">
                      {catById[v.category_id] && `${catById[v.category_id]} · `}
                      {v.status}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
