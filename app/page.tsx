'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

export default function HomePage() {
  const { session, logout } = useAuth()
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 })
  const [guestStats, setGuestStats] = useState({ total: 0, sent: 0, received: 0, attending: 0 })
  const [engagementStats, setEngagementStats] = useState({ total: 0, sent: 0, received: 0, attending: 0 })
  const [docCount, setDocCount] = useState(0)
  const [budget, setBudget] = useState({ allocated: 0, spent: 0 })
  const [latestMessage, setLatestMessage] = useState<{ text: string; user_email: string | null } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return

    const loadStats = async () => {
      const [tasksRes, guestsRes, engagementRes, msgRes, docsRes, budgetCatRes, budgetItemRes] = await Promise.all([
        supabase.from('tasks').select('completed'),
        supabase.from('guests').select('invitation_sent, rsvp_received, attending, party_size'),
        supabase.from('engagement_guests').select('invitation_sent, rsvp_received, attending, party_size'),
        supabase.from('messages').select('text, user_email').order('created_at', { ascending: false }).limit(1),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('budget_categories').select('allocated'),
        supabase.from('budget_items').select('actual')
      ])

      if (budgetCatRes.data && budgetItemRes.data) {
        setBudget({
          allocated: budgetCatRes.data.reduce((s, c) => s + (Number(c.allocated) || 0), 0),
          spent: budgetItemRes.data.reduce((s, i) => s + (Number(i.actual) || 0), 0)
        })
      }

      if (docsRes.count !== null) setDocCount(docsRes.count)

      if (engagementRes.data) {
        setEngagementStats({
          total: engagementRes.data.reduce((sum, g) => sum + (g.party_size || 1), 0),
          sent: engagementRes.data.filter(g => g.invitation_sent).length,
          received: engagementRes.data.filter(g => g.rsvp_received).length,
          attending: engagementRes.data.filter(g => g.attending).reduce((sum, g) => sum + (g.party_size || 1), 0)
        })
      }

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

      if (msgRes.data && msgRes.data.length > 0) {
        setLatestMessage(msgRes.data[0])
      }
    }

    loadStats()

    const channel = supabase
      .channel('home-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setLatestMessage({ text: payload.new.text, user_email: payload.new.user_email })
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session])

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

        <Link href="/messages" className="block bg-white rounded-2xl p-4 mb-6 border border-grey-soft/20 hover:border-rose-accent/40 transition-colors">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-medium text-charcoal mb-1">Wedding Chat</h2>
              {latestMessage ? (
                <p className="text-sm text-grey-soft truncate italic">&ldquo;{latestMessage.text}&rdquo;</p>
              ) : (
                <p className="text-sm text-grey-soft italic">Start a conversation...</p>
              )}
            </div>
            <span className="text-grey-soft">→</span>
          </div>
        </Link>

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

          <Link href="/budget" className="bg-white rounded-2xl p-6 border border-grey-soft/20 hover:border-sage-primary/40 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-xl font-serif text-charcoal">Budget</h2>
              <span className="text-sm text-grey-soft">${Math.round(budget.spent).toLocaleString()} of ${Math.round(budget.allocated).toLocaleString()}</span>
            </div>
            <div className="w-full bg-grey-soft/20 rounded-full h-2 mb-2">
              <div className={`h-2 rounded-full transition-all duration-300 ${budget.spent > budget.allocated && budget.allocated > 0 ? 'bg-rose-accent' : 'bg-sage-primary'}`} style={{ width: `${budget.allocated > 0 ? Math.min(100, Math.round((budget.spent / budget.allocated) * 100)) : 0}%` }}></div>
            </div>
            <p className="text-sm text-grey-soft">{budget.allocated > 0 ? `${Math.round((budget.spent / budget.allocated) * 100)}% of budget · view breakdown →` : 'Set up your budget →'}</p>
          </Link>

          <Link href="/documents" className="bg-white rounded-2xl p-6 border border-grey-soft/20 hover:border-dusty-blue/40 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-xl font-serif text-charcoal">Documents</h2>
              <span className="text-sm text-grey-soft">{docCount} {docCount === 1 ? 'file' : 'files'}</span>
            </div>
            <p className="text-sm text-grey-soft">PDFs, vendor decks, contracts, inspiration · view documents →</p>
          </Link>

          <Link href="/guests" className="bg-white rounded-2xl p-6 border border-grey-soft/20 hover:border-rose-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-xl font-serif text-charcoal">Wedding Guest List</h2>
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

          <Link href="/engagement-guests" className="bg-white rounded-2xl p-6 border border-grey-soft/20 hover:border-rose-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-xl font-serif text-charcoal">Engagement Party Guest List</h2>
              <span className="text-sm text-grey-soft">{engagementStats.total} invited</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mt-4">
              <div>
                <div className="text-xl font-bold text-rose-accent">{engagementStats.sent}</div>
                <div className="text-xs text-grey-soft">Sent</div>
              </div>
              <div>
                <div className="text-xl font-bold text-rose-accent">{engagementStats.received}</div>
                <div className="text-xs text-grey-soft">RSVP'd</div>
              </div>
              <div>
                <div className="text-xl font-bold text-sage-primary">{engagementStats.attending}</div>
                <div className="text-xs text-grey-soft">Attending</div>
              </div>
            </div>
            <p className="text-sm text-grey-soft mt-3">view engagement guests →</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
