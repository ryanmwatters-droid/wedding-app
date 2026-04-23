'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Vendor, VendorCategory, VENDOR_STATUSES, VendorStatus } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'
import { VENDOR_TO_BUDGET_CATEGORY } from '@/lib/vendor-budget-map'
import { ContactList } from '@/components/ContactList'

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

function prettyUrl(u: string): string {
  try {
    const url = new URL(u.startsWith('http') ? u : `https://${u}`)
    return url.hostname.replace(/^www\./, '') + (url.pathname !== '/' ? url.pathname : '')
  } catch {
    return u
  }
}

function fullUrl(u: string): string {
  return u.startsWith('http') ? u : `https://${u}`
}

function igUrl(handle: string): string {
  const h = handle.replace(/^@/, '').trim()
  return `https://instagram.com/${h}`
}

function shortDate(d: string): string {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const statusColor = (s: VendorStatus): string => {
  switch (s) {
    case 'Booked': return 'bg-sage-primary text-white'
    case 'Contacted': return 'bg-dusty-blue/20 text-dusty-blue border border-dusty-blue/40'
    case 'Quoted': return 'bg-rose-accent/20 text-rose-accent border border-rose-accent/40'
    case 'Meeting Scheduled': return 'bg-rose-accent text-white'
    case 'Declined':
    case 'Not a Fit': return 'bg-grey-soft/20 text-grey-soft line-through'
    default: return 'bg-grey-soft/15 text-charcoal'
  }
}

function StarRating({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={`text-lg ${(value || 0) >= n ? 'text-rose-accent' : 'text-grey-soft/30'} hover:text-rose-accent transition-colors`}
        >
          ★
        </button>
      ))}
      {value && <button type="button" onClick={() => onChange(null)} className="text-xs text-grey-soft hover:text-charcoal ml-1">clear</button>}
    </div>
  )
}

