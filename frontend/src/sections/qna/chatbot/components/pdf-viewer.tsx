import 'react-pdf/dist/Page/TextLayer.css';
// Import react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';

import { Page, pdfjs, Document } from 'react-pdf';
import { useResizeObserver } from '@wojtekmaj/react-hooks';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Plus, Minus, X, RefreshCw, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

// PDF.js worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const resizeObserverOptions = {};
const maxWidth = 800;

// Helper function to safely convert ArrayBuffer to Uint8Array
const safeBufferToUint8Array = (buffer: ArrayBuffer): Uint8Array => {
  try {
    // Create a copy to prevent detachment issues
    const bufferCopy = buffer.slice(0);
    return new Uint8Array(bufferCopy);
  } catch (error) {
    console.error('Error converting buffer to Uint8Array:', error);
    throw new Error('Failed to convert buffer data');
  }
};

const PageLoader = () => (
  <div className="flex justify-center items-center h-[200px] bg-muted rounded-md">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

interface DocumentLoadSuccess {
  numPages: number;
}

interface PDFViewerProps {
  open: boolean;
  onClose: () => void;
  pdfUrl?: string | null;
  pdfBuffer?: ArrayBuffer | null;
  fileName: string;
}

export default function PDFViewer({ open, onClose, pdfUrl, pdfBuffer, fileName }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  // const [currentPage, setCurrentPage] = useState<number>(1);
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>();
  const [loading, setLoading] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<number>(0);

  // Memoize the Document options to prevent unnecessary reloads
  const documentOptions = useMemo(
    () => ({
      cMapUrl: new URL('pdfjs-dist/cmaps/', import.meta.url).toString(),
      cMapPacked: true,
    }),
    []
  );

  // This state will store the properly prepared PDF source for react-pdf
  const [pdfSource, setPdfSource] = useState<any>(null);

  // Process the input sources to create the appropriate format for react-pdf
  useEffect(() => {
    let isMounted = true;

    const prepareSource = async () => {
      try {
        setLoading(true);
        setError(null);

        if (pdfUrl) {
          // For URL-based PDFs, pass the URL directly
          setPdfSource({ url: pdfUrl });
        } else if (pdfBuffer) {
          // Create a safer copy of the buffer in a way that prevents detachment issues
          // by performing the operation asynchronously
          await new Promise((resolve) => setTimeout(resolve, 0));

          if (!isMounted) return;

          try {
            // Use the helper function to safely convert buffer
            const uint8Array = safeBufferToUint8Array(pdfBuffer);
            setPdfSource({ data: uint8Array });
          } catch (err) {
            console.error('Error preparing PDF buffer:', err);
            setError('Failed to prepare PDF data. The buffer may be corrupted.');
            setLoading(false);
          }
        } else {
          setPdfSource(null);
          setLoading(false);
        }

        // Reset viewing state
        setNumPages(0);
        // setCurrentPage(1);
        setScale(1);
        setKey((prev) => prev + 1);
      } catch (err) {
        console.error('Error in prepareSource:', err);
        if (isMounted) {
          setError('An unexpected error occurred while preparing the document.');
          setLoading(false);
        }
      }
    };

    prepareSource();

    return () => {
      isMounted = false;
    };
  }, [pdfUrl, pdfBuffer]);

  // Cleanup function
  useEffect(
    () => () => {
      setNumPages(0);
      // setCurrentPage(1);
      setScale(1);
      setError(null);
      setLoading(true);
      setPdfSource(null);
    },
    []
  );

  const onResize = useCallback((entries: ResizeObserverEntry[]) => {
    const [entry] = entries;
    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useResizeObserver(containerRef, resizeObserverOptions, onResize);

  const onDocumentLoadSuccess = useCallback(({ numPages: nextNumPages }: DocumentLoadSuccess) => {
    setNumPages(nextNumPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('Error loading PDF:', err);
    setError('Failed to load PDF. Please try again.');
    setLoading(false);
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((prevScale) => Math.min(prevScale + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prevScale) => Math.max(prevScale - 0.1, 0.5));
  }, []);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setKey((prev) => prev + 1);
  }, []);

  if (!pdfSource) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-h-[90vh] max-h-[90vh] p-0 flex flex-col bg-background">
        <DialogHeader className="flex flex-row justify-between items-center border-b border-border p-4 bg-card">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText size={24} className="flex-shrink-0 text-foreground" />
            <DialogTitle className="text-lg font-semibold truncate">{fileName}</DialogTitle>
            {loading && <Loader2 size={16} className="ml-2 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleZoomOut}
                  size="icon"
                  variant="ghost"
                  disabled={scale <= 0.5 || loading}
                  className="h-8 w-8"
                >
                  <Minus size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>
            <span className="min-w-[40px] text-center text-sm text-muted-foreground">
              {Math.round(scale * 100)}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleZoomIn}
                  size="icon"
                  variant="ghost"
                  disabled={scale >= 2 || loading}
                  className="h-8 w-8"
                >
                  <Plus size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onClose} size="icon" variant="ghost" className="h-8 w-8 ml-1">
                  <X size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-0">
          <div ref={setContainerRef} className={cn('overflow-auto h-full px-4 py-6 bg-muted/30')}>
            {error ? (
              <div className="p-8 text-center rounded-lg bg-destructive/10 text-destructive mt-8">
                <AlertCircle size={48} className="mx-auto mb-4 text-destructive" />
                <h6 className="text-lg font-semibold mb-2 text-destructive">{error}</h6>
                <p className="text-sm text-destructive/80 mb-4">
                  {pdfUrl
                    ? 'The document might be inaccessible or the URL might have expired'
                    : 'The document might be corrupted or in an unsupported format'}
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      size="icon"
                      className="bg-background hover:bg-background/80"
                    >
                      <RefreshCw size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Try loading again</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Document
                key={key}
                file={pdfSource}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<PageLoader />}
                options={documentOptions}
              >
                <AnimatePresence>
                  {Array.from(new Array(numPages), (_, index) => (
                    <m.div
                      key={`page_${index + 1}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: loading ? 0 : 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'flex justify-center mb-4 last:mb-0',
                        'shadow-md rounded-md bg-card overflow-hidden'
                      )}
                    >
                      <Page
                        pageNumber={index + 1}
                        width={
                          containerWidth
                            ? Math.min(containerWidth * scale, maxWidth * scale)
                            : maxWidth * scale
                        }
                        loading={<PageLoader />}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                    </m.div>
                  ))}
                </AnimatePresence>
              </Document>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
