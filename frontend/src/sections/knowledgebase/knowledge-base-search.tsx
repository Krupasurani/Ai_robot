import { useRef, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/utils/cn';
import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';

import KnowledgeSearch from './knowledge-search';
import { KnowledgeBaseAPI } from './services/api';
import { ORIGIN } from './constants/knowledge-search';
import DocxViewer from '../qna/chatbot/components/docx-highlighter';
import HtmlViewer from '../qna/chatbot/components/html-highlighter';
import TextViewer from '../qna/chatbot/components/text-highlighter';
import { useConnectors } from '../accountdetails/connectors/context';
import ExcelViewer from '../qna/chatbot/components/excel-highlighter';
import PdfHighlighterComp from '../qna/chatbot/components/pdf-highlighter';
import ImageHighlighter from '../qna/chatbot/components/image-highlighter';
import MarkdownViewer from '../qna/chatbot/components/markdown-highlighter';
import { getConnectorPublicUrl } from '../accountdetails/account-settings/services/utils/services-configuration-service';

import type { Filters } from './types/knowledge-base';
import type { Thero, SearchResult, AggregatedDocument } from './types/search-response';

const INITIAL_TOP_K = 10;
const MAX_TOP_K = 100;

function getDocumentType(extension: string) {
  if (extension === 'pdf') return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(extension)) return 'excel';
  if (extension === 'docx') return 'docx';
  if (extension === 'html') return 'html';
  if (extension === 'txt') return 'text';
  if (extension === 'md') return 'md';
  if (extension === 'mdx') return 'mdx';
  if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(extension)) return 'image';
  return 'other';
}

