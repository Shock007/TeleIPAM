import { Badge } from '@/components/ui/badge'

export function NoResponseBadge() {
  return (
    <Badge className="border-transparent bg-status-assigned/70 text-status-assigned-foreground">
      Asignada sin respuesta
    </Badge>
  )
}