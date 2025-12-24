// RecordDetails.js - Modified to display both file and mail records
import type { User } from 'src/context/UserContext';

import ReactMarkdown from 'react-markdown';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bot,
  X,
  Pencil,
  RefreshCw,
  ExternalLink,
  Database,
  Clock,
  Mail,
  ArrowLeft,
  Info,
  Trash2,
  FileText,
  AlertCircle,
  Cloud,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { getRecordIcon, EmailIcon } from './components/file-type-icons';
import { formatFileSize as formatFileSizeUtil } from './utils/format';
import { getStatusColor, getStatusLabel } from './utils/status';
import { RecordActionButton } from './components/record-action-button';
import { RecordReindexButton } from './components/record-reindex-button';
import { RecordDetailsSidebar } from './components/record-details-sidebar';

import axios from 'src/utils/axios';

import { useTranslate } from 'src/locales';
import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { useUsers } from 'src/context/UserContext';

import RecordSalesAgent from './ask-me-anything';
import { KnowledgeBaseAPI } from './services/api';
import RecordDocumentViewer from './show-documents';
import EditRecordDialog from './edit-record-dialog';
import DeleteRecordDialog from './delete-record-dialog';

import type { Permissions, RecordDetailsResponse } from './types/record-details';

const getReindexButtonText = (status: string): string => {
  switch (status) {
    case 'FAILED':
      return 'Retry Indexing';
    case 'FILE_TYPE_NOT_SUPPORTED':
      return 'File Not Supported';
    case 'AUTO_INDEX_OFF':
      return 'Enable Indexing';
    case 'NOT_STARTED':
      return 'Start Indexing';
    default:
      return 'Reindex';
  }
};

const getReindexTooltip = (status: string): string => {
  switch (status) {
    case 'FAILED':
      return 'Document indexing failed. Click to retry.';
    case 'FILE_TYPE_NOT_SUPPORTED':
      return 'This file type is not supported for indexing';
    case 'AUTO_INDEX_OFF':
      return 'Document indexing is turned off';
    case 'NOT_STARTED':
      return 'Document indexing has not started yet';
    case 'IN_PROGRESS':
      return 'Document is currently being indexed';
    case 'COMPLETED':
      return 'Document has been successfully indexed. Click to reindex.';
    default:
      return 'Reindex document to update search indexes';
  }
};

