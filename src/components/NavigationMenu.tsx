import { Link, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Archive, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigationItems: NavigationItem[] = [
  { path: '/', label: 'ホーム', icon: Home },
  { path: '/categories', label: 'カテゴリー', icon: FolderOpen },
  { path: '/all', label: '全タスク', icon: Archive },
  { path: '/settings', label: '設定', icon: Settings },
];

interface NavigationMenuProps {
  onItemClick?: () => void;
}

export function NavigationMenu({ onItemClick }: NavigationMenuProps) {
  const location = useLocation();

  return (
    <nav className="space-y-1">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}