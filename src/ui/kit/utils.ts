import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn кита (вендорная зона D-44): канонический хелпер shadcn — конкатенация
 * className (clsx) + разрешение Tailwind-конфликтов (tailwind-merge).
 * Пакет `cn` из реестра НЕ ставится (пакетный апрув 03-01, Q1-политика «а»):
 * генерации CLI, импортирующие "cn", правятся на этот локальный импорт.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
