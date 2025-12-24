import type { CSSProperties } from 'react';
import type { ScaledPosition } from 'react-pdf-highlighter';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import type { DocumentContent } from 'src/sections/knowledgebase/types/search-response';
import type {
  Comment,
  Content,
  Position,
  BoundingBox,
  HighlightType,
  ProcessedCitation,
  HighlightPopupProps,
  PdfHighlighterCompProps,
} from 'src/types/pdf-highlighter';

import * as pdfjsLib from 'pdfjs-dist';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Minus,
  Maximize2,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Tip, Popup, Highlight, AreaHighlight, PdfHighlighter } from 'react-pdf-highlighter';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// Global styles required by react-pdf-highlighter / pdf.js
import 'react-pdf-highlighter/dist/style.css';
import './pdf-styles.css';

import CitationSidebar from './highlighter-sidebar';

// Initialize PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const getNextId = () => String(Math.random()).slice(2);

// Constants for timing and polling
const SCROLL_TO_HIGHLIGHT_DELAY_MS = 1500;
const HIGHLIGHT_POLLING_INTERVAL_MS = 100;
const HIGHLIGHT_POLLING_MAX_ATTEMPTS = 50; // 5 seconds max

// Custom PDF Loader that can work with either URL or buffer
interface EnhancedPdfLoaderProps {
  url?: string | null;
  pdfBuffer?: ArrayBuffer | null;
  beforeLoad?: any;
  children?: any;
  onError?: any;
  setLoading: any;
}

const EnhancedPdfLoader = ({
  url,
  pdfBuffer,
  beforeLoad,
  children,
  onError,
  setLoading,
}: EnhancedPdfLoaderProps) => {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy>();
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        let loadingTask;

        if (pdfBuffer) {
          // Create a copy of the buffer to prevent detachment issues
          const bufferCopy = pdfBuffer.slice(0);

          loadingTask = pdfjsLib.getDocument({
            data: bufferCopy,
            isEvalSupported: false,
            cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
          });
        } else if (url) {
          // URL-based loading remains unchanged
          loadingTask = pdfjsLib.getDocument({
            url,
            isEvalSupported: false,
            cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
          });
        } else {
          throw new Error('Either url or pdfBuffer must be provided');
        }

        const document = await loadingTask.promise;
        setPdfDocument(document);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err);
        if (onError) onError(err);
      }
    };

    if (url || pdfBuffer) {
      loadPdf();
    }
    // eslint-disable-next-line
  }, [url, pdfBuffer, onError]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">Error loading PDF. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!pdfDocument) {
    return (
      beforeLoad || (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    );
  }

  return children(pdfDocument);
};

const HighlightPopup: React.FC<HighlightPopupProps> = ({ comment }) =>
  comment?.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

