// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { AppConfig } from '@/contexts/AppContext';
import AppRouter from './AppRouter';
import { DEFAULT_RELAYS } from '@/lib/relays';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

const defaultConfig: AppConfig = {
  theme: "light",
  relayUrls: DEFAULT_RELAYS,
};

const presetRelays = [
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.plebeian.market', name: 'Plebeian Market' },
  { url: 'wss://nos.lol', name: 'nos.lol' },
  { url: 'wss://relay.nostr.band', name: 'Nostr.Band' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
  { url: 'wss://ditto.pub/relay', name: 'Ditto' },
];

function AppContent() {
  return (
    <div className="flex-grow">
      <AppRouter />
    </div>
  );
}

export function App() {
  return (
    <UnheadProvider head={head}>
      <div className="flex flex-col min-h-screen"> {/* Added flex-col min-h-screen */}
        <AppProvider storageKey="gamma-bulk:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
          <QueryClientProvider client={queryClient}>
            <NostrLoginProvider storageKey='nostr:login'>
              <NostrProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Suspense>
                    <AppContent /> {/* Render AppContent here */}
                  </Suspense>
                </TooltipProvider>
              </NostrProvider>
            </NostrLoginProvider>
          </QueryClientProvider>
        </AppProvider>
        <div className="text-center text-xs text-muted-foreground mt-8 mb-4"> {/* Footer */}
          <p>
            Vibecoded with love by <a href="https://njump.me/yojimble@getalby.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#ff07a9' }}>Yojimble</a> using <a href="https://soapbox.pub/mkstack" target="_blank" rel="noopener noreferrer" className="underline">MKStack</a>
          </p>
        </div>
      </div>
    </UnheadProvider>
  );
}

export default App;
