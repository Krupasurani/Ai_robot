import type { CustomCitation, FormattedMessage } from 'src/types/chat-bot';
import type {
  ChatAnswer,
  RichTextChunk,
  ChatAnswerBlock,
  ChatAnswerSource,
  ChatAnswerCitation,
  ChatAnswerSourceType,
} from '@/types/chat-answer';

type CitationLookup = Record<
  string,
  {
    citation: CustomCitation;
    recordCitations: CustomCitation[];
    sourceId: string;
  }
>;

export type BuildChatAnswerResult = {
  answer: ChatAnswer;
  citationLookup: CitationLookup;
  aggregatedCitations: Record<string, CustomCitation[]>;
  sourcesById: Record<string, ChatAnswerSource>;
  citationNumberMap: Record<number, string>;
};

type BuildChatAnswerOptions = {
  contentOverride?: string;
  citationsOverride?: CustomCitation[];
  thinkingOverride?: string;
  toolCallsOverride?: NonNullable<ChatAnswer['toolCalls']>;
  webSourcesOverride?: NonNullable<ChatAnswer['webSources']>;
};

const CITATION_REGEX = /\[(R?\d+(?:-\d+)?)\]/g;

const SOURCE_TYPE_FALLBACK: ChatAnswerSourceType = 'kb';

const TEXT_CHUNK = (text: string, citationIds?: string[]): RichTextChunk | null => {
  if (!text) return null;
  if (citationIds?.length) {
    return { type: 'text', text, citationIds };
  }
  return { type: 'text', text };
};

const getHighlightStartIndex = (content: string): number => {
  const newlineIndex = content.lastIndexOf('\n');
  if (newlineIndex >= 0) {
    const remainder = content.slice(newlineIndex + 1);
    if (remainder.trim().length > 1) {
      return newlineIndex + 1;
    }
  }

  const punctuation = ['.', '!', '?', ';', ':'];
  for (let i = content.length - 1; i >= 0; i -= 1) {
    if (punctuation.includes(content[i])) {
      const remainder = content.slice(i + 1);
      if (remainder.trim().length > 1) {
        return i + 1;
      }
    }
  }

  const dashIndex = content.lastIndexOf(' - ');
  if (dashIndex >= 0) {
    const remainder = content.slice(dashIndex + 2);
    if (remainder.trim().length > 1) {
      return dashIndex + 2;
    }
  }

  const longDashIndex = content.lastIndexOf(' – ');
  if (longDashIndex >= 0) {
    const remainder = content.slice(longDashIndex + 2);
    if (remainder.trim().length > 1) {
      return longDashIndex + 2;
    }
  }

  return 0;
};

const attachCitationToPreviousChunk = (
  chunks: RichTextChunk[],
  citationId: string
): void => {
  const lastChunk = chunks[chunks.length - 1];
  if (lastChunk && lastChunk.type === 'text') {
    const ids = lastChunk.citationIds ?? [];
    lastChunk.citationIds = [...ids, citationId];
    return;
  }
  chunks.push({ type: 'citation', citationId });
};

const pushSegmentWithCitation = (
  chunks: RichTextChunk[],
  segment: string,
  citationId: string
): void => {
  if (!segment) {
    attachCitationToPreviousChunk(chunks, citationId);
    return;
  }

  const leadingWhitespaceMatch = segment.match(/^\s+/);
  const leadingWhitespace = leadingWhitespaceMatch?.[0] ?? '';

  const trailingWhitespaceMatch = segment.match(/\s+$/);
  const trailingWhitespace = trailingWhitespaceMatch?.[0] ?? '';

  const start = leadingWhitespace.length;
  const end = Math.max(segment.length - trailingWhitespace.length, start);
  const content = segment.slice(start, end);

  if (leadingWhitespace) {
    const node = TEXT_CHUNK(leadingWhitespace);
    if (node) chunks.push(node);
  }

  if (content) {
    const highlightStartIndex = getHighlightStartIndex(content);
    const beforeHighlight = content.slice(0, highlightStartIndex);
    if (beforeHighlight) {
      const node = TEXT_CHUNK(beforeHighlight);
      if (node) chunks.push(node);
    }

    let highlightText = content.slice(highlightStartIndex);
    const highlightLeadingWhitespaceMatch = highlightText.match(/^\s+/);
    if (highlightLeadingWhitespaceMatch) {
      const node = TEXT_CHUNK(highlightLeadingWhitespaceMatch[0]);
      if (node) chunks.push(node);
      highlightText = highlightText.slice(highlightLeadingWhitespaceMatch[0].length);
    }

    if (highlightText) {
      const node = TEXT_CHUNK(highlightText, [citationId]);
      if (node) {
        chunks.push(node);
      }
    } else {
      attachCitationToPreviousChunk(chunks, citationId);
    }
  } else {
    attachCitationToPreviousChunk(chunks, citationId);
  }

  if (trailingWhitespace) {
    const node = TEXT_CHUNK(trailingWhitespace);
    if (node) chunks.push(node);
  }
};