function VendorDetail({ vendor, categoryName, onUpdate, onDelete, onUnlinkBudget, onClose }: {
  vendor: Vendor
  categoryName: string
  onUpdate: (id: string, updates: Partial<Vendor>) => void
  onDelete: (id: string) => void
  onUnlinkBudget: (id: string) => void
  onClose: () => void
}) {
  const mappedBudgetCategory = VENDOR_TO_BUDGET_CATEGORY[categoryName]
  return (
    <div className="p-4">
      <div className="flex justify-between items-start gap-2 mb-4">
        <input
          defaultValue={vendor.business_name}
          onBlur={(e) => { if (e.target.value.trim() && e.target.value !== vendor.business_name) onUpdate(vendor.id, { business_name: e.target.value.trim() }) }}
          className="flex-1 text-xl font-serif text-charcoal bg-transparent border-b border-transparent hover:border-grey-soft/30 focus:border-sage-primary focus:outline-none px-1"
        />
        <button onClick={onClose} className="text-grey-soft hover:text-charcoal text-xl px-2">×</button>
      </div>

      <div className="mb-4">
        <select
          value={vendor.status}
          onChange={(e) => onUpdate(vendor.id, { status: e.target.value as VendorStatus })}
          className={`px-3 py-1 text-sm rounded-full focus:outline-none ${statusColor(vendor.status)}`}
        >
          {VENDOR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <div className="text-xs text-grey-soft mb-1">Contact person</div>
        <input
          defaultValue={vendor.contact_name || ''}
          onBlur={(e) => { if (e.target.value !== (vendor.contact_name || '')) onUpdate(vendor.id, { contact_name: e.target.value || null }) }}
          placeholder="Who you spoke with"
          className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <ContactList label="Email" values={vendor.email || []} onChange={(next) => onUpdate(vendor.id, { email: next })} placeholder="email@vendor.com" />
        <ContactList label="Phone" values={vendor.phone || []} onChange={(next) => onUpdate(vendor.id, { phone: next })} placeholder="555-555-5555" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">Website</div>
          <input
            defaultValue={vendor.website || ''}
            onBlur={(e) => { if (e.target.value !== (vendor.website || '')) onUpdate(vendor.id, { website: e.target.value || null }) }}
            placeholder="https://..."
            className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Instagram</div>
          <input
            defaultValue={vendor.instagram || ''}
            onBlur={(e) => { if (e.target.value !== (vendor.instagram || '')) onUpdate(vendor.id, { instagram: e.target.value || null }) }}
            placeholder="@handle"
            className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">Estimated $</div>
          <input
            type="number"
            min={0}
            step={100}
            defaultValue={vendor.estimated_cost || ''}
            onBlur={(e) => { const v = e.target.value ? parseFloat(e.target.value) : null; if (v !== vendor.estimated_cost) onUpdate(vendor.id, { estimated_cost: v }) }}
            placeholder="0"
            className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Quoted $</div>
          <input
            type="number"
            min={0}
            step={100}
            defaultValue={vendor.quoted_cost || ''}
            onBlur={(e) => { const v = e.target.value ? parseFloat(e.target.value) : null; if (v !== vendor.quoted_cost) onUpdate(vendor.id, { quoted_cost: v }) }}
            placeholder="0"
            className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Deposit $</div>
          <input
            type="number"
            min={0}
            step={100}
            defaultValue={vendor.deposit_paid || ''}
            onBlur={(e) => { const v = e.target.value ? parseFloat(e.target.value) : null; if (v !== vendor.deposit_paid) onUpdate(vendor.id, { deposit_paid: v }) }}
            placeholder="0"
            className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">First contact</div>
          <input
            type="date"
            defaultValue={vendor.first_contact_date || ''}
            onBlur={(e) => { if (e.target.value !== (vendor.first_contact_date || '')) onUpdate(vendor.id, { first_contact_date: e.target.value || null }) }}
            className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Last contact</div>
          <input
            type="date"
            defaultValue={vendor.last_contact_date || ''}
            onBlur={(e) => { if (e.target.value !== (vendor.last_contact_date || '')) onUpdate(vendor.id, { last_contact_date: e.target.value || null }) }}
            className="w-full px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">Next action date</div>
          <input
            type="date"
            defaultValue={vendor.next_action_date || ''}
            onBlur={(e) => { if (e.target.value !== (vendor.next_action_date || '')) onUpdate(vendor.id, { next_action_date: e.target.value || null }) }}
            className="px-2 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Next action</div>
          <input
            defaultValue={vendor.next_action || ''}
            onBlur={(e) => { if (e.target.value !== (vendor.next_action || '')) onUpdate(vendor.id, { next_action: e.target.value || null }) }}
            placeholder="e.g. Send follow-up email"
            className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">Recommended by</div>
          <input
            defaultValue={vendor.recommended_by || ''}
            onBlur={(e) => { if (e.target.value !== (vendor.recommended_by || '')) onUpdate(vendor.id, { recommended_by: e.target.value || null }) }}
            placeholder="Friend, planner, etc."
            className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Rating</div>
          <StarRating value={vendor.rating} onChange={(n) => onUpdate(vendor.id, { rating: n })} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-grey-soft mb-1">Pros</div>
          <textarea
            defaultValue={vendor.pros || ''}
            onBlur={(e) => { if (e.target.value !== (vendor.pros || '')) onUpdate(vendor.id, { pros: e.target.value || null }) }}
            placeholder="What we love..."
            rows={2}
            className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
        <div>
          <div className="text-xs text-grey-soft mb-1">Cons</div>
          <textarea
            defaultValue={vendor.cons || ''}
            onBlur={(e) => { if (e.target.value !== (vendor.cons || '')) onUpdate(vendor.id, { cons: e.target.value || null }) }}
            placeholder="Concerns..."
            rows={2}
            className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
          />
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-grey-soft mb-1">Notes</div>
        <textarea
          defaultValue={vendor.notes || ''}
          onBlur={(e) => { if (e.target.value !== (vendor.notes || '')) onUpdate(vendor.id, { notes: e.target.value || null }) }}
          placeholder="Anything else..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-sage-primary/30 placeholder:text-grey-soft/60"
        />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-grey-soft/15">
        <div className="text-xs text-grey-soft">
          {vendor.budget_item_id ? (
            <span className="text-sage-primary">✓ Linked to Budget {mappedBudgetCategory ? `· ${mappedBudgetCategory}` : ''}</span>
          ) : vendor.status === 'Booked' && !mappedBudgetCategory ? (
            <span>No matching budget category</span>
          ) : vendor.status === 'Booked' ? (
            <span>Will link to Budget on save</span>
          ) : (
            <span className="text-grey-soft/60">Budget sync when booked</span>
          )}
        </div>
        <div className="flex gap-3">
          {vendor.budget_item_id && (
            <button onClick={() => onUnlinkBudget(vendor.id)} className="text-xs text-grey-soft hover:text-charcoal transition-colors">Unlink</button>
          )}
          <button onClick={() => { onDelete(vendor.id); onClose() }} className="text-xs text-grey-soft hover:text-red-500 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function VendorCategoryDetail() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { session, logout } = useAuth()
  const [category, setCategory] = useState<VendorCategory | null>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return

    const fetchAll = async () => {
      try {
        const [catRes, venRes] = await Promise.all([
          supabase.from('vendor_categories').select('*').eq('id', params.id).single(),
          supabase.from('vendors').select('*').eq('category_id', params.id).order('created_at')
        ])
        if (catRes.error) throw catRes.error
        if (venRes.error) throw venRes.error
        setCategory(catRes.data)
        setVendors(venRes.data || [])
      } catch (err) {
        console.error('Error fetching:', err)
        setError('Failed to load.')
        router.push('/vendors')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()

    const channel = supabase
      .channel(`vendor-cat-${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors', filter: `category_id=eq.${params.id}` }, fetchAll)
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session, params.id, router])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null) }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const syncToBudget = async (next: Vendor) => {
    if (!category) return
    const budgetCategoryName = VENDOR_TO_BUDGET_CATEGORY[category.name]
    if (!budgetCategoryName) return

    const cost = next.quoted_cost ?? next.estimated_cost ?? 0

    if (next.budget_item_id) {
      await supabase.from('budget_items').update({
        name: next.business_name,
        actual: cost
      }).eq('id', next.budget_item_id)
      return
    }

    const { data: budgetCat } = await supabase
      .from('budget_categories')
      .select('id')
      .eq('name', budgetCategoryName)
      .single()
    if (!budgetCat) return

    const { data: newItem } = await supabase
      .from('budget_items')
      .insert({ category_id: budgetCat.id, name: next.business_name, actual: cost })
      .select()
      .single()
    if (!newItem) return

    await supabase.from('vendors').update({ budget_item_id: newItem.id }).eq('id', next.id)
    setVendors(prev => prev.map(v => v.id === next.id ? { ...v, budget_item_id: newItem.id } : v))
  }

  const updateVendor = async (id: string, updates: Partial<Vendor>) => {
    const current = vendors.find(v => v.id === id)
    if (!current) return
    const next = { ...current, ...updates }
    setVendors(prev => prev.map(v => v.id === id ? next : v))
    try {
      const { error } = await supabase.from('vendors').update(updates).eq('id', id)
      if (error) throw error

      const becameBooked = updates.status === 'Booked' && current.status !== 'Booked'
      const relevantFieldChanged = 'quoted_cost' in updates || 'business_name' in updates || 'estimated_cost' in updates
      if (becameBooked || (next.budget_item_id && relevantFieldChanged)) {
        await syncToBudget(next)
      }
    } catch (err) {
      console.error('Update failed:', err)
      setError('Failed to save.')
    }
  }

  const unlinkBudget = async (id: string) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, budget_item_id: null } : v))
    try {
      const { error } = await supabase.from('vendors').update({ budget_item_id: null }).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Unlink failed:', err)
      setError('Failed to unlink.')
    }
  }

  const addVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !category) return
    setNewName('')
    try {
      const { error } = await supabase.from('vendors').insert({ category_id: category.id, business_name: newName.trim() })
      if (error) throw error
    } catch (err) {
      console.error('Add failed:', err)
      setError('Failed to add vendor.')
    }
  }

  const deleteVendor = async (id: string) => {
    setVendors(prev => prev.filter(v => v.id !== id))
    try {
      const { error } = await supabase.from('vendors').delete().eq('id', id)
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

  const selected = vendors.find(v => v.id === selectedId) || null

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/vendors" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Vendors</Link>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
            <button onClick={() => setError('')} className="float-right ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <h1 className="text-3xl font-serif text-charcoal mb-6">{category.name}</h1>

        <form onSubmit={addVendor} className="bg-white rounded-2xl p-4 mb-6 border border-grey-soft/20 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add vendor name..."
            className="flex-1 px-3 py-2 border border-grey-soft/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary"
          />
          <button type="submit" disabled={!newName.trim()} className="px-4 py-2 bg-sage-primary text-white rounded-xl text-sm hover:bg-sage-primary/90 disabled:opacity-50 transition-colors">Add</button>
        </form>

        {vendors.length === 0 ? (
          <div className="text-center text-grey-soft py-8 italic">No vendors in this category yet.</div>
        ) : (
          <div className="space-y-2">
            {vendors.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(v.id) }}
                className="bg-white rounded-2xl border border-grey-soft/20 p-4 cursor-pointer hover:border-sage-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-charcoal font-medium text-base">{v.business_name}</div>
                    {v.contact_name && <div className="text-xs text-grey-soft">{v.contact_name}</div>}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${statusColor(v.status)}`}>{v.status}</span>
                </div>

                {(v.website || v.instagram) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-2">
                    {v.website && (
                      <a
                        href={fullUrl(v.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sage-primary hover:underline truncate max-w-[260px]"
                      >
                        ↗ {prettyUrl(v.website)}
                      </a>
                    )}
                    {v.instagram && (
                      <a
                        href={igUrl(v.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-rose-accent hover:underline"
                      >
                        @{v.instagram.replace(/^@/, '')}
                      </a>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-grey-soft">
                  {v.last_contact_date && <span>Last: {shortDate(v.last_contact_date)}</span>}
                  {v.next_action_date && (
                    <span>
                      Next: {shortDate(v.next_action_date)}
                      {v.next_action ? ` · ${v.next_action}` : ''}
                    </span>
                  )}
                  {v.quoted_cost != null && <span className="text-charcoal">Quoted: {fmt(Number(v.quoted_cost))}</span>}
                  {v.estimated_cost != null && v.quoted_cost == null && <span>Est: {fmt(Number(v.estimated_cost))}</span>}
                  {v.rating != null && (
                    <span className="text-rose-accent">{'★'.repeat(v.rating)}<span className="text-grey-soft/30">{'★'.repeat(5 - v.rating)}</span></span>
                  )}
                  {v.recommended_by && <span>via {v.recommended_by}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 flex items-end sm:items-center justify-center" onClick={() => setSelectedId(null)}>
          <div className="bg-white w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <VendorDetail vendor={selected} categoryName={category.name} onUpdate={updateVendor} onDelete={deleteVendor} onUnlinkBudget={unlinkBudget} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
