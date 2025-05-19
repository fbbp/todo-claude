import { useServiceWorker } from '@/hooks/useServiceWorker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerUpdate() {
  const { needRefresh, reloadPage } = useServiceWorker();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="p-4 flex items-center gap-3 shadow-lg">
        <RefreshCw className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <p className="font-semibold">アップデートがあります</p>
          <p className="text-sm text-gray-600">
            新しいバージョンが利用可能です
          </p>
        </div>
        <Button onClick={reloadPage} variant="default" size="sm">
          更新
        </Button>
      </Card>
    </div>
  );
}