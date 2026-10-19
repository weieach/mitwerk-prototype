/** Follow simulator growth, without replacing a frame chosen while entering Playback. */
export function simulationAdvanced(previousLatestId: string | undefined, latestId: string | undefined, simulating: boolean, playbackActive: boolean) {
  return simulating && playbackActive && !!latestId && previousLatestId !== latestId;
}
