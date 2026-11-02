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
import { MotionConfig } from 'framer-motion';
import { LazyMotion, domAnimation } from 'framer-motion';

createRoot(document.getElementById('root')).render(<StrictMode>
    <ErrorBoundary>
      {/* reducedMotion='user': máy nào bật "giảm chuyển động" thì mọi hiệu ứng tự tắt */}
      {/* domAnimation: chỉ nạp phần animation cần dùng (~15KB) thay vì cả thư viện */}
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AuthProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </AuthProvider>
            </BrowserRouter>
          </QueryClientProvider>
        </MotionConfig>
      </LazyMotion>
    </ErrorBoundary>
  </StrictMode>);

// Đăng ký service worker để nhắc uống nước hiện được thông báo hệ thống.
void registerServiceWorker();