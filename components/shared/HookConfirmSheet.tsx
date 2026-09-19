import { View } from "react-native";

import { Button } from "@/components/ui/button";
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
        <Button title={cancelLabel} variant="secondary" disabled={busy} onPress={onClose} className="flex-1" />
        <Button title={confirmLabel} variant={destructive ? "danger" : "primary"} loading={busy} onPress={() => void onConfirm()} className="flex-1" />
      </View>
    </HookSheet>
  );
}
