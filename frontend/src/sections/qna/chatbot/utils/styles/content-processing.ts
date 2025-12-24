import type { CustomCitation } from 'src/types/chat-bot';

/**
 * Extracts citation references from content and processes them
 * Returns processed content with citations mapped by number
 */
export function extractAndProcessCitations(
  content: string,
  citations: CustomCitation[]
): {
  processedContent: string;
  citations: CustomCitation[];
  citationMap: { [key: number]: CustomCitation };
} {
  if (!content) {
    return {
      processedContent: '',
      citations: citations || [],
      citationMap: {},
    };
  }

  // Create a map of citations by chunkIndex
  const citationMap: { [key: number]: CustomCitation } = {};
  (citations || []).forEach((citation) => {
    if (citation && citation.chunkIndex != null) {
      citationMap[citation.chunkIndex] = citation;
    }
  });

  // The content already contains citation references like [1], [2], etc.
  // We just need to return it as-is with the citation map
  return {
    processedContent: content,
    citations: citations || [],
    citationMap,
  };
}

/**
 * Legacy function for processing streaming content
 * Processes content and citations for streaming messages
 */
export function processStreamingContentLegacy(
  content: string,
  citations: CustomCitation[]
): {
  processedContent: string;
  processedCitations: CustomCitation[];
} {
  if (!content) {
    return {
      processedContent: '',
      processedCitations: citations || [],
    };
  }

  // For legacy compatibility, just return content and citations as-is
  // The content processing is handled elsewhere
  return {
    processedContent: content,
    processedCitations: citations || [],
  };
}

