import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/api/endpoints'
import { errorMessage } from '@/lib/http'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { STATUS_CLASSES, STATUS_LABELS } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { IPAddressRead } from '@/types/api'

type Target = 'FREE' | 'ACTIVE'

export function ReleaseDialog({ ip, clientName, onClose }: {
  ip: IPAddressRead; clientName?: string; onClose: () => void
}) {
  const qc = useQueryClient()
  const [target, setTarget] = useState<Target>('FREE')

  const mutation = useMutation({
    mutationFn: () => api.ips.release(ip.ip_address, { status: target }),
    onSuccess: (res) => {
      toast.success(`IP ${res.ip_address} liberada: ${STATUS_LABELS[res.status]}.`)
      qc.invalidateQueries({ queryKey: ['ips'] })
      onClose()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Actualizar estado de la IP</DialogTitle>
          <DialogDescription>
            Confirma el nuevo estado antes de guardarlo.
            {clientName && <> Se quitará el cliente <b>{clientName}</b>.</>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{ip.ip_address}</span>
          <StatusBadge status={ip.status} /> →
          <StatusBadge status={target} />
        </div>

        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">Haz clic en los botones para determinar el estado de la IP.</p>
          <div className="grid grid-cols-2 gap-2">
            {(['FREE', 'ACTIVE'] as Target[]).map((t) => (
              <Button key={t} type="button" onClick={() => setTarget(t)}
                variant="outline"
                className={cn('border-transparent', STATUS_CLASSES[t],
                  target !== t && 'opacity-40', target === t && 'ring-2 ring-foreground/40')}>
                {STATUS_LABELS[t]}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancelar</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Guardando...' : 'Actualizar estado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}