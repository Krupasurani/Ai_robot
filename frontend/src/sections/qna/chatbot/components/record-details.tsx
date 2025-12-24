import type { CustomCitation } from 'src/types/chat-bot';
import type { RecordDetailsResponse } from 'src/sections/knowledgebase/types/record-details';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import { ORIGIN } from 'src/sections/knowledgebase/constants/knowledge-search';
import { getConnectorPublicUrl } from 'src/sections/accountdetails/account-settings/services/utils/services-configuration-service';
import { KnowledgeBaseAPI } from 'src/sections/knowledgebase/services/api';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PDFViewer from './pdf-viewer';
import { RecordHeader } from './record-details/record-header';
import { RecordInfoGrid } from './record-details/record-info-grid';
import { RecordMetadataSection } from './record-details/record-metadata-section';
import { FileRecordDetails } from './record-details/file-record-details';

interface RecordDetailsProps {
  recordId: string;
  citations: CustomCitation[];
  onExternalLink?: string;
}

const RecordDetails = ({ recordId, onExternalLink, citations = [] }: RecordDetailsProps) => {
  const [recordData, setRecordData] = useState<RecordDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer>();

  useEffect(() => {
    if (!recordId) return;

    const fetchRecordDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await KnowledgeBaseAPI.getRecordDetails(recordId);
        setRecordData(data);
      } catch (err) {
        setError('Failed to fetch record details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecordDetails();
  }, [recordId]);

  const handleOpenPDFViewer = async () => {
    const record = recordData?.record;
    if (record?.origin === ORIGIN.UPLOAD) {
      if (record?.externalRecordId) {
        try {
          const { externalRecordId } = record;
          const response = await axios.get(`/api/v1/document/${externalRecordId}/download`, {
            responseType: 'blob',
          });

          // Read the blob response as text to check if it's JSON with signedUrl
          const reader = new FileReader();
          const textPromise = new Promise<string>((resolve) => {
            reader.onload = () => {
              resolve(reader.result?.toString() || '');
            };
          });

          reader.readAsText(response.data);
          const text = await textPromise;

          try {
            // Try to parse as JSON to check for signedUrl property
            const jsonData = JSON.parse(text);
            if (jsonData && jsonData.signedUrl) {
              setPdfUrl(jsonData.signedUrl);
              setIsPDFViewerOpen(true);
              return;
            }
          } catch (e) {
            // Case 2: Local storage - Return buffer
            const bufferReader = new FileReader();
            const arrayBufferPromise = new Promise<ArrayBuffer>((resolve) => {
              bufferReader.onload = () => {
                resolve(bufferReader.result as ArrayBuffer);
              };
              bufferReader.readAsArrayBuffer(response.data);
            });

            const buffer = await arrayBufferPromise;
            setFileBuffer(buffer);
            setIsPDFViewerOpen(true);
            return;
          }

          throw new Error('Invalid response format');
        } catch (err) {
          console.error('Error downloading document:', err);
          throw new Error('Failed to download document');
        }
      }
    } else if (record?.origin === ORIGIN.CONNECTOR) {
      try {
        const publicConnectorUrlResponse = await getConnectorPublicUrl();
        let response;
        if (publicConnectorUrlResponse && publicConnectorUrlResponse.url) {
          const CONNECTOR_URL = publicConnectorUrlResponse.url;
          response = await axios.get(`${CONNECTOR_URL}/api/v1/stream/record/${recordId}`, {
            responseType: 'blob',
          });
        } else {
          response = await axios.get(
            `${CONFIG.backendUrl}/api/v1/knowledgeBase/stream/record/${recordId}`,
            {
              responseType: 'blob',
            }
          );
        }
        if (!response) return;

        // Convert blob directly to ArrayBuffer
        const bufferReader = new FileReader();
        const arrayBufferPromise = new Promise<ArrayBuffer>((resolve, reject) => {
          bufferReader.onload = () => {
            // Create a copy of the buffer to prevent detachment issues
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
        setFileBuffer(buffer);
        setIsPDFViewerOpen(true);
      } catch (err) {
        console.error('Error downloading document:', err);
        throw new Error(`Failed to download document: ${err.message}`);
      }
    }
  };

  const handleClosePDFViewer = () => {
    setIsPDFViewerOpen(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Loading record details...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!recordData) {
    return null;
  }

  const { record, metadata } = recordData;

  let webUrl = record.fileRecord?.webUrl || record.mailRecord?.webUrl;
  if (record.origin === 'UPLOAD' && webUrl && !webUrl.startsWith('http')) {
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    const newWebUrl = baseUrl + webUrl;
    webUrl = newWebUrl;
  }

  return (
    <Card className="mt-4 overflow-hidden">
      {/* Header Section */}
      <RecordHeader
        recordName={record.recordName}
        webUrl={webUrl}
        onExternalLink={onExternalLink}
      />

      <div className="p-6">
        {/* Basic Record Information */}
        <div className="mb-6">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
            Record Information
          </h3>

          <RecordInfoGrid
            record={record}
            knowledgeBase={recordData.knowledgeBase}
            permissions={recordData.permissions}
          />
        </div>

        {/* Metadata Section */}
        {metadata && <RecordMetadataSection metadata={metadata} />}

        {/* File Record Details */}
        {record.fileRecord && (
          <FileRecordDetails fileRecord={record.fileRecord} onViewDocument={handleOpenPDFViewer} />
        )}

        {/* PDF Viewer */}
        {(pdfUrl || fileBuffer) && (
          <PDFViewer
            open={isPDFViewerOpen}
            onClose={handleClosePDFViewer}
            pdfUrl={pdfUrl}
            pdfBuffer={fileBuffer}
            fileName={record.fileRecord?.name || 'Document'}
          />
        )}
      </div>
    </Card>
  );
};

export default RecordDetails;
