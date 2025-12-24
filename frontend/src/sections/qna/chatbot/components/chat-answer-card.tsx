import type {
  ChatAnswer,
  RichTextChunk,
  ChatAnswerSource,
  ChatAnswerCitation,
} from '@/types/chat-answer';

import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import React, { Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Mail,
  Copy,
  Globe,
  Cloud,
  Folder,
  FileText,
  Download,
  RefreshCcw,
  ChevronDown,
  Brain,
  Wrench,
} from 'lucide-react';

import { parseRichTextChunks } from '../utils/chat-answer';

type InlineParagraphProps = {
  chunks: RichTextChunk[];
  citationsById: Record<string, ChatAnswerCitation>;
  sourcesById: Record<string, ChatAnswerSource>;
  onCitationOpen: (citationId: string) => void;
  onSourceOpen: (sourceId: string, citationId?: string) => void;
};

type MarkdownFallbackProps = Omit<InlineParagraphProps, 'chunks'> & {
  content: string;
};

type CitationPopoverProps = {
  citations: ChatAnswerCitation[];
  sourcesById: Record<string, ChatAnswerSource>;
  onOpenSource: (sourceId: string, citationId?: string) => void;
  children: React.ReactNode;
};

export type ChatAnswerCardProps = {
  answer: ChatAnswer;
  sourcesById: Record<string, ChatAnswerSource>;
  citationsById: Record<string, ChatAnswerCitation>;
  onCitationOpen: (citationId: string) => void;
  onSourceOpen: (sourceId: string, citationId?: string) => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
  canRegenerate?: boolean;
  followUpAction?: (text: string) => void;
  renderFeedback?: () => React.ReactNode;
  extraActions?: React.ReactNode;
};

const SourceIcon = ({ type }: { type?: ChatAnswerSource['type'] }) => {
  const iconProps = { className: 'h-3.5 w-3.5' };
  switch (type) {
    case 'pdf':
      return <FileText {...iconProps} />;
    case 'doc':
      return <FileText {...iconProps} />;
    case 'web':
      return <Globe {...iconProps} />;
    case 'sharepoint':
      return <Cloud {...iconProps} />;
    case 'email':
      return <Mail {...iconProps} />;
    case 'kb':
    default:
      return <Folder {...iconProps} />;
  }
};

