import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

type Props = TextInputProps & {
  /** Layout of the wrapper (width, margins). The input fills it. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Called after the field is cleared. */
  onClear?: () => void;
};

/**
 * A drop-in TextInput that shows an × at the end while it has text, so any
 * field can be emptied in one tap. Focus stays in the field after clearing.
 * Single-line fields only; multiline fields and passwords should use TextInput.
 */
export const ClearableInput = forwardRef<TextInput, Props>(function ClearableInput({ containerStyle, onClear, style, value, editable, onChangeText, ...input }, ref) {
  const inner = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inner.current as TextInput);
  const showClear = typeof value === "string" && value.length > 0 && editable !== false && !input.multiline && !input.secureTextEntry;

  return (
    <View style={[{ justifyContent: "center" }, containerStyle]}>
      <TextInput
        ref={inner}
        value={value}
        editable={editable}
        onChangeText={onChangeText}
        {...input}
        style={[style, showClear ? { paddingRight: 34 } : null]}
      />
      {showClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear"
          hitSlop={10}
          onPress={() => {
            onChangeText?.("");
            onClear?.();
            inner.current?.focus();
          }}
          style={{ position: "absolute", right: 4, top: 0, bottom: 0, width: 28, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="close-circle" size={19} color="#A7A7AD" />
        </Pressable>
      ) : null}
    </View>
  );
});
