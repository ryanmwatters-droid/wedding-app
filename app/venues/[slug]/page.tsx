'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EventVenue } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'

export default function VenueDetailPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const { session, logout } = useAuth()
  const [venue, setVenue] = useState<EventVenue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>
  if (loading || !venue) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-primary mx-auto mb-4"></div>
        <p className="text-charcoal">Loading...</p>
      </div>
    </div>
  )

  // For datetime-local input format
  const dateValue = venue.event_date ? new Date(venue.event_date).toISOString().slice(0, 16) : ''

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
          <div className="text-xs uppercase tracking-wider text-grey-soft mb-1">{venue.label}</div>
          <h1 className="text-3xl font-serif text-charcoal">Venue</h1>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-grey-soft/20 space-y-4">
          <div>
            <div className="text-xs text-grey-soft mb-1">Venue name</div>
            <input
              defaultValue={venue.venue_name || ''}
              onBlur={(e) => { if (e.target.value !== (venue.venue_name || '')) updateVenue({ venue_name: e.target.value || null }) }}
              placeholder="The LaSalle, etc."
              className="w-full px-3 py-2 text-base bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
          </div>

          <div>
            <div className="text-xs text-grey-soft mb-1">Address</div>
            <textarea
              defaultValue={venue.venue_address || ''}
              onBlur={(e) => { if (e.target.value !== (venue.venue_address || '')) updateVenue({ venue_address: e.target.value || null }) }}
              placeholder="Street, city, state"
              rows={2}
              className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
          </div>

          <div>
            <div className="text-xs text-grey-soft mb-1">Website</div>
            <input
              defaultValue={venue.venue_url || ''}
              onBlur={(e) => { if (e.target.value !== (venue.venue_url || '')) updateVenue({ venue_url: e.target.value || null }) }}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
          </div>

          <div>
            <div className="text-xs text-grey-soft mb-1">Date & time</div>
            <input
              type="datetime-local"
              defaultValue={dateValue}
              key={dateValue}
              onBlur={(e) => {
                const newVal = e.target.value ? new Date(e.target.value).toISOString() : null
                if (newVal !== venue.event_date) updateVenue({ event_date: newVal })
              }}
              className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
          </div>

          <div>
            <button
              onClick={() => updateVenue({ booked: !venue.booked })}
              className={`px-4 py-2 text-sm rounded-full transition-colors ${venue.booked ? 'bg-sage-primary text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}
            >
              {venue.booked ? '✓ Booked' : 'Mark as booked'}
            </button>
          </div>

          <div>
            <div className="text-xs text-grey-soft mb-1">Notes</div>
            <textarea
              defaultValue={venue.notes || ''}
              onBlur={(e) => { if (e.target.value !== (venue.notes || '')) updateVenue({ notes: e.target.value || null }) }}
              placeholder="Capacity, contact person, package details, etc."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
