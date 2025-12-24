import type { CustomCitation } from 'src/types/chat-bot';
import type {
  SearchResult,
  DocumentContent,
} from 'src/sections/knowledgebase/types/search-response';

import * as XLSX from 'xlsx';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import {
  X,
  Rows3,
  Maximize2,
  Minimize2,
  Quote,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence, m } from 'framer-motion';

type ExcelViewerProps = {
  citations: DocumentContent[] | CustomCitation[];
  fileUrl: string | null;
  excelBuffer?: ArrayBuffer | null;
  highlightCitation?: SearchResult | CustomCitation | null;
  onClosePdf: () => void;
};

interface TableRowType {
  [key: string]: React.ReactNode;
  __rowNum?: number;
  __isHeaderRow?: boolean;
  __sheetName?: string;
}

interface RichTextStyle {
  fontWeight?: 'bold';
  fontStyle?: 'italic';
  textDecoration?: 'underline' | 'line-through';
  color?: string;
}

interface RichTextFragment {
  t: string;
  s?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    color?: {
      rgb: string;
    };
  };
}

interface CellData {
  r?: RichTextFragment[];
  w?: string;
  v?: string | number;
  s?: any;
}

interface WorkbookData {
  [sheetName: string]: {
    headers: string[];
    data: TableRowType[];
    headerRowIndex: number;
    totalColumns: number;
    hiddenColumns: number[];
    visibleColumns: number[];
    columnMapping: { [key: number]: number };
    originalTotalColumns: number;
  };
}

