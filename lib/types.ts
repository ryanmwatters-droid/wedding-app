export interface Task {
  id: string
  phase: string
  phase_order: number
  task_order: number
  text: string
  category: string
  notes: string | null
  completed: boolean
  completed_by: string | null
  completed_at: string | null
}
