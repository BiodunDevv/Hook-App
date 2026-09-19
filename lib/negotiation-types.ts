export interface NegotiationMessage {
  sequence?: number;
  requestId?: string;
  id?: string;
  kind?: "text" | "suggestions" | "action" | "receipt";
  role: "customer" | "hook";
  message: string;
  createdAt?: string;
  offeredPriceMinor?: number;
  productIds?: string[];
  actionId?: string;
  quantity?: number;
}

export interface NegotiationResponse {
  version?: number;
  processing?: boolean;
  shoppingEnabled?: boolean;
  peopleNegotiating?: number;
  negotiationId: string;
  status: "active" | "agreed" | "closed" | "expired" | "declined";
  transcript?: NegotiationMessage[];
  message?: string;
  entry?: NegotiationMessage;
  variantId?: string;
  quantity?: number;
  remainingOffers?: number;
  maximumOffers?: number;
  offerCount?: number;
  expiresAt?: string;
  sessionMode?: "fixed" | "unlimited";
  counterPriceMinor?: number;
  lastCounterPriceMinor?: number;
  agreedPriceMinor?: number;
  quoteId?: string;
  quote?: {
    id: string;
    agreedPriceMinor: number;
    expiresAt: string;
    status: string;
  };
  product?: {
    id: string;
    title: string;
    imageUrl?: string;
    effectivePriceMinor: number;
    currency?: string;
    description?: string;
    market?: { name: string };
  };
}

export function negotiationMessageKey(
  entry: NegotiationMessage,
  index: number,
) {
  return (
    entry.id || `legacy-${index}-${entry.role}-${entry.createdAt || "undated"}`
  );
}
