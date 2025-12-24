import { Badge } from '@/components/ui/badge';
import type { MetadataItem } from '../types/record-details';

interface MetadataChipsProps {
  items: MetadataItem[];
}

export function MetadataChips({ items }: MetadataChipsProps) {
  if (!items || items.length === 0) return null;

  const validItems = items.filter((item: MetadataItem) => item && item.name);
  if (validItems.length === 0) return null;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {validItems.map((item: MetadataItem) => (
        <Badge
          key={item.id}
          variant="secondary"
          className="h-5.5 px-2 py-0.5 text-xs font-medium rounded border"
        >
          {item.name}
        </Badge>
      ))}
    </div>
  );
}
