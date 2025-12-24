import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User as UserIcon } from 'lucide-react';
import { MetadataChips } from './metadata-chips';
import type { RecordDetailsResponse, MetadataItem } from '../types/record-details';
import type { User } from 'src/context/UserContext';

interface RecordDetailsSidebarProps {
  record: RecordDetailsResponse['record'];
  metadata: RecordDetailsResponse['metadata'];
  users: User[];
}

const hasValidNames = (items: MetadataItem[]) => {
  if (!items || items.length === 0) return false;
  return items.some((item: MetadataItem) => item && item.name);
};

export function RecordDetailsSidebar({ record, metadata, users }: RecordDetailsSidebarProps) {
  const isMailRecord = record.recordType === 'MAIL' && record.mailRecord;

  return (
    <div className="lg:col-span-1">
      <Card className="rounded-lg shadow-sm h-full flex flex-col -z-[708]">
        <CardHeader className="border-b p-5">
          <h3 className="text-base font-medium">Additional Information</h3>
        </CardHeader>

        <CardContent className="p-6 flex-1">
          <div className="space-y-6">
            {/* Email specific information */}
            {isMailRecord &&
              record.mailRecord &&
              record.mailRecord.labelIds &&
              record.mailRecord.labelIds.length > 0 && (
                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                    Labels
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {record.mailRecord.labelIds.map((label) => (
                      <Badge
                        key={label}
                        variant="secondary"
                        className="h-5.5 px-2 py-0.5 text-xs font-medium rounded border"
                      >
                        {label.split('_').join(' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            {isMailRecord && record.mailRecord && record.mailRecord.date && (
              <div>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                  Date
                </label>
                <p className="text-sm font-medium">{record.mailRecord.date}</p>
              </div>
            )}

            {/* Departments */}
            {metadata?.departments &&
              metadata.departments.length > 0 &&
              hasValidNames(metadata.departments) && (
                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                    Departments
                  </label>
                  <MetadataChips items={metadata.departments} />
                </div>
              )}

            {metadata?.categories &&
              metadata.categories.length > 0 &&
              hasValidNames(metadata.categories) && (
                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                    Document Category
                  </label>
                  <MetadataChips items={metadata.categories} />
                </div>
              )}

            {/* Subcategories1 */}
            {metadata?.subcategories1 &&
              metadata.subcategories1.length > 0 &&
              hasValidNames(metadata.subcategories1) && (
                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                    Sub-category Level 1
                  </label>
                  <MetadataChips items={metadata.subcategories1} />
                </div>
              )}

            {/* Subcategories2 */}
            {metadata?.subcategories2 &&
              metadata.subcategories2.length > 0 &&
              hasValidNames(metadata.subcategories2) && (
                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                    Sub-category Level 2
                  </label>
                  <MetadataChips items={metadata.subcategories2} />
                </div>
              )}

            {/* Subcategories3 */}
            {metadata?.subcategories3 &&
              metadata.subcategories3.length > 0 &&
              hasValidNames(metadata.subcategories3) && (
                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                    Sub-category Level 3
                  </label>
                  <MetadataChips items={metadata.subcategories3} />
                </div>
              )}

            {/* Topics */}
            {metadata?.topics && metadata.topics.length > 0 && hasValidNames(metadata.topics) && (
              <div>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                  Topics
                </label>
                <MetadataChips items={metadata.topics} />
              </div>
            )}

            {/* Languages */}
            {metadata?.languages &&
              metadata.languages.length > 0 &&
              hasValidNames(metadata.languages) && (
                <div>
                  <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                    Languages
                  </label>
                  <MetadataChips items={metadata.languages} />
                </div>
              )}

            {(record.departments || record.appSpecificRecordType) && <Separator className="my-2" />}

            {/* Original department section from the record */}
            {record.departments && record.departments.length > 0 && (
              <div>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                  Record Departments
                </label>
                <div className="flex gap-2 flex-wrap">
                  {record.departments.map((dept) => (
                    <Badge
                      key={dept._id}
                      variant="default"
                      className="h-6 px-3 py-1 text-xs font-medium rounded-md border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {dept.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Original categories from the record */}
            {record.appSpecificRecordType && record.appSpecificRecordType.length > 0 && (
              <div>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                  Record Categories
                </label>
                <div className="flex gap-2 flex-wrap">
                  {record.appSpecificRecordType.map((type) => (
                    <Badge
                      key={type._id}
                      variant="default"
                      className="h-6 px-3 py-1 text-xs font-medium rounded-md border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {type.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Original modules from the record */}
            {record.modules && record.modules.length > 0 && (
              <div>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                  Record Modules
                </label>
                <div className="flex gap-2 flex-wrap">
                  {record.modules.map((module) => (
                    <Badge
                      key={module._id}
                      variant="default"
                      className="h-6 px-3 py-1 text-xs font-medium rounded-md border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {module.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {record.createdBy && (
              <div>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3">
                  Created By
                </label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-4.5 w-4.5 text-primary opacity-80" />
                  </div>
                  <p className="text-sm font-medium">
                    {(users && users.find((u) => u._id === record.createdBy)?.fullName) ||
                      'Unknown User'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
