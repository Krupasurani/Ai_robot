import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Base component for loading SVG icons from assets
const SvgIcon: React.FC<IconProps & { src: string; alt: string }> = ({
  src,
  alt,
  className,
  size = 40
}) => (
  <img
    src={src}
    alt={alt}
    className={className}
    style={{ width: size, height: size }}
  />
);

// Google Docs Icon - using Word icon as fallback
export const GoogleDocsIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-word.svg" alt="Google Docs" className={className} size={size} />
);

// Google Sheets Icon - using Excel icon as fallback
export const GoogleSheetsIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-excel.svg" alt="Google Sheets" className={className} size={size} />
);

// Google Slides Icon - using PowerPoint icon as fallback
export const GoogleSlidesIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-power_point.svg" alt="Google Slides" className={className} size={size} />
);

// PDF Icon
export const PdfIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-pdf.svg" alt="PDF" className={className} size={size} />
);

// Word Document Icon
export const WordIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-word.svg" alt="Word Document" className={className} size={size} />
);

// Excel Icon
export const ExcelIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-excel.svg" alt="Excel" className={className} size={size} />
);

// PowerPoint Icon
export const PowerPointIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-power_point.svg" alt="PowerPoint" className={className} size={size} />
);

// Confluence Icon - using document icon as fallback
export const ConfluenceIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-document.svg" alt="Confluence" className={className} size={size} />
);

// Jira Icon - using document icon as fallback
export const JiraIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-document.svg" alt="Jira" className={className} size={size} />
);

// Slack Icon - using document icon as fallback
export const SlackIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-document.svg" alt="Slack" className={className} size={size} />
);

// Notion Icon - using document icon as fallback
export const NotionIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-document.svg" alt="Notion" className={className} size={size} />
);

// SharePoint Icon - using document icon as fallback
export const SharePointIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-document.svg" alt="SharePoint" className={className} size={size} />
);

// OneDrive Icon - using folder icon as fallback
export const OneDriveIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-folder.svg" alt="OneDrive" className={className} size={size} />
);

// Gmail/Email Icon - using document icon as fallback
export const EmailIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-document.svg" alt="Email" className={className} size={size} />
);

// Link/URL Icon - using document icon as fallback
export const LinkIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-document.svg" alt="Link" className={className} size={size} />
);

// Folder/Collection Icon
export const CollectionIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-folder.svg" alt="Folder" className={className} size={size} />
);

// Ticket/Issue Icon - using document icon as fallback
export const TicketIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-document.svg" alt="Ticket" className={className} size={size} />
);

// Image Icon
export const ImageIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-img.svg" alt="Image" className={className} size={size} />
);

// Video Icon
export const VideoIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-video.svg" alt="Video" className={className} size={size} />
);

// Audio Icon
export const AudioIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-audio.svg" alt="Audio" className={className} size={size} />
);

// Code Icon
export const CodeIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-js.svg" alt="Code" className={className} size={size} />
);

// Text/Markdown Icon
export const TextIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-txt.svg" alt="Text" className={className} size={size} />
);

// Archive/ZIP Icon
export const ArchiveIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-zip.svg" alt="Archive" className={className} size={size} />
);

// Generic File Icon
export const GenericFileIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
  <SvgIcon src="/assets/icons/files/ic-file.svg" alt="File" className={className} size={size} />
);

// Verified Badge Icon
export const VerifiedBadge: React.FC<IconProps> = ({ className, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <circle cx="12" cy="12" r="10" fill="#22C55E" />
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Helper function to get the appropriate icon based on file type/extension/mimeType
export const getRecordIcon = (
  recordType: string,
  extension?: string,
  mimeType?: string,
  origin?: string
): React.FC<IconProps> => {
  // Check for collection/folder first
  if (recordType === 'FOLDER' || recordType === 'COLLECTION') {
    return CollectionIcon;
  }

  // Check for mail
  if (recordType === 'MAIL') {
    return EmailIcon;
  }

  // Check for links/URLs
  if (recordType === 'LINK' || recordType === 'URL') {
    return LinkIcon;
  }

  // Check for tickets
  if (recordType === 'TICKET' || recordType === 'ISSUE') {
    return TicketIcon;
  }

  // Check by mime type (order matters - check specific types before generic ones)
  if (mimeType) {
    if (mimeType.includes('google-apps.document')) return GoogleDocsIcon;
    if (mimeType.includes('google-apps.spreadsheet')) return GoogleSheetsIcon;
    if (mimeType.includes('google-apps.presentation')) return GoogleSlidesIcon;
    if (mimeType.includes('pdf')) return PdfIcon;
    // Check Excel before generic document (xlsx has mime type containing 'spreadsheet' or 'excel')
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('ms-excel')) return ExcelIcon;
    // Check PowerPoint before generic presentation
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation') || mimeType.includes('ms-powerpoint')) return PowerPointIcon;
    // Check Word (should come after Excel/PowerPoint to avoid false matches)
    if (mimeType.includes('word') || mimeType.includes('msword')) return WordIcon;
    // Generic document check last
    if (mimeType.includes('document')) return WordIcon;
    if (mimeType.includes('image')) return ImageIcon;
    if (mimeType.includes('video')) return VideoIcon;
    if (mimeType.includes('audio')) return AudioIcon;
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return ArchiveIcon;
  }

  // Check by extension
  const ext = extension?.toLowerCase();
  if (ext) {
    // Documents
    if (['pdf'].includes(ext)) return PdfIcon;
    if (['doc', 'docx'].includes(ext)) return WordIcon;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return ExcelIcon;
    if (['ppt', 'pptx'].includes(ext)) return PowerPointIcon;

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return ImageIcon;

    // Videos
    if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'].includes(ext)) return VideoIcon;

    // Audio
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) return AudioIcon;

    // Code
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rb', 'php', 'html', 'css', 'json', 'xml', 'yaml', 'yml'].includes(ext)) return CodeIcon;

    // Text
    if (['txt', 'md', 'rtf'].includes(ext)) return TextIcon;

    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return ArchiveIcon;
  }

  // Check by origin for connector sources
  if (origin) {
    const lowerOrigin = origin.toLowerCase();
    if (lowerOrigin.includes('confluence')) return ConfluenceIcon;
    if (lowerOrigin.includes('jira')) return JiraIcon;
    if (lowerOrigin.includes('slack')) return SlackIcon;
    if (lowerOrigin.includes('notion')) return NotionIcon;
    if (lowerOrigin.includes('sharepoint')) return SharePointIcon;
    if (lowerOrigin.includes('onedrive')) return OneDriveIcon;
  }

  return GenericFileIcon;
};

