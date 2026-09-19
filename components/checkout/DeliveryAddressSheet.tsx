import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { BottomSheetScrollView as ScrollView, BottomSheetTextInput as TextInput } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckoutSheet } from "./CheckoutSheet";

export type AddressRow = {
  publicId: string;
  label?: string;
  recipientName?: string;
  phone?: string;
  line1?: string;
  landmark?: string;
  cityName?: string;
  stateName?: string;
  isDefault?: boolean;
};

function addressLines(address: AddressRow) {
  return [address.line1, [address.landmark, address.cityName].filter(Boolean).join(", "), address.stateName]
    .filter(Boolean)
    .map(String);
}

export function DeliveryAddressSheet({
  visible,
  addresses,
  selectedId,
  note,
  onSelect,
  onNoteChange,
  onAddAddress,
  onClose,
}: {
  visible: boolean;
  addresses: AddressRow[];
  selectedId?: string;
  note: string;
  onSelect: (id: string) => void;
  onNoteChange: (value: string) => void;
  onAddAddress: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <CheckoutSheet visible={visible} onClose={onClose} title="Where should we deliver?">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ gap: 12 }}>
          {addresses.map((address) => {
            const active = address.publicId === selectedId;
            return (
              <Pressable
                key={address.publicId}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(address.publicId)}
                className={`rounded-2xl border p-4 ${active ? "border-hook bg-[#fff9e5]" : "border-black/10 bg-white"}`}
                style={{ borderRadius: 16, padding: 16, borderWidth: 1, borderColor: active ? "#FFC809" : "#DDD", backgroundColor: active ? "#FFF9E5" : "white" }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <Text className="flex-1 text-base font-bold text-[#111]">
                    {address.recipientName || address.label || "Delivery address"}
                  </Text>
                  {active ? <Ionicons name="checkmark-circle" size={20} color="#FFC809" /> : null}
                </View>
                <View className="mt-2 gap-0.5">
                  {addressLines(address).map((line) => (
                    <Text key={line} className="text-sm leading-[22px] text-[#666]">
                      {line}
                    </Text>
                  ))}
                </View>
                {address.phone ? (
                  <View className="mt-3 flex-row items-center gap-2">
                    <Ionicons name="call-outline" size={15} color="#111" />
                    <Text className="text-sm font-medium text-[#111]">{address.phone}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={onAddAddress}
            className="flex-row items-center gap-3 rounded-2xl border border-dashed border-[#e5e5e5] p-4"
            style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: "#DDD", padding: 16 }}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#f0f0f0]">
              <Ionicons name="add" size={20} color="#111" />
            </View>
            <Text className="text-base font-semibold text-[#111]">Add new address or landmark</Text>
          </Pressable>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-semibold text-[#111]">Delivery note (Optional)</Text>
            <TextInput
              multiline
              value={note}
              onChangeText={onNoteChange}
              placeholder="e.g. Call me when you get close"
              placeholderTextColor="rgba(17,17,17,0.5)"
              className="min-h-[68px] rounded-2xl border border-[#e5e5e5] bg-[#f0f0f0]/50 p-3 text-sm leading-5 text-[#111]"
              textAlignVertical="top"
              style={{ minHeight: 88, borderRadius: 16, backgroundColor: "white", padding: 12, color: "#111", fontSize: 14, lineHeight: 21 }}
              maxLength={300}
            />
          </View>
        </View>
      </ScrollView>
    </CheckoutSheet>
  );
}
