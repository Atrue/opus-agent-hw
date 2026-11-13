/**
 * Баррел скалярных операций Value: каждая операция — свободная функция
 * со своим backwardFn внутри (чистые локальные производные); внутренний
 * для src/tensor — публичный вход value-слоя не расширяет (D-34).
 */
export { add } from './add'
export { sub } from './sub'
export { mul } from './mul'
export { div } from './div'
export { neg } from './neg'
export { tanh } from './tanh'
export { sigmoid } from './sigmoid'
export { log } from './log'
