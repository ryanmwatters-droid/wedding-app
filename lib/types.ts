export type VendorStatus = 'Lead' | 'Contacted' | 'Quoted' | 'Meeting Scheduled' | 'Booked' | 'Declined' | 'Not a Fit'

export const VENDOR_STATUSES: VendorStatus[] = ['Lead', 'Contacted', 'Quoted', 'Meeting Scheduled', 'Booked', 'Declined', 'Not a Fit']

export interface VendorCategory {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Vendor {
  id: string
  category_id: string
  business_name: string
  contact_name: string | null
  email: string[] | null
  phone: string[] | null
  website: string | null
  instagram: string | null
  status: VendorStatus
  estimated_cost: number | null
  quoted_cost: number | null
  deposit_paid: number | null
  first_contact_date: string | null
  last_contact_date: string | null
  next_action_date: string | null
  next_action: string | null
  recommended_by: string | null
  rating: number | null
  pros: string | null
  cons: string | null
  notes: string | null
  budget_item_id: string | null
  sort_order: number | null
  created_at: string
}

export interface BudgetSettings {
  id: string
  total_budget: number
  updated_at: string
}

export interface BudgetCategory {
  id: string
  name: string
  sort_order: number
  allocated: number
  created_at: string
}

export interface BudgetItem {
  id: string
  category_id: string
  name: string
  estimated: number
  actual: number
  vendor: string | null
  paid: boolean
  notes: string | null
  created_at: string
}

export interface EventVenue {
  id: string
  slug: string
  label: string
  venue_name: string | null
  venue_address: string | null
  venue_url: string | null
  event_date: string | null
  notes: string | null
  contact_name: string | null
  email: string[] | null
  phone: string[] | null
  instagram: string | null
  status: VendorStatus
  estimated_cost: number | null
  quoted_cost: number | null
  deposit_paid: number | null
  first_contact_date: string | null
  last_contact_date: string | null
  next_action_date: string | null
  next_action: string | null
  recommended_by: string | null
  rating: number | null
  pros: string | null
  cons: string | null
  sort_order: number | null
  created_at: string
}

export interface Document {
  id: string
  storage_path: string
  display_name: string
  description: string | null
  folder: string | null
  uploaded_by: string | null
  uploaded_by_email: string | null
  size_bytes: number | null
  mime_type: string | null
  created_at: string
}

export interface Message {
  id: string
  user_id: string
  user_email: string | null
  text: string
  created_at: string
}

export interface Guest {
  id: string
  name: string
  address: string | null
  email: string[] | null
  phone: string[] | null
  party_size: number
  invitation_sent: boolean
  rsvp_received: boolean
  attending: boolean | null
  meal: string | null
  notes: string | null
}

export interface Task {
  id: string
  phase: string
  phase_order: number
  task_order: number
  text: string
  category: string
  notes: string | null
  decision: string | null
  assigned_to: string | null
  completed: boolean
  completed_by: string | null
  completed_at: string | null
}
