import { Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  onMenuClick?: () => void;
  onAddClick?: () => void;
}

export function Navbar({ onMenuClick, onAddClick }: NavbarProps) {
  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h1 className="text-xl font-bold ml-4 md:ml-0">Todo Claude</h1>
        
        <div className="ml-auto">
          <Button onClick={onAddClick}>
            <Plus className="h-4 w-4 mr-2" />
            新しいタスク
          </Button>
        </div>
      </div>
    </nav>
  );
}