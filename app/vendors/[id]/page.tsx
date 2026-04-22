'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Vendor, VendorCategory, VENDOR_STATUSES, VendorStatus } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'

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

function ContactList({ label, values, onChange, placeholder }: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  const entries = values.length === 0 ? [''] : values
  return (
    <div>
      <div className="text-xs text-grey-soft mb-1">{label}</div>
      <div className="space-y-1">
        {entries.map((v, i) => (
          <div key={i} className="flex gap-1">
            <input
              value={v}
              onChange={(e) => {
                const next = [...entries]
                next[i] = e.target.value
                onChange(next.filter(x => x.trim() || x === ''))
              }}
              onBlur={() => onChange(entries.map(x => x.trim()).filter(Boolean))}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 text-sm bg-cream/40 border border-grey-soft/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
            />
            {entries.length > 1 && (
              <button type="button" onClick={() => onChange(entries.filter((_, j) => j !== i).map(x => x.trim()).filter(Boolean))} className="px-2 text-grey-soft hover:text-red-500">×</button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...entries.map(x => x.trim()).filter(Boolean), ''])} className="mt-1 text-xs text-sage-primary hover:text-sage-primary/80">
        + Add {label.toLowerCase()}
      </button>
    </div>
  )
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

function VendorDetail({ vendor, onUpdate, onDelete, onClose }: {
  vendor: Vendor
  onUpdate: (id: string, updates: Partial<Vendor>) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
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

      <button onClick={() => { onDelete(vendor.id); onClose() }} className="text-xs text-grey-soft hover:text-red-500 transition-colors">Delete vendor</button>
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

  const updateVendor = async (id: string, updates: Partial<Vendor>) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    try {
      const { error } = await supabase.from('vendors').update(updates).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Update failed:', err)
      setError('Failed to save.')
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
          <div className="bg-white rounded-2xl border border-grey-soft/20 overflow-hidden">
            {vendors.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className="w-full grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-cream/40 transition-colors border-b border-grey-soft/10 last:border-0"
              >
                <div className="min-w-0">
                  <div className="text-charcoal font-medium truncate">{v.business_name}</div>
                  <div className="text-xs text-grey-soft truncate">
                    {v.contact_name && `${v.contact_name} · `}
                    {v.last_contact_date ? `Last contact ${new Date(v.last_contact_date).toLocaleDateString()}` : 'No contact yet'}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${statusColor(v.status)}`}>{v.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-charcoal/40 flex items-end sm:items-center justify-center" onClick={() => setSelectedId(null)}>
          <div className="bg-white w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <VendorDetail vendor={selected} onUpdate={updateVendor} onDelete={deleteVendor} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
