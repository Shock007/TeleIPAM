import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { AuthShell, authButton, authInput } from '@/components/AuthShell'
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
      <p className="text-center text-sm uppercase tracking-wide text-gray-500">Modulo / Autenticacion</p>
      <h1 className="mb-6 mt-4 text-center text-2xl text-[#00b85c]">Bienvenido de vuelta</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" autoComplete="off">
        <div className="grid gap-1">
          <label className="text-sm uppercase">Correo electronico</label>
          <input type="email" className={authInput} {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="grid gap-1">
          <label className="text-sm uppercase">Contraseña</label>
          <input type="password" className={authInput} {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <button type="submit" className={`${authButton} mt-2`} disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        ¿No tienes cuenta? <Link to="/register" className="text-red-500">Registrate aqui</Link>
      </p>
    </AuthShell>
  )
}