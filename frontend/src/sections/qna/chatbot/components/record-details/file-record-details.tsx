import { FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecordDetailsResponse } from 'src/sections/knowledgebase/types/record-details';

interface FileRecordDetailsProps {
  fileRecord: NonNullable<RecordDetailsResponse['record']['fileRecord']>;
  onViewDocument?: () => void;
}

export function FileRecordDetails({ fileRecord, onViewDocument }: FileRecordDetailsProps) {
  const isPDF = fileRecord?.extension?.toLowerCase() === 'pdf';

  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
        <FileText className="size-4.5 text-primary" />
        File Information
      </h3>

      <div className="p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              File Name
            </p>
            <p className="text-sm text-foreground">{fileRecord.name}</p>
          </div>

          {fileRecord?.extension && (
            <div className="flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                File Extension
              </p>
              <p className="text-sm text-foreground">{fileRecord.extension}</p>
            </div>
          )}

          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              MIME Type
            </p>
            <p className="text-sm text-foreground">{fileRecord.mimeType}</p>
          </div>

          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Size
            </p>
            <p className="text-sm text-foreground">
              {(fileRecord.sizeInBytes / 1024).toFixed(2)} KB
            </p>
          </div>
        </div>

        {isPDF && onViewDocument && (
          <div className="mt-4">
            <Button onClick={onViewDocument} className="gap-2">
              <File className="size-4" />
              View Document
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
