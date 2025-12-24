import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { m, AnimatePresence } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTranslate } from '@/locales/use-locales';

type ProcessedFile = {
  filename: string;
  fileType: string;
  markdownContent: string;
  processingTimeMs: number;
};

type UploadingFile = {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  processed?: ProcessedFile;
};

interface FileUploadDisplayProps {
  processedFiles: ProcessedFile[];
  uploadingFiles: UploadingFile[];
  onRemoveProcessedFile: (filename: string) => void;
}

export const FileUploadDisplay = React.memo<FileUploadDisplayProps>(
  ({ processedFiles, uploadingFiles, onRemoveProcessedFile }) => {
    const { t } = useTranslate('navbar');

    return (
      <>
        {/* Processed Files Display */}
        {processedFiles.length > 0 && (
          <div className="mb-2">
            <span className="block text-xs text-muted-foreground mb-1">
              {t('chatInput.attachedFiles')} ({processedFiles.length}):
            </span>
            <div className="flex flex-wrap gap-1">
              <AnimatePresence>
                {processedFiles.map((file, index) => (
                  <m.div
                    key={`${file.filename}-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Badge
                      variant="secondary"
                      className="h-6 px-2 text-xs font-medium cursor-pointer bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30"
                    >
                      <FileText size={14} className="mr-1" />
                      <span className="mr-1">{`${file.filename} (${file.fileType})`}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveProcessedFile(file.filename)}
                        className="ml-1 hover:opacity-70"
                        aria-label={`Remove ${file.filename}`}
                      >
                        <X size={14} />
                      </button>
                    </Badge>
                  </m.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Uploading Files Display */}
        {uploadingFiles.length > 0 && (
          <div className="mb-2">
            <AnimatePresence>
              {uploadingFiles.map((uploadingFile, index) => (
                <m.div
                  key={`${uploadingFile.file.name}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'p-2 mb-1 rounded-md bg-muted/50',
                    uploadingFile.status === 'error'
                      ? 'border border-destructive'
                      : uploadingFile.status === 'completed'
                        ? 'border border-green-500'
                        : 'border border-border'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{uploadingFile.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {uploadingFile.status === 'uploading' && t('chatInput.uploading')}
                      {uploadingFile.status === 'processing' && t('chatInput.processing')}
                      {uploadingFile.status === 'completed' && `✅ ${t('chatInput.completed')}`}
                      {uploadingFile.status === 'error' && `❌ ${t('chatInput.error')}`}
                    </span>
                  </div>

                  {uploadingFile.status === 'uploading' && (
                    <Progress value={uploadingFile.progress} className="h-0.5" />
                  )}

                  {uploadingFile.status === 'processing' && <Progress className="h-0.5" />}

                  {uploadingFile.status === 'error' && uploadingFile.error && (
                    <p className="text-xs text-destructive mt-1">{uploadingFile.error}</p>
                  )}
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </>
    );
  }
);

FileUploadDisplay.displayName = 'FileUploadDisplay';
