import type { CustomCitation } from 'src/types/chat-bot';
import type { Position, HighlightType, ProcessedCitation } from 'src/types/pdf-highlighter';
import type {
  SearchResult,
  DocumentContent,
} from 'src/sections/knowledgebase/types/search-response';

import * as docxPreview from 'docx-preview';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

import CitationSidebar from './highlighter-sidebar';

type DocxViewerProps = {
  url?: string;
  buffer?: ArrayBuffer;
  onClosePdf: () => void;
  citations: DocumentContent[] | CustomCitation[];
  highlightCitation?: SearchResult | CustomCitation | null;
  renderOptions?: any;
};

// Constants for highlighting
const HIGHLIGHT_BASE_CLASS = 'docx-highlight';
const SIMILARITY_THRESHOLD = 0.6;

const DocxViewer: React.FC<DocxViewerProps> = ({
  url,
  buffer,
  onClosePdf,
  citations = [],
  highlightCitation,
  renderOptions = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderContainerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [documentReady, setDocumentReady] = useState<boolean>(false);
  const [processedCitations, setProcessedCitations] = useState<ProcessedCitation[]>([]);
  const [highlightedCitationId, setHighlightedCitationId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const fullScreenContainerRef = useRef<HTMLDivElement | null>(null);

  // References for advanced highlighting
  const styleAddedRef = useRef<boolean>(false);
  const processingCitationsRef = useRef<boolean>(false);
  const contentRenderedRef = useRef<boolean>(false);
  const highlightsAppliedRef = useRef<boolean>(false);
  const highlightingInProgressRef = useRef<boolean>(false);
  const cleanupStylesRef = useRef<(() => void) | null>(null);
  const prevCitationsJsonRef = useRef<string>('[]');
  const highlightCleanupsRef = useRef<Map<string, () => void>>(new Map());

  // Utility functions
  const normalizeText = useCallback((text: string | null | undefined): string => {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .toLowerCase()
      .trim();
  }, []);

  const calculateSimilarity = useCallback(
    (str1: string, str2: string): number => {
      if (!str1 || !str2) return 0;
      const normalizedStr1 = normalizeText(str1);
      const normalizedStr2 = normalizeText(str2);

      if (normalizedStr1 === normalizedStr2) return 1;
      if (normalizedStr1.includes(normalizedStr2) || normalizedStr2.includes(normalizedStr1))
        return 0.9;

      // Simple Jaccard similarity for fuzzy matching
      const set1 = new Set(normalizedStr1.split(' '));
      const set2 = new Set(normalizedStr2.split(' '));
      const intersection = new Set([...set1].filter((x) => set2.has(x)));
      const union = new Set([...set1, ...set2]);

      return intersection.size / union.size;
    },
    [normalizeText]
  );

  // Type guards
  const isDocumentContent = useCallback(
    (citation: any): citation is DocumentContent =>
      !!(citation && citation.metadata && typeof citation.metadata._id === 'string'),
    []
  );

  // Setup highlighting styles
  useEffect(() => {
    if (!styleAddedRef.current) {
      const style = document.createElement('style');
      style.textContent = `
        .${HIGHLIGHT_BASE_CLASS} {
          background-color: rgba(255, 215, 0, 0.4) !important;
          transition: background-color 0.3s ease;
          cursor: pointer;
          border-radius: 2px;
          position: relative;
        }
        .${HIGHLIGHT_BASE_CLASS}:hover {
          background-color: rgba(255, 193, 7, 0.6) !important;
        }
        .${HIGHLIGHT_BASE_CLASS}-active {
          background-color: rgba(255, 165, 0, 0.7) !important;
          box-shadow: 0 0 0 2px rgba(255, 165, 0, 0.8);
        }
        .${HIGHLIGHT_BASE_CLASS}-fuzzy {
          background-color: rgba(255, 235, 59, 0.3) !important;
          border: 1px dashed rgba(255, 193, 7, 0.8);
        }
      `;
      document.head.appendChild(style);

      cleanupStylesRef.current = () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
      styleAddedRef.current = true;
    }

    return () => {
      if (cleanupStylesRef.current) {
        cleanupStylesRef.current();
        cleanupStylesRef.current = null;
        styleAddedRef.current = false;
      }
    };
  }, []);

  // Document rendering
  useEffect(() => {
    if (!url && !buffer) {
      setError('No document source provided');
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    const renderDoc = async (attempt = 1) => {
      // Check if component is still mounted
      if (!isMounted) return false;

      // Wait for the ref to be available
      if (!renderContainerRef.current) {
        if (attempt < 10) {
          // Increased retry attempts for ref availability
          setTimeout(() => renderDoc(attempt + 1), 100); // Shorter intervals
          return false;
        }
        console.error('Container ref is not available after maximum attempts');
        if (isMounted) {
          setError('Failed to find container to render document');
          setLoading(false);
        }
        return false;
      }

      // Ensure we have document source
      if (!buffer && !url) {
        if (isMounted) {
          setError('No document source provided');
          setLoading(false);
        }
        return false;
      }

      try {
        let docBuffer: ArrayBuffer;

        if (buffer) {
          docBuffer = buffer;
        } else if (url) {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.statusText}`);
          }
          docBuffer = await response.arrayBuffer();
        } else {
          throw new Error('No valid document source');
        }

        // Check if component is still mounted before rendering
        if (!isMounted || !renderContainerRef.current) {
          return false;
        }

        // Clear any previous content
        renderContainerRef.current.innerHTML = '';

        await docxPreview.renderAsync(docBuffer, renderContainerRef.current, null!, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ...renderOptions,
        });

        if (isMounted) {
          setLoading(false);
          setDocumentReady(true);
          contentRenderedRef.current = true;
        }
        return true;
      } catch (err) {
        console.error('Error rendering DOCX:', err);
        if (isMounted) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error rendering document';
          setError(errorMessage);
          setLoading(false);
        }
        return false;
      }
    };

    // Reset states when starting new render
    setLoading(true);
    setError(null);
    setDocumentReady(false);
    contentRenderedRef.current = false;

    // Start rendering with a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (isMounted) {
        renderDoc();
      }
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [url, buffer, renderOptions]);

  // Process text highlights
  const processTextHighlight = useCallback(
    (citation: DocumentContent | CustomCitation) => {
      try {
        const content = citation.content || '';
        const id = isDocumentContent(citation)
          ? citation.metadata._id
          : (citation as CustomCitation).id;

        if (!content || !id) return null;

        return {
          id,
          position: { pageNumber: 1, rects: [{ x1: 0, y1: 0 }] } as Position,
          content: { text: normalizeText(content) },
          comment: { text: '', emoji: '' },
        } as HighlightType;
      } catch (err) {
        console.error('Error processing text highlight:', err);
        return null;
      }
    },
    [normalizeText, isDocumentContent]
  );

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    if (!containerRef.current) return;

    try {
      highlightCleanupsRef.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (err) {
          console.error('Error during highlight cleanup:', err);
        }
      });
      highlightCleanupsRef.current.clear();

      containerRef.current.querySelectorAll(`.${HIGHLIGHT_BASE_CLASS}`).forEach((element) => {
        const parent = element.parentNode;
        if (parent) {
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
          }
          parent.removeChild(element);
        }
      });

      highlightsAppliedRef.current = false;
    } catch (err) {
      console.error('Error clearing highlights:', err);
    }
  }, []);

  // Cleanup on unmount
  // eslint-disable-next-line arrow-body-style
  useEffect(() => {
    const currentRenderContainer = renderContainerRef.current;

    return () => {
      // Clear any pending highlighting operations
      highlightingInProgressRef.current = false;
      processingCitationsRef.current = false;

      // Clear highlights
      clearHighlights();

      // Clear the render container
      if (currentRenderContainer) {
        currentRenderContainer.innerHTML = '';
      }
    };
  }, [clearHighlights]);

  // Advanced text highlighting function
  const highlightTextInElement = useCallback(
    (
      element: Element,
      normalizedTextToHighlight: string,
      highlightId: string,
      matchType: 'exact' | 'fuzzy' = 'exact'
    ): { success: boolean; cleanup?: () => void } => {
      const highlightIdClass = `highlight-${highlightId}`;
      const highlightClasses = [HIGHLIGHT_BASE_CLASS, highlightIdClass];

      if (matchType === 'fuzzy') {
        highlightClasses.push(`${HIGHLIGHT_BASE_CLASS}-fuzzy`);
      }

      const fullHighlightClass = highlightClasses.join(' ');

      if (
        element.classList.contains(highlightIdClass) ||
        element.querySelector(`.${highlightIdClass}`)
      ) {
        return { success: false };
      }

      const searchRoot = element;
      const treeWalker = document.createTreeWalker(searchRoot, NodeFilter.SHOW_TEXT, null);

      let found = false;
      let textNode: Text | null = null;

      // eslint-disable-next-line no-cond-assign
      while ((textNode = treeWalker.nextNode() as Text)) {
        const nodeText = normalizeText(textNode.nodeValue || '');
        if (nodeText.includes(normalizedTextToHighlight)) {
          found = true;
          break;
        }
      }

      if (found && textNode) {
        try {
          const nodeValue = textNode.nodeValue || '';
          const normalizedNodeValue = normalizeText(nodeValue);
          const startIndex = normalizedNodeValue.indexOf(normalizedTextToHighlight);

          if (startIndex !== -1) {
            const endIndex = startIndex + normalizedTextToHighlight.length;
            const range = document.createRange();
            range.setStart(textNode, startIndex);
            range.setEnd(textNode, Math.min(endIndex, nodeValue.length));

            const span = document.createElement('span');
            span.className = fullHighlightClass;
            span.dataset.highlightId = highlightId;

            try {
              range.surroundContents(span);

              span.addEventListener('click', (e) => {
                e.stopPropagation();
                containerRef.current
                  ?.querySelectorAll(`.${HIGHLIGHT_BASE_CLASS}-active`)
                  .forEach((el) => el.classList.remove(`${HIGHLIGHT_BASE_CLASS}-active`));
                span.classList.add(`${HIGHLIGHT_BASE_CLASS}-active`);
                setHighlightedCitationId(highlightId);
                span.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
              });

              return {
                success: true,
                cleanup: () => {
                  try {
                    const parent = span.parentNode;
                    if (parent) {
                      while (span.firstChild) {
                        parent.insertBefore(span.firstChild, span);
                      }
                      parent.removeChild(span);
                    }
                  } catch (cleanupErr) {
                    console.error('Error during span cleanup:', cleanupErr);
                  }
                },
              };
            } catch (wrapError) {
              console.error('Error surrounding content:', wrapError);
              return { success: false };
            }
          }
        } catch (err) {
          console.error('Error highlighting text in element:', err);
          return { success: false };
        }
      } else if (matchType === 'fuzzy' && !found && element !== searchRoot) {
        // Fallback: highlight entire element for fuzzy matches
        if (
          element.classList.contains(highlightIdClass) ||
          element.querySelector(`.${highlightIdClass}`)
        ) {
          return { success: false };
        }

        try {
          const wrapperSpan = document.createElement('span');
          wrapperSpan.className = fullHighlightClass;
          wrapperSpan.dataset.highlightId = highlightId;

          while (element.firstChild) {
            wrapperSpan.appendChild(element.firstChild);
          }
          element.appendChild(wrapperSpan);

          wrapperSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            containerRef.current
              ?.querySelectorAll(`.${HIGHLIGHT_BASE_CLASS}-active`)
              .forEach((el) => el.classList.remove(`${HIGHLIGHT_BASE_CLASS}-active`));
            wrapperSpan.classList.add(`${HIGHLIGHT_BASE_CLASS}-active`);
            setHighlightedCitationId(highlightId);
            wrapperSpan.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          });

          return {
            success: true,
            cleanup: () => {
              try {
                const parent = wrapperSpan.parentNode;
                if (parent) {
                  while (wrapperSpan.firstChild) {
                    parent.insertBefore(wrapperSpan.firstChild, wrapperSpan);
                  }
                  parent.removeChild(wrapperSpan);
                }
              } catch (cleanupErr) {
                console.error('Error during wrapper cleanup:', cleanupErr);
              }
            },
          };
        } catch (err) {
          console.error('Error wrapping element:', err);
          return { success: false };
        }
      }

      return { success: false };
    },
    [normalizeText]
  );

  // Apply text highlights
  const applyTextHighlights = useCallback(
    (citationsToHighlight: ProcessedCitation[]): void => {
      if (
        highlightingInProgressRef.current ||
        !containerRef.current ||
        !documentReady ||
        !contentRenderedRef.current
      ) {
        return;
      }

      highlightingInProgressRef.current = true;
      clearHighlights();

      requestAnimationFrame(() => {
        try {
          const candidateElements = Array.from(
            containerRef.current?.querySelectorAll(
              'p, span, div, td, th, li, h1, h2, h3, h4, h5, h6'
            ) || []
          ).filter((el) => el.textContent && el.textContent.trim().length > 0);

          const newCleanups = new Map<string, () => void>();
          let appliedCount = 0;

          citationsToHighlight.forEach((citation) => {
            const normalizedText = citation.highlight?.content?.text;
            const highlightId = citation.highlight?.id;

            if (!normalizedText || !highlightId) return;

            // Try exact match first
            const exactMatchFound = candidateElements.some((element) => {
              const normalizedElementText = normalizeText(element.textContent || '');
              if (normalizedElementText.includes(normalizedText)) {
                const result = highlightTextInElement(
                  element,
                  normalizedText,
                  highlightId,
                  'exact'
                );
                if (result.success) {
                  appliedCount += 1;
                  if (result.cleanup) newCleanups.set(highlightId, result.cleanup);
                  return true;
                }
              }
              return false;
            });

            // Fuzzy match fallback
            if (!exactMatchFound && candidateElements.length > 0) {
              const similarityScores = candidateElements
                .map((el) => ({
                  element: el,
                  score: calculateSimilarity(normalizedText, el.textContent || ''),
                }))
                .filter((item) => item.score > SIMILARITY_THRESHOLD)
                .sort((a, b) => b.score - a.score);

              if (similarityScores.length > 0) {
                const bestMatch = similarityScores[0];
                const alreadyHighlightedInside = !!bestMatch.element.querySelector(
                  `.highlight-${highlightId}`
                );
                const parentAlreadyHighlighted = bestMatch.element.closest(
                  `.highlight-${highlightId}`
                );

                if (!alreadyHighlightedInside && !parentAlreadyHighlighted) {
                  const result = highlightTextInElement(
                    bestMatch.element,
                    normalizedText,
                    highlightId,
                    'fuzzy'
                  );
                  if (result.success) {
                    appliedCount += 1;
                    if (result.cleanup) newCleanups.set(highlightId, result.cleanup);
                  }
                }
              }
            }
          });

          highlightCleanupsRef.current = newCleanups;
          highlightsAppliedRef.current = appliedCount > 0;
          document.dispatchEvent(new CustomEvent('highlightsapplied'));
        } catch (e) {
          console.error('Error during applyTextHighlights execution:', e);
          highlightsAppliedRef.current = false;
        } finally {
          highlightingInProgressRef.current = false;
        }
      });
    },
    [documentReady, clearHighlights, highlightTextInElement, calculateSimilarity, normalizeText]
  );

  // Process citations
  const processCitations = useCallback(() => {
    const currentCitationsContent = JSON.stringify(
      citations?.map((c) => normalizeText(c?.content || '')).sort() ?? []
    );

    if (
      processingCitationsRef.current ||
      !citations ||
      citations.length === 0 ||
      (currentCitationsContent === prevCitationsJsonRef.current && highlightsAppliedRef.current)
    ) {
      if (currentCitationsContent !== prevCitationsJsonRef.current) {
        prevCitationsJsonRef.current = currentCitationsContent;
        highlightsAppliedRef.current = false;
      }
      return;
    }

    processingCitationsRef.current = true;

    try {
      const processed: ProcessedCitation[] = citations
        .map((citation) => {
          const highlight = processTextHighlight(citation);
          if (highlight) {
            return { ...citation, highlight } as ProcessedCitation;
          }
          return null;
        })
        .filter((item): item is ProcessedCitation => item !== null);

      setProcessedCitations(processed);
      prevCitationsJsonRef.current = currentCitationsContent;
      highlightsAppliedRef.current = false;

      if (
        processed.length > 0 &&
        containerRef.current &&
        documentReady &&
        contentRenderedRef.current &&
        !highlightingInProgressRef.current
      ) {
        requestAnimationFrame(() => applyTextHighlights(processed));
      }
    } catch (err) {
      console.error('Error processing citations:', err);
    } finally {
      processingCitationsRef.current = false;
    }
  }, [citations, documentReady, applyTextHighlights, processTextHighlight, normalizeText]);

  // Apply citations when document is ready
  useEffect(() => {
    if (documentReady && contentRenderedRef.current) {
      const timer = setTimeout(() => {
        processCitations();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [documentReady, processCitations]);

  // Handle highlight citation scrolling
  useEffect(() => {
    const getHighlightedCitationId = (): string | null => {
      if (isDocumentContent(highlightCitation)) {
        return highlightCitation.metadata._id;
      }
      if (highlightCitation && (highlightCitation as CustomCitation).id) {
        return (highlightCitation as CustomCitation).id;
      }
      return null;
    };

    const highlightedId = getHighlightedCitationId();
    setHighlightedCitationId(highlightedId);

    if (!highlightedId || !documentReady || !contentRenderedRef.current) return undefined;

    const attemptHighlightAndScroll = (attempt = 1, maxAttempts = 5): void => {
      if (attempt > maxAttempts) {
        console.warn(`Failed to find highlight ${highlightedId} after ${maxAttempts} attempts`);
        return;
      }

      const candidateElements = Array.from(
        containerRef.current?.querySelectorAll(
          'p, span, div, td, th, li, h1, h2, h3, h4, h5, h6'
        ) || []
      );

      if (candidateElements.length === 0) {
        setTimeout(() => attemptHighlightAndScroll(attempt + 1, maxAttempts), 200);
        return;
      }

      clearHighlights();

      requestAnimationFrame(() => {
        const newCleanups = new Map<string, () => void>();
        let highlightApplied = false;

        processedCitations.forEach((citation) => {
          const normalizedText = citation.highlight?.content?.text;
          const citationId = citation.highlight?.id;

          if (!normalizedText || !citationId) return;

          const exactMatch = candidateElements.find((element) => {
            const elementText = normalizeText(element.textContent || '');
            return elementText.includes(normalizedText);
          });

          if (exactMatch) {
            const result = highlightTextInElement(exactMatch, normalizedText, citationId, 'exact');
            if (result.success) {
              if (result.cleanup) newCleanups.set(citationId, result.cleanup);
              if (citationId === highlightedId) {
                highlightApplied = true;
              }
            }
          } else {
            const fuzzyMatches = candidateElements
              .map((el) => ({
                element: el,
                score: calculateSimilarity(normalizedText, el.textContent || ''),
              }))
              .filter((item) => item.score > SIMILARITY_THRESHOLD)
              .sort((a, b) => b.score - a.score);

            if (fuzzyMatches.length > 0) {
              const result = highlightTextInElement(
                fuzzyMatches[0].element,
                normalizedText,
                citationId,
                'fuzzy'
              );
              if (result.success) {
                if (result.cleanup) newCleanups.set(citationId, result.cleanup);
                if (citationId === highlightedId) {
                  highlightApplied = true;
                }
              }
            }
          }
        });

        highlightCleanupsRef.current = newCleanups;
        highlightsAppliedRef.current = newCleanups.size > 0;
        highlightingInProgressRef.current = false;

        if (highlightApplied) {
          setTimeout(() => {
            const targetElement = containerRef.current?.querySelector(
              `.highlight-${highlightedId}`
            );
            if (targetElement) {
              containerRef.current
                ?.querySelectorAll(`.${HIGHLIGHT_BASE_CLASS}-active`)
                .forEach((el) => el.classList.remove(`${HIGHLIGHT_BASE_CLASS}-active`));
              targetElement.classList.add(`${HIGHLIGHT_BASE_CLASS}-active`);
              targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
              });
            }
          }, 100);
        } else if (attempt < maxAttempts) {
          setTimeout(() => attemptHighlightAndScroll(attempt + 1, maxAttempts), 300);
        }
      });
    };

    const timer = setTimeout(() => attemptHighlightAndScroll(), 200);
    return () => {
      clearTimeout(timer);
    };
  }, [
    highlightCitation,
    documentReady,
    processedCitations,
    clearHighlights,
    highlightTextInElement,
    calculateSimilarity,
    normalizeText,
    isDocumentContent,
  ]);

  // Scroll to highlight function for sidebar
  const scrollViewerTo = useCallback((highlight: { id: string }) => {
    if (containerRef.current) {
      const element = containerRef.current.querySelector(
        `#highlight-${highlight.id}, .highlight-${highlight.id}`
      );
      if (element) {
        containerRef.current
          .querySelectorAll(`.${HIGHLIGHT_BASE_CLASS}-active`)
          .forEach((el) => el.classList.remove(`${HIGHLIGHT_BASE_CLASS}-active`));
        element.classList.add(`${HIGHLIGHT_BASE_CLASS}-active`);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
        <Loader2 className="h-10 w-10 mb-4 animate-spin text-primary" />
        <p className="text-foreground">Rendering Document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-card p-6 text-center z-10">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h6 className="text-lg font-semibold mb-2 text-foreground">Could not load document</h6>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={fullScreenContainerRef}
      className="flex-1 flex flex-col h-full overflow-hidden relative rounded-lg border border-border bg-card shadow-sm"
    >
      <div className="flex flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className={cn(
            'flex-1 overflow-y-auto h-full',
            '[&_.docx-wrapper]:p-5 [&_.docx-wrapper]:bg-background',
            '[&_.docx-wrapper_.docx]:shadow-sm [&_.docx-wrapper_.docx]:mb-2.5'
          )}
        >
          <div ref={renderContainerRef} />
        </div>
        {processedCitations.length > 0 && (
          <div className="w-[280px] h-full flex-shrink-0 overflow-y-auto bg-muted/30 dark:bg-muted/20 border-l border-border">
            <CitationSidebar
              citations={processedCitations}
              scrollViewerTo={scrollViewerTo}
              highlightedCitationId={highlightedCitationId}
              toggleFullScreen={toggleFullscreen}
              onClosePdf={onClosePdf}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DocxViewer;
