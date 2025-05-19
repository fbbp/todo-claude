import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function useServiceWorker() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  
  // PWA update handling
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        setRegistration(r);
        console.log('Service Worker registered');
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      console.log('App is ready to work offline');
    }
  }, [offlineReady]);

  useEffect(() => {
    // Handle online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const reloadPage = () => {
    // Update service worker and reload
    updateServiceWorker(true);
  };

  return {
    isOffline,
    registration,
    needRefresh,
    offlineReady,
    reloadPage,
  };
}