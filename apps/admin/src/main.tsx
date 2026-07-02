import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { router } from './app/router';
import { store } from './app/store';
import { ToastProvider } from './components/ui';
import { ThemeProvider } from './theme/ThemeProvider';
import './styles/global.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
