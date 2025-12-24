import React from 'react';
import { Button } from '@/components/ui/button';
import { Tag, Star, Home, FolderTree } from 'lucide-react';

type Space = {
  id: string;
  name: string;
  count?: number;
};

type TagType = {
  id: string;
  name: string;
  count?: number;
};

interface KBSidebarProps {
  spaces?: Space[];
  tags?: TagType[];
  activeSpaceId?: string | null;
  selectedTagIds?: string[];
  onSelectSpace?: (spaceId: string | null) => void;
  onToggleTag?: (tagId: string) => void;
  onShowFavorites?: () => void;
  className?: string;
}

export default function KBSidebar({
  spaces = [],
  tags = [],
  activeSpaceId = null,
  selectedTagIds = [],
  onSelectSpace,
  onToggleTag,
  onShowFavorites,
  className,
}: KBSidebarProps) {
  return (
    <aside
      className={`h-full w-full bg-background border-r border-border overflow-auto ${className || ''}`}
      aria-label="Knowledge base navigation"
    >
      <div className="p-4">
        {/* Quick links */}
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => onSelectSpace?.(null)}
            aria-label="Show all knowledge bases"
          >
            <Home className="w-4 h-4 mr-2" />
            All
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={onShowFavorites}
            aria-label="Show favorites"
          >
            <Star className="w-4 h-4 mr-2" />
            Favorites
          </Button>
        </div>

        {/* Spaces */}
        <div className="mt-6">
          <div className="flex items-center gap-2 px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <FolderTree className="w-3.5 h-3.5" />
            Spaces
          </div>
          <nav className="space-y-1">
            {spaces.length === 0 ? (
              <div className="text-xs text-muted-foreground px-2 py-1.5 rounded-lg bg-muted/40">
                No spaces yet
              </div>
            ) : (
              spaces.map((space) => {
                const isActive = activeSpaceId === space.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => onSelectSpace?.(space.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground text-foreground'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`Space ${space.name}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{space.name}</span>
                      {typeof space.count === 'number' && (
                        <span className="text-xs text-muted-foreground">{space.count}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </nav>
        </div>

        {/* Tags */}
        <div className="mt-6">
          <div className="flex items-center gap-2 px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Tag className="w-3.5 h-3.5" />
            Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <div className="text-xs text-muted-foreground px-2 py-1.5 rounded-lg bg-muted/40">
                No tags yet
              </div>
            ) : (
              tags.map((tag) => {
                const isSelected = selectedTagIds?.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => onToggleTag?.(tag.id)}
                    className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-accent'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Tag ${tag.name}`}
                  >
                    <span className="font-medium">{tag.name}</span>
                    {typeof tag.count === 'number' && (
                      <span className={`ml-2 ${isSelected ? 'opacity-80' : 'text-muted-foreground'}`}>
                        {tag.count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}


