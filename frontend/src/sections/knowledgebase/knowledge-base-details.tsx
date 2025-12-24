import type { Icon as IconifyIcon } from '@iconify/react';
import type { ColumnDef } from '@tanstack/react-table';

import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect, useMemo } from 'react';
import eyeIcon from '@iconify-icons/mdi/eye-outline';
import refreshIcon from '@iconify-icons/mdi/refresh';
import LoadingState from '@/components/ui/loader';
import databaseIcon from '@iconify-icons/mdi/database';
import codeJsonIcon from '@iconify-icons/mdi/code-json';
import languageCIcon from '@iconify-icons/mdi/language-c';
import folderIcon from '@iconify-icons/mdi/folder-outline';
import languageGoIcon from '@iconify-icons/mdi/language-go';
import filePdfBoxIcon from '@iconify-icons/mdi/file-pdf-box';
import languagePhpIcon from '@iconify-icons/mdi/language-php';
import downloadIcon from '@iconify-icons/mdi/download-outline';
import fileWordBoxIcon from '@iconify-icons/mdi/file-word-box';
import trashCanIcon from '@iconify-icons/mdi/trash-can-outline';
import languageCss3Icon from '@iconify-icons/mdi/language-css3';
import languageJavaIcon from '@iconify-icons/mdi/language-java';
import languageRubyIcon from '@iconify-icons/mdi/language-ruby';
import emailOutlineIcon from '@iconify-icons/mdi/email-outline';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import fileExcelBoxIcon from '@iconify-icons/mdi/file-excel-box';
import fileImageBoxIcon from '@iconify-icons/mdi/file-image-box';
import languageHtml5Icon from '@iconify-icons/mdi/language-html5';
import fileArchiveBoxIcon from '@iconify-icons/mdi/archive-outline';
import languagePythonIcon from '@iconify-icons/mdi/language-python';
import noteTextOutlineIcon from '@iconify-icons/mdi/note-text-outline';
import fileCodeOutlineIcon from '@iconify-icons/mdi/file-code-outline';
import languageMarkdownIcon from '@iconify-icons/mdi/language-markdown';
import fileMusicOutlineIcon from '@iconify-icons/mdi/file-music-outline';
import fileVideoOutlineIcon from '@iconify-icons/mdi/file-video-outline';
import filePowerpointBoxIcon from '@iconify-icons/mdi/file-powerpoint-box';
import languageJavascriptIcon from '@iconify-icons/mdi/language-javascript';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import fileDocumentOutlineIcon from '@iconify-icons/mdi/file-document-outline';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Pagination, PaginationItem, PaginationContent } from '@/components/ui/pagination';
import {
  Select,
  SelectItem,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/drop-down-menu';
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  X,
  Filter,
  Loader,
  Search,
  Trash2,
  Columns,
  FilePlus,
  UploadIcon,
  ChevronLeft,
  UploadCloud,
  ChevronRight,
  AlertCircleIcon,
  CloudUploadIcon,
  EllipsisVertical,
} from 'lucide-react';

import { DataTable } from '@/components/ui/data-table';
import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';

import DeleteRecordDialog from './delete-record-dialog';
import PopoverColumns from './components/popover-columns';
import KnowledgeBaseSideBar from './knowledge-base-sidebar';
import {
  clearUploadFileCache,
  commitUploadFileCache,
  handleDownloadDocument,
  uploadKnowledgeBaseFiles,
  removeFileFromUploadFileCache,
  processFilesForUploadFileCache,
} from './utils';

import type { Record, KnowledgeBaseDetailsProps } from './types/knowledge-base';

interface ColumnVisibilityModel {
  [key: string]: boolean;
}

interface FileSizeErrorState {
  show: boolean;
  files: File[];
}

interface UploadErrorState {
  show: boolean;
  message: string;
}

interface ActionMenuItem {
  label: string;
  icon: any;
  color: string;
  onClick: () => void;
  isDanger?: boolean;
}

// Maximum file size: 30MB in bytes
const MAX_FILE_SIZE = 30 * 1024 * 1024;

