import SubscriptText from './SubscriptText'

/** Нарратив шага: 1–2 строки RU из trace.steps[i].narrative.ru (Pitfall 12 —
 *  нарратив до визуальной полировки). Индексы W1 → W<sub>1</sub> (план Б §5.5). */
export default function NarrativeLine({ text }: { text: string }) {
  return (
    <p data-testid="narrative" className="ui-text max-w-xl text-neutral-900">
      <SubscriptText text={text} />
    </p>
  )
}
