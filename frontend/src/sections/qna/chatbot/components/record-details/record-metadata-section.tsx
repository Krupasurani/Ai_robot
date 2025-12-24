import { Building2, Shapes, Bookmark, Languages } from 'lucide-react';
import type { RecordDetailsResponse } from 'src/sections/knowledgebase/types/record-details';
import { MetadataChips } from 'src/sections/knowledgebase/components/metadata-chips';

interface RecordMetadataSectionProps {
  metadata: RecordDetailsResponse['metadata'];
}

export function RecordMetadataSection({ metadata }: RecordMetadataSectionProps) {
  if (!metadata) return null;

  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
        <Shapes className="size-4.5 text-primary" />
        Metadata
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Departments */}
        {metadata.departments && metadata.departments.length > 0 && (
          <div className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              <Building2 className="size-3.5" />
              Departments
            </p>
            <MetadataChips items={metadata.departments} />
          </div>
        )}

        {/* Categories */}
        {metadata.categories && metadata.categories.length > 0 && (
          <div className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              <Shapes className="size-3.5" />
              Document Category
            </p>
            <MetadataChips items={metadata.categories} />
          </div>
        )}

        {/* Subcategories1 */}
        {metadata.subcategories1 &&
          metadata.subcategories1.length > 0 &&
          metadata.subcategories1[0]?.name !== '' && (
            <div className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Document Sub-category level 1
              </p>
              <MetadataChips items={metadata.subcategories1} />
            </div>
          )}

        {/* Subcategories2 */}
        {metadata.subcategories2 &&
          metadata.subcategories2.length > 0 &&
          metadata.subcategories2[0]?.name !== '' && (
            <div className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Document Sub-category level 2
              </p>
              <MetadataChips items={metadata.subcategories2} />
            </div>
          )}

        {/* Subcategories3 */}
        {metadata.subcategories3 &&
          metadata.subcategories3.length > 0 &&
          metadata.subcategories3[0]?.name !== '' && (
            <div className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Document Sub-category level 3
              </p>
              <MetadataChips items={metadata.subcategories3} />
            </div>
          )}

        {/* Topics */}
        {metadata.topics && metadata.topics.length > 0 && (
          <div className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50 md:col-span-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              <Bookmark className="size-3.5" />
              Topics
            </p>
            <MetadataChips items={metadata.topics} />
          </div>
        )}

        {/* Languages */}
        {metadata.languages && metadata.languages.length > 0 && (
          <div className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              <Languages className="size-3.5" />
              Languages
            </p>
            <MetadataChips items={metadata.languages} />
          </div>
        )}
      </div>
    </div>
  );
}
