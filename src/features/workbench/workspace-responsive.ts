/** CSS viewport widths, not physical screen dimensions. */
export const workspaceResponsive = { laptopWidth: 1512, laptopChatMax: 440, laptopChatFraction: .35 } as const;
export function defaultChatWidth(viewportWidth: number) {
  return viewportWidth <= workspaceResponsive.laptopWidth
    ? Math.min(workspaceResponsive.laptopChatMax, viewportWidth * workspaceResponsive.laptopChatFraction)
    : 500;
}
export function singleReaderRequired(viewportWidth: number, chatShown: boolean) {
  return viewportWidth < workspaceResponsive.laptopWidth && chatShown;
}
