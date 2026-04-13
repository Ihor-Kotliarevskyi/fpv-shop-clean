'use client'
import { useAuthStore } from '@/store/auth.store'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  newsletter: z.boolean().optional(),
})

type ProfileForm = z.infer<typeof schema>

export default function AccountProfilePage() {
  const { user, loadUser } = useAuthStore()

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: '',
      birthDate: '',
      newsletter: false,
    },
  })

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone || null,
          birth_date: data.birthDate || null,
          newsletter: !!data.newsletter,
        })
        .eq('id', user.id)

      if (error) throw error
      await loadUser()
      toast.success('Profile saved')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save profile')
    }
  }

  return (
    <div>
      <h1 className="text-xl font-display font-bold mb-6">My Profile</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-lg p-6 space-y-4 max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm text-muted-foreground">First name</label><input {...register('firstName')} className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" /></div>
          <div><label className="text-sm text-muted-foreground">Last name</label><input {...register('lastName')} className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" /></div>
        </div>
        <div><label className="text-sm text-muted-foreground">Phone</label><input {...register('phone')} className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" /></div>
        <div><label className="text-sm text-muted-foreground">Email</label><input value={user?.email ?? ''} disabled className="mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground" /></div>
        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" {...register('newsletter')} className="rounded" /> Subscribe to news and deals</label>
        <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  )
}
