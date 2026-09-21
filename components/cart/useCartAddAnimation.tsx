import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { RemoteImage } from '@/components/shared/RemoteImage';
import { cartFlightPosition } from '@/lib/cart-flight-path';

type Bounds = { x: number; y: number; width: number; height: number };
type Flight = { uri: string; fromX: number; fromY: number; toX: number; toY: number; controlX: number; controlY: number; reverse?: boolean; duration?: number };
const SIZE = 76;
const DURATION = 720;

function measure(view: View | null): Promise<Bounds | null> {
  if (!view) return Promise.resolve(null);
  return new Promise((resolve) => {
    // A removed native view may never invoke its measurement callback.
    const timeout = setTimeout(() => resolve(null), 200);
    view.measureInWindow((x, y, width, height) => {
      clearTimeout(timeout);
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}

/** Immediate decorative tap feedback, not proof of a successful cart write. */
export function useCartAddAnimation(productId?: string) {
  const containerRef = useRef<View>(null);
  const heroRef = useRef<View>(null);
  const triggerRef = useRef<View>(null);
  const cartRef = useRef<View>(null);
  const generation = useRef(0);
  const activeProduct = useRef(productId);
  activeProduct.current = productId;
  const [flight, setFlight] = useState<Flight | null>(null);
  const lastFlight = useRef<Flight | null>(null);
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const cartScale = useSharedValue(1);
  const cartAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: cartScale.value }] }));

  useEffect(() => {
    generation.current += 1;
    setFlight(null);
    lastFlight.current = null;
    cancelAnimation(cartScale);
    cartScale.value = 1;
    return () => { generation.current += 1; cancelAnimation(cartScale); cancelAnimation(progress); };
  }, [productId, cartScale, progress]);

  useEffect(() => {
    if (!flight) return;
    const duration = flight.reverse ? Math.min(500, flight.duration || DURATION) : flight.duration || DURATION;
    progress.value = withTiming(flight.reverse ? 0 : 1, { duration, easing: Easing.inOut(Easing.cubic) });
    if (!flight.reverse) cartScale.value = withDelay(Math.max(0, duration - 100), withSequence(withTiming(1.12, { duration: 120 }), withTiming(1, { duration: 180 })));
    const timeout = setTimeout(() => setFlight(null), duration + 100);
    return () => clearTimeout(timeout);
  }, [flight, cartScale, progress]);

  async function play(uri?: string | null) {
    lastFlight.current = null;
    if (reducedMotion || !uri || activeProduct.current !== productId) return;
    const current = generation.current;
    const [root, hero, trigger, cart] = await Promise.all([
      measure(containerRef.current), measure(heroRef.current), measure(triggerRef.current), measure(cartRef.current),
    ]);
    if (current !== generation.current || activeProduct.current !== productId || !root || !cart) return;
    const visibleTop = Math.max(hero?.y ?? 0, cart.y + cart.height + 16, root.y);
    const visibleBottom = Math.min((hero?.y ?? 0) + (hero?.height ?? 0), trigger?.y ?? root.y + root.height);
    const from = hero && visibleBottom - visibleTop >= SIZE
      ? { x: hero.x + hero.width / 2, y: (visibleTop + visibleBottom) / 2 }
      : trigger ? { x: trigger.x + trigger.width / 2, y: trigger.y + trigger.height / 2 - SIZE / 2 } : null;
    if (!from) return;
    const fromX = from.x - root.x;
    const fromY = from.y - root.y;
    const toX = cart.x + cart.width / 2 - root.x;
    const toY = cart.y + cart.height / 2 - root.y;
    progress.value = 0;
    const next = { uri, fromX, fromY, toX, toY,
      controlX: Math.min(root.width - SIZE / 2, Math.max(fromX, toX) + 40),
      controlY: Math.max(SIZE / 2, Math.min(fromY, toY) - 80),
    };
    lastFlight.current = next;
    setFlight(next);
  }

  async function playBetween(uri: string | undefined, source: View | null, target: View | null) {
    lastFlight.current = null;
    if (reducedMotion || !uri) return;
    const current = generation.current;
    const [root, from, to] = await Promise.all([measure(containerRef.current), measure(source), measure(target)]);
    if (current !== generation.current || !root || !from || !to) return;
    const fromX = from.x + from.width / 2 - root.x;
    const fromY = from.y + from.height / 2 - root.y;
    const toX = to.x + to.width / 2 - root.x;
    const toY = to.y + to.height / 2 - root.y;
    const next = { uri, fromX, fromY, toX, toY, duration: 380, controlX: (fromX + toX) / 2, controlY: Math.max(SIZE / 2, Math.min(fromY, toY) - 60) };
    progress.value = 0;
    lastFlight.current = next;
    setFlight(next);
  }

  function cancel() {
    generation.current += 1;
    setFlight(null);
    lastFlight.current = null;
    cancelAnimation(progress);
    cancelAnimation(cartScale);
    cartScale.value = 1;
  }

  function reverse() {
    generation.current += 1; // Also fences measurements from a very fast failed request.
    cancelAnimation(cartScale);
    cartScale.value = 1;
    const previous = lastFlight.current;
    if (!reducedMotion && previous) setFlight({ ...previous, reverse: true });
    lastFlight.current = null;
  }

  return { containerRef, heroRef, triggerRef, cartRef, cartAnimatedStyle, play, playBetween, cancel, reverse,
    overlay: flight ? <CartImageFlight flight={flight} progress={progress} /> : null };
}

function CartImageFlight({ flight, progress }: { flight: Flight; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const { x, y, scale } = cartFlightPosition(flight, t);
    return { opacity: flight.reverse ? Math.min(1, t * 5) : t < 0.85 ? 1 : (1 - t) / 0.15,
      transform: [{ translateX: x - SIZE / 2 }, { translateY: y - SIZE / 2 }, { scale }] };
  });
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.overlay}>
    <Animated.View style={[styles.image, style]}><RemoteImage uri={flight.uri} transition={0} /></Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 100, elevation: 20 },
  image: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: '#FFC809', backgroundColor: '#FFF' },
});
