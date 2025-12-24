import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Code,
  Code2,
  Quote,
  Minus,
  CornerDownLeft,
  X,
  Undo,
  Redo,
  Maximize,
  Minimize,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { editorClasses } from './classes';
import { LinkBlock } from './components/link-block';
import { ImageBlock } from './components/image-block';
import { ToolbarItem } from './components/toolbar-item';
import { HeadingBlock } from './components/heading-block';
import type { EditorToolbarProps } from './types';

export function Toolbar({ editor, fullItem, fullScreen, onToggleFullScreen }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1 p-5 bg-background border-b border-border rounded-t-lg ${editorClasses.toolbar.root}`}
    >
      <HeadingBlock editor={editor} />

      {/* Text style */}
      <div className="flex items-center gap-0.5">
        <ToolbarItem
          aria-label="Bold"
          active={editor.isActive('bold')}
          className={editorClasses.toolbar.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={<Bold className="h-4 w-4" />}
        />
        <ToolbarItem
          aria-label="Italic"
          active={editor.isActive('italic')}
          className={editorClasses.toolbar.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={<Italic className="h-4 w-4" />}
        />
        <ToolbarItem
          aria-label="Underline"
          active={editor.isActive('underline')}
          className={editorClasses.toolbar.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          icon={<Underline className="h-4 w-4" />}
        />
        <ToolbarItem
          aria-label="Strike"
          active={editor.isActive('strike')}
          className={editorClasses.toolbar.italic}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          icon={<Strikethrough className="h-4 w-4" />}
        />
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* List */}
      <div className="flex items-center gap-0.5">
        <ToolbarItem
          aria-label="Bullet list"
          active={editor.isActive('bulletList')}
          className={editorClasses.toolbar.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          icon={<List className="h-4 w-4" />}
        />
        <ToolbarItem
          aria-label="Ordered list"
          active={editor.isActive('orderedList')}
          className={editorClasses.toolbar.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          icon={<ListOrdered className="h-4 w-4" />}
        />
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* Text align */}
      <div className="flex items-center gap-0.5">
        <ToolbarItem
          aria-label="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          className={editorClasses.toolbar.alignLeft}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          icon={<AlignLeft className="h-4 w-4" />}
        />
        <ToolbarItem
          aria-label="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          className={editorClasses.toolbar.alignCenter}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          icon={<AlignCenter className="h-4 w-4" />}
        />
        <ToolbarItem
          aria-label="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          className={editorClasses.toolbar.alignRight}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          icon={<AlignRight className="h-4 w-4" />}
        />
        <ToolbarItem
          aria-label="Align justify"
          active={editor.isActive({ textAlign: 'justify' })}
          className={editorClasses.toolbar.alignJustify}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          icon={<AlignJustify className="h-4 w-4" />}
        />
      </div>

      {/* Code - Code block */}
      {fullItem && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-0.5">
            <ToolbarItem
              aria-label="Code"
              active={editor.isActive('code')}
              className={editorClasses.toolbar.code}
              onClick={() => editor.chain().focus().toggleCode().run()}
              icon={<Code className="h-4 w-4" />}
            />
            <ToolbarItem
              aria-label="Code block"
              active={editor.isActive('codeBlock')}
              className={editorClasses.toolbar.codeBlock}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              icon={<Code2 className="h-4 w-4" />}
            />
          </div>
        </>
      )}

      {/* Blockquote - Hr line */}
      {fullItem && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-0.5">
            <ToolbarItem
              aria-label="Blockquote"
              active={editor.isActive('blockquote')}
              className={editorClasses.toolbar.blockquote}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              icon={<Quote className="h-4 w-4" />}
            />
            <ToolbarItem
              aria-label="Horizontal"
              className={editorClasses.toolbar.hr}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              icon={<Minus className="h-4 w-4" />}
            />
          </div>
        </>
      )}

      <Separator orientation="vertical" className="h-4" />

      {/* Link - Image */}
      <div className="flex items-center gap-0.5">
        <LinkBlock editor={editor} />
        <ImageBlock editor={editor} />
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* HardBreak - Clear */}
      <div className="flex items-center gap-0.5">
        <ToolbarItem
          aria-label="HardBreak"
          onClick={() => editor.chain().focus().setHardBreak().run()}
          className={editorClasses.toolbar.hardbreak}
          icon={<CornerDownLeft className="h-4 w-4" />}
        />
        <ToolbarItem
          aria-label="Clear"
          className={editorClasses.toolbar.clear}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          icon={<X className="h-4 w-4" />}
        />
      </div>

      {/* Undo - Redo */}
      {fullItem && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-0.5">
            <ToolbarItem
              aria-label="Undo"
              className={editorClasses.toolbar.undo}
              disabled={!editor.can().chain().focus().undo().run()}
              onClick={() => editor.chain().focus().undo().run()}
              icon={<Undo className="h-4 w-4" />}
            />
            <ToolbarItem
              aria-label="Redo"
              className={editorClasses.toolbar.redo}
              disabled={!editor.can().chain().focus().redo().run()}
              onClick={() => editor.chain().focus().redo().run()}
              icon={<Redo className="h-4 w-4" />}
            />
          </div>
        </>
      )}

      <Separator orientation="vertical" className="h-4" />

      <div className="flex items-center gap-0.5">
        <ToolbarItem
          aria-label="Fullscreen"
          className={editorClasses.toolbar.fullscreen}
          onClick={onToggleFullScreen}
          icon={fullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
