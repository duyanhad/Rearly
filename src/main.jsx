import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './components/Toast';
import { registerServiceWorker } from './utils/notify';
import { queryClient } from './queryClient';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')).render(<StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>);

// Đăng ký service worker để nhắc uống nước hiện được thông báo hệ thống.
void registerServiceWorker();