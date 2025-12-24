import { useRef, useState, useEffect, useCallback } from 'react';
import { Download, Eye, X, Maximize, Minimize, Loader2 } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { fDate } from 'src/utils/format-time';
import { Icon } from '@iconify/react';
import emailIcon from '@iconify-icons/mdi/email-outline';
import zipIcon from '@iconify-icons/vscode-icons/file-type-zip';
import pdfIcon from '@iconify-icons/vscode-icons/file-type-pdf2';
import imageIcon from '@iconify-icons/vscode-icons/file-type-image';
import defaultFileIcon from '@iconify-icons/mdi/file-document-outline';
import databaseIcon from '@iconify-icons/mdi/database';
import docIcon from '@iconify-icons/vscode-icons/file-type-word';
import txtIcon from '@iconify-icons/vscode-icons/file-type-text';
import htmlIcon from '@iconify-icons/vscode-icons/file-type-html';
import jsonIcon from '@iconify-icons/vscode-icons/file-type-json';
import xlsIcon from '@iconify-icons/vscode-icons/file-type-excel';
import mdIcon from '@iconify-icons/vscode-icons/file-type-markdown';
import pptIcon from '@iconify-icons/vscode-icons/file-type-powerpoint';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/utils/cn';
import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';

import { KnowledgeBaseAPI } from './services/api';
import { ORIGIN } from './constants/knowledge-search';
import DocxViewer from '../qna/chatbot/components/docx-highlighter';
import HtmlViewer from '../qna/chatbot/components/html-highlighter';
import TextViewer from '../qna/chatbot/components/text-highlighter';
import ExcelViewer from '../qna/chatbot/components/excel-highlighter';
import PdfHighlighterComp from '../qna/chatbot/components/pdf-highlighter';
import ImageHighlighter from '../qna/chatbot/components/image-highlighter';
import MarkdownViewer from '../qna/chatbot/components/markdown-highlighter';
import { getConnectorPublicUrl } from '../accountdetails/account-settings/services/utils/services-configuration-service';
import type { Record } from './types/record-details';

// Simplified state management for viewport mode
interface DocumentViewerState {
  phase: 'idle' | 'loading' | 'ready' | 'error' | 'closing';
  documentType: string | null;
  fileUrl: string;
  fileBuffer: ArrayBuffer | null;
  recordCitations: any | null;
  error: string | null;
  loadingStep: string;
}

// Enhanced utility functions to handle both file and mail records
const getFileIcon = (extension: string, recordType?: string) => {
  // Handle mail records
  if (recordType === 'MAIL') {
    return emailIcon;
  }

  const ext = extension?.replace('.', '').toLowerCase();
  switch (ext) {
    case 'pdf':
      return pdfIcon;
    case 'doc':
    case 'docx':
      return docIcon;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return xlsIcon;
    case 'ppt':
    case 'pptx':
      return pptIcon;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return imageIcon;
    case 'zip':
    case 'rar':
    case '7z':
      return zipIcon;
    case 'txt':
      return txtIcon;
    case 'html':
    case 'css':
    case 'js':
      return htmlIcon;
    case 'md':
    case 'mdx':
      return mdIcon;
    case 'json':
      return jsonIcon;
    case 'database':
      return databaseIcon;
    default:
      return defaultFileIcon;
  }
};

const getExtensionColor = (extension: string, recordType?: string) => {
  // Handle mail records
  if (recordType === 'MAIL') {
    return '#1976d2'; // Blue for emails
  }

  const ext = extension?.replace('.', '').toLowerCase();
  switch (ext) {
    case 'pdf':
      return '#FF4B4B';
    case 'doc':
    case 'docx':
      return '#2B579A';
    case 'xls':
    case 'xlsx':
      return '#217346';
    case 'jpg':
    case 'jpeg':
    case 'png':
      return '#4BAFFF';
    case 'zip':
    case 'rar':
      return '#FFA000';
    default:
      return '#757575';
  }
};

