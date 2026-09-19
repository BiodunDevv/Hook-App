export const HOOK_TAB_BAR_HEIGHT = 60;
export const HOOK_TAB_BAR_BOTTOM_GAP = 2;
export const HOOK_TAB_BAR_CONTENT_GAP = 14;

/** Height of the cart accessory beside the main tabs. */
export const HOOK_TAB_BAR_ACCESSORY_HEIGHT = 56;

export function getHookTabBarContentInset(bottomInset: number) {
  // Backgrounds fill the window; scroll content clears the floating controls
  // and the system navigation area without reserving a separate outer strip.
  return (
    HOOK_TAB_BAR_HEIGHT +
    HOOK_TAB_BAR_BOTTOM_GAP +
    HOOK_TAB_BAR_CONTENT_GAP + bottomInset
  );
}
