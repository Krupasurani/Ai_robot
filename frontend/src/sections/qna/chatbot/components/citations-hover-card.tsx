import type { Record } from 'src/types/chat-message';
import type { CustomCitation } from 'src/types/chat-bot';

import React from 'react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { m, AnimatePresence } from 'framer-motion';
import { Eye, ExternalLink, FileText } from 'lucide-react';

interface CitationHoverCardProps {
  citation: CustomCitation;
  isVisible: boolean;
  onRecordClick: (record: Record) => void;
  onClose: () => void;
  onViewPdf: (
    url: string,
    citation: CustomCitation,
    citations: CustomCitation[],
    isExcelFile?: boolean,
    buffer?: ArrayBuffer
  ) => Promise<void>;
  aggregatedCitations: CustomCitation[];
}

const CitationHoverCard = ({
  citation,
  isVisible,
  onRecordClick,
  onClose,
  onViewPdf,
  aggregatedCitations,
}: CitationHoverCardProps) => {
  const hasRecordId = Boolean(citation?.metadata?.recordId);

  // Safe getter functions to prevent undefined access errors
  const getPageNumber = () => {
    try {
      return citation?.metadata?.pageNum?.[0];
    } catch (error) {
      console.warn('Error accessing pageNum:', error);
      return undefined;
    }
  };

  const getSheetName = () => {
    try {
      return citation?.metadata?.sheetName;
    } catch (error) {
      console.warn('Error accessing sheetName:', error);
      return undefined;
    }
  };

  const getBlockNumber = () => {
    try {
      return citation?.metadata?.blockNum?.[0];
    } catch (error) {
      console.warn('Error accessing blockNum:', error);
      return undefined;
    }
  };

  const getExtension = () => {
    try {
      return citation?.metadata?.extension;
    } catch (error) {
      console.warn('Error accessing extension:', error);
      return '';
    }
  };

  const getWebUrl = () => {
    try {
      let webUrl = citation?.metadata?.webUrl;
      if (citation?.metadata?.origin === 'UPLOAD' && webUrl && !webUrl.startsWith('http')) {
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        webUrl = baseUrl + webUrl;
      }
      return webUrl;
    } catch (error) {
      console.warn('Error accessing webUrl:', error);
      return undefined;
    }
  };

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (hasRecordId && citation.metadata?.recordId) {
      // Create a proper Record object with the required citations property
      const record: Record = {
        ...citation.metadata,
        recordId: citation.metadata.recordId,
        citations: aggregatedCitations.filter(
          (c) => c.metadata?.recordId === citation.metadata?.recordId
        ),
      };
      onRecordClick(record);
    }
  };

  const handleOpenPdf = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (citation?.metadata?.recordId) {
      try {
        const extension = getExtension();
        const isExcelOrCSV = ['csv', 'xlsx', 'xls'].includes(extension);
        onViewPdf('', citation, aggregatedCitations, isExcelOrCSV);
      } catch (err) {
        console.error('Failed to fetch document:', err);
      }
    }
  };

  function isDocViewable(extension: string) {
    const viewableExtensions = [
      'pdf',
      'xlsx',
      'xls',
      'csv',
      'docx',
      'html',
      'txt',
      'md',
      'ppt',
      'pptx',
      'jpg',
      'jpeg',
      'png',
      'webp',
      'svg',
    ];
    return viewableExtensions.includes(extension);
  }

  const pageNumber = getPageNumber();
  const sheetName = getSheetName();
  const blockNumber = getBlockNumber();
  const extension = getExtension();
  const webUrl = getWebUrl();

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'max-h-80 p-4 mt-2 overflow-auto relative origin-top-left transition-all duration-150',
            'rounded-lg border bg-card shadow-md'
          )}
        >
          <div className="flex flex-col relative gap-2 z-0">
            {/* Document Header with View Button */}
            <div className="flex justify-between items-center">
              <div
                role="button"
                tabIndex={hasRecordId ? 0 : -1}
                onClick={handleClick}
                onKeyDown={(e) => {
                  if (hasRecordId && (e.key === 'Enter' || e.key === ' ')) {
                    handleClick(e);
                  }
                }}
                className={cn(
                  'flex items-center gap-2 transition-colors text-sm font-semibold',
                  'max-w-[calc(100%-120px)] overflow-hidden text-ellipsis whitespace-nowrap',
                  'text-primary',
                  hasRecordId
                    ? 'cursor-pointer hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm'
                    : 'cursor-default'
                )}
                aria-disabled={!hasRecordId}
              >
                <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {citation.metadata?.recordName || 'Document'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {webUrl && (
                  <Button
                    onClick={() => window.open(webUrl, '_blank', 'noopener,noreferrer')}
                    size="icon"
                    variant="ghost"
                    className={cn(
                      'h-8 w-8 text-primary hover:bg-primary/10',
                      'dark:hover:bg-primary/20'
                    )}
                    aria-label="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}

                {extension && isDocViewable(extension) && (
                  <Button
                    size="sm"
                    onClick={handleOpenPdf}
                    variant="default"
                    className="flex-shrink-0"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                )}
              </div>
            </div>

            {/* Document Metadata */}
            <div className="flex flex-wrap gap-1.5">
              {pageNumber && (
                <Badge variant="outline" className="text-xs font-medium">
                  {`Page ${pageNumber}`}
                </Badge>
              )}
              {sheetName && extension && ['xlsx', 'csv', 'xls'].includes(extension) && (
                <Badge variant="outline" className="text-xs font-medium">
                  {sheetName}
                </Badge>
              )}
              {extension && ['xlsx', 'csv', 'xls'].includes(extension) && blockNumber && (
                <Badge variant="outline" className="text-xs font-medium">
                  {`Row ${extension === 'csv' ? blockNumber + 1 : blockNumber}`}
                </Badge>
              )}
              {extension && (
                <Badge variant="outline" className="text-xs font-medium">
                  {extension.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* Citation Content */}
            <div className="text-xs leading-relaxed text-foreground italic border-l-2 border-primary bg-primary/10 rounded-r-md pl-4 pr-4 py-3">
              {citation?.content || 'No content available.'}
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default CitationHoverCard;
