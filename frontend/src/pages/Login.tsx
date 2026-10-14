import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { AuthField, AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/http'

const schema = z.object({
  email: z.string().trim().refine((v) => z.email().safeParse(v).success, 'Correo no válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  if (user) return <Navigate to="/" replace />

  const onSubmit = async (v: FormValues) => {
    try {
      await login(v.email, v.password)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold">Bienvenido de vuelta</h1>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">Inicia sesión para continuar.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" autoComplete="off">
        <AuthField label="Correo electrónico" error={errors.email?.message}>
          <Input type="email" aria-invalid={!!errors.email} {...register('email')} />
        </AuthField>
        <AuthField label="Contraseña" error={errors.password?.message}>
          <Input type="password" aria-invalid={!!errors.password} {...register('password')} />
        </AuthField>
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-destructive underline-offset-4 hover:underline">
          Regístrate aquí
        </Link>
      </p>
    </AuthShell>
  )
}