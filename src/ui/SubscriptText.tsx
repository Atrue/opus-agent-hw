import type { ReactNode } from 'react'

const SUBSCRIPT_RE = /([A-Za-z])(\d+)/g

/** План Б §5.5: ASCII-индексы из трейса (z1, W2) рендерятся как z<sub>1</sub>, W<sub>2</sub>. */
export default function SubscriptText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (let m = SUBSCRIPT_RE.exec(text); m !== null; m = SUBSCRIPT_RE.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(m[1])
    parts.push(<sub key={m.index}>{m[2]}</sub>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
