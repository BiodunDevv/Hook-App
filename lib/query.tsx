import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';
import { MobileRealtimeBridge } from '@/lib/realtime';
import { PushNotificationBridge } from '@/lib/push-bridge';
import { ApiError } from '@/lib/api';
import { AppReleaseGate } from '@/components/shared/AppReleaseGate';

export function AppQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 10,
            refetchOnMount: true,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false;
              return failureCount < 1;
            },
            staleTime: 1000 * 30,
          },
          mutations: {
            retry: 0,
            // Never park a purchase behind the offline flag: try it, and let it fail with a clear error the customer can act on.
            networkMode: "always",
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>
    {children}
    <MobileRealtimeBridge />
    <PushNotificationBridge />
    <AppReleaseGate />
  </QueryClientProvider>;
}
