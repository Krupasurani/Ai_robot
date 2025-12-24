import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { EditorToolbarProps } from '../types';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const HEADING_OPTIONS = [
  'Heading 1',
  'Heading 2',
  'Heading 3',
  'Heading 4',
  'Heading 5',
  'Heading 6',
];

export function HeadingBlock({ editor }: Pick<EditorToolbarProps, 'editor'>) {
  const [open, setOpen] = useState(false);

  if (!editor) {
    return null;
  }

  const currentHeading =
    (editor.isActive('heading', { level: 1 }) && 'Heading 1') ||
    (editor.isActive('heading', { level: 2 }) && 'Heading 2') ||
    (editor.isActive('heading', { level: 3 }) && 'Heading 3') ||
    (editor.isActive('heading', { level: 4 }) && 'Heading 4') ||
    (editor.isActive('heading', { level: 5 }) && 'Heading 5') ||
    (editor.isActive('heading', { level: 6 }) && 'Heading 6') ||
    'Paragraph';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-8 w-[120px] justify-between px-2 text-sm"
          aria-label="Heading menu button"
        >
          <span>{currentHeading}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[120px]" align="start">
        <DropdownMenuItem
          onClick={() => {
            setOpen(false);
            editor.chain().focus().setParagraph().run();
          }}
          className={editor.isActive('paragraph') ? 'bg-accent' : ''}
        >
          Paragraph
        </DropdownMenuItem>
        {HEADING_OPTIONS.map((heading, index) => {
          const level = (index + 1) as HeadingLevel;
          return (
            <DropdownMenuItem
              key={heading}
              onClick={() => {
                setOpen(false);
                editor.chain().focus().toggleHeading({ level }).run();
              }}
              className={cn(
                editor.isActive('heading', { level }) && 'bg-accent',
                heading !== 'Paragraph' && `text-[${18 - index}px] font-bold`
              )}
            >
              {heading}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
