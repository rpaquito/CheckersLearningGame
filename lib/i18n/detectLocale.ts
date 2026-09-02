import type { Locale } from './types';

// English is the fallback of the fallback: any browser language that
// doesn't start with "pt" (including a failed/undefined detection) lands
// on English, not Portuguese -- an explicit choice, the reverse of
// DEFAULT_SETTINGS's own 'pt' default (which only applies when nothing
// has been detected/saved yet at all -- see settings.ts).
export function detectLocale(navigatorLanguage?: string): Locale {
  return navigatorLanguage?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}
