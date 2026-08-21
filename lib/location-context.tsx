import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type HookOperatingState = {
  publicId?: string;
  code: string;
  name: string;
  capitalName?: string;
  operationsEnabled?: boolean;
  deliveryEnabled?: boolean;
};

export const ALL_STATES: HookOperatingState = { code: 'ALL', name: 'All States' };
const STORAGE_KEY = 'hook.marketplace.selected-state';

type LocationContextValue = {
  selectedState: HookOperatingState;
  stateParams?: { stateCode: string };
  selectState: (state: HookOperatingState) => Promise<void>;
  ready: boolean;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function HookLocationProvider({ children }: { children: ReactNode }) {
  const [selectedState, setSelectedState] = useState<HookOperatingState>(ALL_STATES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value) return;
        const parsed = JSON.parse(value) as HookOperatingState;
        if (parsed?.code && parsed?.name) setSelectedState(parsed);
      })
      .catch(() => AsyncStorage.removeItem(STORAGE_KEY))
      .finally(() => setReady(true));
  }, []);

  const selectState = useCallback(async (state: HookOperatingState) => {
    setSelectedState(state);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  const value = useMemo<LocationContextValue>(() => ({
    selectedState,
    stateParams: selectedState.code === ALL_STATES.code ? undefined : { stateCode: selectedState.code },
    selectState,
    ready,
  }), [ready, selectState, selectedState]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useHookLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useHookLocation must be used inside HookLocationProvider');
  return context;
}
