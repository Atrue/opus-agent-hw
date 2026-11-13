/**
 * Баррел тензорных ядер операций: каждая операция — свой файл (forward +
 * градиенты), ПО ОПЕРАЦИЯМ, не по категориям (D-34, зеркально value-ops/).
 * Импорт-спецификатор './ops' у потребителей не меняется.
 */
export { matvecForward, matvecGradW, matvecGradX } from './matvec'
export { addForward } from './add'
export { tanhForward, tanhBackwardFromOutput } from './tanh'
export { sigmoidForward, sigmoidBackwardFromOutput } from './sigmoid'
export { bceForward, bceGradP } from './bce'