const processHighlight = (citation: DocumentContent): HighlightType | null => {
  try {
    const boundingBox: BoundingBox[] | undefined = citation.metadata?.bounding_box;

    if (!boundingBox || boundingBox.length === 0) {
      console.warn('Invalid or missing bounding box for citation:', {
        citationId: citation.citationId || citation.id || citation.metadata?._id,
        boundingBox,
      });
      return null;
    }

    // Compute overall rectangle from all provided points
    const xs = boundingBox.map((b) => b.x);
    const ys = boundingBox.map((b) => b.y);

    let minX = Math.min(...xs);
    let minY = Math.min(...ys);
    let maxX = Math.max(...xs);
    let maxY = Math.max(...ys);

    // Ensure non-zero dimensions for visibility (e.g. if only one point provided)
    if (Math.abs(maxX - minX) < 0.00001) {
      maxX += 0.005;
      minX -= 0.005;
    }
    if (Math.abs(maxY - minY) < 0.00001) {
      maxY += 0.005;
      minY -= 0.005;
    }

    // Heuristic: if all coordinates are approximately in [0, 1], treat them as normalized.
    // Allow slightly > 1 due to float precision (e.g. 1.0001) and slightly < 0 (e.g. -0.0001)
    const isNormalized =
      xs.every((x) => x >= -0.01 && x <= 1.01) && ys.every((y) => y >= -0.01 && y <= 1.01);

    const pageNumber = citation.metadata?.pageNum?.[0] || 1;

    let mainRect;
    let usePdfCoordinates = false;

    if (isNormalized) {
      // Normalized 0–1 coordinates: keep width/height as 1 so scaledToViewport
      // can rescale them to the actual viewport dimensions.
      const PAGE_WIDTH = 1;
      const PAGE_HEIGHT = 1;

      mainRect = {
        x1: minX * PAGE_WIDTH,
        y1: minY * PAGE_HEIGHT,
        x2: maxX * PAGE_WIDTH,
        y2: maxY * PAGE_HEIGHT,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        pageNumber,
      };
    } else {
      // Absolute PDF-space coordinates; let pdf.js convert them directly.
      usePdfCoordinates = true;
      mainRect = {
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY,
        // width/height are not used when usePdfCoordinates is true, but keep them for completeness.
        width: maxX - minX || 1,
        height: maxY - minY || 1,
        pageNumber,
      };
    }

    const highlightId = citation.citationId || citation.metadata?._id || citation.id || getNextId();

    return {
      content: {
        text: citation.content || '',
      },
      position: {
        boundingRect: mainRect,
        rects: [mainRect],
        pageNumber,
        usePdfCoordinates,
      },
      comment: {
        text: '',
        emoji: '',
      },
      id: highlightId,
    };
  } catch (error) {
    console.error('Error processing highlight:', error);
    return null;
  }
};

