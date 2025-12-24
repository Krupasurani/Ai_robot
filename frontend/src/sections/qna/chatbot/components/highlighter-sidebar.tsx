import type { HighlightType, ProcessedCitation } from 'src/types/pdf-highlighter';
import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Quote, FileSpreadsheet, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

// Updated props interface to include highlightedCitationId
interface CitationSidebarProps {
  citations: ProcessedCitation[];
  scrollViewerTo: (highlight: HighlightType) => void;
  highlightedCitationId?: string | null;
  toggleFullScreen: () => void;
  onClosePdf: () => void;
}

const CitationSidebar = ({
  citations,
  scrollViewerTo,
  highlightedCitationId = null,
  toggleFullScreen,
  onClosePdf,
}: CitationSidebarProps) => {
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (highlightedCitationId) {
      // Find the citation that matches the highlighted ID using multiple strategies
      const citationToHighlight = citations.find(
        (citation) =>
          citation.highlight?.id === highlightedCitationId ||
          citation.citationId === highlightedCitationId ||
          citation.metadata?._id === highlightedCitationId ||
          citation.id === highlightedCitationId
      );

      if (citationToHighlight) {
        // Use the citation's highlight ID or fallback to other IDs
        const citationId =
          citationToHighlight.highlight?.id ||
          citationToHighlight.citationId ||
          citationToHighlight.metadata?._id ||
          citationToHighlight.id;

        setSelectedCitation(citationId || null);

        // If we found it, scroll to it in the sidebar
        if (citationToHighlight?.highlight) {
          // Find the list item element for this citation
          const listItemId = `citation-item-${citationId}`;
          const listItem = document.getElementById(listItemId);
          if (listItem) {
            // Scroll the list item into view
            listItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    } else {
      setSelectedCitation(null);
    }
  }, [highlightedCitationId, citations]);

  const handleCitationClick = (citation: ProcessedCitation) => {
    if (citation.highlight) {
      // Ensure the highlight has all required properties
      const highlight: HighlightType = {
        ...citation.highlight,
        content: citation.highlight.content || { text: '' },
        // Make sure position is properly set
        position: citation.highlight.position || {
          boundingRect: {},
          rects: [],
          pageNumber: citation.metadata?.pageNum?.[0] || 1,
        },
        // Make sure id is defined with multiple fallback strategies
        id:
          citation.highlight.id ||
          citation.citationId ||
          citation.metadata?._id ||
          String(Math.random()).slice(2),
      };
      // Try using the highlight we constructed rather than citation.highlight directly
      try {
        scrollViewerTo(highlight);
      } catch (err) {
        // Fallback: try again after small delay
        setTimeout(() => {
          try {
            scrollViewerTo(highlight);
          } catch (fallbackErr) {
            // Silent fallback failure
          }
        }, 200);
      }

      // Also set the hash
      document.location.hash = `highlight-${highlight.id}`;
      setSelectedCitation(highlight.id);
    } else {
      // No highlight found for citation
    }
  };

  const handleToggleFullScreen = () => {
    setIsFullscreen(!isFullscreen);
    toggleFullScreen();
  };

  return (
    <div className="w-[300px] border-l border-border h-full flex flex-col bg-background overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/30">
        <Quote className="size-4.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Citations</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFullScreen}
              className="size-8 bg-background hover:bg-muted border border-border"
            >
              {isFullscreen ? (
                <Minimize2 className="size-4 text-primary" />
              ) : (
                <Maximize2 className="size-4 text-primary" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</TooltipContent>
        </Tooltip>
        <Button
          onClick={onClosePdf}
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs font-semibold gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
        >
          Close
          <X className="size-4" />
        </Button>
      </div>

      {/* Citations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {citations.map((citation, index) => {
            const citationId =
              citation.highlight?.id ||
              citation.citationId ||
              citation.metadata?._id ||
              citation.id;
            const isSelected = selectedCitation === citationId;

            return (
              <div
                key={citation.metadata?._id || citation.highlight?.id || index}
                id={`citation-item-${citationId}`}
                onClick={() => handleCitationClick(citation)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCitationClick(citation);
                  }
                }}
                role="button"
                tabIndex={0}
                className={cn(
                  'cursor-pointer relative p-3 rounded-md transition-all',
                  'hover:bg-muted/50 border border-transparent',
                  isSelected && 'bg-primary/10 border-primary/30 shadow-sm ring-1 ring-primary/20'
                )}
              >
                <div>
                  <h4
                    className={cn(
                      'text-xs font-semibold mb-1',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    Citation {citation.chunkIndex ? citation.chunkIndex : index + 1}
                  </h4>

                  <p className="text-xs text-muted-foreground leading-relaxed relative pl-3 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary before:rounded-sm">
                    {citation.metadata?.extension === 'pdf' &&
                    citation.metadata?.blockText &&
                    typeof citation.metadata?.blockText === 'string' &&
                    citation.metadata?.blockText.length > 0
                      ? citation.metadata?.blockText
                      : citation.content}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {citation.metadata?.sheetName && (
                      <Badge
                        variant="secondary"
                        className="h-5 px-2 text-[0.625rem] font-medium gap-1"
                      >
                        <FileSpreadsheet className="size-3" />
                        {citation.metadata.sheetName}
                      </Badge>
                    )}

                    {(citation.metadata.extension === 'csv' ||
                      citation.metadata.extension === 'xlsx' ||
                      citation.metadata.extension === 'xls') &&
                      citation.metadata?.blockNum?.[0] && (
                        <Badge
                          variant="secondary"
                          className="h-5 px-2 text-[0.625rem] font-medium gap-1"
                        >
                          <Table2 className="size-3" />
                          {citation.metadata.extension === 'csv'
                            ? `Row ${citation.metadata.blockNum[0] + 1}`
                            : `Row ${citation.metadata.blockNum[0]}`}
                        </Badge>
                      )}

                    {citation.highlight?.position &&
                      citation.highlight?.position.pageNumber > 0 && (
                        <Badge variant="secondary" className="h-5 px-2 text-[0.625rem] font-medium">
                          Page {citation.highlight.position.pageNumber}
                        </Badge>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CitationSidebar;
