import { Menu, Plus, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { NavigationMenu } from '@/components/NavigationMenu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

interface NavbarProps {
  onMenuClick?: () => void;
  onAddClick?: () => void;
}

export function Navbar({ onMenuClick, onAddClick }: NavbarProps) {
  const { isOffline } = useServiceWorker();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  return (
    <>
      <nav className="border-b bg-background">
        <div className="flex h-16 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <h1 className="text-xl font-bold ml-4 md:ml-0">Todo Claude</h1>
          
          {/* オフライン状態の表示 */}
          {isOffline && (
            <div className="ml-4 flex items-center gap-2 text-orange-600">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">オフライン</span>
            </div>
          )}
          
          <div className="ml-auto">
            {isHomePage && onAddClick && (
              <Button onClick={onAddClick}>
                <Plus className="h-4 w-4 mr-2" />
                新しいタスク
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* モバイルメニュー */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>メニュー</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <NavigationMenu onItemClick={() => setMobileMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}