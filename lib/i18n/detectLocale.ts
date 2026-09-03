import type { Locale } from './types';

// English is the fallback of the fallback: any browser language that
// doesn't start with "pt" (including a failed/undefined detection) lands
// on English, not Portuguese -- an explicit choice, the reverse of
// DEFAULT_SETTINGS's own 'pt' default (which only applies when nothing
// has been detected/saved yet at all -- see settings.ts).
//
// Only the single primary `navigator.language` is consulted, not the
// full `navigator.languages` preference list -- so a user whose list is
// e.g. ['en-US', 'pt-PT'] gets English, even though Portuguese is also an
// acceptable language for them. Matches the plan's scope; revisit if this
// is ever raised as a real mis-detection complaint.
export function detectLocale(navigatorLanguage?: string): Locale {
  return navigatorLanguage?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}