const PdfHighlighterComp = ({
  pdfUrl = '',
  pdfBuffer = null,
  externalRecordId = '',
  fileName = '',
  initialHighlights = [],
  citations = [],
  highlightCitation = null,
  onClosePdf,
}: PdfHighlighterCompProps) => {
  const [highlights, setHighlights] = useState<HighlightType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actualPdfUrl, setActualPdfUrl] = useState<string | null>(pdfUrl || null);
  const [actualPdfBuffer, setActualPdfBuffer] = useState<ArrayBuffer | null>(pdfBuffer || null);
  const scrollViewerTo = useRef<(highlight: HighlightType) => void>(() => {});
  const [processedCitations, setProcessedCitations] = useState<ProcessedCitation[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pdfWidth, setPdfWidth] = useState<number>(100); // Percentage of screen width
  const [pdfScale, setPdfScale] = useState<number>(1); // Zoom scale
  const [showWidthControls, setShowWidthControls] = useState<boolean>(false);
  const [showZoomControls, setShowZoomControls] = useState<boolean>(false);
  const [showResetControls, setShowResetControls] = useState<boolean>(false);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; scale: number }>({
    width: 80,
    scale: 1,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Only inject CSS for react-pdf-highlighter library highlights
    // Control styles are now handled by Tailwind classes
    const style = document.createElement('style');
    style.textContent = `
      .Highlight__part {
        cursor: pointer;
        position: absolute;
        background: rgba(0, 226, 143, 0.2);
        transition: background 0.3s;
      }
   
      .Highlight--scrolledTo .Highlight__part {
        background: rgba(0, 226, 143, 0.4);
        position: relative;
      }
      
      .Highlight--scrolledTo .Highlight__part::before {
        content: '[';
        position: absolute;
        top: 0;
        left: -8px;
        height: 100%;
        color: #006400;
        font-size: 20px;
        font-weight: bold;
        display: flex;
        align-items: center;
      }
   
      .Highlight--scrolledTo .Highlight__part::after {
        content: ']';
        position: absolute;
        top: 0;
        right: -8px;
        height: 100%;
        color: #006400;
        font-size: 20px;
        font-weight: bold;
        display: flex;
        align-items: center;
      }
    `;
    document.head.appendChild(style);
    // eslint-disable-next-line no-void
    return () => void document.head.removeChild(style);
  }, []);

  useEffect(() => {
    // Store original dimensions when component mounts
    setOriginalDimensions({ width: pdfWidth, scale: pdfScale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - we intentionally want the initial values

  useEffect(() => {
    // Click outside to close controls
    const handleClickOutside = (event: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
        setShowWidthControls(false);
        setShowZoomControls(false);
        setShowResetControls(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const processCitationsWithHighlights = () => {
      if (citations?.length > 0) {
        const processed: ProcessedCitation[] = citations
          .map((c: any) => {
            const doc: DocumentContent = c?.citationData ? c.citationData : (c as DocumentContent);
            const highlight = processHighlight(doc);
            return {
              ...doc,
              highlight,
              citationId: c?.citationId,
            } as ProcessedCitation;
          })
          .filter((pc) => pc.highlight);

        // Validate highlights before setting them
        const validHighlights = processed
          .map((c) => c.highlight)
          .filter((highlight): highlight is HighlightType => {
            if (!highlight) return false;
            const isValid = !!(
              highlight.id &&
              highlight.position &&
              highlight.position.boundingRect &&
              highlight.position.pageNumber &&
              highlight.position.pageNumber > 0
            );
            return isValid;
          });

        setProcessedCitations(processed);
        setHighlights(validHighlights);
      } else {
        setProcessedCitations([]);
        setHighlights([]);
      }
    };

    processCitationsWithHighlights();
  }, [actualPdfUrl, actualPdfBuffer, citations]);

  useEffect(() => {
    // Only execute this effect when necessary conditions are met
    if (
      highlights.length > 0 &&
      highlightCitation &&
      scrollViewerTo.current &&
      typeof scrollViewerTo.current === 'function' &&
      !loading
    ) {
      // Try multiple ID matching strategies
      const citationId =
        highlightCitation.citationId || highlightCitation.metadata?._id || highlightCitation.id;

      if (!citationId) {
        return undefined;
      }

      // Find the highlight that corresponds to the highlightCitation
      const targetHighlight = highlights.find((h) => h.id === citationId);

      // Create a function to check if highlight element exists in DOM
      const waitForHighlightElement = (highlight: HighlightType): Promise<boolean> =>
        new Promise((resolve) => {
          let attempts = 0;

          const pollForElement = () => {
            // Look for highlight elements with the specific ID
            const highlightElement =
              document.querySelector(`[data-highlight-id="${highlight.id}"]`) ||
              document.querySelector(`.Highlight[data-highlight-id="${highlight.id}"]`) ||
              document.querySelector(`[id*="${highlight.id}"]`);

            if (highlightElement) {
              resolve(true);
              return;
            }

            attempts += 1;
            if (attempts >= HIGHLIGHT_POLLING_MAX_ATTEMPTS) {
              resolve(false);
              return;
            }

            setTimeout(pollForElement, HIGHLIGHT_POLLING_INTERVAL_MS);
          };

          pollForElement();
        });

      // Create a function to attempt scrolling
      const attemptScroll = async () => {
        if (targetHighlight) {
          // Wait for the highlight element to exist in DOM
          const elementExists = await waitForHighlightElement(targetHighlight);
          if (elementExists) {
            scrollViewerTo.current(targetHighlight);
            return true;
          }
        }

        // Fallback: Find any highlight on the specified page
        if (highlightCitation.metadata?.pageNum && highlightCitation.metadata.pageNum.length > 0) {
          const pageNumber = highlightCitation.metadata.pageNum[0];
          const highlightOnPage = highlights.find((h) => h.position.pageNumber === pageNumber);

          if (highlightOnPage) {
            const elementExists = await waitForHighlightElement(highlightOnPage);
            if (elementExists) {
              scrollViewerTo.current(highlightOnPage);
              return true;
            }
          }
        }

        return false;
      };

      // Set up a timer to try scrolling after initial delay
      const timer = setTimeout(async () => {
        const scrolled = await attemptScroll();

        // If scrolling failed on first attempt, try once more after a bit
        if (!scrolled) {
          setTimeout(async () => {
            await attemptScroll();
          }, SCROLL_TO_HIGHLIGHT_DELAY_MS);
        }
      }, SCROLL_TO_HIGHLIGHT_DELAY_MS);

      // Clean up timer on unmount
      return () => clearTimeout(timer);
    }

    // Return undefined for cases where we don't set up a timer
    return undefined;
  }, [highlights, highlightCitation, loading]);

  useEffect(() => {
    // Only run this once when the PDF document is available and scroll function is set
    if (scrollViewerTo.current && typeof scrollViewerTo.current === 'function') {
      // Create a wrapper for the scrollViewerTo function that includes error handling
      const originalScrollFn = scrollViewerTo.current;

      // Replace the function with an enhanced version
      scrollViewerTo.current = (highlight: HighlightType) => {
        if (!highlight) {
          return;
        }

        // Validate highlight structure before scrolling
        if (
          !highlight.position ||
          !highlight.position.pageNumber ||
          highlight.position.pageNumber <= 0
        ) {
          return;
        }

        try {
          // Call the original function
          originalScrollFn(highlight);
        } catch (err) {
          // Fallback: try to scroll to the page if highlight fails
          if (highlight.position?.pageNumber) {
            try {
              // This is a basic fallback - scroll to the page
              const pageElement = document.querySelector(
                `[data-page-number="${highlight.position.pageNumber}"]`
              );
              if (pageElement) {
                pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            } catch (fallbackErr) {
              // Silently ignore fallback error
            }
          }
        }
      };
    }
  }, []);

  const addHighlight = useCallback((highlight: Omit<HighlightType, 'id'>): void => {
    setHighlights((prevHighlights) => [
      {
        ...highlight,
        id: getNextId(),
        comment: highlight.comment || { text: '', emoji: '' },
      },
      ...prevHighlights,
    ]);
  }, []);

  const updateHighlight = useCallback(
    (highlightId: string, position: Partial<Position>, content: Partial<Content>) => {
      setHighlights((prevHighlights) =>
        prevHighlights.map((h) => {
          if (h.id !== highlightId) return h;
          return {
            ...h,
            position: { ...h.position, ...position },
            content: { ...h.content, ...content },
          };
        })
      );
    },
    []
  );

  const handleFullscreenChange = useCallback((): void => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleFullscreenChange]);

  const toggleFullScreen = useCallback(async (): Promise<void> => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  }, []);

  // Removed handleWidthChange and handleScaleChange - now using direct state setters in Slider onValueChange

  const increaseScale = useCallback(() => {
    setPdfScale((prev) => Math.min(prev + 0.1, 3));
  }, []);

  const decreaseScale = useCallback(() => {
    setPdfScale((prev) => Math.max(prev - 0.1, 0.5));
  }, []);

  const resetToDefaults = useCallback(() => {
    setPdfWidth(80);
    setPdfScale(1);
  }, []);

  const autoFitWidth = useCallback(() => {
    setPdfWidth(100);
  }, []);

  const autoFitZoom = useCallback(() => {
    setPdfScale(1);
  }, []);

  const fitToScreen = useCallback(() => {
    setPdfWidth(100);
    setPdfScale(0.9);
  }, []);

  const resetToOriginal = useCallback(() => {
    setPdfWidth(originalDimensions.width);
    setPdfScale(originalDimensions.scale);
  }, [originalDimensions]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full w-full text-destructive">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full w-full">
      {/* Controls - Thero UI inspired floating controls */}
      <div
        ref={controlsRef}
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end"
      >
        {/* Reset Control Bar */}
        {showResetControls && (
          <div className="bg-background/95 backdrop-blur-md border border-border rounded-[28px] px-5 py-3 flex items-center gap-3 min-w-[360px] shadow-lg animate-in slide-in-from-right-5 duration-250">
            <Button
              variant="default"
              size="sm"
              onClick={resetToDefaults}
              className="text-xs font-medium"
            >
              Reset All
            </Button>
            <Button variant="outline" size="sm" onClick={resetToOriginal} className="text-xs">
              Original
            </Button>
            <Button variant="outline" size="sm" onClick={autoFitWidth} className="text-xs">
              Full Width
            </Button>
            <Button variant="outline" size="sm" onClick={autoFitZoom} className="text-xs">
              100% Zoom
            </Button>
            <Button variant="outline" size="sm" onClick={fitToScreen} className="text-xs">
              Fit Screen
            </Button>
          </div>
        )}

        {/* Width Control Bar */}
        {showWidthControls && (
          <div className="bg-background/95 backdrop-blur-md border border-border rounded-[28px] px-5 py-3 flex items-center gap-3 min-w-[280px] shadow-lg animate-in slide-in-from-right-5 duration-250">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPdfWidth((prev) => Math.max(prev - 5, 30))}
              className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted border border-border"
              aria-label="Decrease width"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-foreground min-w-[70px]">
              Width: {pdfWidth}%
            </span>
            <Slider
              value={[pdfWidth]}
              onValueChange={(value) => setPdfWidth(value[0])}
              min={30}
              max={100}
              step={5}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPdfWidth((prev) => Math.min(prev + 5, 100))}
              className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted border border-border"
              aria-label="Increase width"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Zoom Control Bar */}
        {showZoomControls && (
          <div className="bg-background/95 backdrop-blur-md border border-border rounded-[28px] px-5 py-3 flex items-center gap-3 min-w-[280px] shadow-lg animate-in slide-in-from-right-5 duration-250">
            <Button
              variant="ghost"
              size="icon"
              onClick={decreaseScale}
              className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted border border-border"
              aria-label="Decrease zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-foreground min-w-[80px]">
              Zoom: {Math.round(pdfScale * 100)}%
            </span>
            <Slider
              value={[pdfScale]}
              onValueChange={(value) => setPdfScale(value[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={increaseScale}
              className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted border border-border"
              aria-label="Increase zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Control Buttons - Thero UI inspired */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setShowResetControls(!showResetControls);
            setShowWidthControls(false);
            setShowZoomControls(false);
          }}
          className={cn(
            'h-12 w-12 rounded-full bg-background/95 backdrop-blur-md border border-border',
            'hover:bg-muted shadow-lg transition-all duration-200',
            showResetControls && 'bg-primary/10 border-primary/30 text-primary'
          )}
          aria-label="Reset controls"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setShowWidthControls(!showWidthControls);
            setShowZoomControls(false);
            setShowResetControls(false);
          }}
          className={cn(
            'h-12 w-12 rounded-full bg-background/95 backdrop-blur-md border border-border',
            'hover:bg-muted shadow-lg transition-all duration-200',
            showWidthControls && 'bg-primary/10 border-primary/30 text-primary'
          )}
          aria-label="Width controls"
        >
          <Maximize2 className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setShowZoomControls(!showZoomControls);
            setShowWidthControls(false);
            setShowResetControls(false);
          }}
          className={cn(
            'h-12 w-12 rounded-full bg-background/95 backdrop-blur-md border border-border',
            'hover:bg-muted shadow-lg transition-all duration-200',
            showZoomControls && 'bg-primary/10 border-primary/30 text-primary'
          )}
          aria-label="Zoom controls"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 relative overflow-hidden w-full h-full flex justify-center items-center">
        <div
          className="flex flex-col overflow-hidden bg-background rounded-lg shadow-xl"
          style={{
            width: `${pdfWidth}%`,
            height: `${Math.max(100 / pdfScale, 100)}%`,
            minHeight: '100%',
            transform: `scale(${pdfScale})`,
            transformOrigin: 'center center',
          }}
        >
          <EnhancedPdfLoader
            url={actualPdfUrl}
            pdfBuffer={actualPdfBuffer || pdfBuffer}
            setLoading={setLoading}
            beforeLoad={
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            {(pdfDocument: any) => (
              <div
                style={
                  {
                    width: '100%',
                    height: '100%',
                    minHeight: '100%',
                    overflow: 'auto',
                    flex: 1,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  } as CSSProperties
                }
              >
                <PdfHighlighter<HighlightType>
                  pdfDocument={pdfDocument}
                  enableAreaSelection={(event: MouseEvent) => event.altKey}
                  onScrollChange={() => {}}
                  scrollRef={(scrollTo: (highlight: HighlightType) => void) => {
                    scrollViewerTo.current = scrollTo;
                  }}
                  onSelectionFinished={(
                    position: ScaledPosition,
                    content: Content,
                    hideTipAndSelection,
                    transformSelection
                  ) => (
                    <Tip
                      onOpen={transformSelection}
                      onConfirm={(comment: Comment) => {
                        addHighlight({ content, position, comment });
                        hideTipAndSelection();
                      }}
                    />
                  )}
                  highlightTransform={(
                    highlight,
                    index,
                    setTip,
                    hideTip,
                    viewportToScaled,
                    screenshot,
                    isScrolledTo
                  ) => {
                    // Enhanced highlighting logic with multiple ID matching strategies
                    const citationId =
                      highlightCitation?.citationId ||
                      highlightCitation?.metadata?._id ||
                      highlightCitation?.id;
                    const isHighlighted: boolean =
                      Boolean(isScrolledTo) ||
                      Boolean(highlightCitation && citationId === highlight.id);

                    const isTextHighlight = !highlight.content?.image;
                    const component = isTextHighlight ? (
                      <div
                        className="highlight-wrapper"
                        style={
                          {
                            '--highlight-color': isHighlighted ? '#4caf50' : '#e6f4f1',
                            '--highlight-opacity': isHighlighted ? '0.6' : '0.4',
                          } as CSSProperties
                        }
                      >
                        <Highlight
                          isScrolledTo={isHighlighted}
                          position={highlight.position}
                          comment={highlight.comment}
                        />
                      </div>
                    ) : (
                      <AreaHighlight
                        isScrolledTo={isHighlighted}
                        highlight={highlight}
                        onChange={(boundingRect) => {
                          updateHighlight(
                            highlight.id,
                            { boundingRect: viewportToScaled(boundingRect) },
                            { image: screenshot(boundingRect) }
                          );
                        }}
                      />
                    );

                    return (
                      <Popup
                        popupContent={<HighlightPopup {...highlight} />}
                        onMouseOver={(popupContent) => setTip(highlight, () => popupContent)}
                        onMouseOut={hideTip}
                        key={index}
                      >
                        {component}
                      </Popup>
                    );
                  }}
                  highlights={highlights}
                />
              </div>
            )}
          </EnhancedPdfLoader>
        </div>
      </div>
      {processedCitations.length > 0 && (
        <div className="w-[280px] h-full flex-shrink-0 overflow-y-auto bg-muted/30 dark:bg-muted/20 border-l border-border">
          <CitationSidebar
            citations={processedCitations}
            scrollViewerTo={(highlight) => {
              if (scrollViewerTo.current && typeof scrollViewerTo.current === 'function') {
                scrollViewerTo.current(highlight);
              }
            }}
            highlightedCitationId={
              highlightCitation?.citationId ||
              highlightCitation?.metadata?._id ||
              highlightCitation?.id ||
              null
            }
            toggleFullScreen={toggleFullScreen}
            onClosePdf={onClosePdf}
          />
        </div>
      )}
    </div>
  );
};

export default PdfHighlighterComp;
