/**
 * Баррел форматирования чисел (D-34, ревью 02-11): единственная публичная
 * точка формата — потребители импортируют '../format' (numbers.ts удалён).
 */
export { MINUS, toDisplayMinus } from './minus'
export { formatKey } from './formatKey'
export { exactRepr } from './exactRepr'
