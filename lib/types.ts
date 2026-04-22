export interface Document {
  id: string
  storage_path: string
  display_name: string
  description: string | null
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
