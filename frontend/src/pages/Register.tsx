import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { AuthShell, authButton, authInput } from '@/components/AuthShell'
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label className="text-sm">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

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
    <AuthShell headerText="MODULO / AUTENTICACION">
      <h1 className="mb-3 text-center text-2xl uppercase text-[#00b85c]">Crear cuenta</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3" autoComplete="off">
        <Field label="Correo Electronico" error={errors.email?.message}>
          <input type="email" className={authInput} {...register('email')} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <input type="password" autoComplete="new-password" className={authInput} {...register('password')} />
        </Field>
        <Field label="Confirmar Contraseña" error={errors.confirm?.message}>
          <input type="password" autoComplete="new-password" className={authInput} {...register('confirm')} />
        </Field>
        <Field label="¿Posee la API de WispHub? Ingresela si quiere ahorrarse unos cuantos minutos."
          error={errors.wisphub_api_key?.message}>
          <input type="password" autoComplete="off" className={authInput} {...register('wisphub_api_key')} />
        </Field>
        <button type="submit" className={`${authButton} mt-2`} disabled={isSubmitting}>
          {isSubmitting ? 'Creando...' : 'Crear Cuenta'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        ¿Tienes cuenta? Inicia sesión <Link to="/login" className="text-red-500">aqui</Link>
      </p>
    </AuthShell>
  )
}