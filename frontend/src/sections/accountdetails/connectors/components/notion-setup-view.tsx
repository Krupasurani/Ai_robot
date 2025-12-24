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
import { ConnectorDetailStats } from './connector-detail-stats';
import { useConnectorManager } from '../hooks/use-connector-manager';
import { useConnectorConfig } from '../hooks/use-connector-config';
import type { Connector } from '../types/types';

interface NotionSetupViewProps {
    showStats?: boolean;
}

export const NotionSetupView: React.FC<NotionSetupViewProps> = () => {
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
        { text: 'Sync pages, databases, and workspaces from Notion' },
        { text: 'Index content blocks, comments, and page properties' },
        { text: 'Maintain page hierarchy and relationships' },
    ];

    const guideContent = (
        <>
            {/* Step 1: Create Notion Integration */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={1} variant="filled" />
                    Create a Notion Integration
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Go to the Notion Integrations page:
                    </p>
                    <a
                        href="https://www.notion.so/my-integrations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        notion.so/my-integrations
                    </a>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2">
                        <li>Click <strong>&quot;+ New integration&quot;</strong></li>
                        <li>Enter a name (e.g., &quot;Thero Integration&quot;)</li>
                        <li>Select the workspace to connect</li>
                        <li>Click <strong>&quot;Submit&quot;</strong></li>
                    </ol>
                </div>
            </div>

            <Separator />

            {/* Step 2: Configure Capabilities */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={2} variant="filled" />
                    Configure Capabilities
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Under &quot;Capabilities&quot;, ensure these are enabled:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Read content</strong> → Access page content</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Read comments</strong> → Access page comments</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Read user information</strong> → For attribution</span>
                        </li>
                    </ul>
                </div>
            </div>

            <Separator />

            {/* Step 3: Copy Internal Integration Secret */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={3} variant="filled" />
                    Copy Integration Secret
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        In the &quot;Secrets&quot; section:
                    </p>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Click <strong>&quot;Show&quot;</strong> next to the token</li>
                        <li>Copy the token (starts with <code className="text-xs bg-muted px-1 rounded">ntn_</code> or <code className="text-xs bg-muted px-1 rounded">secret_</code>)</li>
                    </ol>
                </div>
            </div>

            <Separator />

            {/* Step 4: Share Pages with Integration */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={4} variant="filled" />
                    Share Pages with Integration
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Important: You need to share pages with your integration:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Open each page/database in Notion</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Click <strong>&quot;...&quot;</strong> → <strong>&quot;Add connections&quot;</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Select your integration</span>
                        </li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                        Paste the integration secret into the form on the left.
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
                            href="https://developers.notion.com/docs/create-a-notion-integration"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                        >
                            View Notion API Documentation →
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
                connectorName="Notion"
                connectorDisplayName="Notion"
                connectorSubtitle="Documentation & Wikis"
                iconPath={connector?.iconPath || '/assets/icons/connectors/notion.svg'}
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
                            defaultValue="Notion"
                            className="max-w-md bg-muted/50"
                        />
                    </div>
                </div>

                {/* Step 1: Grant Access */}
                <SetupStepSection
                    number={1}
                    description="Grant access by creating an internal integration in Notion. Follow the instructions in the document provided below."
                >
                    <a
                        href="https://www.notion.so/my-integrations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                        <BookOpen className="h-4 w-4" />
                        Connect Notion
                    </a>
                </SetupStepSection>

                {/* Step 2: Configuration Form - Dynamic Fields from Backend */}
                <SetupStepSection
                    number={2}
                    description="Provide the following information about your Notion workspace:"
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

                {/* Indexing Statistics */}
                {connector?.isConfigured && (
                    <div className="pt-6">
                        <ConnectorDetailStats connectorName="Notion" />
                    </div>
                )}
            </ConnectorSetupLayout>

            {/* Start Crawl Dialog */}
            <StartCrawlDialog
                open={showCrawlDialog}
                onOpenChange={setShowCrawlDialog}
                connectorName="Notion"
                onStartCrawl={handleStartCrawl}
                onDoLater={handleDoLater}
            />
        </>
    );
};

export default NotionSetupView;
