import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/api/endpoints'
import { errorMessage } from '@/lib/http'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { STATUS_LABELS } from '@/lib/status'
import type { ClientRead } from '@/types/api'

export function ClientAssignIPDialog({ client, onClose }: { client: ClientRead; onClose: () => void }) {
  const qc = useQueryClient()
  const [ipId, setIpId] = useState('')
  const [description, setDescription] = useState('')
  const [subnetId, setSubnetId] = useState('all')

  const subnets = useQuery({ queryKey: ['subnets', 'all'], queryFn: () => api.subnets.list({ limit: 500 }) })

  // Asignables = sin cliente (FREE + ACTIVE). Cuelga de ['ips'] para refrescarse tras asignar.
  const available = useQuery({
    queryKey: ['ips', 'assignable'],
    queryFn: async () => {
      const [free, active] = await Promise.all([
        api.ips.list({ status: 'FREE', limit: 500 }),
        api.ips.list({ status: 'ACTIVE', limit: 500 }),
      ])
      return [...free.data, ...active.data].filter((i) => i.client_id === null)
    },
  })
  
  const cidrById = new Map(subnets.data?.map((s) => [s.id, s.cidr]))
  const all = available.data ?? []
  const list = subnetId === 'all' ? all : all.filter((i) => String(i.subnet_id) === subnetId)

  const subnetItems: Record<string, string> = { all: 'Todas las subredes' }
  subnets.data?.forEach((s) => { subnetItems[String(s.id)] = `${s.cidr} — ${s.name}` })

  const items: Record<string, string> = {}
  list.forEach((i) => {
    items[String(i.id)] =
      `${i.ip_address} · ${cidrById.get(i.subnet_id) ?? `#${i.subnet_id}`} · ${STATUS_LABELS[i.status]}`
  })

  const mutation = useMutation({
    mutationFn: () => {
      const ip = list.find((i) => String(i.id) === ipId)!
      return api.ips.assign(ip.ip_address, {
        status: 'ASSIGNED',
        client_id: client.id,
        description: description.trim() || undefined,
      })
    },
    onSuccess: (res) => {
      toast.success(`IP ${res.ip_address} asignada a ${client.full_name}.`)
      qc.invalidateQueries({ queryKey: ['ips'] })
      onClose()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar IP a {client.full_name}</DialogTitle>
          <DialogDescription>Elige una IP libre o activa sin registrar.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Subred</label>
          <Select value={subnetId} items={subnetItems}
            onValueChange={(v) => { setSubnetId(v ?? 'all'); setIpId('') }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {Object.entries(subnetItems).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Dirección IP</label>
          <Select value={ipId || null} items={items} disabled={available.isPending || list.length === 0}
            onValueChange={(v) => setIpId(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={available.isPending ? 'Cargando...' : 'Selecciona una IP'} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {list.map((i) => (
                <SelectItem key={i.id} value={String(i.id)}>{items[String(i.id)]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {available.isError && <p className="text-xs text-destructive">{errorMessage(available.error)}</p>}
          {available.isSuccess && list.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {subnetId === 'all'
                ? 'No hay IPs disponibles. Créalas en Direcciones IP.'
                : 'No hay IPs disponibles en esta subred.'}
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Descripción (opcional)</label>
          <textarea rows={2} placeholder="Ej. Router principal" value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30" />
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancelar</Button>
          <Button disabled={!ipId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Asignando...' : 'Asignar IP'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}