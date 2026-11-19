/* kit/button.tsx — вендорная зона (D-43/D-44). Источник: shadcn CLI 4.23.0
 * `add button` (components.json, style new-york). ЛОКАЛЬНЫЕ ПРАВКИ к канону
 * (D-44, пакетный апрув 03-01 Task 1):
 *  - импорт cn: пакет "cn" → локальный '@/ui/kit/utils' (Q1-политика «а»,
 *    пакет cn не ставится);
 *  - убраны asChild + Slot (монопакет radix-ui вне апрув-таблицы; потребитель
 *    asChild в фазе 3 нет);
 *  - variant/size-таблицы адаптированы под контракты DESIGN.md / .btn-семейство
 *    (D-38/D-49: стилистика «приборной» темы; коллизионные слоты primary/
 *    secondary/accent не используются — проектные утилиты напрямую, D-39);
 *  - focus-visible — глобальный :focus-visible проекта (outline 2px primary),
 *    канонические ring-классы CLI убраны.
 * Обновление через `shadcn add button` — diff-merge с этой пометкой.
 */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/ui/kit/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md whitespace-nowrap transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        /* CTA («Шаг» / «Следующая эпоха») — единственная заливка на экране:
         * primary-container → hover мята, active темнее (mix 85% black) */
        default:
          'border border-transparent bg-primary-container text-on-primary-container enabled:hover:bg-primary enabled:active:bg-[color-mix(in_srgb,var(--color-primary-container)_85%,black)]',
        /* quiet — прозрачный фон + hairline-бордер (was .btn) */
        quiet:
          'border border-outline-variant bg-transparent text-on-surface enabled:hover:border-outline enabled:hover:bg-surface-container-high enabled:active:bg-surface-container-highest',
        /* toggle — quiet + pressed-состояние мятным контуром, не заливкой (was .btn[aria-pressed]) */
        toggle:
          'border border-outline-variant bg-transparent text-on-surface aria-pressed:border-primary aria-pressed:bg-transparent aria-pressed:text-primary enabled:hover:border-outline enabled:hover:bg-surface-container-high enabled:active:bg-surface-container-highest',
      },
      size: {
        /* базовый контрол: min-height 40, padding 8×12 (в базовых классах px-3 py-2) */
        default: 'min-h-10 px-3 py-2',
        /* компакт зума графа: min-width 34, padding 2×8 (locked-исключение D-38) */
        'icon-sm': 'min-w-[34px] px-2 py-[2px]',
      },
    },
    defaultVariants: {
      variant: 'quiet',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      type={type}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