function getDocumentType(extension: string, recordType?: string) {
  // Handle mail records - treat as HTML for rendering
  if (recordType === 'MAIL') {
    return 'html';
  }

  if (extension === 'pdf') return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(extension)) return 'excel';
  if (extension === 'docx') return 'docx';
  if (extension === 'html') return 'html';
  if (extension === 'txt') return 'text';
  if (extension === 'md') return 'md';
  if (extension === 'mdx') return 'mdx';
  if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(extension)) return 'image';
  return 'other';
}

interface RecordDocumentViewerProps {
  record: Record;
}

// Professional Minimalistic Loading Animation
const ViewportLoadingAnimation = ({ fileName, step }: { fileName: string; step: string }) => {
  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 z-[1400] bg-background flex items-center justify-center">
      <div className="text-center max-w-[320px] mx-4">
        {/* Minimalistic Document Icon */}
        <div className="w-12 h-12 mx-auto mb-6 relative flex items-center justify-center">
          <div className="w-8 h-10 rounded border-2 border-muted-foreground relative opacity-70 before:content-[''] before:absolute before:-top-0.5 before:-right-0.5 before:w-2 before:h-2 before:border-l-2 before:border-b-2 before:border-muted-foreground before:bg-background after:content-[''] after:absolute after:top-2 after:left-1.5 after:right-1.5 after:h-0.5 after:bg-muted-foreground after:opacity-30 after:shadow-[0_6px_0_rgba(0,0,0,0.3),0_12px_0_rgba(0,0,0,0.3)]" />
        </div>

        {/* Clean Typography */}
        <h3 className="mb-2 font-medium text-foreground tracking-tight">Opening Document</h3>

        <p className="mb-2 font-normal text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
          {fileName}
        </p>

        <p className="mb-8 text-xs text-muted-foreground block">{step}</p>

        {/* Minimalistic Progress Indicator */}
        <div className="relative inline-flex">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>

        {/* Optional: Three dot indicator as alternative */}
        <div className="flex justify-center gap-1 mt-6">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-1 h-1 rounded-full bg-muted-foreground opacity-40 animate-pulse"
              style={{
                animationDelay: `${index * 0.2}s`,
                animationDuration: '1.4s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const RecordDocumentViewer = ({ record }: RecordDocumentViewerProps) => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Enhanced state management with fullscreen tracking
  const [viewerState, setViewerState] = useState<DocumentViewerState>({
    phase: 'idle',
    documentType: null,
    fileUrl: '',
    fileBuffer: null,
    recordCitations: null,
    error: null,
    loadingStep: '',
  });

  // Fullscreen state management
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Single cleanup timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  // Fullscreen event handlers
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  const resetViewerState = useCallback(() => {
    setViewerState({
      phase: 'idle',
      documentType: null,
      fileUrl: '',
      fileBuffer: null,
      recordCitations: null,
      error: null,
      loadingStep: '',
    });
  }, []);

  const handleCloseViewer = useCallback(() => {
    // Exit fullscreen if we're in it
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }

    setViewerState((prev) => ({ ...prev, phase: 'closing' }));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      resetViewerState();
      timeoutRef.current = null;
    }, 300);
  }, [resetViewerState]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        // Enter fullscreen
        await containerRef.current.requestFullscreen();
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
      toast.warning('Unable to toggle fullscreen mode.');
    }
  }, []);

  const showErrorAndRedirect = useCallback(
    (errorMessage: string) => {
      toast.info('Failed to load preview. Redirecting to the original document shortly...');

      let webUrl = record.fileRecord?.webUrl || record.mailRecord?.webUrl;

      if (record.origin === 'UPLOAD' && webUrl && !webUrl.startsWith('http')) {
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        webUrl = baseUrl + webUrl;
      }

      setTimeout(() => {
        handleCloseViewer();
      }, 500);

      setTimeout(() => {
        if (webUrl) {
          try {
            window.open(webUrl, '_blank', 'noopener,noreferrer');
          } catch (openError) {
            console.error('Error opening new tab:', openError);
            toast.error(
              'Failed to automatically open the document. Please check your browser pop-up settings.'
            );
          }
        } else {
          toast.error('Failed to load preview and cannot redirect (document URL not found).');
        }
      }, 2500);
    },
    [record, handleCloseViewer]
  );

  // Fixed early return - check for either fileRecord OR mailRecord
  if (!record?.fileRecord && !record?.mailRecord) return null;

  const {
    recordName,
    externalRecordId,
    sourceCreatedAtTimestamp,
    fileRecord,
    mailRecord,
    origin,
    recordType,
  } = record;

  // Get the appropriate record data and extension
  const currentRecord = fileRecord || mailRecord;
  const extension = fileRecord?.extension || 'eml'; // Use 'eml' for email records
  const recordTypeForDisplay = recordType || 'FILE';

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const recordId = origin === ORIGIN.UPLOAD ? externalRecordId : record._key;
      await KnowledgeBaseAPI.handleDownloadDocument(recordId, recordName, origin);
      toast.success('Document downloaded successfully');
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('Failed to download document. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const viewDocument = async (): Promise<void> => {
    // Start with loading phase
    setViewerState((prev) => ({
      ...prev,
      phase: 'loading',
      loadingStep: 'Preparing to load document...',
      error: null,
    }));

    try {
      const recordId = record._key;

      if (!record) {
        console.error('Record not found for ID:', recordId);
        toast.error('Record not found. Please try again.');
        handleCloseViewer();
        return;
      }

      let fileDataLoaded = false;
      let loadedFileUrl = '';
      let loadedFileBuffer: ArrayBuffer | null = null;

      if (record.origin === ORIGIN.UPLOAD) {
        try {
          setViewerState((prev) => ({ ...prev, loadingStep: 'Downloading document...' }));

          const downloadResponse = await axios.get(
            `/api/v1/document/${externalRecordId}/download`,
            { responseType: 'blob' }
          );

          setViewerState((prev) => ({ ...prev, loadingStep: 'Processing document data...' }));

          const reader = new FileReader();
          const textPromise = new Promise<string>((resolve) => {
            reader.onload = () => {
              resolve(reader.result?.toString() || '');
            };
          });

          reader.readAsText(downloadResponse.data);
          const text = await textPromise;

          try {
            const jsonData = JSON.parse(text);
            if (jsonData && jsonData.signedUrl) {
              loadedFileUrl = jsonData.signedUrl;
              fileDataLoaded = true;
            }
          } catch (e) {
            const bufferReader = new FileReader();
            const arrayBufferPromise = new Promise<ArrayBuffer>((resolve) => {
              bufferReader.onload = () => {
                resolve(bufferReader.result as ArrayBuffer);
              };
              bufferReader.readAsArrayBuffer(downloadResponse.data);
            });

            loadedFileBuffer = await arrayBufferPromise;
            fileDataLoaded = true;
          }
        } catch (error) {
          console.error('Error downloading document:', error);
          showErrorAndRedirect('Failed to load document from upload');
          return;
        }
      } else if (record.origin === ORIGIN.CONNECTOR) {
        try {
          setViewerState((prev) => ({ ...prev, loadingStep: 'Connecting to document source...' }));

          let params = {};

          // Handle PowerPoint files
          if (record?.fileRecord && ['pptx', 'ppt'].includes(record?.fileRecord?.extension)) {
            params = { convertTo: 'pdf' };
            if (record.fileRecord.sizeInBytes / 1048576 > 5) {
              throw new Error('Large file size, redirecting to web page');
            }
          }

          const publicConnectorUrlResponse = await getConnectorPublicUrl();
          let connectorResponse;

          if (publicConnectorUrlResponse && publicConnectorUrlResponse.url) {
            const CONNECTOR_URL = publicConnectorUrlResponse.url;
            connectorResponse = await axios.get(
              `${CONNECTOR_URL}/api/v1/stream/record/${recordId}`,
              { responseType: 'blob', params }
            );
          } else {
            connectorResponse = await axios.get(
              `${CONFIG.backendUrl}/api/v1/knowledgeBase/stream/record/${recordId}`,
              { responseType: 'blob', params }
            );
          }

          if (!connectorResponse) return;

          setViewerState((prev) => ({ ...prev, loadingStep: 'Processing document...' }));

          const bufferReader = new FileReader();
          const arrayBufferPromise = new Promise<ArrayBuffer>((resolve, reject) => {
            bufferReader.onload = () => {
              const originalBuffer = bufferReader.result as ArrayBuffer;
              const bufferCopy = originalBuffer.slice(0);
              resolve(bufferCopy);
            };
            bufferReader.onerror = () => {
              reject(new Error('Failed to read blob as array buffer'));
            };
            bufferReader.readAsArrayBuffer(connectorResponse.data);
          });

          loadedFileBuffer = await arrayBufferPromise;
          fileDataLoaded = true;
        } catch (err) {
          console.error('Error downloading document:', err);
          showErrorAndRedirect('Failed to load document from connector');
          return;
        }
      }

      if (fileDataLoaded) {
        // Use recordType to determine document type for mail records
        const documentType = getDocumentType(extension, recordTypeForDisplay);

        setViewerState((prev) => ({ ...prev, loadingStep: 'Opening in viewport...' }));

        // Small delay to show final step
        setTimeout(() => {
          setViewerState((prev) => ({
            ...prev,
            phase: 'ready',
            documentType,
            fileUrl: loadedFileUrl,
            fileBuffer: loadedFileBuffer,
            recordCitations: null,
          }));
        }, 800);

        // Support mail records in addition to existing types
        if (
          !['pdf', 'excel', 'docx', 'html', 'text', 'md', 'mdx', 'image'].includes(documentType)
        ) {
          toast.warning(`Unsupported document type: ${extension}`);
          handleCloseViewer();
        }
      } else {
        toast.error('No document data was loaded. Please try again.');
        handleCloseViewer();
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      setViewerState((prev) => ({
        ...prev,
        phase: 'error',
        error: 'Failed to load document. Please try again.',
      }));

      setTimeout(() => {
        handleCloseViewer();
      }, 2000);
    }
  };

  const renderDocumentViewer = () => {
    const { documentType, fileUrl, fileBuffer, recordCitations } = viewerState;

    if (!documentType || (!fileUrl && !fileBuffer)) return null;

    const commonProps = {
      key: `${documentType}-viewer-${recordCitations?.recordId || 'new'}`,
      onClosePdf: handleCloseViewer,
    };

    switch (documentType) {
      case 'pdf':
        return (
          <PdfHighlighterComp
            {...commonProps}
            pdfUrl={fileUrl}
            pdfBuffer={fileBuffer}
            citations={[]}
          />
        );
      case 'docx':
        return (
          <DocxViewer
            {...commonProps}
            url={fileUrl}
            buffer={fileBuffer ?? undefined}
            citations={[]}
            renderOptions={{
              breakPages: true,
              renderHeaders: true,
              renderFooters: true,
            }}
          />
        );
      case 'excel':
        return (
          <ExcelViewer
            {...commonProps}
            fileUrl={fileUrl}
            citations={recordCitations?.documents || []}
            excelBuffer={fileBuffer}
          />
        );
      case 'html':
        return (
          <HtmlViewer
            {...commonProps}
            url={fileUrl}
            citations={recordCitations?.documents || []}
            buffer={fileBuffer}
          />
        );
      case 'text':
        return (
          <TextViewer
            {...commonProps}
            url={fileUrl}
            citations={recordCitations?.documents || []}
            buffer={fileBuffer}
          />
        );
      case 'md':
        return (
          <MarkdownViewer
            {...commonProps}
            url={fileUrl}
            citations={recordCitations?.documents || []}
            buffer={fileBuffer}
          />
        );
      case 'mdx':
        return (
          <MarkdownViewer
            {...commonProps}
            url={fileUrl}
            citations={recordCitations?.documents || []}
            buffer={fileBuffer}
          />
        );
      case 'image':
        return (
          <ImageHighlighter
            {...commonProps}
            url={fileUrl}
            buffer={fileBuffer}
            citations={recordCitations?.documents || []}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Main Document Card */}
      <div
        className={cn(
          'max-w-[800px] w-full p-4 transition-opacity duration-300',
          viewerState.phase === 'loading' ? 'opacity-50 pointer-events-none' : 'opacity-100'
        )}
      >
        <div className="flex items-center gap-4 mb-6">
          <Icon
            icon={getFileIcon(extension, recordTypeForDisplay)}
            width={40}
            height={40}
            style={{ color: getExtensionColor(extension, recordTypeForDisplay) }}
          />
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">{recordName}</h3>
            <p className="text-sm text-muted-foreground">
              {recordTypeForDisplay === 'MAIL' ? 'Email received' : 'Added'} on{' '}
              {fDate(sourceCreatedAtTimestamp, 'MMM dd, yyyy')}
            </p>
            {/* Show additional info for email records */}
            {recordTypeForDisplay === 'MAIL' && mailRecord && (
              <p className="text-xs text-muted-foreground block mt-1">From: {mailRecord.from}</p>
            )}
          </div>

          {/* Download Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              {isDownloading ? (
                <div className="p-1">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {recordTypeForDisplay !== 'MAIL' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDownload}
                      disabled={viewerState.phase === 'loading'}
                      className="text-primary hover:bg-primary hover:text-white"
                    >
                      <Download className="size-6" />
                    </Button>
                  )}
                </>
              )}
            </TooltipTrigger>
            <TooltipContent>Download document</TooltipContent>
          </Tooltip>

          {/* View Document Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={viewDocument}
                disabled={viewerState.phase === 'loading'}
                className="text-primary hover:bg-primary hover:text-white"
              >
                <Eye className="size-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {recordTypeForDisplay === 'MAIL' ? 'Preview email' : 'Preview document'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Beautiful Loading Animation */}
      <AnimatePresence>
        {viewerState.phase === 'loading' && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ViewportLoadingAnimation fileName={recordName} step={viewerState.loadingStep} />
          </m.div>
        )}
      </AnimatePresence>

      {/* Clean Viewport Document Viewer */}
      <AnimatePresence>
        {viewerState.phase === 'ready' && (
          <m.div
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={cn(
              'fixed left-0 right-0 bottom-0 z-[1300] bg-background flex flex-col',
              isFullscreen ? 'top-0' : 'top-16'
            )}
          >
            {/* Header with Close Button - Hide in fullscreen */}
            {!isFullscreen && (
              <div className="flex items-center justify-between p-4 border-b border-border bg-background">
                <div className="flex items-center gap-4">
                  <Icon
                    icon={getFileIcon(extension, recordTypeForDisplay)}
                    width={24}
                    height={24}
                    style={{ color: getExtensionColor(extension, recordTypeForDisplay) }}
                  />
                  <h3 className="text-lg font-semibold truncate">{recordName}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Fullscreen Toggle Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleFullscreen}
                        className="text-muted-foreground hover:bg-muted"
                      >
                        <Maximize className="size-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Enter fullscreen mode</TooltipContent>
                  </Tooltip>

                  {/* Close Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCloseViewer}
                        className="text-muted-foreground hover:bg-muted"
                      >
                        <X className="size-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Close document viewer</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Fullscreen Controls - Show only in fullscreen */}
            {isFullscreen && (
              <div className="absolute top-4 right-4 z-[1400] flex gap-2">
                {/* Exit Fullscreen Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="bg-black/70 text-white hover:bg-black/80"
                  title="Exit fullscreen"
                >
                  <Minimize className="size-5" />
                </Button>

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseViewer}
                  className="bg-black/70 text-white hover:bg-black/80"
                  title="Close document"
                >
                  <X className="size-5" />
                </Button>
              </div>
            )}

            {/* Document Content */}
            <div className="flex-1 overflow-hidden">{renderDocumentViewer()}</div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {viewerState.phase === 'error' && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-16 left-0 right-0 bottom-0 z-[1300] bg-black/80 flex items-center justify-center"
          >
            <Alert variant="destructive" className="max-w-[400px] mx-4">
              <AlertDescription>{viewerState.error}</AlertDescription>
            </Alert>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RecordDocumentViewer;