export default function KnowledgeBaseSearch() {
  const [filters, setFilters] = useState<Filters>({
    department: [],
    moduleId: [],
    appSpecificRecordType: [],
    app: [],
    kb: [],
  });

  // Get connector data from the hook at parent level for optimal performance
  const { activeConnectors, inactiveConnectors } = useConnectors();
  const allConnectors = [...activeConnectors, ...inactiveConnectors];

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [topK, setTopK] = useState<number>(INITIAL_TOP_K);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [canLoadMore, setCanLoadMore] = useState<boolean>(true);
  const [aggregatedCitations, setAggregatedCitations] = useState<AggregatedDocument[]>([]);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [isExcel, setIsExcel] = useState<boolean>(false);
  const [isDocx, setIsDocx] = useState<boolean>(false);
  const [isHtml, setIsHtml] = useState<boolean>(false);
  const [isMarkdown, setIsMarkdown] = useState<boolean>(false);
  const [isTextFile, setIsTextFile] = useState<boolean>(false);
  const [isImage, setIsImage] = useState<boolean>(false);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [recordCitations, setRecordCitations] = useState<AggregatedDocument | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [recordsMap, setRecordsMap] = useState<Record<string, Thero.Record>>({});
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [highlightedCitation, setHighlightedCitation] = useState<SearchResult | null>();

  // Prevent rapid filter changes
  const isFilterChanging = useRef(false);

  // Keep page filters in sync with URL so global sidebar filters (navbar area) are reflected here
  const parseFiltersFromUrl = useCallback((): Partial<Filters> => {
    const params = new URLSearchParams(window.location.search);
    const parse = (key: keyof Filters): string[] => {
      const values: string[] = [];
      const repeated = params.getAll(String(key));
      if (repeated.length > 0) {
        repeated.forEach((v) => values.push(...v.split(',').filter(Boolean)));
      } else {
        const single = params.get(String(key));
        if (single) values.push(...single.split(',').filter(Boolean));
      }
      return Array.from(new Set(values));
    };
    return {
      app: parse('app'),
      department: parse('department'),
      moduleId: parse('moduleId'),
      appSpecificRecordType: parse('appSpecificRecordType'),
    };
  }, []);

  useEffect(() => {
    // initialize from URL once
    const initial = parseFiltersFromUrl();
    if (
      initial.app?.length ||
      initial.department?.length ||
      initial.moduleId?.length ||
      initial.appSpecificRecordType?.length
    ) {
      setFilters((prev) => ({ ...prev, ...initial }));
    }
    const handler = () => {
      const next = parseFiltersFromUrl();
      setFilters((prev) => ({ ...prev, ...next }));
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [parseFiltersFromUrl]);

  // Add a state to track if citation viewer is open
  const isCitationViewerOpen =
    isPdf || isExcel || isDocx || isHtml || isTextFile || isMarkdown || isImage;

  // Page-level filter changes (if any) would go through URL via the global sidebar; no-op here.

  const aggregateCitationsByRecordId = useCallback(
    (documents: SearchResult[]): AggregatedDocument[] => {
      const aggregationMap = documents.reduce(
        (acc, doc) => {
          const recordId = doc.metadata?.recordId || 'unknown';

          if (!acc[recordId]) {
            acc[recordId] = {
              recordId,
              documents: [],
            };
          }

          acc[recordId].documents.push(doc);
          return acc;
        },
        {} as Record<string, AggregatedDocument>
      );

      return Object.values(aggregationMap);
    },
    []
  );

  const aggregateRecordsByRecordId = useCallback(
    (records: Thero.Record[]): Record<string, Thero.Record> =>
      records.reduce(
        (acc, record) => {
          const recordKey = record._key || 'unknown';
          acc[recordKey] = record;
          return acc;
        },
        {} as Record<string, Thero.Record>
      ),
    []
  );

  const handleSearch = useCallback(async () => {
    // Only proceed if search query is not empty
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setAggregatedCitations([]);
      setCanLoadMore(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const data = await KnowledgeBaseAPI.searchKnowledgeBases(searchQuery, topK, filters);

      const results = data.searchResults || [];
      const recordResult = data.records || [];

      setSearchResults(results);

      // Check if we can load more: if results length is less than topK, no more results available
      const shouldLoadMore = results.length >= topK && topK < MAX_TOP_K;
      setCanLoadMore(shouldLoadMore);

      const recordsLookupMap = aggregateRecordsByRecordId(recordResult);
      setRecordsMap(recordsLookupMap);

      const citations = aggregateCitationsByRecordId(results);
      setAggregatedCitations(citations);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setAggregatedCitations([]);
      setCanLoadMore(false);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, topK, filters, aggregateCitationsByRecordId, aggregateRecordsByRecordId]);

  useEffect(() => {
    // Only trigger search if there's a non-empty query
    if (searchQuery.trim()) {
      handleSearch();
    }
  }, [topK, filters, handleSearch, searchQuery]);

  const handleSearchQueryChange = (query: string): void => {
    setSearchQuery(query);

    // Reset topK and canLoadMore when query changes
    if (query.trim() !== searchQuery.trim()) {
      setTopK(INITIAL_TOP_K);
      setCanLoadMore(true);
    }

    if (!query.trim()) {
      setHasSearched(false);
      setCanLoadMore(false);
    }
  };

  const handleTopKChange = (callback: (prevTopK: number) => number): void => {
    setTopK((prevTopK) => {
      const newTopK = callback(prevTopK);
      // Don't exceed MAX_TOP_K
      return newTopK <= MAX_TOP_K ? newTopK : prevTopK;
    });
  };

  const handleLargePPTFile = (record: any) => {
    if (record.sizeInBytes / 1048576 > 5) {
      throw new Error('Large file size, redirecting to web page');
    }
  };

  const viewCitations = async (
    recordId: string,
    extension: string,
    recordCitation?: SearchResult
  ): Promise<void> => {
    // Reset all document type states
    setIsPdf(false);
    setIsExcel(false);
    setIsDocx(false);
    setIsHtml(false);
    setIsTextFile(false);
    setIsMarkdown(false);
    setIsImage(false);
    setFileBuffer(null);
    setRecordCitations(null);
    setFileUrl('');
    setHighlightedCitation(recordCitation);

    const documentContainer = document.querySelector('#document-container');
    if (documentContainer) {
      documentContainer.innerHTML = '';
    }

    // Close sidebar when showing citation viewer
    // (No local sidebar anymore)

    try {
      const record = recordsMap[recordId];

      if (!record) {
        console.error('Record not found for ID:', recordId);
        toast.error('Record not found. Please try again.');
        return;
      }

      // Find the correct citation from the aggregated data
      const citation = aggregatedCitations.find((item) => item.recordId === recordId);
      if (citation) {
        setRecordCitations(citation);
      }

      let fileDataLoaded = false;

      if (record.origin === ORIGIN.UPLOAD) {
        const fetchRecordId = record.externalRecordId || '';
        if (!fetchRecordId) {
          console.error('No external record ID available');
          toast.error('External record ID not available.');
          return;
        }

        try {
          const response = await axios.get(`/api/v1/document/${fetchRecordId}/download`, {
            responseType: 'blob',
          });

          const reader = new FileReader();
          const textPromise = new Promise<string>((resolve) => {
            reader.onload = () => {
              resolve(reader.result?.toString() || '');
            };
          });

          reader.readAsText(response.data);
          const text = await textPromise;

          let filename;
          const contentDisposition = response.headers['content-disposition'];

          if (contentDisposition) {
            // First try to parse filename*=UTF-8'' format (RFC 5987) for Unicode support
            const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
            if (filenameStarMatch && filenameStarMatch[1]) {
              // Decode the percent-encoded UTF-8 filename
              try {
                filename = decodeURIComponent(filenameStarMatch[1]);
              } catch (e) {
                console.error('Failed to decode UTF-8 filename', e);
              }
            }

            // Fallback to basic filename="..." format if filename* not found
            if (!filename) {
              const filenameMatch = contentDisposition.match(/filename="?([^";\n]*)"?/i);
              if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
              }
            }
          }
          if (!filename && record.recordName) {
            filename = record.recordName;
          }

          try {
            const jsonData = JSON.parse(text);
            if (jsonData && jsonData.signedUrl) {
              setFileUrl(jsonData.signedUrl);
              fileDataLoaded = true;
            }
          } catch (e) {
            const bufferReader = new FileReader();
            const arrayBufferPromise = new Promise<ArrayBuffer>((resolve) => {
              bufferReader.onload = () => {
                resolve(bufferReader.result as ArrayBuffer);
              };
              bufferReader.readAsArrayBuffer(response.data);
            });

            const buffer = await arrayBufferPromise;
            if (buffer && buffer.byteLength > 0) {
              setFileBuffer(buffer);
              fileDataLoaded = true;
            } else {
              throw new Error('Empty buffer received');
            }
          }
        } catch (error) {
          toast.info('Failed to load preview. Redirecting to the original document shortly...');

          let webUrl = record?.webUrl;

          if (record.origin === 'UPLOAD' && webUrl && !webUrl.startsWith('http')) {
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            webUrl = baseUrl + webUrl;
          }

          setTimeout(() => {
            if (webUrl) {
              try {
                window.open(webUrl, '_blank', 'noopener,noreferrer');
              } catch (openError) {
                console.error('Error opening new tab:', openError);
                toast.error(
                  'Failed to automatically open the document. Please check your browser pop-up settings.'
                );
              }
            } else {
              console.error('Cannot redirect: No webUrl found for the record.');
              toast.error('Failed to load preview and cannot redirect (document URL not found).');
            }
          }, 2500);
          return;
        }
      } else if (record.origin === ORIGIN.CONNECTOR) {
        try {
          let params = {};
          if (['pptx', 'ppt'].includes(record?.extension)) {
            params = {
              convertTo: 'pdf',
            };
            handleLargePPTFile(record);
          }

          const publicConnectorUrlResponse = await getConnectorPublicUrl();
          let response;

          if (publicConnectorUrlResponse && publicConnectorUrlResponse.url) {
            const CONNECTOR_URL = publicConnectorUrlResponse.url;
            response = await axios.get(`${CONNECTOR_URL}/api/v1/stream/record/${recordId}`, {
              responseType: 'blob',
              params,
            });
          } else {
            response = await axios.get(
              `${CONFIG.backendUrl}/api/v1/knowledgeBase/stream/record/${recordId}`,
              {
                responseType: 'blob',
                params,
              }
            );
          }

          if (!response) return;

          let filename;
          const contentDisposition = response.headers['content-disposition'];

          if (contentDisposition) {
            // First try to parse filename*=UTF-8'' format (RFC 5987) for Unicode support
            const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
            if (filenameStarMatch && filenameStarMatch[1]) {
              // Decode the percent-encoded UTF-8 filename
              try {
                filename = decodeURIComponent(filenameStarMatch[1]);
              } catch (e) {
                console.error('Failed to decode UTF-8 filename', e);
              }
            }

            // Fallback to basic filename="..." format if filename* not found
            if (!filename) {
              const filenameMatch = contentDisposition.match(/filename="?([^";\n]*)"?/i);
              if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
              }
            }
          }

          if (!filename && record.recordName) {
            filename = record.recordName;
          }

          const bufferReader = new FileReader();
          const arrayBufferPromise = new Promise<ArrayBuffer>((resolve, reject) => {
            bufferReader.onload = () => {
              const originalBuffer = bufferReader.result as ArrayBuffer;
              const bufferCopy = originalBuffer.slice(0);
              resolve(bufferCopy);
            };
            bufferReader.onerror = () => {
              reject(new Error('Failed to read blob as array buffer'));
            };
            bufferReader.readAsArrayBuffer(response.data);
          });

          const buffer = await arrayBufferPromise;
          if (buffer && buffer.byteLength > 0) {
            setFileBuffer(buffer);
            fileDataLoaded = true;
          } else {
            throw new Error('Empty buffer received');
          }
        } catch (err) {
          console.error('Error downloading document:', err);
          toast.info('Failed to load preview. Redirecting to the original document shortly...');

          let webUrl = record?.webUrl;

          if (record.origin === 'UPLOAD' && webUrl && !webUrl.startsWith('http')) {
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            webUrl = baseUrl + webUrl;
          }

          setTimeout(() => {
            if (webUrl) {
              try {
                window.open(webUrl, '_blank', 'noopener,noreferrer');
              } catch (openError) {
                console.error('Error opening new tab:', openError);
                toast.error(
                  'Failed to automatically open the document. Please check your browser pop-up settings.'
                );
              }
            } else {
              console.error('Cannot redirect: No webUrl found for the record.');
              toast.error('Failed to load preview and cannot redirect (document URL not found).');
            }
          }, 2500);

          return;
        }
      }

      // Only set the document type if file data was successfully loaded
      if (fileDataLoaded) {
        const documentType = getDocumentType(extension);
        switch (documentType) {
          case 'pdf':
            setIsPdf(true);
            break;
          case 'excel':
            setIsExcel(true);
            break;
          case 'docx':
            setIsDocx(true);
            break;
          case 'html':
            setIsHtml(true);
            break;
          case 'text':
            setIsTextFile(true);
            break;
          case 'md':
          case 'mdx':
            setIsMarkdown(true);
            break;
          case 'image':
            setIsImage(true);
            break;
          default:
            toast.warning(`Unsupported document type: ${extension}`);
        }
      } else {
        toast.error('No document data was loaded. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching document:', error);
    }
  };

  const handleCloseViewer = () => {
    setIsPdf(false);
    setIsExcel(false);
    setIsHtml(false);
    setIsDocx(false);
    setIsTextFile(false);
    setIsMarkdown(false);
    setIsImage(false);
    setFileBuffer(null);
    setHighlightedCitation(null);
  };

  const renderDocumentViewer = () => {
    if (isPdf && (fileUrl || fileBuffer)) {
      return (
        <PdfHighlighterComp
          key={`pdf-viewer-${recordCitations?.recordId || 'new'}`}
          pdfUrl={fileUrl}
          pdfBuffer={fileBuffer}
          citations={recordCitations?.documents || []}
          highlightCitation={highlightedCitation}
          onClosePdf={handleCloseViewer}
        />
      );
    }

    if (isDocx && (fileUrl || fileBuffer)) {
      return (
        <DocxViewer
          key={`docx-viewer-${recordCitations?.recordId || 'new'}`}
          url={fileUrl}
          buffer={fileBuffer ?? undefined}
          citations={recordCitations?.documents || []}
          highlightCitation={highlightedCitation}
          renderOptions={{
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
          }}
          onClosePdf={handleCloseViewer}
        />
      );
    }

    if (isExcel && (fileUrl || fileBuffer)) {
      return (
        <ExcelViewer
          key={`excel-viewer-${recordCitations?.recordId || 'new'}`}
          fileUrl={fileUrl}
          citations={recordCitations?.documents || []}
          excelBuffer={fileBuffer}
          highlightCitation={highlightedCitation}
          onClosePdf={handleCloseViewer}
        />
      );
    }

    if (isHtml && (fileUrl || fileBuffer)) {
      return (
        <HtmlViewer
          key={`html-viewer-${recordCitations?.recordId || 'new'}`}
          url={fileUrl}
          citations={recordCitations?.documents || []}
          buffer={fileBuffer}
          highlightCitation={highlightedCitation}
          onClosePdf={handleCloseViewer}
        />
      );
    }

    if (isTextFile && (fileUrl || fileBuffer)) {
      return (
        <TextViewer
          key={`text-viewer-${recordCitations?.recordId || 'new'}`}
          url={fileUrl}
          citations={recordCitations?.documents || []}
          buffer={fileBuffer}
          highlightCitation={highlightedCitation}
          onClosePdf={handleCloseViewer}
        />
      );
    }

    if (isMarkdown && (fileUrl || fileBuffer)) {
      return (
        <MarkdownViewer
          key={`markdown-viewer-${recordCitations?.recordId || 'new'}`}
          url={fileUrl}
          citations={recordCitations?.documents || []}
          buffer={fileBuffer}
          highlightCitation={highlightedCitation}
          onClosePdf={handleCloseViewer}
        />
      );
    }

    if (isImage && (fileUrl || fileBuffer)) {
      return (
        <ImageHighlighter
          key={`image-viewer-${recordCitations?.recordId || 'new'}`}
          url={fileUrl}
          buffer={fileBuffer}
          citations={recordCitations?.documents || []}
          highlightCitation={highlightedCitation}
          onClosePdf={handleCloseViewer}
        />
      );
    }

    return null;
  };

  return (
    <div className="flex overflow-hidden bg-background/70 relative">
      <div
        className={cn(
          'max-h-screen w-full transition-all duration-300 flex relative',
          isCitationViewerOpen && 'gap-0'
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 overflow-auto max-h-full',
            isCitationViewerOpen ? 'w-1/2' : 'w-full'
          )}
        >
          <KnowledgeSearch
            searchResults={searchResults}
            loading={loading}
            canLoadMore={canLoadMore}
            onSearchQueryChange={handleSearchQueryChange}
            onTopKChange={handleTopKChange}
            onViewCitations={viewCitations}
            recordsMap={recordsMap}
            allConnectors={allConnectors}
          />
        </div>

        {isCitationViewerOpen && <Separator orientation="vertical" className="h-full" />}

        {isCitationViewerOpen && (
          <div id="document-container" className="w-[65%] h-full relative flex flex-col">
            {renderDocumentViewer()}
          </div>
        )}
      </div>
    </div>
  );
}
