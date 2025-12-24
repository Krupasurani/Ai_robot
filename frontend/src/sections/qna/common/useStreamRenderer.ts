import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

export type StreamingState = {
  messageId: string | null;
  isActive: boolean;
  content: string;
  cursorVisible: boolean;
  citations: any[];
};

export type StreamRenderer = {
  state: StreamingState;
  begin: (messageId: string, initial?: string) => void;
  appendToken: (token: string, citations?: any[]) => void;
  end: () => void;
  reset: () => void;
  getAbortController: () => AbortController;
};

export default function useStreamRenderer(blinkMs: number = 700): StreamRenderer {
  const [state, setState] = useState<StreamingState>({
    messageId: null,
    isActive: false,
    content: '',
    cursorVisible: true,
    citations: [],
  });
  const abortRef = useRef<AbortController | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.isActive) {
      if (blinkTimerRef.current) clearInterval(blinkTimerRef.current);
      blinkTimerRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, cursorVisible: !prev.cursorVisible }));
      }, blinkMs);
      return () => {
        if (blinkTimerRef.current) {
          clearInterval(blinkTimerRef.current);
          blinkTimerRef.current = null;
        }
      };
    }
    if (blinkTimerRef.current) {
      clearInterval(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }
    return undefined;
  }, [state.isActive, blinkMs]);

  const begin = useCallback((messageId: string, initial: string = '') => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setState({
      messageId,
      isActive: true,
      content: initial,
      cursorVisible: true,
      citations: [],
    });
  }, []);

  const appendToken = useCallback((token: string, citations?: any[]) => {
    setState((prev) => ({
      ...prev,
      content: prev.content + token,
      citations: citations ?? prev.citations,
    }));
  }, []);

  const end = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: false, cursorVisible: false }));
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setState({
      messageId: null,
      isActive: false,
      content: '',
      cursorVisible: false,
      citations: [],
    });
  }, []);

  const getAbortController = useCallback(() => {
    if (!abortRef.current) abortRef.current = new AbortController();
    return abortRef.current;
  }, []);

  return useMemo(
    () => ({
      state,
      begin,
      appendToken,
      end,
      reset,
      getAbortController,
    }),
    [state, begin, appendToken, end, reset, getAbortController],
  );
}


