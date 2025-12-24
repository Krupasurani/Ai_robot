import type { Icon as IconifyIcon } from '@iconify/react';

import { Icon } from '@iconify/react';
import React, { useRef, useState, useEffect } from 'react';
import filePdfBoxIcon from '@iconify-icons/mdi/file-pdf-box';
import fileWordBoxIcon from '@iconify-icons/mdi/file-word-box';
import fileExcelBoxIcon from '@iconify-icons/mdi/file-excel-box';
import fileImageBoxIcon from '@iconify-icons/mdi/file-image-box';
import fileTextBoxIcon from '@iconify-icons/mdi/file-text-outline';
import fileCodeBoxIcon from '@iconify-icons/mdi/file-code-outline';
import fileArchiveBoxIcon from '@iconify-icons/mdi/archive-outline';
import filePowerpointBoxIcon from '@iconify-icons/mdi/file-powerpoint-box';
import fileDocumentOutlineIcon from '@iconify-icons/mdi/file-document-outline';
import fileDelimitedOutlineIcon from '@iconify-icons/mdi/file-delimited-outline';
import { X, Loader2, Info, Upload } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/utils/cn';

import axios from 'src/utils/axios';
import type { Record } from './types/record-details';
// Define a constant for maximum file size (30MB)
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB in bytes

interface SingleFileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  maxFileSize?: number; // in bytes
  onRecordUpdated: () => void;
  storageDocumentId: string;
  recordId: string;
  record: Record;
}

