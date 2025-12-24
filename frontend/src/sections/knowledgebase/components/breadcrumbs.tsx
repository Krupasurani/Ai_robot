import React, { useState } from 'react';
import { Home, Brain, Folder, ChevronRight } from 'lucide-react';

import { cn } from '@/utils/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/drop-down-menu';

export const renderSmartBreadcrumbs = (
  navigationPath: any,
  navigateToDashboard: any,
  navigateToPathIndex: any
) => {
  const maxVisibleItems = 4;
  const pathLength = navigationPath.length;

  if (pathLength <= maxVisibleItems) {
    return (
      <nav className="flex items-center gap-1 overflow-hidden" aria-label="Breadcrumb">
        <CompactBreadcrumb as="button" onClick={navigateToDashboard} isHome>
          <Home size={14} />
          <span className="hidden ml-0.5 text-[0.8125rem] sm:inline">Home</span>
        </CompactBreadcrumb>
        {navigationPath.map((item: any, index: any) => (
          <React.Fragment key={item.id}>
            <ChevronRight size={14} className="text-muted-foreground" />
            <CompactBreadcrumb
              as="button"
              onClick={() => navigateToPathIndex(index)}
              isLast={index === pathLength - 1}
            >
              {item.type === 'kb' ? (
                item.icon ? (
                  <span className="text-sm">{item.icon}</span>
                ) : (
                  <Brain size={14} />
                )
              ) : (
                <Folder size={14} />
              )}
              <span
                className={cn(
                  'ml-0.5 text-[0.8125rem] overflow-hidden text-ellipsis whitespace-nowrap',
                  'max-w-[80px] sm:max-w-[120px]'
                )}
              >
                {item.name}
              </span>
            </CompactBreadcrumb>
          </React.Fragment>
        ))}
      </nav>
    );
  }

  const currentItem = navigationPath[pathLength - 1];
  const parentItem = pathLength > 1 ? navigationPath[pathLength - 2] : null;
  const kbItem = navigationPath[0];

  return (
    <nav className="flex min-w-0 items-center gap-0.5 overflow-hidden" aria-label="Breadcrumb">
      <CompactBreadcrumb as="button" onClick={navigateToDashboard} isHome>
        <Home size={14} />
        <span className="hidden ml-0.5 text-[0.8125rem] sm:inline">Home</span>
      </CompactBreadcrumb>

      <ChevronRight size={14} className="text-muted-foreground" />

      <CompactBreadcrumb as="button" onClick={() => navigateToPathIndex(0)}>
        {kbItem.icon ? (
          <span className="text-sm">{kbItem.icon}</span>
        ) : (
          <Brain size={14} />
        )}
        <span className="ml-0.5 max-w-[60px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] sm:max-w-[100px]">
          {kbItem.name}
        </span>
      </CompactBreadcrumb>

      {pathLength > 2 && (
        <>
          <ChevronRight size={14} className="text-muted-foreground" />
          <SimpleBreadcrumbDropdown
            hiddenItems={navigationPath.slice(1, pathLength - 1)}
            onItemClick={navigateToPathIndex}
          />
        </>
      )}

      {parentItem && pathLength > 1 && (
        <>
          <ChevronRight size={14} className="text-muted-foreground" />
          <CompactBreadcrumb as="button" onClick={() => navigateToPathIndex(pathLength - 2)}>
            <Folder size={14} />
            <span className="ml-0.5 max-w-[50px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] sm:max-w-[80px]">
              {parentItem.name}
            </span>
          </CompactBreadcrumb>
        </>
      )}

      <ChevronRight size={14} className="text-muted-foreground" />
      <CompactBreadcrumb as="span" isLast>
        <Folder size={14} />
        <span className="ml-0.5 max-w-[60px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] sm:max-w-[100px]">
          {currentItem.name}
        </span>
      </CompactBreadcrumb>
    </nav>
  );
};

const CompactBreadcrumb: React.FC<{
  as?: 'button' | 'span';
  isHome?: boolean;
  isLast?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ as: Component = 'div', isHome, isLast, onClick, children }) => {
  const baseClasses =
    'flex items-center px-1.5 py-1 rounded text-[0.8125rem] font-medium min-w-0 transition-all';
  const colorClasses = isLast
    ? 'text-foreground cursor-default'
    : 'text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground';

  if (Component === 'button') {
    return (
      <button type="button" onClick={onClick} className={cn(baseClasses, colorClasses)}>
        {children}
      </button>
    );
  }

  return <span className={cn(baseClasses, colorClasses)}>{children}</span>;
};

const SimpleBreadcrumbDropdown = ({
  hiddenItems,
  onItemClick,
}: {
  hiddenItems: Array<{ id: string; name: string; type: 'kb' | 'folder' }>;
  onItemClick: (index: number) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-6 min-w-[24px] items-center justify-center rounded bg-transparent text-[0.8125rem] font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
        >
          ...
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px] rounded-lg border shadow-md">
        {hiddenItems.map((item: any, relativeIndex: any) => {
          const actualIndex = relativeIndex + 1;
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => {
                onItemClick(actualIndex);
                setOpen(false);
              }}
              className="flex items-center gap-2 py-2 px-3 text-[0.8125rem] font-medium"
            >
              {item.type === 'kb' ? <Brain size={16} /> : <Folder size={16} />}
              <span>{item.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
