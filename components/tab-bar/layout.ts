export const HOOK_TAB_BAR_HEIGHT = 60;
export const HOOK_TAB_BAR_BOTTOM_GAP = 10;
export const HOOK_TAB_BAR_CONTENT_GAP = 14;

export function getHookTabBarContentInset(_bottomInset: number) {
  return (
    HOOK_TAB_BAR_HEIGHT +
    HOOK_TAB_BAR_BOTTOM_GAP +
    HOOK_TAB_BAR_CONTENT_GAP
  );
}
