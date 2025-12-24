"use client";

import '@/components/markdown/code-highlight-block.css';

import hljs from 'highlight.js';
import { cn } from '@/utils/cn';
import React, { useMemo, useState, useContext, createContext } from 'react';

export type BundledLanguage = string;

type CodeItem = {
  language: string;
  filename?: string;
  code: string;
};

export type CodeBlockProps = {
  data: CodeItem[];
  defaultValue?: string;
  className?: string;
  children?: React.ReactNode;
};

type CodeBlockContextType = {
  items: CodeItem[];
  active: string;
  setActive: (value: string) => void;
  activeItem: CodeItem | null;
};

const CodeBlockContext = createContext<CodeBlockContextType | null>(null);

function useCodeBlock() {
  const ctx = useContext(CodeBlockContext);
  if (!ctx) throw new Error('CodeBlock subcomponents must be used within CodeBlock');
  return ctx;
}

export function CodeBlock({ data, defaultValue, className, children }: CodeBlockProps) {
  const initial = defaultValue ?? data[0]?.language ?? '';
  const [active, setActive] = useState<string>(initial);
  const activeItem = useMemo(() => data.find((d) => d.language === active) ?? null, [data, active]);

  const value = useMemo<CodeBlockContextType>(
    () => ({ items: data, active, setActive, activeItem }),
    [data, active, activeItem]
  );

  return (
    <CodeBlockContext.Provider value={value}>
      <div className={cn('rounded-md border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm', className)}>
        {children}
      </div>
    </CodeBlockContext.Provider>
  );
}

export function CodeBlockHeader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800', className)}>
      {children}
    </div>
  );
}

export function CodeBlockFiles({ children }: { children: (item: CodeItem) => React.ReactNode }) {
  const { items } = useCodeBlock();
  return <div className="flex items-center gap-2 overflow-x-auto">{items.map((it) => children(it))}</div>;
}

export function CodeBlockFilename({ value, children }: { value: string; children?: React.ReactNode }) {
  const { active, setActive } = useCodeBlock();
  const isActive = active === value;
  return (
    <button
      type="button"
      onClick={() => setActive(value)}
      className={cn(
        'text-xs px-2 py-1 rounded-sm border transition-colors',
        isActive
          ? 'bg-primary/10 border-primary/30 text-primary'
          : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
      )}
    >
      {children}
    </button>
  );
}

export function CodeBlockSelect({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { items, active, setActive } = useCodeBlock();
  return (
    <div className={cn('ml-auto', className)}>
      <select
        className="text-xs px-2 py-1 rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
        value={active}
        onChange={(e) => setActive(e.target.value)}
      >
        {items.map((it) => (
          <option key={it.language} value={it.language}>
            {it.language}
          </option>
        ))}
      </select>
      {/* Children are accepted for API compatibility but not rendered */}
      <div className="hidden" aria-hidden>
        {children}
      </div>
    </div>
  );
}

export function CodeBlockSelectTrigger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
export function CodeBlockSelectValue({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
export function CodeBlockSelectContent({ children }: { children?: React.ReactNode | ((item: CodeItem) => React.ReactNode) }) {
  return <>{typeof children === 'function' ? null : children}</>;
}
export function CodeBlockSelectItem(
  { value, children }: { value: string; children?: React.ReactNode }
) {
  // Keep API compatibility and satisfy ESLint by using `value`
  return (
    <span data-value={value} className="hidden" aria-hidden>
      {children}
    </span>
  );
}

export function CodeBlockCopyButton({ onCopy, onError }: { onCopy?: () => void; onError?: () => void }) {
  const { activeItem } = useCodeBlock();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeItem?.code ?? '');
      onCopy?.();
    } catch (e) {
      onError?.();
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded-sm border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
    >
      Copy
    </button>
  );
}

export function CodeBlockBody({ children }: { children: (item: CodeItem) => React.ReactNode }) {
  const { items } = useCodeBlock();
  return <div className="px-3 py-2">{items.map((it) => children(it))}</div>;
}

export function CodeBlockItem({ value, children }: { value: string; children?: React.ReactNode }) {
  const { active } = useCodeBlock();
  const isActive = active === value;
  return <div className={cn(!isActive && 'hidden')}>{children}</div>;
}

export function CodeBlockContent({ language, children }: { language: BundledLanguage; children: string }) {
  const highlighted = useMemo(() => {
    try {
      if (typeof language === 'string' && hljs.getLanguage(language)) {
        return hljs.highlight(children, { language }).value;
      }
      return hljs.highlightAuto(children).value;
    } catch {
      return null;
    }
  }, [language, children]);

  return (
    <pre className="overflow-auto text-[0.95em] border rounded-md border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-900/40">
      {highlighted ? (
        <code
          data-language={language}
          className="hljs font-mono whitespace-pre text-zinc-800 dark:text-zinc-200"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <code data-language={language} className="font-mono whitespace-pre text-zinc-800 dark:text-zinc-200">
          {children}
        </code>
      )}
    </pre>
  );
}


