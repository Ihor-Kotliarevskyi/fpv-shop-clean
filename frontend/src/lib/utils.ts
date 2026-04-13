import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number, currency = 'UAH') {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency', currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date))
}

export function slugify(text: string) {
  return text.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + '…' : str
}
