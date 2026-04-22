'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Vendor, VendorCategory } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'

export default function VendorsOverview() {
  const { session, logout } = useAuth()
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newCatName, setNewCatName] = useState('')

  useEffect(() => {
    if (!session) return

    const fetchAll = async () => {
      try {
        const [catRes, venRes] = await Promise.all([
          supabase.from('vendor_categories').select('*').order('sort_order'),
          supabase.from('vendors').select('*')
        ])
        if (catRes.error) throw catRes.error
        if (venRes.error) throw venRes.error
        setCategories(catRes.data || [])
        setVendors(venRes.data || [])
      } catch (err) {
        console.error('Error fetching vendors:', err)
        setError('Failed to load vendors.')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()

    const channel = supabase
      .channel('vendors-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_categories' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, fetchAll)
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session])

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    const nextSort = (categories.reduce((max, c) => Math.max(max, c.sort_order), 0) || 0) + 1
    setNewCatName('')
    try {
      const { error } = await supabase.from('vendor_categories').insert({ name: newCatName.trim(), sort_order: nextSort })
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
        <p className="text-charcoal">Loading vendors...</p>
      </div>
    </div>
  )

  const vendorsByCategory = vendors.reduce((acc, v) => {
    if (!acc[v.category_id]) acc[v.category_id] = []
    acc[v.category_id].push(v)
    return acc
  }, {} as Record<string, Vendor[]>)

  const totalBooked = vendors.filter(v => v.status === 'Booked').length

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Home</Link>
          <h1 className="text-2xl font-serif text-charcoal">Vendors</h1>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
            <button onClick={() => setError('')} className="float-right ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 mb-6 border border-grey-soft/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-charcoal">{vendors.length}</div>
              <div className="text-xs text-grey-soft">Total leads</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-rose-accent">{vendors.filter(v => ['Contacted', 'Quoted', 'Meeting Scheduled'].includes(v.status)).length}</div>
              <div className="text-xs text-grey-soft">In progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-sage-primary">{totalBooked}</div>
              <div className="text-xs text-grey-soft">Booked</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {categories.map(cat => {
            const catVendors = vendorsByCategory[cat.id] || []
            const booked = catVendors.filter(v => v.status === 'Booked').length
            const isComplete = booked > 0
            return (
              <Link
                key={cat.id}
                href={`/vendors/${cat.id}`}
                className="block bg-white rounded-2xl p-5 border border-grey-soft/20 hover:border-sage-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-serif text-charcoal">{cat.name}</h3>
                  {isComplete && <span className="text-sage-primary text-sm">✓</span>}
                </div>
                <div className="text-sm text-grey-soft">
                  {catVendors.length === 0 ? 'No vendors yet' : `${catVendors.length} ${catVendors.length === 1 ? 'vendor' : 'vendors'}`}
                  {booked > 0 && ` · ${booked} booked`}
                </div>
              </Link>
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
