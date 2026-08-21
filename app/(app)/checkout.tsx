import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookSheet } from "@/components/shared/HookSheet";
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import { HookLoader } from "@/components/shared/HookLoader";
import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { toast } from "@/components/shared/toast";
import { apiRequest } from "@/lib/api";
import {
  useAddressesQuery,
  useCartQuery,
  getCartItems,
  useCheckoutConfirmMutation,
  useCheckoutPreviewMutation,
  useCommerceConfigQuery,
  useCreatePaymentLinkMutation,
  useCustomerSessionQuery,
} from "@/lib/mobile-api";
import { isCustomerSession } from "@/lib/session";

type PaymentMethod = "PREPAID" | "PAY_AT_HANDOVER";

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const session = useCustomerSessionQuery();
  const { openAuth } = useAuthSheet();
  const cart = useCartQuery();
  const addresses = useAddressesQuery();
  const config = useCommerceConfigQuery();
  const preview = useCheckoutPreviewMutation();
  const confirm = useCheckoutConfirmMutation();
  const createPaymentLink = useCreatePaymentLinkMutation();
  const [addressId, setAddressId] = useState<string>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PREPAID");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [addressPromptVisible, setAddressPromptVisible] = useState(false);
  const addressRows = Array.isArray(addresses.data) ? addresses.data : [];
  const selectedAddress =
    addressRows.find((item) => item.publicId === addressId)?.publicId ||
    addressRows.find((item) => item.isDefault)?.publicId ||
    addressRows[0]?.publicId;
  const cartItems = getCartItems(cart.data);
  const busy = preview.isPending || confirm.isPending || createPaymentLink.isPending;

  if (!session.isLoading && !isCustomerSession(session.data)) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f4f4f5] px-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-hook">
          <Ionicons name="lock-closed-outline" size={27} color="#111" />
        </View>
        <Text className="mt-5 text-center text-2xl font-black text-black">Sign in to checkout</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-[#666]">Your local cart will be added to your Hook account before checkout.</Text>
        <Pressable onPress={() => openAuth("/checkout" as never)} className="mt-6 h-[52px] w-full items-center justify-center rounded-full bg-hook">
          <Text className="font-black text-black">Continue</Text>
        </Pressable>
      </View>
    );
  }

  function openAddressPrompt() {
    setAddressPromptVisible(true);
  }

  function openAddresses() {
    setAddressPromptVisible(false);
    router.push("/addresses" as never);
  }

  function choosePaymentMethod(method: PaymentMethod) {
    if (!selectedAddress) {
      openAddressPrompt();
      return;
    }
    setPaymentMethod(method);
  }

  async function placeOrder() {
    if (!cartItems.length) return toast.error("Your cart is empty");
    if (!selectedAddress) {
      openAddressPrompt();
      return;
    }
    const policyVersions = config.data?.policyVersions;
    if (
      !policyVersions?.TERMS ||
      !policyVersions?.PRIVACY ||
      !policyVersions?.RETURNS
    )
      return toast.error("Checkout policies are temporarily unavailable");
    if (!acceptedPolicies)
      return toast.error("Accept the current Hook policies to continue");
    try {
      const summary = await preview.mutateAsync({
        addressId: selectedAddress,
        deliveryMethod: "HOME_DELIVERY",
        paymentMethod,
        policyVersions,
      });
      const order = await confirm.mutateAsync({
        previewToken: summary.previewToken,
        idempotencyKey: Crypto.randomUUID(),
      });
      if (paymentMethod === "PAY_AT_HANDOVER") {
        toast.success(
          order.commerceStatus === "VERIFICATION_PENDING"
            ? "Order sent for high-value review"
            : "Order sent for confirmation",
        );
        router.replace({
          pathname: "/orders/[id]",
          params: { id: order.id },
        } as never);
        return;
      }
      const paymentLink = await createPaymentLink.mutateAsync({ orderId: order.id });
      if (!paymentLink.url)
        throw new Error("Secure payment checkout is unavailable");
      const checkoutUrl = new URL(paymentLink.url);
      checkoutUrl.searchParams.set("appReturn", "1");
      const browserResult = await WebBrowser.openAuthSessionAsync(
        checkoutUrl.toString(),
        "hook://payments/return",
      );
      await WebBrowser.dismissBrowser();
      if (browserResult.type === "cancel" || browserResult.type === "dismiss") {
        router.replace({
          pathname: "/payments/[id]",
          params: { id: order.id },
        } as never);
        return;
      }
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const status = await apiRequest<any>(`/payments/${order.id}`);
        if (String(status.payment?.status || "").toUpperCase() === "CONFIRMED") {
          toast.success("Payment confirmed");
          router.replace({
            pathname: "/payments/[id]",
            params: { id: order.id },
          } as never);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      toast.info("Payment confirmation is still processing");
      router.replace({
        pathname: "/payments/[id]",
        params: { id: order.id },
      } as never);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Checkout could not be completed",
      );
    }
  }

  if (cart.isLoading || addresses.isLoading || config.isLoading)
    return <HookPageLoading title="Checkout" label="Preparing checkout" />;
  if (!cartItems.length)
    return (
      <View className="flex-1 items-center justify-center bg-[#f4f4f5] px-8">
        <Text className="text-xl font-black">Your cart is empty</Text>
        <Pressable
          onPress={() => router.replace("/cart")}
          className="mt-5 rounded-full bg-hook px-6 py-3"
        >
          <Text className="font-bold">Back to cart</Text>
        </Pressable>
      </View>
    );

  return (
    <View className="flex-1 bg-[#f4f4f5]" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 120,
        }}
      >
        <View className="flex-row items-center gap-3">
          <HookBackButton />
          <View>
            <Text className="text-2xl font-black">Checkout</Text>
            <Text className="text-xs text-[#666]">
              {cartItems.length} product{cartItems.length === 1 ? "" : "s"} · one order
            </Text>
          </View>
        </View>
        <Section
          title="Delivery address"
          action="Manage"
          onAction={openAddresses}
        >
          {addressRows.length ? (
            <View className="gap-2">
              {addressRows.map((address) => (
                <Pressable
                  key={address.publicId}
                  onPress={() => setAddressId(address.publicId)}
                  className={`rounded-2xl border p-4 ${selectedAddress === address.publicId ? "border-hook bg-[#fff9df]" : "border-black/5 bg-[#fafafa]"}`}
                >
                  <Text className="font-black">{address.label}</Text>
                  <Text className="mt-1 text-sm text-[#666]">
                    {address.line1}
                  </Text>
                  <Text className="mt-1 text-xs text-[#888]">
                    {address.recipientName} · {address.phone}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="rounded-2xl border border-hook/30 bg-[#fff9df] p-4">
              <View className="flex-row items-start">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-hook">
                  <Ionicons name="location" size={19} color="#111" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-black text-black">
                    Delivery address required
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-black/60">
                    Add a verified address so Hook can confirm coverage and calculate your delivery fee.
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={openAddresses}
                className="mt-4 h-11 items-center justify-center rounded-full bg-black"
              >
                <Text className="text-sm font-bold text-white">
                  Add delivery address
                </Text>
              </Pressable>
            </View>
          )}
        </Section>
        <Section title="Payment">
          <View className="gap-2">
            <PaymentChoice
              active={paymentMethod === "PREPAID"}
              title="Pay now"
              description="Complete payment securely with Paystack."
              onPress={() => choosePaymentMethod("PREPAID")}
            />
            <PaymentChoice
              active={paymentMethod === "PAY_AT_HANDOVER"}
              title="Pay at handover"
              description="Subject to coverage, account and Operations approval."
              disabled={!config.data?.podEnabled}
              onPress={() => choosePaymentMethod("PAY_AT_HANDOVER")}
            />
          </View>
        </Section>
        <Section title="Order summary">
          <Row label="Products" value={Number((cart.data as any)?.subtotalMinor || 0)} />
          <Text className="mt-3 text-xs leading-5 text-[#777]">
            Your exact delivery fee and total are locked in the secure preview
            before the Order is created.
          </Text>
        </Section>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedPolicies }}
          onPress={() => setAcceptedPolicies((value) => !value)}
          className="mt-4 flex-row items-start gap-3 rounded-2xl bg-white p-4"
        >
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${acceptedPolicies ? "border-black bg-black" : "border-[#aaa]"}`}
          >
            {acceptedPolicies ? (
              <Ionicons name="checkmark" size={14} color="#FFC809" />
            ) : null}
          </View>
          <Text className="flex-1 text-xs leading-5 text-[#666]">
            I accept the current Hook Terms, Privacy Policy, and Returns Policy
            for this Order.
          </Text>
        </Pressable>
      </ScrollView>
      <View
        className="absolute inset-x-0 bottom-0 border-t border-black/5 bg-white px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs text-[#777]">
            {paymentMethod === "PREPAID"
              ? "Secure Paystack payment"
              : "Operations review may apply"}
          </Text>
          <Text className="font-black">
            ₦{(Number((cart.data as any)?.subtotalMinor || 0) / 100).toLocaleString()}
          </Text>
        </View>
        <Pressable
          disabled={busy}
          onPress={() => void placeOrder()}
          className={`h-14 items-center justify-center rounded-2xl ${busy ? "bg-[#e3e3e5]" : "bg-hook"}`}
        >
          {busy ? (
            <HookLoader size="button" />
          ) : (
            <Text className="font-black">
              {!selectedAddress
                ? "Add delivery address"
                : paymentMethod === "PREPAID"
                ? "Continue to secure payment"
                : "Submit handover request"}
            </Text>
          )}
        </Pressable>
      </View>
      <HookSheet
        visible={addressPromptVisible}
        onClose={() => setAddressPromptVisible(false)}
        accessibilityLabel="Delivery address required"
        maxHeight="70%"
        title="We need your delivery address first"
        message="Add a verified Nigerian address so Hook can calculate delivery and continue with Paystack or pay-at-handover checkout."
      >
        <View className="gap-3">
          <Pressable
            accessibilityRole="button"
            onPress={openAddresses}
            className="h-[52px] items-center justify-center rounded-full bg-hook"
          >
            <Text className="text-sm font-black text-black">
              Add delivery address
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAddressPromptVisible(false)}
            className="h-[52px] items-center justify-center rounded-full bg-hook-surface"
          >
            <Text className="text-sm font-bold text-black">Not now</Text>
          </Pressable>
        </View>
      </HookSheet>
    </View>
  );
}

function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-4 rounded-[22px] bg-white p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-black">{title}</Text>
        {action ? (
          <Pressable onPress={onAction}>
            <Text className="text-sm font-bold text-[#9a7300]">{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
function PaymentChoice({
  active,
  title,
  description,
  disabled,
  onPress,
}: {
  active: boolean;
  title: string;
  description: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border p-4 ${active ? "border-hook bg-[#fff9df]" : "border-black/5 bg-[#fafafa]"} ${disabled ? "opacity-40" : ""}`}
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border ${active ? "border-black bg-black" : "border-[#aaa]"}`}
      >
        {active ? <View className="h-2 w-2 rounded-full bg-hook" /> : null}
      </View>
      <View className="flex-1">
        <Text className="font-black">{title}</Text>
        <Text className="mt-1 text-xs leading-4 text-[#777]">
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
function Row({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-[#666]">{label}</Text>
      <Text className="font-black">
        ₦{(Number(value || 0) / 100).toLocaleString()}
      </Text>
    </View>
  );
}