const SingleFileUploadDialog: React.FC<SingleFileUploadDialogProps> = ({
  open,
  onClose,
  maxFileSize = MAX_FILE_SIZE, // Default to 30MB if not specified
  onRecordUpdated,
  storageDocumentId,
  recordId,
  record,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [nameChanged, setNameChanged] = useState(false);
  const [descriptionChanged, setDescriptionChanged] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  // Create a ref for the file input to reset it when needed
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the current file extension from the record
  const currentExtension = record?.fileRecord?.extension?.toLowerCase() || '';
  const initialName = record?.recordName || '';
  const initialDescription = record?.description || '';
  const existingFile = !!record?.fileRecord;

  // Reset state when dialog opens/closes and set initial name
  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setNameChanged(false);
      setDescriptionChanged(false);
      setFileError(null);
      // Reset file input when dialog opens
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setFile(null);
      setUploading(false);
      setNameChanged(false);
      setDescriptionChanged(false);
      setFileError(null);
    }
  }, [open, initialName, initialDescription]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameChanged(true);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setDescriptionChanged(true);
  };

  // Helper function to get a more friendly file type name
  const getFileTypeName = (extension: string): string => {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return 'PDF';
      case 'xlsx':
      case 'xls':
        return 'Excel';
      case 'docx':
      case 'doc':
        return 'Word';
      case 'pptx':
      case 'ppt':
        return 'PowerPoint';
      case 'txt':
        return 'Text';
      case 'csv':
        return 'CSV';
      default:
        return extension.toUpperCase();
    }
  };

  const validateFile = (selectedFile: File): boolean => {
    const newExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';

    // Ensure an extension exists
    if (!newExtension) {
      setFileError('Invalid file type. Please select a valid file.');
      return false;
    }

    // If there's an existing file, enforce the same extension
    if (existingFile && currentExtension) {
      if (newExtension !== currentExtension) {
        setFileError(
          `File type mismatch. You must upload a ${getFileTypeName(currentExtension)} file (.${currentExtension}).`
        );
        return false;
      }
    }

    // Ensure file size is within the limit
    if (selectedFile.size > maxFileSize) {
      setFileError(`File is too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
      return false;
    }

    setFileError(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];

      if (!validateFile(selectedFile)) {
        // Reset the file input on validation failure
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setFile(selectedFile);

      // If name is empty, use the file name (without extension)
      if (!name.trim()) {
        const fileName = selectedFile.name.split('.').slice(0, -1).join('.');
        setName(fileName);
        setNameChanged(true);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];

      if (!validateFile(droppedFile)) {
        return;
      }

      setFile(droppedFile);

      // If name is empty, use the file name (without extension)
      if (!name.trim()) {
        const fileName = droppedFile.name.split('.').slice(0, -1).join('.');
        setName(fileName);
        setNameChanged(true);
      }
    }
  };

  const handleUpload = async () => {
    if (file && !validateFile(file)) {
      return; // Double-check validation before upload
    }

    setUploading(true);

    try {
      // Create FormData object
      const formData = new FormData();

      // Only append file if a new one was selected
      if (file) {
        formData.append('file', file);
      }
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      // Always append the current name (which might be changed or not)
      formData.append('recordName', name.trim() || (file ? file.name : initialName));

      // Append description if it was changed
      if (descriptionChanged) {
        formData.append('description', description.trim());
      }

      // Send the file to the API
      const response = await axios.put(
        `/api/v1/knowledgeBase/record/${recordId}`,
        formData,
        config
      );

      if (!response) {
        throw new Error(`Upload failed with status: ${response}`);
      }

      // Call onRecordUpdated
      onRecordUpdated();
      // Close the dialog
      onClose();
    } catch (error) {
      console.error('Error updating record:', error);
      setFileError('Failed to update. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  // Get file icon based on extension
  const getFileIcon = (extension: string): React.ComponentProps<typeof IconifyIcon>['icon'] => {
    const ext = extension?.toLowerCase() || '';

    switch (ext) {
      case 'pdf':
        return filePdfBoxIcon;
      case 'doc':
      case 'docx':
        return fileWordBoxIcon;
      case 'xls':
      case 'xlsx':
        return fileExcelBoxIcon;
      case 'ppt':
      case 'pptx':
        return filePowerpointBoxIcon;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return fileImageBoxIcon;
      case 'zip':
      case 'rar':
      case '7z':
        return fileArchiveBoxIcon;
      case 'txt':
        return fileTextBoxIcon;
      case 'html':
      case 'css':
      case 'js':
        return fileCodeBoxIcon;
      case 'csv':
        return fileDelimitedOutlineIcon;
      default:
        return fileDocumentOutlineIcon;
    }
  };

  // Get file icon color based on extension
  const getFileIconColor = (extension: string): string => {
    const ext = extension?.toLowerCase() || '';

    switch (ext) {
      case 'pdf':
        return '#f44336';
      case 'doc':
      case 'docx':
        return '#2196f3';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return '#4caf50';
      case 'ppt':
      case 'pptx':
        return '#ff9800';
      default:
        return '#1976d2';
    }
  };

  // Determine if we should enable the upload button
  const canUpload = file !== null || (nameChanged && name.trim() !== initialName) || (descriptionChanged && description.trim() !== initialDescription);

  // This function handles the "Browse File" button click
  const handleBrowseClick = () => {
    // If we can't determine the file type for an existing file, show an error
    if (existingFile && !currentExtension) {
      setFileError('Cannot determine the file type to upload. Please contact support.');
      return;
    }

    // Otherwise, trigger the file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {existingFile ? 'Replace File' : 'Upload File'}
          </DialogTitle>
        </DialogHeader>

        {uploading ? (
          <div className="flex flex-col items-center justify-center min-h-[250px] py-12">
            <Loader2 className="size-10.5 mb-6 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {file ? 'Uploading file...' : 'Updating record...'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {fileError && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="record-name" className="text-sm font-medium">
                Name {existingFile ? '' : '(Optional)'}
              </Label>
              <Input
                id="record-name"
                value={name}
                onChange={handleNameChange}
                placeholder="Enter name"
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="record-description" className="text-sm font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="record-description"
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Add a description for this document..."
                className="rounded-lg resize-none min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Current file info when existing */}
            {existingFile && record?.fileRecord && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current File</Label>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border transition-colors hover:bg-muted/50">
                    <Icon
                      icon={getFileIcon(currentExtension)}
                      style={{
                        fontSize: '32px',
                        color: getFileIconColor(currentExtension),
                        flexShrink: 0,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1 truncate">{record.recordName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {getFileTypeName(currentExtension)} (.{currentExtension})
                        </span>
                        <span className="size-1 rounded-full bg-muted-foreground/40" />
                        <span>{formatFileSize(record.fileRecord.sizeInBytes)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File type restriction notice for existing files */}
                {currentExtension && (
                  <Alert className="rounded-lg border-primary/30 bg-primary/5">
                    <Info className="size-4" />
                    <AlertDescription className="text-sm">
                      You can only upload {getFileTypeName(currentExtension)} files (.
                      {currentExtension}) to replace this document.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {existingFile ? 'Replace File' : 'Upload File'}
              </Label>
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/30 hover:border-primary hover:bg-primary/5'
                )}
              >
                <input
                  type="file"
                  id="fileInput"
                  ref={fileInputRef}
                  className="hidden"
                  accept={existingFile && currentExtension ? `.${currentExtension}` : undefined}
                  onChange={handleFileChange}
                />

                <div className="space-y-3">
                  <Upload
                    className={cn(
                      'size-12 mx-auto',
                      dragActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <p className="text-sm font-medium">
                    {dragActive
                      ? 'Drop file here'
                      : existingFile
                        ? 'Drag and drop to replace file'
                        : 'Drag and drop file here'}
                  </p>
                  <p className="text-sm text-muted-foreground">or</p>
                  <Button
                    type="button"
                    onClick={handleBrowseClick}
                    className="rounded-lg font-medium"
                  >
                    Browse Files
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    {existingFile && currentExtension
                      ? `Only .${currentExtension} files are accepted`
                      : 'All file types are accepted'}{' '}
                    • Maximum size: 30MB
                  </p>
                </div>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Icon
                    icon={getFileIcon(file.name.split('.').pop() || '')}
                    style={{
                      fontSize: '28px',
                      color: getFileIconColor(file.name.split('.').pop() || ''),
                      flexShrink: 0,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setFileError(null);
                    // Reset the file input when removing a file
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="size-8 flex-shrink-0"
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={uploading} className="rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!canUpload || uploading || !!fileError}
            className="rounded-lg font-medium"
          >
            {existingFile ? (file ? 'Replace' : nameChanged ? 'Update' : 'Save') : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SingleFileUploadDialog;
