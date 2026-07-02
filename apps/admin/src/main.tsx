import { setApiBaseUrl } from '@repo/api-client';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { router } from './app/router';
import { store } from './app/store';
import { installAuthBridge } from './auth/authBridge';
import { AuthGate } from './auth/AuthGate';
import { ToastProvider } from './components/ui';
import { ThemeProvider } from './theme/ThemeProvider';
import './styles/global.css';

// Point the API client at VITE_API_BASE_URL when set (e.g. deployed builds). In local dev the var
// is unset and the client uses the same-origin `/api/v1` proxied to the backend (vite.config).
const apiBaseUrl = (import.meta.env as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL;
if (apiBaseUrl) setApiBaseUrl(apiBaseUrl);

// Attach the admin token to every API call + refresh on 401 (must run before any request).
installAuthBridge();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <AuthGate>
            <RouterProvider router={router} />
          </AuthGate>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
