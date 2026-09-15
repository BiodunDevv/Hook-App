import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { setPaymentFlowActive } from "@/lib/payment-flow";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomActionBar, BottomActionButton } from "@/components/shared/BottomActionBar";
import { Button } from "@/components/ui/button";
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { HookPageHeader } from "@/components/shared/HookPageHeader";
import { toast } from "@/components/shared/toast";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { AppliedCouponCard } from "@/components/checkout/AppliedCouponCard";
import { CheckoutRow } from "@/components/checkout/CheckoutRow";
import { DeliveryAddressSheet, type AddressRow } from "@/components/checkout/DeliveryAddressSheet";
import { LogisticsSheet } from "@/components/checkout/LogisticsSheet";
import { PaymentMethodSheet } from "@/components/checkout/PaymentMethodSheet";
import { ReviewOrderSection } from "@/components/checkout/ReviewOrderSection";
import { OrderTotals } from "@/components/checkout/OrderTotals";
import { PaymentProcessingScreen, type PaymentStage } from "@/components/checkout/PaymentProcessingScreen";
import { apiRequest } from "@/lib/api";
import {
  useAddressesQuery,
  useCartQuery,
  getCartItems,
  useCheckoutConfirmMutation,
  useCheckoutPreviewMutation,
  useCommerceConfigQuery,
  useCreatePaymentLinkMutation,
  useCreditsQuery,
  useCustomerSessionQuery,
  useLogisticsProvidersQuery,
  useValidateCouponMutation,
  type LogisticsProvider,
} from "@/lib/mobile-api";
import { isCustomerSession } from "@/lib/session";

