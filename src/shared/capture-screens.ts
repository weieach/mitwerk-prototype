/** Shared capture destinations used by the composer, catalog and reader. */
export const captureScreens = [
  { value: 'homescreen', label: 'homescreen' },
  { value: 'landing', label: 'landing' },
] as const;
export type CaptureScreen = typeof captureScreens[number]['value'];
export function captureScreen(frame: { screen?: CaptureScreen }): CaptureScreen { return frame.screen ?? 'homescreen'; }
