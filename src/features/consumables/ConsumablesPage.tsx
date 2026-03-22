import { useState } from 'react'
import { useConsumables, useCreateConsumable, useUpdateConsumableStatus } from './useConsumables'
import { useColleagues } from '../colleagues/useColleagues'
import { Card, Badge, Spinner, PageHeader, Button, EmptyState, Input } from '../../components/ui'
import { CONSUMABLE_STATUS } from '../../constants'
import { ShoppingCart, Plus, Trash2 } from 'lucide-react'
import { fDate } from '../../utils'
import { supabase } from '../../lib/supabase'

export function ConsumablesPage() {
  const { data: consumables, isLoading } = useConsumables()
  const { data: colleagues } = useColleagues()
  const createConsumable = useCreateConsumable()
  const updateStatus = useUpdateConsumableStatus()

  const [showForm, setShowForm] = useState(false)
  const [itemName, setItemName] = useState('')
  const [details, setDetails] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [requestedBy, setRequestedBy] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const filtered = consumables?.filter(c => filterStatus === 'all' || c.status === filterStatus) ?? []

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    await createConsumable.mutateAsync({
      item_name: itemName.trim(),
      details: details || null,
      quantity,
      requested_by_colleague_id: requestedBy || null,
      status: 'pending',
      user_id: user?.id ?? null,
    })
    setItemName(''); setDetails(''); setQuantity(1); setRequestedBy(''); setShowForm(false)
  }

  const statuses = ['all', 'pending', 'approved', 'ordered', 'delivered', 'rejected']
  const counts: Record<string, number> = { all: consumables?.length ?? 0 }
  consumables?.forEach(c => { counts[c.status] = (counts[c.status] ?? 0) + 1 })

  return (
    <div className="flex flex-col min-h-full bg-[#0f1117]">
      <PageHeader
        title="Demandes de consommables"
        subtitle={`${counts.pending ?? 0} en attente · ${counts.delivered ?? 0} livrée(s)`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" /> Nouvelle demande
          </Button>
        }
      />

      <div className="p-6 flex flex-col gap-4">
        {showForm && (
          <Card className="p-4">
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Article demandé" required className="col-span-2" />
                <input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                  className="bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500" />
              </div>
              <Input value={details} onChange={e => setDetails(e.target.value)} placeholder="Détails, références..." />
              <div className="flex items-center gap-2">
                <select value={requestedBy} onChange={e => setRequestedBy(e.target.value)} className="flex-1 bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500">
                  <option value="">Demandé par...</option>
                  {colleagues?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button variant="primary" size="sm" type="submit">Créer</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="flex gap-1">
          {statuses.map(s => {
            const st = CONSUMABLE_STATUS[s]
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  filterStatus === s ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}>
                {st?.label ?? 'Toutes'}
                <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{counts[s] ?? 0}</span>
              </button>
            )
          })}
        </div>

        {isLoading && <div className="flex justify-center py-12"><Spinner /></div>}
        {!isLoading && filtered.length === 0 && (
          <EmptyState icon={ShoppingCart} title="Aucune demande" description="Créez votre première demande de consommable" />
        )}

        {filtered.length > 0 && (
          <Card>
            <div className="divide-y divide-white/[0.05]">
              {filtered.map((c: any) => {
                const st = CONSUMABLE_STATUS[c.status]
                const col = colleagues?.find(co => co.id === c.requested_by_colleague_id)
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium">{c.item_name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                        <span>Qté : {c.quantity}</span>
                        {col && <span>{col.name}</span>}
                        {c.details && <span className="truncate max-w-xs">{c.details}</span>}
                        <span>{fDate(c.created_at)}</span>
                      </div>
                    </div>
                    <select
                      value={c.status}
                      onChange={e => updateStatus.mutate({ id: c.id, status: e.target.value })}
                      className="bg-transparent border-none text-xs outline-none cursor-pointer text-slate-400 hover:text-slate-200 mr-2"
                    >
                      <option value="pending">En attente</option>
                      <option value="approved">Approuvé</option>
                      <option value="ordered">Commandé</option>
                      <option value="delivered">Livré</option>
                      <option value="rejected">Rejeté</option>
                    </select>
                    <Badge variant={st?.color as any ?? 'gray'}>{st?.label ?? c.status}</Badge>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
