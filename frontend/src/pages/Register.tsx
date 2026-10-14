import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { AuthField, AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/http'

const schema = z
  .object({
    email: z.string().trim().refine((v) => z.email().safeParse(v).success, 'Correo no válido.'),
    password: z.string().min(8, 'Mínimo 8 caracteres.').max(128, 'Máximo 128 caracteres.'),
    confirm: z.string(),
    wisphub_api_key: z.string().trim().refine((v) => !/[\s#"'\\]/.test(v), 'La API key contiene caracteres no permitidos.'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden.' })
type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { user, register: signUp } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirm: '', wisphub_api_key: '' },
  })

  if (user) return <Navigate to="/" replace />

  const onSubmit = async (v: FormValues) => {
    try {
      const res = await signUp(v.email, v.password, v.wisphub_api_key)
      toast.success('Cuenta creada.')
      if (res.wisphub_saved) toast.success('API de WispHub guardada.')
      else if (v.wisphub_api_key)
        toast.info('La API de WispHub solo se guarda en la primera cuenta. Configúrala en Variables de entorno.')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <AuthShell>
      <h1 className="mb-4 text-xl font-semibold">Crear cuenta</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" autoComplete="off">
        <AuthField label="Correo electrónico" error={errors.email?.message}>
          <Input type="email" aria-invalid={!!errors.email} {...register('email')} />
        </AuthField>
        <AuthField label="Contraseña" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
        </AuthField>
        <AuthField label="Confirmar contraseña" error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register('confirm')} />
        </AuthField>
        <AuthField label="API de WispHub (opcional)" error={errors.wisphub_api_key?.message}>
          <Input type="password" autoComplete="off" aria-invalid={!!errors.wisphub_api_key} {...register('wisphub_api_key')} />
          <p className="text-xs text-muted-foreground">
            ¿La tienes? Ingrésala y te ahorras unos minutos de configuración.
          </p>
        </AuthField>
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creando...' : 'Crear cuenta'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        ¿Tienes cuenta? Inicia sesión{' '}
        <Link to="/login" className="font-medium text-destructive underline-offset-4 hover:underline">
          aquí
        </Link>
      </p>
    </AuthShell>
  )
}