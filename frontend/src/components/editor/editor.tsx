import { common, createLowlight } from 'lowlight';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import ImageExtension from '@tiptap/extension-image';
import StarterKitExtension from '@tiptap/starter-kit';
import TextAlignExtension from '@tiptap/extension-text-align';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import { useState, useEffect, forwardRef, useCallback } from 'react';
import CodeBlockLowlightExtension from '@tiptap/extension-code-block-lowlight';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

import { Toolbar } from './toolbar';
import { editorClasses } from './classes';
import { CodeHighlightBlock } from './components/code-highlight-block';

import type { EditorProps } from './types';

export const Editor = forwardRef<HTMLDivElement, EditorProps>(
  (
    {
      error,
      onChange,
      slotProps,
      helperText,
      resetValue,
      className,
      editable = true,
      fullItem = false,
      value: content = '',
      placeholder = 'Write something awesome...',
      ...other
    },
    ref
  ) => {
    const [fullScreen, setFullScreen] = useState(false);

    const handleToggleFullScreen = useCallback(() => {
      setFullScreen((prev) => !prev);
    }, []);

    const lowlight = createLowlight(common);

    const editor = useEditor({
      content,
      editable,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions: [
        Underline,
        StarterKitExtension.configure({
          codeBlock: false,
          code: { HTMLAttributes: { class: editorClasses.content.codeInline } },
          heading: { HTMLAttributes: { class: editorClasses.content.heading } },
          horizontalRule: { HTMLAttributes: { class: editorClasses.content.hr } },
          listItem: { HTMLAttributes: { class: editorClasses.content.listItem } },
          blockquote: { HTMLAttributes: { class: editorClasses.content.blockquote } },
          bulletList: { HTMLAttributes: { class: editorClasses.content.bulletList } },
          orderedList: { HTMLAttributes: { class: editorClasses.content.orderedList } },
        }),
        PlaceholderExtension.configure({
          placeholder,
          emptyEditorClass: editorClasses.content.placeholder,
        }),
        ImageExtension.configure({ HTMLAttributes: { class: editorClasses.content.image } }),
        TextAlignExtension.configure({ types: ['heading', 'paragraph'] }),
        LinkExtension.configure({
          autolink: true,
          openOnClick: false,
          HTMLAttributes: { class: editorClasses.content.link },
        }),
        CodeBlockLowlightExtension.extend({
          addNodeView() {
            return ReactNodeViewRenderer(CodeHighlightBlock);
          },
        }).configure({ lowlight, HTMLAttributes: { class: editorClasses.content.codeBlock } }),
      ],
      onUpdate({ editor: _editor }) {
        const html = _editor.getHTML();
        onChange?.(html);
      },
      ...other,
    });

    useEffect(() => {
      const timer = setTimeout(() => {
        if (editor?.isEmpty && content !== '<p></p>') {
          editor.commands.setContent(content);
        }
      }, 100);
      return () => clearTimeout(timer);
    }, [content, editor]);

    useEffect(() => {
      if (resetValue && !content) {
        editor?.commands.clearContent();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    useEffect(() => {
      if (fullScreen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }, [fullScreen]);

    const editorContent = (
      <div
        className={cn(
          'flex flex-col min-h-[240px] rounded-md border border-border',
          error && 'border-destructive',
          !editable && 'opacity-48 pointer-events-none',
          fullScreen &&
            'fixed top-4 left-4 z-[1300] max-h-[unset] w-[calc(100%-32px)] h-[calc(100%-32px)] bg-background',
          editorClasses.root,
          className
        )}
      >
        <Toolbar
          editor={editor}
          fullItem={fullItem}
          fullScreen={fullScreen}
          onToggleFullScreen={handleToggleFullScreen}
        />
        <EditorContent
          ref={ref}
          spellCheck="false"
          autoComplete="off"
          autoCapitalize="off"
          editor={editor}
          className={cn(
            'flex flex-1 overflow-y-auto flex-col rounded-b-md',
            'bg-muted/8',
            error && 'bg-destructive/8',
            editorClasses.content.root
          )}
        />
      </div>
    );

    return (
      <>
        {fullScreen && (
          <div
            className="fixed inset-0 z-[1299] bg-background/80 backdrop-blur-sm"
            onClick={handleToggleFullScreen}
          />
        )}
        {fullScreen ? createPortal(editorContent, document.body) : editorContent}
        {helperText && (
          <p
            className={cn(
              'mt-1 px-2 text-xs',
              error ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {helperText}
          </p>
        )}
      </>
    );
  }
);

Editor.displayName = 'Editor';
