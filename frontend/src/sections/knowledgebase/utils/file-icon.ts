import {
  Folder,
  Code,
  Database,
  Mail,
  Archive,
  FileText,
  Music,
  Video,
  Image,
  FileSpreadsheet,
  Presentation,
} from 'lucide-react';

/**
 * Get the appropriate icon component for a file based on extension, type, and mime type
 */
export const getFileIcon = (
  extension: string,
  type: string,
  mimeType?: string
): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
  if (type === 'folder') return Folder;

  // Handle mime types first
  if ((!extension || extension === '') && mimeType) {
    switch (mimeType) {
      case 'application/vnd.google-apps.document':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/vnd.microsoft.word.document.macroEnabled.12':
      case 'application/vnd.ms-word.document.macroEnabled.12':
      case 'application/vnd.ms-word.document':
      case 'application/vnd.microsoft.onedrive.document':
        return FileText;
      case 'application/vnd.google-apps.spreadsheet':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.microsoft.excel.sheet.macroEnabled.12':
      case 'application/vnd.ms-excel.sheet.macroEnabled.12':
      case 'application/vnd.ms-excel':
      case 'application/vnd.microsoft.onedrive.spreadsheet':
        return FileSpreadsheet;
      case 'application/vnd.google-apps.presentation':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      case 'application/vnd.microsoft.powerpoint.presentation.macroEnabled.12':
      case 'application/vnd.ms-powerpoint.presentation.macroEnabled.12':
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.microsoft.onedrive.presentation':
        return Presentation;
      case 'application/vnd.google-apps.form':
        return FileText;
      case 'application/vnd.google-apps.drawing':
      case 'application/vnd.microsoft.onedrive.drawing':
        return Image;
      case 'application/vnd.google-apps.folder':
      case 'application/vnd.microsoft.onedrive.folder':
        return Folder;
      default:
        return FileText;
    }
  }

  const ext = extension?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    case 'rtf':
    case 'md':
    case 'mdx':
      return FileText;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return FileSpreadsheet;
    case 'ppt':
    case 'pptx':
      return Presentation;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return Image;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return Archive;
    case 'html':
    case 'htm':
    case 'css':
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'json':
    case 'py':
    case 'java':
    case 'php':
    case 'rb':
    case 'go':
      return Code;
    case 'sql':
      return Database;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
      return Music;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'mkv':
      return Video;
    case 'eml':
    case 'msg':
      return Mail;
    default:
      return FileText;
  }
};

/**
 * Get the appropriate color for a file icon based on extension, type, and mime type
 */
export const getFileIconColor = (extension: string, type: string, mimeType?: string): string => {
  if (type === 'folder') return '#f59e0b'; // amber-500

  // Handle mime types first
  if ((!extension || extension === '') && mimeType) {
    switch (mimeType) {
      case 'application/vnd.google-apps.document':
        return '#4285F4';
      case 'application/vnd.google-apps.spreadsheet':
        return '#0F9D58';
      case 'application/vnd.google-apps.presentation':
        return '#F4B400';
      case 'application/vnd.google-apps.form':
        return '#673AB7';
      case 'application/vnd.google-apps.drawing':
        return '#DB4437';
      case 'application/vnd.google-apps.folder':
        return '#5F6368';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/vnd.microsoft.word.document.macroEnabled.12':
      case 'application/vnd.ms-word.document.macroEnabled.12':
      case 'application/vnd.ms-word.document':
      case 'application/vnd.microsoft.onedrive.document':
        return '#2B579A';
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.microsoft.excel.sheet.macroEnabled.12':
      case 'application/vnd.ms-excel.sheet.macroEnabled.12':
      case 'application/vnd.ms-excel':
      case 'application/vnd.microsoft.onedrive.spreadsheet':
        return '#217346';
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      case 'application/vnd.microsoft.powerpoint.presentation.macroEnabled.12':
      case 'application/vnd.ms-powerpoint.presentation.macroEnabled.12':
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.microsoft.onedrive.presentation':
        return '#B7472A';
      case 'application/vnd.microsoft.onedrive.drawing':
        return '#8C6A4F';
      case 'application/vnd.microsoft.onedrive.folder':
        return '#0078D4';
      default:
        return '#1976d2';
    }
  }

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
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return '#9c27b0';
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return '#795548';
    case 'txt':
    case 'rtf':
    case 'md':
      return '#607d8b';
    case 'html':
    case 'htm':
      return '#e65100';
    case 'css':
      return '#0277bd';
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return '#ffd600';
    case 'json':
      return '#616161';
    case 'py':
      return '#1976d2';
    case 'java':
      return '#b71c1c';
    case 'php':
      return '#6a1b9a';
    case 'rb':
      return '#c62828';
    case 'go':
      return '#00acc1';
    case 'sql':
      return '#00695c';
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
      return '#283593';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'mkv':
      return '#d81b60';
    case 'eml':
    case 'msg':
      return '#6a1b9a';
    default:
      return '#3b82f6'; // blue-500
  }
};
