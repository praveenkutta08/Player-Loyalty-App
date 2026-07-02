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