const CitationPopover = ({
  citations,
  sourcesById,
  onOpenSource,
  children,
}: CitationPopoverProps) => (
  <HoverCard openDelay={150} closeDelay={80}>
    <HoverCardTrigger asChild>{children}</HoverCardTrigger>
    <HoverCardContent className="w-80 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl">
      <div className="space-y-3">
        {citations.map((citation) => {
          const source = sourcesById[citation.sourceId];
          return (
            <div
              key={citation.id}
              className="space-y-2 rounded-xl border border-border/60 bg-background/80 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <SourceIcon type={source?.type ?? 'kb'} />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-semibold text-foreground line-clamp-1">
                    {source?.label ?? 'Quelle'}
                  </p>
                  {(source?.originLabel || source?.type) && (
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {source?.originLabel ?? source?.type}
                    </p>
                  )}
                </div>
                {citation.page && (
                  <span className="text-[11px] text-muted-foreground">S. {citation.page}</span>
                )}
              </div>
              {citation.snippet && (
                <p className="text-xs leading-5 text-muted-foreground line-clamp-3">
                  {citation.snippet}
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => onOpenSource(citation.sourceId, citation.id)}
                >
                  Öffnen
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </HoverCardContent>
  </HoverCard>
);

const InlineCitation = ({
  citation,
  sourcesById,
  onCitationOpen,
  onSourceOpen,
}: {
  citation: ChatAnswerCitation;
  sourcesById: Record<string, ChatAnswerSource>;
  onCitationOpen: (citationId: string) => void;
  onSourceOpen: (sourceId: string, citationId?: string) => void;
}) => {
  const source = sourcesById[citation.sourceId];
  const citationNumber = citation.id.replace('citation-', '');
  const ariaLabel = source?.label ? `Quelle ${source.label}` : `Quelle ${citationNumber}`;

  return (
    <CitationPopover citations={[citation]} sourcesById={sourcesById} onOpenSource={onSourceOpen}>
      <button
        type="button"
        aria-label={ariaLabel}
        className="ml-1 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        onClick={(event) => {
          event.stopPropagation();
          onCitationOpen(citation.id);
        }}
      >
        <span
          aria-hidden="true"
          className="text-[10px] uppercase tracking-wide text-muted-foreground/70"
        >
          Ref
        </span>
        <span aria-hidden="true" className="text-xs font-semibold text-foreground">
          [{citationNumber}]
        </span>
        <span className="sr-only">{ariaLabel}</span>
      </button>
    </CitationPopover>
  );
};

const InlineCitationSegment = ({
  text,
  citationIds,
  citationsById,
  sourcesById,
  onCitationOpen,
  onSourceOpen,
}: {
  text: string;
  citationIds: string[];
  citationsById: Record<string, ChatAnswerCitation>;
  sourcesById: Record<string, ChatAnswerSource>;
  onCitationOpen: (citationId: string) => void;
  onSourceOpen: (sourceId: string, citationId?: string) => void;
}) => {
  const citationEntries = citationIds
    .map((citationId) => citationsById[citationId])
    .filter((entry): entry is ChatAnswerCitation => Boolean(entry));

  if (!citationEntries.length) {
    return <>{text}</>;
  }

  return (
    <>
      <span className="whitespace-pre-wrap">{text}</span>
      {citationEntries.map((citation) => (
        <InlineCitation
          key={citation.id}
          citation={citation}
          sourcesById={sourcesById}
          onCitationOpen={onCitationOpen}
          onSourceOpen={onSourceOpen}
        />
      ))}
    </>
  );
};

const InlineParagraph = ({
  chunks,
  citationsById,
  sourcesById,
  onCitationOpen,
  onSourceOpen,
}: InlineParagraphProps) => (
  <p className="text-[15px] leading-7 text-foreground">
    {chunks.map((chunk, index) => {
      if (chunk.type === 'text') {
        if (chunk.citationIds?.length) {
          return (
            <InlineCitationSegment
              key={`chunk-${index}`}
              text={chunk.text}
              citationIds={chunk.citationIds}
              citationsById={citationsById}
              sourcesById={sourcesById}
              onCitationOpen={onCitationOpen}
              onSourceOpen={onSourceOpen}
            />
          );
        }
        return <Fragment key={`chunk-${index}`}>{chunk.text}</Fragment>;
      }

      const citation = citationsById[chunk.citationId];
      if (!citation) {
        return (
          <Fragment key={`chunk-${index}`}>[{chunk.citationId.replace('citation-', '')}]</Fragment>
        );
      }
      return (
        <InlineCitation
          key={`citation-${chunk.citationId}`}
          citation={citation}
          sourcesById={sourcesById}
          onCitationOpen={onCitationOpen}
          onSourceOpen={onSourceOpen}
        />
      );
    })}
  </p>
);

const MarkdownFallback = ({
  content,
  citationsById,
  sourcesById,
  onCitationOpen,
  onSourceOpen,
}: MarkdownFallbackProps) => {
  const handleImageCopy = async (src: string) => {
    if (!src) return;
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success('Bild kopiert');
    } catch (error) {
      console.error('Failed to copy image', error);
      toast.error('Bild konnte nicht kopiert werden');
    }
  };

  const handleImageDownload = (src: string) => {
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    link.download = `chat-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download gestartet');
  };

  const citationNumberMap = React.useMemo(() => {
    const entries = Object.keys(citationsById);
    return entries.reduce<Record<number, string>>((acc, citationId) => {
      const match = citationId.match(/citation-(\d+)/);
      if (match) {
        acc[Number(match[1])] = citationId;
      }
      return acc;
    }, {});
  }, [citationsById]);

  const renderTextWithSegments = (text: string, keyPrefix: string) => {
    const chunks = parseRichTextChunks(text, citationNumberMap);
    return chunks.map((chunk, chunkIndex) => {
      if (chunk.type === 'text') {
        if (chunk.citationIds?.length) {
          return (
            <InlineCitationSegment
              key={`${keyPrefix}-segment-${chunkIndex}`}
              text={chunk.text}
              citationIds={chunk.citationIds}
              citationsById={citationsById}
              sourcesById={sourcesById}
              onCitationOpen={onCitationOpen}
              onSourceOpen={onSourceOpen}
            />
          );
        }
        return <Fragment key={`${keyPrefix}-text-${chunkIndex}`}>{chunk.text}</Fragment>;
      }
      const citation = citationsById[chunk.citationId];
      if (!citation) {
        return <Fragment key={`${keyPrefix}-fallback-${chunkIndex}`}>{chunk.text ?? ''}</Fragment>;
      }
      return (
        <InlineCitation
          key={`${keyPrefix}-citation-${chunkIndex}`}
          citation={citation}
          sourcesById={sourcesById}
          onCitationOpen={onCitationOpen}
          onSourceOpen={onSourceOpen}
        />
      );
    });
  };

  return (
    <ReactMarkdown
      className="prose max-w-none text-[15px] text-foreground prose-headings:text-foreground [&>p]:mt-0 [&>p]:mb-3"
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => {
          const processedChildren = React.Children.toArray(children).flatMap(
            (child, childIndex) => {
              if (typeof child === 'string') {
                return renderTextWithSegments(child, `md-text-${childIndex}`);
              }
              return child;
            }
          );
          return <div className="text-[15px] leading-7">{processedChildren}</div>;
        },
        img: ({ src, alt }) => (
          <div className="relative inline-block w-full max-w-full group">
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleImageCopy(src || '')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleImageCopy(src || '');
                }
              }}
              className="cursor-pointer"
            >
              <img
                src={src}
                alt={alt}
                className="mx-auto max-h-[512px] w-full rounded-lg border border-border object-contain"
              />
            </div>
            <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 rounded-full p-0"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleImageDownload(src || '');
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const ChatAnswerBody = ({
  answer,
  citationsById,
  sourcesById,
  onCitationOpen,
  onSourceOpen,
}: {
  answer: ChatAnswer;
  citationsById: Record<string, ChatAnswerCitation>;
  sourcesById: Record<string, ChatAnswerSource>;
  onCitationOpen: (citationId: string) => void;
  onSourceOpen: (sourceId: string, citationId?: string) => void;
}) => {
  // Prefer rendering the raw markdown content so that rich formatting
  // (tables, bold/italic, code blocks, etc.) is always supported.
  // The MarkdownFallback still wires up citations correctly via [n] markers.
  if (answer.rawContent) {
    return (
      <MarkdownFallback
        content={answer.rawContent}
        citationsById={citationsById}
        sourcesById={sourcesById}
        onCitationOpen={onCitationOpen}
        onSourceOpen={onSourceOpen}
      />
    );
  }

  return (
    <div className="space-y-4">
      {answer.blocks.map((block, index) => {
        if (block.type === 'paragraph') {
          return (
            <InlineParagraph
              key={`block-${answer.id}-p-${index}`}
              chunks={block.content}
              citationsById={citationsById}
              sourcesById={sourcesById}
              onCitationOpen={onCitationOpen}
              onSourceOpen={onSourceOpen}
            />
          );
        }

        const listClassName = block.ordered ? 'list-decimal' : 'list-disc';
        return (
          <ul
            key={`block-${answer.id}-list-${index}`}
            className={cn('space-y-2 pl-5 text-[15px] leading-7', listClassName)}
          >
            {block.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`}>
                <InlineParagraph
                  chunks={item}
                  citationsById={citationsById}
                  sourcesById={sourcesById}
                  onCitationOpen={onCitationOpen}
                  onSourceOpen={onSourceOpen}
                />
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
};

const ChatAnswerHeader = ({ answer }: { answer: ChatAnswer }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    {answer.title && <h2 className="text-sm font-semibold text-card-foreground">{answer.title}</h2>}
  </div>
);

const formatReferenceIndices = (indices: number[]): string => {
  if (!indices.length) return '';
  if (indices.length === 1) return indices[0].toString();

  // Sort just in case
  const sorted = [...indices].sort((a, b) => a - b);

  // Check if fully consecutive
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (max - min === sorted.length - 1) {
    return `${min}-${max}`;
  }

  return sorted.join(', ');
};

const SourcePill = ({
  source,
  onSourceOpen,
  referenceIndices,
}: {
  source: ChatAnswerSource;
  onSourceOpen: (sourceId: string) => void;
  referenceIndices?: number[];
}) => {
  const indicesDisplay = referenceIndices ? formatReferenceIndices(referenceIndices) : null;

  return (
    <button
      type="button"
      className="group inline-flex items-center gap-2 rounded-md border border-border/40 bg-muted/30 hover:bg-muted/50 px-3 py-1.5 text-left text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
      onClick={() => onSourceOpen(source.id)}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-muted-foreground">
        <SourceIcon type={source.type ?? 'kb'} />
      </span>
      <span className="line-clamp-1">{source.label}</span>
      {indicesDisplay && (
        <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-muted px-1.5 text-[10px] font-medium text-foreground">
          {indicesDisplay}
        </span>
      )}
    </button>
  );
};

const ChatAnswerSourcesRow = ({
  sources,
  onSourceOpen,
  referenceIndicesBySourceId,
}: {
  sources: ChatAnswerSource[];
  onSourceOpen: (sourceId: string) => void;
  referenceIndicesBySourceId?: Record<string, number[]>;
}) => {
  if (!sources.length) return null;

  return (
    <div className="mt-4 pt-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Sources</span>
        <span className="text-muted-foreground/60">({sources.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <SourcePill
            key={source.id}
            source={source}
            onSourceOpen={onSourceOpen}
            referenceIndices={referenceIndicesBySourceId?.[source.id]}
          />
        ))}
      </div>
    </div>
  );
};

const IconButton = ({
  label,
  children,
  onClick,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const ChatAnswerActionsRow = ({
  onCopy,
  onRegenerate,
  canRegenerate,
  renderFeedback,
  extraActions,
}: {
  onCopy?: () => void;
  onRegenerate?: () => void;
  canRegenerate?: boolean;
  renderFeedback?: () => React.ReactNode;
  extraActions?: React.ReactNode;
}) => (
  <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <div className="flex items-center gap-1">
      {renderFeedback?.()}
      {onCopy && (
        <IconButton label="Copy" onClick={onCopy}>
          <Copy className="h-4 w-4" />
        </IconButton>
      )}
      {canRegenerate && onRegenerate && (
        <IconButton label="Regenerate" onClick={onRegenerate}>
          <RefreshCcw className="h-4 w-4" />
        </IconButton>
      )}
    </div>
    {extraActions}
  </div>
);

const ChatAnswerFollowUpsRow = ({
  followUps,
  onFollowUp,
}: {
  followUps?: string[];
  onFollowUp?: (text: string) => void;
}) => {
  if (!followUps?.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {followUps.map((item) => (
        <button
          key={item}
          type="button"
          className="inline-flex items-center rounded-md border border-border/40 bg-muted/30 hover:bg-muted/50 px-3 py-1.5 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          onClick={() => onFollowUp?.(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
};

const ThinkingSection = ({ content }: { content: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  if (!content) return null;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-4 rounded-lg border border-border/50 bg-muted/30 overflow-hidden"
    >
      <CollapsibleTrigger className="flex w-full items-center p-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <Brain className="mr-2 h-4 w-4" />
        Thinking Process
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border/50 bg-muted/20 p-3 pt-2 text-xs font-mono whitespace-pre-wrap text-muted-foreground/90">
          {content}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const ToolCallsSection = ({ toolCalls }: { toolCalls: NonNullable<ChatAnswer['toolCalls']> }) => {
  if (!toolCalls.length) return null;

  return (
    <div className="mb-4 space-y-2">
      {toolCalls.map((tool, idx) => (
        <div
          key={`${tool.id}-${idx}`}
          className="rounded-md border border-border/50 bg-muted/10 p-2 text-xs"
        >
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center font-semibold text-foreground">
              <Wrench className="mr-1.5 h-3 w-3" />
              {tool.name}
            </div>
            <div
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase',
                tool.status === 'running'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : tool.status === 'completed'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              {tool.status}
            </div>
          </div>
          <div className="break-all font-mono text-muted-foreground">
            {typeof tool.args === 'string' ? tool.args : JSON.stringify(tool.args)}
          </div>
          {tool.result && (
            <div className="mt-1 border-t border-border/50 pt-1 text-muted-foreground/80">
              <span className="font-semibold">Result:</span>{' '}
              {typeof tool.result === 'object' ? JSON.stringify(tool.result) : tool.result}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const WebSourcesSection = ({ sources }: { sources: NonNullable<ChatAnswer['webSources']> }) => {
  if (!sources.length) return null;

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Globe className="mr-1 h-3 w-3" /> Web Search Results
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sources.map((source, idx) => (
          <a
            key={`${source.id}-${idx}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-lg border border-border/50 bg-background/50 p-2 text-xs no-underline transition-all hover:border-border/80 hover:bg-background"
          >
            <div className="mb-1 line-clamp-1 font-medium text-foreground group-hover:text-primary">
              {source.title}
            </div>
            <div className="mb-1 line-clamp-2 text-[10px] text-muted-foreground">
              {source.snippet}
            </div>
            <div className="mt-auto flex items-center pt-1 text-[10px] text-muted-foreground/70">
              {source.domain || (source.url ? new URL(source.url).hostname : '')}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const ChatAnswerCard = ({
  answer,
  citationsById,
  sourcesById,
  onCitationOpen,
  onSourceOpen,
  onCopy,
  onRegenerate,
  canRegenerate,
  followUpAction,
  renderFeedback,
  extraActions,
}: ChatAnswerCardProps) => {
  const referenceIndicesBySourceId = React.useMemo(() => {
    const map: Record<string, number[]> = {};
    Object.values(citationsById).forEach((citation) => {
      const match = citation.id.match(/citation-(\d+)/);
      if (!match) return;
      const num = Number(match[1]);

      if (!map[citation.sourceId]) {
        map[citation.sourceId] = [];
      }

      if (!map[citation.sourceId].includes(num)) {
        map[citation.sourceId].push(num);
      }
    });
    return map;
  }, [citationsById]);

  return (
    <div className="w-full text-foreground">
      <ChatAnswerHeader answer={answer} />
      {answer.thinking && <ThinkingSection content={answer.thinking} />}
      {answer.toolCalls && answer.toolCalls.length > 0 && (
        <ToolCallsSection toolCalls={answer.toolCalls} />
      )}
      {answer.webSources && answer.webSources.length > 0 && (
        <WebSourcesSection sources={answer.webSources} />
      )}
      {/* Live workflow steps display removed - SSE events still processed on backend */}
      <ChatAnswerBody
        answer={answer}
        citationsById={citationsById}
        sourcesById={sourcesById}
        onCitationOpen={onCitationOpen}
        onSourceOpen={onSourceOpen}
      />
      <ChatAnswerSourcesRow
        sources={answer.sources}
        onSourceOpen={onSourceOpen}
        referenceIndicesBySourceId={referenceIndicesBySourceId}
      />
      <ChatAnswerActionsRow
        onCopy={onCopy}
        onRegenerate={onRegenerate}
        canRegenerate={canRegenerate}
        renderFeedback={renderFeedback}
        extraActions={extraActions}
      />
      <ChatAnswerFollowUpsRow followUps={answer.followUps} onFollowUp={followUpAction} />
    </div>
  );
};

export default ChatAnswerCard;
