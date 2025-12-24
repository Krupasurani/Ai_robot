import * as React from 'react';
import { cn } from '@/utils/cn';
import { LucideIcon } from 'lucide-react';
import { Badge } from './badge';

export interface Category {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  isActive?: boolean;
}

interface CategorySidebarProps {
  categories: Category[];
  onCategorySelect?: (categoryId: string) => void;
  className?: string;
  title?: string;
}

export function CategorySidebar({
  categories,
  onCategorySelect,
  className,
  title = 'Categories',
}: CategorySidebarProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {title && <h3 className="text-sm font-semibold text-foreground px-2 py-1.5">{title}</h3>}
      <div className="flex flex-col gap-1">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategorySelect?.(category.id)}
              className={cn(
                'flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                'hover:bg-secondary hover:text-secondary-foreground',
                category.isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-foreground'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {Icon && <Icon className="size-4 shrink-0" />}
                <span className="truncate">{category.label}</span>
              </div>
              {category.count !== undefined && (
                <Badge
                  variant={category.isActive ? 'default' : 'secondary'}
                  className="shrink-0 text-xs h-5 px-1.5"
                >
                  {category.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

