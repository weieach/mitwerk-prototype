export const galleryTokens = {
  webgl: { pixelRatioMax: 2, rotateSpeed: .7, keyRotateRadians: .12, dragThreshold: 5,
    blockOpacity: .035, edgeOpacity: .75, frameOutlineOpacity: .5, fitPadding: 1.15,
    initialDirection: [1, .85, 1] as const, textureCacheSize: 8, anisotropyMax: 4 },
  versionDepth: 88, blockGap: 10, padding: 14, maxImageWidth: 250, maxImageHeight: 180,
  hoverLift: 32, rulerGap: 36, transitionMs: 240,
  labelFontSize: 10, labelSummaryLength: 42,
  disabledOpacity: 0.14, endpointOpacity: 0.72, refreshMs: 30_000,
  zoomMin: 0.5, zoomMax: 3, zoomStep: 0.25,
  playbackIntervalMs: 700, speeds: [0.5, 1, 2, 4],
  viewportPresets: [
    { value: 'original', label: 'Original size', width: 0, height: 0 },
    { value: 'desktop', label: 'Desktop', width: 1440, height: 900 },
    { value: 'tablet', label: 'Tablet', width: 768, height: 1024 },
    { value: 'phone', label: 'Phone', width: 390, height: 844 },
    { value: 'custom', label: 'Custom size', width: 0, height: 0 },
  ],
} as const;
