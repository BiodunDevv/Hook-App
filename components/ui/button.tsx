import { Pressable, Text, type PressableProps } from 'react-native';

import { HookLoader } from '@/components/shared/HookLoader';

type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'danger' | 'surface' | 'ghost' | 'hitArea' | 'blurredPill';
type ButtonSize = 'compact' | 'default' | 'icon' | 'wide' | 'auto';

type ButtonProps = PressableProps & {
  className?: string;
  labelClassName?: string;
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const baseButton = 'items-center justify-center';

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-hook',
  secondary: 'border border-black/10 bg-white',
  dark: 'bg-black',
  danger: 'bg-[#D94A43]',
  surface: 'bg-hook-surface',
  ghost: 'bg-transparent',
  hitArea: 'bg-transparent',
  blurredPill: 'overflow-hidden rounded-full border border-white/70 bg-white/10',
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  compact: 'h-11 rounded-full px-5',
  default: 'h-[52px] rounded-full px-6',
  icon: 'h-[50px] w-[50px] rounded-full',
  wide: 'h-[54px] rounded-full px-6',
  auto: '',
};

const labelVariantClasses: Record<ButtonVariant, string> = {
  primary: 'text-black',
  secondary: 'text-hook-text',
  dark: 'text-white',
  danger: 'text-white',
  surface: 'text-black',
  ghost: 'text-hook-text',
  hitArea: 'text-transparent',
  blurredPill: 'text-black',
};

function joinClasses(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function buttonVariants({
  className,
  size = 'default',
  variant = 'primary',
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
} = {}) {
  return joinClasses(baseButton, buttonVariantClasses[variant], buttonSizeClasses[size], className);
}

export function Button({
  className,
  labelClassName,
  title,
  variant = 'primary',
  size = 'default',
  children,
  disabled,
  loading = false,
  ...props
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={buttonVariants({ className: joinClasses('disabled:opacity-45', className), size, variant })}
      disabled={inactive}
      {...props}
    >
      {loading ? (
        <HookLoader size="button" variant={variant === 'dark' || variant === 'danger' ? 'yellow' : 'dark'} />
      ) : children ?? (
        <Text className={joinClasses('text-[15px] font-black', labelVariantClasses[variant], labelClassName)}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
