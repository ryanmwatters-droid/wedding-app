'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Message } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'

function shortName(email: string | null | undefined): string {
  if (!email) return 'Them'
  return email.split('@')[0].split('.')[0].replace(/^./, c => c.toUpperCase())
}

export default function MessagesPage() {
  const { session, logout } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session) return

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase.from('messages').select('*').order('created_at')
        if (error) throw error
        setMessages(data || [])
      } catch (err) {
        console.error('Error fetching messages:', err)
        setError('Failed to load messages.')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new as Message])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !session) return
    const draft = text.trim()
    setText('')

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      user_id: session.user.id,
      user_email: session.user.email ?? null,
      text: draft,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ user_id: session.user.id, user_email: session.user.email, text: draft })
        .select()
        .single()
      if (error) throw error
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data as Message : m))
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send.')
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setText(draft)
    }
  }

  const deleteMessage = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error deleting message:', err)
      setError('Failed to delete.')
    }
  }

  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <Link href="/" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Home</Link>
          <h1 className="text-2xl font-serif text-charcoal">Just Between Us</h1>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
            <button onClick={() => setError('')} className="float-right ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <div className="flex-1 bg-white rounded-2xl border border-grey-soft/20 p-4 overflow-y-auto mb-4 min-h-[400px]">
          {loading ? (
            <div className="text-center text-grey-soft py-8 text-sm">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-grey-soft py-12 text-sm italic">No messages yet. Say something sweet ✿</div>
          ) : (
            <div className="space-y-3">
              {messages.map(m => {
                const isMine = m.user_id === session.user.id
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] group`}>
                      <div className={`px-4 py-2 rounded-2xl ${isMine ? 'bg-sage-primary text-white rounded-br-sm' : 'bg-rose-accent/15 text-charcoal rounded-bl-sm'}`}>
                        <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
                      </div>
                      <div className={`flex items-center gap-2 mt-1 text-[10px] text-grey-soft ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span>{isMine ? 'You' : shortName(m.user_email)}</span>
                        <span>·</span>
                        <span>{new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                        {isMine && (
                          <button
                            onClick={() => deleteMessage(m.id)}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                          >
                            delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form onSubmit={send} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-white border border-grey-soft/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-5 py-3 bg-sage-primary text-white rounded-xl hover:bg-sage-primary/90 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
