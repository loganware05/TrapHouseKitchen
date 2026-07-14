import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';

async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  const { SplashScreen } = await import('@capacitor/splash-screen');
  await StatusBar.setStyle({ style: Style.Light });
  await SplashScreen.hide();
}

void initNativeShell();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

