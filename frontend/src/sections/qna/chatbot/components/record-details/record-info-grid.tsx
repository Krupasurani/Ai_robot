import type {
  RecordDetailsResponse,
  Permissions,
} from 'src/sections/knowledgebase/types/record-details';
import { Badge } from '@/components/ui/badge';

interface RecordInfoGridProps {
  record: RecordDetailsResponse['record'];
  knowledgeBase?: RecordDetailsResponse['knowledgeBase'];
  permissions?: Permissions[];
}

export function RecordInfoGrid({ record, knowledgeBase, permissions }: RecordInfoGridProps) {
  const infoItems = [
    { label: 'Name', value: record.recordName },
    { label: 'Record Type', value: record.recordType },
    { label: 'Origin', value: record.origin },
    { label: 'Indexing Status', value: record.indexingStatus },
    { label: 'Version', value: record.version },
    {
      label: 'Created At',
      value: new Date(record.createdAtTimestamp).toLocaleString(),
    },
    {
      label: 'Updated At',
      value: new Date(record.updatedAtTimestamp).toLocaleString(),
    },
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 my-4">
      {infoItems.map((item) => (
        <div
          key={item.label}
          className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50 hover:bg-muted/60 dark:hover:bg-muted/30 transition-colors"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {item.label}
          </p>
          <p className="text-sm font-medium text-foreground">{item.value || 'N/A'}</p>
        </div>
      ))}

      {/* Knowledge Base */}
      {knowledgeBase && (
        <div className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50 hover:bg-muted/60 dark:hover:bg-muted/30 transition-colors">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Knowledge Base
          </p>
          <p className="text-sm font-medium text-foreground">{knowledgeBase.name}</p>
        </div>
      )}

      {/* Permissions */}
      {permissions && permissions.length > 0 && (
        <div className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50 hover:bg-muted/60 dark:hover:bg-muted/30 transition-colors">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Permissions
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {permissions.map((permission) => (
              <Badge
                key={permission?.id || permission?.relationship}
                variant="secondary"
                className="h-5.5 px-2 py-0.5 text-xs font-medium rounded border"
              >
                {permission?.relationship}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
