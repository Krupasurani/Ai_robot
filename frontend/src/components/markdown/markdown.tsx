import './styles.css';

import type { Options } from 'react-markdown';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

import { useMemo } from 'react';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';

import { isExternalLink } from 'src/routes/utils';
import { RouterLink } from 'src/routes/components';

import { cn } from '@/utils/cn';
import { Image } from '@/components/custom/image';
import { htmlToMarkdown, isMarkdownContent } from './html-to-markdown';

import type { MarkdownProps } from './types';

export function Markdown({ children, className, ...other }: MarkdownProps) {
  const content = useMemo(() => {
    if (isMarkdownContent(`${children}`)) {
      return children;
    }
    return htmlToMarkdown(`${children}`.trim());
  }, [children]);

  return (
    <ReactMarkdown
      children={content}
      components={components as Options['components']}
      rehypePlugins={rehypePlugins as Options['rehypePlugins']}
      className={cn('markdown-root', className)}
      {...other}
    />
  );
}

// ----------------------------------------------------------------------

type ComponentTag = {
  [key: string]: any;
};

const rehypePlugins = [rehypeRaw, rehypeHighlight, [remarkGfm, { singleTilde: false }]];

const components = {
  img: ({ ...other }: ComponentTag) => (
    <Image
      ratio="16/9"
      className="markdown-image w-full h-auto max-w-full mx-auto my-5 rounded-md"
      {...other}
    />
  ),
  a: ({ href, children, ...other }: ComponentTag) => {
    const linkProps = isExternalLink(href)
      ? { target: '_blank', rel: 'noopener' }
      : { component: RouterLink };

    return (
      <Link
        {...linkProps}
        to={href}
        className="markdown-link text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
        {...other}
      >
        {children}
      </Link>
    );
  },
  pre: ({ children }: ComponentTag) => (
    <div className="markdown-code-block relative">
      <pre className="markdown-pre overflow-x-auto p-4 rounded-lg bg-muted font-mono text-sm text-foreground">
        {children}
      </pre>
    </div>
  ),
  code({ className, children, ...other }: ComponentTag) {
    const language = /language-(\w+)/.exec(className || '');

    return language ? (
      <code {...other} className={className}>
        {children}
      </code>
    ) : (
      <code
        {...other}
        className="markdown-code-inline px-1 py-0.5 text-sm rounded bg-muted text-foreground font-mono"
      >
        {children}
      </code>
    );
  },
};
