export type ChatAnswerImportance = 'low' | 'medium' | 'high' | 'very-high';

export type RichTextChunk =
  | { type: 'text'; text: string; citationIds?: string[] }
  | { type: 'citation'; citationId: string; text?: string };

export type ChatAnswerBlock =
  | { type: 'paragraph'; content: RichTextChunk[] }
  | { type: 'list'; ordered?: boolean; items: RichTextChunk[][] };

export type ChatAnswerCitation = {
  id: string;
  sourceId: string;
  snippet: string;
  page?: number;
};

export type ChatAnswerSourceType = 'pdf' | 'doc' | 'web' | 'sharepoint' | 'email' | 'kb';

export type ChatAnswerSource = {
  id: string;
  label: string;
  type: ChatAnswerSourceType;
  originLabel?: string;
  iconHint?: string;
  citationCount: number;
  url?: string;
};

export type ChatAnswer = {
  id: string;
  title?: string;
  importance?: ChatAnswerImportance;
  createdAt: string;
  blocks: ChatAnswerBlock[];
  citations: ChatAnswerCitation[];
  sources: ChatAnswerSource[];
  followUps?: string[];
  /**
   * Preserves the raw markdown so we can render complex structures (tables, code blocks) until the backend delivers structured blocks.
   */
  rawContent?: string;
  thinking?: string;
  toolCalls?: {
    id: string;
    name: string;
    args: any;
    status: 'running' | 'completed' | 'failed';
    result?: any;
  }[];
  webSources?: {
    id: number | string;
    title: string;
    url?: string;
    snippet?: string;
    domain?: string;
  }[];
};
