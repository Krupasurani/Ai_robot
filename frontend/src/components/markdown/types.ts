import type { Options } from 'react-markdown';

export interface MarkdownProps extends Options {
  asHtml?: boolean;
  className?: string;
}
