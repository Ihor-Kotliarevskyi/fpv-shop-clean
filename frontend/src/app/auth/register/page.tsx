'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { toast } from 'sonner'

const schema = z.object({
  firstName: z.string().min(2, 'Мінімум 2 символи'),
  lastName: z.string().min(2, 'Мінімум 2 символи'),
  email: z.string().email('Невірний email'),
  password: z.string().min(8, 'Мінімум 8 символів'),
  newsletter: z.boolean().default(false),
})

export default function RegisterPage() {
  const { register: registerUser } = useAuthStore()
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data: any) => {
    try { await registerUser(data); router.push('/account') }
    catch (err: any) { toast.error(err.response?.data?.error ?? 'Помилка реєстрації') }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl">
        <h1 className="text-2xl font-display font-bold text-center mb-6">Реєстрація</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[['firstName','Ім\'я'],['lastName','Прізвище']].map(([field, label]) => (
            <div key={field}>
              <label className="text-sm text-muted-foreground">{label}</label>
              <input {...register(field as any)} className="mt-1 w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none" />
              {errors[field as keyof typeof errors] && <p className="text-xs text-destructive mt-1">{errors[field as keyof typeof errors]?.message as string}</p>}
            </div>
          ))}
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <input {...register('email')} type="email" className="mt-1 w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Пароль (мін. 8 символів)</label>
            <input {...register('password')} type="password" className="mt-1 w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none" />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground">
            <input type="checkbox" {...register('newsletter')} className="rounded" />
            Підписатись на акції та новини
          </label>
          <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {isSubmitting ? 'Реєструємо...' : 'Зареєструватись'}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Вже є акаунт? <Link href="/auth/login" className="text-primary hover:underline">Увійти</Link>
        </p>
      </div>
    </div>
  )
}
