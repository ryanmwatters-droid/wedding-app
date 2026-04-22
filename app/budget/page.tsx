'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BudgetCategory, BudgetItem, BudgetSettings } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

export default function BudgetOverview() {
  const { session, logout } = useAuth()
  const [settings, setSettings] = useState<BudgetSettings | null>(null)
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [items, setItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newCatName, setNewCatName] = useState('')

  useEffect(() => {
    if (!session) return

    const fetchAll = async () => {
      try {
        const [settingsRes, catRes, itemRes] = await Promise.all([
          supabase.from('budget_settings').select('*').limit(1).single(),
          supabase.from('budget_categories').select('*').order('sort_order'),
          supabase.from('budget_items').select('*')
        ])
        if (settingsRes.error) throw settingsRes.error
        if (catRes.error) throw catRes.error
        if (itemRes.error) throw itemRes.error
        setSettings(settingsRes.data)
        setCategories(catRes.data || [])
        setItems(itemRes.data || [])
      } catch (err) {
        console.error('Error fetching budget:', err)
        setError('Failed to load budget. Did you create the budget_settings table?')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()

    const channel = supabase
      .channel('budget-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_categories' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_settings' }, fetchAll)
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session])

  const updateTotal = async (total: number) => {
    if (!settings) return
    setSettings({ ...settings, total_budget: total })
    try {
      const { error } = await supabase.from('budget_settings').update({ total_budget: total, updated_at: new Date().toISOString() }).eq('id', settings.id)
      if (error) throw error
    } catch (err) {
      console.error('Update failed:', err)
      setError('Failed to save total.')
    }
  }

  const updateCategory = async (id: string, updates: Partial<BudgetCategory>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    try {
      const { error } = await supabase.from('budget_categories').update(updates).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error updating category:', err)
      setError('Failed to save.')
    }
  }

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    const nextSort = (categories.reduce((max, c) => Math.max(max, c.sort_order), 0) || 0) + 1
    setNewCatName('')
    try {
      const { error } = await supabase.from('budget_categories').insert({ name: newCatName.trim(), sort_order: nextSort })
      if (error) throw error
    } catch (err) {
      console.error('Error adding category:', err)
      setError('Failed to add category.')
    }
  }

  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>
  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-primary mx-auto mb-4"></div>
        <p className="text-charcoal">Loading budget...</p>
      </div>
    </div>
  )

  const totalBudget = settings?.total_budget || 0
  const itemsByCategory = items.reduce((acc, i) => {
    if (!acc[i.category_id]) acc[i.category_id] = []
    acc[i.category_id].push(i)
    return acc
  }, {} as Record<string, BudgetItem[]>)

  const totalAllocatedToCats = categories.reduce((s, c) => s + (Number(c.allocated) || 0), 0)
  const totalActual = items.reduce((s, i) => s + (Number(i.actual) || 0), 0)
  const totalEstimated = items.reduce((s, i) => s + (Number(i.estimated) || 0), 0)
  const overallPct = totalBudget > 0 ? Math.min(100, Math.round((totalActual / totalBudget) * 100)) : 0
  const overBudget = totalActual > totalBudget && totalBudget > 0
  const unallocated = totalBudget - totalAllocatedToCats

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Home</Link>
          <h1 className="text-2xl font-serif text-charcoal">Budget</h1>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
            <button onClick={() => setError('')} className="float-right ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 mb-6 border border-grey-soft/20">
          <h2 className="text-lg font-medium text-charcoal mb-3">Total Budget</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-serif text-charcoal">$</span>
            <input
              key={`total-${totalBudget}`}
              type="number"
              min={0}
              step={1000}
              defaultValue={totalBudget || ''}
              onBlur={(e) => {
                const v = parseFloat(e.target.value) || 0
                if (v !== totalBudget) updateTotal(v)
              }}
              placeholder="0"
              className="flex-1 text-2xl font-serif text-charcoal bg-transparent border-b border-grey-soft/30 focus:border-sage-primary focus:outline-none"
            />
          </div>
          <div className="w-full bg-grey-soft/20 rounded-full h-2 mb-2">
            <div className={`h-2 rounded-full transition-all duration-500 ${overBudget ? 'bg-rose-accent' : 'bg-sage-primary'}`} style={{ width: `${overallPct}%` }}></div>
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-grey-soft">
            <span>{fmt(totalActual)} spent · {fmt(totalEstimated)} estimated</span>
            <span>{overBudget ? `${fmt(totalActual - totalBudget)} over` : `${fmt(totalBudget - totalActual)} remaining`}</span>
          </div>
          {totalBudget > 0 && (
            <div className="mt-3 pt-3 border-t border-grey-soft/15 text-xs text-grey-soft flex justify-between">
              <span>Allocated to categories: {fmt(totalAllocatedToCats)}</span>
              <span className={unallocated < 0 ? 'text-rose-accent' : ''}>
                {unallocated >= 0 ? `${fmt(unallocated)} unallocated` : `${fmt(Math.abs(unallocated))} over-allocated`}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {categories.map(cat => {
            const catItems = itemsByCategory[cat.id] || []
            const spent = catItems.reduce((s, i) => s + (Number(i.actual) || 0), 0)
            const allocated = Number(cat.allocated) || 0
            const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0
            const over = spent > allocated && allocated > 0
            const allocPct = totalBudget > 0 ? (allocated / totalBudget) * 100 : 0

            return (
              <div key={cat.id} className="bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-sage-primary/40 hover:shadow-sm transition-all">
                <Link href={`/budget/${cat.id}`} className="block">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-serif text-charcoal">{cat.name}</h3>
                    <span className="text-xs text-grey-soft">{catItems.length} {catItems.length === 1 ? 'item' : 'items'}</span>
                  </div>
                </Link>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-grey-soft">$</span>
                    <input
                      key={`dol-${cat.id}-${allocated}`}
                      type="number"
                      min={0}
                      step={100}
                      defaultValue={allocated || ''}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0
                        if (v !== allocated) updateCategory(cat.id, { allocated: v })
                      }}
                      placeholder="0"
                      className="flex-1 px-2 py-1 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      key={`pct-${cat.id}-${allocPct.toFixed(1)}`}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      disabled={totalBudget === 0}
                      defaultValue={allocPct > 0 ? allocPct.toFixed(allocPct < 10 ? 1 : 0) : ''}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        const p = parseFloat(e.target.value) || 0
                        const newDollar = (p / 100) * totalBudget
                        if (newDollar !== allocated) updateCategory(cat.id, { allocated: newDollar })
                      }}
                      placeholder={totalBudget === 0 ? '—' : '0'}
                      className="flex-1 px-2 py-1 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30 disabled:opacity-40"
                    />
                    <span className="text-xs text-grey-soft">%</span>
                  </div>
                </div>
                <div className="w-full bg-grey-soft/15 rounded-full h-1.5 mb-2">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${over ? 'bg-rose-accent' : 'bg-sage-muted'}`} style={{ width: `${pct}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-grey-soft">
                  <span>{fmt(spent)} spent</span>
                  <span>{allocated > 0 ? `${pct}% of cat` : '—'}</span>
                </div>
              </div>
            )
          })}
        </div>

        <form onSubmit={addCategory} className="bg-white rounded-2xl p-4 border border-grey-soft/20 flex gap-2">
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Add new category..."
            className="flex-1 px-3 py-2 text-sm border border-grey-soft/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary"
          />
          <button type="submit" disabled={!newCatName.trim()} className="px-4 py-2 bg-sage-primary text-white rounded-xl text-sm hover:bg-sage-primary/90 disabled:opacity-50 transition-colors">Add</button>
        </form>
      </div>
    </div>
  )
}
