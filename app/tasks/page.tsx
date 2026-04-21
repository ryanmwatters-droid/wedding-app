'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Task } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'
import confetti from 'canvas-confetti'

export default function TasksPage() {
  const { session, logout } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedPhases, setSelectedPhases] = useState<number[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1]))
  const [completedPhases, setCompletedPhases] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('phase_order')
          .order('task_order')
        if (error) throw error
        setTasks(data || [])
      } catch (err) {
        console.error('Error fetching tasks:', err)
        setError('Failed to load tasks. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setTasks(prev => {
            const newTasks = prev.map(t => t.id === payload.new.id ? payload.new as Task : t)
            checkPhaseCompletion(newTasks)
            return newTasks
          })
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session])

  const checkPhaseCompletion = (currentTasks: Task[]) => {
    const phases = Array.from(new Set(currentTasks.map(t => t.phase_order)))
    phases.forEach(phaseOrder => {
      const phaseTasks = currentTasks.filter(t => t.phase_order === phaseOrder)
      const allCompleted = phaseTasks.every(t => t.completed)
      if (allCompleted && !completedPhases.has(phaseOrder)) {
        setCompletedPhases(prev => new Set([...prev, phaseOrder]))
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      }
    })
  }

  const updateTask = async (id: string, completed: boolean) => {
    const completed_at = completed ? new Date().toISOString() : null
    const completed_by = completed ? session?.user.id ?? null : null
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, completed, completed_at, completed_by } : t)
      checkPhaseCompletion(next)
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

  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-primary mx-auto mb-4"></div>
        <p className="text-charcoal">Loading your wedding plan...</p>
      </div>
    </div>
  )

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const remainingTasks = totalTasks - completedTasks
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const phases = Array.from(new Set(tasks.map(t => t.phase_order))).sort()
  const tasksByPhase = phases.reduce((acc, phaseOrder) => {
    acc[phaseOrder] = tasks.filter(t => t.phase_order === phaseOrder)
    return acc
  }, {} as Record<number, Task[]>)

  const allCategories = Array.from(new Set(tasks.map(t => t.category)))
  const allAssignees = ['Unassigned', 'Anybody', 'Ryan', 'Hannah', 'Sue']

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Home</Link>
          <h1 className="text-2xl font-serif text-charcoal">Tasks</h1>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 mb-6 border border-grey-soft/20">
          <h2 className="text-lg font-medium text-charcoal mb-4">Progress</h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-sage-primary">{completedTasks}</div>
              <div className="text-sm text-grey-soft">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-charcoal">{remainingTasks}</div>
              <div className="text-sm text-grey-soft">Remaining</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-grey-soft/20 rounded-full h-2">
              <div className="bg-sage-primary h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}></div>
            </div>
            <div className="text-center text-sm text-grey-soft mt-2">{percentage}% Complete</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setSelectedPhases([])} className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedPhases.length === 0 ? 'bg-sage-primary text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}>All Phases</button>
            {phases.map(phase => (
              <button key={phase} onClick={() => setSelectedPhases(prev => prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase])} className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedPhases.includes(phase) ? 'bg-sage-primary text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}>Phase {phase}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
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

        <div className="space-y-4">
          {phases.filter(p => selectedPhases.length === 0 || selectedPhases.includes(p)).map(phaseOrder => {
            const phaseTasks = (tasksByPhase[phaseOrder] || [])
              .filter(t => selectedCategories.length === 0 || selectedCategories.includes(t.category))
              .filter(t => selectedAssignees.length === 0 || selectedAssignees.includes(t.assigned_to || 'Unassigned'))
            if (phaseTasks.length === 0) return null
            const phaseCompleted = phaseTasks.filter(t => t.completed).length
            const phaseTotal = phaseTasks.length
            const isExpanded = expandedPhases.has(phaseOrder)
            return (
              <div key={phaseOrder} className="bg-white rounded-2xl border border-grey-soft/20">
                <button onClick={() => setExpandedPhases(prev => new Set(prev.has(phaseOrder) ? [...prev].filter(p => p !== phaseOrder) : [...prev, phaseOrder]))} className="w-full p-4 text-left hover:bg-cream/30 transition-colors">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-charcoal">{phaseTasks[0]?.phase || `Phase ${phaseOrder}`}</h3>
                    <div className="text-sm text-grey-soft">{phaseCompleted}/{phaseTotal}</div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {phaseTasks.map(task => (
                      <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-cream/50 transition-colors">
                        <input type="checkbox" checked={task.completed} onChange={(e) => updateTask(task.id, e.target.checked)} className="mt-1" />
                        <div className="flex-1">
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
