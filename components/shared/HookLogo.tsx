import { Text, View } from 'react-native';

type HookLogoProps = {
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  markColor?: string;
  className?: string;
};

const sizes = {
  sm: { wordmark: 22 },
  md: { wordmark: 30 },
  lg: { wordmark: 42 },
} as const;

export function HookLogo({
  tone = 'dark',
  size = 'md',
  markColor = '#FFC809',
  className,
}: HookLogoProps) {
  const scale = sizes[size];
  const wordmarkColor = tone === 'light' ? '#FFFFFF' : '#111111';

  return (
    <View className={`flex-row items-baseline ${className || ''}`}>
      <Text
        style={{ color: wordmarkColor, fontSize: scale.wordmark, lineHeight: scale.wordmark + 4 }}
        className="font-black tracking-tight">
        hook<Text style={{ color: markColor }}>.</Text>
      </Text>
    </View>
  );
}
