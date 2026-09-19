import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '@/lib/api';
import { hookRealtime } from '@/lib/realtime';
import { parseStoreRelease, storeUpdateDecision, type StoreRelease } from '@/lib/app-release-policy';
import { isPaymentFlowActive, onPaymentFlowChanged } from '@/lib/payment-flow';
import { HookSheet } from './HookSheet';
import { Button } from '@/components/ui/button';
import { toast } from './toast';
import { hookPlayStoreUrl, resolveHookAppStoreUrl } from '@/lib/app-store-link';
import { createReleaseRefresh } from '@/lib/release-refresh';

export function AppReleaseGate() {
  const pathname = usePathname();
  const [release, setRelease] = useState<StoreRelease | null>(null);
  const [dismissed, setDismissed] = useState('');
  const [dismissUntil, setDismissUntil] = useState(0);
  const [paymentActive, setPaymentActive] = useState(isPaymentFlowActive());
  const [busy, setBusy] = useState(false);
  const [openingStore, setOpeningStore] = useState(false);
  const refresh = useRef<(force?: boolean) => Promise<void>>(async () => undefined);
  const installed = { version: Application.nativeApplicationVersion || '', build: Application.nativeBuildVersion || '' };
  const eligible = (Platform.OS === 'android' || Platform.OS === 'ios') && Application.applicationId === 'com.biodun42.hook' && Boolean(installed.version && installed.build);
  useEffect(() => onPaymentFlowChanged(setPaymentActive), []);
  useEffect(() => {
    if (!dismissed || !dismissUntil) return;
    const timer = setTimeout(() => setDismissed(''), Math.max(0, dismissUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [dismissed, dismissUntil]);
  useEffect(() => {
    if (!eligible) return;
    let active = true, freshApplied = false;
    const cacheKey = `hook.store-release.${Platform.OS}.${Application.applicationId}`;
    const scheduler = createReleaseRefresh(async () => {
      if (active) setBusy(true);
      try {
        const result = await apiRequest<{ release: unknown }>(`/public/app-release?platform=${Platform.OS}&version=${encodeURIComponent(installed.version)}&build=${encodeURIComponent(installed.build)}`, { auth: false });
        const current = parseStoreRelease(result.release);
        if (result.release !== null && !current) throw new Error('Invalid release policy');
        if (active) { freshApplied = true; setRelease(current); }
        await AsyncStorage.setItem(cacheKey, JSON.stringify(current)).catch(() => undefined);
      } catch { /* Keep the last confirmed policy; outages never invent a requirement. */ }
      finally { if (active) setBusy(false); }
    });
    const check = scheduler.check;
    refresh.current = check;
    void (async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (active && cached && !freshApplied) setRelease(parseStoreRelease(JSON.parse(cached)));
      } catch { /* Ignore invalid local data. */ }
      if (active) await check(true);
    })();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') { setDismissed(''); setDismissUntil(0); void check(true); }
    });
    const stop = hookRealtime.on((event) => { if (event === 'app-release.updated' || event === 'realtime.connected') void check(true); });
    return () => { active = false; scheduler.stop(); appState.remove(); stop(); refresh.current = async () => undefined; };
  }, [eligible, installed.version, installed.build]);
  const decision = storeUpdateDecision(release, installed);
  const defer = paymentActive || pathname === '/splash';
  const required = eligible && decision.required && !defer;
  const optional = eligible && decision.available && !required && !decision.required && !defer && release?.id !== dismissed;
  async function later() {
    if (!release) return;
    setDismissed(release.id);
    const until = Date.now() + 86_400_000;
    setDismissUntil(until);
  }
  async function openStore() {
    if (!release || openingStore) return;
    setOpeningStore(true);
    try {
      const storeUrl = Platform.OS === 'android' ? hookPlayStoreUrl : await resolveHookAppStoreUrl();
      if (!storeUrl) { toast.error('Hook’s App Store listing is not available yet. Please try again later.'); return; }
      const nativeUrl = Platform.OS === 'android' ? 'market://details?id=com.biodun42.hook' : storeUrl.replace('https://', 'itms-apps://');
      try { await Linking.openURL(nativeUrl); } catch { await Linking.openURL(storeUrl); }
    } catch { toast.error('Could not open the store. Please try again.'); }
    finally { setOpeningStore(false); }
  }
  const information = <><Text className="mb-3 text-sm text-[#66666B]">Version {release?.version}</Text><ScrollView style={{ maxHeight: 240 }}><Text className="mb-5 text-base leading-6 text-[#66666B]">{release?.releaseNotes}</Text></ScrollView><Button title={openingStore ? 'Opening store…' : 'Update now'} disabled={openingStore} onPress={() => void openStore()} /></>;
  return <>
    <Modal visible={required} animationType="fade" onRequestClose={() => undefined}>
      <SafeAreaView className="flex-1 justify-center bg-[#F1F1F3] px-6"><View accessibilityViewIsModal><Text accessibilityRole="header" className="mb-3 text-2xl font-bold">Update Hook to continue</Text><Text className="mb-5 text-base text-[#66666B]">A newer supported version is available in the store. Your account and saved items will remain available after updating.</Text>{information}<Button title={busy ? 'Checking…' : 'Check again'} variant="ghost" disabled={busy} onPress={() => void refresh.current(true)} /></View></SafeAreaView>
    </Modal>
    <HookSheet visible={optional} title="A new Hook update is ready" message="Get the latest improvements from your app store." onClose={() => void later()}>{information}<Button title="Later" variant="ghost" onPress={() => void later()} /></HookSheet>
  </>;
}
