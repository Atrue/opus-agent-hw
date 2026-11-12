/**
 * Селекторный хук прогона (R4): срезы — примитивы/стабильные ссылки,
 * сравнение Object.is; useSyncExternalStore подписан на Set-listeners
 * синглтона run — селективные перерисовки без реактивных библиотек.
 */

import { useSyncExternalStore } from 'react'
import { run } from './run'
import type { TrainingRun } from './trainingRun'

export function useRunSlice<T>(sel: (r: TrainingRun) => T): T {
  return useSyncExternalStore(run.subscribe, () => sel(run))
}
