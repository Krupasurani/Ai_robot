import type { CustomCitation } from 'src/types/chat-bot';
import type { Position, HighlightType, ProcessedCitation } from 'src/types/pdf-highlighter';
import type {
  SearchResult,
  DocumentContent,
} from 'src/sections/knowledgebase/types/search-response';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Maximize2, ZoomIn, ZoomOut, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';

import CitationSidebar from './highlighter-sidebar';

// Props type definition
type ImageHighlighterProps = {
  citations: DocumentContent[] | CustomCitation[];
  url: string | null;
  buffer?: ArrayBuffer | null;
  alt?: string;
  sx?: Record<string, unknown>;
  highlightCitation?: SearchResult | CustomCitation | null;
  onClosePdf: () => void;
};

// Helper functions
const getNextId = (): string => `img-hl-${Math.random().toString(36).substring(2, 10)}`;

const isDocumentContent = (
  citation: DocumentContent | CustomCitation
): citation is DocumentContent => 'metadata' in citation && citation.metadata !== undefined;

const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
};

const processImageHighlight = (
  citation: DocumentContent | CustomCitation,
  index: number
): HighlightType | null => {
  try {
    const rawContent = citation.content;
    const normalizedContent = normalizeText(rawContent);

    if (!normalizedContent || normalizedContent.length < 5) {
      return null;
    }

    let id: string;
    if ('highlightId' in citation && citation.highlightId) id = citation.highlightId as string;
    else if ('id' in citation && citation.id) id = citation.id as string;
    else if ('citationId' in citation && citation.citationId) id = citation.citationId as string;
    else if (isDocumentContent(citation) && citation.metadata?._id) id = citation.metadata._id;
    else if ('_id' in citation && citation._id) id = citation._id as string;
    else id = getNextId();

    // Create a position that will be used for overlay placement
    // We'll calculate actual positions based on image dimensions later
    const position: Position = {
      pageNumber: 1, // Images are single "page"
      boundingRect: {
        x1: 10 + index * 5, // Offset each highlight slightly
        y1: 10 + index * 5,
        x2: 30 + index * 5,
        y2: 30 + index * 5,
        width: 20,
        height: 20,
      },
      rects: [],
    };

    return {
      content: { text: normalizedContent },
      position,
      comment: { text: `Citation ${index + 1}`, emoji: '📌' },
      id,
    };
  } catch (error) {
    console.error('Error processing highlight for citation:', citation, error);
    return null;
  }
};

