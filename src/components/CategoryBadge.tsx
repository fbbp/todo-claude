import { cn } from '@/lib/utils';
import type { Category } from '../db';

interface CategoryBadgeProps {
  category: Category;
  selected?: boolean;
  onClick?: (category: Category) => void;
}

export function CategoryBadge({ category, selected, onClick }: CategoryBadgeProps) {
  return (
    <button
      onClick={() => onClick?.(category)}
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors',
        'border hover:shadow-sm',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:border-primary/50'
      )}
      style={{
        borderColor: selected ? category.color : undefined,
        backgroundColor: selected ? category.color : undefined,
      }}
    >
      <div
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: selected ? 'currentColor' : category.color }}
      />
      {category.name}
    </button>
  );
}