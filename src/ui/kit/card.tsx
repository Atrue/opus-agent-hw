/* kit/card.tsx — вендорная зона (D-43/D-44). Источник: shadcn CLI 4.23.0
 * `add card`. ЛОКАЛЬНЫЕ ПРАВКИ к канону (пакетный апрув 03-01, Q1-политика «а»):
 *  - импорт cn: пакет "cn" → локальный '@/ui/kit/utils';
 *  - контракты DESIGN.md / .card-семейства: container-low (bg-card через мост),
 *    radius 2 (rounded-sm), padding 16 (p-4), gap 8, shadow-card, min-height 0;
 *    шапка = flex-строка (.card-head), CardTitle — h2 с headline-sm Space Grotesk
 *    (все заголовки карточек проекта — h2, семантика заголовков сохранена);
 *    CardAction — правый мета-бейдж (ml-auto, on-surface-variant; .card-meta);
 *  - паддинги CardContent/Footer убраны: Card владеет p-4 сам (в проекте
 *    дети кладутся напрямую в Card).
 * Обновление через `shadcn add card` — diff-merge с этой пометкой.
 */
import * as React from 'react'

import { cn } from '@/ui/kit/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex min-h-0 flex-col gap-2 rounded-sm bg-card p-4 text-card-foreground shadow-card',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="card-title"
      className={cn(
        'font-display text-[calc(var(--ui-size)+2px)] leading-[1.2] font-semibold',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('ml-auto self-center text-on-surface-variant', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn(className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