const ImageHighlighter: React.FC<ImageHighlighterProps> = ({
  url,
  buffer,
  alt = 'Image',
  sx = {},
  citations = [],
  highlightCitation = null,
  onClosePdf,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [processedCitations, setProcessedCitations] = useState<ProcessedCitation[]>([]);
  const [highlightedCitationId, setHighlightedCitationId] = useState<string | null>(null);
  const fullScreenContainerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    // Cleanup previous blob URL if it exists
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        let loadedUrl = '';
        if (url) {
          loadedUrl = url;
        } else if (buffer) {
          // Convert buffer to blob URL
          const blob = new Blob([buffer], { type: 'image/png' });
          loadedUrl = URL.createObjectURL(blob);
          blobUrlRef.current = loadedUrl;
        } else {
          throw new Error('Either url or buffer must be provided');
        }

        setImageUrl(loadedUrl);
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading image:', err);
        setError(err.message || 'Failed to load image');
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      // Cleanup blob URLs
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [url, buffer]);

  // Handle image load to get dimensions
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  }, []);

  // Process citations
  useEffect(() => {
    if (citations && citations.length > 0 && imageDimensions.width > 0) {
      const processed: ProcessedCitation[] = citations
        .map((citation, index) => {
          const highlight = processImageHighlight(citation, index);
          if (highlight) {
            return { ...citation, highlight } as ProcessedCitation;
          }
          return null;
        })
        .filter((item): item is ProcessedCitation => item !== null);

      setProcessedCitations(processed);
    } else {
      setProcessedCitations([]);
    }
  }, [citations, imageDimensions]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitScreen = useCallback(() => {
    if (imageContainerRef.current && imageRef.current) {
      const containerWidth = imageContainerRef.current.clientWidth;
      const containerHeight = imageContainerRef.current.clientHeight;
      const imageWidth = imageRef.current.naturalWidth;
      const imageHeight = imageRef.current.naturalHeight;

      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      const newZoom = Math.min(scaleX, scaleY, 1);

      setZoom(newZoom);
      setPan({ x: 0, y: 0 });
    }
  }, []);

  // Pan controls
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle highlight click
  const handleHighlightClick = useCallback((highlightId: string) => {
    setHighlightedCitationId(highlightId);
    const highlightElement = document.querySelector(`[data-highlight-id="${highlightId}"]`);
    if (highlightElement) {
      highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Scroll to highlight from sidebar
  const scrollToHighlight = useCallback((highlight: HighlightType | null): void => {
    if (!highlight || !highlight.id) return;

    setHighlightedCitationId(highlight.id);
    setTimeout(() => {
      const highlightElement = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
      if (highlightElement) {
        highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, []);

  const toggleFullScreen = useCallback(async (): Promise<void> => {
    try {
      if (!document.fullscreenElement && fullScreenContainerRef.current) {
        await fullScreenContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  }, []);

  // Calculate highlight positions based on current image size
  const getHighlightStyle = useCallback((highlight: HighlightType) => {
    if (!imageRef.current) return {};

    const imgRect = imageRef.current.getBoundingClientRect();
    const containerRect = imageContainerRef.current?.getBoundingClientRect();

    if (!containerRect) return {};

    // Calculate actual image display size
    const displayWidth = imgRect.width;
    const displayHeight = imgRect.height;

    // Calculate position relative to container
    const highlightWidth = 150; // Fixed width for highlights
    const highlightHeight = 100; // Fixed height for highlights

    // Position highlights in a grid pattern
    const { x1, y1 } = highlight.position.boundingRect;
    const left = (x1 / 100) * displayWidth;
    const top = (y1 / 100) * displayHeight;

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${highlightWidth}px`,
      height: `${highlightHeight}px`,
    };
  }, []);

  return (
    <div
      ref={fullScreenContainerRef}
      className={cn(
        'w-full h-full relative overflow-hidden rounded-md border border-border bg-card',
        sx
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-10 w-10 mb-4 animate-spin text-primary" />
          <p className="text-foreground">Loading Image...</p>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 text-destructive p-4 text-center z-10">
          <AlertCircle className="h-10 w-10 mb-4" />
          <h6 className="text-lg font-semibold mb-2">Loading Error</h6>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Container for main content and sidebar */}
      <div className={cn('flex h-full w-full', loading || error ? 'invisible' : 'visible')}>
        {/* Image Content Area */}
        <div
          className={cn(
            'h-full flex-grow relative transition-all duration-300',
            processedCitations.length > 0 ? 'w-[calc(100%-280px)] border-r border-border' : 'w-full'
          )}
        >
          {/* Zoom Controls - Thero UI inspired */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 bg-card/95 backdrop-blur-sm rounded-md p-2 shadow-lg border border-border z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              title="Zoom In"
              className="h-8 w-8"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              title="Zoom Out"
              className="h-8 w-8"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFitScreen}
              title="Fit to Screen"
              className="h-8 w-8"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetZoom}
              title="Reset"
              className="h-8 w-8"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <div className="text-center px-2 py-1 bg-muted/50 rounded text-xs font-medium text-foreground">
              {Math.round(zoom * 100)}%
            </div>
          </div>

          <div
            ref={imageContainerRef}
            role="application"
            className={cn(
              'w-full h-full overflow-auto min-h-[100px]',
              'flex items-center justify-center',
              'bg-card/50 dark:bg-card/30'
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {imageUrl && (
              <div
                className="relative"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.2s ease',
                }}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={alt}
                  onLoad={handleImageLoad}
                  draggable={false}
                  className="max-w-full max-h-full object-contain block transition-transform duration-200 cursor-grab active:cursor-grabbing"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Area (Conditional) - Thero UI inspired light grey sidebar */}
        {processedCitations.length > 0 && !loading && !error && (
          <div className="w-[280px] h-full flex-shrink-0 overflow-y-auto bg-muted/30 dark:bg-muted/20 border-l border-border">
            <CitationSidebar
              citations={processedCitations}
              scrollViewerTo={scrollToHighlight}
              highlightedCitationId={highlightedCitationId}
              toggleFullScreen={toggleFullScreen}
              onClosePdf={onClosePdf}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageHighlighter;
