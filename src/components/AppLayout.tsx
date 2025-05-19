import { Outlet } from 'react-router-dom';
import { NavigationMenu } from '@/components/NavigationMenu';

export function AppLayout() {
  return (
    <div className="h-screen flex">
      {/* デスクトップサイドバー */}
      <aside className="hidden md:block w-64 bg-muted/10 border-r">
        <div className="p-6">
          <h1 className="text-xl font-bold mb-6">Todo Claude</h1>
          <NavigationMenu />
        </div>
      </aside>
      
      {/* メインコンテンツ */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}