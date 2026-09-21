import { ClearableInput } from "@/components/shared/ClearableInput";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { setPaymentFlowActive } from "@/lib/payment-flow";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { ApiError, isAmbiguousFailure } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { releaseIdempotencyKey, stableIdempotencyKey } from "@/lib/idempotency";
import { waitForPaymentConfirmation } from "@/lib/payment-status";
import {
  useAddressesQuery,
  useCartQuery,
  getCartItems,
  useCheckoutConfirmMutation,
  useCheckoutPreviewMutation,
  useCommerceConfigQuery,
  useMinimumCheckoutMinor,
  useCreatePaymentLinkMutation,
  useCreditsQuery,
  useCustomerSessionQuery,
  useLogisticsProvidersQuery,
  useOperatingStatesQuery,
  useValidateCouponMutation,
  type LogisticsProvider,
} from "@/lib/mobile-api";
import { HookRefreshControl } from "@/components/shared/HookRefreshControl";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { EmptyCheckout } from "@/components/checkout/EmptyCheckout";
import { useCommerceSyncing } from "@/lib/commerce-sync";
import { isCustomerSession } from "@/lib/session";
import { calculateHookCoinEarnMinor } from "@/lib/hook-coin";

// Used only until the State price loads; the server quote is authoritative.
const DEFAULT_DELIVERY_FEE_MINOR = 300_000;

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const session = useCustomerSessionQuery();
  const { openAuth } = useAuthSheet();
  const signedIn = isCustomerSession(session.data);

  const cart = useCartQuery();
  const syncingCommerce = useCommerceSyncing();
  const addresses = useAddressesQuery();
  const config = useCommerceConfigQuery();
  const logistics = useLogisticsProvidersQuery(signedIn);
  const credits = useCreditsQuery(signedIn);
  const queryClient = useQueryClient();
  const minimumMinor = useMinimumCheckoutMinor();
  const placingRef = useRef(false);
  const preview = useCheckoutPreviewMutation();
  const confirm = useCheckoutConfirmMutation();
  const createPaymentLink = useCreatePaymentLinkMutation();
  const validateCoupon = useValidateCouponMutation();

  const [addressId, setAddressId] = useState<string>();
  const [deliveryNote, setDeliveryNote] = useState("");
  const [provider, setProvider] = useState<LogisticsProvider>();
  const [useCredits, setUseCredits] = useState(false);
  const creditPreferenceTouched = useRef(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discountMinor: number; appliesToDelivery: boolean }>();
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  // Pay now is the default. The customer only picks when another method (Pay
  // on delivery) is actually available.
  // The customer always makes this choice themselves; the sheet opens when they tap Pay without having chosen.
  const [paymentChosen, setPaymentChosen] = useState(false);
  const [method, setMethod] = useState<"PREPAID" | "PAY_AT_HANDOVER">("PREPAID");
  const [sheet, setSheet] = useState<"address" | "logistics" | "payment" | null>(null);
  // Set once checkout is submitted; survives the cart being emptied by confirm.
  const [paymentStage, setPaymentStage] = useState<PaymentStage | null>(null);

  const addressRows = (Array.isArray(addresses.data) ? addresses.data : []) as AddressRow[];
  const selectedAddress =
    addressRows.find((item) => item.publicId === addressId)
    || addressRows.find((item) => item.isDefault)
    || addressRows[0];
  const operatingStates = useOperatingStatesQuery();
  // Pulling refreshes everything checkout shows: the cart, addresses, delivery
  // prices, couriers, wallet and commerce settings.
  const { refreshing, onRefresh } = usePullRefresh(
    () => cart.refetch(),
    () => addresses.refetch(),
    () => config.refetch(),
    () => operatingStates.refetch(),
    () => (signedIn ? logistics.refetch() : undefined),
    () => (signedIn ? credits.refetch() : undefined),
  );
  const normaliseState = (value?: string) => String(value || "").toLowerCase().replace(/\bstate\b/g, "").replace(/[^a-z]/g, "");
  const addressState = operatingStates.data?.find(
    (state) =>
      (selectedAddress?.stateId && (state.publicId === selectedAddress.stateId || state.code === selectedAddress.stateId)) ||
      (selectedAddress?.stateName && normaliseState(state.name) === normaliseState(selectedAddress.stateName)),
  );
  const stateDeliveryFeeMinor = Number(addressState?.deliveryFeeMinor ?? DEFAULT_DELIVERY_FEE_MINOR);
  const cartItems = getCartItems(cart.data);
  const providers = logistics.data || [];
  const podPaused = Boolean((config.data as { podPaused?: boolean } | undefined)?.podPaused);
  const podGloballyOn = Boolean((config.data as { podEnabled?: boolean } | undefined)?.podEnabled) && !podPaused;
  // Settings the admin controls: VAT, and what Pay on Delivery needs and costs.
  const vatRate = Number(config.data?.vatRatePercent ?? 7.5) / 100;
  const podMinimumMinor = Number(config.data?.podMinimumOrderMinor ?? 3_000_000);

  // Hook credit is applied by default as soon as the wallet is available. A
  // customer's explicit choice is then preserved for the rest of this
  // checkout, even if the wallet query refreshes in the background.
  useEffect(() => {
    if (!credits.isSuccess) return;
    const hasSpendableBalance = Number(credits.data?.balanceMinor || 0) > 0;
    if (!hasSpendableBalance) {
      setUseCredits(false);
      return;
    }
    if (!creditPreferenceTouched.current) setUseCredits(true);
  }, [credits.data?.balanceMinor, credits.isSuccess]);

  function handleToggleCredits(next: boolean) {
    creditPreferenceTouched.current = true;
    setUseCredits(next);
  }

  // Mirrors CheckoutService.calculateMoney so the figures shown here match the
  // server's quote. The server stays the source of truth — this is only so the
  // customer sees live totals while picking options.
  const money = useMemo(() => {
    const subtotalMinor = cartItems.reduce(
      (sum, item) => sum + Number(item.totalPriceMinor ?? Number(item.unitPriceMinor || 0) * Number(item.quantity || 0)),
      0,
    );
    // Delivery is priced by the State in the delivery address, not by courier.
    const grossDeliveryMinor = stateDeliveryFeeMinor;
    const couponDiscountMinor = coupon?.discountMinor || 0;
    const deliveryDiscount = coupon?.appliesToDelivery ? couponDiscountMinor : 0;
    const itemDiscount = coupon?.appliesToDelivery ? 0 : couponDiscountMinor;
    const deliveryFeeMinor = Math.max(0, grossDeliveryMinor - deliveryDiscount);
    const vatMinor = Math.round(Math.max(0, subtotalMinor - itemDiscount) * vatRate);
    const isPod = method === "PAY_AT_HANDOVER";
    const surchargeValue = Number(config.data?.podSurchargeValue ?? 0);
    const podSurchargeMinor = isPod
      ? config.data?.podSurchargeType === "percent" ? Math.round((subtotalMinor * surchargeValue) / 100) : Math.round(surchargeValue)
      : 0;
    const payableBeforeCredits = Math.max(0, subtotalMinor - itemDiscount + vatMinor + deliveryFeeMinor + podSurchargeMinor);
    // Pay now is always quoted without the Pay on Delivery surcharge, so choosing another method never changes it.
    const prepaidBeforeCredits = Math.max(0, subtotalMinor - itemDiscount + vatMinor + deliveryFeeMinor);

    const capPercent = credits.data?.capPercent ?? 20;
    const balanceMinor = credits.data?.balanceMinor ?? 0;
    // Hook credit is for paying online in full; it is not used on a Pay on Delivery order.
    const creditsAppliedMinor = useCredits && !isPod
      ? Math.min(balanceMinor, Math.floor((subtotalMinor * capPercent) / 100), payableBeforeCredits)
      : 0;

    const capMinor = Math.floor((subtotalMinor * capPercent) / 100);
    const prepaidCreditsMinor = useCredits ? Math.min(balanceMinor, capMinor, prepaidBeforeCredits) : 0;
    // What Pay on Delivery would cost, whichever method is selected, so the sheet can show it beside Pay now.
    const podFlatSurcharge = config.data?.podSurchargeType === "percent" ? Math.round((subtotalMinor * surchargeValue) / 100) : Math.round(surchargeValue);
    const podPayNowMinor = deliveryFeeMinor + podFlatSurcharge;
    const podTotalMinor = Math.max(0, subtotalMinor - itemDiscount + vatMinor + deliveryFeeMinor + podFlatSurcharge);

    return {
      subtotalMinor,
      vatMinor,
      deliveryFeeMinor,
      couponDiscountMinor,
      creditsAppliedMinor,
      podSurchargeMinor,
      totalMinor: Math.max(0, payableBeforeCredits - creditsAppliedMinor),
      payableBeforeCredits,
      // What the order comes to (goods after discount, VAT, delivery): the figure Pay on Delivery's minimum is judged on.
      orderValueMinor: prepaidBeforeCredits,
      prepaidTotalMinor: Math.max(0, prepaidBeforeCredits - prepaidCreditsMinor),
      prepaidCreditsMinor,
      podPayNowMinor,
      podAtDoorMinor: Math.max(0, podTotalMinor - podPayNowMinor),
    };
  }, [cartItems, stateDeliveryFeeMinor, coupon, useCredits, credits.data, vatRate, method, config.data]);
  const stateName = addressState?.name || selectedAddress?.stateName;
  const stateAllowsPod = Boolean(addressState?.podEnabled);
  // The State's own minimum wins over the global one.
  const podMinimumForState = Number(addressState?.podMinimumOrderMinor ?? podMinimumMinor);
  const shortfallMinor = Math.max(0, podMinimumForState - money.orderValueMinor);
  const podAvailable = podGloballyOn && Boolean(selectedAddress) && stateAllowsPod && shortfallMinor === 0;
  const naira0 = (minor: number) => `₦${Math.round(minor / 100).toLocaleString("en-NG")}`;
  const podUnavailableReason = !podGloballyOn
    ? "Pay on Delivery isn't offered right now. Please pay now to place this order."
    : !selectedAddress
      ? "Choose a delivery address to see if Pay on Delivery is available where you are."
      : !stateAllowsPod
        ? `Pay on Delivery isn't available in ${stateName || "your State"} yet.`
        : `Pay on Delivery in ${stateName} needs an order total of ${naira0(podMinimumForState)} or more (goods, VAT and delivery). Add ${naira0(shortfallMinor)} more to unlock it.`;
  // If the address changes to a State without Pay on Delivery, fall back to Pay now.
  useEffect(() => {
    if (method === "PAY_AT_HANDOVER" && !podAvailable) setMethod("PREPAID");
  }, [method, podAvailable]);

  // Always look at the freshest State and settings when the customer opens the payment choices.
  useEffect(() => {
    if (sheet !== "payment") return;
    void operatingStates.refetch();
    void config.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  const busy = preview.isPending || confirm.isPending || createPaymentLink.isPending;
  const estimatedEarnMinor = calculateHookCoinEarnMinor(money.subtotalMinor, config.data);

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
        deliveryFeeMinor: stateDeliveryFeeMinor,
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
    if (placingRef.current) return; // a second tap while the first is still working
    if (!cartItems.length) return toast.error("Your cart is empty");
    if (minimumMinor > 0 && money.subtotalMinor < minimumMinor) {
      toast.info("Add a little more to check out", `Orders start at ₦${(minimumMinor / 100).toLocaleString("en-NG")}.`);
      router.replace("/(app)/cart" as never);
      return;
    }
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
    const acceptedPolicyVersions = {
      TERMS: policyVersions.TERMS,
      PRIVACY: policyVersions.PRIVACY,
      RETURNS: policyVersions.RETURNS,
    };
    if (!acceptedPolicies) return toast.error("Accept the current Hook policies to continue");

    placingRef.current = true;
    // Once the order exists, any later failure sends the customer to it instead of back to a now-empty cart.
    let placedOrderId: string | undefined;
    try {
      setPaymentStage("creating");
      const summary = await preview.mutateAsync({
        addressId: selectedAddress.publicId,
        deliveryMethod: "HOME_DELIVERY",
        paymentMethod: method,
        policyVersions: acceptedPolicyVersions,
        logisticsProviderId: provider.publicId || provider.id,
        couponCode: coupon?.code,
        useCredits,
        deliveryNote: deliveryNote.trim() || undefined,
      });
      // One key per logical checkout, stored on the device. A retry after a
      // timeout, remount or app restart reuses it, so the server returns the
      // order it already created instead of making a second one.
      const idempotencyKey = await stableIdempotencyKey(
        "checkout.confirm",
        JSON.stringify({
          address: selectedAddress.publicId,
          provider: provider.publicId || provider.id,
          coupon: coupon?.code ?? null,
          credits: Boolean(useCredits),
          items: cartItems.map((item: any) => [item.id ?? item.publicId, item.quantity]),
        }),
      );
      let order;
      try {
        order = await confirm.mutateAsync({ previewToken: summary.previewToken, idempotencyKey });
      } catch (error) {
        // A definite rejection (e.g. balance changed) frees the key so the
        // corrected checkout can run; an ambiguous one keeps it for the retry.
        if (!isAmbiguousFailure(error)) await releaseIdempotencyKey("checkout.confirm");
        else toast.info("We could not confirm your order went through", "Tap Pay now again. You will not be charged twice.");
        throw error;
      }
      await releaseIdempotencyKey("checkout.confirm");
      placedOrderId = order.id;

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
      const outcome = await waitForPaymentConfirmation(order.id);
      if (outcome === "confirmed") {
        toast.success("Payment confirmed");
        router.replace({ pathname: "/payments/[id]", params: { id: order.id } } as never);
        return;
      }
      toast.info("Payment confirmation is still processing");
      router.replace({ pathname: "/payments/[id]", params: { id: order.id } } as never);
    } catch (error) {
      setPaymentStage(null);
      const code = error instanceof ApiError ? error.code : undefined;
      const refreshCommerce = () => {
        void queryClient.invalidateQueries({ queryKey: ["mobile", "cart"] });
        void queryClient.invalidateQueries({ queryKey: ["mobile", "credits"] });
        void queryClient.invalidateQueries({ queryKey: ["mobile", "addresses"] });
      };
      if (placedOrderId) {
        // The order is placed but payment did not start. Take them to it: it has "Pay securely".
        toast.info("Your order is placed", "Finish paying from the order page.");
        router.replace({ pathname: "/orders/[id]", params: { id: placedOrderId } } as never);
      } else if (code === "MINIMUM_ORDER_NOT_MET") {
        toast.info("Add a little more to check out", error instanceof Error ? error.message : undefined);
        router.replace("/(app)/cart" as never);
      } else if (code === "POD_NOT_ELIGIBLE") {
        // Not available here (state switched off, below the minimum, or the option was suspended): fall back to paying online.
        setMethod("PREPAID");
        toast.info("Pay on delivery isn't available for this order", error instanceof Error ? error.message : "Choose Pay now to continue.");
      } else if (code === "EMAIL_VERIFICATION_REQUIRED") {
        toast.info("Verify your email to check out");
        router.push("/auth/verify-email" as never);
      } else if (code === "CHECKOUT_REVALIDATION_REQUIRED" || code === "CART_VERSION_CHANGED" || code === "NEGOTIATION_QUOTE_EXPIRED" || code === "CREDIT_BALANCE_CHANGED") {
        // Something changed since the customer last looked. Refresh what they see, then let them review.
        refreshCommerce();
        toast.info("Your order changed", error instanceof Error ? error.message : "Review your cart and try again.");
      } else if (!isAmbiguousFailure(error)) {
        // Ambiguous failures already showed their own guidance above.
        toast.error(error instanceof Error ? error.message : "Checkout could not be completed");
      }
    } finally {
      placingRef.current = false;
      setPaymentFlowActive(false);
    }
  }

  if (paymentStage) return <PaymentProcessingScreen stage={paymentStage} />;

  // While a guest cart is being merged into the account (or the server cart is
  // still loading), the cart is not "empty", it is on its way.
  if (cart.isLoading || addresses.isLoading || config.isLoading || syncingCommerce || (!cartItems.length && cart.isFetching))
    return <HookPageLoading variant="form" title="Checkout" label={syncingCommerce ? "Moving your cart to your account" : "Preparing checkout"} />;

  if (!cartItems.length) return <EmptyCheckout />;

  const addressLabel = selectedAddress
    ? [selectedAddress.line1, selectedAddress.cityName].filter(Boolean).join(", ")
      || selectedAddress.label
      || selectedAddress.recipientName
    : undefined;
  const readyForPayment = Boolean(selectedAddress && provider && paymentChosen);

  function openPolicy(type: "terms" | "privacy" | "returns") {
    router.push(`/legal/${type}?from=checkout` as never);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F1F1F3", paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
        <HookPageHeader title="Checkout" centered />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<HookRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          padding: 16,
          // Clears the 52pt floating action without leaving a large empty
          // band after the consent card on taller phones.
          paddingBottom: Math.max(insets.bottom, 12) + 72,
        }}
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
          <CheckoutRow placeholder="Payment method" value={paymentChosen ? (method === "PAY_AT_HANDOVER" ? "Pay on delivery" : "Pay now") : undefined} onPress={() => setSheet("payment")} />
          {podGloballyOn && selectedAddress ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 }}>
              <Ionicons name={stateAllowsPod && shortfallMinor === 0 ? "checkmark-circle" : "information-circle-outline"} size={15} color={stateAllowsPod && shortfallMinor === 0 ? "#30B940" : "#8A8A8A"} />
              <Text style={{ flex: 1, fontSize: 12, color: "#666" }}>{stateAllowsPod ? (shortfallMinor > 0 ? `Pay on Delivery in ${stateName} starts at ${naira0(podMinimumForState)} (goods, VAT and delivery). Add ${naira0(shortfallMinor)} more to unlock it.` : `Pay on Delivery is available in ${stateName} on orders of ${naira0(podMinimumForState)} or more in total.`) : `Pay on Delivery isn't available in ${stateName || "your State"} yet.`}</Text>
            </View>
          ) : null}
          {money.creditsAppliedMinor > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Hook credit is on. ${Math.round(money.creditsAppliedMinor / 100).toLocaleString("en-NG")} naira will be applied automatically. Tap to change.`}
              onPress={() => setSheet("payment")}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, borderColor: "#E9B900", backgroundColor: "#FFF9E5", paddingHorizontal: 14, paddingVertical: 11 }}
            >
              <View style={{ height: 28, width: 28, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFC809" }}>
                <Ionicons name="wallet-outline" size={16} color="#111" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: "NunitoSans-Bold", color: "#111" }}>Hook credit is on</Text>
                <Text style={{ marginTop: 1, fontSize: 12, lineHeight: 17, color: "#666" }}>
                  ₦{Math.round(money.creditsAppliedMinor / 100).toLocaleString("en-NG")} will be used automatically.
                </Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: "NunitoSans-Bold", color: "#7A6200" }}>Change</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ marginTop: 24, gap: 10 }}>
          <Text className="text-base font-medium text-black">Coupon</Text>
          {coupon ? (
            <AppliedCouponCard {...coupon} onRemove={removeCoupon} />
          ) : (
            <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", borderRadius: 18, backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
              <ClearableInput
                containerStyle={{ flex: 1 }}
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
          <ReviewOrderSection
            items={cartItems}
            onEditOrder={() => router.push("/(app)/cart" as never)}
          />
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
            podSurchargeMinor={money.podSurchargeMinor}
            payNowMinor={method === "PAY_AT_HANDOVER" ? money.podPayNowMinor : undefined}
          />
        </View>

        <View style={{ marginTop: 28, borderRadius: 18, borderWidth: 1, borderColor: acceptedPolicies ? "#E4B500" : "#E1E1E4", backgroundColor: acceptedPolicies ? "#FFF9E5" : "white", padding: 16 }}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedPolicies }}
            accessibilityLabel="Accept Hook checkout policies"
            onPress={() => setAcceptedPolicies((current) => !current)}
            style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <View style={{ height: 26, width: 26, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1.5, borderColor: acceptedPolicies ? "#111" : "#B8B8BD", backgroundColor: acceptedPolicies ? "#FFC809" : "#F7F7F8" }}>
              {acceptedPolicies ? <Ionicons name="checkmark" size={17} color="#111" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: "NunitoSans-Bold", color: "#111" }}>I agree to Hook&apos;s checkout policies</Text>
              <Text style={{ marginTop: 2, fontSize: 12, lineHeight: 17, color: "#666" }}>Required before secure payment.</Text>
            </View>
          </Pressable>
          <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5, borderTopWidth: 1, borderTopColor: "rgba(17,17,17,0.08)", paddingTop: 12 }}>
            <Text style={{ fontSize: 12, lineHeight: 20, color: "#666" }}>Read</Text>
            <Text accessibilityRole="link" onPress={() => openPolicy("terms")} style={{ fontSize: 12, lineHeight: 20, fontFamily: "NunitoSans-Bold", color: "#6F5900", textDecorationLine: "underline" }}>Terms</Text>
            <Text style={{ fontSize: 12, color: "#888" }}>·</Text>
            <Text accessibilityRole="link" onPress={() => openPolicy("privacy")} style={{ fontSize: 12, lineHeight: 20, fontFamily: "NunitoSans-Bold", color: "#6F5900", textDecorationLine: "underline" }}>Privacy</Text>
            <Text style={{ fontSize: 12, color: "#888" }}>·</Text>
            <Text accessibilityRole="link" onPress={() => openPolicy("returns")} style={{ fontSize: 12, lineHeight: 20, fontFamily: "NunitoSans-Bold", color: "#6F5900", textDecorationLine: "underline" }}>Returns Policy</Text>
          </View>
          {readyForPayment && !acceptedPolicies ? (
            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Ionicons name="information-circle-outline" size={15} color="#8A6500" />
              <Text style={{ flex: 1, fontSize: 11, lineHeight: 16, color: "#8A6500" }}>Check the box above to enable payment.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BottomActionBar>
        <BottomActionButton
          label={
            !selectedAddress
              ? "Choose address"
              : !provider
                ? "Choose logistics"
                : !paymentChosen
                  ? "Choose payment method"
                  : !acceptedPolicies
                    ? "Accept policies to pay"
                    : method === "PAY_AT_HANDOVER"
                      ? `Pay ₦${Math.round(money.podPayNowMinor / 100).toLocaleString("en-NG")} now`
                      : "Pay now"
          }
          disabled={busy || (readyForPayment && !acceptedPolicies)}
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
        estimatedEarnMinor={estimatedEarnMinor}
        payNowTotalMinor={money.prepaidTotalMinor}
        podTotalMinor={money.payableBeforeCredits}
        stateName={stateName}
        creditsAppliedMinor={money.prepaidCreditsMinor}
        podPaused={podPaused}
        method={method}
        onSelectMethod={setMethod}
        podAvailable={podAvailable}
        podUnavailableReason={podUnavailableReason}
        podPayNowMinor={money.podPayNowMinor}
        podAtDoorMinor={money.podAtDoorMinor}
        onToggleCredits={handleToggleCredits}
        onChoosePayNow={() => { setPaymentChosen(true); setSheet(null); }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}
