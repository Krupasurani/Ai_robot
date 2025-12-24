import { useState, useCallback } from 'react';
import { Image } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { editorClasses } from '../classes';
import { ToolbarItem } from './toolbar-item';
import type { EditorToolbarProps } from '../types';

export function ImageBlock({ editor }: Pick<EditorToolbarProps, 'editor'>) {
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);

  const handleUpdateUrl = useCallback(() => {
    setOpen(false);
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
      setUrl('');
    }
  }, [editor, url]);

  if (!editor) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarItem
          aria-label="Image"
          className={editorClasses.toolbar.image}
          icon={<Image className="h-4 w-4" />}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-6" align="start">
        <Label className="mb-2 text-sm font-semibold">URL</Label>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Enter URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUpdateUrl();
              }
            }}
          />
          <Button onClick={handleUpdateUrl}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
