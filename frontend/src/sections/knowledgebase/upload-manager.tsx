import { useDropzone } from 'react-dropzone';
import React, { useMemo, useState, useEffect, useId } from 'react';
import {
  X,
  Upload as UploadIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Folder,
  FilePlus,
  FolderUp,
  File,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/utils/cn';

import axios from 'src/utils/axios';

interface FileWithPath extends File {
  webkitRelativePath: string;
  lastModified: number;
}

interface UploadManagerProps {
  open: boolean;
  onClose: () => void;
  knowledgeBaseId: string | null | undefined;
  folderId: string | null | undefined;
  onUploadSuccess: (message?: string) => Promise<void>;
}

interface ProcessedFile {
  file: FileWithPath;
  path: string;
  lastModified: number;
  isOversized: boolean;
}

// Default maximum file size: 30MB in bytes (fallback)
const DEFAULT_MAX_FILE_SIZE = 30 * 1024 * 1024;

export default function UploadManager({
  open,
  onClose,
  knowledgeBaseId,
  folderId,
  onUploadSuccess,
}: UploadManagerProps) {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [maxFileSize, setMaxFileSize] = useState<number>(DEFAULT_MAX_FILE_SIZE);
  const [loadingLimits, setLoadingLimits] = useState(false);

  const fileInputId = useId();
  const folderInputId = useId();

  // Fetch upload limits from backend
  useEffect(() => {
    let mounted = true;
    const fetchLimits = async () => {
      try {
        setLoadingLimits(true);
        const response = await axios.get('/api/v1/knowledgeBase/limits');
        if (mounted && response.data?.maxFileSizeBytes) {
          setMaxFileSize(response.data.maxFileSizeBytes);
        }
      } catch (error) {
        // Use default if fetching limits fails
        console.warn('Failed to fetch upload limits, using default:', error);
        if (mounted) {
          setMaxFileSize(DEFAULT_MAX_FILE_SIZE);
        }
      } finally {
        if (mounted) setLoadingLimits(false);
      }
    };

    if (open) {
      fetchLimits();
    }

    return () => {
      mounted = false;
    };
  }, [open]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  // Memoized calculations for file statistics
  const fileStats = useMemo(() => {
    const oversizedFiles = files.filter((pf) => pf.isOversized);
    const validFiles = files.filter((pf) => !pf.isOversized);
    return {
      total: files.length,
      oversized: oversizedFiles.length,
      valid: validFiles.length,
      oversizedFiles,
      validFiles,
    };
  }, [files]);

  const removeFileFromSelection = (target: ProcessedFile) => {
    const targetKey = `${target.path}-${target.file.size}-${target.lastModified}`;
    setFiles((prev) =>
      prev.filter((pf) => `${pf.path}-${pf.file.size}-${pf.lastModified}` !== targetKey)
    );
  };

  const removeAllOversizedFiles = () => {
    setFiles((prev) => prev.filter((pf) => !pf.isOversized));
  };

  // Simplified file processing - just extract path and metadata
  const processFiles = (acceptedFiles: FileWithPath[]): ProcessedFile[] =>
    acceptedFiles
      .filter((file) => file.name !== '.DS_Store' && !file.name.startsWith('.'))
      .map((file) => {
        // Use webkitRelativePath if available (folder upload), otherwise use file name
        const path = file.webkitRelativePath || file.name;

        return {
          file,
          path,
          lastModified: file.lastModified || Date.now(),
          isOversized: file.size > maxFileSize,
        };
      });

  const onDrop = (acceptedFiles: FileWithPath[]) => {
    const processedFiles = processFiles(acceptedFiles);

    // Append new files to existing ones instead of replacing
    setFiles((prevFiles) => {
      // Create a map of existing files by path to avoid duplicates
      const existingFileMap = new Map(
        prevFiles.map((pf) => [`${pf.path}-${pf.file.size}-${pf.lastModified}`, pf])
      );

      // Add new files, skipping duplicates
      processedFiles.forEach((pf) => {
        const key = `${pf.path}-${pf.file.size}-${pf.lastModified}`;
        if (!existingFileMap.has(key)) {
          existingFileMap.set(key, pf);
        }
      });

      return Array.from(existingFileMap.values());
    });

    setUploadError({ show: false, message: '' });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const fileList = Array.from(event.target.files) as FileWithPath[];
      onDrop(fileList);
      event.target.value = '';
    }
  };

  const handleFolderInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const fileList = Array.from(event.target.files) as FileWithPath[];
      onDrop(fileList);
      event.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadError({ show: true, message: 'Please select at least one file to upload.' });
      return;
    }
    if (!knowledgeBaseId) {
      setUploadError({ show: true, message: 'Knowledge base id missing. Please refresh' });
      return;
    }

    if (fileStats.oversized > 0) {
      setUploadError({
        show: true,
        message: `Cannot upload: ${fileStats.oversized} file(s) exceed the 30MB limit. Please remove them to continue.`,
      });
      return;
    }

    setUploading(true);
    setUploadError({ show: false, message: '' });
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Add knowledge base ID
      formData.append('kb_id', knowledgeBaseId);

      // Add files with their metadata (only valid files)
      fileStats.validFiles.forEach((processedFile) => {
        // Add the actual file
        formData.append('files', processedFile.file);

        // Add metadata for each file
        formData.append(`file_paths`, processedFile.path);
        formData.append(`last_modified`, processedFile.lastModified.toString());
      });

      const url = folderId
        ? `/api/v1/knowledgebase/${knowledgeBaseId}/folder/${folderId}/upload`
        : `/api/v1/knowledgebase/${knowledgeBaseId}/upload`;

      // Track upload progress
      const response = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      setUploadProgress(100);

      // Show success message
      const uploadResult = response.data;
      const successMessage =
        uploadResult.message ||
        `Successfully uploaded ${fileStats.valid} file${fileStats.valid > 1 ? 's' : ''}.`;

      // Reset uploading state first
      setUploading(false);

      // Call success callback
      await onUploadSuccess(successMessage);

      // Small delay to ensure all state updates complete before closing
      setTimeout(() => {
        handleClose();
      }, 100);
    } catch (error: any) {
      setUploadError({
        show: true,
        message:
          error.response?.data?.message ||
          error.message ||
          'Failed to upload files. Please try again.',
      });
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setUploadError({ show: false, message: '' });
      setUploadProgress(0);
      onClose();
    }
  };

  // Group files by folders for display
  const groupFilesByFolder = (fileList: ProcessedFile[]) => {
    const rootFiles: ProcessedFile[] = [];
    const folderGroups: Record<
      string,
      { files: ProcessedFile[]; oversizedCount: number; validCount: number }
    > = {};

    fileList.forEach((file) => {
      if (file.path.includes('/')) {
        // File is in a folder
        const folderPath = file.path.substring(0, file.path.lastIndexOf('/'));
        if (!folderGroups[folderPath]) {
          folderGroups[folderPath] = { files: [], oversizedCount: 0, validCount: 0 };
        }
        folderGroups[folderPath].files.push(file);
        if (file.isOversized) {
          folderGroups[folderPath].oversizedCount += 1;
        } else {
          folderGroups[folderPath].validCount += 1;
        }
      } else {
        // Root file
        rootFiles.push(file);
      }
    });

    return { rootFiles, folderGroups };
  };

  const renderFileItem = (processedFile: ProcessedFile, indent: boolean = false) => (
    <div
      className={cn(
        'flex items-center gap-3 py-2.5 px-3 rounded-md transition-all border',
        processedFile.isOversized
          ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10'
          : 'border-transparent hover:bg-muted/50',
        indent && 'pl-6'
      )}
    >
      {processedFile.isOversized ? (
        <AlertCircle className="size-4.5 text-destructive flex-shrink-0" />
      ) : (
        <File className="size-4.5 text-muted-foreground flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            processedFile.isOversized ? 'text-destructive' : 'text-foreground'
          )}
          title={processedFile.file.name}
        >
          {processedFile.file.name}
        </p>
        <p
          className={cn(
            'text-xs',
            processedFile.isOversized ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {formatFileSize(processedFile.file.size)}
          {processedFile.isOversized && ' • Exceeds 30MB limit'}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeFileFromSelection(processedFile)}
        className="size-7 opacity-60 hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
      >
        <X className="size-4" />
      </Button>
    </div>
  );

  const renderFilesList = () => {
    if (files.length === 0) return null;

    const { rootFiles, folderGroups } = groupFilesByFolder(files);

    return (
      <div className="mt-6">
        {/* Stats Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-4">
            <p className="text-sm font-semibold text-foreground">{fileStats.total} selected</p>

            <div className="flex items-center gap-2">
              {fileStats.valid > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-600 border-green-500/20"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span className="text-xs font-semibold">{fileStats.valid} ready</span>
                </Badge>
              )}

              {fileStats.oversized > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1.5 px-2 py-0.5 bg-destructive/10 text-destructive border-destructive/20"
                >
                  <AlertCircle className="size-3.5" />
                  <span className="text-xs font-semibold">{fileStats.oversized} oversized</span>
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fileStats.oversized > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={removeAllOversizedFiles}
                className="h-7 px-3 text-xs font-medium rounded-md"
              >
                Remove oversized
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles([])}
              className="h-7 px-3 text-xs font-medium rounded-md text-muted-foreground hover:bg-muted"
            >
              Clear all
            </Button>
          </div>
        </div>

        {/* File List */}
        <div className="max-h-[380px] overflow-y-auto pr-2">
          {/* Root files */}
          {rootFiles.length > 0 && (
            <div className="mb-4 space-y-1">
              {rootFiles.map((processedFile, index) => (
                <div key={`root-${index}`}>{renderFileItem(processedFile, false)}</div>
              ))}
            </div>
          )}

          {/* Folders and their files */}
          {Object.entries(folderGroups).map(([folderPath, folderData]) => (
            <div key={folderPath} className="mb-6">
              {/* Folder header */}
              <div className="flex items-center gap-3 mb-2 py-2 px-3 rounded-md bg-muted/30">
                <Folder className="size-4.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{folderPath}</p>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {folderData.files.length} {folderData.files.length === 1 ? 'file' : 'files'}
                </p>
              </div>

              {/* Files in folder */}
              <div className="space-y-1">
                {[...folderData.files]
                  .sort((a, b) => (b.isOversized ? 1 : 0) - (a.isOversized ? 1 : 0))
                  .map((processedFile, index) => (
                    <div key={`${folderPath}-${index}`}>{renderFileItem(processedFile, true)}</div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Warning Banner */}
        {fileStats.oversized > 0 && (
          <Alert variant="destructive" className="mt-4 rounded-lg">
            <AlertCircle className="size-5" />
            <div className="flex-1">
              <AlertTitle className="text-sm font-semibold mb-1">
                {fileStats.oversized} {fileStats.oversized === 1 ? 'file exceeds' : 'files exceed'}{' '}
                size limit
              </AlertTitle>
              <AlertDescription className="text-sm">
                Remove oversized files to continue with the remaining {fileStats.valid}{' '}
                {fileStats.valid === 1 ? 'file' : 'files'}.
              </AlertDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={removeAllOversizedFiles}
              className="ml-4 whitespace-nowrap"
            >
              Remove all
            </Button>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
        <DialogHeader className="flex items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-semibold">Upload Files</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1.5">
              {files.length > 0
                ? `${files.length} ${files.length === 1 ? 'file' : 'files'} selected • Add more or remove to adjust`
                : 'Select files or folders to upload • Max 30MB per file'}
            </p>
          </div>
        </DialogHeader>

        {uploading ? (
          <div className="flex flex-col items-center justify-center min-h-[320px] py-12">
            <Loader2 className="size-14 mb-6 animate-spin text-primary" />
            <h3 className="text-base font-semibold mb-1">
              Uploading {fileStats.valid} {fileStats.valid === 1 ? 'file' : 'files'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Please wait while we process your upload
            </p>
            <div className="w-full max-w-[420px] space-y-2">
              <Progress value={uploadProgress} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-center">
                {Math.round(uploadProgress)}%
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Error Message */}
              {uploadError.show && (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertCircle className="size-5" />
                  <div className="flex-1">
                    <AlertTitle className="text-sm font-semibold mb-1">Upload Error</AlertTitle>
                    <AlertDescription className="text-sm">{uploadError.message}</AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setUploadError({ show: false, message: '' })}
                    className="size-6 -mt-1"
                  >
                    <X className="size-4" />
                  </Button>
                </Alert>
              )}

              {/* Hidden inputs */}
              <input
                id={fileInputId}
                type="file"
                onChange={handleFileInputChange}
                className="hidden"
                multiple
              />
              <input
                id={folderInputId}
                type="file"
                onChange={handleFolderInputChange}
                className="hidden"
                multiple
                {...({ webkitdirectory: '', directory: '' } as {
                  webkitdirectory?: string;
                  directory?: string;
                })}
              />

              {/* Dropzone - Only show when no files are selected */}
              {files.length === 0 ? (
                <div
                  {...getRootProps()}
                  className={cn(
                    'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary hover:bg-primary/5'
                  )}
                >
                  <input {...getInputProps()} />
                  <UploadIcon
                    className={cn(
                      'size-12 mx-auto mb-4',
                      isDragActive ? 'text-primary' : 'text-muted-foreground opacity-60'
                    )}
                  />
                  <h3 className="text-base font-semibold mb-0.5">
                    {isDragActive ? 'Drop here to upload' : 'Drag and drop files or folders'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    or click to browse from your computer
                  </p>

                  <div className="flex items-center justify-center gap-3">
                    <Button asChild variant="outline" className="rounded-lg font-medium">
                      <label htmlFor={fileInputId} onClick={(e) => e.stopPropagation()}>
                        <FilePlus className="mr-2 size-4" />
                        Browse files
                      </label>
                    </Button>
                    <Button asChild variant="outline" className="rounded-lg font-medium">
                      <label htmlFor={folderInputId} onClick={(e) => e.stopPropagation()}>
                        <FolderUp className="mr-2 size-4" />
                        Browse folders
                      </label>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Compact add more files bar when files are present */
                <div className="flex items-center gap-3 p-3.5 rounded-lg bg-primary/5 border border-dashed border-border hover:bg-primary/10 hover:border-primary/30 transition-all">
                  <FilePlus className="size-5 text-primary opacity-70" />
                  <p className="flex-1 text-sm text-muted-foreground font-medium">
                    Add more to selection
                  </p>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-xs font-medium rounded-md text-primary hover:bg-primary/10"
                  >
                    <label htmlFor={fileInputId} onClick={(e) => e.stopPropagation()}>
                      <FilePlus className="mr-1.5 size-3.5" />
                      Add files
                    </label>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-xs font-medium rounded-md text-primary hover:bg-primary/10"
                  >
                    <label htmlFor={folderInputId} onClick={(e) => e.stopPropagation()}>
                      <FolderUp className="mr-1.5 size-3.5" />
                      Add folder
                    </label>
                  </Button>
                </div>
              )}

              {/* Files List */}
              {renderFilesList()}
            </div>

            <Separator />

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={handleClose} className="rounded-lg">
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || fileStats.oversized > 0}
                className="rounded-lg font-semibold gap-2"
              >
                <UploadIcon className="size-4" />
                {fileStats.oversized > 0
                  ? 'Remove oversized files first'
                  : fileStats.valid > 0
                    ? `Upload ${fileStats.valid} ${fileStats.valid === 1 ? 'file' : 'files'}`
                    : 'Upload'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
