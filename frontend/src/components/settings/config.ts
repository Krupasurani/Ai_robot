import { defaultFont } from 'src/theme/types';

import type { SettingsState } from './types';

export const STORAGE_KEY = 'app-settings';

export const defaultSettings: SettingsState = {
  colorScheme: 'dark',
  direction: 'ltr',
  contrast: 'default',
  navLayout: 'horizontal',
  primaryColor: 'blue',
  navColor: 'integrate',
  compactLayout: true,
  fontFamily: defaultFont,
} as const;
