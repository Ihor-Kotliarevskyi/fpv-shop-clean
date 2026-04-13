'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { toast } from 'sonner'

const schema = z.object({
  firstName: z.string().min(2, 'РњС–РЅС–РјСѓРј 2 СЃРёРјРІРѕР»Рё'),
  lastName: z.string().min(2, 'РњС–РЅС–РјСѓРј 2 СЃРёРјРІРѕР»Рё'),
  email: z.string().email('РќРµРІС–СЂРЅРёР№ email'),
  password: z.string().min(8, 'РњС–РЅС–РјСѓРј 8 СЃРёРјРІРѕР»С–РІ'),
  newsletter: z.boolean().default(false),
})

export default function RegisterPage() {
  const { register: registerUser } = useAuthStore()
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data: any) => {
    try { await registerUser(data); router.push('/account') }
    catch (err: any) { toast.error(err?.message ?? 'РџРѕРјРёР»РєР° СЂРµС”СЃС‚СЂР°С†С–С—') }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl">
        <h1 className="text-2xl font-display font-bold text-center mb-6">Р РµС”СЃС‚СЂР°С†С–СЏ</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[['firstName','Р†Рј\'СЏ'],['lastName','РџСЂС–Р·РІРёС‰Рµ']].map(([field, label]) => (
            <div key={field}>
              <label className="text-sm text-muted-foreground">{label}</label>
              <input {...register(field as any)} className="mt-1 w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none" />
              {errors[field as keyof typeof errors] && <p className="text-xs text-destructive mt-1">{errors[field as keyof typeof errors]?.message as string}</p>}
            </div>
          ))}
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <input {...register('email')} type="email" className="mt-1 w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message as string}</p>}
          </div>
          <div>
            <label className="text-sm text-muted-foreground">РџР°СЂРѕР»СЊ (РјС–РЅ. 8 СЃРёРјРІРѕР»С–РІ)</label>
            <input {...register('password')} type="password" className="mt-1 w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none" />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message as string}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground">
            <input type="checkbox" {...register('newsletter')} className="rounded" />
            РџС–РґРїРёСЃР°С‚РёСЃСЊ РЅР° Р°РєС†С–С— С‚Р° РЅРѕРІРёРЅРё
          </label>
          <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {isSubmitting ? 'Р РµС”СЃС‚СЂСѓС”РјРѕ...' : 'Р—Р°СЂРµС”СЃС‚СЂСѓРІР°С‚РёСЃСЊ'}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Р’Р¶Рµ С” Р°РєР°СѓРЅС‚? <Link href="/auth/login" className="text-primary hover:underline">РЈРІС–Р№С‚Рё</Link>
        </p>
      </div>
    </div>
  )
}
