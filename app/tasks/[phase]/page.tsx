'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Task } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'
import { PHASES } from '@/lib/phases'
import confetti from 'canvas-confetti'

export default function PhaseDetailPage() {
  const params = useParams<{ phase: string }>()
  const router = useRouter()
  const phaseOrder = parseInt(params.phase, 10)
  const phaseMeta = PHASES.find(p => p.order === phaseOrder)

  const { session, logout } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [celebrated, setCelebrated] = useState(false)

  useEffect(() => {
    if (!phaseMeta) router.push('/tasks')
  }, [phaseMeta, router])

  useEffect(() => {
    if (!session || !phaseMeta) return

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('phase_order', phaseOrder)
          .order('task_order')
        if (error) throw error
        setTasks(data || [])
        if ((data || []).length > 0 && (data || []).every(t => t.completed)) setCelebrated(true)
      } catch (err) {
        console.error('Error fetching tasks:', err)
        setError('Failed to load tasks.')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()

    const channel = supabase
      .channel(`tasks-phase-${phaseOrder}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `phase_order=eq.${phaseOrder}` }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t))
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session, phaseOrder, phaseMeta])

  const checkCelebrate = (next: Task[]) => {
    if (next.length > 0 && next.every(t => t.completed) && !celebrated) {
      setCelebrated(true)
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
    }
    if (next.some(t => !t.completed)) setCelebrated(false)
  }

  const updateTask = async (id: string, completed: boolean) => {
    const completed_at = completed ? new Date().toISOString() : null
    const completed_by = completed ? session?.user.id ?? null : null
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, completed, completed_at, completed_by } : t)
      checkCelebrate(next)
      return next
    })
    if ('vibrate' in navigator) navigator.vibrate(50)
    try {
      const { error } = await supabase.from('tasks').update({ completed, completed_by, completed_at }).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error updating task:', err)
      setError('Failed to update task.')
    }
  }

  const updateDecision = async (id: string, decision: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, decision } : t))
    try {
      const { error } = await supabase.from('tasks').update({ decision }).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error saving decision:', err)
      setError('Failed to save.')
    }
  }

  const updateAssignment = async (id: string, assigned_to: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, assigned_to } : t))
    try {
      const { error } = await supabase.from('tasks').update({ assigned_to }).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error saving assignment:', err)
      setError('Failed to save.')
    }
  }

  if (!phaseMeta) return null
  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>
  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-primary mx-auto mb-4"></div>
        <p className="text-charcoal">Loading {phaseMeta.shortName}...</p>
      </div>
    </div>
  )

  const allCategories = Array.from(new Set(tasks.map(t => t.category)))
  const allAssignees = ['Unassigned', 'Anybody', 'Ryan', 'Hannah', 'Sue']

  const filteredTasks = tasks
    .filter(t => selectedCategories.length === 0 || selectedCategories.includes(t.category))
    .filter(t => selectedAssignees.length === 0 || selectedAssignees.includes(t.assigned_to || 'Unassigned'))

  const completed = tasks.filter(t => t.completed).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/tasks" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Tasks</Link>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
            <button onClick={() => setError('')} className="float-right ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-grey-soft mb-1">Phase {phaseMeta.order}</div>
          <h1 className="text-3xl font-serif text-charcoal mb-1">{phaseMeta.shortName}</h1>
          <p className="text-sm text-grey-soft italic mb-4">{phaseMeta.window}</p>
          <p className="text-sm text-charcoal/80 mb-4">{phaseMeta.description}</p>
          <div className="w-full bg-grey-soft/20 rounded-full h-2">
            <div className="bg-sage-primary h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
          </div>
          <div className="flex justify-between text-xs text-grey-soft mt-1">
            <span>{completed} of {total} done</span>
            <span>{pct}%</span>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedCategories([])} className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedCategories.length === 0 ? 'bg-rose-accent text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}>All Categories</button>
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])} className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedCategories.includes(cat) ? 'bg-rose-accent text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}>{cat}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedAssignees([])} className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedAssignees.length === 0 ? 'bg-dusty-blue text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}>All People</button>
            {allAssignees.map(person => (
              <button key={person} onClick={() => setSelectedAssignees(prev => prev.includes(person) ? prev.filter(p => p !== person) : [...prev, person])} className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedAssignees.includes(person) ? 'bg-dusty-blue text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}>{person}</button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-grey-soft/20 p-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center text-grey-soft py-8 text-sm">No tasks match these filters.</div>
          ) : (
            <div className="divide-y divide-grey-soft/10">
              {filteredTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-cream/50 transition-colors">
                  <input type="checkbox" checked={task.completed} onChange={(e) => updateTask(task.id, e.target.checked)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className={`text-charcoal transition-all duration-300 ${task.completed ? 'line-through opacity-60' : ''}`}>{task.text}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-1 bg-sage-muted text-charcoal text-xs rounded-full">{task.category}</span>
                      <select value={task.assigned_to || 'Unassigned'} onChange={(e) => updateAssignment(task.id, e.target.value)} className="px-2 py-1 text-xs rounded-full border border-rose-accent/40 bg-rose-accent/10 text-charcoal focus:outline-none focus:ring-1 focus:ring-rose-accent/40">
                        <option value="Unassigned">Unassigned</option>
                        <option value="Anybody">Anybody</option>
                        <option value="Ryan">Ryan</option>
                        <option value="Hannah">Hannah</option>
                        <option value="Sue">Sue</option>
                      </select>
                      {task.notes && <span className="text-grey-soft italic text-sm">{task.notes}</span>}
                    </div>
                    <textarea defaultValue={task.decision || ''} onBlur={(e) => { if (e.target.value !== (task.decision || '')) updateDecision(task.id, e.target.value) }} placeholder="What we decided…" className="mt-2 w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30 focus:border-sage-primary placeholder:text-grey-soft/60" rows={1} />
                    {task.completed && task.completed_at && (
                      <div className="text-xs text-grey-soft mt-1">Completed {new Date(task.completed_at).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
