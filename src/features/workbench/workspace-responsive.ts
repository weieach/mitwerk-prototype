/** CSS viewport widths, not physical screen dimensions. */
export const workspaceResponsive = { desktopWidth: 1728, wideChatWidth: 1600, desktopChatFraction: .36, intermediateChatWidth: 500, laptopWidth: 1512, laptopChatMax: 440, laptopChatFraction: .35 } as const;
export function defaultChatWidth(viewportWidth: number) {
  if (viewportWidth <= workspaceResponsive.laptopWidth) return Math.min(workspaceResponsive.laptopChatMax, viewportWidth * workspaceResponsive.laptopChatFraction);
  if (viewportWidth >= workspaceResponsive.wideChatWidth) return viewportWidth * workspaceResponsive.desktopChatFraction;
  return workspaceResponsive.intermediateChatWidth;
}
export function singleReaderRequired(viewportWidth: number, chatShown: boolean) {
  return viewportWidth < workspaceResponsive.laptopWidth && chatShown;
}
