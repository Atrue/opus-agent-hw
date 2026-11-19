/* kit/tooltip.tsx — вендорная зона (D-43/D-44). Источник: shadcn CLI 4.23.0
 * `add tooltip`. ЛОКАЛЬНЫЕ ПРАВКИ к канону (пакетный апрув 03-01, Q1-политика «а»):
 *  - импорт cn: пакет "cn" → локальный '@/ui/kit/utils';
 *  - монопакет "radix-ui" → утвержденный @radix-ui/react-tooltip (тот же API);
 *  - Arrow убран: проектный num-hint (NumberHint) — прямоугольная подсказка
 *    без стрелки (контракт D-35 фикс 2 сохраняется).
 * Enter/exit — tw-animate-css (animate-in/fade/zoom) под глобальным
 * reduced-motion-гейтом (Pitfall 4 — ассерт animation-name === none).
 * Обновление через `shadcn add tooltip` — diff-merge с этой пометкой.
 */
import * as React from 'react'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '@/ui/kit/utils'

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