export const parseRichTextChunks = (
  text: string,
  citationNumberMap: Record<number, string>
): RichTextChunk[] => {
  if (!text) return [];

  CITATION_REGEX.lastIndex = 0;
  const chunks: RichTextChunk[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = CITATION_REGEX.exec(text);

  while (match !== null) {
    const matchIndex = match.index ?? 0;
    const segment = text.slice(lastIndex, matchIndex);
    const rawMarker = match[1];
    const numericPortion = rawMarker?.match(/\d+/)?.[0];
    const citationNumber = numericPortion ? Number(numericPortion) : Number.NaN;

    if (!Number.isNaN(citationNumber)) {
      const citationId = citationNumberMap[citationNumber];
      if (citationId) {
        if (segment) {
          pushSegmentWithCitation(chunks, segment, citationId);
        } else {
          attachCitationToPreviousChunk(chunks, citationId);
        }
      } else {
        const node = TEXT_CHUNK(segment + match[0]);
        if (node) chunks.push(node);
      }
    } else {
      const node = TEXT_CHUNK(segment + match[0]);
      if (node) chunks.push(node);
    }

    ({ lastIndex } = CITATION_REGEX);
    match = CITATION_REGEX.exec(text);
  }

  if (lastIndex < text.length) {
    const node = TEXT_CHUNK(text.slice(lastIndex));
    if (node) chunks.push(node);
  }

  return chunks;
};

const formatOriginLabel = (origin?: string, connector?: string): string | undefined => {
  const source = origin || connector;
  if (!source) return undefined;

  return source
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const detectSourceType = (metadata?: CustomCitation['metadata']): ChatAnswerSourceType => {
  if (!metadata) return SOURCE_TYPE_FALLBACK;

  const extension = metadata.extension?.toLowerCase();
  const origin = metadata.origin?.toLowerCase();

  if (origin?.includes('sharepoint')) return 'sharepoint';
  if (origin?.includes('email')) return 'email';
  if (origin?.includes('kb')) return 'kb';
  if (origin?.includes('web')) return 'web';

  if (metadata.webUrl) return 'web';
  if (extension === 'pdf') return 'pdf';
  if (extension && ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'md'].includes(extension)) {
    return 'doc';
  }

  return SOURCE_TYPE_FALLBACK;
};

const buildBlocksFromContent = (
  content: string,
  citationNumberMap: Record<number, string>
): ChatAnswerBlock[] => {
  if (!content) return [];

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ChatAnswerBlock[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let currentListType: 'ordered' | 'unordered' | null = null;

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const text = paragraphBuffer.join(' ').trim();
    paragraphBuffer = [];
    if (!text) return;
    blocks.push({
      type: 'paragraph',
      content: parseRichTextChunks(text, citationNumberMap),
    });
  };

  const flushList = () => {
    if (!listBuffer.length) return;
    blocks.push({
      type: 'list',
      ordered: currentListType === 'ordered',
      items: listBuffer.map((item) => parseRichTextChunks(item.trim(), citationNumberMap)),
    });
    listBuffer = [];
    currentListType = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (currentListType && currentListType !== 'ordered') flushList();
      currentListType = 'ordered';
      listBuffer.push(orderedMatch[2]);
      return;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (currentListType && currentListType !== 'unordered') flushList();
      currentListType = 'unordered';
      listBuffer.push(unorderedMatch[1]);
      return;
    }

    flushList();
    paragraphBuffer.push(trimmed);
  });

  flushParagraph();
  flushList();

  return blocks;
};

