import { cn } from '@/utils/cn';
import { Card, CardContent, CardHeader } from './card';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { Badge } from './badge';
import { m } from 'framer-motion';

import { cardHoverVariants } from '@/utils/motion';

export interface CardItem {
  id: string;
  title: string;
  description?: string;
  metadata?: {
    label: string;
    value: string;
  }[];
  avatar?: {
    src?: string;
    fallback: string;
  };
  usageCount?: number;
  tags?: string[];
  onClick?: () => void;
}

interface CardGridProps {
  items: CardItem[];
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function CardGrid({ items, columns = 3, className }: CardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {items.map((item) => (
        <m.div
          variants={cardHoverVariants}
          initial="initial"
          whileHover="hover"
          className="cursor-pointer h-full"
          key={item.id}
          onClick={item.onClick}
        >
          <Card className="h-full flex flex-col transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-card-foreground truncate mb-1">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                </div>
                {item.avatar && (
                  <Avatar className="size-8 shrink-0 rounded-lg">
                    <AvatarImage src={item.avatar.src} alt={item.title} />
                    <AvatarFallback className="rounded-lg text-xs">
                      {item.avatar.fallback}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col justify-between">
              {/* Metadata */}
              {item.metadata && item.metadata.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-3">
                  {item.metadata.map((meta, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="font-medium">{meta.label}:</span>
                      <span>{meta.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.tags.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{item.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Footer with usage count */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                {item.usageCount !== undefined && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{item.usageCount}</span> uses
                  </div>
                )}
                <div className="flex-1" />
              </div>
            </CardContent>
          </Card>
        </m.div>
      ))}
    </div>
  );
}