// Styled components for Excel-like appearance (from paste 1)
// Helper component for loading overlay
const FullLoadingOverlay = ({
  isVisible,
  message = 'Loading...',
}: {
  isVisible: boolean;
  message?: string;
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-[1500] gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
};

const ExcelViewer = ({
  citations,
  fileUrl,
  excelBuffer,
  highlightCitation,
  onClosePdf,
}: ExcelViewerProps) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [sheetTransition, setSheetTransition] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [workbookData, setWorkbookData] = useState<WorkbookData | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading Excel file...');

  const tableRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const lastSelectedSheet = useRef<string>(selectedSheet);
  const animationFrameRef = useRef<number | null>(null);

  const isDarkMode = document.documentElement.classList.contains('dark');

  // Store mapping between original Excel row numbers and displayed indices
  const [rowMapping, setRowMapping] = useState<Map<number, number>>(new Map());

  const getColumnWidth = useCallback((columnIndex: number, headerValue: string) => {
    let width = 120;
    if (headerValue && typeof headerValue === 'string') {
      const headerLength = headerValue.length;
      if (headerLength > 20) width = 180;
      else if (headerLength > 15) width = 150;
      else if (headerLength < 8) width = 100;
    }
    return `${Math.min(Math.max(width, 80), 200)}px`;
  }, []);

  // Handle sheet transitions
  useEffect(() => {
    if (selectedSheet !== lastSelectedSheet.current && workbookData && isInitialized) {
      setSheetTransition(true);
      setLoadingMessage('Switching sheets...');

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        setTimeout(() => {
          setSheetTransition(false);
          lastSelectedSheet.current = selectedSheet;
        }, 150);
      });
    }
  }, [selectedSheet, workbookData, isInitialized]);

  const handleFullscreenChange = useCallback((): void => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleFullscreenChange]);

  const toggleFullscreen = useCallback(async (): Promise<void> => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  }, []);

  const renderCellValue = useCallback((value: any, returnFullValue = false): string => {
    if (value == null || value === undefined) return '';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);

    const stringValue = String(value).trim();
    if (returnFullValue) return stringValue;
    return `${stringValue.length > 50 ? `${stringValue.substring(0, 47)}...` : stringValue}`;
  }, []);

  // Type guard function for Date checking
  const isDate = (value: any): value is Date =>
    value instanceof Date ||
    (typeof value === 'object' && Object.prototype.toString.call(value) === '[object Date]');

  const processRichText = useCallback(
    (cell: CellData): React.ReactNode => {
      if (!cell) return '';

      try {
        if (cell.r && Array.isArray(cell.r)) {
          return (
            <div className="rich-text-container">
              {cell.r.map((fragment: RichTextFragment, index: number) => {
                const styles: RichTextStyle = {};
                if (fragment.s) {
                  if (fragment.s.bold) styles.fontWeight = 'bold';
                  if (fragment.s.italic) styles.fontStyle = 'italic';
                  if (fragment.s.underline) styles.textDecoration = 'underline';
                  if (fragment.s.strike) styles.textDecoration = 'line-through';
                  if (fragment.s.color?.rgb) {
                    if (isDarkMode && fragment.s.color.rgb.toLowerCase() === '000000') {
                      // Use CSS variable for theme-aware text color
                      styles.color = 'hsl(var(--foreground))';
                    } else {
                      styles.color = `#${fragment.s.color.rgb}`;
                    }
                  }
                }
                return (
                  <span key={index} style={styles}>
                    {fragment.t}
                  </span>
                );
              })}
            </div>
          );
        }

        if (cell.w) return String(cell.w).trim();
        if (cell.v !== undefined && cell.v !== null) {
          // Fix: Type-safe date check using type guard
          if (isDate(cell.v)) {
            return cell.v.toLocaleDateString();
          }
          if (typeof cell.v === 'number') return cell.v.toString();
          return String(cell.v).trim();
        }
      } catch (err) {
        console.warn('Error processing rich text:', err);
      }

      return '';
    },
    [isDarkMode]
  );

  const processExcelData = useCallback(
    async (workbook: XLSX.WorkBook): Promise<void> => {
      if (processingRef.current || !mountedRef.current) return;
      processingRef.current = true;

      try {
        setLoadingMessage('Processing Excel data...');
        const processedWorkbook: WorkbookData = {};
        const totalSheets = workbook.SheetNames.length;
        const newRowMapping = new Map<number, number>();

        for (let sheetIndex = 0; sheetIndex < totalSheets; sheetIndex += 1) {
          if (!mountedRef.current) break;

          const sheetName = workbook.SheetNames[sheetIndex];
          setLoadingMessage(`Processing sheet ${sheetIndex + 1} of ${totalSheets}...`);

          const worksheet = workbook.Sheets[sheetName];
          // eslint-disable-next-line
          if (!worksheet['!ref']) continue;

          const range = XLSX.utils.decode_range(worksheet['!ref']);
          const headerRowIndex = range.s.r;

          // Track hidden rows for this sheet
          const hiddenRows = new Set<number>();
          if (worksheet['!rows']) {
            worksheet['!rows'].forEach((row, index) => {
              if (row?.hidden) hiddenRows.add(index + range.s.r);
            });
          }

          const actualCols = range.e.c + 1;
          const maxAllowedCols = 1000;
          const totalCols = Math.min(Math.max(actualCols, 13), maxAllowedCols);

          // Get visible columns (no hidden column detection for now)
          const visibleColumns = Array.from({ length: totalCols }, (_, i) => i);
          const hiddenColumns: number[] = [];

          // Read headers
          const headers = visibleColumns.map((colIndex) => {
            const cellAddress = XLSX.utils.encode_cell({
              r: headerRowIndex,
              c: colIndex,
            });
            const cell = worksheet[cellAddress] as CellData;
            const actualCellValue = processRichText(cell);

            return actualCellValue && actualCellValue.toString().trim() !== ''
              ? actualCellValue.toString().trim()
              : `Column ${String.fromCharCode(65 + colIndex)}`;
          });

          // Process all rows including the header row
          const data: TableRowType[] = [];
          const MAX_ROWS_TO_DISPLAY = 100000; // Adjust as needed
          const maxRows = Math.min(range.e.r + 2, headerRowIndex + MAX_ROWS_TO_DISPLAY);
          let displayIndex = 0;

          for (let rowIndex = headerRowIndex; rowIndex < maxRows; rowIndex += 1) {
            const excelRowNum = rowIndex + 1;

            // Skip hidden rows
            // eslint-disable-next-line
            if (hiddenRows.has(rowIndex)) continue;

            const rowData: TableRowType = {
              __rowNum: excelRowNum,
              __isHeaderRow: rowIndex === headerRowIndex,
              __sheetName: sheetName,
            };

            visibleColumns.forEach((colIndex, visibleIndex) => {
              const cellAddress = XLSX.utils.encode_cell({
                r: rowIndex,
                c: colIndex,
              });
              const cell = worksheet[cellAddress] as CellData;
              const cellValue = processRichText(cell);
              const headerKey = headers[visibleIndex];
              rowData[headerKey] = cellValue;
            });

            // Map the original Excel row number to the display index for this sheet
            newRowMapping.set(excelRowNum, displayIndex);
            displayIndex += 1;

            data.push(rowData);
          }

          processedWorkbook[sheetName] = {
            headers,
            data,
            headerRowIndex: headerRowIndex + 1,
            totalColumns: visibleColumns.length,
            hiddenColumns,
            visibleColumns,
            columnMapping: Object.fromEntries(visibleColumns.map((col, idx) => [idx, col])),
            originalTotalColumns: totalCols,
          };
        }

        if (mountedRef.current) {
          setWorkbookData(processedWorkbook);
          const sheets = Object.keys(processedWorkbook);
          setAvailableSheets(sheets);
          if (sheets.length > 0 && !selectedSheet) {
            setSelectedSheet(sheets[0]);
          }
          setRowMapping(newRowMapping);
          setIsInitialized(true);
          setLoadingMessage('Excel data loaded successfully!');
        }
      } catch (err: any) {
        if (mountedRef.current) {
          console.error('Excel processing error:', err);
          throw new Error(`Error processing Excel data: ${err.message}`);
        }
      } finally {
        processingRef.current = false;
      }
    },
    // eslint-disable-next-line
    [processRichText]
  );

  const loadExcelFile = useCallback(async (): Promise<void> => {
    if (!fileUrl && !excelBuffer) return;

    try {
      setLoading(true);
      setError(null);
      setLoadingMessage('Downloading Excel file...');

      let workbook: XLSX.WorkBook;
      const xlsxOptions = {
        type: 'array' as const,
        cellFormula: false,
        cellHTML: false,
        cellStyles: true,
        cellText: false,
        cellDates: true,
        cellNF: false,
        sheetStubs: false,
        WTF: false,
        raw: false,
        dense: false,
      };

      if (excelBuffer) {
        setLoadingMessage('Processing Excel buffer...');
        const bufferCopy = excelBuffer.slice(0);
        workbook = XLSX.read(new Uint8Array(bufferCopy), xlsxOptions);
      } else if (fileUrl) {
        setLoadingMessage('Fetching Excel file...');
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!mountedRef.current) return;

        setLoadingMessage('Reading Excel file...');
        workbook = XLSX.read(arrayBuffer, xlsxOptions);
      } else {
        throw new Error('No data source provided');
      }

      if (!mountedRef.current) return;

      workbookRef.current = workbook;
      await processExcelData(workbook);
    } catch (err: any) {
      if (mountedRef.current) {
        setError(`Error loading Excel file: ${err.message}`);
        setLoadingMessage('Failed to load Excel file');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fileUrl, excelBuffer, processExcelData]);

  const currentSheetData = useMemo(() => {
    if (!workbookData || !selectedSheet || !workbookData[selectedSheet]) {
      return { headers: [], data: [] };
    }
    return workbookData[selectedSheet];
  }, [workbookData, selectedSheet]);

  // Updated to use rowMapping to find the correct row to scroll to
  const scrollToRow = useCallback(
    (originalRowNum: number, targetSheetName?: string): void => {
      if (!tableRef.current || !mountedRef.current) return;

      // If target sheet is different from current, switch sheets first
      if (targetSheetName && targetSheetName !== selectedSheet) {
        setSelectedSheet(targetSheetName);
        // Schedule the scroll after sheet switch
        setTimeout(() => scrollToRow(originalRowNum), 300);
        return;
      }

      // Find the index of the row element in the table that corresponds to this original row number
      const displayIndex = Array.from(rowMapping.entries()).find(
        ([orig, index]) => orig === originalRowNum
      )?.[1];

      if (displayIndex === undefined) {
        console.warn(`Could not find table row for Excel row number ${originalRowNum}`);
        return;
      }

      const tableRows = tableRef.current.getElementsByTagName('tr');
      // Account for header row (+1) and zero-indexing adjustment (+1)
      const rowIndex = displayIndex + 2;

      if (tableRows[rowIndex]) {
        requestAnimationFrame(() => {
          if (!mountedRef.current) return;

          tableRows[rowIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        });
      }
    },
    [rowMapping, selectedSheet]
  );

  const handleCitationClick = useCallback(
    (citation: DocumentContent): void => {
      if (!mountedRef.current) return;
      const { blockNum, extension, sheetName } = citation.metadata;
      if (blockNum[0]) {
        const highlightedRowNum = extension === 'csv' ? blockNum[0] + 1 : blockNum[0];

        setSelectedCitation(citation.metadata._id);
        setHighlightedRow(highlightedRowNum);
        scrollToRow(highlightedRowNum, sheetName);
      }
    },
    [scrollToRow]
  );

  const handleSheetChange = useCallback(
    (newValue: string) => {
      if (newValue !== selectedSheet) {
        setSheetTransition(true);
        setSelectedSheet(newValue);
      }
    },
    [selectedSheet]
  );

  const getHeaderRowInfo = useMemo(() => {
    if (!workbookData || !selectedSheet || !workbookData[selectedSheet]) {
      return null;
    }
    return workbookData[selectedSheet].headerRowIndex || null;
  }, [workbookData, selectedSheet]);

  // Handle initial load and cleanup
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      workbookRef.current = null;
    };
  }, []);

  // Handle file URL or buffer changes
  useEffect(() => {
    setWorkbookData(null);
    setError(null);
    setIsInitialized(false);
    setAvailableSheets([]);
    setSelectedSheet('');
    setHighlightedRow(null);
    setSelectedCitation(null);
    setRowMapping(new Map());
    loadExcelFile();
  }, [fileUrl, excelBuffer, loadExcelFile]);

  // Handle initial citation highlight
  useEffect(() => {
    if (!isInitialized || !citations.length || highlightedRow || !mountedRef.current) {
      return;
    }
    const sourceCitation = highlightCitation?.metadata || citations[0].metadata;
    const { blockNum, extension, sheetName } = sourceCitation;

    if (!blockNum || !blockNum.length) {
      return;
    }

    const highlightedRowNum = extension === 'csv' ? blockNum[0] + 1 : blockNum[0];

    setHighlightedRow(highlightedRowNum);
    setSelectedCitation(sourceCitation._id);

    // Switch to the correct sheet if needed, then scroll
    if (sheetName && sheetName !== selectedSheet) {
      setSelectedSheet(sheetName);
      setTimeout(() => scrollToRow(highlightedRowNum), 300);
    } else {
      scrollToRow(highlightedRowNum);
    }
  }, [citations, isInitialized, highlightedRow, scrollToRow, highlightCitation, selectedSheet]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading Excel data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full w-full bg-background overflow-hidden', 'fullscreen:p-4')}
    >
      <FullLoadingOverlay isVisible={loading} message={loadingMessage} />
      <FullLoadingOverlay isVisible={sheetTransition && !loading} message="Switching sheets..." />

      <div className="flex h-full w-full overflow-hidden bg-background border border-border">
        <div className="flex-1 flex flex-col w-full overflow-auto">
          {workbookData && Object.keys(workbookData).length > 1 && (
            <div className="border-b border-border mb-0">
              <Tabs
                value={selectedSheet || ''}
                onValueChange={handleSheetChange}
                className="w-full"
              >
                <TabsList className="h-9 w-full justify-start bg-muted/30 rounded-none border-b border-border">
                  {Object.keys(workbookData).map((sheetName) => (
                    <TabsTrigger
                      key={sheetName}
                      value={sheetName}
                      className="text-xs font-medium px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                    >
                      {sheetName}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!sheetTransition && !loading && (
              <m.div
                key={selectedSheet}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <div ref={tableRef} className={cn('overflow-auto h-full w-full')}>
                  <table
                    className={cn(
                      'w-max min-w-full border-collapse table-fixed',
                      'bg-background font-sans'
                    )}
                  >
                    <thead className="sticky top-0 z-10">
                      {/* Column Letter Headers */}
                      <tr>
                        <th
                          className={cn(
                            'sticky left-0 top-0 z-[11] bg-muted text-center',
                            'min-w-[50px] w-[50px] px-1 py-1.5',
                            'border-b border-r border-border',
                            'text-[10px] font-semibold text-muted-foreground'
                          )}
                        >
                          Col
                        </th>
                        {currentSheetData.headers.map((header, index) => {
                          const columnWidth = getColumnWidth(index, header);
                          const actualColumnLetter = String.fromCharCode(65 + index);

                          return (
                            <th
                              key={index}
                              className={cn(
                                'sticky top-0 z-[11] bg-muted text-center',
                                'px-1 py-1.5 border-b border-r border-border',
                                'text-[11px] font-medium text-muted-foreground'
                              )}
                              style={{ width: columnWidth, minWidth: columnWidth }}
                            >
                              {actualColumnLetter}
                            </th>
                          );
                        })}
                      </tr>

                      {/* Actual Header Row */}
                      <tr>
                        <th
                          className={cn(
                            'sticky left-0 z-[10] bg-muted/80 text-center',
                            'min-w-[50px] w-[50px] px-2 py-2',
                            'border-b-2 border-r border-border',
                            'text-[11px] font-semibold text-foreground',
                            'top-[32px]'
                          )}
                        >
                          Header Row {getHeaderRowInfo ? `(${getHeaderRowInfo})` : ''}
                        </th>
                        {currentSheetData.headers.map((header, index) => {
                          const columnWidth = getColumnWidth(index, header);
                          const displayHeaderValue = renderCellValue(header);
                          const fullHeaderValue = renderCellValue(header, true);
                          const isHeaderTruncated =
                            displayHeaderValue !== fullHeaderValue ||
                            displayHeaderValue.includes('...');
                          const hasHeaderContent = fullHeaderValue && fullHeaderValue.trim() !== '';

                          return (
                            <th
                              key={index}
                              className={cn(
                                'sticky z-[10] text-left px-2 py-2',
                                'border-b-2 border-r border-border',
                                'text-[11px] font-semibold',
                                'overflow-hidden whitespace-nowrap text-ellipsis',
                                'top-[32px]',
                                hasHeaderContent
                                  ? 'bg-muted/80 text-foreground'
                                  : 'bg-muted/50 text-muted-foreground'
                              )}
                              style={{ width: columnWidth, minWidth: columnWidth }}
                            >
                              {hasHeaderContent ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={cn(
                                        'block cursor-help',
                                        isHeaderTruncated && 'hover:bg-muted/50'
                                      )}
                                    >
                                      {displayHeaderValue}
                                    </span>
                                  </TooltipTrigger>
                                  {isHeaderTruncated && (
                                    <TooltipContent
                                      side="top"
                                      className="max-w-[300px] text-xs break-words whitespace-pre-wrap bg-popover text-popover-foreground"
                                    >
                                      {fullHeaderValue}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground italic">(Empty)</span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {currentSheetData.data.map((row, displayIndex) => {
                        const isHeaderRow = row.__isHeaderRow;
                        const isHighlighted = row.__rowNum === highlightedRow;

                        return (
                          <tr
                            key={`${selectedSheet}-${displayIndex}`}
                            className={cn(
                              'transition-colors',
                              isHighlighted
                                ? 'bg-primary/10 hover:bg-primary/15'
                                : 'hover:bg-muted/50'
                            )}
                          >
                            <td
                              className={cn(
                                'sticky left-0 z-[2] text-center',
                                'min-w-[50px] w-[50px] px-1 py-1.5',
                                'border-b border-r border-border',
                                'text-[11px] font-medium text-muted-foreground',
                                isHeaderRow ? 'bg-muted/80 font-semibold' : 'bg-muted'
                              )}
                            >
                              {row.__rowNum}
                            </td>
                            {currentSheetData.headers.map((header, colIndex) => {
                              const columnWidth = getColumnWidth(colIndex, header);
                              const cellValue = row[header];
                              const displayValue = renderCellValue(cellValue);
                              const fullValue = renderCellValue(cellValue, true);
                              const isTruncated =
                                displayValue !== fullValue || displayValue.includes('...');

                              return (
                                <td
                                  key={`${selectedSheet}-${displayIndex}-${colIndex}`}
                                  className={cn(
                                    'px-2 py-1.5 border-b border-r border-border',
                                    'text-xs text-foreground',
                                    'overflow-hidden whitespace-nowrap text-ellipsis',
                                    'align-top',
                                    isHeaderRow
                                      ? 'bg-muted/80 font-semibold'
                                      : isHighlighted
                                        ? 'bg-primary/10'
                                        : 'bg-background',
                                    'hover:bg-muted/50'
                                  )}
                                  style={{ width: columnWidth, minWidth: columnWidth }}
                                >
                                  {isTruncated ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block cursor-help">{displayValue}</span>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-[400px] text-xs break-words whitespace-pre-wrap bg-popover text-popover-foreground"
                                      >
                                        {fullValue}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    displayValue
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {citations.length > 0 && (
          <div className="w-[300px] border-l border-border h-full flex flex-col bg-muted/30 dark:bg-muted/20 overflow-hidden flex-shrink-0">
            {/* Sidebar Header - Thero UI inspired */}
            <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/50">
              <Quote className="h-5 w-5 text-primary" />
              <h6 className="text-base font-semibold text-foreground flex-1">Citations</h6>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="h-8 w-8 bg-background/90 hover:bg-background border border-border shadow-sm"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Maximize2 className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                </TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClosePdf}
                className="h-8 px-3 text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/20 ml-1"
              >
                Close
                <X className="h-4 w-4 ml-1.5" />
              </Button>
            </div>

            {/* Citations List - Thero UI inspired */}
            <div className={cn('flex-1 overflow-auto p-3')}>
              {citations.map((citation, index) => {
                const doc = (citation as any)?.citationData
                  ? ((citation as any).citationData as DocumentContent)
                  : (citation as DocumentContent);
                const isSelected = selectedCitation === doc.metadata._id;

                return (
                  <div
                    key={doc.metadata._id || index}
                    onClick={() => handleCitationClick(doc)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCitationClick(doc);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'cursor-pointer relative p-3 rounded-md mb-2 transition-all duration-200',
                      'border border-transparent',
                      isSelected
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'hover:bg-muted/50 hover:border-border'
                    )}
                  >
                    <div>
                      <h4
                        className={cn(
                          'text-sm font-semibold mb-1',
                          isSelected ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        Citation{' '}
                        {(citation as any)?.chunkIndex ? (citation as any).chunkIndex : index + 1}
                      </h4>

                      <p className="text-xs leading-relaxed text-foreground/85 mt-1 relative pl-3 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary before:rounded-sm">
                        {doc.metadata?.blockText &&
                        typeof doc.metadata?.blockText === 'string' &&
                        doc.metadata?.blockText.length > 0
                          ? doc.metadata?.blockText
                          : doc.content}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {doc.metadata.sheetName && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-medium px-2 py-0.5 bg-muted text-muted-foreground border border-border"
                          >
                            <FileSpreadsheet className="h-3 w-3 mr-1" />
                            {doc.metadata.sheetName}
                          </Badge>
                        )}

                        {doc.metadata.blockNum && doc.metadata.blockNum[0] && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-medium px-2 py-0.5 bg-muted text-muted-foreground border border-border"
                          >
                            <Rows3 className="h-3 w-3 mr-1" />
                            {doc.metadata.extension === 'csv'
                              ? `Row ${doc.metadata.blockNum[0] + 1}`
                              : `Row ${doc.metadata.blockNum[0]}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelViewer;
