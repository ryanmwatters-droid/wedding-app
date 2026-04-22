'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BudgetCategory, BudgetItem, BudgetSettings } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

export default function BudgetCategoryDetail() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { session, logout } = useAuth()
  const [category, setCategory] = useState<BudgetCategory | null>(null)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [settings, setSettings] = useState<BudgetSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newItemName, setNewItemName] = useState('')

  useEffect(() => {
    if (!session) return

    const fetchAll = async () => {
      try {
        const [catRes, itemRes, settingsRes] = await Promise.all([
          supabase.from('budget_categories').select('*').eq('id', params.id).single(),
          supabase.from('budget_items').select('*').eq('category_id', params.id).order('created_at'),
          supabase.from('budget_settings').select('*').limit(1).single()
        ])
        if (catRes.error) throw catRes.error
        if (itemRes.error) throw itemRes.error
        setCategory(catRes.data)
        setItems(itemRes.data || [])
        if (settingsRes.data) setSettings(settingsRes.data)
      } catch (err) {
        console.error('Error fetching:', err)
        setError('Failed to load category.')
        router.push('/budget')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()

    const channel = supabase
      .channel(`budget-cat-${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items', filter: `category_id=eq.${params.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_categories', filter: `id=eq.${params.id}` }, fetchAll)
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session, params.id, router])

  const updateCategory = async (updates: Partial<BudgetCategory>) => {
    if (!category) return
    setCategory({ ...category, ...updates })
    try {
      const { error } = await supabase.from('budget_categories').update(updates).eq('id', category.id)
      if (error) throw error
    } catch (err) {
      console.error('Update failed:', err)
      setError('Failed to save.')
    }
  }

  const updateItem = async (id: string, updates: Partial<BudgetItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    try {
      const { error } = await supabase.from('budget_items').update(updates).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Update failed:', err)
      setError('Failed to save.')
    }
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !category) return
    setNewItemName('')
    try {
      const { error } = await supabase.from('budget_items').insert({ category_id: category.id, name: newItemName.trim() })
      if (error) throw error
    } catch (err) {
      console.error('Add failed:', err)
      setError('Failed to add item.')
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      const { error } = await supabase.from('budget_items').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Delete failed:', err)
      setError('Failed to delete.')
    }
  }

  if (!session || !category) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>
  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-primary mx-auto mb-4"></div>
        <p className="text-charcoal">Loading...</p>
      </div>
    </div>
  )

  const spent = items.reduce((s, i) => s + (Number(i.actual) || 0), 0)
  const estimated = items.reduce((s, i) => s + (Number(i.estimated) || 0), 0)
  const allocated = Number(category.allocated) || 0
  const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0
  const over = spent > allocated && allocated > 0
  const totalBudget = Number(settings?.total_budget) || 0
  const allocPct = totalBudget > 0 ? (allocated / totalBudget) * 100 : 0

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/budget" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Budget</Link>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
            <button onClick={() => setError('')} className="float-right ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <div className="mb-6">
          <input
            defaultValue={category.name}
            onBlur={(e) => { if (e.target.value.trim() && e.target.value !== category.name) updateCategory({ name: e.target.value.trim() }) }}
            className="text-3xl font-serif text-charcoal bg-transparent border-b border-transparent hover:border-grey-soft/30 focus:border-sage-primary focus:outline-none w-full mb-3"
          />
          <div className="flex flex-wrap items-center gap-3 mb-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-grey-soft">Allocated: $</span>
              <input
                key={`dol-${allocated}`}
                type="number"
                min={0}
                step={100}
                defaultValue={allocated || ''}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value) || 0
                  if (v !== allocated) updateCategory({ allocated: v })
                }}
                placeholder="0"
                className="w-28 px-2 py-1 bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
              />
            </div>
            <div className="flex items-center gap-1">
              <input
                key={`pct-${allocPct.toFixed(1)}`}
                type="number"
                min={0}
                max={100}
                step={1}
                disabled={totalBudget === 0}
                defaultValue={allocPct > 0 ? allocPct.toFixed(allocPct < 10 ? 1 : 0) : ''}
                onBlur={(e) => {
                  const p = parseFloat(e.target.value) || 0
                  const newDollar = (p / 100) * totalBudget
                  if (newDollar !== allocated) updateCategory({ allocated: newDollar })
                }}
                placeholder={totalBudget === 0 ? '—' : '0'}
                className="w-16 px-2 py-1 bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30 disabled:opacity-40"
              />
              <span className="text-grey-soft">% of total</span>
            </div>
          </div>
          <div className="w-full bg-grey-soft/20 rounded-full h-2 mt-2">
            <div className={`h-2 rounded-full transition-all duration-500 ${over ? 'bg-rose-accent' : 'bg-sage-primary'}`} style={{ width: `${pct}%` }}></div>
          </div>
          <div className="flex justify-between text-xs text-grey-soft mt-1">
            <span>{fmt(spent)} spent · {fmt(estimated)} estimated</span>
            <span>{allocated > 0 ? `${pct}%` : ''}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-grey-soft/20 mb-3">
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 text-xs text-grey-soft border-b border-grey-soft/15">
            <div>Item</div>
            <div className="w-24 text-right">Estimated</div>
            <div className="w-24 text-right">Actual</div>
            <div className="w-12 text-center">Paid</div>
            <div className="w-7"></div>
          </div>
          {items.length === 0 ? (
            <div className="text-center text-grey-soft py-8 text-sm italic">No items yet. Add one below.</div>
          ) : (
            items.map(item => (
              <div key={item.id} className="border-b border-grey-soft/10 last:border-0 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center gap-2 sm:gap-3">
                  <input
                    defaultValue={item.name}
                    onBlur={(e) => { if (e.target.value.trim() && e.target.value !== item.name) updateItem(item.id, { name: e.target.value.trim() }) }}
                    className="font-medium text-charcoal bg-transparent border-b border-transparent hover:border-grey-soft/30 focus:border-sage-primary focus:outline-none px-1"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-grey-soft sm:hidden">Est:</span>
                    <span className="text-xs text-grey-soft">$</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      defaultValue={item.estimated || ''}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0
                        if (v !== item.estimated) updateItem(item.id, { estimated: v })
                      }}
                      placeholder="0"
                      className="w-20 px-2 py-1 text-sm text-right bg-cream/40 border border-grey-soft/20 rounded focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-grey-soft sm:hidden">Actual:</span>
                    <span className="text-xs text-grey-soft">$</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      defaultValue={item.actual || ''}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0
                        if (v !== item.actual) updateItem(item.id, { actual: v })
                      }}
                      placeholder="0"
                      className="w-20 px-2 py-1 text-sm text-right bg-cream/40 border border-grey-soft/20 rounded focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
                    />
                  </div>
                  <button
                    onClick={() => updateItem(item.id, { paid: !item.paid })}
                    className={`w-12 px-2 py-1 text-xs rounded-full transition-colors ${item.paid ? 'bg-sage-primary text-white' : 'bg-grey-soft/20 text-charcoal hover:bg-grey-soft/30'}`}
                  >
                    {item.paid ? '✓' : '—'}
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="text-grey-soft hover:text-red-500 transition-colors text-sm w-7">×</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <input
                    defaultValue={item.vendor || ''}
                    onBlur={(e) => { if (e.target.value !== (item.vendor || '')) updateItem(item.id, { vendor: e.target.value || null }) }}
                    placeholder="Vendor name"
                    className="px-3 py-1 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
                  />
                  <input
                    defaultValue={item.notes || ''}
                    onBlur={(e) => { if (e.target.value !== (item.notes || '')) updateItem(item.id, { notes: e.target.value || null }) }}
                    placeholder="Notes"
                    className="px-3 py-1 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={addItem} className="bg-white rounded-2xl p-4 border border-grey-soft/20 flex gap-2">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add new line item..."
            className="flex-1 px-3 py-2 text-sm border border-grey-soft/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary"
          />
          <button type="submit" disabled={!newItemName.trim()} className="px-4 py-2 bg-sage-primary text-white rounded-xl text-sm hover:bg-sage-primary/90 disabled:opacity-50 transition-colors">Add</button>
        </form>
      </div>
    </div>
  )
}
