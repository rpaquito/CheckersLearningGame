import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function hapticMove(): Promise<void> {
  if (!isNative()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticCapture(): Promise<void> {
  if (!isNative()) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}

// Checkers has no "check" concept (unlike Chess Sensei's own hapticCheck) --
// promotion (a man becoming a king) is this game's natural equivalent
// "distinct big moment" worth its own haptic. See design spec §11.
export async function hapticKinged(): Promise<void> {
  if (!isNative()) return;
  await Haptics.notification({ type: NotificationType.Warning });
}
