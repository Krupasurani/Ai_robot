import type { Record } from 'src/types/chat-message';
import type { CustomCitation } from 'src/types/chat-bot';

import React, { useMemo, useState, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Eye,
  ExternalLink,
  Folder,
  FileText,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { getFileIcon } from '../../../knowledgebase/utils/file-icon';

import { useConnectors } from '../../../accountdetails/connectors/context';

const viewableExtensions = [
  'pdf',
  'xlsx',
  'xls',
  'csv',
  'docx',
  'html',
  'txt',
  'md',
  'mdx',
  'ppt',
  'pptx',
];

interface FileInfo {
  recordId: string;
  recordName: string;
  extension: string;
  webUrl?: string;
  citationCount: number;
  citation: CustomCitation;
  connector: string;
}

interface SourcesAndCitationsProps {
  citations: CustomCitation[];
  aggregatedCitations: { [key: string]: CustomCitation[] };
  onRecordClick: (record: Record) => void;
  onViewPdf: (
    url: string,
    citation: CustomCitation,
    citations: CustomCitation[],
    isExcelFile?: boolean,
    buffer?: ArrayBuffer
  ) => Promise<void>;
  className?: string;
}

const isDocViewable = (extension: string): boolean => {
  if (!extension) return false;
  return viewableExtensions.includes(extension?.toLowerCase());
};

// Clean file card with optimal UX and appealing design
const FileCard = React.memo(
  ({
    file,
    onViewDocument,
    onViewCitations,
    onViewRecord,
    connectorData,
  }: {
    file: FileInfo;
    onViewDocument: (file: FileInfo) => void;
    onViewCitations: (file: FileInfo) => void;
    onViewRecord: (file: FileInfo) => void;
    connectorData: { [key: string]: { iconPath: string; color?: string } };
  }) => {
    // Get connector info from dynamic data
    const connectorInfo = connectorData[file.connector?.toUpperCase()] || {
      iconPath: '/assets/icons/connectors/default.svg',
    };

    const FileIcon = getFileIcon(file.extension || '', '', '');

    return (
      <div
        className={cn(
          'p-3 mb-2 rounded-md border border-border bg-card/50',
          'transition-all duration-200 cursor-pointer',
          'hover:border-border/60 hover:bg-card'
        )}
        onClick={() => {
          if (file.extension) {
            onViewCitations(file);
          }
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && file.extension) {
            e.preventDefault();
            onViewCitations(file);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="pl-2 border-l-2 border-green-500 rounded-sm">
          {/* Main Content Area */}
          <div className="flex items-start gap-3">
            {/* File Icon */}
            <div className="flex-shrink-0 flex items-center justify-center mt-0.5">
              <FileIcon width={40} height={40} className="text-primary rounded-sm" />
            </div>

            {/* File Information - Takes most space */}
            <div className="flex-1 min-w-0">
              <h3
                className="text-sm font-semibold text-foreground mb-1 overflow-hidden text-ellipsis whitespace-nowrap leading-tight"
                title={file.recordName}
              >
                {file.recordName}
              </h3>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {file.extension}
                </span>

                {file.citationCount > 1 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground font-normal">
                      {file.citationCount} citations
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Connector Icon */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                className="cursor-pointer flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(file.webUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                <img
                  src={connectorInfo.iconPath}
                  alt={file.connector || 'UPLOAD'}
                  width={16}
                  height={16}
                  className="object-contain rounded-sm"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/icons/connectors/default.svg';
                  }}
                />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {file.connector || 'UPLOAD'}
                </span>
              </button>
            </div>
          </div>

          {/* Action Buttons - Moved below and made responsive */}
          <div className="mt-2 flex flex-wrap gap-2 justify-end">
            {file.extension && isDocViewable(file.extension) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewCitations(file);
                }}
                className="h-7 text-xs font-medium rounded-md px-3"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                View Citations
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onViewRecord(file);
              }}
              className="h-7 text-xs font-medium rounded-md px-3"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Details
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

FileCard.displayName = 'FileCard';

const SourcesAndCitations: React.FC<SourcesAndCitationsProps> = ({
  citations,
  aggregatedCitations,
  onRecordClick,
  onViewPdf,
  className,
}) => {
  const [isFilesExpanded, setIsFilesExpanded] = useState(false);
  const [isCitationsExpanded, setIsCitationsExpanded] = useState(false);

  // Get connector data from the hook
  const { activeConnectors } = useConnectors();

  // Create connector data map for easy lookup
  const connectorData = useMemo(() => {
    const allConnectors = [...activeConnectors];
    const data: { [key: string]: { iconPath: string; color?: string } } = {};
    allConnectors.forEach((connector) => {
      data[connector.name.toUpperCase()] = {
        iconPath: connector.iconPath || '/assets/icons/connectors/default.svg',
      };
    });

    // Add UPLOAD connector for local files
    data.UPLOAD = {
      iconPath: '/assets/icons/connectors/kb.svg',
    };

    return data;
  }, [activeConnectors]);

  // Group citations by recordId to get unique files
  const uniqueFiles = useMemo((): FileInfo[] => {
    const fileMap = new Map<string, FileInfo>();

    citations.forEach((citation) => {
      const recordId = citation.metadata?.recordId;
      if (recordId && !fileMap.has(recordId)) {
        fileMap.set(recordId, {
          recordId,
          recordName: citation.metadata?.recordName || 'Unknown Document',
          extension: citation.metadata?.extension,
          webUrl: citation.metadata?.webUrl,
          citationCount: aggregatedCitations[recordId]?.length || 1,
          citation,
          connector: citation.metadata?.connector,
        });
      }
    });

    return Array.from(fileMap.values());
  }, [citations, aggregatedCitations]);

  const handleViewDocument = useCallback((file: FileInfo) => {
    if (file.webUrl) {
      window.open(file.webUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleViewCitations = useCallback(
    (file: FileInfo) => {
      const recordCitations = aggregatedCitations[file.recordId] || [file.citation];
      onViewPdf('', file.citation, recordCitations, false);
    },
    [aggregatedCitations, onViewPdf]
  );

  const handleViewRecord = useCallback(
    (file: FileInfo) => {
      if (file.extension) {
        onRecordClick({
          recordId: file.recordId,
          citations: aggregatedCitations[file.recordId] || [],
        });
      }
    },
    [onRecordClick, aggregatedCitations]
  );

  const handleViewCitationsFromList = useCallback(
    async (recordId: string): Promise<void> =>
      new Promise<void>((resolve) => {
        const recordCitations = aggregatedCitations[recordId] || [];
        if (recordCitations.length > 0) {
          const citation = recordCitations[0];
          onViewPdf('', citation, recordCitations, false);
          resolve();
        }
      }),
    [aggregatedCitations, onViewPdf]
  );

  // Don't render if no citations
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className={cn('mt-6', className)}>
      {/* Compact Side by Side Buttons */}
      <div className="mb-4 flex flex-wrap gap-2 justify-start md:justify-end">
        {/* Source Files Button */}
        {uniqueFiles.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilesExpanded(!isFilesExpanded)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-2 h-auto',
              'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
              'hover:bg-green-500/15 hover:border-green-500/40',
              'backdrop-blur-sm shadow-sm'
            )}
          >
            <Folder className="h-4 w-4" />
            <span className="text-xs font-semibold">
              {uniqueFiles.length === 1 ? 'Source' : 'Sources'}
            </span>
            <Badge
              variant="secondary"
              className="ml-1 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-green-500/20 text-green-700 dark:text-green-300"
            >
              {uniqueFiles.length}
            </Badge>
            {isFilesExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        )}

        {/* Citations Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCitationsExpanded(!isCitationsExpanded)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-4 py-2 h-auto',
            'bg-primary/10 border-primary/30 text-primary',
            'hover:bg-primary/15 hover:border-primary/40',
            'backdrop-blur-sm shadow-sm'
          )}
        >
          {isCitationsExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <span className="text-xs font-semibold">
            {citations.length === 1 ? 'Citation' : 'Citations'}
          </span>
          <Badge
            variant="secondary"
            className="ml-1 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-primary/20 text-primary"
          >
            {citations.length}
          </Badge>
        </Button>
      </div>

      {/* File Sources Section */}
      {uniqueFiles.length > 0 && (
        <Collapsible open={isFilesExpanded}>
          <CollapsibleContent>
            <div className="mb-4">
              {uniqueFiles.map((file) => (
                <FileCard
                  key={file.recordId}
                  file={file}
                  connectorData={connectorData}
                  onViewDocument={handleViewDocument}
                  onViewCitations={handleViewCitations}
                  onViewRecord={handleViewRecord}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Citations Section */}
      <Collapsible open={isCitationsExpanded}>
        <CollapsibleContent>
          <div className="mb-4">
            {citations.map((citation, cidx) => {
              // const CitationFileIcon = getFileIcon(citation.metadata?.extension || '', '', '');
              return (
                <div
                  key={cidx}
                  className={cn(
                    'p-4 mb-2 rounded-md border border-border bg-card/50',
                    'transition-all duration-200',
                    'hover:border-border/60 hover:bg-card'
                  )}
                >
                  <div className="pl-3 border-l-2 border-primary rounded-sm">
                    <p className="text-sm leading-relaxed text-foreground/85 mb-3 font-normal">
                      {citation.metadata?.blockText &&
                      citation.metadata?.extension === 'pdf' &&
                      typeof citation.metadata?.blockText === 'string' &&
                      citation.metadata?.blockText.length > 0
                        ? citation.metadata?.blockText
                        : citation.content}
                    </p>

                    {citation.metadata?.recordId && (
                      <div className="flex items-center gap-2 justify-end">
                        {citation.metadata.extension &&
                          isDocViewable(citation.metadata.extension) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleViewCitationsFromList(citation.metadata?.recordId)
                              }
                              className="h-7 text-xs font-medium rounded-md px-3"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              View
                            </Button>
                          )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (citation.metadata?.recordId) {
                              onRecordClick({
                                ...citation.metadata,
                                citations: [],
                              });
                            }
                          }}
                          className="h-7 text-xs font-medium rounded-md px-3"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          Details
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Minimal Hide Controls */}
      {(isFilesExpanded || isCitationsExpanded) && (
        <div className="mt-4 flex items-center gap-2 justify-center">
          {isFilesExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFilesExpanded(false)}
              className="h-7 text-xs font-medium rounded-md px-3 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/15"
            >
              <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
              Hide Sources
            </Button>
          )}

          {isCitationsExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCitationsExpanded(false)}
              className="h-7 text-xs font-medium rounded-md px-3 bg-primary/10 text-primary hover:bg-primary/15"
            >
              <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
              Hide citations
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

SourcesAndCitations.displayName = 'SourcesAndCitations';

export default SourcesAndCitations;
