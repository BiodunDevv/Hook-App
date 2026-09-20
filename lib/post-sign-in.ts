import { syncAnonymousCommerce } from "@/lib/commerce-sync";
import { registerPushToken } from "@/lib/push";
import { saveSession, type AuthSession } from "@/lib/session";

/**
 * The one place every sign-in and sign-up flow finishes through: store the
 * session, then merge the guest cart and favourites into the account and
 * register for push. The merge used to run only for Google and Apple, so
 * email sign-ins arrived at checkout with an empty server cart.
 * Sync failures never block sign-in; the guest data stays on the device and is
 * retried on the next sign-in.
 */
export async function completeSignIn(session: AuthSession) {
  await saveSession(session);
  await Promise.allSettled([syncAnonymousCommerce(), registerPushToken({ sendWelcome: true })]);
}
