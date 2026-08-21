import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ──────────────────────────────────────────────────────────────────

type ToastVariant = 'info' | 'success' | 'error';

interface ToastConfig {
  message: string;
  subtitle?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastState extends ToastConfig {
  id: number;
}

// ─── Singleton emitter ───────────────────────────────────────────────────────
// Lets any component call toast.show() without prop-drilling.

type Listener = (config: ToastState) => void;
const listeners = new Set<Listener>();
let nextId = 0;

export const toast = {
  show(config: ToastConfig) {
    const state: ToastState = { ...config, id: ++nextId };
    listeners.forEach((l) => l(state));
  },
  info(message: string, subtitle?: string) {
    toast.show({ message, subtitle, variant: 'info' });
  },
  success(message: string, subtitle?: string) {
    toast.show({ message, subtitle, variant: 'success' });
  },
  error(message: string, subtitle?: string) {
    toast.show({ message, subtitle, variant: 'error' });
  },
};

// ─── Accent dot colour per variant ──────────────────────────────────────────

const toastStyle: Record<ToastVariant, { icon: keyof typeof Ionicons.glyphMap }> = {
  info: {
    icon: 'information',
  },
  success: {
    icon: 'checkmark',
  },
  error: {
    icon: 'close',
  },
};

// ─── Single toast pill ───────────────────────────────────────────────────────

function ToastPill({
  config,
  onDone,
}: {
  config: ToastState;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const { variant = 'info', duration = 2600 } = config;
  const style = toastStyle[variant];

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const dismiss = useCallback(
    (direction: 'left' | 'right' | 'up') => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const targetX =
        direction === 'left' ? -420 : direction === 'right' ? 420 : 0;
      const targetY = direction === 'up' ? -(insets.top + 120) : -24;

      Animated.parallel([
        Animated.timing(translateX, {
          duration: 190,
          toValue: targetX,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          duration: 190,
          toValue: targetY,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 170,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start(() => onDoneRef.current());
    },
    [insets.top, opacity, translateX, translateY],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 || gesture.dy < -8,
        onPanResponderGrant: () => {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        },
        onPanResponderMove: (_, gesture) => {
          const isHorizontal = Math.abs(gesture.dx) >= Math.abs(gesture.dy);
          const nextX = isHorizontal ? gesture.dx : gesture.dx * 0.28;
          const nextY = isHorizontal ? Math.min(0, gesture.dy * 0.25) : Math.min(0, gesture.dy);
          const progress = Math.max(
            Math.abs(nextX) / 180,
            Math.max(0, -nextY) / 110,
          );

          translateX.setValue(nextX);
          translateY.setValue(nextY);
          opacity.setValue(1 - Math.min(progress * 0.7, 0.7));
        },
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) > 80) {
            dismiss(gesture.dx < 0 ? 'left' : 'right');
            return;
          }
          if (gesture.dy < -52) {
            dismiss('up');
            return;
          }

          Animated.parallel([
            Animated.spring(translateX, {
              damping: 20,
              stiffness: 240,
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(translateY, {
              damping: 20,
              stiffness: 240,
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              duration: 120,
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();

          timerRef.current = setTimeout(() => dismiss('up'), duration);
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(translateX, {
              damping: 20,
              stiffness: 240,
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(translateY, {
              damping: 20,
              stiffness: 240,
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              duration: 120,
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();
          timerRef.current = setTimeout(() => dismiss('up'), duration);
        },
      }),
    [dismiss, duration, opacity, translateX, translateY],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        damping: 20,
        stiffness: 220,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        duration: 160,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => dismiss('up'), duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [dismiss, duration, opacity, translateY]);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      accessibilityRole="alert"
      accessibilityHint="Swipe left or right, or pull upward to dismiss"
      style={{
        left: 16,
        opacity,
        position: 'absolute',
        right: 16,
        top: insets.top + 12,
        transform: [{ translateX }, { translateY }],
        zIndex: 9999,
      }}>
      <View
        className="overflow-hidden rounded-xl border border-black/10 bg-[#FFC809] shadow-lg"
        style={{
          shadowColor: '#111111',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
        }}>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-black">
            <Ionicons name={style.icon} size={18} color="#FFC809" />
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="text-left text-[14px] font-bold leading-5 text-black"
              ellipsizeMode="tail"
              numberOfLines={2}>
              {config.message}
            </Text>
            {config.subtitle ? (
              <Text
                className="mt-0.5 text-left text-[12px] leading-4 text-black/65"
                ellipsizeMode="tail"
                numberOfLines={2}>
                {config.subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── ToastProvider ───────────────────────────────────────────────────────────
// Mount once at the root (inside your layout). All toasts render here.

export function ToastProvider() {
  const [current, setCurrent] = useState<ToastState | null>(null);

  useEffect(() => {
    function handle(state: ToastState) {
      setCurrent(state);
    }
    listeners.add(handle);
    return () => {
      listeners.delete(handle);
    };
  }, []);

  if (!current) return null;

  return (
    <ToastPill
      key={current.id}
      config={current}
      onDone={() => setCurrent(null)}
    />
  );
}
