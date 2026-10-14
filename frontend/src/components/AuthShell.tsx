import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

export const authInput =
  'h-10 w-full rounded-xl border-2 border-black bg-[#f1f1f1] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#6db857]'
export const authButton =
  'h-11 w-full rounded-xl border-2 border-black bg-[#6db857] text-lg text-white transition hover:brightness-95 disabled:opacity-60'

/** Fondo con dos franjas diagonales + tarjeta con cabecera verde. */
export function AuthShell({ headerText, children }: { headerText?: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white p-4">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-[300vw] -translate-x-1/2 -translate-y-1/2 -rotate-[41deg]">
        <div className="absolute left-0 w-full bg-[#7b6566]" style={{ top: '-20vw', height: '10vw' }} />
        <div className="absolute left-0 w-full bg-[#437c3a]" style={{ top: '-2.3vw', height: '10vw' }} />
      </div>

      <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] border-2 border-black bg-white">
        <div className="flex h-10 items-center justify-center bg-[#6db857] text-xs tracking-wide text-black/60">
          {headerText}
        </div>
        <div className="px-8 pb-7 pt-5">{children}</div>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}