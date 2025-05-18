import { useEffect, useState } from 'react';

export function useServiceWorker() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showReload, setShowReload] = useState(false);
  // const [wb, setWb] = useState<any>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Service worker is registered by vite-pwa-plugin
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
      });

      // Listen for new service worker
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowReload(true);
      });
    }

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
    // Just reload the page to activate new service worker
    window.location.reload();
  };

  return {
    isOffline,
    registration,
    showReload,
    reloadPage,
  };
}