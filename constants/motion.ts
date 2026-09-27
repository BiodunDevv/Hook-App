/**
 * Shared spring presets. All three land around damping ratio ζ ≈ 0.87–0.90 —
 * smooth deceleration with no visible overshoot/bounce, but still a natural
 * spring curve (not linear), and stiff enough for a fast ~150–220ms settle.
 * Reanimated's `withSpring` and React Native's legacy `Animated.spring` (in
 * its damping/stiffness/mass mode) share the same underlying physics model,
 * so these presets are valid for either.
 */
export const SPRING_PRESS_IN = { damping: 24, stiffness: 380, mass: 0.5 };
export const SPRING_PRESS_OUT = { damping: 22, stiffness: 320, mass: 0.5 };
export const SPRING_PANEL = { damping: 26, stiffness: 300, mass: 0.7 };