const VAT_RATE = 0.075;

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const session = useCustomerSessionQuery();
  const { openAuth } = useAuthSheet();
  const signedIn = isCustomerSession(session.data);

  const cart = useCartQuery();
  const addresses = useAddressesQuery();
  const config = useCommerceConfigQuery();
  const logistics = useLogisticsProvidersQuery(signedIn);
  const credits = useCreditsQuery(signedIn);
  const preview = useCheckoutPreviewMutation();
  const confirm = useCheckoutConfirmMutation();
  const createPaymentLink = useCreatePaymentLinkMutation();
  const validateCoupon = useValidateCouponMutation();

  const [addressId, setAddressId] = useState<string>();
  const [deliveryNote, setDeliveryNote] = useState("");
  const [provider, setProvider] = useState<LogisticsProvider>();
  const [useCredits, setUseCredits] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discountMinor: number; appliesToDelivery: boolean }>();
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [paymentChosen, setPaymentChosen] = useState(false);
  const [sheet, setSheet] = useState<"address" | "logistics" | "payment" | null>(null);
  // Set once checkout is submitted; survives the cart being emptied by confirm.
  const [paymentStage, setPaymentStage] = useState<PaymentStage | null>(null);

  const addressRows = (Array.isArray(addresses.data) ? addresses.data : []) as AddressRow[];
  const selectedAddress =
    addressRows.find((item) => item.publicId === addressId)
    || addressRows.find((item) => item.isDefault)
    || addressRows[0];
  const cartItems = getCartItems(cart.data);
  const providers = logistics.data || [];
  const podPaused = Boolean((config.data as { podPaused?: boolean } | undefined)?.podPaused);

  // Mirrors CheckoutService.calculateMoney so the figures shown here match the
  // server's quote. The server stays the source of truth — this is only so the
  // customer sees live totals while picking options.
  const money = useMemo(() => {
    const subtotalMinor = cartItems.reduce(
      (sum, item) => sum + Number(item.totalPriceMinor ?? Number(item.unitPriceMinor || 0) * Number(item.quantity || 0)),
      0,
    );
    const grossDeliveryMinor = Number(provider?.feeMinor || 0);
    const couponDiscountMinor = coupon?.discountMinor || 0;
    const deliveryDiscount = coupon?.appliesToDelivery ? couponDiscountMinor : 0;
    const itemDiscount = coupon?.appliesToDelivery ? 0 : couponDiscountMinor;
    const deliveryFeeMinor = Math.max(0, grossDeliveryMinor - deliveryDiscount);
    const vatMinor = Math.round(Math.max(0, subtotalMinor - itemDiscount) * VAT_RATE);
    const payableBeforeCredits = Math.max(0, subtotalMinor - itemDiscount + vatMinor + deliveryFeeMinor);

    const capPercent = credits.data?.capPercent ?? 20;
    const balanceMinor = credits.data?.balanceMinor ?? 0;
    const creditsAppliedMinor = useCredits
      ? Math.min(balanceMinor, Math.floor((subtotalMinor * capPercent) / 100), payableBeforeCredits)
      : 0;

    return {
      subtotalMinor,
      vatMinor,
      deliveryFeeMinor,
      couponDiscountMinor,
      creditsAppliedMinor,
      totalMinor: Math.max(0, payableBeforeCredits - creditsAppliedMinor),
      payableBeforeCredits,
    };
  }, [cartItems, provider, coupon, useCredits, credits.data]);

  const busy = preview.isPending || confirm.isPending || createPaymentLink.isPending;

  if (!session.isLoading && !signedIn) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f1f1f3] px-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-hook">
          <Ionicons name="lock-closed-outline" size={27} color="#111" />
        </View>
        <Text className="mt-5 text-center text-2xl font-black text-black">Sign in to checkout</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-[#666]">
          Your local cart will be added to your Hook account before checkout.
        </Text>
        <Button title="Continue" onPress={() => openAuth("/checkout" as never)} className="mt-6 w-full" />
      </View>
    );
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    try {
      const result = await validateCoupon.mutateAsync({
        code,
        subtotalMinor: money.subtotalMinor,
        deliveryFeeMinor: Number(provider?.feeMinor || 0),
      });
      setCoupon({
        code: result.code,
        discountMinor: result.discountMinor,
        appliesToDelivery: result.appliesToDelivery,
      });
      toast.success("Coupon applied");
    } catch (error) {
      setCoupon(undefined);
      toast.error(error instanceof Error ? error.message : "That coupon could not be applied");
    }
  }

  function removeCoupon() {
    setCoupon(undefined);
    setCouponInput("");
  }

  async function placeOrder() {
    if (!cartItems.length) return toast.error("Your cart is empty");
    if (!selectedAddress) {
      setSheet("address");
      return toast.info("Choose where we should deliver first");
    }
    if (!provider) {
      setSheet("logistics");
      return toast.info("Choose a delivery option to continue");
    }
    if (!paymentChosen) { setSheet("payment"); return; }
    const policyVersions = config.data?.policyVersions;
    if (!policyVersions?.TERMS || !policyVersions?.PRIVACY || !policyVersions?.RETURNS)
      return toast.error("Checkout policies are temporarily unavailable");
    if (!acceptedPolicies) return toast.error("Accept the current Hook policies to continue");

    try {
      setPaymentStage("creating");
      const summary = await preview.mutateAsync({
        addressId: selectedAddress.publicId,
        deliveryMethod: "HOME_DELIVERY",
        paymentMethod: "PREPAID",
        policyVersions,
        logisticsProviderId: provider.publicId || provider.id,
        couponCode: coupon?.code,
        useCredits,
      });
      const order = await confirm.mutateAsync({
        previewToken: summary.previewToken,
        idempotencyKey: Crypto.randomUUID(),
      });

      const paymentLink = await createPaymentLink.mutateAsync({ orderId: order.id });
      if (!paymentLink.url) throw new Error("Secure payment checkout is unavailable");
      setPaymentStage("redirecting");
      const checkoutUrl = new URL(paymentLink.url);
      checkoutUrl.searchParams.set("appReturn", "1");
      setPaymentFlowActive(true);
      const browserResult = await WebBrowser.openAuthSessionAsync(
        checkoutUrl.toString(),
        "hook://payments/return",
      );
      await WebBrowser.dismissBrowser();
      if (browserResult.type === "cancel" || browserResult.type === "dismiss") {
        router.replace({ pathname: "/payments/[id]", params: { id: order.id } } as never);
        return;
      }
      setPaymentStage("confirming");
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const status = await apiRequest<any>(`/payments/${order.id}`);
        if (String(status.payment?.status || "").toUpperCase() === "CONFIRMED") {
          toast.success("Payment confirmed");
          router.replace({ pathname: "/payments/[id]", params: { id: order.id } } as never);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      toast.info("Payment confirmation is still processing");
      router.replace({ pathname: "/payments/[id]", params: { id: order.id } } as never);
    } catch (error) {
      setPaymentStage(null);
      toast.error(error instanceof Error ? error.message : "Checkout could not be completed");
    } finally {
      setPaymentFlowActive(false);
    }
  }

  if (paymentStage) return <PaymentProcessingScreen stage={paymentStage} />;

  if (cart.isLoading || addresses.isLoading || config.isLoading)
    return <HookPageLoading title="Checkout" label="Preparing checkout" />;

  if (!cartItems.length)
    return (
      <View className="flex-1 items-center justify-center bg-[#f1f1f3] px-8">
        <Text className="text-xl font-black">Your cart is empty</Text>
        <Pressable onPress={() => router.replace("/(app)/cart")} className="mt-5 rounded-full bg-hook px-6 py-3">
          <Text className="font-bold text-black">Browse Hook</Text>
        </Pressable>
      </View>
    );

  const addressLabel = selectedAddress
    ? [selectedAddress.line1, selectedAddress.cityName].filter(Boolean).join(", ")
      || selectedAddress.label
      || selectedAddress.recipientName
    : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: "#F1F1F3", paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
        <HookPageHeader title="Checkout" centered />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="never"
      >
        <View style={{ marginTop: 8 }}>
          <CheckoutSteps step={2} />
        </View>

        <View style={{ marginTop: 24, gap: 10 }}>
          <Text className="text-base font-medium text-black">Delivery to</Text>
          <CheckoutRow
            placeholder="Choose location for delivery"
            value={addressLabel}
            onPress={() => setSheet("address")}
          />
          <CheckoutRow
            placeholder={logistics.isError ? "Couldn’t load logistics · Tap to retry" : "Choose logistics"}
            value={provider?.name}
            loading={logistics.isFetching}
            onPress={() => { setSheet("logistics"); if (logistics.isError) void logistics.refetch(); }}
          />
        </View>

        <View style={{ marginTop: 24, gap: 10 }}>
          <Text className="text-base font-medium text-black">Payment</Text>
          <CheckoutRow placeholder="Choose payment method" value={paymentChosen ? "Pay now" : undefined} onPress={() => setSheet("payment")} />
        </View>

        <View style={{ marginTop: 24, gap: 10 }}>
          <Text className="text-base font-medium text-black">Coupon</Text>
          {coupon ? (
            <AppliedCouponCard {...coupon} onRemove={removeCoupon} />
          ) : (
            <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", borderRadius: 18, backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
              <TextInput
                value={couponInput}
                onChangeText={(value) => setCouponInput(value.toUpperCase())}
                placeholder="Have a coupon code?"
                placeholderTextColor="#3a3a3a"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => void applyCoupon()}
                className="flex-1 text-base text-black"
                style={{ flex: 1, minHeight: 36, color: "#111", fontSize: 15 }}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!couponInput.trim() || validateCoupon.isPending}
                onPress={() => void applyCoupon()}
                className={`rounded-[5px] px-2.5 py-1.5 ${couponInput.trim() ? "bg-[#ffdd66]" : "bg-black/5"}`}
              >
                <Text className="text-xs text-[#3a3a3a]">{validateCoupon.isPending ? "..." : "Apply"}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <ReviewOrderSection items={cartItems} />
        </View>

        <View style={{ marginTop: 24 }}>
          <OrderTotals
            itemCount={cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
            subtotalMinor={money.subtotalMinor}
            creditsAppliedMinor={money.creditsAppliedMinor}
            couponDiscountMinor={money.couponDiscountMinor}
            couponCode={coupon?.code}
            deliveryFeeMinor={money.deliveryFeeMinor}
            totalMinor={money.totalMinor}
          />
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedPolicies }}
          onPress={() => setAcceptedPolicies((current) => !current)}
          className="mt-7 flex-row items-start gap-3"
        >
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${acceptedPolicies ? "border-hook bg-hook" : "border-black/25 bg-white"}`}
          >
            {acceptedPolicies ? <Ionicons name="checkmark" size={14} color="#111" /> : null}
          </View>
          <Text className="flex-1 text-sm leading-5 text-[#666]">
            I accept Hook&apos;s Terms, Privacy Policy and Returns Policy.
          </Text>
        </Pressable>
      </ScrollView>

      <BottomActionBar>
        <BottomActionButton
          label={
            !selectedAddress
              ? "Choose address"
              : !provider
                ? "Choose logistics"
                : !paymentChosen ? "Choose payment method" : "Pay now"
          }
          disabled={busy}
          loading={busy}
          onPress={() => void placeOrder()}
          flex={1}
        />
      </BottomActionBar>

      <DeliveryAddressSheet
        visible={sheet === "address"}
        addresses={addressRows}
        selectedId={selectedAddress?.publicId}
        note={deliveryNote}
        onSelect={(id) => {
          setAddressId(id);
          setSheet(null);
        }}
        onNoteChange={setDeliveryNote}
        onAddAddress={() => {
          setSheet(null);
          router.push("/addresses" as never);
        }}
        onClose={() => setSheet(null)}
      />

      <LogisticsSheet
        visible={sheet === "logistics"}
        providers={providers}
        loading={logistics.isFetching}
        error={logistics.isError}
        onRetry={() => void logistics.refetch()}
        selectedId={provider?.publicId || provider?.id}
        onSelect={(next) => {
          setProvider(next);
          // A free-delivery coupon is priced against the courier's fee, so it
          // has to be re-checked when that fee changes.
          if (coupon?.appliesToDelivery) setCoupon(undefined);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />

      <PaymentMethodSheet
        visible={sheet === "payment"}
        creditBalanceMinor={credits.data?.balanceMinor ?? 0}
        useCredits={useCredits}
        creditsAppliedMinor={money.creditsAppliedMinor}
        payNowTotalMinor={money.totalMinor}
        podTotalMinor={money.payableBeforeCredits}
        podPaused={podPaused}
        onToggleCredits={setUseCredits}
        onChoosePayNow={() => { setPaymentChosen(true); setSheet(null); }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}
