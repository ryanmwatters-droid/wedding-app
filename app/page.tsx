'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { EventVenue, Countdown } from '@/lib/types'

const ENGAGEMENT_PARTY = new Date('2026-08-29T18:00:00-05:00')

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
        {past ? 'August 29 · 6:00 PM Central' : 'until our engagement party · August 29 · 6:00 PM CT'}
      </div>
    </div>
  )
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const COUNTDOWN_COLORS: { name: string; hex: string }[] = [
  { name: 'Dusty Rose', hex: '#B08585' },
  { name: 'Dusty Blue', hex: '#7B8AA8' },
  { name: 'Sage', hex: '#7B8A78' },
  { name: 'Forest', hex: '#4A5D4A' },
  { name: 'Terracotta', hex: '#BD7A5E' },
  { name: 'Honey', hex: '#C2A35B' },
  { name: 'Mauve', hex: '#9A7B96' },
  { name: 'Slate', hex: '#6B7B82' },
]
const DEFAULT_COUNTDOWN_COLOR = '#7B8AA8'

function CustomCountdowns() {
  const { session } = useAuth()
  const [items, setItems] = useState<Countdown[]>([])
  const [now, setNow] = useState(() => new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState('')
  const [color, setColor] = useState(DEFAULT_COUNTDOWN_COLOR)
  const [error, setError] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!session) return

    const load = async () => {
      const { data, error } = await supabase.from('countdowns').select('*').order('target_date')
      if (!error) setItems(data || [])
    }
    load()

    const channel = supabase
      .channel('countdowns-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'countdowns' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => prev.some(c => c.id === payload.new.id) ? prev : [...prev, payload.new as Countdown])
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(c => c.id === payload.new.id ? payload.new as Countdown : c))
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(c => c.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session])

  const sorted = [...items].sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())

  const openAdd = () => { setEditingId(null); setTitle(''); setWhen(''); setColor(DEFAULT_COUNTDOWN_COLOR); setError(''); setShowForm(true) }
  const openEdit = (c: Countdown) => {
    setEditingId(c.id)
    setTitle(c.title)
    setWhen(toLocalInput(new Date(c.target_date)))
    setColor(c.color || DEFAULT_COUNTDOWN_COLOR)
    setError('')
    setShowForm(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !when) return
    const target = new Date(when).toISOString()
    const name = title.trim()

    if (editingId) {
      setItems(prev => prev.map(c => c.id === editingId ? { ...c, title: name, target_date: target, color } : c))
      setShowForm(false)
      const { error } = await supabase.from('countdowns').update({ title: name, target_date: target, color }).eq('id', editingId)
      if (error) { console.error(error); setError('Failed to save.') }
    } else {
      setShowForm(false)
      const { data, error } = await supabase
        .from('countdowns')
        .insert({ title: name, target_date: target, color, created_by: session?.user.id })
        .select()
        .single()
      if (error) { console.error(error); setError('Failed to add.') }
      else setItems(prev => prev.some(c => c.id === data.id) ? prev : [...prev, data as Countdown])
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this countdown?')) return
    setItems(prev => prev.filter(c => c.id !== id))
    const { error } = await supabase.from('countdowns').delete().eq('id', id)
    if (error) { console.error(error); setError('Failed to delete.') }
  }

  return (
    <div>
      {sorted.map(c => {
        const target = new Date(c.target_date)
        const ms = target.getTime() - now.getTime()
        const past = ms <= 0
        const days = Math.floor(ms / (1000 * 60 * 60 * 24))
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
        const big = past ? '✿' : days >= 1 ? `${days} ${days === 1 ? 'day' : 'days'}` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`
        const dateLabel = target.toLocaleString([], { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        const accent = c.color || DEFAULT_COUNTDOWN_COLOR
        return (
          <div
            key={c.id}
            style={{ backgroundColor: `${accent}1A`, borderColor: `${accent}33` }}
            className="relative border rounded-2xl p-4 mb-4 text-center"
          >
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={() => openEdit(c)} className="text-sm text-grey-soft hover:text-charcoal px-1" aria-label="Edit countdown">✎</button>
              <button onClick={() => remove(c.id)} className="text-sm text-grey-soft hover:text-red-500 px-1" aria-label="Delete countdown">×</button>
            </div>
            <div className="text-2xl font-serif" style={{ color: accent }}>{past ? `${c.title} — today!` : big}</div>
            <div className="text-xs text-grey-soft uppercase tracking-wider mt-1">
              {past ? dateLabel : `until ${c.title} · ${dateLabel}`}
            </div>
          </div>
        )
      })}

      {showForm ? (
        <form onSubmit={save} className="bg-white border border-grey-soft/20 rounded-2xl p-4 mb-4 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are we counting down to? (e.g. Engagement photos)"
            className="w-full px-3 py-2 border border-grey-soft/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary"
            autoFocus
          />
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full px-3 py-2 border border-grey-soft/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary"
          />
          <div className="flex flex-wrap gap-2 justify-center py-1">
            {COUNTDOWN_COLORS.map(col => (
              <button
                key={col.hex}
                type="button"
                onClick={() => setColor(col.hex)}
                aria-label={col.name}
                title={col.name}
                style={{ backgroundColor: col.hex }}
                className={`w-7 h-7 rounded-full transition-transform ${color === col.hex ? 'ring-2 ring-offset-2 ring-charcoal scale-110' : 'hover:scale-105'}`}
              />
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-grey-soft hover:text-charcoal">Cancel</button>
            <button type="submit" disabled={!title.trim() || !when} className="px-4 py-2 text-sm bg-sage-primary text-white rounded-xl disabled:opacity-50 hover:bg-sage-primary/90 transition-colors">
              {editingId ? 'Save' : 'Add countdown'}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={openAdd} className="w-full mb-4 px-4 py-2 text-sm text-dusty-blue border border-dusty-blue/30 hover:bg-dusty-blue/5 rounded-2xl transition-colors">
          + Add another countdown
        </button>
      )}

      {error && <div className="text-xs text-red-500 mb-2 text-center">{error}</div>}
    </div>
  )
}

export default function HomePage() {
  const { session, logout } = useAuth()
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 })
  const [guestStats, setGuestStats] = useState({ total: 0, sent: 0, received: 0, attending: 0, declined: 0 })
  const [engagementStats, setEngagementStats] = useState({ total: 0, sent: 0, received: 0, attending: 0, declined: 0 })
  const [docCount, setDocCount] = useState(0)
  const [budget, setBudget] = useState({ allocated: 0, spent: 0 })
  const [vendorStats, setVendorStats] = useState({ total: 0, booked: 0 })
  const [venues, setVenues] = useState<EventVenue[]>([])
  const [latestMessage, setLatestMessage] = useState<{ text: string; user_email: string | null } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return

    const loadStats = async () => {
      const [tasksRes, guestsRes, engagementRes, msgRes, docsRes, budgetSettingsRes, budgetItemRes, vendorsRes, venuesRes] = await Promise.all([
        supabase.from('tasks').select('completed'),
        supabase.from('guests').select('invitation_sent, rsvp_received, attending, party_size'),
        supabase.from('engagement_guests').select('invitation_sent, rsvp_received, attending, party_size'),
        supabase.from('messages').select('text, user_email').order('created_at', { ascending: false }).limit(1),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('budget_settings').select('total_budget').limit(1).single(),
        supabase.from('budget_items').select('actual'),
        supabase.from('vendors').select('status'),
        supabase.from('event_venues').select('*')
      ])

      if (venuesRes.data) setVenues(venuesRes.data)

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
          received: engagementRes.data.filter(g => g.rsvp_received).reduce((sum, g) => sum + (g.party_size || 1), 0),
          attending: engagementRes.data.filter(g => g.attending).reduce((sum, g) => sum + (g.party_size || 1), 0),
          declined: engagementRes.data.filter(g => g.rsvp_received && !g.attending).reduce((sum, g) => sum + (g.party_size || 1), 0)
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
          received: guestsRes.data.filter(g => g.rsvp_received).reduce((sum, g) => sum + (g.party_size || 1), 0),
          attending: guestsRes.data.filter(g => g.attending).reduce((sum, g) => sum + (g.party_size || 1), 0),
          declined: guestsRes.data.filter(g => g.rsvp_received && !g.attending).reduce((sum, g) => sum + (g.party_size || 1), 0)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_venues' }, (payload) => {
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
  }, [session])

  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>

  const weddingVenues = venues.filter(v => v.slug === 'wedding')
  const engagementVenues = venues.filter(v => v.slug === 'engagement')
  const weddingBooked = weddingVenues.find(v => v.status === 'Booked')
  const engagementBooked = engagementVenues.find(v => v.status === 'Booked')

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
        <CustomCountdowns />

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

          <Link href="/venues/wedding" className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-sage-primary/40 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-grey-soft">Wedding</span>
              {weddingBooked && <span className="text-sage-primary text-sm">✓</span>}
            </div>
            <h3 className="text-xl font-serif text-charcoal mb-1">Venue</h3>
            <p className="text-xs text-grey-soft italic mb-2">
              {weddingBooked?.venue_name || (weddingVenues.length > 0 ? `${weddingVenues.length} ${weddingVenues.length === 1 ? 'candidate' : 'candidates'}` : 'Not chosen yet')}
            </p>
            <div className="text-xs text-grey-soft truncate">
              {weddingBooked?.event_date ? new Date(weddingBooked.event_date).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : weddingBooked?.venue_address || (weddingVenues.length > 0 ? 'Tap to compare →' : 'Tap to add →')}
            </div>
          </Link>

          <Link href="/venues/engagement" className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-rose-accent/40 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-grey-soft">Engagement</span>
              {engagementBooked && <span className="text-sage-primary text-sm">✓</span>}
            </div>
            <h3 className="text-xl font-serif text-charcoal mb-1">Venue</h3>
            <p className="text-xs text-grey-soft italic mb-2">
              {engagementBooked?.venue_name || (engagementVenues.length > 0 ? `${engagementVenues.length} ${engagementVenues.length === 1 ? 'candidate' : 'candidates'}` : 'Not chosen yet')}
            </p>
            <div className="text-xs text-grey-soft truncate">
              {engagementBooked?.event_date ? new Date(engagementBooked.event_date).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : engagementBooked?.venue_address || (engagementVenues.length > 0 ? 'Tap to compare →' : 'Tap to add →')}
            </div>
          </Link>

          <Link href="/guests" className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-rose-accent/40 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-grey-soft">Wedding</span>
            </div>
            <h3 className="text-xl font-serif text-charcoal mb-1">Guest List</h3>
            <p className="text-xs text-grey-soft italic mb-4">Invitations & RSVPs</p>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div>
                <div className="text-base font-medium text-charcoal">{guestStats.total}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider"><span className="sm:hidden">I</span><span className="hidden sm:inline">Invited</span></div>
              </div>
              <div>
                <div className="text-base font-medium text-rose-accent">{guestStats.received}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider"><span className="sm:hidden">R</span><span className="hidden sm:inline">RSVP&apos;d</span></div>
              </div>
              <div>
                <div className="text-base font-medium text-sage-primary">{guestStats.attending}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider"><span className="sm:hidden">Y</span><span className="hidden sm:inline">Yes</span></div>
              </div>
              <div>
                <div className="text-base font-medium text-dusty-blue">{guestStats.declined}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider"><span className="sm:hidden">N</span><span className="hidden sm:inline">No</span></div>
              </div>
            </div>
          </Link>

          <Link href="/engagement-guests" className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-rose-accent/40 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-grey-soft">Engagement</span>
            </div>
            <h3 className="text-xl font-serif text-charcoal mb-1">Guest List</h3>
            <p className="text-xs text-grey-soft italic mb-4">Invitations & RSVPs</p>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div>
                <div className="text-base font-medium text-charcoal">{engagementStats.total}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider"><span className="sm:hidden">I</span><span className="hidden sm:inline">Invited</span></div>
              </div>
              <div>
                <div className="text-base font-medium text-rose-accent">{engagementStats.received}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider"><span className="sm:hidden">R</span><span className="hidden sm:inline">RSVP&apos;d</span></div>
              </div>
              <div>
                <div className="text-base font-medium text-sage-primary">{engagementStats.attending}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider"><span className="sm:hidden">Y</span><span className="hidden sm:inline">Yes</span></div>
              </div>
              <div>
                <div className="text-base font-medium text-dusty-blue">{engagementStats.declined}</div>
                <div className="text-[10px] text-grey-soft uppercase tracking-wider"><span className="sm:hidden">N</span><span className="hidden sm:inline">No</span></div>
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

        <a
          href="https://clients.foxandivory.com/portal"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 bg-rose-accent/5 rounded-2xl p-4 border border-rose-accent/20 hover:bg-rose-accent/10 hover:border-rose-accent/40 transition-all"
        >
          <span className="text-xl">📸</span>
          <span className="text-sm font-medium text-charcoal">Our Photographer&rsquo;s Portal</span>
          <span className="text-xs text-rose-accent">Fox &amp; Ivory ↗</span>
        </a>
      </div>
    </div>
  )
}
