import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence?: number;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: SpeechRecognitionResult[];
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const getRecognitionClass = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const win = window as typeof window & {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
};

const detectBrowserLanguage = () => {
  if (typeof navigator === 'undefined') {
    return 'en-US';
  }
  const lang = navigator.language || navigator.languages?.[0] || 'en-US';
  return lang.toLowerCase().startsWith('de') ? 'de-DE' : 'en-US';
};

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export type UseSpeechRecognitionOptions = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoRestart?: boolean;
  requestPermissionOnStart?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (payload: {
    event: SpeechRecognitionResultEvent;
    finalTranscript: string;
    interimTranscript: string;
  }) => void;
  onError?: (error: SpeechRecognitionErrorEvent | Error) => void;
};

export type UseSpeechRecognitionReturn = {
  isSupported: boolean;
  isRecording: boolean;
  language: string;
  interimTranscript: string;
  finalTranscript: string;
  error: SpeechRecognitionErrorEvent | Error | null;
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
  setLanguage: (lang: string) => void;
  resetTranscripts: () => void;
};

export const useSpeechRecognition = (
  options?: UseSpeechRecognitionOptions
): UseSpeechRecognitionReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [language, setLanguageState] = useState(() => options?.lang || detectBrowserLanguage());
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<SpeechRecognitionErrorEvent | Error | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isRecordingRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const callbacksRef = useRef(options);
  const settingsRef = useRef({
    continuous: options?.continuous ?? true,
    interimResults: options?.interimResults ?? true,
    autoRestart: options?.autoRestart ?? true,
    requestPermissionOnStart: options?.requestPermissionOnStart ?? true,
  });

  callbacksRef.current = options;

  useEffect(() => {
    settingsRef.current = {
      continuous: options?.continuous ?? true,
      interimResults: options?.interimResults ?? true,
      autoRestart: options?.autoRestart ?? true,
      requestPermissionOnStart: options?.requestPermissionOnStart ?? true,
    };

    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.continuous = settingsRef.current.continuous;
      recognition.interimResults = settingsRef.current.interimResults;
    }
  }, [options?.autoRestart, options?.continuous, options?.interimResults, options?.requestPermissionOnStart]);

  useEffect(() => {
    if (!options?.lang) {
      return;
    }
    setLanguageState(options.lang);
  }, [options?.lang]);

  useEffect(() => {
    const RecognitionClass = getRecognitionClass();
    if (!RecognitionClass) {
      setIsSupported(false);
      return () => {};
    }

    const recognition = new RecognitionClass();
    recognitionRef.current = recognition;
    setIsSupported(true);

    recognition.lang = language;
    recognition.continuous = settingsRef.current.continuous;
    recognition.interimResults = settingsRef.current.interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRecordingRef.current = true;
      setIsRecording(true);
      callbacksRef.current?.onStart?.();
    };

    recognition.onend = () => {
      isRecordingRef.current = false;
      setIsRecording(false);
      callbacksRef.current?.onEnd?.();

      if (shouldRestartRef.current && settingsRef.current.autoRestart) {
        try {
          recognition.start();
        } catch (restartError) {
          shouldRestartRef.current = false;
          setError(restartError as Error);
          callbacksRef.current?.onError?.(restartError as Error);
        }
      }
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alternative = result[0];
        if (alternative) {
          if (result.isFinal) {
            finalText += alternative.transcript;
          } else {
            interimText += alternative.transcript;
          }
        }
      }

      const trimmedFinal = finalText.trim();
      const trimmedInterim = interimText.trim();

      if (trimmedFinal) {
        setFinalTranscript((prev) => {
          const next = `${prev}${prev ? ' ' : ''}${trimmedFinal}`.trim();
          return next;
        });
        setInterimTranscript('');
      } else if (trimmedInterim) {
        setInterimTranscript(trimmedInterim);
      } else {
        setInterimTranscript('');
      }

      callbacksRef.current?.onResult?.({
        event,
        finalTranscript: trimmedFinal,
        interimTranscript: trimmedInterim,
      });
    };

    recognition.onerror = (event) => {
      setError(event);
      callbacksRef.current?.onError?.(event);

      if (['not-allowed', 'service-not-allowed', 'aborted', 'network'].includes(event.error)) {
        shouldRestartRef.current = false;
        isRecordingRef.current = false;
      }
    };

    return () => {
      shouldRestartRef.current = false;
      isRecordingRef.current = false;
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      try {
        recognition.stop();
      } catch {
        // no-op
      }
      recognitionRef.current = null;
    };
    // We only want to initialize once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.lang = language;
    }
  }, [language]);

  const requestMicrophonePermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } finally {
      stopStream(stream);
    }
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      setError(new Error('Speech recognition is not supported in this browser.'));
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition || isRecordingRef.current) {
      return;
    }

    setError(null);
    setInterimTranscript('');
    setFinalTranscript('');

    shouldRestartRef.current = true;

    if (settingsRef.current.requestPermissionOnStart) {
      try {
        await requestMicrophonePermission();
      } catch (permissionError) {
        setError(permissionError as Error);
        callbacksRef.current?.onError?.(permissionError as Error);
        // Continue attempting to start recognition even if permission request fails here.
      }
    }

    try {
      recognition.lang = language;
      recognition.start();
    } catch (startError) {
      shouldRestartRef.current = false;
      setError(startError as Error);
      callbacksRef.current?.onError?.(startError as Error);
    }
  }, [isSupported, language, requestMicrophonePermission]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }
    shouldRestartRef.current = false;
    try {
      recognition.stop();
    } catch (stopError) {
      setError(stopError as Error);
      callbacksRef.current?.onError?.(stopError as Error);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isRecordingRef.current) {
      stop();
    } else {
      await start();
    }
  }, [start, stop]);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang || detectBrowserLanguage());
  }, []);

  const resetTranscripts = useCallback(() => {
    setInterimTranscript('');
    setFinalTranscript('');
  }, []);

  return {
    isSupported,
    isRecording,
    language,
    interimTranscript,
    finalTranscript,
    error,
    start,
    stop,
    toggle,
    setLanguage,
    resetTranscripts,
  };
};


