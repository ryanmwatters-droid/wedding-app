'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

const ENGAGEMENT_PARTY = new Date('2026-06-20T18:30:00-05:00')

function CountdownBanner() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const ms = ENGAGEMENT_PARTY.getTime() - now.getTime()
  const past = ms <= 0
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)

  let big: string
  if (past) big = '✿'
  else if (days >= 1) big = `${days} ${days === 1 ? 'day' : 'days'}`
  else big = `${hours} ${hours === 1 ? 'hour' : 'hours'}`

  return (
    <div className="bg-rose-accent/10 border border-rose-accent/20 rounded-2xl p-4 mb-4 text-center">
      <div className="text-2xl font-serif text-rose-accent">
        {past ? 'Engagement Party — today!' : big}
      </div>
      <div className="text-xs text-grey-soft uppercase tracking-wider mt-1">
        {past ? 'June 20 · 6:30 PM Central' : 'until our engagement party · June 20 · 6:30 PM CT'}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { session, logout } = useAuth()
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 })
  const [guestStats, setGuestStats] = useState({ total: 0, sent: 0, received: 0, attending: 0 })
  const [engagementStats, setEngagementStats] = useState({ total: 0, sent: 0, received: 0, attending: 0 })
  const [docCount, setDocCount] = useState(0)
  const [budget, setBudget] = useState({ allocated: 0, spent: 0 })
  const [vendorStats, setVendorStats] = useState({ total: 0, booked: 0 })
  const [latestMessage, setLatestMessage] = useState<{ text: string; user_email: string | null } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return

    const loadStats = async () => {
      const [tasksRes, guestsRes, engagementRes, msgRes, docsRes, budgetSettingsRes, budgetItemRes, vendorsRes] = await Promise.all([
        supabase.from('tasks').select('completed'),
        supabase.from('guests').select('invitation_sent, rsvp_received, attending, party_size'),
        supabase.from('engagement_guests').select('invitation_sent, rsvp_received, attending, party_size'),
        supabase.from('messages').select('text, user_email').order('created_at', { ascending: false }).limit(1),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('budget_settings').select('total_budget').limit(1).single(),
        supabase.from('budget_items').select('actual'),
        supabase.from('vendors').select('status')
      ])

      if (vendorsRes.data) {
        setVendorStats({
          total: vendorsRes.data.length,
          booked: vendorsRes.data.filter(v => v.status === 'Booked').length
        })
      }

      if (budgetItemRes.data) {
        setBudget({
          allocated: Number(budgetSettingsRes.data?.total_budget) || 0,
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
  const budgetPct = budget.allocated > 0 ? Math.min(100, Math.round((budget.spent / budget.allocated) * 100)) : 0
  const overBudget = budget.spent > budget.allocated && budget.allocated > 0

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

        <CountdownBanner />

        <Link href="/messages" className="block bg-white rounded-2xl p-4 mb-4 border border-grey-soft/20 hover:border-rose-accent/40 transition-colors">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wider text-grey-soft mb-1">Wedding Chat</div>
              {latestMessage ? (
                <p className="text-sm text-charcoal truncate italic">&ldquo;{latestMessage.text}&rdquo;</p>
              ) : (
                <p className="text-sm text-grey-soft italic">Start a conversation...</p>
              )}
            </div>
            <span className="text-grey-soft">→</span>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/tasks" className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-sage-primary/40 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-grey-soft">Planning</span>
              {taskPct === 100 && <span className="text-sage-primary text-sm">✓</span>}
            </div>
            <h3 className="text-xl font-serif text-charcoal mb-1">Wedding Tasks</h3>
            <p className="text-xs text-grey-soft italic mb-4">8 phases · Foundation → post-wedding</p>
            <div className="w-full bg-grey-soft/15 rounded-full h-1.5 mb-2">
              <div className="bg-sage-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${taskPct}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-grey-soft">
              <span>{taskStats.completed} of {taskStats.total}</span>
              <span>{taskPct}%</span>
            </div>
          </Link>

          <Link href="/budget" className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-sage-primary/40 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-grey-soft">Money</span>
              {overBudget && <span className="text-rose-accent text-xs">over</span>}
            </div>
            <h3 className="text-xl font-serif text-charcoal mb-1">Budget</h3>
            <p className="text-xs text-grey-soft italic mb-4">
              {budget.allocated > 0 ? `$${Math.round(budget.spent).toLocaleString()} of $${Math.round(budget.allocated).toLocaleString()}` : 'No budget set yet'}
            </p>
            <div className="w-full bg-grey-soft/15 rounded-full h-1.5 mb-2">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${overBudget ? 'bg-rose-accent' : 'bg-sage-primary'}`} style={{ width: `${budgetPct}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-grey-soft">
              <span>{budget.allocated > 0 ? `$${Math.round(budget.allocated - budget.spent).toLocaleString()} left` : '—'}</span>
              <span>{budget.allocated > 0 ? `${budgetPct}%` : '—'}</span>
            </div>
          </Link>

          <Link href="/guests" className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-rose-accent/40 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-grey-soft">Wedding</span>
            </div>
            <h3 className="text-xl font-serif text-charcoal mb-1">Guest List</h3>
            <p className="text-xs text-grey-soft italic mb-4">Invitations & RSVPs</p>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <div className="text-base font-medium text-charcoal">{guestStats.total}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider">Invited</div>
              </div>
              <div>
                <div className="text-base font-medium text-rose-accent">{guestStats.received}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider">RSVP'd</div>
              </div>
              <div>
                <div className="text-base font-medium text-sage-primary">{guestStats.attending}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider">Yes</div>
              </div>
            </div>
          </Link>

          <Link href="/engagement-guests" className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-rose-accent/40 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-grey-soft">Engagement</span>
            </div>
            <h3 className="text-xl font-serif text-charcoal mb-1">Guest List</h3>
            <p className="text-xs text-grey-soft italic mb-4">Invitations & RSVPs</p>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <div className="text-base font-medium text-charcoal">{engagementStats.total}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider">Invited</div>
              </div>
              <div>
                <div className="text-base font-medium text-rose-accent">{engagementStats.received}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider">RSVP'd</div>
              </div>
              <div>
                <div className="text-base font-medium text-sage-primary">{engagementStats.attending}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider">Yes</div>
              </div>
            </div>
          </Link>

          <Link href="/vendors" className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-rose-accent/40 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-grey-soft">Outreach</span>
            </div>
            <h3 className="text-xl font-serif text-charcoal mb-1">Vendors</h3>
            <p className="text-xs text-grey-soft italic mb-4">Photo, florals, catering + more</p>
            <div className="flex justify-between text-xs text-grey-soft">
              <span>{vendorStats.total} {vendorStats.total === 1 ? 'lead' : 'leads'}</span>
              <span>{vendorStats.booked} booked</span>
            </div>
          </Link>

          <Link href="/documents" className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-dusty-blue/40 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-grey-soft">Reference</span>
            </div>
            <h3 className="text-xl font-serif text-charcoal mb-1">Documents</h3>
            <p className="text-xs text-grey-soft italic mb-4">PDFs, decks, contracts, inspiration</p>
            <div className="flex justify-between text-xs text-grey-soft">
              <span>{docCount} {docCount === 1 ? 'file' : 'files'}</span>
              <span>view all</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
