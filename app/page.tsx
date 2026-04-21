'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

export default function HomePage() {
  const { session, logout } = useAuth()
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 })
  const [guestStats, setGuestStats] = useState({ total: 0, sent: 0, received: 0, attending: 0 })
  const [sharedNote, setSharedNote] = useState('')
  const [noteId, setNoteId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return

    const loadStats = async () => {
      const [tasksRes, guestsRes, noteRes] = await Promise.all([
        supabase.from('tasks').select('completed'),
        supabase.from('guests').select('invitation_sent, rsvp_received, attending, party_size'),
        supabase.from('shared_notes').select('*').single()
      ])

      if (tasksRes.data) {
        setTaskStats({
          total: tasksRes.data.length,
          completed: tasksRes.data.filter(t => t.completed).length
        })
      }

      if (guestsRes.data) {
        setGuestStats({
          total: guestsRes.data.reduce((sum, g) => sum + (g.party_size || 1), 0),
          sent: guestsRes.data.filter(g => g.invitation_sent).length,
          received: guestsRes.data.filter(g => g.rsvp_received).length,
          attending: guestsRes.data.filter(g => g.attending).reduce((sum, g) => sum + (g.party_size || 1), 0)
        })
      }

      if (noteRes.data) {
        setSharedNote(noteRes.data.text || '')
        setNoteId(noteRes.data.id)
      }
    }

    loadStats()

    const channel = supabase
      .channel('home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_notes' }, (payload) => {
        if (payload.eventType === 'UPDATE') setSharedNote(payload.new.text)
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session])

  const updateSharedNote = async (text: string) => {
    if (!noteId) return
    try {
      const { error } = await supabase
        .from('shared_notes')
        .update({ text, updated_by: session?.user.id, updated_at: new Date().toISOString() })
        .eq('id', noteId)
      if (error) throw error
    } catch (err) {
      console.error('Error updating note:', err)
      setError('Failed to save note.')
    }
  }

  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>

  const taskPct = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0
  const rsvpPct = guestStats.sent > 0 ? Math.round((guestStats.received / guestStats.sent) * 100) : 0

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif text-charcoal">Ryan & Hannah</h1>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl p-4 mb-6 border border-grey-soft/20">
          <h2 className="text-sm font-medium text-charcoal mb-2">Just Between Us</h2>
          <textarea
            value={sharedNote}
            onChange={(e) => setSharedNote(e.target.value)}
            onBlur={() => updateSharedNote(sharedNote)}
            placeholder="Leave a note for each other..."
            className="w-full p-3 border border-grey-soft/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary"
            rows={2}
          />
        </div>

        <div className="grid gap-4">
          <Link href="/tasks" className="bg-white rounded-2xl p-6 border border-grey-soft/20 hover:border-sage-primary/40 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-xl font-serif text-charcoal">Wedding Tasks</h2>
              <span className="text-sm text-grey-soft">{taskStats.completed} / {taskStats.total}</span>
            </div>
            <div className="w-full bg-grey-soft/20 rounded-full h-2 mb-2">
              <div className="bg-sage-primary h-2 rounded-full transition-all duration-300" style={{ width: `${taskPct}%` }}></div>
            </div>
            <p className="text-sm text-grey-soft">{taskPct}% complete · 8 phases · view tasks →</p>
          </Link>

          <Link href="/guests" className="bg-white rounded-2xl p-6 border border-grey-soft/20 hover:border-rose-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-xl font-serif text-charcoal">Guest List</h2>
              <span className="text-sm text-grey-soft">{guestStats.total} invited</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mt-4">
              <div>
                <div className="text-xl font-bold text-rose-accent">{guestStats.sent}</div>
                <div className="text-xs text-grey-soft">Sent</div>
              </div>
              <div>
                <div className="text-xl font-bold text-rose-accent">{guestStats.received}</div>
                <div className="text-xs text-grey-soft">RSVP'd</div>
              </div>
              <div>
                <div className="text-xl font-bold text-sage-primary">{guestStats.attending}</div>
                <div className="text-xs text-grey-soft">Attending</div>
              </div>
            </div>
            <p className="text-sm text-grey-soft mt-3">{rsvpPct}% of invitations responded · view guests →</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
