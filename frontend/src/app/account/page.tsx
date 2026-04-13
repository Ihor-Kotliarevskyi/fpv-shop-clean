'use client'
import { useAuthStore } from '@/store/auth.store'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  newsletter: z.boolean().optional(),
})

export default function AccountProfilePage() {
  const { user, loadUser } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: user ?? {} })

  const onSubmit = async (data: any) => {
    try {
      await api.patch('/users/me', data)
      await loadUser()
      toast.success('Профіль збережено')
    } catch { toast.error('Помилка збереження') }
  }

  return (
    <div>
      <h1 className="text-xl font-display font-bold mb-6">Мій профіль</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-lg p-6 space-y-4 max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm text-muted-foreground">Ім'я</label><input {...register('firstName')} className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" /></div>
          <div><label className="text-sm text-muted-foreground">Прізвище</label><input {...register('lastName')} className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" /></div>
        </div>
        <div><label className="text-sm text-muted-foreground">Телефон</label><input {...register('phone')} className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" /></div>
        <div><label className="text-sm text-muted-foreground">Email</label><input value={user?.email} disabled className="mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground" /></div>
        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" {...register('newsletter')} className="rounded" /> Підписка на новини та акції</label>
        <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
          {isSubmitting ? 'Зберігаємо...' : 'Зберегти'}
        </button>
      </form>
    </div>
  )
}
