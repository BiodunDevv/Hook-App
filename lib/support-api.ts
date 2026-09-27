import { Linking } from "react-native";
import { apiRequest } from "@/lib/api";

export type SupportContact = { supportEmail?: string; supportUrl?: string; helpCenterUrl?: string };

const FALLBACK_SUPPORT_URL = process.env.EXPO_PUBLIC_SUPPORT_URL || "mailto:support@hook.africa";

async function fetchSupportContact(): Promise<SupportContact> {
  try {
    return await apiRequest<SupportContact>("/public/support", { auth: false });
  } catch {
    return {};
  }
}

// "Help & Support" opens whatever admins configured — a help center if set, otherwise a mailto: link.
export async function openSupport() {
  const contact = await fetchSupportContact();
  const url = contact.supportUrl || (contact.supportEmail ? `mailto:${contact.supportEmail}` : FALLBACK_SUPPORT_URL);
  await Linking.openURL(url);
}

// Same admin-configured destination as openSupport(), with the order pre-filled when the target can take a query param.
export async function openOrderSupport(orderId: string) {
  const contact = await fetchSupportContact();
  const base = contact.supportUrl || contact.helpCenterUrl || (contact.supportEmail ? `mailto:${contact.supportEmail}` : FALLBACK_SUPPORT_URL);
  const url = base.startsWith("mailto:") ? base : `${base}${base.includes("?") ? "&" : "?"}orderId=${encodeURIComponent(orderId)}`;
  await Linking.openURL(url);
}
