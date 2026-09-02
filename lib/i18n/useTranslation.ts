'use client';

import { useSettings } from '@/lib/settings/useSettings';
import { DICTIONARIES, type Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/types';

export interface UseTranslationResult {
  t: Dictionary;
  locale: Locale;
}

/**
 * No new Context -- this app's only Context stays ToastProvider's (see
 * CLAUDE.md). `language` is just another field read through the already-
 * existing useSettings().
 */
export function useTranslation(): UseTranslationResult {
  const { settings } = useSettings();
  return { t: DICTIONARIES[settings.language], locale: settings.language };
}
