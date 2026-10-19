/** Milliseconds between revealed words while a sample reply prints. */
export const printWordMs = 45;

/** Word boundaries of `text`, as cumulative character offsets (one per word). */
export function printStops(text: string) {
  const stops: number[] = [];
  for (const match of text.matchAll(/\S+/g)) stops.push(match.index! + match[0].length);
  return stops;
}
