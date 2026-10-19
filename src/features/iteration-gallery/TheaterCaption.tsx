/** Prompt and push captions stay clamped without a full-text hover tooltip. */
export function TheaterCaption({ text }: { text: string }) {
  return <p className="theater-summary"><span data-orbit-blocked data-orbit-inline>{text}</span></p>;
}
