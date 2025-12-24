import type { IChatParticipant } from 'src/types/chat';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Paperclip, Image, Mic, MicOff, Send } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from 'src/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'src/components/ui/tooltip';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { today } from 'src/utils/format-time';
import { sendMessage, createConversation } from 'src/actions/chat';
import { useAuthContext } from 'src/auth/hooks';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { initialConversation } from './utils/initial-conversation';

type Props = {
  disabled: boolean;
  recipients: IChatParticipant[];
  selectedConversationId: string;
  onAddRecipients: (recipients: IChatParticipant[]) => void;
};

export function ChatMessageInput({
  disabled,
  recipients,
  onAddRecipients,
  selectedConversationId,
}: Props) {
  const router = useRouter();
  const { user } = useAuthContext();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [hasText, setHasText] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingRef = useRef(false);
  const messageRef = useRef<string>('');
  const voiceBaseMessageRef = useRef<string>('');

  const myContact = useMemo(
    () => ({
      id: `${user?.id}`,
      role: `${user?.role}`,
      email: `${user?.email}`,
      address: `${user?.address}`,
      name: `${user?.displayName}`,
      lastActivity: today(),
      avatarUrl: `${user?.photoURL}`,
      phoneNumber: `${user?.phoneNumber}`,
      status: 'online' as 'online' | 'offline' | 'alway' | 'busy',
    }),
    [user]
  );

  const { messageData, conversationData } = initialConversation({
    message,
    recipients,
    me: myContact,
  });

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(
    () => () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    },
    []
  );

  // Reset submission state when disabled state changes or component unmounts
  useEffect(() => {
    // If disabled is false and we were submitting, reset the ref
    if (!disabled && isSubmittingRef.current) {
      isSubmittingRef.current = false;
    }

    // Cleanup function to reset submission state on unmount
    return () => {
      isSubmittingRef.current = false;
    };
  }, [disabled]);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  // Auto-resize textarea with debounce
  const autoResizeTextarea = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(inputRef.current.scrollHeight, 20), 100);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  const normalizeWhitespace = useCallback((text: string) => text.replace(/\s+/g, ' ').trim(), []);

  const handleSpeechResult = useCallback(
    ({
      finalTranscript,
      interimTranscript,
    }: {
      finalTranscript: string;
      interimTranscript: string;
    }) => {
      const base = voiceBaseMessageRef.current || '';
      if (finalTranscript) {
        const combined = normalizeWhitespace([base, finalTranscript].filter(Boolean).join(' '));
        voiceBaseMessageRef.current = combined;
        setMessage(combined);
        setHasText(!!combined);
      } else if (interimTranscript) {
        const preview = normalizeWhitespace([base, interimTranscript].filter(Boolean).join(' '));
        setMessage(preview);
        setHasText(!!preview);
      }

      autoResizeTextarea();
    },
    [autoResizeTextarea, normalizeWhitespace]
  );

  const handleSpeechError = useCallback((err: unknown) => {
    voiceBaseMessageRef.current = '';
    // eslint-disable-next-line no-console
    console.error('[Voice] Fehler', err);
  }, []);

  const {
    isSupported: isSpeechSupported,
    isRecording,
    toggle: toggleVoiceRecording,
    stop: stopVoiceRecording,
  } = useSpeechRecognition({
    onStart: () => {
      voiceBaseMessageRef.current = messageRef.current || '';
    },
    onResult: ({ finalTranscript, interimTranscript }) => {
      handleSpeechResult({ finalTranscript, interimTranscript });
    },
    onEnd: () => {
      voiceBaseMessageRef.current = '';
    },
    onError: handleSpeechError,
  });

  useEffect(() => {
    if (disabled && isRecording) {
      stopVoiceRecording();
    }
  }, [disabled, isRecording, stopVoiceRecording]);

  // Handle input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = e.target;
      setMessage(value);
      setHasText(!!value.trim());

      // Debounce resize
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(autoResizeTextarea, 50);
    },
    [autoResizeTextarea]
  );

  // Handle submission
  const handleSubmit = useCallback(async () => {
    if (!hasText || disabled || isSubmittingRef.current) return;

    const text = message.trim();
    if (!text) return;

    isSubmittingRef.current = true;

    // Capture current message data BEFORE clearing state to prevent race condition
    const currentMessageData = { ...messageData, body: text };
    const currentConversationData = { ...conversationData, messages: [currentMessageData] };

    try {
      // Clear input immediately
      setMessage('');
      setHasText(false);

      // Reset textarea height
      if (inputRef.current) {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.height = '20px';
          }
        }, 50);
      }

      if (selectedConversationId) {
        // If the conversation already exists
        await sendMessage(selectedConversationId, currentMessageData);
      } else {
        // If the conversation does not exist
        const res = await createConversation(currentConversationData);
        router.push(`${paths.dashboard.chat}?id=${res.conversation.id}`);
        onAddRecipients([]);
      }
    } catch (error) {
      console.error(error);
      // Restore message on error
      setMessage(text);
      setHasText(true);
    } finally {
      // Reset submission state immediately when the promise resolves
      isSubmittingRef.current = false;
    }
  }, [
    conversationData,
    message,
    messageData,
    onAddRecipients,
    router,
    selectedConversationId,
    hasText,
    disabled,
  ]);

  // Handle Enter key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Handle file upload
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    console.log('Chat files uploaded:', fileArray);
    // Add your file processing logic here
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const { files } = e.dataTransfer;
      handleFileUpload(files);
    },
    [handleFileUpload]
  );

  // Handle file input click
  const handleFileInputClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileUpload(e.target.files);
      e.target.value = '';
    },
    [handleFileUpload]
  );

  const handleMicToggle = useCallback(async () => {
    if (!isSpeechSupported || disabled) return;
    await toggleVoiceRecording();
  }, [disabled, isSpeechSupported, toggleVoiceRecording]);

  return (
    <div className="border-t border-border p-1.5 bg-background">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex items-end rounded-[20px] border transition-all relative min-h-[44px]',
          'bg-muted/50 border-border',
          isDragOver && 'border-muted-foreground/50 ring-1 ring-muted-foreground/50',
          'hover:border-muted-foreground/50',
          'focus-within:border-muted-foreground/50 focus-within:ring-1 focus-within:ring-muted-foreground/50'
        )}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-background/5 rounded-[20px] flex items-center justify-center z-10 border-2 border-dashed border-muted-foreground/50">
            <p className="text-muted-foreground font-medium text-sm">Dateien hier ablegen</p>
          </div>
        )}

        {/* Left side icons */}
        <div className="flex items-center gap-1.5 pl-3 py-2">
          <TooltipProvider>
            {/* Paperclip icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full border border-border/50 hover:bg-secondary"
                  onClick={handleFileInputClick}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Datei anhängen</TooltipContent>
            </Tooltip>

            {/* Photo icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full border border-border/50 hover:bg-secondary"
                  onClick={handleFileInputClick}
                >
                  <Image className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Foto hinzufügen</TooltipContent>
            </Tooltip>

            {/* Microphone icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-7 w-7 rounded-full border transition-colors',
                      isRecording
                        ? 'border-destructive/50 bg-destructive/20 text-destructive hover:bg-destructive/30'
                        : 'border-border/50 hover:bg-secondary'
                    )}
                    onClick={handleMicToggle}
                    disabled={!isSpeechSupported || disabled}
                  >
                    {isRecording ? (
                      <MicOff className="h-3.5 w-3.5" />
                    ) : (
                      <Mic className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {isSpeechSupported
                  ? isRecording
                    ? 'Aufnahme stoppen'
                    : 'Diktieren starten'
                  : 'Spracheingabe wird von diesem Browser nicht unterstützt'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Textarea */}
        <div className="flex-1 py-2">
          <textarea
            ref={inputRef}
            placeholder="Nachricht eingeben..."
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            value={message}
            disabled={disabled}
            className="w-full border-none outline-none bg-transparent text-foreground text-sm leading-[1.4] min-h-[20px] max-h-[80px] resize-none p-0 overflow-y-auto overflow-x-hidden break-words whitespace-pre-wrap"
          />
        </div>

        {/* Send button */}
        <div className="pr-3 py-2">
          <Button
            onClick={handleSubmit}
            disabled={disabled || !hasText}
            size="icon"
            className={cn(
              'h-7 w-7 rounded-full transition-all',
              hasText && !disabled
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-transparent text-muted-foreground cursor-not-allowed'
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