export default function KnowledgeBaseDetails({
  knowledgeBaseData,
  onSearchChange,
  loading,
  pagination,
  onPageChange,
  onLimitChange,
  filters,
  onFilterChange,
}: KnowledgeBaseDetailsProps) {
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<ColumnVisibilityModel>({});
  const [openUploadDialog, setOpenUploadDialog] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [fileSizeError, setFileSizeError] = useState<FileSizeErrorState>({
    show: false,
    files: [],
  });
  const [deleteDialogData, setDeleteDialogData] = useState({
    open: false,
    recordId: '',
    recordName: '',
  });

  // State for action menu
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);

  const [uploadError, setUploadError] = useState<UploadErrorState>({ show: false, message: '' });
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Upload File Cache State
  const [uploadSessionId] = useState<string>(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [cachedFiles, setCachedFiles] = useState<{
    [key: string]: { cacheKey: string; processing: boolean; processed: boolean; error?: string };
  }>({});
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());

  const navigate = useNavigate();

  // Cleanup upload file cache on component unmount
  useEffect(() => {
    console.log('🚀 [Upload File Cache] Component mounted with session:', { uploadSessionId });

    return () => {
      console.log('🧹 [Upload File Cache] Component unmounting, clearing cache...', {
        uploadSessionId,
      });
      clearUploadFileCache(uploadSessionId);
    };
  }, [uploadSessionId]);

  const handleRowClick = (row: Record): void => {
    navigate(`/record/${row.id}`);
  };

  // Validate file size
  const validateFileSize = (filesToCheck: File[]) => {
    const oversizedFiles = filesToCheck.filter((file) => file.size > MAX_FILE_SIZE);
    return {
      valid: oversizedFiles.length === 0,
      oversizedFiles,
    };
  };

  // Modified onDrop function with immediate upload file cache processing
  const onDrop = async (acceptedFiles: File[]) => {
    console.log('📂 [Upload File Cache] Files dropped/selected:', {
      fileCount: acceptedFiles.length,
      files: acceptedFiles.map((f) => f.name),
    });

    // Check for files exceeding size limit
    const { valid, oversizedFiles } = validateFileSize(acceptedFiles);

    const validFiles = acceptedFiles.filter((file) => file.size <= MAX_FILE_SIZE);
    setFiles((prevFiles) => [...prevFiles, ...validFiles]);

    if (!valid) {
      // Show error for oversized files
      setFileSizeError({
        show: true,
        files: oversizedFiles,
      });
    }

    // Process valid files immediately for upload file cache
    if (validFiles.length > 0) {
      console.log('⚡ [Upload File Cache] Starting immediate processing for valid files...', {
        validFileCount: validFiles.length,
        sessionId: uploadSessionId,
      });

      // Mark files as processing
      const newProcessingFiles = new Set(processingFiles);
      validFiles.forEach((file) => {
        const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
        newProcessingFiles.add(fileKey);
        setCachedFiles((prev) => ({
          ...prev,
          [fileKey]: { cacheKey: '', processing: true, processed: false },
        }));
      });
      setProcessingFiles(newProcessingFiles);

      try {
        // Process files for cache
        const result = await processFilesForUploadFileCache(validFiles, uploadSessionId);

        console.log('🎉 [Upload File Cache] Processing completed successfully:', {
          processedCount: result.processedCount,
          cacheKeys: result.cacheKeys,
        });

        // Update cached files state with results
        const updatedCachedFiles = { ...cachedFiles };
        validFiles.forEach((file, index) => {
          const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
          updatedCachedFiles[fileKey] = {
            cacheKey: result.cacheKeys[index],
            processing: false,
            processed: true,
          };
        });
        setCachedFiles(updatedCachedFiles);

        // Remove from processing set
        const updatedProcessingFiles = new Set(processingFiles);
        validFiles.forEach((file) => {
          const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
          updatedProcessingFiles.delete(fileKey);
        });
        setProcessingFiles(updatedProcessingFiles);
      } catch (error: any) {
        console.error('💥 [Upload File Cache] Processing failed:', {
          error: error.message,
          fileCount: validFiles.length,
        });

        // Update cached files state with error
        const updatedCachedFiles = { ...cachedFiles };
        validFiles.forEach((file) => {
          const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
          updatedCachedFiles[fileKey] = {
            cacheKey: '',
            processing: false,
            processed: false,
            error: error.message,
          };
        });
        setCachedFiles(updatedCachedFiles);

        // Remove from processing set
        const updatedProcessingFiles = new Set(processingFiles);
        validFiles.forEach((file) => {
          const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
          updatedProcessingFiles.delete(fileKey);
        });
        setProcessingFiles(updatedProcessingFiles);

        // Show error to user
        setUploadError({
          show: true,
          message: `Failed to process ${validFiles.length} file(s): ${error.message}`,
        });
      }
    }
  };

  // Enhanced dropzone with file size validation
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple: true,
    // maxSize: MAX_FILE_SIZE,
    onDropRejected: (rejectedFiles) => {
      const oversizedFiles = rejectedFiles
        .filter((file) => file.errors.some((error) => error.code === 'file-too-large'))
        .map((file) => file.file);

      if (oversizedFiles.length > 0) {
        setFileSizeError({
          show: true,
          files: oversizedFiles,
        });
      }
    },
  });

  // Monitor fileRejections for size issues
  useEffect(() => {
    if (fileRejections.length > 0) {
      const oversizedFiles = fileRejections
        .filter((file) => file.errors.some((error) => error.code === 'file-too-large'))
        .map((file) => file.file);

      if (oversizedFiles.length > 0) {
        setFileSizeError({
          show: true,
          files: oversizedFiles,
        });
      }
    }
  }, [fileRejections]);

  const handleFileSizeErrorClose = () => {
    setFileSizeError({ show: false, files: [] });
  };

  const handleUploadErrorClose = () => {
    setUploadError({ show: false, message: '' });
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(event.target.value);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  // Get file icon based on extension
  const getFileIcon = (
    extension: string,
    mimeType?: string
  ): React.ComponentProps<typeof IconifyIcon>['icon'] => {
    if ((!extension || extension === '') && mimeType) {
      // Google Workspace mime types
      switch (mimeType) {
        // Google Workspace documents
        case 'application/vnd.google-apps.document':
          return fileWordBoxIcon; // Use Word icon for Google Docs
        case 'application/vnd.google-apps.spreadsheet':
          return fileExcelBoxIcon; // Use Excel icon for Google Sheets
        case 'application/vnd.google-apps.presentation':
          return filePowerpointBoxIcon; // Use PowerPoint icon for Google Slides
        case 'application/vnd.google-apps.form':
          return noteTextOutlineIcon; // Use text icon for Google Forms
        case 'application/vnd.google-apps.drawing':
          return fileImageBoxIcon; // Use image icon for Google Drawings
        case 'application/vnd.google-apps.folder':
          return folderIcon;

        // Microsoft 365 documents
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/vnd.microsoft.word.document.macroEnabled.12':
        case 'application/vnd.ms-word.document.macroEnabled.12':
        case 'application/vnd.ms-word.document':
          return fileWordBoxIcon;

        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.microsoft.excel.sheet.macroEnabled.12':
        case 'application/vnd.ms-excel.sheet.macroEnabled.12':
        case 'application/vnd.ms-excel':
          return fileExcelBoxIcon;

        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        case 'application/vnd.microsoft.powerpoint.presentation.macroEnabled.12':
        case 'application/vnd.ms-powerpoint.presentation.macroEnabled.12':
        case 'application/vnd.ms-powerpoint':
          return filePowerpointBoxIcon;

        // OneDrive/SharePoint specific
        case 'application/vnd.microsoft.onedrive.document':
          return fileWordBoxIcon;
        case 'application/vnd.microsoft.onedrive.spreadsheet':
          return fileExcelBoxIcon;
        case 'application/vnd.microsoft.onedrive.presentation':
          return filePowerpointBoxIcon;
        case 'application/vnd.microsoft.onedrive.drawing':
          return fileImageBoxIcon;
        case 'application/vnd.microsoft.onedrive.folder':
          return folderIcon;

        default:
          return fileDocumentOutlineIcon;

        // Add more mime types as needed
      }
    }

    const ext = extension?.toLowerCase() || '';

    switch (ext) {
      case 'pdf':
        return filePdfBoxIcon;
      case 'doc':
      case 'docx':
        return fileWordBoxIcon;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return fileExcelBoxIcon;
      case 'ppt':
      case 'pptx':
        return filePowerpointBoxIcon;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return fileImageBoxIcon;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return fileArchiveBoxIcon;
      case 'txt':
        return noteTextOutlineIcon; // Changed to a more visible text icon
      case 'rtf':
        return fileDocumentOutlineIcon;
      case 'md':
        return languageMarkdownIcon; // More specific markdown icon
      case 'html':
      case 'htm':
        return languageHtml5Icon;
      case 'css':
        return languageCss3Icon;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return languageJavascriptIcon;
      case 'json':
        return codeJsonIcon;
      case 'xml':
        return fileCodeOutlineIcon;
      case 'py':
        return languagePythonIcon;
      case 'java':
        return languageJavaIcon;
      case 'c':
      case 'cpp':
      case 'cs':
        return languageCIcon;
      case 'php':
        return languagePhpIcon;
      case 'rb':
        return languageRubyIcon;
      case 'go':
        return languageGoIcon;
      case 'sql':
        return databaseIcon;
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'flac':
        return fileMusicOutlineIcon;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'mkv':
        return fileVideoOutlineIcon;
      case 'eml':
      case 'msg':
        return emailOutlineIcon;
      default:
        return fileDocumentOutlineIcon;
    }
  };

  const handleRetryIndexing = React.useCallback(async (recordId: string) => {
    try {
      const response = await axios.post(
        `${CONFIG.backendUrl}/api/v1/knowledgeBase/reindex/record/${recordId}`
      );

      if (response.data.success) {
        toast.success('File indexing started');
      } else {
        toast.error('Failed to start reindexing');
      }
    } catch (error) {
      console.log('error in re indexing', error);
      toast.error('Failed to start reindexing');
    }
  }, []);

  // Get file icon color based on extension
  const getFileIconColor = (extension: string, mimeType?: string): string => {
    if ((!extension || extension === '') && mimeType) {
      // Google Workspace mime types
      switch (mimeType) {
        // Google Workspace documents
        case 'application/vnd.google-apps.document':
          return '#4285F4'; // Google blue
        case 'application/vnd.google-apps.spreadsheet':
          return '#0F9D58'; // Google green
        case 'application/vnd.google-apps.presentation':
          return '#F4B400'; // Google yellow
        case 'application/vnd.google-apps.form':
          return '#673AB7'; // Purple for forms
        case 'application/vnd.google-apps.drawing':
          return '#DB4437'; // Google red
        case 'application/vnd.google-apps.folder':
          return '#5F6368'; // Google folder gray

        // Microsoft 365 documents
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/vnd.microsoft.word.document.macroEnabled.12':
        case 'application/vnd.ms-word.document.macroEnabled.12':
        case 'application/vnd.ms-word.document':
        case 'application/vnd.microsoft.onedrive.document':
          return '#2B579A'; // Microsoft Word blue

        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.microsoft.excel.sheet.macroEnabled.12':
        case 'application/vnd.ms-excel.sheet.macroEnabled.12':
        case 'application/vnd.ms-excel':
        case 'application/vnd.microsoft.onedrive.spreadsheet':
          return '#217346'; // Microsoft Excel green

        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        case 'application/vnd.microsoft.powerpoint.presentation.macroEnabled.12':
        case 'application/vnd.ms-powerpoint.presentation.macroEnabled.12':
        case 'application/vnd.ms-powerpoint':
        case 'application/vnd.microsoft.onedrive.presentation':
          return '#B7472A'; // Microsoft PowerPoint orange/red

        case 'application/vnd.microsoft.onedrive.drawing':
          return '#8C6A4F'; // Brown-ish color for drawings

        case 'application/vnd.microsoft.onedrive.folder':
          return '#0078D4'; // OneDrive blue

        default:
          return '#1976d2'; // Default Blue

        // Add more mime types as needed
      }
    }

    const ext = extension?.toLowerCase() || '';

    switch (ext) {
      case 'pdf':
        return '#f44336'; // Red
      case 'doc':
      case 'docx':
        return '#2196f3'; // Blue
      case 'xls':
      case 'xlsx':
      case 'csv':
        return '#4caf50'; // Green
      case 'ppt':
      case 'pptx':
        return '#ff9800'; // Orange
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return '#9c27b0'; // Purple
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return '#795548'; // Brown
      case 'txt':
      case 'rtf':
      case 'md':
        return '#607d8b'; // Blue Grey
      case 'html':
      case 'htm':
        return '#e65100'; // Deep Orange
      case 'css':
        return '#0277bd'; // Light Blue
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return '#ffd600'; // Yellow
      case 'json':
        return '#616161'; // Grey
      case 'xml':
        return '#00838f'; // Cyan
      case 'py':
        return '#1976d2'; // Blue
      case 'java':
        return '#b71c1c'; // Dark Red
      case 'c':
      case 'cpp':
      case 'cs':
        return '#3949ab'; // Indigo
      case 'php':
        return '#6a1b9a'; // Deep Purple
      case 'rb':
        return '#c62828'; // Red
      case 'go':
        return '#00acc1'; // Cyan
      case 'sql':
        return '#00695c'; // Teal
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'flac':
        return '#283593'; // Indigo
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'mkv':
        return '#d81b60'; // Pink
      case 'eml':
      case 'msg':
        return '#6a1b9a'; // Deep Purple
      default:
        return '#1976d2'; // Default Blue
    }
  };

  const columns: ColumnDef<Record>[] = useMemo(
    () => [
      {
        accessorKey: 'recordName',
        header: 'Name',
        cell: ({ row }) => {
          const extension = row.original.fileRecord?.extension || '';
          const mimeType = row.original.fileRecord?.mimeType || '';
          const recordName = row.getValue('recordName') as string;
          return (
            <div className="flex items-center w-full pl-1">
              <Icon
                icon={
                  extension
                    ? getFileIcon(extension, mimeType)
                    : row.original.recordType === 'MAIL'
                      ? getFileIcon('eml')
                      : getFileIcon('', mimeType)
                }
                style={{
                  fontSize: '18px',
                  color: getFileIconColor(extension, mimeType),
                  marginRight: '10px',
                  flexShrink: 0,
                  opacity: 0.85,
                }}
              />
              <span className="text-nowrap text-foreground text-xs font-medium">{recordName}</span>
            </div>
          );
        },
        size: 200,
        minSize: 200,
      },
      {
        accessorKey: 'recordType',
        header: 'Type',
        cell: ({ row }) => {
          const recordType = row.getValue('recordType') as string;
          return (
            <div className="text-center">
              <span className="text-xs text-foreground font-medium">{recordType}</span>
            </div>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'indexingStatus',
        header: 'Status',
        cell: ({ row }) => {
          const status = (row.getValue('indexingStatus') as string) || 'NOT_STARTED';
          let displayLabel = '';
          let color;

          // Map the indexing status to appropriate display values
          switch (status) {
            case 'COMPLETED':
              displayLabel = 'COMPLETED';
              color = 'dark:text-green-400 text-green-600';
              break;
            case 'IN_PROGRESS':
              displayLabel = 'IN PROGRESS';
              color = 'dark:text-blue-400 text-blue-600';
              break;
            case 'FAILED':
              displayLabel = 'FAILED';
              color = 'dark:text-red-300 text-red-600';
              break;
            case 'NOT_STARTED':
              displayLabel = 'NOT STARTED';
              color = 'dark:text-yellow-400 text-yellow-600';
              break;
            case 'FILE_TYPE_NOT_SUPPORTED':
              displayLabel = 'FILE TYPE NOT SUPPORTED';
              color = 'dark:text-gray-400 text-gray-600';
              break;
            case 'AUTO_INDEX_OFF':
              displayLabel = 'MANUAL SYNC';
              color = 'text-primary dark:text-primary';
              break;
            default:
              displayLabel = status.replace(/_/g, ' ').toLowerCase();
              color = 'text-gray-600 dark:text-gray-200';
          }

          // Capitalize first letter of each word
          displayLabel = displayLabel
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          return (
            <div className="flex items-center justify-center gap-2">
              <div />
              <div className={cn('text-xs text-muted-foreground font-medium', color)}>
                {displayLabel}
              </div>
            </div>
          );
        },
        size: 180,
      },
      {
        accessorKey: 'origin',
        header: 'Origin',
        cell: ({ row }) => {
          const origin = row.getValue('origin') as string;
          return (
            <div className="text-center font-medium text-xs text-foreground dark:text-gray-100">
              {origin}
            </div>
          );
        },
        size: 110,
      },
      {
        accessorKey: 'fileRecord',
        header: 'Size',
        cell: ({ row }) => {
          const fileRecord = row.getValue('fileRecord') as Record['fileRecord'];
          const size = fileRecord?.sizeInBytes;
          const formattedSize =
            size !== undefined && !Number.isNaN(size) && size > 0 ? formatFileSize(size) : '—';

          return (
            <div className="text-xs pr-2 text-muted-foreground font-medium">{formattedSize}</div>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'sourceCreatedAtTimestamp',
        header: 'Created',
        cell: ({ row }) => {
          const timestamp = row.getValue('sourceCreatedAtTimestamp') as string | undefined;

          if (!timestamp) {
            return <span className="text-foreground text-xs">—</span>;
          }

          try {
            const date = new Date(timestamp);

            // Check if date is valid
            if (Number.isNaN(date.getTime())) {
              return <span className="text-foreground text-xs">—</span>;
            }

            return (
              <div className="pl-1 mt-2">
                <p className="text-xs text-foreground font-medium">
                  {date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            );
          } catch (e) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
        },
        size: 160,
      },
      {
        accessorKey: 'sourceLastModifiedTimestamp',
        header: 'Updated',
        cell: ({ row }) => {
          const timestamp = row.getValue('sourceLastModifiedTimestamp') as string | undefined;

          if (!timestamp) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          try {
            const date = new Date(timestamp);

            // Check if date is valid
            if (Number.isNaN(date.getTime())) {
              return <span className="text-xs text-muted-foreground">—</span>;
            }

            return (
              <div className="pl-1 mt-2">
                <p className="text-xs text-foreground font-medium">
                  {date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            );
          } catch (e) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
        },
        size: 160,
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ row }) => {
          const version = row.getValue('version') as string | undefined;
          return (
            <div className="text-center">
              <span className="text-xs text-foreground font-medium">{version || '1.0'}</span>
            </div>
          );
        },
        size: 70,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const isMenuOpen = openMenuRowId === row.original.id;
          // Get file extension for dynamic tooltips
          const fileExt = row.original.fileRecord?.extension || '';
          // Get descriptive action based on file type
          const getDownloadLabel = () => {
            if (fileExt.toLowerCase().includes('pdf')) return 'Download PDF';
            if (fileExt.toLowerCase().includes('doc')) return 'Download Document';
            if (fileExt.toLowerCase().includes('xls')) return 'Download Spreadsheet';
            return 'Download File';
          };
          // Always generate menu items for this row
          const items: ActionMenuItem[] = [
            {
              label: 'View Details',
              icon: eyeIcon,
              color: 'blue',
              onClick: () => navigate(`/record/${row.original.id}`),
            },
            {
              label: getDownloadLabel(),
              icon: downloadIcon,
              color: 'blue',
              onClick: () =>
                handleDownloadDocument(row.original.externalRecordId, row.original.recordName),
            },
            ...(row.original.indexingStatus === 'FAILED' ||
              row.original.indexingStatus === 'NOT_STARTED'
              ? [
                {
                  label: 'Retry Indexing',
                  icon: refreshIcon,
                  color: 'blue',
                  onClick: () => handleRetryIndexing(row.original.id),
                },
              ]
              : []),
            ...(row.original.indexingStatus === 'AUTO_INDEX_OFF'
              ? [
                {
                  label: 'Start Manual Indexing',
                  icon: refreshIcon,
                  color: 'blue',
                  onClick: () => handleRetryIndexing(row.original.id),
                },
              ]
              : []),
            {
              label: 'Delete Record',
              icon: trashCanIcon,
              color: 'blue',
              onClick: () =>
                setDeleteDialogData({
                  open: true,
                  recordId: row.original.id,
                  recordName: row.original.recordName,
                }),
              isDanger: true,
            },
          ];
          return (
            <div className="flex justify-center items-center">
              <DropdownMenu
                open={isMenuOpen}
                onOpenChange={(open) => setOpenMenuRowId(open ? row.original.id : null)}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuRowId(row.original.id);
                    }}
                    className="w-5 h-5 rounded-full text-foreground flex items-center justify-center hover:bg-muted"
                    aria-label="Show actions"
                  >
                    <EllipsisVertical className="w-6 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent sideOffset={8} align="end">
                  {items.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && item.isDanger && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          item.onClick();
                          setOpenMenuRowId(null);
                        }}
                        className={item.isDanger ? 'text-red-600' : ''}
                      >
                        <Icon icon={item.icon} width={18} height={18} className="mr-2" />
                        {item.label}
                      </DropdownMenuItem>
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 70,
        enableSorting: false,
      },
    ],
    [openMenuRowId, navigate, handleRetryIndexing]
  );

  const handleUploadDialogClose = () => {
    if (!uploading) {
      console.log('🚪 [Upload File Cache] Closing upload dialog, clearing session...', {
        uploadSessionId,
      });
      clearUploadFileCache(uploadSessionId);

      setOpenUploadDialog(false);
      setFiles([]);
      setCachedFiles({});
      setProcessingFiles(new Set());
      setFileSizeError({ show: false, files: [] });
      setUploadError({ show: false, message: '' });
      setUploadProgress(0);
    }
  };

  // Handle removing a specific file from upload list and cache
  const handleRemoveFile = async (fileToRemove: File) => {
    const fileKey = `${fileToRemove.name}_${fileToRemove.size}_${fileToRemove.lastModified}`;

    console.log('🗑️ [Upload File Cache] Removing file from upload list...', {
      fileName: fileToRemove.name,
      fileKey,
      sessionId: uploadSessionId,
    });

    try {
      // Remove from cache if it exists
      const cachedFile = cachedFiles[fileKey];
      if (cachedFile?.cacheKey) {
        await removeFileFromUploadFileCache(uploadSessionId, cachedFile.cacheKey);
        console.log('✅ [Upload File Cache] File removed from cache successfully:', {
          fileName: fileToRemove.name,
          cacheKey: cachedFile.cacheKey,
        });
      }

      // Remove from local state
      setFiles((prev) =>
        prev.filter((file) => `${file.name}_${file.size}_${file.lastModified}` !== fileKey)
      );

      setCachedFiles((prev) => {
        const updated = { ...prev };
        delete updated[fileKey];
        return updated;
      });

      setProcessingFiles((prev) => {
        const updated = new Set(prev);
        updated.delete(fileKey);
        return updated;
      });
    } catch (error: any) {
      console.error('❌ [Upload File Cache] Error removing file:', {
        fileName: fileToRemove.name,
        error: error.message,
      });
      // Still remove from UI even if cache removal fails
      setFiles((prev) =>
        prev.filter((file) => `${file.name}_${file.size}_${file.lastModified}` !== fileKey)
      );
    }
  };

  // File size error alert component
  const FileSizeErrorAlert = () => {
    if (!fileSizeError.show) return null;

    return (
      <div className="mb-3 relative">
        <Alert variant="destructive" className="rounded-[8px] flex flex-col relative ">
          <div className="flex text-sm gap-2 items-center">
            <X
              className="w-5 h-5 absolute cursor-pointer top-2 right-3"
              onClick={(e) => {
                e.preventDefault();
                handleFileSizeErrorClose();
              }}
            />
            <AlertCircleIcon className="w-5 h-5" />
            <AlertTitle>File size exceeds limit</AlertTitle>
          </div>
          <AlertDescription className="mb-1">
            The following file(s) exceed the maximum upload size of 30MB:
          </AlertDescription>
          <div className="max-h-[100px] w-full overflow-auto rounded-[4px] bg-[#f44336]/[0.08] p-2">
            {fileSizeError.files.map((file, index) => (
              <h2 className="mb-0.5" key={index}>
                • {file.name} ({formatFileSize(file.size)})
              </h2>
            ))}
          </div>
          <h2 className="mt-1 font-medium">Please reduce file size or select different files.</h2>
        </Alert>
      </div>
    );
  };

  // Upload error alert component
  const UploadErrorAlert = () => {
    if (!uploadError.show) return null;

    return (
      <div className="mb-3">
        <Alert variant="destructive" className="8px">
          <AlertTitle>Upload Failed</AlertTitle>
          <AlertDescription>{uploadError.message}</AlertDescription>
        </Alert>
      </div>
    );
  };

  const renderUploadDialogContent = () => (
    <AlertDialogDescription className="p-3">
      {/* File Size Error Alert */}
      <FileSizeErrorAlert />

      {/* Upload Error Alert */}
      <UploadErrorAlert />

      <div
        {...getRootProps()}
        className={cn(
          'border-[1px] border-dashed hover:dark:bg-primary/10 bg-primary/[0.04] p-6 border-primary rounded-sm text-center cursor-pointer mb-3 transition-all duration-75 ease-in-out',
          isDragActive
            ? 'border-primary dark:bg-primary/[0.08] bg-primary/[0.04] '
            : 'dark:border-gray-300/20 border-gray-500/30 bg-transparent'
        )}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon
          className={cn(
            'text-[36px] mb-[12px]',
            isDragActive ? 'text-foreground' : 'text-muted-foreground'
          )}
        />
        <h6 className="mb-1 font-medium text-foreground dark:text-gray-100">
          {isDragActive ? 'Drop the files here...' : 'Drag and drop files here'}
        </h6>
        <span className="text-muted-foreground mb-2 block text-sm">
          or click to browse from your computer
        </span>
        <Button variant="outline" size="sm" className="text-foreground">
          {/* <Icon icon={filePlusIcon} style={{ marginRight: 6 }} /> */}
          <FilePlus className="mr-1" />
          Select Files
        </Button>
        <span className="block mt-4 text-muted-foreground text-xs">
          Maximum file size: 30MB per file
        </span>
      </div>

      {files.length > 0 && (
        <div className="mt-3 p-2 rounded-sm bg-black/[0.01] dark:bg-black/[0.04] border-[1px] border-black/10 dark:border-gray-100/10">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold">Selected Files ({files.length})</h2>
            <Button
              size="sm"
              color="error"
              variant="outline"
              onClick={() => setFiles([])}
              className="flex items-center"
            >
              <Trash2 className="w-5 h-5" />
              Clear All
            </Button>
          </div>

          <div className="max-h-[180px] overflow-auto pr-0.5">
            {files.map((file, index) => {
              const extension = file.name.split('.').pop() || '';
              const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
              const cachedFile = cachedFiles[fileKey];
              const isProcessing = processingFiles.has(fileKey);

              return (
                <div
                  className="flex items-center gap-1.5 mb-1 p-1.5 rounded-sm dark:hover:bg-card/60"
                  key={file.name + index}
                >
                  <Icon
                    icon={getFileIcon(extension)}
                    style={{
                      fontSize: '24px',
                      color: getFileIconColor(extension),
                      flexShrink: 0,
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold whitespace-nowrap " title={file.name}>
                      {file.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <h2 className="dark:text-white/70 text-[12px]">
                        {formatFileSize(file.size)}
                      </h2>
                      {/* Preprocessing and ready badges hidden per UX: background processing only */}
                      {cachedFile?.error && <span className="text-red-500 text-xs">✗ Error</span>}
                    </div>
                  </div>

                  <X
                    onClick={() => handleRemoveFile(file)}
                    className="text-red-500 w-5 h-5 cursor-pointer hover:text-red-700"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AlertDialogDescription>
  );

  // Upload files in batches to avoid overwhelming the server
  const uploadFilesBatched = async (formData: FormData): Promise<boolean> => {
    try {
      await uploadKnowledgeBaseFiles(formData);
      return true;
    } catch (error: any) {
      console.error('Error uploading files batch:', error);
      setUploadError({
        show: true,
        message: error.message || 'Failed to upload files. Please try again.',
      });
      return false;
    }
  };

  // Modified handleUpload function to use upload file cache
  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadError({
        show: true,
        message: 'Please select at least one file to upload.',
      });
      return;
    }

    console.log('📤 [Upload File Cache] Starting upload process...', {
      fileCount: files.length,
      sessionId: uploadSessionId,
      cachedFiles: Object.keys(cachedFiles).length,
    });

    // Collect any ready cache keys, but allow upload even if some are still processing
    const processedCacheKeys: string[] = [];
    files.forEach((file) => {
      const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
      const cachedFile = cachedFiles[fileKey];
      if (cachedFile?.processed && cachedFile.cacheKey) {
        processedCacheKeys.push(cachedFile.cacheKey);
      }
    });

    // Double-check file sizes before uploading
    const { valid, oversizedFiles } = validateFileSize(files);
    if (!valid) {
      setFileSizeError({
        show: true,
        files: oversizedFiles,
      });
      return;
    }

    try {
      setUploading(true);
      setUploadError({ show: false, message: '' });
      setUploadProgress(0);

      console.log('🚀 [Upload File Cache] Committing cached files to database...', {
        cacheKeyCount: processedCacheKeys.length,
        sessionId: uploadSessionId,
      });

      // Commit cached files to database (ready ones). Background will handle remaining.
      const currentKbId = new URLSearchParams(window.location.search).get('kbId') || undefined;
      const result = await commitUploadFileCache(uploadSessionId, processedCacheKeys, currentKbId);

      setUploadProgress(100);

      console.log('🎉 [Upload File Cache] Upload completed successfully!', {
        committedCount: result.committedCount,
        sessionId: uploadSessionId,
      });

      toast.success(
        `Successfully uploaded ${result.committedCount} ${result.committedCount > 1 ? 'files' : 'file'}.`
      );

      // Close dialog and refresh data
      handleUploadDialogClose();
      onSearchChange(''); // Refresh the knowledge base data
    } catch (error: any) {
      console.error('❌ [Upload File Cache] Error in upload process:', {
        error: error.message,
        sessionId: uploadSessionId,
      });
      setUploadError({
        show: true,
        message: error.message || 'Failed to upload files. Please try again.',
      });
    } finally {
      setUploading(false);
      console.log('🏁 [Upload File Cache] Upload process finished.', {
        sessionId: uploadSessionId,
      });
    }
  };

  const handleColumnToggle = (field: string): void => {
    setColumnVisibilityModel((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleShowAll = (): void => {
    const allVisible: ColumnVisibilityModel = {};
    columns.forEach((column) => {
      const columnId = (column.id || '') as string;
      if (columnId) {
        allVisible[columnId] = true;
      }
    });
    setColumnVisibilityModel(allVisible);
  };

  const handleReset = () => {
    setColumnVisibilityModel({});
  };

  const handleDeleteSuccess = () => {
    // Trigger a refresh using the search change handler
    onSearchChange('');
    toast.success('File deleted successfully!');
  };

  // Close the delete dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogData({
      open: false,
      recordId: '',
      recordName: '',
    });
  };

  return (
    <div className="min-h-screen pt-3 w-full px-1 flex flex-col">
      {/* Header section */}
      <div className="mb-2.5 mt-2 rounded-md pl-2 ">
        <div className="flex justify-between items-center ">
          <h5 className="text-xl dark:text-gray-100 text-gray-900 font-semibold ">
            Knowledge Base
          </h5>
          <div className="flex gap-1.5 items-center justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger className="font-semibold cursor-pointer text-sm flex flex-row items-center p-0 gap-2 shrink-0">
                <Button variant="ghost" className="border cursor-pointer text-foreground">
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <KnowledgeBaseSideBar onFilterChange={onFilterChange} filters={filters} />
              </DropdownMenuContent>
            </DropdownMenu>

            <InputWithIcon
              placeholder="Search files..."
              onChange={handleSearchInputChange}
              className="w-48 rounded-[8px] h-9 text-foreground"
              icon={<Search className="w-5 h-5 text-foreground" />}
            />
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="ghost"
                  className="cursor-pointer border flex flex-row items-center gap-2 text-foreground"
                >
                  <Columns className="w-5 h-5" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <PopoverColumns
                  columnVisibilityModel={columnVisibilityModel}
                  columns={columns}
                  handleColumnToggle={handleColumnToggle}
                  handleReset={handleReset}
                  handleShowAll={handleShowAll}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              onClick={() => setOpenUploadDialog(true)}
              className="cursor-pointer border text-foreground"
            >
              <UploadIcon className="2-5 h-5" />
              Upload
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* DataTable scrollable container */}
        <div className="flex-1 min-h-0 rounded-sm mb-1">
          <LoadingState className="h-full" loading={loading}>
            <div className="h-full w-full overflow-auto rounded-sm">
              {knowledgeBaseData?.records && knowledgeBaseData.records.length > 0 ? (
                <div className="h-full [&_table_tbody_tr]:h-14 [&_table_tbody_tr]:min-h-14 [&_table_tbody_tr]:max-h-14 [&_table_thead_tr]:h-14 [&_table_thead_tr]:min-h-14 [&_table_thead_tr]:max-h-14 [&_table_tbody_tr]:border-b [&_table_tbody_tr]:border-border/50 [&_table_tbody_tr:hover]:bg-primary/10 [&_table_tbody_tr]:cursor-pointer">
                  <DataTable
                    data={knowledgeBaseData.records}
                    columns={columns}
                    enablePagination={false}
                    enableSorting={true}
                    enableFiltering={false}
                    enableColumnVisibility={false}
                    onRowClick={handleRowClick}
                    columnVisibility={columnVisibilityModel}
                    onColumnVisibilityChange={setColumnVisibilityModel}
                    className="h-full [&_table]:border-none"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No records uploaded for knowledge base</p>
                </div>
              )}
            </div>
          </LoadingState>
        </div>

        {/* Pagination footer */}
        {/* TODO: add pagination different style  */}
        <div className="flex justify-between items-center px-3 py-2 border-t-[1px] border-black/10 h-[54px]">
          <h1 className="text-muted-foreground text-sm">
            {knowledgeBaseData?.pagination?.totalCount === 0
              ? 'No records found'
              : `Showing ${(pagination.page - 1) * pagination.limit + 1}-
                  ${Math.min(pagination.page * pagination.limit, knowledgeBaseData?.pagination?.totalCount || 0)} 
                  of ${knowledgeBaseData?.pagination?.totalCount || 0} records`}
          </h1>

          <div className="flex items-center gap-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem
                  onClick={(e) => {
                    e.preventDefault();
                    if (pagination.page > 1) {
                      onPageChange(pagination.page - 1);
                    }
                  }}
                >
                  <div
                    aria-disabled={pagination.page === 1}
                    className={cn(
                      pagination.page === 1 ? 'pointer-events-none opacity-50' : '',
                      'flex items-center gap-0.5 pr-2 text-foreground'
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm">Previous</span>
                  </div>
                </PaginationItem>
                {Array.from({ length: knowledgeBaseData?.pagination?.totalPages || 1 }).map(
                  (_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <Button
                        size="icon"
                        key={pageNum}
                        className="border text-foreground bg-primary hover:bg-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          if (pagination.page !== pageNum) {
                            onPageChange(pageNum);
                          }
                        }}
                        aria-current={pagination.page === pageNum ? 'page' : undefined}
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                )}
                <PaginationItem>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      const totalPages = knowledgeBaseData?.pagination?.totalPages || 1;
                      if (pagination.page < totalPages) {
                        onPageChange(pagination.page + 1);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Enter' || e.key === ' ') &&
                        pagination.page < (knowledgeBaseData?.pagination?.totalPages || 1)
                      ) {
                        e.preventDefault();
                        onPageChange(pagination.page + 1);
                      }
                    }}
                    aria-disabled={
                      pagination.page === (knowledgeBaseData?.pagination?.totalPages || 1)
                    }
                    className={cn(
                      pagination.page === (knowledgeBaseData?.pagination?.totalPages || 1)
                        ? 'pointer-events-none opacity-50'
                        : '',
                      'flex items-center gap-0.5 pl-2 text-foreground'
                    )}
                  >
                    <span className="text-sm">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <Select
              value={pagination.limit.toString()}
              onValueChange={(value) => {
                onLimitChange(parseInt(value, 10));
              }}
            >
              <SelectTrigger className="w-[180px] text-foreground">
                <SelectValue placeholder="10 per Page" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="10">10 per Page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Column visibility popover */}

      {/* Upload dialog */}
      <AlertDialog open={openUploadDialog} onOpenChange={handleUploadDialogClose}>
        <AlertDialogContent className="!max-w-2xl w-full overflow-hidden">
          <AlertDialogHeader className="px-3 py-2.5 border-b-[1px] border-black/10">
            {/* <h6 className="font-semibold">Upload Documents</h6> */}
            <AlertDialogTitle className="text-foreground">Upload Documents</AlertDialogTitle>
          </AlertDialogHeader>

          {uploading ? (
            <AlertDialogDescription className="flex flex-col justify-center items-center min-h-[250px] py-[4px]">
              <Loader className="animate-spin w-6 h-6 " />
              <AlertDialogTitle className="font-semibold">Uploading your files...</AlertDialogTitle>
              <p className="text-sm text-muted-foreground mt-1">This may take a few moments</p>
            </AlertDialogDescription>
          ) : (
            renderUploadDialogContent()
          )}

          <AlertDialogFooter className="px-3 py-2 border-t-[1px] border-gray-700/30 ">
            <Button
              onClick={handleUploadDialogClose}
              disabled={uploading}
              variant="outline"
              className="text-black dark:text-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              variant="default"
              disabled={files.length === 0 || uploading}
              className="text-white"
            >
              <UploadCloud />
              Upload
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Record Dialog */}
      <DeleteRecordDialog
        open={deleteDialogData.open}
        onClose={handleCloseDeleteDialog}
        onRecordDeleted={handleDeleteSuccess}
        recordId={deleteDialogData.recordId}
        recordName={deleteDialogData.recordName}
      />
    </div>
  );
}
