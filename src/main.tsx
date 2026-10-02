import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { ToastProvider } from '@/contexts/ToastProvider';
import { ApiBusyProvider } from '@/contexts/ApiBusyProvider';
import { ConfirmProvider } from '@/contexts/ConfirmProvider';
import { PwaProvider } from '@/contexts/PwaProvider';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <ApiBusyProvider>
                <PwaProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </PwaProvider>
              </ApiBusyProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
