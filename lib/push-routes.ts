/**
 * Where a tapped notification goes. The Backend sends `screen` and `params`
 * with every push; older pushes only carried `type` and `orderId`, so those
 * still resolve. Anything unknown opens the notification inbox.
 */
export type PushData = {
  type?: string;
  screen?: string;
  params?: Record<string, unknown>;
  notificationId?: string;
  orderId?: string;
} & Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : undefined);

export function routeForPush(data: PushData): string {
  const params = { ...(data.params || {}), ...data } as Record<string, unknown>;
  const orderId = text(params.orderId);
  const productId = text(params.productId);
  const categoryId = text(params.categoryId);
  const marketId = text(params.marketId);

  switch (data.screen) {
    case "order":
      return orderId ? `/orders/${orderId}` : "/orders";
    case "orders":
      return "/orders";
    case "cart":
      return "/(app)/cart";
    case "checkout":
      return "/checkout";
    case "product":
      return productId ? `/products/${productId}` : "/(tabs)/discover";
    case "shop":
      return categoryId ? `/shop/${categoryId}` : "/(tabs)/discover";
    case "market":
      return marketId ? `/markets/${marketId}` : "/(tabs)/discover";
    case "states":
      return "/states";
    case "credits":
      return "/credits";
    case "referrals":
      return "/referrals";
    case "negotiation": {
      const variantId = text(params.variantId);
      return productId && variantId
        ? `/negotiations/new?productId=${encodeURIComponent(productId)}&variantId=${encodeURIComponent(variantId)}&quantity=${text(params.quantity) || 1}`
        : "/(tabs)/messages";
    }
    case "devices":
      return "/profile/devices";
    case "security":
      return "/profile/security";
    case "addresses":
      return "/addresses";
    case "home":
      return "/(tabs)";
    case "update":
    case "notifications":
      return "/notifications";
    default:
      break;
  }

  // Older pushes: only a type and, for orders, an order id.
  const type = String(data.type || "");
  if (type === "welcome" || type === "welcome_back") return "/(tabs)";
  if (orderId) return `/orders/${orderId}`;
  return "/notifications";
}
