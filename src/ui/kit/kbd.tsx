/* kit/kbd.tsx — вендорная зона (D-43/D-44). Источник: shadcn CLI 4.23.0
 * `add kbd`. ЛОКАЛЬНЫЕ ПРАВКИ к канону (пакетный апрув 03-01, Q1-политика «а»):
 *  - импорт cn: пакет "cn" → локальный '@/ui/kit/utils';
 *  - контракт .kbd (сохраняемый exception UI-SPEC Typography): моно 11px,
 *    container-фон, бордер outline-variant 1px с усиленным низом 2px, radius 4,
 *    line-height 1.2, weight 400; канонические h-5/min-w-5/font-medium сняты.
 * Обновление через `shadcn add kbd` — diff-merge с этой пометкой.
 */
import * as React from 'react'

import { cn } from '@/ui/kit/utils'

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-fit w-fit min-w-fit items-center justify-center gap-1 rounded-md border border-b-2 border-outline-variant bg-surface-container px-1 py-[2px] font-mono text-[11px] leading-[1.2] font-normal tracking-normal text-on-surface whitespace-nowrap select-none',
        className,
      )}
      {...props}
    />
  )
}

export { Kbd }
