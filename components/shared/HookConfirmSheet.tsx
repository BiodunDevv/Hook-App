import { Pressable, Text, View } from "react-native";

import { HookLoader } from "./HookLoader";
import { HookSheet } from "./HookSheet";

type HookConfirmSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function HookConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: HookConfirmSheetProps) {
  return (
    <HookSheet
      visible={visible}
      onClose={onClose}
      busy={busy}
      maxHeight="70%"
      accessibilityLabel={title}
      title={title}
      message={message}
    >
      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onClose}
          className="h-[52px] flex-1 items-center justify-center rounded-2xl bg-white"
        >
          <Text className="font-bold text-[#111]">{cancelLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void onConfirm()}
          className={`h-[52px] flex-1 items-center justify-center rounded-2xl ${destructive ? "bg-[#D94A43]" : "bg-hook"}`}
          style={{ opacity: busy ? 0.7 : 1 }}
        >
          {busy ? (
            <HookLoader size="button" variant={destructive ? "yellow" : "dark"} />
          ) : (
            <Text className={`font-black ${destructive ? "text-white" : "text-black"}`}>
              {confirmLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </HookSheet>
  );
}
