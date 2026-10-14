import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { Card } from '@/components/ui/card'

/** Fondo con franjas diagonales + tarjeta con el estilo del resto de la app. */
export function AuthShell({ headerText, children }: { headerText?: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-[300vw] -translate-x-1/2 -translate-y-1/2 -rotate-[41deg]">
        <div className="absolute left-0 w-full bg-[#7b6566]/70" style={{ top: '-20vw', height: '10vw' }} />
        <div className="absolute left-0 w-full bg-status-free/80" style={{ top: '-2.3vw', height: '10vw' }} />
      </div>

      <Card className="relative w-full max-w-sm gap-0 py-0">
        <div className="flex h-9 items-center justify-center bg-status-free/90 text-xs tracking-wide text-status-free-foreground">
          {headerText ?? 'MODULO / AUTENTICACION'}
        </div>
        <div className="px-6 pb-6 pt-5">{children}</div>
      </Card>
      <Toaster richColors position="top-right" />
    </div>
  )
}

/** Etiqueta con el mismo estilo que los formularios del resto de la app. */
export function AuthField({ label, error, children }: {
  label: string; error?: string; children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}