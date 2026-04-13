'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { toast } from 'sonner'

const schema = z.object({ email: z.string().email('Invalid email'), password: z.string().min(1, 'Enter password') })

export default function LoginPage() {
  const { login } = useAuthStore()
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async ({ email, password }: any) => {
    const redirect = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirect') ?? '/account'
      : '/account'

    try {
      await login(email, password)
      router.push(redirect)
    } catch (err: any) {
      toast.error(err?.message ?? 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl">
        <h1 className="text-2xl font-display font-bold text-center mb-6">Login</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <input {...register('email')} type="email" className="mt-1 w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message as string}</p>}
          </div>
          <div>
            <div className="flex justify-between"><label className="text-sm text-muted-foreground">Password</label><Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link></div>
            <input {...register('password')} type="password" className="mt-1 w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          No account? <Link href="/auth/register" className="text-primary hover:underline">Register</Link>
        </p>
      </div>
    </div>
  )
}
