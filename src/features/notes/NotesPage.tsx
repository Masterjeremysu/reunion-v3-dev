import { useState } from 'react'
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from './useNotes'
import { Card, Spinner, PageHeader, Button, EmptyState, Input, Textarea } from '../../components/ui'
import { FileText, Plus, Trash2, Archive } from 'lucide-react'
import { fDate } from '../../utils'

export function NotesPage() {
  const { data: notes, isLoading } = useNotes()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const { user } = { user: { id: '' } } as any

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [forDate, setForDate] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const filtered = notes?.filter(n => showArchived ? n.is_archived : !n.is_archived) ?? []

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const { data: { user } } = await import('../../lib/supabase').then(m => m.supabase.auth.getUser())
    await createNote.mutateAsync({ title: title.trim(), content: content || null, for_meeting_date: forDate || null, is_archived: false, user_id: user?.id ?? '' })
    setTitle(''); setContent(''); setForDate(''); setShowForm(false)
  }

  return (
    <div className="flex flex-col min-h-full bg-[#0f1117]">
      <PageHeader
        title="Notes de préparation"
        subtitle={`${filtered.length} note(s)`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowArchived(!showArchived)}>
              <Archive className="w-3.5 h-3.5" /> {showArchived ? 'Actives' : 'Archivées'}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-3.5 h-3.5" /> Nouvelle note
            </Button>
          </>
        }
      />

      <div className="p-6 flex flex-col gap-4">
        {showForm && (
          <Card className="p-4">
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de la note" required autoFocus />
              <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Contenu..." rows={4} />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Pour la réunion du</span>
                  <input type="date" value={forDate} onChange={e => setForDate(e.target.value)} className="bg-[#1e2333] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-teal-500" />
                </div>
                <div className="flex gap-2 ml-auto">
                  <Button variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>Annuler</Button>
                  <Button variant="primary" size="sm" type="submit">Créer</Button>
                </div>
              </div>
            </form>
          </Card>
        )}

        {isLoading && <div className="flex justify-center py-12"><Spinner /></div>}
        {!isLoading && filtered.length === 0 && (
          <EmptyState icon={FileText} title="Aucune note" description="Préparez vos réunions avec des notes" />
        )}

        <div className="grid grid-cols-2 gap-4">
          {filtered.map(n => (
            <Card key={n.id} className="p-4 flex flex-col gap-2 group">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white">{n.title}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => updateNote.mutate({ id: n.id, is_archived: !n.is_archived })}
                    className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors rounded">
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteNote.mutate(n.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {n.content && <p className="text-xs text-slate-400 line-clamp-3">{n.content}</p>}
              <div className="flex items-center gap-3 text-[10px] text-slate-600 mt-auto pt-2 border-t border-white/[0.05]">
                <span>{fDate(n.created_at)}</span>
                {n.for_meeting_date && <span className="text-teal-500">Réunion du {fDate(n.for_meeting_date)}</span>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
