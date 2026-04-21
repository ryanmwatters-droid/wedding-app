'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { PHASES } from '@/lib/phases'

type PhaseStat = { total: number; completed: number }

export default function TasksOverview() {
  const { session, logout } = useAuth()
  const [stats, setStats] = useState<Record<number, PhaseStat>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return

    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.from('tasks').select('phase_order, completed')
        if (error) throw error
        const next: Record<number, PhaseStat> = {}
        for (const t of data || []) {
          if (!next[t.phase_order]) next[t.phase_order] = { total: 0, completed: 0 }
          next[t.phase_order].total++
          if (t.completed) next[t.phase_order].completed++
        }
        setStats(next)
      } catch (err) {
        console.error('Error fetching task stats:', err)
        setError('Failed to load tasks.')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    const channel = supabase
      .channel('tasks-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchStats)
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session])

  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>
  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-primary mx-auto mb-4"></div>
        <p className="text-charcoal">Loading your wedding plan...</p>
      </div>
    </div>
  )

  const totalTasks = Object.values(stats).reduce((s, p) => s + p.total, 0)
  const completedTotal = Object.values(stats).reduce((s, p) => s + p.completed, 0)
  const overallPct = totalTasks > 0 ? Math.round((completedTotal / totalTasks) * 100) : 0

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Home</Link>
          <h1 className="text-2xl font-serif text-charcoal">Tasks</h1>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl p-6 mb-6 border border-grey-soft/20">
          <div className="flex justify-between items-baseline mb-3">
            <h2 className="text-lg font-medium text-charcoal">Overall Progress</h2>
            <span className="text-sm text-grey-soft">{completedTotal} of {totalTasks}</span>
          </div>
          <div className="w-full bg-grey-soft/20 rounded-full h-2">
            <div className="bg-sage-primary h-2 rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }}></div>
          </div>
          <div className="text-center text-sm text-grey-soft mt-2">{overallPct}% complete</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PHASES.map(phase => {
            const stat = stats[phase.order] || { total: 0, completed: 0 }
            const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
            const isDone = stat.total > 0 && stat.completed === stat.total
            return (
              <Link
                key={phase.order}
                href={`/tasks/${phase.order}`}
                className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-sage-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-grey-soft">Phase {phase.order}</span>
                  {isDone && <span className="text-sage-primary text-sm">✓</span>}
                </div>
                <h3 className="text-xl font-serif text-charcoal mb-1">{phase.shortName}</h3>
                <p className="text-xs text-grey-soft italic mb-4">{phase.window}</p>
                <div className="w-full bg-grey-soft/15 rounded-full h-1.5 mb-2">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${isDone ? 'bg-sage-primary' : 'bg-sage-muted'}`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-grey-soft">
                  <span>{stat.completed} of {stat.total}</span>
                  <span>{pct}%</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
