import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { KnowledgeBaseAPI } from 'src/sections/knowledgebase/services/api';
import { ORIGIN } from 'src/sections/knowledgebase/constants/knowledge-search';
import { getConnectorPublicUrl } from 'src/sections/accountdetails/account-settings/services/utils/services-configuration-service';
import DocxViewer from 'src/sections/qna/chatbot/components/docx-highlighter';
import HtmlViewer from 'src/sections/qna/chatbot/components/html-highlighter';
import TextViewer from 'src/sections/qna/chatbot/components/text-highlighter';
import ExcelViewer from 'src/sections/qna/chatbot/components/excel-highlighter';
import PdfHighlighterComp from 'src/sections/qna/chatbot/components/pdf-highlighter';
import ImageHighlighter from 'src/sections/qna/chatbot/components/image-highlighter';
import MarkdownViewer from 'src/sections/qna/chatbot/components/markdown-highlighter';
import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import type { RecordDetailsResponse } from 'src/sections/knowledgebase/types/record-details';

function getDocumentType(extension: string, recordType?: string) {
    if (recordType === 'MAIL') return 'html';
    if (extension === 'pdf') return 'pdf';
    if (['xlsx', 'xls', 'csv'].includes(extension)) return 'excel';
    if (extension === 'docx') return 'docx';
    if (extension === 'html') return 'html';
    if (extension === 'txt') return 'text';
    if (['md', 'mdx'].includes(extension)) return 'md';
    if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(extension)) return 'image';
    return 'other';
}

export default function RecordViewerPage() {
    const { recordId } = useParams<{ recordId: string }>();
    const [recordData, setRecordData] = useState<RecordDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [documentState, setDocumentState] = useState<{
        type: string | null;
        url: string;
        buffer: ArrayBuffer | null;
    }>({ type: null, url: '', buffer: null });
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!recordId) {
                    setError('No record ID provided');
                    setLoading(false);
                    return;
                }
                const data = await KnowledgeBaseAPI.getRecordDetails(recordId);
                setRecordData(data);
            } catch (err) {
                console.error('Error loading document:', err);
                setError('Failed to load document');
                setLoading(false);
            }
        };

        fetchData();
    }, [recordId]);

    useEffect(() => {
        if (!recordData || hasLoadedRef.current) return;

        const loadDocument = async () => {
            hasLoadedRef.current = true;
            const { record } = recordData;

            try {
                const extension = record.fileRecord?.extension || 'eml';
                const documentType = getDocumentType(extension, record.recordType);

                if (!['pdf', 'excel', 'docx', 'html', 'text', 'md', 'image'].includes(documentType)) {
                    setError(`Unsupported document type: ${extension}`);
                    setLoading(false);
                    return;
                }

                let loadedFileUrl = '';
                let loadedFileBuffer: ArrayBuffer | null = null;

                if (record.origin === ORIGIN.UPLOAD) {
                    const downloadResponse = await axios.get(
                        `/api/v1/document/${record.externalRecordId}/download`,
                        { responseType: 'blob' }
                    );

                    const reader = new FileReader();
                    const text = await new Promise<string>((resolve) => {
                        reader.onload = () => resolve(reader.result?.toString() || '');
                        reader.readAsText(downloadResponse.data);
                    });

                    try {
                        const jsonData = JSON.parse(text);
                        if (jsonData?.signedUrl) {
                            loadedFileUrl = jsonData.signedUrl;
                        }
                    } catch {
                        const bufferReader = new FileReader();
                        loadedFileBuffer = await new Promise<ArrayBuffer>((resolve) => {
                            bufferReader.onload = () => resolve(bufferReader.result as ArrayBuffer);
                            bufferReader.readAsArrayBuffer(downloadResponse.data);
                        });
                    }
                } else if (record.origin === ORIGIN.CONNECTOR) {
                    let params = {};
                    if (record?.fileRecord && ['pptx', 'ppt'].includes(record.fileRecord.extension)) {
                        params = { convertTo: 'pdf' };
                    }

                    const publicConnectorUrlResponse = await getConnectorPublicUrl();
                    let connectorResponse;

                    if (publicConnectorUrlResponse?.url) {
                        connectorResponse = await axios.get(
                            `${publicConnectorUrlResponse.url}/api/v1/stream/record/${record._key}`,
                            { responseType: 'blob', params }
                        );
                    } else {
                        connectorResponse = await axios.get(
                            `${CONFIG.backendUrl}/api/v1/knowledgeBase/stream/record/${record._key}`,
                            { responseType: 'blob', params }
                        );
                    }

                    const bufferReader = new FileReader();
                    loadedFileBuffer = await new Promise<ArrayBuffer>((resolve) => {
                        bufferReader.onload = () => {
                            const originalBuffer = bufferReader.result as ArrayBuffer;
                            resolve(originalBuffer.slice(0));
                        };
                        bufferReader.readAsArrayBuffer(connectorResponse.data);
                    });
                }

                setDocumentState({ type: documentType, url: loadedFileUrl, buffer: loadedFileBuffer });
                setLoading(false);
            } catch (err) {
                console.error('Error loading document:', err);
                setError('Failed to load document');
                setLoading(false);
                toast.error('Failed to load document');
            }
        };

        loadDocument();
    }, [recordData]);

    const handleClose = () => {
        window.close();
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center w-full h-screen gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
        );
    }

    if (error || !recordData || !documentState.type) {
        return (
            <div className="flex flex-col justify-center items-center w-full h-screen">
                <Card className="p-8 text-center rounded-lg shadow-sm max-w-md">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-destructive mb-2">
                        {error || 'Document not found'}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                        {error || "The requested document could not be found or you don't have permission to view it."}
                    </p>
                    <Button onClick={handleClose} variant="outline">
                        Close
                    </Button>
                </Card>
            </div>
        );
    }

    const { type, url, buffer } = documentState;
    const commonProps = {
        onClosePdf: handleClose,
    };

    const renderViewer = () => {
        switch (type) {
            case 'pdf':
                return <PdfHighlighterComp {...commonProps} pdfUrl={url} pdfBuffer={buffer} citations={[]} />;
            case 'docx':
                return (
                    <DocxViewer
                        {...commonProps}
                        url={url}
                        buffer={buffer ?? undefined}
                        citations={[]}
                        renderOptions={{ breakPages: true, renderHeaders: true, renderFooters: true }}
                    />
                );
            case 'excel':
                return <ExcelViewer {...commonProps} fileUrl={url} citations={[]} excelBuffer={buffer} />;
            case 'html':
                return <HtmlViewer {...commonProps} url={url} citations={[]} buffer={buffer} />;
            case 'text':
                return <TextViewer {...commonProps} url={url} citations={[]} buffer={buffer} />;
            case 'md':
                return <MarkdownViewer {...commonProps} url={url} citations={[]} buffer={buffer} />;
            case 'image':
                return <ImageHighlighter {...commonProps} url={url} buffer={buffer} citations={[]} />;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-background flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold truncate">{recordData.record.recordName}</h3>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                    <X className="h-5 w-5" />
                </Button>
            </div>
            <div className="flex-1 overflow-hidden">{renderViewer()}</div>
        </div>
    );
}
