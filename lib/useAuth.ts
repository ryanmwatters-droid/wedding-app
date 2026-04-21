'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (!session) router.push('/login')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) router.push('/login')
    })
    return () => subscription.unsubscribe()
  }, [router])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return { session, loading, logout }
}
