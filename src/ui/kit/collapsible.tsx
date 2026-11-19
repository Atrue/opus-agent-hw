/* kit/collapsible.tsx — вендорная зона (D-43/D-44). Источник: shadcn CLI
 * 4.23.0 `add collapsible`. ЛОКАЛЬНЫЕ ПРАВКИ к канону (пакетный апрув 03-01,
 * Q1-политика «а»):
 *  - монопакет "radix-ui" → утвержденный @radix-ui/react-collapsible;
 *  - убран "use client" (Next.js-директива, вне Vite);
 *  - в базовый класс Content добавлен canonical enter/exit: collapsible-down/
 *    collapsible-up (tw-animate-css читает --radix-collapsible-content-height,
 *    который выставляет сам Radix) — конверт 150–400 мс (D-48), глобальный
 *    reduced-motion-гейт гасит (Pitfall 4).
 * Обновление через `shadcn add collapsible` — diff-merge с этой пометкой.
 */
import type * as React from 'react'

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'

import { cn } from '@/ui/kit/utils'

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="collapsible-content"
      className={cn(
        'data-[state=open]:collapsible-down data-[state=closed]:collapsible-up',
        className,
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
