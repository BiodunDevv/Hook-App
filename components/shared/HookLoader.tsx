import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

type HookLoaderProps = {
  label?: string;
  size?: 'page' | 'inline' | 'button';
  variant?: 'yellow' | 'dark';
  className?: string;
};

const HOOK_YELLOW = '#FFC809';
const HOOK_DARK = '#111111';
const TRACK_LIGHT = '#EEEEEE';
const TRACK_DARK = 'rgba(17,17,17,0.16)';

/**
 * Segment count and notch size mirror the web loader's CSS mask:
 *   mask: conic-gradient(from 90deg at 5px 5px, #0000 25%, #000 0)
 *         0 0 / calc((100% - 5px)/5) calc(100% - 5px)
 * which tiles the bar into 5 columns separated by a 5px gap.
 */
const SEGMENTS = 5;

const SIZES = {
  page: { width: 120, height: 20, gap: 5, fill: 40 },
  inline: { width: 90, height: 16, gap: 4, fill: 30 },
  button: { width: 60, height: 12, gap: 3, fill: 20 },
} as const;

export function HookLoader({ label, size = 'inline', variant, className }: HookLoaderProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const isButton = size === 'button';
  const tone = variant || (isButton ? 'dark' : 'yellow');
  const fillColor = tone === 'dark' ? HOOK_DARK : HOOK_YELLOW;
  const trackColor = tone === 'dark' ? TRACK_DARK : TRACK_LIGHT;

  const { width, height, gap, fill } = SIZES[size];
  /**
   * Match the CSS mask exactly: it tiles at (width - gap)/SEGMENTS and the
   * conic-gradient notch removes `gap` from each tile, so the visible segment
   * is tile - gap and the row spans SEGMENTS*tile - gap (not the full width).
   */
  const { segmentWidth, barWidth } = useMemo(() => {
    const tile = (width - gap) / SEGMENTS;
    const segment = tile - gap;
    // Row spans every segment plus the gaps that sit between them.
    return { segmentWidth: segment, barWidth: segment * SEGMENTS + gap * (SEGMENTS - 1) };
  }, [width, gap]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        duration: 1000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View className={className} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View
        accessibilityRole={label ? 'progressbar' : undefined}
        accessibilityLabel={label}
        style={{ flexDirection: 'row', width: barWidth, height, gap }}
      >
        {Array.from({ length: SEGMENTS }).map((_, index) => {
          // Offset of this segment's left edge within the full bar.
          const segmentLeft = index * (segmentWidth + gap);
          // The fill sweeps from fully off the left edge to fully off the right,
          // matching the web keyframe: left -40px -> right -40px.
          const translateX = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-fill - segmentLeft, barWidth + fill - segmentLeft],
          });
          return (
            <View
              key={index}
              style={{
                width: segmentWidth,
                height,
                backgroundColor: trackColor,
                overflow: 'hidden',
              }}
            >
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: fill,
                  backgroundColor: fillColor,
                  transform: [{ translateX }],
                }}
              />
            </View>
          );
        })}
      </View>
      {label && !isButton ? (
        <Text
          style={{
            color: '#696969',
            fontSize: 13,
            fontWeight: '600',
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
