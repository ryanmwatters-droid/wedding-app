'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Document } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileIcon(mimeType: string | null): string {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽'
  if (mimeType.startsWith('video/')) return '🎞'
  if (mimeType.startsWith('audio/')) return '🎵'
  return '📄'
}

export default function DocumentsPage() {
  const { session, logout } = useAuth()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!session) return

    const fetchDocs = async () => {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        setDocs(data || [])
      } catch (err) {
        console.error('Error fetching documents:', err)
        setError('Failed to load documents.')
      } finally {
        setLoading(false)
      }
    }

    fetchDocs()

    const channel = supabase
      .channel('documents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setDocs(prev => prev.some(d => d.id === payload.new.id) ? prev : [payload.new as Document, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setDocs(prev => prev.map(d => d.id === payload.new.id ? payload.new as Document : d))
        } else if (payload.eventType === 'DELETE') {
          setDocs(prev => prev.filter(d => d.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [session])

  const folders = useMemo(() => {
    const set = new Set<string>()
    docs.forEach(d => { if (d.folder) set.add(d.folder) })
    return Array.from(set).sort()
  }, [docs])

  const visibleDocs = useMemo(() => {
    return currentFolder === null
      ? docs.filter(d => !d.folder)
      : docs.filter(d => d.folder === currentFolder)
  }, [docs, currentFolder])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !session) return
    setUploading(true)
    setError('')

    for (const file of files) {
      try {
        const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
        if (upErr) throw upErr

        const { error: insErr } = await supabase.from('documents').insert({
          storage_path: path,
          display_name: file.name,
          folder: currentFolder,
          uploaded_by: session.user.id,
          uploaded_by_email: session.user.email,
          size_bytes: file.size,
          mime_type: file.type || null
        })
        if (insErr) throw insErr
      } catch (err) {
        console.error('Upload failed:', err)
        setError(`Failed to upload ${file.name}`)
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openDoc = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 60 * 60)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error('Open failed:', err)
      setError('Failed to open file.')
    }
  }

  const updateDoc = async (id: string, updates: Partial<Document>) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
    try {
      const { error } = await supabase.from('documents').update(updates).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Update failed:', err)
      setError('Failed to save.')
    }
  }

  const deleteDoc = async (doc: Document) => {
    if (!confirm(`Delete "${doc.display_name}"?`)) return
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    try {
      await supabase.storage.from('documents').remove([doc.storage_path])
      const { error } = await supabase.from('documents').delete().eq('id', doc.id)
      if (error) throw error
    } catch (err) {
      console.error('Delete failed:', err)
      setError('Failed to delete.')
    }
  }

  const handleFolderChange = (doc: Document, value: string) => {
    if (value === '__new__') {
      const name = prompt('New folder name:')
      const trimmed = name?.trim()
      if (trimmed) updateDoc(doc.id, { folder: trimmed })
    } else {
      updateDoc(doc.id, { folder: value || null })
    }
  }

  const createFolder = () => {
    const name = prompt('New folder name:')
    const trimmed = name?.trim()
    if (!trimmed) return
    if (folders.includes(trimmed)) {
      setCurrentFolder(trimmed)
      return
    }
    // Folder is "created" by entering it; it'll be empty until a file is added.
    // Track empty folder by setting currentFolder. It won't persist until a file lands in it.
    setCurrentFolder(trimmed)
  }

  if (!session) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-sm text-grey-soft hover:text-charcoal transition-colors">← Home</Link>
          <h1 className="text-2xl font-serif text-charcoal">Documents</h1>
          <button onClick={logout} className="px-3 py-1 text-sm text-grey-soft hover:text-charcoal transition-colors">Logout</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
            <button onClick={() => setError('')} className="float-right ml-2 text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {currentFolder !== null && (
          <div className="mb-4">
            <button onClick={() => setCurrentFolder(null)} className="text-sm text-grey-soft hover:text-charcoal transition-colors">
              ← All documents
            </button>
            <h2 className="text-xl font-serif text-charcoal mt-1">📁 {currentFolder}</h2>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 mb-6 border border-grey-soft/20">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`block w-full text-center py-8 border-2 border-dashed border-grey-soft/30 rounded-xl cursor-pointer hover:border-sage-primary/50 hover:bg-cream/40 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {uploading ? (
              <div className="text-charcoal">Uploading...</div>
            ) : (
              <>
                <div className="text-3xl mb-2">📤</div>
                <div className="text-charcoal font-medium">
                  Tap to upload{currentFolder !== null ? ` to ${currentFolder}` : ''}
                </div>
                <div className="text-xs text-grey-soft mt-1">PDFs, images, docs · up to 50MB each</div>
              </>
            )}
          </label>
        </div>

        {currentFolder === null && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm uppercase tracking-wider text-grey-soft">Folders</h2>
              <button onClick={createFolder} className="text-xs text-sage-primary hover:text-sage-primary/80 transition-colors">+ New folder</button>
            </div>
            {folders.length === 0 ? (
              <div className="text-xs text-grey-soft italic">No folders yet. Create one above or organize files into folders below.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {folders.map(folder => {
                  const count = docs.filter(d => d.folder === folder).length
                  return (
                    <button
                      key={folder}
                      onClick={() => setCurrentFolder(folder)}
                      className="text-left bg-white rounded-xl border border-grey-soft/20 p-3 hover:border-sage-primary/40 hover:shadow-sm transition-all"
                    >
                      <div className="text-2xl mb-1">📁</div>
                      <div className="text-sm font-medium text-charcoal truncate">{folder}</div>
                      <div className="text-xs text-grey-soft">{count} {count === 1 ? 'file' : 'files'}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {currentFolder === null && folders.length > 0 && visibleDocs.length > 0 && (
          <h2 className="text-sm uppercase tracking-wider text-grey-soft mb-3">Unfiled</h2>
        )}

        {loading ? (
          <div className="text-center text-grey-soft py-8 text-sm">Loading...</div>
        ) : visibleDocs.length === 0 ? (
          <div className="text-center text-grey-soft py-8 text-sm italic">
            {currentFolder === null
              ? folders.length > 0 ? 'No unfiled documents.' : 'No documents yet. Upload your first one above.'
              : 'No files in this folder yet. Upload above.'
            }
          </div>
        ) : (
          <div className="space-y-2">
            {visibleDocs.map(doc => (
              <div key={doc.id} className="bg-white rounded-2xl border border-grey-soft/20 p-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => openDoc(doc)} className="text-3xl hover:scale-110 transition-transform" aria-label="Open">
                    {fileIcon(doc.mime_type)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <input
                      defaultValue={doc.display_name}
                      onBlur={(e) => { if (e.target.value.trim() && e.target.value !== doc.display_name) updateDoc(doc.id, { display_name: e.target.value.trim() }) }}
                      className="w-full font-medium text-charcoal bg-transparent border-b border-transparent hover:border-grey-soft/30 focus:border-sage-primary focus:outline-none"
                    />
                    <textarea
                      defaultValue={doc.description || ''}
                      onBlur={(e) => { if (e.target.value !== (doc.description || '')) updateDoc(doc.id, { description: e.target.value || null }) }}
                      placeholder="Add a description..."
                      rows={1}
                      className="mt-1 w-full text-sm text-grey-soft bg-transparent resize-none focus:outline-none placeholder:text-grey-soft/50"
                    />
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <select
                        value={doc.folder || ''}
                        onChange={(e) => handleFolderChange(doc, e.target.value)}
                        className="text-xs px-2 py-1 rounded-full border border-grey-soft/30 bg-cream/40 text-charcoal focus:outline-none focus:ring-1 focus:ring-sage-primary/30"
                      >
                        <option value="">📂 Unfiled</option>
                        {folders.map(f => <option key={f} value={f}>📁 {f}</option>)}
                        <option value="__new__">+ New folder...</option>
                      </select>
                      <span className="text-xs text-grey-soft">
                        {formatSize(doc.size_bytes)}
                        {doc.size_bytes && ' · '}
                        {new Date(doc.created_at).toLocaleDateString()}
                        {doc.uploaded_by_email && ` · ${doc.uploaded_by_email.split('@')[0]}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => openDoc(doc)} className="text-xs px-2 py-1 text-sage-primary hover:bg-sage-primary/10 rounded">Open</button>
                    <button onClick={() => deleteDoc(doc)} className="text-xs px-2 py-1 text-grey-soft hover:text-red-500">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
