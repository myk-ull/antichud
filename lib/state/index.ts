export * from './profile';
export * from './log';
export * from './weight';
export * from './settings';

import { useProfile } from './profile';
import { useLog } from './log';
import { useWeight } from './weight';
import { useSettings } from './settings';

export async function hydrateAll(): Promise<void> {
  await Promise.all([
    useProfile.getState().hydrate(),
    useLog.getState().hydrate(),
    useWeight.getState().hydrate(),
    useSettings.getState().hydrate(),
  ]);
}