export default function RecordDetails() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslate('navbar');
  const [recordData, setRecordData] = useState<RecordDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const users = useUsers() as User[];
  const [isRecordConnector, setIsRecordConnector] = useState<boolean>(false);
  const [isSummaryDialogOpen, setSummaryDialogOpen] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isReindexing, setIsReindexing] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!recordId) return;
        const data = await KnowledgeBaseAPI.getRecordDetails(recordId);
        setRecordData(data);
        if (data.record.origin === 'CONNECTOR') {
          setIsRecordConnector(true);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [recordId]);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const refreshRecordData = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      if (!recordId) return;
      const data = await KnowledgeBaseAPI.getRecordDetails(recordId);
      setRecordData(data);
    } catch (error) {
      console.error('Error refreshing record data:', error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const handleDeleteRecord = () => {
    // Redirect to global records list page after successful deletion
    navigate(paths.dashboard.knowledgebase.records);
  };

  const handleRetryIndexing = async (recId: string) => {
    setIsReindexing(true);
    try {
      const response = await axios.post(
        `${CONFIG.backendUrl}/api/v1/knowledgeBase/reindex/record/${recId}`
      );
      if (response.data.success) {
        toast.success('File indexing started');
        // Refresh the record data to show updated status without showing the global loader
        await refreshRecordData(false);
      } else {
        toast.error('Failed to start reindexing');
      }
    } catch (error) {
      console.log('error in re indexing', error);
      toast.error('Failed to start reindexing');
    } finally {
      setIsReindexing(false);
    }
  };

  const handleShowSummary = async () => {
    if (!record.summaryDocumentId) return;

    setSummaryLoading(true);
    setSummaryDialogOpen(true);

    try {
      const response = await axios.get(
        `${CONFIG.backendUrl}/api/v1/document/${record.summaryDocumentId}/download`
      );

      if (response.data && response.data.summary) {
        setSummary(response.data.summary);
      } else {
        setSummary('No summary available for this document.');
      }
    } catch (error) {
      console.error('Error fetching document summary:', error);
      setSummary('Failed to load document summary. Please try again later.');
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center w-full h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading record details...</p>
      </div>
    );
  }

  if (!recordData || !recordData.record) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card className="p-8 text-center rounded-lg shadow-sm">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-destructive mb-2">Record not found</h2>
          <p className="text-muted-foreground mb-6">
            The requested record could not be found or you don&apos;t have permission to view it.
          </p>
          <Button variant="default" onClick={() => navigate(-1)} className="mt-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const { record, knowledgeBase, permissions, metadata } = recordData;
  const createdAt = new Date(record.sourceCreatedAtTimestamp).toLocaleString();
  const updatedAt = new Date(record.sourceLastModifiedTimestamp).toLocaleString();

  // Check record type
  const isFileRecord = record.recordType === 'FILE' && record.fileRecord;
  const isMailRecord = record.recordType === 'MAIL' && record.mailRecord;

  // Get file information if it's a file record
  let fileSize = 'N/A';
  let fileType = 'N/A';

  // Get the appropriate icon component using our new icon system
  const FileIconComponent = isMailRecord
    ? EmailIcon
    : getRecordIcon(
      record.recordType,
      record.fileRecord?.extension,
      record.fileRecord?.mimeType,
      record.origin
    );

  if (isFileRecord && record.fileRecord) {
    fileSize = formatFileSizeUtil(record.fileRecord.sizeInBytes);
    fileType = record.fileRecord.extension ? record.fileRecord.extension.toUpperCase() : 'N/A';
  } else if (isMailRecord) {
    fileType = 'EMAIL';
    // We don't have a size for emails, so leave fileSize as N/A
  }
  // Check all possible sources for webUrl
  const webUrl = record.webUrl || record.fileRecord?.webUrl || record.mailRecord?.webUrl;

  return (
    <>
      <div className="w-full">
        <div className="max-w-7xl mx-auto py-6 px-4">
          {/* Header */}
          <Card className="mb-6 rounded-lg shadow-sm overflow-visible">
            <div className="flex items-center justify-between p-6 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="h-9 w-9 rounded-md bg-muted/50"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <FileIconComponent
                  size={44}
                  className="mr-2"
                />

                <div className="max-w-[600px]">
                  <h2 className="text-lg font-semibold truncate mb-1">{record.recordName}</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="h-5.5 text-xs">
                      {record.recordType}
                    </Badge>
                    {fileSize !== 'N/A' && (
                      <span className="text-sm text-muted-foreground">{fileSize}</span>
                    )}
                  </div>
                </div>
              </div>
              {/* Desktop: Full buttons */}
              <div className="hidden lg:flex flex-wrap gap-1.5 items-center justify-end shrink-0">
                {!isRecordConnector && (
                  <RecordActionButton
                    icon={Pencil}
                    label="Edit"
                    onClick={() => setIsEditDialogOpen(true)}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/5"
                  />
                )}

                {record.summaryDocumentId && (
                  <RecordActionButton
                    icon={FileText}
                    label="Summary"
                    onClick={handleShowSummary}
                    variant="outline"
                  />
                )}

                <RecordActionButton
                  icon={ExternalLink}
                  label="Open"
                  onClick={() => window.open(`/record/${recordId}/view`, '_blank', 'noopener,noreferrer')}
                  variant="outline"
                />

                {!isRecordConnector && recordId && (
                  <RecordReindexButton
                    indexingStatus={record.indexingStatus}
                    onClick={() => handleRetryIndexing(recordId)}
                    disabled={
                      record.indexingStatus === 'FILE_TYPE_NOT_SUPPORTED' ||
                      record.indexingStatus === 'IN_PROGRESS' ||
                      isReindexing
                    }
                  />
                )}

                <RecordActionButton
                  icon={Trash2}
                  label="Delete"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/5"
                />
              </div>

              {/* Medium screens: Full buttons */}
              <div className="hidden sm:hidden md:flex lg:hidden flex-wrap gap-1.5 items-center justify-end shrink-0">
                {!isRecordConnector && (
                  <RecordActionButton
                    icon={Pencil}
                    label="Edit"
                    onClick={() => setIsEditDialogOpen(true)}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/5"
                  />
                )}

                {record.summaryDocumentId && (
                  <RecordActionButton
                    icon={FileText}
                    label="Summary"
                    onClick={handleShowSummary}
                    variant="outline"
                  />
                )}

                <RecordActionButton
                  icon={ExternalLink}
                  label="Open"
                  onClick={() => window.open(`/record/${recordId}/view`, '_blank', 'noopener,noreferrer')}
                  variant="outline"
                />

                {!isRecordConnector && recordId && (
                  <RecordReindexButton
                    indexingStatus={record.indexingStatus}
                    onClick={() => handleRetryIndexing(recordId)}
                    disabled={
                      record.indexingStatus === 'FILE_TYPE_NOT_SUPPORTED' ||
                      record.indexingStatus === 'IN_PROGRESS' ||
                      isReindexing
                    }
                  />
                )}

                <RecordActionButton
                  icon={Trash2}
                  label="Delete"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/5"
                />
              </div>

              {/* Tablet: Compact buttons */}
              <div className="hidden sm:flex lg:hidden md:hidden gap-1.5 items-center justify-end flex-wrap">
                {!isRecordConnector && (
                  <RecordActionButton
                    icon={Pencil}
                    label="Edit"
                    onClick={() => setIsEditDialogOpen(true)}
                    variant="outline"
                    compact
                    className="border-primary text-primary hover:bg-primary/5"
                  />
                )}

                {record.summaryDocumentId && (
                  <RecordActionButton
                    icon={FileText}
                    label="Summary"
                    onClick={handleShowSummary}
                    variant="outline"
                    compact
                  />
                )}

                <RecordActionButton
                  icon={ExternalLink}
                  label="Open"
                  onClick={() => window.open(`/record/${recordId}/view`, '_blank', 'noopener,noreferrer')}
                  variant="outline"
                  compact
                />

                {!isRecordConnector && recordId && (
                  <RecordReindexButton
                    indexingStatus={record.indexingStatus}
                    onClick={() => handleRetryIndexing(recordId)}
                    disabled={
                      record.indexingStatus === 'FILE_TYPE_NOT_SUPPORTED' ||
                      record.indexingStatus === 'IN_PROGRESS' ||
                      isReindexing
                    }
                    compact
                  />
                )}

                <RecordActionButton
                  icon={Trash2}
                  label="Delete"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  variant="outline"
                  compact
                  className="border-destructive text-destructive hover:bg-destructive/5"
                />
              </div>

              {/* Mobile: Priority action + Dropdown Menu */}
              <div className="flex sm:hidden flex-col gap-2 w-full">
                <div className="flex gap-4 w-4/5 mx-auto mt-2">
                  {!isRecordConnector && (
                    <RecordActionButton
                      icon={Pencil}
                      label="Edit"
                      onClick={() => setIsEditDialogOpen(true)}
                      variant="outline"
                      className="flex-1 border-primary text-primary hover:bg-primary/5"
                    />
                  )}

                  <DropdownMenu open={isActionMenuOpen} onOpenChange={setIsActionMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex-1 h-9 px-3 text-sm font-medium">
                        <MoreHorizontal className="mr-2 h-4 w-4" />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[350px]">
                      {record.summaryDocumentId && (
                        <DropdownMenuItem
                          onClick={() => {
                            handleShowSummary();
                            setIsActionMenuOpen(false);
                          }}
                        >
                          <FileText className="mr-3 h-4.5 w-4.5" />
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">View Summary</span>
                            <span className="text-xs text-muted-foreground">
                              Show document summary
                            </span>
                          </div>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => {
                          window.open(`/record/${recordId}/view`, '_blank', 'noopener,noreferrer');
                          setIsActionMenuOpen(false);
                        }}
                      >
                        <ExternalLink className="mr-3 h-4.5 w-4.5" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">Open Document</span>
                          <span className="text-xs text-muted-foreground">Open in new tab</span>
                        </div>
                      </DropdownMenuItem>

                      {!isRecordConnector && recordId && (
                        <DropdownMenuItem
                          onClick={() => {
                            handleRetryIndexing(recordId);
                            setIsActionMenuOpen(false);
                          }}
                          disabled={
                            record.indexingStatus === 'FILE_TYPE_NOT_SUPPORTED' ||
                            record.indexingStatus === 'IN_PROGRESS' ||
                            isReindexing
                          }
                          className={cn(
                            record.indexingStatus === 'FAILED' &&
                            'text-amber-600 dark:text-amber-400'
                          )}
                        >
                          <RefreshCw
                            className={cn(
                              'mr-3 h-4 w-4',
                              record.indexingStatus === 'FAILED' &&
                              'text-amber-600 dark:text-amber-400'
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {getReindexButtonText(record.indexingStatus)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {getReindexTooltip(record.indexingStatus)}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => {
                          setIsDeleteDialogOpen(true);
                          setIsActionMenuOpen(false);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-3 h-4.5 w-4.5 text-destructive" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">Delete Record</span>
                          <span className="text-xs text-muted-foreground">
                            Permanently remove this record
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <Separator />

            <div className="px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Created: {createdAt}</span>
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Updated: {updatedAt}</span>
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                  <Clock className="h-4 w-4" />
                  <span>Indexing Status:</span>
                  <Badge
                    variant="secondary"
                    className="h-5 text-[0.7rem] font-semibold px-2"
                    style={{
                      backgroundColor: getStatusColor(record.indexingStatus),
                      color: 'white',
                    }}
                  >
                    {getStatusLabel(record.indexingStatus)}
                  </Badge>
                  {record.indexingStatus === 'FAILED' &&
                    record.reason &&
                    record.reason.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-pointer">
                            <Info className="h-4 w-4" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{record.reason}</TooltipContent>
                      </Tooltip>
                    )}
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                  {record?.origin === 'CONNECTOR' ? (
                    <Cloud className="h-4 w-4" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  {knowledgeBase && `KB: ${knowledgeBase.name || 'Default'}`}
                  {record?.origin === 'CONNECTOR' && record.connectorName && (
                    <span>{record.connectorName}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="mb-6 rounded-lg shadow-sm overflow-hidden">
                <CardHeader className="border-b p-5">
                  <h3 className="text-base font-medium">Document Details</h3>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      {isFileRecord && record.fileRecord && (
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                            File Name
                          </label>
                          <p className="text-sm">{record.fileRecord?.name || 'N/A'}</p>
                        </div>
                      )}

                      {isMailRecord && record.mailRecord && (
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                            Subject
                          </label>
                          <p className="text-sm">{record.mailRecord?.subject || 'N/A'}</p>
                        </div>
                      )}

                      {/* Description field */}
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                          Description
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {record.description || 'No description added'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                          Type
                        </label>
                        <Badge
                          variant="secondary"
                          className="h-5.5 px-2 py-0.5 text-xs font-medium rounded border"
                        >
                          {fileType}
                        </Badge>
                      </div>

                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                          Record ID
                        </label>
                        <code className="block text-sm bg-muted/30 p-3 rounded-md overflow-auto font-mono">
                          {record._key}
                        </code>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {isFileRecord && (
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                            File Size
                          </label>
                          <p className="text-sm">{fileSize}</p>
                        </div>
                      )}

                      {isMailRecord && record.mailRecord && (
                        <>
                          <div>
                            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                              From
                            </label>
                            <p className="text-sm">{record.mailRecord.from}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                              To
                            </label>
                            <p className="text-sm">
                              {Array.isArray(record.mailRecord.to)
                                ? record.mailRecord.to.join(', ')
                                : record.mailRecord.to}
                            </p>
                          </div>
                          {record.mailRecord.cc && record.mailRecord.cc.length > 0 && (
                            <div>
                              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                                CC
                              </label>
                              <p className="text-sm">{record.mailRecord.cc.join(', ')}</p>
                            </div>
                          )}
                        </>
                      )}

                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                          Origin
                        </label>
                        <p className="text-sm">{record.origin}</p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                          Permissions
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {permissions.length > 0 ? (
                            permissions.map((permission: Permissions) => (
                              <Badge
                                key={permission.id}
                                variant="secondary"
                                className="h-5.5 px-2 py-0.5 text-xs font-medium rounded border"
                              >
                                {permission.relationship}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm">No permissions assigned</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show document viewer for both file and mail records */}
              <Card className="rounded-lg shadow-sm overflow-hidden">
                <RecordDocumentViewer record={record} />
              </Card>
            </div>

            <RecordDetailsSidebar record={record} metadata={metadata} users={users} />
          </div>
        </div>
        {/* Edit Record Dialog */}
        {recordData && recordData.record && recordData.knowledgeBase && (
          <EditRecordDialog
            open={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onRecordUpdated={refreshRecordData}
            storageDocumentId={record.externalRecordId}
            recordId={record._key}
            record={record}
          />
        )}
        {recordData && recordData.record && (
          <DeleteRecordDialog
            open={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onRecordDeleted={handleDeleteRecord}
            recordId={record._key}
            recordName={record.recordName}
          />
        )}
      </div>

      <Dialog open={isSummaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-2xl p-0" aria-describedby={undefined}>
          {/* Header with close button */}
          <DialogHeader className="flex flex-row items-center justify-between border-b p-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-semibold">Document Summary</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSummaryDialogOpen(false)}
              className="h-8 w-8 rounded-md"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {/* Content area */}
          <div className="p-4 sm:p-6 pb-0 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:rounded [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/60">
            {summaryLoading ? (
              <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : (
              <div className="py-6 px-4 sm:px-6 rounded-lg bg-muted/30 border border-border/50 prose prose-sm dark:prose-invert max-w-none [&_p]:mt-0 [&_p]:mb-4 [&_p:last-of-type]:mb-0 [&_p]:text-sm [&_p]:leading-relaxed [&_h1,&_h2,&_h3,&_h4,&_h5,&_h6]:font-semibold [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_ul,&_ol]:mb-4 [&_ul,&_ol]:pl-6 [&_li]:mb-2 [&_code]:font-mono [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:rounded [&_code]:bg-muted">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Actions area with buttons */}
          <div className="flex justify-end items-center gap-3 p-5 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setSummaryDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Sheet */}
      <Sheet open={isChatOpen} onOpenChange={(open) => setIsChatOpen(open)}>
        <SheetContent
          side="right"
          className="w-full sm:w-[1050px] md:w-[1050px] max-w-full p-0 flex flex-col"
        >
          {/* Chat Header */}
          <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-sm font-semibold">
                    {t('knowledgeBase.aiAssistant')}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {t('knowledgeBase.askQuestionsAboutDocument')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleChat}
                className="h-8 w-8 rounded-md bg-muted/50"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Chat Interface */}
          <div className="flex-1 min-h-0">
            <RecordSalesAgent
              key={record._id}
              initialContext={{
                recordId: record._id,
                recordName: record.recordName,
                recordType: record.recordType,
                departments: record.departments?.map((d) => d.name),
                modules: record.modules?.map((m) => m.name),
                categories: record.appSpecificRecordType?.map((type) => type.name),
              }}
              recordId={record._id}
              containerStyle={{ height: '100%' }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
