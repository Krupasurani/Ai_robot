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

interface ZendeskSetupViewProps {
    showStats?: boolean;
}

export const ZendeskSetupView: React.FC<ZendeskSetupViewProps> = () => {
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
        { text: 'Sync tickets, articles, and help center content from Zendesk' },
        { text: 'Index ticket conversations, comments, and attachments' },
        { text: 'Search through customer support history' },
    ];

    const guideContent = (
        <>
            {/* Step 1: Open Zendesk Admin Center */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={1} variant="filled" />
                    Open Zendesk Admin Center
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Go to your Zendesk Admin Center:
                    </p>
                    <div className="rounded-md bg-muted p-2 text-xs font-mono text-foreground">
                        https://your-subdomain.zendesk.com/admin
                    </div>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2">
                        <li>Sign in as an administrator</li>
                        <li>Click the <strong>gear icon</strong> in the sidebar</li>
                    </ol>
                </div>
            </div>

            <Separator />

            {/* Step 2: Enable Token Access */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={2} variant="filled" />
                    Enable Token Access
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Navigate to API settings:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Go to <strong>&quot;Apps and integrations&quot;</strong> → <strong>&quot;APIs&quot;</strong> → <strong>&quot;Zendesk API&quot;</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Enable <strong>Token Access</strong> if not already enabled</span>
                        </li>
                    </ul>
                </div>
            </div>

            <Separator />

            {/* Step 3: Create API Token */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={3} variant="filled" />
                    Create API Token
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Create a new API token:
                    </p>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Click <strong>&quot;Add API token&quot;</strong></li>
                        <li>Enter a description (e.g., &quot;Thero Integration&quot;)</li>
                        <li>Click <strong>&quot;Create&quot;</strong></li>
                    </ol>
                </div>
            </div>

            <Separator />

            {/* Step 4: Copy Your Credentials */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={4} variant="filled" />
                    Copy Your Credentials
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        You&apos;ll need three pieces of information:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong>API Token</strong> - Copy the token (shown only once)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Email</strong> - Your Zendesk admin email address</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Subdomain</strong> - Your Zendesk subdomain (from the URL)</span>
                        </li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                        Paste these values into the form on the left.
                    </p>
                </div>
            </div>

            <Separator />

            {/* Step 5: Find Your Subdomain */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    <StepNumber number={5} variant="filled" />
                    Find Your Subdomain
                </h3>
                <div className="space-y-2 ml-7">
                    <p className="text-sm text-muted-foreground">
                        Your subdomain is part of your Zendesk URL:
                    </p>
                    <div className="rounded-md bg-muted p-2 text-xs font-mono text-foreground">
                        https://<strong className="text-primary">your-subdomain</strong>.zendesk.com
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Only enter the subdomain part, not the full URL.
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
                            href="https://developer.zendesk.com/api-reference/ticketing/introduction/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                        >
                            View Zendesk API Documentation →
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
                connectorName="Zendesk"
                connectorDisplayName="Zendesk"
                connectorSubtitle="Customer Support"
                iconPath={connector?.iconPath || '/assets/icons/connectors/zendesk.svg'}
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
                            defaultValue="Zendesk"
                            className="max-w-md bg-muted/50"
                        />
                    </div>
                </div>

                {/* Step 1: Grant Access */}
                <SetupStepSection
                    number={1}
                    description="Grant access by creating an API token in Zendesk Admin Center. Follow the instructions in the document provided below."
                >
                    <a
                        href="https://support.zendesk.com/hc/en-us/articles/4408889192858-Generating-a-new-API-token"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                        <BookOpen className="h-4 w-4" />
                        Connect Zendesk
                    </a>
                </SetupStepSection>

                {/* Step 2: Configuration Form - Dynamic Fields from Backend */}
                <SetupStepSection
                    number={2}
                    description="Provide the following information about your Zendesk account:"
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
                connectorName="Zendesk"
                onStartCrawl={handleStartCrawl}
                onDoLater={handleDoLater}
            />
        </>
    );
};

export default ZendeskSetupView;
