import React, { useState } from 'react';
import { toast } from 'sonner';
import {
    BookOpen,
    Check,
    ExternalLink,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    ConnectorSetupLayout,
    StepNumber,
    SetupStepSection
} from './connector-setup-layout';
import { FieldRenderer } from './field-renderers';
import { StartCrawlDialog } from './start-crawl-dialog';
import { ConnectorDeleteButton } from './connector-delete-button';
import { useConnectorManager } from '../hooks/use-connector-manager';
import { useConnectorConfig } from '../hooks/use-connector-config';
import type { Connector } from '../types/types';

interface AzureBlobSetupViewProps {
    showStats?: boolean;
}

export const AzureBlobSetupView: React.FC<AzureBlobSetupViewProps> = () => {
    const [showCrawlDialog, setShowCrawlDialog] = useState(false);

    const {
        connector,
        connectorConfig,
        loading,
        error,
        isDeleting,
        handleToggleConnector,
        handleDeleteConnector,
    } = useConnectorManager();

    const configHook = useConnectorConfig({
        connector: connector as Connector,
        onClose: () => { },
        onSuccess: () => {
            setShowCrawlDialog(true);
        },
    });

    const handleSaveConfig = async () => {
        try {
            await configHook.handleSave();
        } catch (err) {
            console.error('Failed to save configuration:', err);
        }
    };

    const handleStartCrawl = async () => {
        setShowCrawlDialog(false);
        if (connector && !connector.isActive) {
            await handleToggleConnector(true);
        }
        toast.success(`Crawl started for ${connector?.name}`);
    };

    const handleDoLater = () => {
        setShowCrawlDialog(false);
    };

    const features = [
        { text: 'Sync files and folders from Azure Blob Storage containers' },
        { text: 'Index documents, images, and various file types' },
        { text: 'Secure access using Azure account keys' },
    ];

    const guideContent = (
        <>
            {/* Step 1: Open Azure Portal */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={1} variant="filled" />
                    Open Azure Portal
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Go to your Azure Storage Account:
                    </p>
                    <a
                        href="https://portal.azure.com/#browse/Microsoft.Storage%2FStorageAccounts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        portal.azure.com - Storage Accounts
                    </a>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2">
                        <li>Select your storage account</li>
                        <li>Or create a new storage account if needed</li>
                    </ol>
                </div>
            </div>

            <Separator />

            {/* Step 2: Get Storage Account Name */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={2} variant="filled" />
                    Get Storage Account Name
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        In your storage account overview:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Copy the <strong>Storage account name</strong> from the overview page</span>
                        </li>
                    </ul>
                </div>
            </div>

            <Separator />

            {/* Step 3: Get Access Keys */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={3} variant="filled" />
                    Get Access Keys
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Navigate to the access keys section:
                    </p>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Go to <strong>&quot;Security + networking&quot;</strong> → <strong>&quot;Access keys&quot;</strong></li>
                        <li>Click <strong>&quot;Show&quot;</strong> next to key1</li>
                        <li>Copy the <strong>Key</strong> value</li>
                    </ol>
                </div>
            </div>

            <Separator />

            {/* Step 4: Get Container Name */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={4} variant="filled" />
                    Get Container Name
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Find your container name:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Go to <strong>&quot;Data storage&quot;</strong> → <strong>&quot;Containers&quot;</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Copy the <strong>container name</strong> you want to sync</span>
                        </li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                        Paste these values into the form on the left.
                    </p>
                </div>
            </div>

            <Separator />

            {/* Documentation Link */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-foreground">Need more help?</p>
                        <a
                            href="https://learn.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-portal"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                        >
                            View Azure Blob Storage Documentation →
                        </a>
                    </div>
                </div>
            </div>
        </>
    );

    // Get auth fields from backend schema
    const authFields = configHook.connectorConfig?.config?.auth?.schema?.fields || [];

    return (
        <>
            <ConnectorSetupLayout
                connectorName="Azure Blob"
                connectorDisplayName="Azure Blob Storage"
                connectorSubtitle="Microsoft Azure"
                iconPath={connector?.iconPath || '/assets/icons/connectors/azureblob.svg'}
                features={features}
                loading={loading || !connector}
                error={error}
                guideContent={guideContent}
                headerActions={
                    connector && (
                        <ConnectorDeleteButton
                            connector={connector}
                            isDeleting={isDeleting}
                            onDelete={handleDeleteConnector}
                        />
                    )
                }
            >
                {/* Name Field Section */}
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Give this app a unique name visible to all teammates in search results
                    </p>
                    <div className="space-y-2">
                        <Label htmlFor="connector-name">Name</Label>
                        <Input
                            id="connector-name"
                            defaultValue="Azure Blob Storage"
                            className="max-w-md bg-muted/50"
                        />
                    </div>
                </div>

                {/* Step 1: Grant Access */}
                <SetupStepSection
                    number={1}
                    description="Grant access by getting your Azure Storage credentials. Follow the instructions in the document provided below."
                >
                    <a
                        href="https://portal.azure.com/#browse/Microsoft.Storage%2FStorageAccounts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                        <BookOpen className="h-4 w-4" />
                        Connect Azure Blob Storage
                    </a>
                </SetupStepSection>

                {/* Step 2: Configuration Form - Dynamic Fields from Backend */}
                <SetupStepSection
                    number={2}
                    description="Provide the following information about your Azure Blob Storage:"
                >
                    {authFields.length > 0 ? (
                        authFields.map((field) => (
                            <FieldRenderer
                                key={field.name}
                                field={field}
                                value={configHook.formData.auth[field.name]}
                                onChange={(value) => configHook.handleFieldChange('auth', field.name, value)}
                                error={configHook.formErrors.auth[field.name]}
                            />
                        ))
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            Loading configuration fields...
                        </div>
                    )}
                </SetupStepSection>

                {/* Save Button */}
                <div className="pt-2">
                    <Button
                        onClick={handleSaveConfig}
                        className="gap-2"
                        disabled={configHook.saving}
                    >
                        {configHook.saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save'
                        )}
                    </Button>
                </div>
            </ConnectorSetupLayout>

            {/* Start Crawl Dialog */}
            <StartCrawlDialog
                open={showCrawlDialog}
                onOpenChange={setShowCrawlDialog}
                connectorName="Azure Blob Storage"
                onStartCrawl={handleStartCrawl}
                onDoLater={handleDoLater}
            />
        </>
    );
};

export default AzureBlobSetupView;
