import type { FileRejection } from 'react-dropzone';
import { fData } from 'src/utils/format-number';
import { cn } from '@/utils/cn';
import { uploadClasses } from '../classes';
import { fileData } from '../utils';

type RejectionFilesProps = {
  files: FileRejection[];
  className?: string;
};

export function RejectionFiles({ files, className }: RejectionFilesProps) {
  if (!files.length) {
    return null;
  }

  return (
    <div
      className={cn(
        uploadClasses.uploadRejectionFiles,
        'mt-3 rounded-md border border-dashed border-destructive bg-destructive/10 px-2 py-1 text-left',
        className
      )}
    >
      {files.map(({ file, errors }) => {
        const { path, size } = fileData(file);

        return (
          <div key={path} className="my-1">
            <p className="truncate text-sm font-semibold">
              {path} - {size ? fData(size) : ''}
            </p>

            {errors.map((error) => (
              <span key={error.code} className="text-xs">
                - {error.message}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