const mapConfidenceToImportance = (
  confidence?: string
): ChatAnswer['importance'] | undefined => {
  if (!confidence) return undefined;
  const normalized = confidence.toLowerCase();
  if (normalized.includes('very')) return 'very-high';
  if (normalized.includes('high')) return 'high';
  if (normalized.includes('medium')) return 'medium';
  if (normalized.includes('low')) return 'low';
  return undefined;
};

const normalizeContent = (content: string): string =>
  content.replace(/\r\n/g, '\n').trim();

export const buildChatAnswer = (
  message: FormattedMessage,
  { contentOverride, citationsOverride, thinkingOverride, toolCallsOverride, webSourcesOverride }: BuildChatAnswerOptions = {}
): BuildChatAnswerResult => {
  const rawContent = normalizeContent(contentOverride ?? message.content ?? '');
  const citations = citationsOverride ?? message.citations ?? [];
  const thinking = thinkingOverride ?? message.thinking;
  const toolCalls = toolCallsOverride ?? message.toolCalls;
  const webSources = webSourcesOverride ?? message.webSources;

  const aggregatedCitations = citations.reduce<Record<string, CustomCitation[]>>((acc, citation, index) => {
    const recordId =
      citation.metadata?.recordId ||
      citation.metadata?._id ||
      citation._id ||
      citation.id ||
      `source-${index}`;
    if (!acc[recordId]) {
      acc[recordId] = [];
    }
    acc[recordId].push(citation);
    return acc;
  }, {});

  const sourcesById: Record<string, ChatAnswerSource> = {};
  const sources: ChatAnswerSource[] = [];

  Object.entries(aggregatedCitations).forEach(([recordId, recordCitations]) => {
    const primaryCitation = recordCitations[0];
    const metadata = primaryCitation?.metadata;
    const label =
      metadata?.recordName ||
      metadata?.origin ||
      metadata?.connector ||
      `Quelle ${sources.length + 1}`;
    const sourceType = detectSourceType(metadata);
    const originLabel = formatOriginLabel(metadata?.origin, metadata?.connector);

    const source: ChatAnswerSource = {
      id: recordId,
      label,
      type: sourceType,
      originLabel,
      iconHint: sourceType,
      citationCount: recordCitations.length,
      url: metadata?.webUrl,
    };
    sources.push(source);
    sourcesById[recordId] = source;
  });

  const citationNumberMap: Record<number, string> = {};
  const citationLookup: CitationLookup = {};
  const answerCitations: ChatAnswerCitation[] = [];

  citations.forEach((citation, index) => {
    const citationNumber = citation.chunkIndex ?? index + 1;
    if (citationNumberMap[citationNumber]) return;

    const sourceId =
      citation.metadata?.recordId ||
      citation.metadata?._id ||
      citation._id ||
      citation.id ||
      `source-${citationNumber}`;
    const citationId = `citation-${citationNumber}`;
    citationNumberMap[citationNumber] = citationId;

    const recordCitations = aggregatedCitations[sourceId] || [];
    citationLookup[citationId] = {
      citation,
      recordCitations,
      sourceId,
    };

    answerCitations.push({
      id: citationId,
      sourceId,
      snippet: citation.content || citation.metadata?.blockText || '',
      page: citation.metadata?.pageNum?.[0],
    });
  });

  const blocks = buildBlocksFromContent(rawContent, citationNumberMap);
  const createdAt =
    message.createdAt instanceof Date
      ? message.createdAt.toISOString()
      : new Date(message.createdAt).toISOString();

  const answer: ChatAnswer = {
    id: message.id,
    importance: mapConfidenceToImportance(message.confidence),
    createdAt,
    blocks,
    citations: answerCitations,
    sources,
    followUps: message.followUpQuestions?.length ? message.followUpQuestions : undefined,
    rawContent,
    thinking,
    toolCalls,
    webSources,
  };

  return {
    answer,
    citationLookup,
    aggregatedCitations,
    sourcesById,
    citationNumberMap,
  };
};

export const formatRelativeTime = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffMinutes < 60 * 24 && date.getDate() === now.getDate()) {
    return `Today · ${timeFormatter.format(date)}`;
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
    return `Yesterday · ${timeFormatter.format(date)}`;
  }

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
};
